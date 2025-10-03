-- Fix notification type to match frontend expectations
DROP FUNCTION IF EXISTS notify_sellers_on_new_order() CASCADE;

CREATE OR REPLACE FUNCTION notify_sellers_on_new_order()
RETURNS TRIGGER AS $$
DECLARE
  seller_uuid UUID;
  seller_data JSONB;
  derived_payment_method TEXT;
BEGIN
  -- Derive payment method from payment_status
  derived_payment_method := CASE 
    WHEN NEW.payment_status = 'paid_cod' THEN 'COD'
    WHEN NEW.payment_status = 'paid' OR NEW.payment_status = 'paid_online' THEN 'Online'
    ELSE 'Pending'
  END;

  -- Loop through each seller to notify them with their specific order details
  FOR seller_uuid IN 
    SELECT DISTINCT unnest(extract_seller_ids_from_order(NEW.items))
  LOOP
    -- Get seller-specific order details
    SELECT get_seller_order_items(NEW.items, seller_uuid) INTO seller_data;
    
    -- Skip if no items for this seller
    IF seller_data IS NULL OR (seller_data->>'item_count')::INTEGER = 0 THEN
      CONTINUE;
    END IF;
    
    -- Create notification with seller-specific details and CORRECT TYPE
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      role,
      order_id,
      metadata
    ) VALUES (
      seller_uuid,
      'New Order Received! 🎉',
      'You have received a new order from ' || COALESCE((NEW.delivery_address->>'name')::text, 'Customer') || 
      '. Order total: ₹' || (seller_data->>'total')::text || '. Please review and accept the order items.',
      'new_order',  -- CRITICAL FIX: Changed from 'order' to 'new_order' to match frontend
      'seller',
      NEW.id,
      jsonb_build_object(
        'order_id', NEW.id,
        'seller_total', (seller_data->>'total')::numeric,
        'seller_items', seller_data->'items',
        'total_items_count', (seller_data->>'item_count')::integer,
        'item_names', seller_data->>'item_names',
        'customer_name', COALESCE((NEW.delivery_address->>'name')::text, 'Customer'),
        'customer_phone', (NEW.delivery_address->>'phone')::text,
        'delivery_address', NEW.delivery_address,
        'payment_method', derived_payment_method,
        'payment_status', NEW.payment_status,
        'order_status', NEW.status,
        'order_total', NEW.total,
        'created_at', NEW.created_at
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_sellers_on_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_sellers_on_new_order();