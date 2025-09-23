-- Fix the update_seller_order_status function to create proper realtime notifications for agents
-- and ensure orders are visible to delivery agents when packed

-- First, let's update the function to handle agent notifications correctly
CREATE OR REPLACE FUNCTION public.update_seller_order_status(
  p_order_id uuid,
  p_seller_user_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_seller RECORD;
  v_result jsonb;
  v_agent_id uuid;
BEGIN
  -- Get order details
  SELECT * INTO v_order
  FROM orders 
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;
  
  -- Get seller details
  SELECT * INTO v_seller
  FROM sellers 
  WHERE user_id = p_seller_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Seller not found'
    );
  END IF;
  
  -- Handle different actions
  IF p_action = 'accept' THEN
    -- Update order status to accepted
    UPDATE orders 
    SET status = 'accepted', updated_at = now()
    WHERE id = p_order_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Order accepted successfully'
    );
    
  ELSIF p_action = 'reject' THEN
    -- Update order status to rejected
    UPDATE orders 
    SET status = 'rejected', updated_at = now()
    WHERE id = p_order_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Order rejected successfully'
    );
    
  ELSIF p_action = 'pack' THEN
    -- Check if seller has location set
    IF v_seller.latitude IS NULL OR v_seller.longitude IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Please set your location in settings before packing orders. Click Settings → Location to set up your location.'
      );
    END IF;
    
    -- Update order status to packed (ready for pickup)
    UPDATE orders 
    SET status = 'packed', updated_at = now()
    WHERE id = p_order_id;
    
    -- Broadcast to all available delivery agents about new packed order
    -- This creates opportunities for agents to see and claim orders
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      role,
      metadata
    )
    SELECT 
      da.id as user_id,
      'New Delivery Available',
      'A new delivery is ready for pickup from ' || v_seller.business_name || '. Check your delivery dashboard.',
      'new_delivery_available',
      'agent',
      jsonb_build_object(
        'order_id', p_order_id,
        'seller_name', v_seller.business_name,
        'seller_location', jsonb_build_object(
          'latitude', v_seller.latitude,
          'longitude', v_seller.longitude,
          'address', v_seller.address
        ),
        'customer_location', v_order.address,
        'total_amount', v_order.total,
        'order_status', 'packed'
      )
    FROM delivery_agents da
    WHERE da.is_active = true 
      AND da.is_online = true;
    
    -- Also create agent_notifications for real-time updates
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
      da.id as agent_id,
      'new_delivery_available',
      'New Delivery Available',
      'A new delivery is ready for pickup from ' || v_seller.business_name || '. Total: ₹' || v_order.total,
      'system',
      p_order_id,
      jsonb_build_object(
        'order_id', p_order_id,
        'seller_name', v_seller.business_name,
        'seller_location', jsonb_build_object(
          'latitude', v_seller.latitude,
          'longitude', v_seller.longitude,
          'address', v_seller.address
        ),
        'customer_location', v_order.address,
        'total_amount', v_order.total,
        'priority', 'normal'
      )
    FROM delivery_agents da
    WHERE da.is_active = true 
      AND da.is_online = true;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Order packed successfully. Delivery agents have been notified.'
    );
    
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action. Must be accept, reject, or pack'
    );
  END IF;
END;
$function$;