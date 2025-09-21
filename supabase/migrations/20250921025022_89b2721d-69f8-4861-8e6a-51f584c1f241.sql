-- Fix the product detection logic in accept_product_in_order function
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
  order_record RECORD;
  all_products_accepted BOOLEAN;
BEGIN
  -- Check if order exists and is in valid status
  SELECT EXISTS(
    SELECT 1 FROM orders 
    WHERE id = p_order_id 
    AND status IN ('placed', 'confirmed', 'pending')
  ) INTO order_exists;
  
  IF NOT order_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found or not in valid status for acceptance'
    );
  END IF;
  
  -- Use proper JSON operations to check if product exists in order
  BEGIN
    SELECT EXISTS(
      SELECT 1 
      FROM orders o,
           jsonb_array_elements(o.items) AS item
      WHERE o.id = p_order_id
      AND (item->>'id')::uuid = p_product_id
      AND (item->>'seller_id')::uuid = p_seller_id
    ) INTO product_in_order;
  EXCEPTION WHEN OTHERS THEN
    -- If JSON parsing fails, return error
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid order data format: ' || SQLERRM
    );
  END;
  
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
  
  -- Check if all products in the order are now accepted and update order status
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = p_order_id;
  
  -- Check if all products from all sellers are accepted using proper JSON operations
  SELECT NOT EXISTS(
    SELECT 1 
    FROM (
      SELECT DISTINCT 
        (item->>'id')::uuid as product_id,
        (item->>'seller_id')::uuid as seller_id
      FROM jsonb_array_elements(order_record.items) AS item
    ) all_order_items
    LEFT JOIN order_product_status ops ON (
      ops.order_id = p_order_id 
      AND ops.product_id = all_order_items.product_id 
      AND ops.seller_id = all_order_items.seller_id
      AND ops.status = 'accepted'
    )
    WHERE ops.id IS NULL
  ) INTO all_products_accepted;
  
  -- If all products are accepted, update order status and assign to delivery agent
  IF all_products_accepted THEN
    -- Update order status to 'confirmed'
    UPDATE orders 
    SET status = 'confirmed', 
        updated_at = now()
    WHERE id = p_order_id;
    
    -- Find an available delivery agent (simple round-robin for now)
    -- Assign to any active online agent
    UPDATE orders 
    SET agent_id = (
      SELECT id 
      FROM delivery_agents 
      WHERE is_active = true AND is_online = true 
      ORDER BY last_delivery_at ASC NULLS FIRST
      LIMIT 1
    )
    WHERE id = p_order_id AND agent_id IS NULL;
    
    -- Create notification for assigned agent if one was found
    INSERT INTO agent_notifications (
      agent_id,
      type,
      title,
      message,
      source_type,
      source_id,
      metadata
    )
    SELECT 
      agent_id,
      'new_order',
      'New Order Assigned',
      'You have been assigned order #' || SUBSTRING(p_order_id::text, 1, 8) || ' for delivery',
      'system',
      p_order_id,
      jsonb_build_object(
        'order_id', p_order_id,
        'customer_name', order_record.customer_name,
        'total_amount', order_record.total,
        'assigned_at', now()
      )
    FROM orders 
    WHERE id = p_order_id AND agent_id IS NOT NULL;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Product accepted successfully',
    'all_products_accepted', all_products_accepted
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Database error: ' || SQLERRM
  );
END;
$$;