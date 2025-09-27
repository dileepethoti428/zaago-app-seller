-- Fix the update_seller_order_status function to remove problematic edge function call
CREATE OR REPLACE FUNCTION public.update_seller_order_status(
  p_order_id uuid,
  p_seller_user_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_record RECORD;
  v_seller_location RECORD;
  v_new_status TEXT;
  v_agent_record RECORD;
BEGIN
  -- Validate action
  IF p_action NOT IN ('accept', 'reject', 'pack') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action. Must be accept, reject, or pack'
    );
  END IF;

  -- Determine new status
  v_new_status := CASE 
    WHEN p_action = 'accept' THEN 'accepted'
    WHEN p_action = 'reject' THEN 'rejected'
    WHEN p_action = 'pack' THEN 'packed'
  END;

  -- Get order details and verify seller ownership
  SELECT * INTO v_order_record
  FROM orders 
  WHERE id = p_order_id
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE p.seller_id = p_seller_user_id
  );

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found or you do not have permission to update this order'
    );
  END IF;

  -- For pack action, verify seller has location set
  IF p_action = 'pack' THEN
    SELECT latitude, longitude, address INTO v_seller_location
    FROM sellers 
    WHERE user_id = p_seller_user_id 
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Please set your location in settings before packing orders'
      );
    END IF;
  END IF;

  -- Update order status
  UPDATE orders 
  SET 
    status = v_new_status,
    updated_at = now(),
    pickup_location = CASE 
      WHEN p_action = 'pack' THEN jsonb_build_object(
        'latitude', v_seller_location.latitude,
        'longitude', v_seller_location.longitude,
        'address', v_seller_location.address
      )
      ELSE pickup_location
    END
  WHERE id = p_order_id;

  -- If packing, create notifications for active delivery agents
  IF p_action = 'pack' THEN
    -- Create notifications for all active delivery agents
    FOR v_agent_record IN 
      SELECT id FROM delivery_agents 
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
        v_agent_record.id,
        'new_order',
        'New Order Ready for Pickup',
        'Order #' || SUBSTRING(p_order_id::text, 1, 8) || ' is ready for delivery',
        'order',
        p_order_id,
        jsonb_build_object(
          'order_id', p_order_id,
          'action', 'packed',
          'customer_name', v_order_record.customer_name,
          'total_amount', v_order_record.total,
          'created_at', now()
        )
      );
    END LOOP;

    -- Log the notification activity
    INSERT INTO password_reset_logs (
      email,
      event_type,
      metadata
    ) VALUES (
      'system@zaago.com',
      'email_sent',
      jsonb_build_object(
        'action', 'order_packed_notifications_sent',
        'order_id', p_order_id,
        'seller_id', p_seller_user_id,
        'agent_count', (SELECT COUNT(*) FROM delivery_agents WHERE is_active = true AND is_online = true),
        'timestamp', now()
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Order ' || p_action || 'ed successfully',
    'order_id', p_order_id,
    'new_status', v_new_status
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;