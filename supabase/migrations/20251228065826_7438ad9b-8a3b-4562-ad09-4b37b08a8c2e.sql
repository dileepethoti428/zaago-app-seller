-- Update get_seller_specific_orders to exclude subscription orders
CREATE OR REPLACE FUNCTION public.get_seller_specific_orders(p_seller_user_id uuid)
RETURNS TABLE(
  order_id uuid,
  order_status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  customer_name text,
  customer_phone text,
  delivery_date date,
  address jsonb,
  payment_status text,
  agent_id uuid,
  seller_total numeric,
  seller_items jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    o.address,
    o.payment_status,
    o.agent_id,
    -- Calculate total for this seller's items only
    COALESCE((
      SELECT SUM((item->>'quantity')::integer * (item->>'price')::numeric)
      FROM jsonb_array_elements(o.items) AS item
      JOIN products p ON (item->>'id')::uuid = p.id
      WHERE p.seller_id = p_seller_user_id
    ), 0) as seller_total,
    -- Get only this seller's items
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
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
  AND o.subscription_id IS NULL  -- Exclude subscription orders from regular orders page
  ORDER BY o.created_at DESC;
END;
$$;