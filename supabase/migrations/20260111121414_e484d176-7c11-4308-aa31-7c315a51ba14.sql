-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS public.get_seller_stats_with_period(uuid, text);

-- Recreate get_seller_stats_with_period with subscription revenue breakdown
CREATE OR REPLACE FUNCTION public.get_seller_stats_with_period(seller_user_id uuid, period text DEFAULT 'today')
RETURNS TABLE (
  total_products bigint,
  active_orders bigint,
  delivered_count bigint,
  total_revenue numeric,
  regular_revenue numeric,
  subscription_revenue numeric,
  active_subscriptions bigint,
  subscription_orders_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date timestamp with time zone;
BEGIN
  -- Calculate start date based on period
  CASE period
    WHEN 'today' THEN start_date := date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata');
    WHEN 'week' THEN start_date := date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata');
    WHEN 'month' THEN start_date := date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata');
    WHEN 'all' THEN start_date := '1970-01-01'::timestamp with time zone;
    ELSE start_date := date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata');
  END CASE;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::bigint FROM products WHERE products.seller_id = seller_user_id) as total_products,
    
    (SELECT COUNT(*)::bigint FROM orders 
     WHERE orders.seller_id = seller_user_id 
     AND orders.status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery')
     AND orders.created_at >= start_date) as active_orders,
    
    (SELECT COUNT(*)::bigint FROM orders 
     WHERE orders.seller_id = seller_user_id 
     AND orders.status = 'delivered'
     AND orders.created_at >= start_date) as delivered_count,
    
    (SELECT COALESCE(SUM(orders.total), 0)::numeric FROM orders 
     WHERE orders.seller_id = seller_user_id 
     AND orders.status = 'delivered'
     AND orders.created_at >= start_date) as total_revenue,
    
    (SELECT COALESCE(SUM(orders.total), 0)::numeric FROM orders 
     WHERE orders.seller_id = seller_user_id 
     AND orders.status = 'delivered'
     AND orders.subscription_id IS NULL
     AND orders.created_at >= start_date) as regular_revenue,
    
    (SELECT COALESCE(SUM(orders.total), 0)::numeric FROM orders 
     WHERE orders.seller_id = seller_user_id 
     AND orders.status = 'delivered'
     AND orders.subscription_id IS NOT NULL
     AND orders.created_at >= start_date) as subscription_revenue,
    
    (SELECT COUNT(*)::bigint FROM subscriptions s
     JOIN products p ON s.product_id = p.id
     WHERE p.seller_id = seller_user_id
     AND s.status = 'active') as active_subscriptions,
    
    (SELECT COUNT(*)::bigint FROM orders 
     WHERE orders.seller_id = seller_user_id 
     AND orders.status = 'delivered'
     AND orders.subscription_id IS NOT NULL
     AND orders.created_at >= start_date) as subscription_orders_count;
END;
$$;