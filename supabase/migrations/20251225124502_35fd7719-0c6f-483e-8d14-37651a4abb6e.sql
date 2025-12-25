-- Create RPC function for filtered seller orders
CREATE OR REPLACE FUNCTION get_seller_orders_with_filters(
  seller_user_id uuid,
  date_filter text DEFAULT 'today',
  sort_by text DEFAULT 'newest'
)
RETURNS TABLE (
  id uuid,
  assigned_agent_id uuid,
  status text,
  delivery_date date,
  total numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.assigned_agent_id,
    o.status,
    o.delivery_date,
    o.total,
    o.created_at
  FROM orders o
  WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(o.items) AS item
    WHERE (item->>'seller_id')::uuid = seller_user_id
  )
  AND (
    CASE date_filter
      WHEN 'today' THEN o.delivery_date = CURRENT_DATE
      WHEN 'week' THEN o.delivery_date >= CURRENT_DATE - INTERVAL '7 days'
      WHEN 'month' THEN o.delivery_date >= CURRENT_DATE - INTERVAL '30 days'
      WHEN 'year' THEN o.delivery_date >= CURRENT_DATE - INTERVAL '365 days'
      ELSE TRUE
    END
  )
  ORDER BY
    CASE WHEN sort_by = 'newest' THEN o.created_at END DESC,
    CASE WHEN sort_by = 'oldest' THEN o.created_at END ASC,
    CASE WHEN sort_by = 'highest' THEN o.total END DESC,
    CASE WHEN sort_by = 'lowest' THEN o.total END ASC;
END;
$$;