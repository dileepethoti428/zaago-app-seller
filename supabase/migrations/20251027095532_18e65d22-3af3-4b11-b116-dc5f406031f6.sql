-- Create customer lookup function to fetch all order, customer, seller, and delivery agent details
CREATE OR REPLACE FUNCTION lookup_order_by_tracking_id(tracking_id_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  order_record record;
BEGIN
  -- Get order with all related details
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
    s.name as seller_name,
    s.phone as seller_contact,
    s.email as seller_email,
    da.name as agent_name,
    da.phone as agent_phone,
    da.email as agent_email,
    da.is_online as agent_online_status
  INTO order_record
  FROM orders o
  LEFT JOIN sellers s ON o.user_id = s.user_id
  LEFT JOIN delivery_agents da ON (o.agent_id = da.id OR o.assigned_agent_id = da.id)
  WHERE o.tracking_id = tracking_id_input;

  -- Check if order exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found with this tracking ID');
  END IF;

  -- Check if current user is the seller of this order (RLS enforcement)
  IF order_record.user_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'You do not have permission to view this order');
  END IF;

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
      'items', order_record.items
    ),
    'customer_info', jsonb_build_object(
      'name', order_record.customer_name,
      'phone', order_record.customer_phone,
      'delivery_address', order_record.address
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
      'assigned', (order_record.agent_name IS NOT NULL)
    )
  );

  RETURN result;
END;
$$;