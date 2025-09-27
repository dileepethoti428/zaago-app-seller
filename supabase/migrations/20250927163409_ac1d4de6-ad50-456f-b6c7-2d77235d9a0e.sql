-- Update the update_seller_order_status function to immediately call the notify-delivery-agents edge function
CREATE OR REPLACE FUNCTION update_seller_order_status(
  p_order_id UUID,
  p_seller_user_id UUID,
  p_action TEXT
) RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_seller RECORD;
  v_new_status text;
  v_notification_title text;
  v_notification_message text;
  v_agent RECORD;
  v_error_context jsonb := '{}';
  v_edge_function_response jsonb;
BEGIN
  -- Validate action
  IF p_action NOT IN ('accept', 'reject', 'pack') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action. Must be accept, reject, or pack'
    );
  END IF;

  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;

  -- Get seller details
  SELECT * INTO v_seller FROM sellers WHERE user_id = p_seller_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Seller not found'
    );
  END IF;

  -- Validate seller location for pack action
  IF p_action = 'pack' AND (v_seller.latitude IS NULL OR v_seller.longitude IS NULL) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Please set your location in settings before packing orders'
    );
  END IF;

  -- Determine new status
  CASE p_action
    WHEN 'accept' THEN v_new_status := 'accepted';
    WHEN 'reject' THEN v_new_status := 'rejected';
    WHEN 'pack' THEN v_new_status := 'packed';
  END CASE;

  -- Update order status
  UPDATE orders 
  SET 
    status = v_new_status,
    updated_at = now()
  WHERE id = p_order_id;

  -- Create seller notification
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    role,
    order_id
  ) VALUES (
    p_seller_user_id,
    CASE p_action
      WHEN 'accept' THEN 'Order Accepted'
      WHEN 'reject' THEN 'Order Rejected'
      WHEN 'pack' THEN 'Order Packed'
    END,
    COALESCE(
      'Order #' || SUBSTRING(p_order_id::text, 1, 8) || ' has been ' || p_action || 'ed successfully',
      'Order has been ' || p_action || 'ed'
    ),
    'order_updated',
    'seller',
    p_order_id
  );

  -- For packed orders, notify delivery agents immediately
  IF p_action = 'pack' THEN
    BEGIN
      -- Call the edge function to notify delivery agents immediately
      SELECT net.http_post(
        url := 'https://amhpjsmubciahslghobw.supabase.co/functions/v1/notify-delivery-agents',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'authorization'
        ),
        body := jsonb_build_object(
          'orderId', p_order_id,
          'orderStatus', 'packed',
          'orderData', row_to_json(v_order)
        )
      ) INTO v_edge_function_response;
      
      v_error_context := v_error_context || jsonb_build_object(
        'edge_function_called', true,
        'edge_function_response', v_edge_function_response
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Log edge function call failure but don't fail the main operation
      v_error_context := v_error_context || jsonb_build_object(
        'edge_function_error', SQLERRM
      );
    END;

    -- Also create local agent notifications as backup
    v_notification_title := 'New Delivery Available';
    v_notification_message := COALESCE(
      'Order #' || SUBSTRING(p_order_id::text, 1, 8) || ' is ready for pickup from ' || COALESCE(v_seller.business_name, v_seller.name, 'seller'),
      'New order ready for pickup'
    );

    -- Get all active delivery agents and notify them
    FOR v_agent IN 
      SELECT id, name, email 
      FROM delivery_agents 
      WHERE is_active = true
    LOOP
      BEGIN
        -- Insert agent notification with correct type
        INSERT INTO agent_notifications (
          agent_id,
          type,
          title,
          message,
          source_type,
          source_id,
          metadata
        ) VALUES (
          v_agent.id,
          'new_delivery_assignment',
          v_notification_title,
          v_notification_message,
          'seller',
          p_seller_user_id,
          jsonb_build_object(
            'order_id', p_order_id,
            'seller_name', COALESCE(v_seller.business_name, v_seller.name),
            'seller_location', jsonb_build_object(
              'latitude', v_seller.latitude,
              'longitude', v_seller.longitude
            )
          )
        );

        -- Log successful notification
        v_error_context := v_error_context || jsonb_build_object(
          'notified_agent_' || v_agent.id::text, true
        );

      EXCEPTION WHEN OTHERS THEN
        -- Log agent notification failure but continue
        v_error_context := v_error_context || jsonb_build_object(
          'agent_notification_error_' || v_agent.id::text, SQLERRM
        );
      END;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Order ' || p_action || 'ed successfully',
    'new_status', v_new_status,
    'notifications_sent', v_error_context
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to update order status: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;