-- Create function to notify nearby delivery agents when order is packed
CREATE OR REPLACE FUNCTION notify_nearby_delivery_agents(p_order_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_pickup_location RECORD;
  v_agent RECORD;
  v_notification_count INTEGER := 0;
  v_distance_km NUMERIC;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Get pickup location from seller location (assuming first item's seller location)
  SELECT 
    s.latitude,
    s.longitude,
    s.name as seller_name
  INTO v_pickup_location
  FROM sellers s
  WHERE s.user_id = (
    SELECT p.seller_id 
    FROM products p 
    WHERE p.id = (v_order.items->0->>'id')::uuid
    LIMIT 1
  );
  
  -- If no seller location found, use delivery address
  IF v_pickup_location.latitude IS NULL THEN
    SELECT 
      (v_order.address->>'latitude')::numeric as latitude,
      (v_order.address->>'longitude')::numeric as longitude,
      'Pickup Location' as seller_name
    INTO v_pickup_location;
  END IF;
  
  -- Find all active, online delivery agents within 15km
  FOR v_agent IN
    SELECT 
      da.id,
      da.name,
      da.email,
      dl.latitude,
      dl.longitude
    FROM delivery_agents da
    JOIN driver_locations dl ON da.id = dl.agent_id
    WHERE da.is_active = true 
      AND da.is_online = true
      AND dl.is_active = true
      AND dl.recorded_at > now() - interval '30 minutes' -- Recent location
  LOOP
    -- Calculate distance
    v_distance_km := (
      6371 * acos(
        cos(radians(v_pickup_location.latitude)) * 
        cos(radians(v_agent.latitude)) * 
        cos(radians(v_agent.longitude) - radians(v_pickup_location.longitude)) + 
        sin(radians(v_pickup_location.latitude)) * 
        sin(radians(v_agent.latitude))
      )
    );
    
    -- If within 15km, create notification
    IF v_distance_km <= 15 THEN
      INSERT INTO agent_notifications (
        agent_id,
        type,
        title,
        message,
        metadata
      ) VALUES (
        v_agent.id,
        'new_delivery_assignment',
        'New Order Available',
        'New order from ' || v_pickup_location.seller_name || ' - ' || ROUND(v_distance_km, 1) || 'km away',
        jsonb_build_object(
          'order_id', p_order_id,
          'distance_km', ROUND(v_distance_km, 1),
          'pickup_location', jsonb_build_object(
            'latitude', v_pickup_location.latitude,
            'longitude', v_pickup_location.longitude,
            'seller_name', v_pickup_location.seller_name
          ),
          'delivery_address', v_order.address,
          'order_total', v_order.total,
          'customer_name', v_order.customer_name,
          'payment_method', CASE WHEN v_order.payment_status = 'paid_cod' THEN 'COD' ELSE 'Online' END
        )
      );
      
      v_notification_count := v_notification_count + 1;
    END IF;
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
      'action', 'nearby_agents_notified',
      'order_id', p_order_id,
      'agents_notified', v_notification_count,
      'pickup_location', v_pickup_location,
      'notification_time', now()
    )
  );
  
  RETURN v_notification_count;
END;
$$;

-- Create function for agents to accept delivery assignments
CREATE OR REPLACE FUNCTION accept_delivery_assignment(p_order_id uuid, p_agent_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_agent RECORD;
BEGIN
  -- Verify agent exists and is active
  SELECT * INTO v_agent FROM delivery_agents WHERE id = p_agent_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Agent not found or inactive'
    );
  END IF;
  
  -- Get and lock the order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND status = 'packed' FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not available for assignment'
    );
  END IF;
  
  -- Assign order to agent
  UPDATE orders 
  SET 
    agent_id = p_agent_id,
    status = 'assigned',
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Mark all related notifications as read for this order
  UPDATE agent_notifications 
  SET read = true, updated_at = now()
  WHERE type = 'new_delivery_assignment'
    AND (metadata->>'order_id')::uuid = p_order_id;
  
  -- Create confirmation notification for assigned agent
  INSERT INTO agent_notifications (
    agent_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
    p_agent_id,
    'order_assigned',
    'Order Assigned',
    'You have been assigned order #' || LEFT(p_order_id::text, 8) || '...',
    jsonb_build_object(
      'order_id', p_order_id,
      'customer_name', v_order.customer_name,
      'total_amount', v_order.total,
      'assigned_at', now()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Order assigned successfully',
    'order_id', p_order_id,
    'agent_id', p_agent_id
  );
END;
$$;

-- Update the existing trigger to use the new notification system
CREATE OR REPLACE FUNCTION auto_assign_to_delivery_agent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notification_count INTEGER;
BEGIN
  -- Only process when status changes to 'packed'
  IF NEW.status = 'packed' AND (OLD.status IS NULL OR OLD.status != 'packed') THEN
    
    -- Notify all nearby delivery agents instead of auto-assigning
    SELECT notify_nearby_delivery_agents(NEW.id) INTO notification_count;
    
    -- Log the notification process
    INSERT INTO password_reset_logs (
      email,
      event_type,
      metadata
    ) VALUES (
      'system@zaago.com',
      'email_sent',
      jsonb_build_object(
        'action', 'order_packed_notifications_sent',
        'order_id', NEW.id,
        'agents_notified', notification_count,
        'order_total', NEW.total,
        'customer_name', NEW.customer_name
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;