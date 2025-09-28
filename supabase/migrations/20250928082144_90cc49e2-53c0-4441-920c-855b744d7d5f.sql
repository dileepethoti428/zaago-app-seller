-- Update the update_seller_order_status function to handle notify_agents action
CREATE OR REPLACE FUNCTION public.update_seller_order_status(
  p_order_id UUID,
  p_seller_user_id UUID,
  p_action TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_record RECORD;
  seller_record RECORD;
  result_message TEXT;
  agent_record RECORD;
  notification_count INTEGER := 0;
BEGIN
  -- Get order details
  SELECT * INTO order_record
  FROM orders 
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;
  
  -- Get seller details and verify ownership
  SELECT * INTO seller_record
  FROM sellers
  WHERE user_id = p_seller_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Seller not found'
    );
  END IF;
  
  -- Verify seller has products in this order
  IF NOT EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(order_record.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE p.seller_id = p_seller_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not have products in this order'
    );
  END IF;
  
  -- Handle different actions
  CASE p_action
    WHEN 'accept' THEN
      UPDATE orders 
      SET status = 'accepted', updated_at = NOW()
      WHERE id = p_order_id;
      result_message := 'Order accepted successfully';
      
    WHEN 'reject' THEN
      UPDATE orders 
      SET status = 'rejected', updated_at = NOW()
      WHERE id = p_order_id;
      result_message := 'Order rejected successfully';
      
    WHEN 'pack' THEN
      -- Check if seller location is set for packing
      IF seller_record.latitude IS NULL OR seller_record.longitude IS NULL THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Please set your location in settings before packing orders'
        );
      END IF;
      
      UPDATE orders 
      SET status = 'packed', updated_at = NOW()
      WHERE id = p_order_id;
      result_message := 'Order packed successfully';
      
    WHEN 'notify_agents' THEN
      -- Transition from packed to assigned and notify delivery agents
      UPDATE orders 
      SET status = 'assigned', updated_at = NOW()
      WHERE id = p_order_id AND status = 'packed';
      
      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Order must be packed before notifying agents'
        );
      END IF;
      
      -- Notify all active delivery agents
      FOR agent_record IN
        SELECT id, name, email
        FROM delivery_agents
        WHERE is_active = true AND is_online = true
      LOOP
        INSERT INTO agent_notifications (
          agent_id,
          type,
          title,
          message,
          source_type,
          source_id,
          metadata
        ) VALUES (
          agent_record.id,
          'new_order',
          'New Order Available',
          'A new order is ready for pickup from ' || seller_record.business_name,
          'order',
          p_order_id,
          jsonb_build_object(
            'order_id', p_order_id,
            'seller_id', p_seller_user_id,
            'seller_name', seller_record.business_name,
            'total_amount', order_record.total,
            'delivery_address', order_record.address
          )
        );
        
        notification_count := notification_count + 1;
      END LOOP;
      
      result_message := 'Order assigned to delivery agents. ' || notification_count || ' agents notified.';
      
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid action'
      );
  END CASE;
  
  -- Log the action
  INSERT INTO password_reset_logs (
    email,
    event_type,
    metadata
  ) VALUES (
    (SELECT email FROM auth.users WHERE id = p_seller_user_id),
    'email_sent',
    jsonb_build_object(
      'action', 'seller_order_status_update',
      'order_id', p_order_id,
      'new_action', p_action,
      'seller_id', p_seller_user_id,
      'notification_count', COALESCE(notification_count, 0)
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', result_message
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;