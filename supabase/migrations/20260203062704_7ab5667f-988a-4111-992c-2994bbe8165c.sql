-- Phase 1: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_seller_id 
ON public.orders (seller_id);

CREATE INDEX IF NOT EXISTS idx_orders_seller_delivered 
ON public.orders (seller_id, delivered_at) 
WHERE status = 'delivered';

-- Phase 2: Create secure seller-scoped RPC function
CREATE OR REPLACE FUNCTION public.get_seller_top_products_analytics(
  seller_user_id UUID,
  time_period TEXT DEFAULT 'month',
  sort_by TEXT DEFAULT 'revenue',
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_image_url TEXT,
  total_quantity INTEGER,
  total_revenue NUMERIC,
  total_orders INTEGER,
  period_label TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date DATE;
BEGIN
  -- Verify the caller is the actual seller (prevents API manipulation)
  IF auth.uid() IS NULL OR auth.uid() != seller_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access other seller data';
  END IF;

  -- Calculate start date based on period
  CASE time_period
    WHEN 'today' THEN start_date := CURRENT_DATE;
    WHEN 'week' THEN start_date := CURRENT_DATE - INTERVAL '7 days';
    WHEN 'month' THEN start_date := CURRENT_DATE - INTERVAL '30 days';
    WHEN '6_months' THEN start_date := CURRENT_DATE - INTERVAL '6 months';
    WHEN '1_year' THEN start_date := CURRENT_DATE - INTERVAL '1 year';
    ELSE start_date := CURRENT_DATE - INTERVAL '30 days';
  END CASE;

  RETURN QUERY
  WITH seller_orders AS (
    -- Get only orders containing this seller's products
    SELECT 
      o.id AS order_id,
      o.delivered_at,
      item
    FROM orders o
    CROSS JOIN jsonb_array_elements(o.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE o.status = 'delivered'
      AND o.delivered_at IS NOT NULL
      AND DATE(o.delivered_at) >= start_date
      AND p.seller_id = seller_user_id  -- CRITICAL: Database-level seller filter
  )
  SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.image_url AS product_image_url,
    COALESCE(SUM((so.item->>'quantity')::INTEGER), 0)::INTEGER AS total_quantity,
    COALESCE(SUM(
      (so.item->>'quantity')::INTEGER * 
      COALESCE((so.item->>'unit_price')::NUMERIC, p.price)
    ), 0) AS total_revenue,
    COUNT(DISTINCT so.order_id)::INTEGER AS total_orders,
    time_period AS period_label
  FROM products p
  LEFT JOIN seller_orders so ON (so.item->>'id')::UUID = p.id
  WHERE p.seller_id = seller_user_id  -- Only this seller's products
    AND p.is_active = TRUE
  GROUP BY p.id, p.name, p.image_url, p.price
  HAVING COALESCE(SUM((so.item->>'quantity')::INTEGER), 0) > 0
  ORDER BY 
    CASE sort_by
      WHEN 'revenue' THEN COALESCE(SUM((so.item->>'quantity')::INTEGER * COALESCE((so.item->>'unit_price')::NUMERIC, p.price)), 0)
      WHEN 'quantity' THEN COALESCE(SUM((so.item->>'quantity')::INTEGER), 0)::NUMERIC
      WHEN 'orders' THEN COUNT(DISTINCT so.order_id)::NUMERIC
      ELSE COALESCE(SUM((so.item->>'quantity')::INTEGER * COALESCE((so.item->>'unit_price')::NUMERIC, p.price)), 0)
    END DESC
  LIMIT limit_count;
END;
$$;