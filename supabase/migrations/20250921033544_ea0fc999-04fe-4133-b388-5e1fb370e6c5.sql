-- Create function to update seller order status and notify delivery agents
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
  v_seller_location RECORD;
  v_agent RECORD;
  v_notification_count INTEGER := 0;
BEGIN
  -- Get order details with seller location
  SELECT o.*, s.latitude as seller_lat, s.longitude as seller_lng
  INTO v_order
  FROM orders o
  JOIN sellers s ON s.user_id = o.user_id
  WHERE o.id = p_order_id AND o.user_id = p_seller_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found or unauthorized'
    );
  END IF;
  
  -- Update order status based on action
  IF p_action = 'accept' THEN
    UPDATE orders SET status = 'confirmed', updated_at = now() WHERE id = p_order_id;
  ELSIF p_action = 'reject' THEN
    UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = p_order_id;
  ELSIF p_action = 'pack' THEN
    UPDATE orders SET status = 'packed', updated_at = now() WHERE id = p_order_id;
    
    -- Notify all delivery agents within 15km when order is packed
    FOR v_agent IN
      SELECT da.id, da.name, da.email,
             (6371 * acos(
               cos(radians(v_order.seller_lat)) * cos(radians(COALESCE((location->>'latitude')::numeric, 0))) *
               cos(radians(COALESCE((location->>'longitude')::numeric, 0)) - radians(v_order.seller_lng)) +
               sin(radians(v_order.seller_lat)) * sin(radians(COALESCE((location->>'latitude')::numeric, 0)))
             )) AS distance_km
      FROM delivery_agents da
      WHERE da.is_active = true 
        AND da.is_online = true
        AND da.location IS NOT NULL
      HAVING distance_km <= 15
    LOOP
      -- Create notification for each nearby agent
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
        'A new order is ready for pickup near your location. Distance: ' || ROUND(v_agent.distance_km, 1) || 'km',
        jsonb_build_object(
          'order_id', p_order_id,
          'distance_km', v_agent.distance_km,
          'seller_location', jsonb_build_object(
            'latitude', v_order.seller_lat,
            'longitude', v_order.seller_lng
          ),
          'order_total', v_order.total
        )
      );
      
      v_notification_count := v_notification_count + 1;
    END LOOP;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN p_action = 'pack' THEN 'Order packed successfully. ' || v_notification_count || ' delivery agents notified.'
      ELSE 'Order ' || p_action || 'ed successfully'
    END,
    'notifications_sent', v_notification_count
  );
END;
$$;