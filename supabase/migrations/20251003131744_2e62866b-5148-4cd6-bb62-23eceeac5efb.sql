-- Improve notification trigger for sellers with better reliability and pg_notify broadcast

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS notify_sellers_on_new_order ON orders;
DROP FUNCTION IF EXISTS notify_sellers_on_new_order() CASCADE;

-- Create improved notification function with pg_notify broadcast
CREATE OR REPLACE FUNCTION notify_sellers_on_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_record RECORD;
  notification_id UUID;
  order_items JSONB;
BEGIN
  -- Log trigger execution
  INSERT INTO password_reset_logs (email, event_type, metadata)
  VALUES ('system@zaago.com', 'email_sent', jsonb_build_object(
    'action', 'notify_sellers_trigger_fired',
    'order_id', NEW.id,
    'status', NEW.status,
    'timestamp', NOW()
  ));

  -- Get unique sellers from order items
  FOR seller_record IN
    SELECT DISTINCT (item->>'seller_id')::UUID as seller_id
    FROM jsonb_array_elements(NEW.items) as item
    WHERE item->>'seller_id' IS NOT NULL
  LOOP
    BEGIN
      -- Create notification for each seller
      INSERT INTO notifications (
        user_id,
        type,
        role,
        title,
        message,
        order_id,
        metadata
      ) VALUES (
        seller_record.seller_id,
        'new_order',
        'seller',
        '🔔 New Order Received!',
        'Order #' || NEW.id || ' - ₹' || NEW.total || ' - ' || NEW.customer_name,
        NEW.id,
        jsonb_build_object(
          'order_id', NEW.id,
          'customer_name', NEW.customer_name,
          'total', NEW.total,
          'items_count', jsonb_array_length(NEW.items),
          'created_at', NEW.created_at
        )
      ) RETURNING id INTO notification_id;

      -- Broadcast via pg_notify for immediate delivery
      PERFORM pg_notify(
        'new_order_notification',
        jsonb_build_object(
          'type', 'new_order',
          'seller_id', seller_record.seller_id,
          'order_id', NEW.id,
          'notification_id', notification_id,
          'total', NEW.total,
          'customer_name', NEW.customer_name
        )::text
      );

      -- Log successful notification
      INSERT INTO password_reset_logs (email, event_type, metadata)
      VALUES ('system@zaago.com', 'email_sent', jsonb_build_object(
        'action', 'seller_notification_created',
        'order_id', NEW.id,
        'seller_id', seller_record.seller_id,
        'notification_id', notification_id
      ));

    EXCEPTION WHEN OTHERS THEN
      -- Log any errors but don't stop order creation
      INSERT INTO password_reset_logs (email, event_type, metadata, error)
      VALUES ('system@zaago.com', 'email_sent', jsonb_build_object(
        'action', 'seller_notification_failed',
        'order_id', NEW.id,
        'seller_id', seller_record.seller_id
      ), SQLERRM);
    END;
  END LOOP;

  -- Update notification count on order
  UPDATE orders 
  SET notification_count = (
    SELECT COUNT(*) FROM notifications 
    WHERE order_id = NEW.id AND type = 'new_order' AND role = 'seller'
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create trigger that fires on EVERY new order INSERT
CREATE TRIGGER notify_sellers_on_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_sellers_on_new_order();

COMMENT ON FUNCTION notify_sellers_on_new_order IS 'Improved notification trigger with pg_notify broadcast and error handling for reliable seller notifications';