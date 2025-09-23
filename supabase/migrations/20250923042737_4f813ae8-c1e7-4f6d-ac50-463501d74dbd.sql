-- Fix the update_seller_order_status function to properly check seller ownership
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
  v_order RECORD;
  v_seller RECORD;
  v_agent RECORD;
  v_notification_count INTEGER := 0;
  v_has_seller_products BOOLEAN := false;
  v_item JSONB;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;
  
  -- Check if seller has any products in this order
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
  LOOP
    -- Check if any product in the order belongs to this seller
    IF EXISTS (
      SELECT 1 FROM products p 
      WHERE p.id = (v_item->>'id')::uuid 
      AND p.seller_id = p_seller_user_id
    ) THEN
      v_has_seller_products := true;
      EXIT;
    END IF;
  END LOOP;
  
  IF NOT v_has_seller_products THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are not authorized to modify this order'
    );
  END IF;
  
  -- Get seller location
  SELECT * INTO v_seller FROM sellers WHERE user_id = p_seller_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Seller profile not found'
    );
  END IF;
  
  -- Check if seller has location data for pack action
  IF p_action = 'pack' AND (v_seller.latitude IS NULL OR v_seller.longitude IS NULL) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Please set your location in settings before packing orders'
    );
  END IF;
  
  -- Update order status based on action
  IF p_action = 'accept' THEN
    UPDATE orders SET status = 'confirmed', updated_at = now() WHERE id = p_order_id;
  ELSIF p_action = 'reject' THEN
    UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = p_order_id;
  ELSIF p_action = 'pack' THEN
    UPDATE orders SET status = 'packed', updated_at = now() WHERE id = p_order_id;
    
    -- Notify all active delivery agents when order is packed
    FOR v_agent IN
      SELECT da.id, da.name, da.email
      FROM delivery_agents da
      WHERE da.is_active = true 
        AND da.is_online = true
    LOOP
      INSERT INTO agent_notifications (
        agent_id,
        type,
        title,
        message,
        metadata
      ) VALUES (
        v_agent.id,
        'new_delivery_available',
        'New Delivery Available',
        'A new order is ready for pickup at ' || COALESCE(v_seller.business_name, 'seller location'),
        jsonb_build_object(
          'order_id', p_order_id,
          'seller_location', jsonb_build_object(
            'latitude', v_seller.latitude,
            'longitude', v_seller.longitude,
            'address', v_seller.address
          ),
          'order_total', v_order.total,
          'customer_name', v_order.customer_name,
          'customer_phone', v_order.customer_phone,
          'delivery_address', v_order.address
        )
      );
      
      v_notification_count := v_notification_count + 1;
    END LOOP;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action: ' || p_action
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN p_action = 'pack' THEN 'Order packed successfully! ' || v_notification_count || ' delivery agents have been notified.'
      WHEN p_action = 'accept' THEN 'Order accepted successfully'
      WHEN p_action = 'reject' THEN 'Order rejected successfully'
      ELSE 'Order updated successfully'
    END,
    'notifications_sent', COALESCE(v_notification_count, 0)
  );
END;
$$;