-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS public.get_seller_stats_with_period(uuid, text);

-- Recreate get_seller_stats_with_period with pending and projected subscription fields
CREATE OR REPLACE FUNCTION public.get_seller_stats_with_period(seller_user_id uuid, period text DEFAULT 'all'::text)
RETURNS TABLE(
  total_products bigint, 
  active_orders bigint, 
  delivered_count bigint, 
  regular_revenue numeric, 
  subscription_revenue numeric, 
  total_revenue numeric, 
  active_subscriptions bigint, 
  subscription_orders_count bigint,
  pending_revenue numeric,
  pending_subscription_revenue numeric,
  projected_daily_subscription numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  seller_id_var uuid;
  start_date timestamptz;
BEGIN
  -- Get the seller's id from the sellers table
  SELECT id INTO seller_id_var
  FROM sellers
  WHERE sellers.user_id = seller_user_id
  LIMIT 1;

  -- Calculate start_date based on period (using Asia/Kolkata timezone)
  start_date := CASE period
    WHEN 'today' THEN (now() AT TIME ZONE 'Asia/Kolkata')::date::timestamptz
    WHEN 'week' THEN date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata')::timestamptz
    WHEN 'month' THEN date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata')::timestamptz
    ELSE NULL
  END;

  RETURN QUERY
  WITH product_stats AS (
    SELECT COUNT(*) as total_products
    FROM products p
    WHERE p.seller_id = seller_id_var
      AND p.is_active = true
  ),
  order_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE o.status IN ('pending', 'confirmed', 'processing', 'out_for_delivery', 'pending_seller_acceptance')) as active_orders,
      COUNT(*) FILTER (WHERE o.status = 'delivered') as delivered_count,
      -- Delivered regular revenue
      COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered' AND o.subscription_id IS NULL), 0) as regular_revenue,
      -- Delivered subscription revenue
      COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered' AND o.subscription_id IS NOT NULL), 0) as subscription_revenue,
      -- Pending revenue (all pending orders)
      COALESCE(SUM(o.total) FILTER (WHERE o.status IN ('pending', 'confirmed', 'processing', 'out_for_delivery', 'pending_seller_acceptance')), 0) as pending_revenue,
      -- Pending subscription revenue (subscription orders that are not yet delivered)
      COALESCE(SUM(o.total) FILTER (WHERE o.status IN ('pending', 'confirmed', 'processing', 'out_for_delivery', 'pending_seller_acceptance') AND o.subscription_id IS NOT NULL), 0) as pending_subscription_revenue,
      COUNT(*) FILTER (WHERE o.subscription_id IS NOT NULL AND o.status = 'delivered') as subscription_orders_count
    FROM orders o
    WHERE o.seller_id = seller_id_var
      AND (start_date IS NULL OR o.created_at >= start_date)
  ),
  subscription_stats AS (
    SELECT 
      COUNT(*) as active_subscriptions,
      -- Projected daily subscription value: sum of (price * quantity) for all active subscriptions
      COALESCE(SUM(
        (SELECT p.price FROM products p WHERE p.id = s.product_id) * s.quantity
      ), 0) as projected_daily_subscription
    FROM subscriptions s
    WHERE s.seller_id = seller_id_var
      AND s.is_active = true
  )
  SELECT 
    ps.total_products,
    os.active_orders,
    os.delivered_count,
    os.regular_revenue,
    os.subscription_revenue,
    (os.regular_revenue + os.subscription_revenue) as total_revenue,
    ss.active_subscriptions,
    os.subscription_orders_count,
    os.pending_revenue,
    os.pending_subscription_revenue,
    ss.projected_daily_subscription
  FROM product_stats ps, order_stats os, subscription_stats ss;
END;
$function$;