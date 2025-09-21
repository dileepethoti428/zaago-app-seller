-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_seller_orders(UUID);

-- Now recreate with the new structure
CREATE OR REPLACE FUNCTION public.get_seller_orders(seller_user_id UUID)
RETURNS TABLE(
  id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  address JSONB,
  items JSONB,
  total NUMERIC,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  delivery_time_slot TEXT,
  special_instructions TEXT,
  product_statuses JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.customer_name,
    o.customer_phone,
    o.address,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', (item->>'id')::uuid,
          'name', item->>'name',
          'quantity', (item->>'quantity')::integer,
          'price', (item->>'price')::numeric,
          'seller_id', (item->>'seller_id')::uuid,
          'image_url', item->>'image_url'
        )
      )
      FROM jsonb_array_elements(o.items) AS item
      WHERE (item->>'seller_id')::uuid = seller_user_id
    ) as items,
    o.total,
    o.status,
    o.created_at,
    o.delivery_time_slot,
    o.special_instructions,
    (
      SELECT jsonb_object_agg(
        ops.product_id::text,
        jsonb_build_object(
          'status', ops.status,
          'accepted_at', ops.accepted_at,
          'packed_at', ops.packed_at
        )
      )
      FROM order_product_status ops
      WHERE ops.order_id = o.id AND ops.seller_id = seller_user_id
    ) as product_statuses
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    WHERE (item->>'seller_id')::uuid = seller_user_id
  )
  ORDER BY o.created_at DESC;
END;
$$;