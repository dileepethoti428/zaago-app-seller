-- Update the existing order to include seller_id in items
UPDATE orders 
SET items = jsonb_build_array(
  items->0 || jsonb_build_object('seller_id', '372483f9-8ee2-4f02-b568-46acef76f400')
)
WHERE id = '78345700-db90-4e8b-b689-78df9d0bd5b1';