-- Drop complex helper function and trigger to revert to simple working version
DROP FUNCTION IF EXISTS get_seller_order_items(uuid, jsonb) CASCADE;
DROP TRIGGER IF EXISTS notify_sellers_trigger ON orders;
DROP FUNCTION IF EXISTS notify_sellers_on_new_order() CASCADE;

-- Create simple working trigger function (like yesterday)
CREATE OR REPLACE FUNCTION notify_sellers_on_new_order()
RETURNS TRIGGER AS $$
DECLARE
  seller_record RECORD;
BEGIN
  -- Only process new orders with pending/placed status
  IF (TG_OP = 'INSERT' AND NEW.status IN ('pending', 'placed')) OR 
     (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('pending', 'placed')) THEN
    
    -- Extract unique seller IDs from order items
    FOR seller_record IN
      SELECT DISTINCT (item->>'seller_id')::uuid as seller_id
      FROM jsonb_array_elements(NEW.items) as item
      WHERE item->>'seller_id' IS NOT NULL
    LOOP
      -- Create simple notification for each seller
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
        'New Order Received',
        'You have a new order from ' || COALESCE(NEW.customer_name, 'a customer'),
        NEW.id,
        jsonb_build_object(
          'customer_name', NEW.customer_name,
          'order_id', NEW.id,
          'order_status', NEW.status,
          'order_total', NEW.total,
          'created_at', NEW.created_at
        )
      );
      
      -- Log notification creation
      INSERT INTO password_reset_logs (email, event_type, metadata)
      VALUES (
        'system@zaago.com',
        'email_sent',
        jsonb_build_object(
          'action', 'simple_seller_notification_created',
          'seller_id', seller_record.seller_id,
          'order_id', NEW.id,
          'order_total', NEW.total,
          'timestamp', now()
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER notify_sellers_trigger
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_sellers_on_new_order();