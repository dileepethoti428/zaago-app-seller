-- Fix get_seller_order_items function to handle all item structures and return complete data
DROP FUNCTION IF EXISTS get_seller_order_items(jsonb, uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_seller_order_items(order_items jsonb, target_seller_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  filtered_items jsonb := '[]'::jsonb;
  item_count integer := 0;
  total_price numeric := 0;
  item_names text := '';
  item jsonb;
BEGIN
  -- Log function call for debugging
  INSERT INTO password_reset_logs (email, event_type, metadata)
  VALUES (
    'system@zaago.com',
    'email_sent',
    jsonb_build_object(
      'action', 'get_seller_order_items_called',
      'seller_id', target_seller_id,
      'order_items_count', jsonb_array_length(order_items),
      'timestamp', now()
    )
  );

  -- Loop through all items
  FOR item IN SELECT * FROM jsonb_array_elements(order_items)
  LOOP
    -- Check if this item belongs to the target seller
    -- Handle both string and uuid formats for seller_id
    IF (item->>'seller_id')::uuid = target_seller_id THEN
      -- Add item to filtered list
      filtered_items := filtered_items || jsonb_build_array(item);
      
      -- Count items
      item_count := item_count + COALESCE((item->>'quantity')::integer, 1);
      
      -- Sum up total price (quantity * price)
      total_price := total_price + (
        COALESCE((item->>'quantity')::numeric, 1) * 
        COALESCE((item->>'price')::numeric, 0)
      );
      
      -- Build item names list
      IF item_names = '' THEN
        item_names := COALESCE(item->>'name', 'Unknown Item');
      ELSE
        item_names := item_names || ', ' || COALESCE(item->>'name', 'Unknown Item');
      END IF;
    END IF;
  END LOOP;

  -- Log the result for debugging
  INSERT INTO password_reset_logs (email, event_type, metadata)
  VALUES (
    'system@zaago.com',
    'email_sent',
    jsonb_build_object(
      'action', 'get_seller_order_items_result',
      'seller_id', target_seller_id,
      'filtered_items_count', item_count,
      'total_price', total_price,
      'item_names', item_names,
      'timestamp', now()
    )
  );

  -- Return all necessary data
  RETURN jsonb_build_object(
    'items', filtered_items,
    'item_count', item_count,
    'total', total_price,
    'item_names', item_names
  );
END;
$$;