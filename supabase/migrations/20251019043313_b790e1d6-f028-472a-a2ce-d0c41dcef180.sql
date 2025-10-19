-- Fix seller notification timing based on payment status
-- Sellers should only be notified:
-- 1. For COD orders: immediately when order is placed
-- 2. For paid orders: only after payment is completed

DROP TRIGGER IF EXISTS trigger_notify_sellers_on_new_order ON orders CASCADE;
DROP FUNCTION IF EXISTS notify_sellers_on_new_order() CASCADE;

CREATE OR REPLACE FUNCTION public.notify_sellers_on_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  seller_record RECORD;
  seller_data RECORD;
  should_notify BOOLEAN := false;
BEGIN
  -- Determine if we should notify sellers based on payment status
  IF TG_OP = 'INSERT' THEN
    -- For new orders, only notify if COD
    IF NEW.status = 'placed' AND NEW.payment_status = 'pending_cod' THEN
      should_notify := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- For updates, notify when payment_status changes to 'paid' or 'completed'
    IF NEW.status = 'placed' AND 
       OLD.payment_status IN ('pending', 'processing') AND 
       NEW.payment_status IN ('paid', 'completed') THEN
      should_notify := true;
    END IF;
  END IF;

  -- Only proceed if we should notify
  IF should_notify THEN
    -- Get unique sellers from order items
    FOR seller_record IN
      SELECT DISTINCT (item->>'seller_id')::uuid as seller_id
      FROM jsonb_array_elements(NEW.items) AS item
      WHERE item->>'seller_id' IS NOT NULL
    LOOP
      -- Get seller-specific order details
      SELECT * INTO seller_data
      FROM get_seller_order_items(NEW.id, seller_record.seller_id);
      
      -- Create notification for this seller with complete metadata
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        role,
        order_id,
        metadata
      ) VALUES (
        seller_record.seller_id,
        'New Order Received!',
        'You have received a new order #' || NEW.id::text || ' with ' || 
        COALESCE(seller_data.item_count, 0) || ' item(s) worth ₹' || 
        COALESCE(seller_data.total_price, 0),
        'new_order',
        'seller',
        NEW.id,
        jsonb_build_object(
          'order_id', NEW.id,
          'customer_name', NEW.customer_name,
          'customer_phone', NEW.customer_phone,
          'total_amount', NEW.total,
          'seller_total', COALESCE(seller_data.total_price, 0),
          'item_count', COALESCE(seller_data.item_count, 0),
          'item_names', COALESCE(seller_data.item_names, '[]'::jsonb),
          'seller_items', COALESCE(seller_data.seller_items, '[]'::jsonb),
          'delivery_address', NEW.delivery_address,
          'delivery_time_slot', NEW.delivery_time_slot,
          'payment_method', NEW.payment_method,
          'payment_status', NEW.payment_status,
          'order_status', NEW.status,
          'created_at', NEW.created_at
        )
      );
      
      -- Log notification creation for debugging
      INSERT INTO password_reset_logs (
        email,
        event_type,
        metadata
      ) VALUES (
        'system@zaago.com',
        'email_sent',
        jsonb_build_object(
          'action', 'seller_notification_created',
          'order_id', NEW.id,
          'seller_id', seller_record.seller_id,
          'notification_type', 'new_order',
          'payment_status', NEW.payment_status,
          'seller_total', COALESCE(seller_data.total_price, 0),
          'item_count', COALESCE(seller_data.item_count, 0),
          'timestamp', now()
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger for both INSERT and UPDATE
CREATE TRIGGER trigger_notify_sellers_on_new_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_sellers_on_new_order();