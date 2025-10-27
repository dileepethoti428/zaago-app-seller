-- Enhanced customer lookup function with delivery status and comprehensive details
CREATE OR REPLACE FUNCTION lookup_order_by_tracking_id(tracking_id_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  order_record record;
  is_admin boolean;
  timeline jsonb;
BEGIN
  -- Check if current user is admin
  is_admin := is_current_user_admin_v2();
  
  -- Get order with all related details including delivery status and agent metrics
  SELECT 
    o.id,
    o.tracking_id,
    o.status,
    o.total,
    o.payment_method,
    o.payment_status,
    o.created_at,
    o.delivery_date,
    o.delivery_time_slot,
    o.special_instructions,
    o.items,
    o.customer_name,
    o.customer_phone,
    o.address,
    o.pickup_address,
    o.pickup_location,
    o.user_id,
    o.delivered_at,
    o.pickup_status,
    o.otp_verified,
    o.otp_verified_at,
    o.delivery_otp,
    o.assigned_agent_id,
    o.agent_notification_sent_at,
    o.updated_at,
    s.name as seller_name,
    s.phone as seller_contact,
    s.email as seller_email,
    da.name as agent_name,
    da.phone as agent_phone,
    da.email as agent_email,
    da.is_online as agent_online_status,
    da.average_rating,
    da.total_deliveries,
    da.deliveries_today,
    da.performance_score,
    da.last_delivery_at,
    da.is_active as agent_is_active,
    da.last_status_change,
    addr.label as address_label,
    addr.full_address,
    addr.landmark,
    addr.city,
    addr.state,
    addr.pincode,
    addr.coordinates as address_coordinates
  INTO order_record
  FROM orders o
  LEFT JOIN sellers s ON o.user_id = s.user_id
  LEFT JOIN delivery_agents da ON (o.agent_id = da.id OR o.assigned_agent_id = da.id)
  LEFT JOIN delivery_addresses addr ON o.delivery_address_id = addr.id
  WHERE o.tracking_id = tracking_id_input;

  -- Check if order exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found with this tracking ID');
  END IF;

  -- Check permissions: Allow if user is admin OR the seller of this order
  IF NOT is_admin AND order_record.user_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'You do not have permission to view this order');
  END IF;

  -- Build delivery status timeline
  timeline := jsonb_build_array(
    jsonb_build_object('status', 'created', 'timestamp', order_record.created_at, 'label', 'Order Created'),
    CASE 
      WHEN order_record.status IN ('Confirmed', 'Preparing', 'Ready', 'Picked', 'Out for Delivery', 'Delivered')
      THEN jsonb_build_object('status', 'confirmed', 'timestamp', order_record.created_at, 'label', 'Order Confirmed')
      ELSE NULL
    END,
    CASE 
      WHEN order_record.pickup_status IS NOT NULL AND order_record.pickup_status != 'pending'
      THEN jsonb_build_object('status', 'ready', 'timestamp', order_record.updated_at, 'label', 'Ready for Pickup')
      ELSE NULL
    END,
    CASE 
      WHEN order_record.agent_notification_sent_at IS NOT NULL
      THEN jsonb_build_object('status', 'agent_assigned', 'timestamp', order_record.agent_notification_sent_at, 'label', 'Agent Assigned')
      ELSE NULL
    END,
    CASE 
      WHEN order_record.pickup_status = 'picked'
      THEN jsonb_build_object('status', 'picked', 'timestamp', order_record.updated_at, 'label', 'Picked Up')
      ELSE NULL
    END,
    CASE 
      WHEN order_record.status = 'Out for Delivery'
      THEN jsonb_build_object('status', 'out_for_delivery', 'timestamp', order_record.updated_at, 'label', 'Out for Delivery')
      ELSE NULL
    END,
    CASE 
      WHEN order_record.delivered_at IS NOT NULL
      THEN jsonb_build_object('status', 'delivered', 'timestamp', order_record.delivered_at, 'label', 'Delivered')
      ELSE NULL
    END
  );

  -- Remove null entries from timeline
  timeline := (SELECT jsonb_agg(item) FROM jsonb_array_elements(timeline) item WHERE item IS NOT NULL);

  -- Build comprehensive result
  result := jsonb_build_object(
    'order_info', jsonb_build_object(
      'tracking_id', order_record.tracking_id,
      'order_id', order_record.id,
      'status', order_record.status,
      'total_amount', order_record.total,
      'payment_method', order_record.payment_method,
      'payment_status', order_record.payment_status,
      'created_at', order_record.created_at,
      'delivery_date', order_record.delivery_date,
      'delivery_time_slot', order_record.delivery_time_slot,
      'special_instructions', order_record.special_instructions,
      'items', order_record.items,
      'delivered_at', order_record.delivered_at,
      'pickup_status', order_record.pickup_status,
      'otp_verified', order_record.otp_verified,
      'otp_verified_at', order_record.otp_verified_at,
      'otp_masked', CASE WHEN order_record.delivery_otp IS NOT NULL THEN '***' || RIGHT(order_record.delivery_otp, 3) ELSE NULL END,
      'agent_notification_sent_at', order_record.agent_notification_sent_at
    ),
    'delivery_status', jsonb_build_object(
      'current_status', order_record.status,
      'timeline', COALESCE(timeline, '[]'::jsonb)
    ),
    'customer_info', jsonb_build_object(
      'name', order_record.customer_name,
      'phone', order_record.customer_phone,
      'delivery_address', order_record.address,
      'address_label', order_record.address_label,
      'full_address', order_record.full_address,
      'landmark', order_record.landmark,
      'city', order_record.city,
      'state', order_record.state,
      'pincode', order_record.pincode,
      'coordinates', order_record.address_coordinates
    ),
    'seller_info', jsonb_build_object(
      'name', order_record.seller_name,
      'phone', order_record.seller_contact,
      'email', order_record.seller_email,
      'pickup_address', order_record.pickup_address,
      'pickup_location', order_record.pickup_location
    ),
    'agent_info', jsonb_build_object(
      'name', order_record.agent_name,
      'phone', order_record.agent_phone,
      'email', order_record.agent_email,
      'is_online', order_record.agent_online_status,
      'assigned', (order_record.agent_name IS NOT NULL),
      'average_rating', order_record.average_rating,
      'total_deliveries', order_record.total_deliveries,
      'deliveries_today', order_record.deliveries_today,
      'performance_score', order_record.performance_score,
      'last_delivery_at', order_record.last_delivery_at,
      'is_active', order_record.agent_is_active,
      'last_status_change', order_record.last_status_change
    )
  );

  RETURN result;
END;
$$;