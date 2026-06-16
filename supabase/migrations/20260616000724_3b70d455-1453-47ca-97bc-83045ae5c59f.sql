CREATE OR REPLACE FUNCTION public.get_seller_top_products_analytics(seller_user_id uuid, time_period text DEFAULT 'month'::text, sort_by text DEFAULT 'revenue'::text, limit_count integer DEFAULT 5)
 RETURNS TABLE(product_id uuid, product_name text, product_image_url text, total_quantity integer, total_revenue numeric, total_orders integer, period_label text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  start_date DATE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != seller_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access other seller data';
  END IF;

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
      AND p.seller_id = seller_user_id
  )
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.image_url AS product_image_url,
    COALESCE(SUM((so.item->>'quantity')::INTEGER), 0)::INTEGER AS total_quantity,
    COALESCE(SUM(
      (so.item->>'quantity')::INTEGER *
      COALESCE(
        NULLIF(so.item->>'price','')::NUMERIC,
        NULLIF(so.item->>'base_price','')::NUMERIC,
        p.price
      ) *
      (1 - COALESCE(
        NULLIF(so.item->>'discount_percentage','')::NUMERIC,
        p.discount_percentage,
        0
      ) / 100)
    ), 0) AS total_revenue,
    COUNT(DISTINCT so.order_id)::INTEGER AS total_orders,
    time_period AS period_label
  FROM products p
  LEFT JOIN seller_orders so ON (so.item->>'id')::UUID = p.id
  WHERE p.seller_id = seller_user_id
    AND p.is_active = TRUE
  GROUP BY p.id, p.name, p.image_url, p.price, p.discount_percentage
  HAVING COALESCE(SUM((so.item->>'quantity')::INTEGER), 0) > 0
  ORDER BY
    CASE sort_by
      WHEN 'revenue' THEN COALESCE(SUM(
        (so.item->>'quantity')::INTEGER *
        COALESCE(
          NULLIF(so.item->>'price','')::NUMERIC,
          NULLIF(so.item->>'base_price','')::NUMERIC,
          p.price
        ) *
        (1 - COALESCE(
          NULLIF(so.item->>'discount_percentage','')::NUMERIC,
          p.discount_percentage,
          0
        ) / 100)
      ), 0)
      WHEN 'quantity' THEN COALESCE(SUM((so.item->>'quantity')::INTEGER), 0)::NUMERIC
      WHEN 'orders' THEN COUNT(DISTINCT so.order_id)::NUMERIC
      ELSE COALESCE(SUM(
        (so.item->>'quantity')::INTEGER *
        COALESCE(
          NULLIF(so.item->>'price','')::NUMERIC,
          NULLIF(so.item->>'base_price','')::NUMERIC,
          p.price
        ) *
        (1 - COALESCE(
          NULLIF(so.item->>'discount_percentage','')::NUMERIC,
          p.discount_percentage,
          0
        ) / 100)
      ), 0)
    END DESC
  LIMIT limit_count;
END;
$function$;