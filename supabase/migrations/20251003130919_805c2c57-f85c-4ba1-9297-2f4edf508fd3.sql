-- Simplify notify_sellers_on_new_order trigger - remove OneSignal HTTP call
DROP FUNCTION IF EXISTS notify_sellers_on_new_order() CASCADE;

CREATE OR REPLACE FUNCTION notify_sellers_on_new_order()
RETURNS TRIGGER AS $$
DECLARE
  seller_record RECORD;
  seller_items JSONB;
  seller_total NUMERIC;
BEGIN
  -- Only process new orders with pending/placed status
  IF (TG_OP = 'INSERT' AND NEW.status IN ('pending', 'placed')) OR 
     (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('pending', 'placed')) THEN
    
    -- Extract unique seller IDs and their items
    FOR seller_record IN
      SELECT DISTINCT (item->>'seller_id')::uuid as seller_id
      FROM jsonb_array_elements(NEW.items) as item
      WHERE item->>'seller_id' IS NOT NULL
    LOOP
      -- Filter items for this specific seller
      SELECT jsonb_agg(item) INTO seller_items
      FROM jsonb_array_elements(NEW.items) as item
      WHERE (item->>'seller_id')::uuid = seller_record.seller_id;
      
      -- Calculate seller-specific total
      SELECT COALESCE(SUM((item->>'price')::numeric * (item->>'quantity')::numeric), 0) INTO seller_total
      FROM jsonb_array_elements(seller_items) as item;
      
      -- Create notification with complete order details
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
          'customer_phone', NEW.customer_phone,
          'order_id', NEW.id,
          'order_status', NEW.status,
          'order_total', seller_total,
          'items', seller_items,
          'delivery_address', NEW.address,
          'payment_method', NEW.payment_status,
          'created_at', NEW.created_at
        )
      );
      
      -- Log notification creation (removed OneSignal HTTP call)
      INSERT INTO password_reset_logs (email, event_type, metadata)
      VALUES (
        'system@zaago.com',
        'email_sent',
        jsonb_build_object(
          'action', 'seller_notification_created',
          'seller_id', seller_record.seller_id,
          'order_id', NEW.id,
          'seller_total', seller_total,
          'items_count', jsonb_array_length(seller_items),
          'timestamp', now()
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER notify_sellers_trigger
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_sellers_on_new_order();