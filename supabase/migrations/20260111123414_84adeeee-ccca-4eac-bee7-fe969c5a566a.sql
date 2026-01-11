-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS public.get_seller_stats_with_period(uuid, text);

-- Recreate with corrected logic: use seller_user_id directly (not sellers.id)
-- and join subscriptions through products (subscriptions has no seller_id column)
CREATE OR REPLACE FUNCTION public.get_seller_stats_with_period(
  seller_user_id uuid,
  period text DEFAULT 'today'
)
RETURNS TABLE (
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
AS $$
DECLARE
  start_date timestamptz;
BEGIN
  -- Calculate start date based on period (in IST timezone)
  start_date := CASE period
    WHEN 'today' THEN date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'
    WHEN 'week' THEN date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'
    WHEN 'month' THEN date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'
    WHEN 'year' THEN date_trunc('year', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'
    ELSE NULL -- 'all' or any other value means no date filter
  END;

  RETURN QUERY
  SELECT
    -- Total active products for this seller (products.seller_id = auth user id)
    COALESCE((
      SELECT COUNT(*)::bigint 
      FROM products p 
      WHERE p.seller_id = seller_user_id AND p.is_active = true
    ), 0)::bigint AS total_products,
    
    -- Active orders (pending statuses) - orders.seller_id = auth user id
    COALESCE((
      SELECT COUNT(*)::bigint 
      FROM orders o 
      WHERE o.seller_id = seller_user_id 
        AND o.status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'placed')
        AND (start_date IS NULL OR o.created_at >= start_date)
    ), 0)::bigint AS active_orders,
    
    -- Delivered orders count
    COALESCE((
      SELECT COUNT(*)::bigint 
      FROM orders o 
      WHERE o.seller_id = seller_user_id 
        AND o.status = 'delivered'
        AND (start_date IS NULL OR o.created_at >= start_date)
    ), 0)::bigint AS delivered_count,
    
    -- Regular revenue (from delivered orders, excluding subscription orders)
    COALESCE((
      SELECT SUM(o.total_amount)::numeric 
      FROM orders o 
      WHERE o.seller_id = seller_user_id 
        AND o.status = 'delivered'
        AND (o.order_type IS NULL OR o.order_type != 'subscription')
        AND (start_date IS NULL OR o.created_at >= start_date)
    ), 0)::numeric AS regular_revenue,
    
    -- Subscription revenue (from delivered subscription orders)
    COALESCE((
      SELECT SUM(o.total_amount)::numeric 
      FROM orders o 
      WHERE o.seller_id = seller_user_id 
        AND o.status = 'delivered'
        AND o.order_type = 'subscription'
        AND (start_date IS NULL OR o.created_at >= start_date)
    ), 0)::numeric AS subscription_revenue,
    
    -- Total revenue (all delivered orders)
    COALESCE((
      SELECT SUM(o.total_amount)::numeric 
      FROM orders o 
      WHERE o.seller_id = seller_user_id 
        AND o.status = 'delivered'
        AND (start_date IS NULL OR o.created_at >= start_date)
    ), 0)::numeric AS total_revenue,
    
    -- Active subscriptions count (join through products to find seller's subscriptions)
    COALESCE((
      SELECT COUNT(*)::bigint 
      FROM subscriptions s
      JOIN products p ON p.id = s.product_id
      WHERE p.seller_id = seller_user_id 
        AND s.is_active = true
    ), 0)::bigint AS active_subscriptions,
    
    -- Subscription orders count
    COALESCE((
      SELECT COUNT(*)::bigint 
      FROM orders o 
      WHERE o.seller_id = seller_user_id 
        AND o.order_type = 'subscription'
        AND (start_date IS NULL OR o.created_at >= start_date)
    ), 0)::bigint AS subscription_orders_count,
    
    -- Pending revenue (non-subscription orders in pending statuses)
    COALESCE((
      SELECT SUM(o.total_amount)::numeric 
      FROM orders o 
      WHERE o.seller_id = seller_user_id 
        AND o.status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'placed')
        AND (o.order_type IS NULL OR o.order_type != 'subscription')
        AND (start_date IS NULL OR o.created_at >= start_date)
    ), 0)::numeric AS pending_revenue,
    
    -- Pending subscription revenue (subscription orders in pending statuses)
    COALESCE((
      SELECT SUM(o.total_amount)::numeric 
      FROM orders o 
      WHERE o.seller_id = seller_user_id 
        AND o.status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'placed')
        AND o.order_type = 'subscription'
        AND (start_date IS NULL OR o.created_at >= start_date)
    ), 0)::numeric AS pending_subscription_revenue,
    
    -- Projected daily subscription (sum of price * quantity for active subscriptions)
    COALESCE((
      SELECT SUM(p.price * s.quantity)::numeric 
      FROM subscriptions s
      JOIN products p ON p.id = s.product_id
      WHERE p.seller_id = seller_user_id 
        AND s.is_active = true
    ), 0)::numeric AS projected_daily_subscription;
END;
$$;