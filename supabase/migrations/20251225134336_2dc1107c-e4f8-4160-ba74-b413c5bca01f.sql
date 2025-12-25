-- Fix get_seller_subscription_orders_overview - match products.seller_id directly to user_id
CREATE OR REPLACE FUNCTION get_seller_subscription_orders_overview(
  p_seller_user_id uuid,
  p_date date
)
RETURNS TABLE(
  total_orders bigint,
  assigned_orders bigint,
  unassigned_orders bigint,
  delivered_orders bigint,
  pending_orders bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH seller_daily_orders AS (
    SELECT 
      dord.id,
      dord.assigned_agent_id,
      dord.status
    FROM daily_orders dord
    JOIN subscriptions sub ON dord.subscription_id = sub.id
    JOIN products p ON sub.product_id = p.id
    WHERE p.seller_id = p_seller_user_id
    AND dord.date = p_date
  )
  SELECT
    COUNT(*)::bigint as total_orders,
    COUNT(*) FILTER (WHERE assigned_agent_id IS NOT NULL)::bigint as assigned_orders,
    COUNT(*) FILTER (WHERE assigned_agent_id IS NULL)::bigint as unassigned_orders,
    COUNT(*) FILTER (WHERE status = 'delivered')::bigint as delivered_orders,
    COUNT(*) FILTER (WHERE assigned_agent_id IS NOT NULL AND status != 'delivered')::bigint as pending_orders
  FROM seller_daily_orders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix get_seller_unassigned_orders - match products.seller_id directly to user_id
CREATE OR REPLACE FUNCTION get_seller_unassigned_orders(
  p_seller_user_id uuid,
  p_date date
)
RETURNS TABLE(
  id uuid,
  date date,
  status text,
  quantity numeric,
  customer_id uuid,
  subscription_id uuid,
  location_id bigint,
  product_name text,
  product_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dord.id,
    dord.date,
    dord.status,
    dord.quantity,
    dord.customer_id,
    dord.subscription_id,
    dord.location_id,
    p.name as product_name,
    p.id as product_id
  FROM daily_orders dord
  JOIN subscriptions sub ON dord.subscription_id = sub.id
  JOIN products p ON sub.product_id = p.id
  WHERE p.seller_id = p_seller_user_id
  AND dord.date = p_date
  AND dord.assigned_agent_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix get_seller_agent_order_counts - match products.seller_id directly to user_id
CREATE OR REPLACE FUNCTION get_seller_agent_order_counts(
  p_seller_user_id uuid,
  p_date date,
  p_location_id bigint
)
RETURNS TABLE(
  agent_id uuid,
  order_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dord.assigned_agent_id as agent_id,
    COUNT(*)::bigint as order_count
  FROM daily_orders dord
  JOIN subscriptions sub ON dord.subscription_id = sub.id
  JOIN products p ON sub.product_id = p.id
  WHERE p.seller_id = p_seller_user_id
  AND dord.date = p_date
  AND dord.location_id = p_location_id
  AND dord.assigned_agent_id IS NOT NULL
  GROUP BY dord.assigned_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;