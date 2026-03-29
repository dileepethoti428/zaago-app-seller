
-- Drop and recreate functions
DROP FUNCTION IF EXISTS public.get_seller_stats_with_period(uuid, text);
DROP FUNCTION IF EXISTS public.get_seller_performance_trends(uuid, integer);
DROP FUNCTION IF EXISTS public.get_seller_performance_summary(uuid);

-- Fix get_seller_stats_with_period
CREATE FUNCTION public.get_seller_stats_with_period(seller_uuid uuid, period text DEFAULT 'today')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  start_date timestamptz;
  prev_start_date timestamptz;
  prev_end_date timestamptz;
BEGIN
  CASE period
    WHEN 'today' THEN
      start_date := date_trunc('day', now());
      prev_start_date := start_date - interval '1 day';
      prev_end_date := start_date;
    WHEN 'week' THEN
      start_date := date_trunc('week', now());
      prev_start_date := start_date - interval '1 week';
      prev_end_date := start_date;
    WHEN 'month' THEN
      start_date := date_trunc('month', now());
      prev_start_date := start_date - interval '1 month';
      prev_end_date := start_date;
    WHEN 'year' THEN
      start_date := date_trunc('year', now());
      prev_start_date := start_date - interval '1 year';
      prev_end_date := start_date;
    ELSE
      start_date := date_trunc('day', now());
      prev_start_date := start_date - interval '1 day';
      prev_end_date := start_date;
  END CASE;

  WITH current_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE o.status = 'delivered') as total_orders,
      COALESCE(
        SUM(
          (SELECT SUM(
            ((item->>'quantity')::numeric) *
            ((item->>'price')::numeric) *
            (1 - COALESCE(
              (item->>'discount_percentage')::numeric,
              p.discount_percentage,
              0
            ) / 100)
          )
          FROM jsonb_array_elements(o.items::jsonb) AS item
          LEFT JOIN products p ON p.id = (item->>'id')::uuid
          )
        ) FILTER (WHERE o.status = 'delivered'),
        0
      ) as total_revenue,
      COUNT(*) FILTER (WHERE o.status = 'pending') as pending_orders
    FROM orders o
    WHERE o.seller_id = seller_uuid
      AND o.created_at >= start_date
  ),
  prev_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE o.status = 'delivered') as total_orders,
      COALESCE(
        SUM(
          (SELECT SUM(
            ((item->>'quantity')::numeric) *
            ((item->>'price')::numeric) *
            (1 - COALESCE(
              (item->>'discount_percentage')::numeric,
              p.discount_percentage,
              0
            ) / 100)
          )
          FROM jsonb_array_elements(o.items::jsonb) AS item
          LEFT JOIN products p ON p.id = (item->>'id')::uuid
          )
        ) FILTER (WHERE o.status = 'delivered'),
        0
      ) as total_revenue
    FROM orders o
    WHERE o.seller_id = seller_uuid
      AND o.created_at >= prev_start_date
      AND o.created_at < prev_end_date
  ),
  sub_stats AS (
    SELECT
      COUNT(*) as active_subscriptions
    FROM subscriptions s
    WHERE s.seller_id = seller_uuid
      AND s.status = 'active'
  )
  SELECT jsonb_build_object(
    'total_orders', cs.total_orders,
    'total_revenue', cs.total_revenue,
    'pending_orders', cs.pending_orders,
    'active_subscriptions', ss.active_subscriptions,
    'prev_total_orders', ps.total_orders,
    'prev_total_revenue', ps.total_revenue
  ) INTO result
  FROM current_stats cs, prev_stats ps, sub_stats ss;

  RETURN result;
END;
$$;

-- Fix get_seller_performance_trends
CREATE FUNCTION public.get_seller_performance_trends(seller_uuid uuid, days_back integer DEFAULT 30)
RETURNS TABLE(
  trend_date date,
  daily_orders bigint,
  daily_revenue numeric,
  daily_customers bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.dt::date as trend_date,
    COUNT(o.id) FILTER (WHERE o.status = 'delivered') as daily_orders,
    COALESCE(
      SUM(
        (SELECT SUM(
          ((item->>'quantity')::numeric) *
          ((item->>'price')::numeric) *
          (1 - COALESCE(
            (item->>'discount_percentage')::numeric,
            p.discount_percentage,
            0
          ) / 100)
        )
        FROM jsonb_array_elements(o.items::jsonb) AS item
        LEFT JOIN products p ON p.id = (item->>'id')::uuid
        )
      ) FILTER (WHERE o.status = 'delivered'),
      0
    ) as daily_revenue,
    COUNT(DISTINCT o.user_id) FILTER (WHERE o.status = 'delivered') as daily_customers
  FROM generate_series(
    (now() - (days_back || ' days')::interval)::date,
    now()::date,
    '1 day'::interval
  ) AS d(dt)
  LEFT JOIN orders o ON o.seller_id = seller_uuid
    AND o.created_at::date = d.dt::date
  GROUP BY d.dt
  ORDER BY d.dt;
END;
$$;

-- Fix get_seller_performance_summary
CREATE FUNCTION public.get_seller_performance_summary(seller_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE o.status = 'delivered') as total_delivered,
      COUNT(*) FILTER (WHERE o.status = 'cancelled') as total_cancelled,
      COUNT(*) as total_orders,
      COALESCE(
        SUM(
          (SELECT SUM(
            ((item->>'quantity')::numeric) *
            ((item->>'price')::numeric) *
            (1 - COALESCE(
              (item->>'discount_percentage')::numeric,
              p.discount_percentage,
              0
            ) / 100)
          )
          FROM jsonb_array_elements(o.items::jsonb) AS item
          LEFT JOIN products p ON p.id = (item->>'id')::uuid
          )
        ) FILTER (WHERE o.status = 'delivered'),
        0
      ) as total_revenue,
      COUNT(DISTINCT o.user_id) as unique_customers,
      COALESCE(AVG(
        CASE WHEN o.delivery_rating IS NOT NULL THEN o.delivery_rating END
      ), 0) as avg_rating
    FROM orders o
    WHERE o.seller_id = seller_uuid
  )
  SELECT jsonb_build_object(
    'total_delivered', s.total_delivered,
    'total_cancelled', s.total_cancelled,
    'total_orders', s.total_orders,
    'total_revenue', s.total_revenue,
    'unique_customers', s.unique_customers,
    'avg_rating', s.avg_rating,
    'completion_rate', CASE WHEN s.total_orders > 0
      THEN ROUND((s.total_delivered::numeric / s.total_orders * 100), 1)
      ELSE 0 END
  ) INTO result
  FROM stats s;

  RETURN result;
END;
$$;
