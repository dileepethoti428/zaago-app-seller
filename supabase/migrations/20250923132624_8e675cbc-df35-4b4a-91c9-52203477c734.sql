-- Fix the update_seller_order_status function to use correct notification type
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
    
    -- Update order status to packed
    UPDATE orders 
    SET status = 'packed', updated_at = now()
    WHERE id = p_order_id;
    
    -- Try to find an available delivery agent (simplified logic)
    SELECT id INTO v_agent_id
    FROM delivery_agents 
    WHERE is_active = true AND is_online = true
    ORDER BY performance_score DESC
    LIMIT 1;
    
    -- If agent found, assign and notify
    IF v_agent_id IS NOT NULL THEN
      -- Assign agent to order
      UPDATE orders 
      SET agent_id = v_agent_id, status = 'in_transit'
      WHERE id = p_order_id;
      
      -- Create notification for delivery agent using correct type
      BEGIN
        INSERT INTO agent_notifications (
          agent_id,
          type,
          title,
          message,
          source_type,
          source_id,
          metadata
        ) VALUES (
          v_agent_id,
          'new_delivery_assignment',  -- Changed from 'new_delivery_available'
          'New Delivery Assignment',   -- Updated title
          'You have been assigned a new delivery from ' || v_seller.business_name || '. Please check the details and proceed to pickup.',  -- Updated message
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
            'total_amount', v_order.total
          )
        );
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the pack operation
        INSERT INTO password_reset_logs (
          email,
          event_type,
          metadata,
          error
        ) VALUES (
          'system@zaago.com',
          'email_sent',
          jsonb_build_object(
            'action', 'agent_notification_failed',
            'order_id', p_order_id,
            'agent_id', v_agent_id,
            'seller_id', p_seller_user_id
          ),
          SQLERRM
        );
      END;
      
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Order packed and assigned to delivery agent successfully'
      );
    ELSE
      -- No agent available, just mark as packed
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Order packed successfully. Delivery agent will be assigned soon.'
      );
    END IF;
    
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action. Must be accept, reject, or pack'
    );
  END IF;
END;
$function$;