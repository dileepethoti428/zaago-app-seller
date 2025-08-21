-- Update get_seller_stats function to support time periods
CREATE OR REPLACE FUNCTION public.get_seller_stats_with_period(seller_user_id uuid, time_period text DEFAULT 'all')
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  total_products_count INTEGER;
  active_orders_count INTEGER;
  total_deliveries_count INTEGER;
  total_revenue_amount NUMERIC;
  period_start_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Determine the start date based on time period
  CASE time_period
    WHEN 'today' THEN
      period_start_date := CURRENT_DATE;
    WHEN '1week' THEN
      period_start_date := CURRENT_DATE - INTERVAL '7 days';
    WHEN '1month' THEN
      period_start_date := CURRENT_DATE - INTERVAL '1 month';
    WHEN '3months' THEN
      period_start_date := CURRENT_DATE - INTERVAL '3 months';
    WHEN '6months' THEN
      period_start_date := CURRENT_DATE - INTERVAL '6 months';
    ELSE
      period_start_date := '1970-01-01'::timestamp; -- All time
  END CASE;

  -- Total products count (not time-dependent)
  SELECT COUNT(*) INTO total_products_count
  FROM products 
  WHERE seller_id = seller_user_id AND is_active = true;
  
  -- Active orders count (orders with seller's products)
  SELECT COUNT(DISTINCT o.id) INTO active_orders_count
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE p.seller_id = seller_user_id
  )
  AND o.status IN ('placed', 'confirmed', 'assigned', 'out_for_delivery')
  AND (time_period = 'all' OR o.created_at >= period_start_date);
  
  -- Total deliveries count for the period
  SELECT COUNT(DISTINCT o.id) INTO total_deliveries_count
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE p.seller_id = seller_user_id
  )
  AND o.status = 'delivered'
  AND (time_period = 'all' OR o.created_at >= period_start_date);
  
  -- Revenue for the period
  SELECT COALESCE(SUM(
    (SELECT COALESCE(SUM((item->>'quantity')::INTEGER * (item->>'price')::NUMERIC), 0)
     FROM jsonb_array_elements(o.items) AS item
     WHERE (item->>'id')::UUID IN (
       SELECT p.id FROM products p WHERE p.seller_id = seller_user_id
     ))
  ), 0) INTO total_revenue_amount
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE p.seller_id = seller_user_id
  )
  AND o.status = 'delivered'
  AND (time_period = 'all' OR o.created_at >= period_start_date);
  
  result := jsonb_build_object(
    'total_products', total_products_count,
    'active_orders', active_orders_count,
    'total_deliveries', total_deliveries_count,
    'total_revenue', total_revenue_amount,
    'time_period', time_period
  );
  
  RETURN result;
END;
$function$;