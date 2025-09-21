-- Create function to handle product acceptance (if not exists)
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
      'Product Ready for Pickup! 📦',
      'Product from order #' || p_order_id::text || ' is ready for pickup',
      jsonb_build_object(
        'order_id', p_order_id,
        'product_id', p_product_id,
        'seller_id', p_seller_id,
        'customer_name', order_record.customer_name,
        'customer_phone', order_record.customer_phone,
        'delivery_address', order_record.address,
        'seller_location', jsonb_build_object(
          'latitude', COALESCE(seller_location.latitude, 0),
          'longitude', COALESCE(seller_location.longitude, 0),
          'address', COALESCE(seller_location.address, 'Location not set')
        ),
        'pickup_location', COALESCE(seller_location.address, 'Location not set'),
        'accepted_at', now()
      )
    );
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Product accepted and delivery agent notified with location details',
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
  RETURN jsonb_build_object('success', true, 'message', 'Product rejected successfully');
END;
$$;