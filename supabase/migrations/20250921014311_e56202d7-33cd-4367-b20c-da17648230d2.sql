-- Create table to track product-level acceptance within orders
CREATE TABLE IF NOT EXISTS public.order_product_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, packed
  accepted_at TIMESTAMP WITH TIME ZONE,
  packed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, product_id, seller_id)
);

-- Enable RLS
ALTER TABLE public.order_product_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Sellers can manage their own product status" 
ON public.order_product_status 
FOR ALL
USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all product status" 
ON public.order_product_status 
FOR SELECT
USING (is_current_user_admin_v2());

-- Create function to handle product acceptance
CREATE OR REPLACE FUNCTION public.accept_product_in_order(
  p_order_id UUID,
  p_product_id UUID,
  p_seller_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_record RECORD;
  seller_location RECORD;
  available_agent_id UUID;
  result JSONB;
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Get seller location
  SELECT latitude, longitude, address INTO seller_location
  FROM sellers 
  WHERE user_id = p_seller_id AND location_verified = true;
  
  -- Insert or update product status
  INSERT INTO order_product_status (order_id, product_id, seller_id, status, accepted_at)
  VALUES (p_order_id, p_product_id, p_seller_id, 'accepted', now())
  ON CONFLICT (order_id, product_id, seller_id) 
  DO UPDATE SET 
    status = 'accepted',
    accepted_at = now(),
    updated_at = now();
  
  -- Find an available delivery agent
  SELECT id INTO available_agent_id
  FROM delivery_agents 
  WHERE is_active = true 
    AND is_online = true
  ORDER BY 
    deliveries_today ASC,
    average_rating DESC,
    last_delivery_at ASC
  LIMIT 1;
  
  -- If agent found, create notification with location
  IF available_agent_id IS NOT NULL THEN
    INSERT INTO agent_notifications (
      agent_id,
      type,
      title,
      message,
      metadata
    ) VALUES (
      available_agent_id,
      'product_ready_for_pickup',
      'Product Ready for Pickup',
      'Product from order #' || p_order_id::text || ' is ready for pickup',
      jsonb_build_object(
        'order_id', p_order_id,
        'product_id', p_product_id,
        'seller_id', p_seller_id,
        'customer_name', order_record.customer_name,
        'customer_phone', order_record.customer_phone,
        'delivery_address', order_record.address,
        'seller_location', jsonb_build_object(
          'latitude', seller_location.latitude,
          'longitude', seller_location.longitude,
          'address', seller_location.address
        ),
        'pickup_location', seller_location.address,
        'accepted_at', now()
      )
    );
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Product accepted and delivery agent notified',
      'agent_id', available_agent_id
    );
  ELSE
    result := jsonb_build_object(
      'success', true,
      'message', 'Product accepted but no delivery agent available',
      'agent_id', null
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Create function to reject product
CREATE OR REPLACE FUNCTION public.reject_product_in_order(
  p_order_id UUID,
  p_product_id UUID,
  p_seller_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update product status
  INSERT INTO order_product_status (order_id, product_id, seller_id, status, rejection_reason)
  VALUES (p_order_id, p_product_id, p_seller_id, 'rejected', p_reason)
  ON CONFLICT (order_id, product_id, seller_id) 
  DO UPDATE SET 
    status = 'rejected',
    rejection_reason = p_reason,
    updated_at = now();
  
  RETURN jsonb_build_object('success', true, 'message', 'Product rejected successfully');
END;
$$;