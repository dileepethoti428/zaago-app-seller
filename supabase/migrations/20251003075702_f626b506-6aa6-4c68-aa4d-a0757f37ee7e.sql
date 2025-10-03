-- Completely drop and recreate get_seller_order_items function with correct return type
DROP FUNCTION IF EXISTS get_seller_order_items(jsonb, uuid) CASCADE;

-- Recreate with TABLE return type
CREATE OR REPLACE FUNCTION get_seller_order_items(order_items jsonb, target_seller_id uuid)
RETURNS TABLE (
  seller_items jsonb,
  total_price numeric,
  item_count integer,
  item_names jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  filtered_items jsonb := '[]'::jsonb;
  running_total numeric := 0;
  running_count integer := 0;
  names_array jsonb := '[]'::jsonb;
  item jsonb;
  seller_id_text text;
  item_price numeric;
  item_qty integer;
BEGIN
  -- Loop through all items in the order
  FOR item IN SELECT * FROM jsonb_array_elements(order_items)
  LOOP
    -- Extract seller_id as text first
    seller_id_text := item->>'seller_id';
    
    -- Check if this item belongs to target seller
    IF seller_id_text IS NOT NULL AND seller_id_text::uuid = target_seller_id THEN
      -- Add to filtered items
      filtered_items := filtered_items || jsonb_build_array(item);
      
      -- Extract price and quantity
      item_price := COALESCE((item->>'price')::numeric, (item->>'unit_price')::numeric, 0);
      item_qty := COALESCE((item->>'quantity')::integer, 1);
      
      -- Add to total
      running_total := running_total + (item_price * item_qty);
      running_count := running_count + 1;
      
      -- Add item name to array
      names_array := names_array || to_jsonb(COALESCE(item->>'name', item->>'product_name', 'Unknown'));
    END IF;
  END LOOP;

  -- Return the aggregated data
  RETURN QUERY SELECT filtered_items, running_total, running_count, names_array;
END;
$$;

-- Drop and recreate trigger function
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
BEGIN
  -- Only trigger when order is first placed
  IF NEW.status = 'placed' AND (OLD IS NULL OR OLD.status != 'placed') THEN
    
    -- Get unique sellers from order items
    FOR seller_record IN
      SELECT DISTINCT (item->>'seller_id')::uuid as seller_id
      FROM jsonb_array_elements(NEW.items) AS item
      WHERE item->>'seller_id' IS NOT NULL
    LOOP
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
          'total_items_count', COALESCE(seller_data.item_count, 0),
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
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_sellers_on_new_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_sellers_on_new_order();