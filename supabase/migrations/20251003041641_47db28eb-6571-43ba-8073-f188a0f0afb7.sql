-- Create helper function to extract seller-specific order items and calculate totals
CREATE OR REPLACE FUNCTION get_seller_order_items(order_items jsonb, p_seller_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_items jsonb := '[]'::jsonb;
  item jsonb;
  seller_total numeric := 0;
  item_names text[] := '{}';
  item_count integer := 0;
BEGIN
  -- Loop through all items and filter by seller_id
  FOR item IN SELECT * FROM jsonb_array_elements(order_items)
  LOOP
    IF (item->>'seller_id')::uuid = p_seller_id THEN
      -- Add to seller items array
      seller_items := seller_items || item;
      
      -- Calculate seller total
      seller_total := seller_total + ((item->>'price')::numeric * (item->>'quantity')::integer);
      
      -- Collect item names
      item_names := array_append(item_names, COALESCE(item->>'name', item->>'product_name', 'Product'));
      
      item_count := item_count + 1;
    END IF;
  END LOOP;
  
  -- Return structured data
  RETURN jsonb_build_object(
    'items', seller_items,
    'total', seller_total,
    'item_count', item_count,
    'item_names', array_to_string(item_names, ', ')
  );
END;
$$;

-- Update the notify_sellers_on_new_order function to send seller-specific data
CREATE OR REPLACE FUNCTION notify_sellers_on_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seller_uuid UUID;
  seller_ids UUID[];
  seller_data jsonb;
  seller_name TEXT;
BEGIN
  -- Extract unique seller IDs from order items
  seller_ids := extract_seller_ids_from_order(NEW.items);
  
  -- Create notification for each seller with their specific items and totals
  FOREACH seller_uuid IN ARRAY seller_ids
  LOOP
    -- Get seller-specific order data
    seller_data := get_seller_order_items(NEW.items, seller_uuid);
    
    -- Get seller name
    SELECT business_name INTO seller_name
    FROM sellers 
    WHERE user_id = seller_uuid;
    
    -- Create seller notification with accurate seller-specific data
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
      'New Order - ' || (seller_data->>'item_count') || ' item(s)',
      'Order from ' || NEW.customer_name || ' - Your items: ₹' || (seller_data->>'total')::numeric::text,
      'new_order',
      'seller',
      NEW.id,
      jsonb_build_object(
        'order_id', NEW.id,
        'customer_name', NEW.customer_name,
        'customer_phone', NEW.customer_phone,
        'seller_total', (seller_data->>'total')::numeric,
        'seller_items', seller_data->'items',
        'total_items_count', (seller_data->>'item_count')::integer,
        'item_names', seller_data->>'item_names',
        'full_order_total', NEW.total,
        'delivery_address', NEW.address,
        'payment_method', NEW.payment_method,
        'order_status', NEW.status,
        'created_at', NEW.created_at
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;