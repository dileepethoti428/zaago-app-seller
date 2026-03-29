
-- Fix get_seller_stats_with_period: replace SUM(o.total) with items-based sum
CREATE OR REPLACE FUNCTION public.get_seller_stats_with_period(seller_user_id uuid, period text DEFAULT 'today')
RETURNS TABLE(
  total_products bigint,
  active_orders bigint,
  delivered_count bigint,
  total_revenue numeric,
  regular_revenue numeric,
  subscription_revenue numeric,
  pending_revenue numeric,
  pending_subscription_revenue numeric,
  active_subscriptions bigint,
  projected_daily_subscription numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date timestamptz;
BEGIN
  v_start_date := CASE period
    WHEN 'today' THEN (now() AT TIME ZONE 'Asia/Kolkata')::date::timestamptz
    WHEN 'week' THEN ((now() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days')::timestamptz
    WHEN 'month' THEN ((now() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '30 days')::timestamptz
    WHEN 'year' THEN ((now() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '365 days')::timestamptz
    ELSE NULL
  END;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM products p WHERE p.seller_id = seller_user_id AND p.is_active = true)::bigint AS total_products,
    
    (SELECT COUNT(*) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status IN ('new', 'placed', 'pending', 'confirmed', 'processing', 'preparing', 'ready', 'accepted', 'accepted_by_seller', 'accepted_late', 'assigned', 'out_for_delivery', 'in_transit', 'pending_seller_acceptance')
     AND (v_start_date IS NULL OR o.created_at >= v_start_date)
    )::bigint AS active_orders,
    
    (SELECT COUNT(*) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status = 'delivered'
     AND (v_start_date IS NULL OR o.created_at >= v_start_date)
    )::bigint AS delivered_count,
    
    COALESCE((SELECT SUM(
      COALESCE((SELECT SUM(((item->>'quantity')::numeric) * ((item->>'price')::numeric))
       FROM jsonb_array_elements(o.items) AS item
       WHERE (item->>'seller_id') = seller_user_id::text
          OR (item->>'id')::uuid IN (SELECT p.id FROM products p WHERE p.seller_id = seller_user_id)
      ), 0)
    ) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status = 'delivered'
     AND o.subscription_id IS NULL
     AND (v_start_date IS NULL OR o.created_at >= v_start_date)
    ), 0)::numeric +
    COALESCE((SELECT SUM(p.price * s.quantity) FROM subscriptions s
     JOIN products p ON p.id = s.product_id
     WHERE p.seller_id = seller_user_id 
     AND s.is_active = true
     AND (v_start_date IS NULL OR s.created_at >= v_start_date)
    ), 0)::numeric AS total_revenue,
    
    COALESCE((SELECT SUM(
      COALESCE((SELECT SUM(((item->>'quantity')::numeric) * ((item->>'price')::numeric))
       FROM jsonb_array_elements(o.items) AS item
       WHERE (item->>'seller_id') = seller_user_id::text
          OR (item->>'id')::uuid IN (SELECT p.id FROM products p WHERE p.seller_id = seller_user_id)
      ), 0)
    ) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status = 'delivered'
     AND o.subscription_id IS NULL
     AND (v_start_date IS NULL OR o.created_at >= v_start_date)
    ), 0)::numeric AS regular_revenue,
    
    COALESCE((SELECT SUM(p.price * s.quantity) FROM subscriptions s
     JOIN products p ON p.id = s.product_id
     WHERE p.seller_id = seller_user_id 
     AND s.is_active = true
     AND (v_start_date IS NULL OR s.created_at >= v_start_date)
    ), 0)::numeric AS subscription_revenue,
    
    COALESCE((SELECT SUM(
      COALESCE((SELECT SUM(((item->>'quantity')::numeric) * ((item->>'price')::numeric))
       FROM jsonb_array_elements(o.items) AS item
       WHERE (item->>'seller_id') = seller_user_id::text
          OR (item->>'id')::uuid IN (SELECT p.id FROM products p WHERE p.seller_id = seller_user_id)
      ), 0)
    ) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status IN ('new', 'placed', 'pending', 'confirmed', 'processing', 'preparing', 'ready', 'accepted', 'accepted_by_seller', 'accepted_late', 'assigned', 'out_for_delivery', 'in_transit', 'pending_seller_acceptance')
     AND o.subscription_id IS NULL
     AND (v_start_date IS NULL OR o.created_at >= v_start_date)
    ), 0)::numeric AS pending_revenue,
    
    COALESCE((SELECT SUM(
      COALESCE((SELECT SUM(((item->>'quantity')::numeric) * ((item->>'price')::numeric))
       FROM jsonb_array_elements(o.items) AS item
       WHERE (item->>'seller_id') = seller_user_id::text
          OR (item->>'id')::uuid IN (SELECT p.id FROM products p WHERE p.seller_id = seller_user_id)
      ), 0)
    ) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status IN ('new', 'placed', 'pending', 'confirmed', 'processing', 'preparing', 'ready', 'accepted', 'accepted_by_seller', 'accepted_late', 'assigned', 'out_for_delivery', 'in_transit', 'pending_seller_acceptance')
     AND o.subscription_id IS NOT NULL
     AND (v_start_date IS NULL OR o.created_at >= v_start_date)
    ), 0)::numeric AS pending_subscription_revenue,
    
    (SELECT COUNT(*) FROM subscriptions s
     JOIN products p ON p.id = s.product_id
     WHERE p.seller_id = seller_user_id 
     AND s.is_active = true
    )::bigint AS active_subscriptions,
    
    COALESCE((SELECT SUM(p.price * s.quantity) FROM subscriptions s
     JOIN products p ON p.id = s.product_id
     WHERE p.seller_id = seller_user_id 
     AND s.is_active = true
     AND (v_start_date IS NULL OR s.created_at >= v_start_date)
    ), 0)::numeric AS projected_daily_subscription;
END;
$$;

-- Fix get_seller_performance_trends: replace SUM(o.total) with items-based sum
CREATE OR REPLACE FUNCTION public.get_seller_performance_trends(seller_user_id uuid, time_range text DEFAULT '1m')
RETURNS TABLE(
  period_start timestamptz,
  period_label text,
  total_orders integer,
  delivered_orders integer,
  failed_orders integer,
  total_revenue numeric,
  completion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date TIMESTAMPTZ;
  interval_type TEXT;
  date_format TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != seller_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access other seller data';
  END IF;

  CASE time_range
    WHEN '1d' THEN start_date := NOW() - INTERVAL '24 hours'; interval_type := 'hour'; date_format := 'HH24:00';
    WHEN '1w' THEN start_date := NOW() - INTERVAL '7 days'; interval_type := 'day'; date_format := 'Mon DD';
    WHEN '1m' THEN start_date := NOW() - INTERVAL '30 days'; interval_type := 'day'; date_format := 'Mon DD';
    WHEN '3m' THEN start_date := NOW() - INTERVAL '90 days'; interval_type := 'week'; date_format := 'Mon DD';
    WHEN '6m' THEN start_date := NOW() - INTERVAL '180 days'; interval_type := 'week'; date_format := 'Mon DD';
    WHEN '1y' THEN start_date := NOW() - INTERVAL '365 days'; interval_type := 'month'; date_format := 'Mon YYYY';
    ELSE start_date := NOW() - INTERVAL '30 days'; interval_type := 'day'; date_format := 'Mon DD';
  END CASE;

  RETURN QUERY
  SELECT 
    DATE_TRUNC(interval_type, o.created_at) AS period_start,
    TO_CHAR(DATE_TRUNC(interval_type, o.created_at), date_format) AS period_label,
    COUNT(*)::INTEGER AS total_orders,
    COUNT(*) FILTER (WHERE o.status = 'delivered')::INTEGER AS delivered_orders,
    COUNT(*) FILTER (WHERE o.status IN ('cancelled', 'failed', 'returned'))::INTEGER AS failed_orders,
    COALESCE(SUM(
      CASE WHEN o.status = 'delivered' THEN
        COALESCE((SELECT SUM(((item->>'quantity')::numeric) * ((item->>'price')::numeric))
         FROM jsonb_array_elements(o.items) AS item
         WHERE (item->>'seller_id') = seller_user_id::text
            OR (item->>'id')::uuid IN (SELECT p.id FROM products p WHERE p.seller_id = seller_user_id)
        ), 0)
      ELSE 0 END
    ), 0)::NUMERIC AS total_revenue,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE o.status = 'delivered')::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
      ELSE 0
    END AS completion_rate
  FROM public.orders o
  WHERE o.seller_id = seller_user_id
    AND o.created_at >= start_date
  GROUP BY DATE_TRUNC(interval_type, o.created_at)
  ORDER BY period_start ASC;
END;
$$;

-- Fix get_seller_performance_summary: replace SUM(o.total) with items-based sum
CREATE OR REPLACE FUNCTION public.get_seller_performance_summary(seller_user_id uuid, time_range text DEFAULT '1m')
RETURNS TABLE(
  total_orders integer,
  delivered_orders integer,
  failed_orders integer,
  total_revenue numeric,
  completion_rate numeric,
  avg_daily_orders numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date TIMESTAMPTZ;
  days_in_range INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != seller_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access other seller data';
  END IF;

  CASE time_range
    WHEN '1d' THEN start_date := NOW() - INTERVAL '24 hours'; days_in_range := 1;
    WHEN '1w' THEN start_date := NOW() - INTERVAL '7 days'; days_in_range := 7;
    WHEN '1m' THEN start_date := NOW() - INTERVAL '30 days'; days_in_range := 30;
    WHEN '3m' THEN start_date := NOW() - INTERVAL '90 days'; days_in_range := 90;
    WHEN '6m' THEN start_date := NOW() - INTERVAL '180 days'; days_in_range := 180;
    WHEN '1y' THEN start_date := NOW() - INTERVAL '365 days'; days_in_range := 365;
    ELSE start_date := NOW() - INTERVAL '30 days'; days_in_range := 30;
  END CASE;

  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_orders,
    COUNT(*) FILTER (WHERE o.status = 'delivered')::INTEGER AS delivered_orders,
    COUNT(*) FILTER (WHERE o.status IN ('cancelled', 'failed', 'returned'))::INTEGER AS failed_orders,
    COALESCE(SUM(
      CASE WHEN o.status = 'delivered' THEN
        COALESCE((SELECT SUM(((item->>'quantity')::numeric) * ((item->>'price')::numeric))
         FROM jsonb_array_elements(o.items) AS item
         WHERE (item->>'seller_id') = seller_user_id::text
            OR (item->>'id')::uuid IN (SELECT p.id FROM products p WHERE p.seller_id = seller_user_id)
        ), 0)
      ELSE 0 END
    ), 0)::NUMERIC AS total_revenue,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE o.status = 'delivered')::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
      ELSE 0
    END AS completion_rate,
    ROUND(COUNT(*)::NUMERIC / days_in_range, 1) AS avg_daily_orders
  FROM public.orders o
  WHERE o.seller_id = seller_user_id
    AND o.created_at >= start_date;
END;
$$;
