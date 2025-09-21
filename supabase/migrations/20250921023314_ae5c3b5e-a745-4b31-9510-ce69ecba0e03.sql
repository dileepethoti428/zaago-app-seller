-- First, let's check if order_product_status table exists and create it if needed
CREATE TABLE IF NOT EXISTS public.order_product_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMP WITH TIME ZONE,
  packed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, product_id, seller_id)
);

-- Enable RLS
ALTER TABLE public.order_product_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Sellers can view their own product status" 
ON public.order_product_status 
FOR SELECT 
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own product status" 
ON public.order_product_status 
FOR ALL
USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage all product status" 
ON public.order_product_status 
FOR ALL
USING (is_current_user_admin_v2());

CREATE POLICY "System can manage product status" 
ON public.order_product_status 
FOR ALL
USING (true);

-- Create or replace the accept_product_in_order function to properly track status
CREATE OR REPLACE FUNCTION public.accept_product_in_order(
  p_order_id UUID,
  p_product_id UUID,
  p_seller_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_exists BOOLEAN;
  product_in_order BOOLEAN;
BEGIN
  -- Check if order exists and is in valid status
  SELECT EXISTS(
    SELECT 1 FROM orders 
    WHERE id = p_order_id 
    AND status IN ('placed', 'confirmed')
  ) INTO order_exists;
  
  IF NOT order_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found or not in valid status for acceptance'
    );
  END IF;
  
  -- Check if product exists in this order for this seller
  SELECT EXISTS(
    SELECT 1 FROM orders o
    WHERE o.id = p_order_id
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(o.items) AS item
      WHERE (item->>'id')::uuid = p_product_id
      AND (item->>'seller_id')::uuid = p_seller_id
    )
  ) INTO product_in_order;
  
  IF NOT product_in_order THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product not found in this order for the specified seller'
    );
  END IF;
  
  -- Insert or update product status
  INSERT INTO order_product_status (
    order_id, 
    product_id, 
    seller_id, 
    status, 
    accepted_at
  ) VALUES (
    p_order_id,
    p_product_id,
    p_seller_id,
    'accepted',
    now()
  )
  ON CONFLICT (order_id, product_id, seller_id) 
  DO UPDATE SET 
    status = 'accepted',
    accepted_at = now(),
    updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Product accepted successfully'
  );
END;
$$;

-- Create or replace the reject_product_in_order function to properly track status
CREATE OR REPLACE FUNCTION public.reject_product_in_order(
  p_order_id UUID,
  p_product_id UUID,
  p_seller_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_exists BOOLEAN;
  product_in_order BOOLEAN;
BEGIN
  -- Check if order exists and is in valid status
  SELECT EXISTS(
    SELECT 1 FROM orders 
    WHERE id = p_order_id 
    AND status IN ('placed', 'confirmed')
  ) INTO order_exists;
  
  IF NOT order_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found or not in valid status for rejection'
    );
  END IF;
  
  -- Check if product exists in this order for this seller
  SELECT EXISTS(
    SELECT 1 FROM orders o
    WHERE o.id = p_order_id
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(o.items) AS item
      WHERE (item->>'id')::uuid = p_product_id
      AND (item->>'seller_id')::uuid = p_seller_id
    )
  ) INTO product_in_order;
  
  IF NOT product_in_order THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product not found in this order for the specified seller'
    );
  END IF;
  
  -- Insert or update product status
  INSERT INTO order_product_status (
    order_id, 
    product_id, 
    seller_id, 
    status
  ) VALUES (
    p_order_id,
    p_product_id,
    p_seller_id,
    'rejected'
  )
  ON CONFLICT (order_id, product_id, seller_id) 
  DO UPDATE SET 
    status = 'rejected',
    updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Product rejected successfully'
  );
END;
$$;

-- Update the get_seller_orders function to include product status information
CREATE OR REPLACE FUNCTION public.get_seller_orders(seller_user_id UUID)
RETURNS TABLE(
  id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  address JSONB,
  items JSONB,
  total NUMERIC,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  delivery_time_slot TEXT,
  special_instructions TEXT,
  product_statuses JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.customer_name,
    o.customer_phone,
    o.address,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', (item->>'id')::uuid,
          'name', item->>'name',
          'quantity', (item->>'quantity')::integer,
          'price', (item->>'price')::numeric,
          'seller_id', (item->>'seller_id')::uuid,
          'image_url', item->>'image_url'
        )
      )
      FROM jsonb_array_elements(o.items) AS item
      WHERE (item->>'seller_id')::uuid = seller_user_id
    ) as items,
    o.total,
    o.status,
    o.created_at,
    o.delivery_time_slot,
    o.special_instructions,
    (
      SELECT jsonb_object_agg(
        ops.product_id::text,
        jsonb_build_object(
          'status', ops.status,
          'accepted_at', ops.accepted_at,
          'packed_at', ops.packed_at
        )
      )
      FROM order_product_status ops
      WHERE ops.order_id = o.id AND ops.seller_id = seller_user_id
    ) as product_statuses
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    WHERE (item->>'seller_id')::uuid = seller_user_id
  )
  ORDER BY o.created_at DESC;
END;
$$;

-- Update the update_seller_order_status function to handle pack action
CREATE OR REPLACE FUNCTION public.update_seller_order_status(
  p_order_id UUID,
  p_seller_user_id UUID,
  p_action TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_record RECORD;
  seller_items JSONB;
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;
  
  -- Get seller items from this order
  SELECT jsonb_agg(item) INTO seller_items
  FROM jsonb_array_elements(order_record.items) AS item
  WHERE (item->>'seller_id')::uuid = p_seller_user_id;
  
  IF seller_items IS NULL OR jsonb_array_length(seller_items) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No items found for this seller in the order'
    );
  END IF;
  
  -- Handle pack action
  IF p_action = 'pack' THEN
    -- Update all accepted products from this seller to packed
    UPDATE order_product_status 
    SET 
      status = 'packed',
      packed_at = now(),
      updated_at = now()
    WHERE order_id = p_order_id 
      AND seller_id = p_seller_user_id 
      AND status = 'accepted';
    
    -- Check if we updated any rows
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'No accepted products found to pack for this seller'
      );
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Products marked as packed successfully'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Invalid action specified'
  );
END;
$$;