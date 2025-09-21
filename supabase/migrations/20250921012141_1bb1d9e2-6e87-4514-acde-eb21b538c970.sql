-- Create function to extract seller IDs from order items
CREATE OR REPLACE FUNCTION public.extract_seller_ids_from_order(order_items jsonb)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  seller_ids uuid[] := '{}';
  item jsonb;
BEGIN
  -- Loop through each item in the order
  FOR item IN SELECT * FROM jsonb_array_elements(order_items)
  LOOP
    -- Extract seller_id from each item and add to array if not null
    IF item->>'seller_id' IS NOT NULL THEN
      seller_ids := array_append(seller_ids, (item->>'seller_id')::uuid);
    END IF;
  END LOOP;
  
  -- Return unique seller IDs
  RETURN array(SELECT DISTINCT unnest(seller_ids));
END;
$function$;

-- Create function to notify sellers when orders contain their products
CREATE OR REPLACE FUNCTION public.notify_sellers_on_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  seller_ids uuid[];
  seller_id uuid;
  seller_user_id uuid;
  product_names text[];
  notification_message text;
BEGIN
  -- Only trigger for new orders
  IF TG_OP = 'INSERT' THEN
    -- Extract seller IDs from order items
    SELECT extract_seller_ids_from_order(NEW.items) INTO seller_ids;
    
    -- Loop through each seller and create notifications
    FOREACH seller_id IN ARRAY seller_ids
    LOOP
      -- Get seller's user_id
      SELECT user_id INTO seller_user_id
      FROM sellers
      WHERE user_id = seller_id;
      
      -- Get product names for this seller from the order
      SELECT array_agg(item->>'name') INTO product_names
      FROM jsonb_array_elements(NEW.items) AS item
      WHERE (item->>'seller_id')::uuid = seller_id;
      
      -- Create notification message
      notification_message := 'New order #' || NEW.id::text || ' contains your products: ' || 
                            array_to_string(product_names, ', ') || 
                            '. Total: ₹' || NEW.total::text;
      
      -- Create notification for seller
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        role,
        order_id,
        metadata
      ) VALUES (
        seller_user_id,
        'New Order Alert! 🔔',
        notification_message,
        'new_order',
        'seller',
        NEW.id,
        jsonb_build_object(
          'order_id', NEW.id,
          'customer_name', NEW.customer_name,
          'total_amount', NEW.total,
          'product_names', product_names,
          'seller_id', seller_id,
          'order_status', NEW.status,
          'created_at', NEW.created_at
        )
      );
    END LOOP;
    
    -- Log successful notification creation
    INSERT INTO password_reset_logs (
      email,
      event_type,
      metadata
    ) VALUES (
      'system@zaago.com',
      'email_sent',
      jsonb_build_object(
        'action', 'seller_notifications_sent',
        'order_id', NEW.id,
        'seller_count', array_length(seller_ids, 1),
        'seller_ids', seller_ids,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to notify sellers on new orders
DROP TRIGGER IF EXISTS trigger_notify_sellers_on_new_order ON orders;
CREATE TRIGGER trigger_notify_sellers_on_new_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_sellers_on_new_order();

-- Create function to get orders for a specific seller
CREATE OR REPLACE FUNCTION public.get_seller_specific_orders(p_seller_user_id uuid)
RETURNS TABLE(
  order_id uuid,
  customer_name text,
  customer_phone text,
  total_amount numeric,
  order_status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  delivery_date date,
  address jsonb,
  seller_items jsonb,
  seller_total numeric,
  payment_status text,
  agent_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as order_id,
    o.customer_name,
    o.customer_phone,
    o.total as total_amount,
    o.status as order_status,
    o.created_at,
    o.updated_at,
    o.delivery_date,
    o.address,
    -- Extract only items belonging to this seller
    (
      SELECT jsonb_agg(item)
      FROM jsonb_array_elements(o.items) AS item
      WHERE (item->>'seller_id')::uuid = p_seller_user_id
    ) as seller_items,
    -- Calculate total for this seller's items
    (
      SELECT COALESCE(SUM((item->>'price')::numeric * (item->>'quantity')::numeric), 0)
      FROM jsonb_array_elements(o.items) AS item
      WHERE (item->>'seller_id')::uuid = p_seller_user_id
    ) as seller_total,
    o.payment_status,
    o.agent_id
  FROM orders o
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(o.items) AS item
    WHERE (item->>'seller_id')::uuid = p_seller_user_id
  )
  ORDER BY o.created_at DESC;
END;
$function$;

-- Create function to update seller order status (accept/reject/pack)
CREATE OR REPLACE FUNCTION public.update_seller_order_status(
  p_order_id uuid,
  p_seller_user_id uuid,
  p_action text -- 'accept', 'reject', 'pack'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_record RECORD;
  has_seller_items boolean := false;
  notification_title text;
  notification_message text;
BEGIN
  -- Validate action
  IF p_action NOT IN ('accept', 'reject', 'pack') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action. Must be accept, reject, or pack'
    );
  END IF;
  
  -- Check if order exists and seller has items in it
  SELECT * INTO order_record
  FROM orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;
  
  -- Verify seller has items in this order
  SELECT EXISTS(
    SELECT 1
    FROM jsonb_array_elements(order_record.items) AS item
    WHERE (item->>'seller_id')::uuid = p_seller_user_id
  ) INTO has_seller_items;
  
  IF NOT has_seller_items THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No items from this seller in the order'
    );
  END IF;
  
  -- Update order status based on action
  CASE p_action
    WHEN 'accept' THEN
      UPDATE orders SET status = 'accepted', updated_at = now() WHERE id = p_order_id;
      notification_title := 'Order Accepted';
      notification_message := 'Your order #' || p_order_id::text || ' has been accepted by the seller';
      
    WHEN 'reject' THEN
      UPDATE orders SET status = 'rejected', updated_at = now() WHERE id = p_order_id;
      notification_title := 'Order Rejected';
      notification_message := 'Unfortunately, your order #' || p_order_id::text || ' was rejected by the seller';
      
    WHEN 'pack' THEN
      UPDATE orders SET status = 'packed', updated_at = now() WHERE id = p_order_id;
      notification_title := 'Order Packed';
      notification_message := 'Your order #' || p_order_id::text || ' is packed and ready for delivery';
  END CASE;
  
  -- Send notification to customer
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    role,
    order_id,
    metadata
  ) VALUES (
    (SELECT user_id FROM orders WHERE id = p_order_id),
    notification_title,
    notification_message,
    'order_update',
    'user',
    p_order_id,
    jsonb_build_object(
      'order_id', p_order_id,
      'action', p_action,
      'seller_id', p_seller_user_id,
      'timestamp', now()
    )
  );
  
  -- If packed, notify delivery agents
  IF p_action = 'pack' THEN
    INSERT INTO agent_notifications (
      agent_id,
      type,
      title,
      message,
      metadata
    )
    SELECT 
      da.id,
      'order_ready',
      'Order Ready for Pickup',
      'Order #' || p_order_id::text || ' is packed and ready for delivery',
      jsonb_build_object(
        'order_id', p_order_id,
        'customer_name', order_record.customer_name,
        'total_amount', order_record.total,
        'address', order_record.address,
        'ready_at', now()
      )
    FROM delivery_agents da
    WHERE da.is_active = true AND da.is_online = true;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Order status updated successfully',
    'action', p_action,
    'order_id', p_order_id
  );
END;
$function$;