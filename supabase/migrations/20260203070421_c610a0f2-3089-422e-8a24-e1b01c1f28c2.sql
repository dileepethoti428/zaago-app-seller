-- Performance Trends RPC: Returns time-series data for seller orders
CREATE OR REPLACE FUNCTION public.get_seller_performance_trends(
  seller_user_id UUID,
  time_range TEXT DEFAULT '1m'
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  period_label TEXT,
  total_orders INTEGER,
  delivered_orders INTEGER,
  failed_orders INTEGER,
  total_revenue NUMERIC,
  completion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date TIMESTAMPTZ;
  interval_type TEXT;
  date_format TEXT;
BEGIN
  -- Security: Verify caller is the actual seller
  IF auth.uid() IS NULL OR auth.uid() != seller_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access other seller data';
  END IF;

  -- Determine start date and aggregation interval based on time_range
  CASE time_range
    WHEN '1d' THEN 
      start_date := NOW() - INTERVAL '24 hours';
      interval_type := 'hour';
      date_format := 'HH24:00';
    WHEN '1w' THEN 
      start_date := NOW() - INTERVAL '7 days';
      interval_type := 'day';
      date_format := 'Mon DD';
    WHEN '1m' THEN 
      start_date := NOW() - INTERVAL '30 days';
      interval_type := 'day';
      date_format := 'Mon DD';
    WHEN '3m' THEN 
      start_date := NOW() - INTERVAL '90 days';
      interval_type := 'week';
      date_format := 'Mon DD';
    WHEN '6m' THEN 
      start_date := NOW() - INTERVAL '180 days';
      interval_type := 'week';
      date_format := 'Mon DD';
    WHEN '1y' THEN 
      start_date := NOW() - INTERVAL '365 days';
      interval_type := 'month';
      date_format := 'Mon YYYY';
    ELSE 
      start_date := NOW() - INTERVAL '30 days';
      interval_type := 'day';
      date_format := 'Mon DD';
  END CASE;

  RETURN QUERY
  SELECT 
    DATE_TRUNC(interval_type, o.created_at) AS period_start,
    TO_CHAR(DATE_TRUNC(interval_type, o.created_at), date_format) AS period_label,
    COUNT(*)::INTEGER AS total_orders,
    COUNT(*) FILTER (WHERE o.status = 'delivered')::INTEGER AS delivered_orders,
    COUNT(*) FILTER (WHERE o.status IN ('cancelled', 'failed', 'returned'))::INTEGER AS failed_orders,
    COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0)::NUMERIC AS total_revenue,
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

-- Performance Summary RPC: Returns aggregate stats for seller
CREATE OR REPLACE FUNCTION public.get_seller_performance_summary(
  seller_user_id UUID,
  time_range TEXT DEFAULT '1m'
)
RETURNS TABLE (
  total_orders INTEGER,
  delivered_orders INTEGER,
  failed_orders INTEGER,
  total_revenue NUMERIC,
  completion_rate NUMERIC,
  avg_daily_orders NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date TIMESTAMPTZ;
  days_in_range INTEGER;
BEGIN
  -- Security: Verify caller is the actual seller
  IF auth.uid() IS NULL OR auth.uid() != seller_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access other seller data';
  END IF;

  -- Determine start date and days count based on time_range
  CASE time_range
    WHEN '1d' THEN 
      start_date := NOW() - INTERVAL '24 hours';
      days_in_range := 1;
    WHEN '1w' THEN 
      start_date := NOW() - INTERVAL '7 days';
      days_in_range := 7;
    WHEN '1m' THEN 
      start_date := NOW() - INTERVAL '30 days';
      days_in_range := 30;
    WHEN '3m' THEN 
      start_date := NOW() - INTERVAL '90 days';
      days_in_range := 90;
    WHEN '6m' THEN 
      start_date := NOW() - INTERVAL '180 days';
      days_in_range := 180;
    WHEN '1y' THEN 
      start_date := NOW() - INTERVAL '365 days';
      days_in_range := 365;
    ELSE 
      start_date := NOW() - INTERVAL '30 days';
      days_in_range := 30;
  END CASE;

  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_orders,
    COUNT(*) FILTER (WHERE o.status = 'delivered')::INTEGER AS delivered_orders,
    COUNT(*) FILTER (WHERE o.status IN ('cancelled', 'failed', 'returned'))::INTEGER AS failed_orders,
    COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0)::NUMERIC AS total_revenue,
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