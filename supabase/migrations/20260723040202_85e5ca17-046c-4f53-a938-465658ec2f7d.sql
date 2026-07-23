DROP FUNCTION IF EXISTS public.get_seller_specific_orders(uuid);

CREATE OR REPLACE FUNCTION public.get_seller_specific_orders(p_seller_user_id uuid)
RETURNS TABLE(order_id uuid, order_status text, created_at timestamp with time zone, updated_at timestamp with time zone, customer_name text, customer_phone text, delivery_date date, delivery_time time without time zone, delivery_time_slot text, address jsonb, payment_status text, agent_id uuid, seller_total numeric, seller_items jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as order_id,
    o.status as order_status,
    o.created_at,
    o.updated_at,
    o.customer_name,
    o.customer_phone,
    o.delivery_date,
    o.delivery_time,
    o.delivery_time_slot,
    o.address,
    o.payment_status,
    o.agent_id,
    COALESCE((
      SELECT SUM((item->>'quantity')::integer * (item->>'price')::numeric)
      FROM jsonb_array_elements(o.items) AS item
      JOIN products p ON (item->>'id')::uuid = p.id
      WHERE p.seller_id = p_seller_user_id
    ), 0) as seller_total,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', COALESCE(item->>'name', p.name),
          'unit', COALESCE(item->>'unit', p.unit),
          'product_unit', COALESCE(item->>'unit', p.unit),
          'price', (item->>'price')::numeric,
          'quantity', (item->>'quantity')::integer,
          'seller_id', p.seller_id
        )
      )
      FROM jsonb_array_elements(o.items) AS item
      JOIN products p ON (item->>'id')::uuid = p.id
      WHERE p.seller_id = p_seller_user_id
    ), '[]'::jsonb) as seller_items
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    JOIN products p ON (item->>'id')::uuid = p.id
    WHERE p.seller_id = p_seller_user_id
  )
  AND o.subscription_id IS NULL
  ORDER BY o.created_at DESC;
END;
$function$;