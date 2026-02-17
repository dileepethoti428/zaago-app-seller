CREATE OR REPLACE FUNCTION public.get_seller_stats_with_period(seller_user_id uuid, period text DEFAULT 'today'::text)
 RETURNS TABLE(total_products bigint, active_orders bigint, delivered_count bigint, total_revenue numeric, regular_revenue numeric, subscription_revenue numeric, pending_revenue numeric, pending_subscription_revenue numeric, active_subscriptions bigint, projected_daily_subscription numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    
    COALESCE((SELECT SUM(o.total) FROM orders o 
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
    
    COALESCE((SELECT SUM(o.total) FROM orders o 
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
    
    COALESCE((SELECT SUM(o.total) FROM orders o 
     WHERE o.seller_id = seller_user_id 
     AND o.status IN ('new', 'placed', 'pending', 'confirmed', 'processing', 'preparing', 'ready', 'accepted', 'accepted_by_seller', 'accepted_late', 'assigned', 'out_for_delivery', 'in_transit', 'pending_seller_acceptance')
     AND o.subscription_id IS NULL
     AND (v_start_date IS NULL OR o.created_at >= v_start_date)
    ), 0)::numeric AS pending_revenue,
    
    COALESCE((SELECT SUM(o.total) FROM orders o 
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
$function$;