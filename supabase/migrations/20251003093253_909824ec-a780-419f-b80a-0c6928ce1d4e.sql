-- COMPLETE FIX: Seller notification ringtone issue
-- Step 1: Create missing get_seller_order_items function
-- Step 2: Simplify trigger with direct calculations
-- Step 3: Add extensive logging for debugging

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_notify_sellers_on_new_order ON orders;
DROP FUNCTION IF EXISTS notify_sellers_on_new_order();
DROP FUNCTION IF EXISTS get_seller_order_items(jsonb, uuid);

-- Step 1: Create the missing helper function
CREATE OR REPLACE FUNCTION public.get_seller_order_items(
  order_items jsonb,
  target_seller_id uuid
)
RETURNS TABLE(
  seller_items jsonb,
  item_count integer,
  total_price numeric,
  item_names jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  filtered_items jsonb := '[]'::jsonb;
  item jsonb;
  names jsonb := '[]'::jsonb;
  count_items integer := 0;
  total numeric := 0;
BEGIN
  -- Filter items for this specific seller
  FOR item IN SELECT * FROM jsonb_array_elements(order_items)
  LOOP
    IF (item->>'seller_id')::uuid = target_seller_id THEN
      filtered_items := filtered_items || item;
      names := names || to_jsonb(item->>'name');
      count_items := count_items + 1;
      total := total + ((item->>'price')::numeric * (item->>'quantity')::integer);
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT filtered_items, count_items, total, names;
END;
$$;

-- Step 2 & 3: Create SIMPLIFIED trigger with EXTENSIVE LOGGING
CREATE OR REPLACE FUNCTION public.notify_sellers_on_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_record RECORD;
  notification_exists BOOLEAN;
  seller_items jsonb;
  seller_total numeric := 0;
  seller_item_count integer := 0;
  seller_item_names jsonb := '[]'::jsonb;
  item jsonb;
  sellers_found integer := 0;
  notifications_created integer := 0;
BEGIN
  -- Log trigger fire
  INSERT INTO password_reset_logs (email, event_type, metadata)
  VALUES (
    'system@zaago.com',
    'email_sent',
    jsonb_build_object(
      'action', 'seller_notification_trigger_fired',
      'order_id', NEW.id,
      'order_status', NEW.status,
      'old_status', COALESCE(OLD.status, 'NULL'),
      'trigger_time', now()
    )
  );

  -- Fire on BOTH 'pending' and 'placed' status
  IF NEW.status IN ('pending', 'placed') AND (OLD IS NULL OR OLD.status NOT IN ('pending', 'placed')) THEN
    
    -- Get unique sellers from order items
    FOR seller_record IN
      SELECT DISTINCT (item->>'seller_id')::uuid as seller_id
      FROM jsonb_array_elements(NEW.items) AS item
      WHERE item->>'seller_id' IS NOT NULL
    LOOP
      sellers_found := sellers_found + 1;
      
      -- Log seller found
      INSERT INTO password_reset_logs (email, event_type, metadata)
      VALUES (
        'system@zaago.com',
        'email_sent',
        jsonb_build_object(
          'action', 'seller_found_in_order',
          'order_id', NEW.id,
          'seller_id', seller_record.seller_id,
          'sellers_found_so_far', sellers_found
        )
      );
      
      -- CHECK IDEMPOTENCY
      SELECT EXISTS(
        SELECT 1 FROM notifications 
        WHERE user_id = seller_record.seller_id 
        AND order_id = NEW.id 
        AND type = 'new_order'
      ) INTO notification_exists;
      
      IF notification_exists THEN
        -- Log duplicate skip
        INSERT INTO password_reset_logs (email, event_type, metadata)
        VALUES (
          'system@zaago.com',
          'email_sent',
          jsonb_build_object(
            'action', 'notification_skipped_duplicate',
            'order_id', NEW.id,
            'seller_id', seller_record.seller_id
          )
        );
        CONTINUE;
      END IF;
      
      -- Calculate seller-specific data DIRECTLY (no helper function)
      seller_items := '[]'::jsonb;
      seller_total := 0;
      seller_item_count := 0;
      seller_item_names := '[]'::jsonb;
      
      FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
      LOOP
        IF (item->>'seller_id')::uuid = seller_record.seller_id THEN
          seller_items := seller_items || item;
          seller_item_names := seller_item_names || to_jsonb(item->>'name');
          seller_item_count := seller_item_count + 1;
          seller_total := seller_total + ((item->>'price')::numeric * (item->>'quantity')::integer);
        END IF;
      END LOOP;
      
      -- Create notification with COMPLETE metadata
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
        'You have received a new order #' || substring(NEW.id::text from 1 for 8) || ' with ' || 
        seller_item_count || ' item(s) worth ₹' || seller_total,
        'new_order',
        'seller',
        NEW.id,
        jsonb_build_object(
          'order_id', NEW.id,
          'customer_name', COALESCE(NEW.customer_name, 'Customer'),
          'customer_phone', COALESCE(NEW.customer_phone, ''),
          'total_amount', NEW.total,
          'seller_total', seller_total,
          'item_count', seller_item_count,
          'item_names', seller_item_names,
          'seller_items', seller_items,
          'delivery_address', NEW.delivery_address,
          'delivery_time_slot', NEW.delivery_time_slot,
          'payment_method', COALESCE(NEW.payment_method, 'Not specified'),
          'payment_status', NEW.payment_status,
          'order_status', NEW.status,
          'created_at', NEW.created_at
        )
      );
      
      notifications_created := notifications_created + 1;
      
      -- Log notification created
      INSERT INTO password_reset_logs (email, event_type, metadata)
      VALUES (
        'system@zaago.com',
        'email_sent',
        jsonb_build_object(
          'action', 'seller_notification_created',
          'order_id', NEW.id,
          'seller_id', seller_record.seller_id,
          'seller_total', seller_total,
          'item_count', seller_item_count,
          'notification_type', 'new_order'
        )
      );
    END LOOP;
    
    -- Log final summary
    INSERT INTO password_reset_logs (email, event_type, metadata)
    VALUES (
      'system@zaago.com',
      'email_sent',
      jsonb_build_object(
        'action', 'seller_notification_trigger_completed',
        'order_id', NEW.id,
        'sellers_found', sellers_found,
        'notifications_created', notifications_created,
        'completion_time', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_sellers_on_new_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_sellers_on_new_order();