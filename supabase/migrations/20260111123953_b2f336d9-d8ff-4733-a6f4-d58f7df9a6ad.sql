-- Drop and recreate the function with correct column names
DROP FUNCTION IF EXISTS public.get_seller_stats_with_period(uuid, text);

CREATE OR REPLACE FUNCTION public.get_seller_stats_with_period(seller_user_id uuid, period text DEFAULT 'all')
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
SET search_path = public
AS $$
DECLARE
  start_date timestamptz;
BEGIN
  -- Calculate start_date based on period (IST timezone)
  start_date := CASE period
    WHEN 'today' THEN (now() AT TIME ZONE 'Asia/Kolkata')::date::timestamptz
    WHEN 'week' THEN ((now() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '7 days')::timestamptz
    WHEN 'month' THEN ((now() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '30 days')::timestamptz
    WHEN 'year' THEN ((now() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '365 days')::timestamptz
    ELSE NULL -- 'all' means no date filter
  END;

  RETURN QUERY
  SELECT
    -- Total active products for this seller
    (SELECT COUNT(*) FROM products p WHERE p.seller_id = seller_user_id AND p.is_active = true)::bigint AS total_products,
    
    -- Active orders (pending/in-progress statuses)
    (SELECT COUNT(*) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status IN ('new', 'placed', 'pending', 'confirmed', 'processing', 'preparing', 'ready', 'accepted', 'accepted_by_seller', 'accepted_late', 'assigned', 'out_for_delivery', 'in_transit', 'pending_seller_acceptance')
     AND (start_date IS NULL OR o.created_at >= start_date)
    )::bigint AS active_orders,
    
    -- Delivered orders count
    (SELECT COUNT(*) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status = 'delivered'
     AND (start_date IS NULL OR o.created_at >= start_date)
    )::bigint AS delivered_count,
    
    -- Total revenue (all delivered orders) - using 'total' column
    COALESCE((SELECT SUM(o.total) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status = 'delivered'
     AND (start_date IS NULL OR o.created_at >= start_date)
    ), 0)::numeric AS total_revenue,
    
    -- Regular order revenue (delivered, no subscription_id)
    COALESCE((SELECT SUM(o.total) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status = 'delivered'
     AND o.subscription_id IS NULL
     AND (start_date IS NULL OR o.created_at >= start_date)
    ), 0)::numeric AS regular_revenue,
    
    -- Subscription order revenue (delivered, has subscription_id)
    COALESCE((SELECT SUM(o.total) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status = 'delivered'
     AND o.subscription_id IS NOT NULL
     AND (start_date IS NULL OR o.created_at >= start_date)
    ), 0)::numeric AS subscription_revenue,
    
    -- Pending revenue (regular orders in progress)
    COALESCE((SELECT SUM(o.total) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status IN ('new', 'placed', 'pending', 'confirmed', 'processing', 'preparing', 'ready', 'accepted', 'accepted_by_seller', 'accepted_late', 'assigned', 'out_for_delivery', 'in_transit', 'pending_seller_acceptance')
     AND o.subscription_id IS NULL
     AND (start_date IS NULL OR o.created_at >= start_date)
    ), 0)::numeric AS pending_revenue,
    
    -- Pending subscription revenue (subscription orders in progress)
    COALESCE((SELECT SUM(o.total) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status IN ('new', 'placed', 'pending', 'confirmed', 'processing', 'preparing', 'ready', 'accepted', 'accepted_by_seller', 'accepted_late', 'assigned', 'out_for_delivery', 'in_transit', 'pending_seller_acceptance')
     AND o.subscription_id IS NOT NULL
     AND (start_date IS NULL OR o.created_at >= start_date)
    ), 0)::numeric AS pending_subscription_revenue,
    
    -- Active subscriptions count (via products owned by this seller)
    (SELECT COUNT(*) FROM subscriptions s
     JOIN products p ON p.id = s.product_id
     WHERE p.seller_id = seller_user_id 
     AND s.is_active = true
    )::bigint AS active_subscriptions,
    
    -- Projected daily subscription revenue
    COALESCE((SELECT SUM(p.price * s.quantity) FROM subscriptions s
     JOIN products p ON p.id = s.product_id
     WHERE p.seller_id = seller_user_id 
     AND s.is_active = true
    ), 0)::numeric AS projected_daily_subscription;
END;
$$;