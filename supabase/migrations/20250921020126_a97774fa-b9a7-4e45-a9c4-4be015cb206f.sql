-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS add_seller_id_to_order_items_trigger ON orders;

-- Create function to automatically add seller_id to order items
CREATE OR REPLACE FUNCTION public.add_seller_id_to_order_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  updated_items JSONB := '[]'::jsonb;
  product_seller_id UUID;
BEGIN
  -- Loop through each item in the order
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    -- Get the seller_id for this product
    SELECT seller_id INTO product_seller_id
    FROM products 
    WHERE id = (item->>'id')::UUID;
    
    -- Add seller_id to the item if product exists
    IF product_seller_id IS NOT NULL THEN
      item := item || jsonb_build_object('seller_id', product_seller_id);
    END IF;
    
    -- Add the updated item to the array
    updated_items := updated_items || jsonb_build_array(item);
  END LOOP;
  
  -- Update the items array with seller_id included
  NEW.items := updated_items;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run before order insert/update
CREATE TRIGGER add_seller_id_to_order_items_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION add_seller_id_to_order_items();

-- Update existing orders to add seller_id to items retroactively
UPDATE orders 
SET items = (
  SELECT jsonb_agg(
    item || jsonb_build_object('seller_id', p.seller_id)
  )
  FROM jsonb_array_elements(orders.items) AS item
  JOIN products p ON p.id = (item->>'id')::UUID
  WHERE p.seller_id IS NOT NULL
)
WHERE EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(orders.items) AS item
  JOIN products p ON p.id = (item->>'id')::UUID
  WHERE item->>'seller_id' IS NULL
);