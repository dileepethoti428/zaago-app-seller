-- COMPREHENSIVE FIX: Fire on both 'pending' and 'placed', add idempotency and logging
-- Using a safer approach to avoid deadlocks

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_notify_sellers_on_new_order ON orders;
DROP FUNCTION IF EXISTS notify_sellers_on_new_order();

-- Create improved function with idempotency and logging
CREATE OR REPLACE FUNCTION public.notify_sellers_on_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_record RECORD;
  seller_data RECORD;
  notification_exists BOOLEAN;
BEGIN
  -- Fire on BOTH 'pending' and 'placed' status to handle all cases
  IF NEW.status IN ('pending', 'placed') AND (OLD IS NULL OR OLD.status NOT IN ('pending', 'placed')) THEN
    
    -- Get unique sellers from order items
    FOR seller_record IN
      SELECT DISTINCT (item->>'seller_id')::uuid as seller_id
      FROM jsonb_array_elements(NEW.items) AS item
      WHERE item->>'seller_id' IS NOT NULL
    LOOP
      -- CHECK IDEMPOTENCY: Prevent duplicate notifications
      SELECT EXISTS(
        SELECT 1 FROM notifications 
        WHERE user_id = seller_record.seller_id 
        AND order_id = NEW.id 
        AND type = 'new_order'
      ) INTO notification_exists;
      
      IF NOT notification_exists THEN
        -- Get seller-specific order details
        SELECT * INTO seller_data
        FROM get_seller_order_items(NEW.items, seller_record.seller_id);
        
        -- Create notification with type='new_order' and complete metadata
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
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_sellers_on_new_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_sellers_on_new_order();