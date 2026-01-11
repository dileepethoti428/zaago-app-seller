-- Update get_seller_stats function to include subscription revenue
CREATE OR REPLACE FUNCTION public.get_seller_stats(seller_user_id UUID, period TEXT DEFAULT 'today')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  start_date TIMESTAMP WITH TIME ZONE;
  total_products INTEGER;
  active_orders INTEGER;
  delivered_count INTEGER;
  regular_revenue NUMERIC;
  subscription_revenue NUMERIC;
  active_subscriptions_count INTEGER;
  subscription_orders_count INTEGER;
BEGIN
  -- Determine start date based on period
  CASE period
    WHEN 'today' THEN start_date := CURRENT_DATE;
    WHEN 'week' THEN start_date := CURRENT_DATE - INTERVAL '7 days';
    WHEN 'month' THEN start_date := CURRENT_DATE - INTERVAL '30 days';
    ELSE start_date := CURRENT_DATE;
  END CASE;

  -- Count total products for this seller
  SELECT COUNT(*)
  INTO total_products
  FROM products
  WHERE seller_id = seller_user_id;

  -- Count active orders (pending, confirmed, preparing, out_for_delivery)
  SELECT COUNT(*)
  INTO active_orders
  FROM orders
  WHERE seller_id = seller_user_id
    AND status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery')
    AND created_at >= start_date;

  -- Count delivered orders
  SELECT COUNT(*)
  INTO delivered_count
  FROM orders
  WHERE seller_id = seller_user_id
    AND status = 'delivered'
    AND created_at >= start_date;

  -- Calculate regular order revenue (orders without subscription_id)
  SELECT COALESCE(SUM(total_amount), 0)
  INTO regular_revenue
  FROM orders
  WHERE seller_id = seller_user_id
    AND status = 'delivered'
    AND subscription_id IS NULL
    AND created_at >= start_date;

  -- Calculate subscription revenue (orders with subscription_id)
  -- Join through subscriptions and products to ensure seller ownership
  SELECT COALESCE(SUM(s.quantity * p.price), 0)
  INTO subscription_revenue
  FROM orders o
  JOIN subscriptions s ON o.subscription_id = s.id
  JOIN products p ON s.product_id = p.id
  WHERE p.seller_id = seller_user_id
    AND o.status = 'delivered'
    AND o.created_at >= start_date;

  -- Count subscription orders for this period
  SELECT COUNT(*)
  INTO subscription_orders_count
  FROM orders o
  JOIN subscriptions s ON o.subscription_id = s.id
  JOIN products p ON s.product_id = p.id
  WHERE p.seller_id = seller_user_id
    AND o.status = 'delivered'
    AND o.created_at >= start_date;

  -- Count active subscriptions for this seller
  SELECT COUNT(*)
  INTO active_subscriptions_count
  FROM subscriptions s
  JOIN products p ON s.product_id = p.id
  WHERE p.seller_id = seller_user_id
    AND s.is_active = true;

  -- Build result JSON
  result := jsonb_build_object(
    'total_products', total_products,
    'active_orders', active_orders,
    'delivered_count', delivered_count,
    'regular_revenue', regular_revenue,
    'subscription_revenue', subscription_revenue,
    'total_revenue', regular_revenue + subscription_revenue,
    'active_subscriptions', active_subscriptions_count,
    'subscription_orders_count', subscription_orders_count
  );

  RETURN result;
END;
$$;