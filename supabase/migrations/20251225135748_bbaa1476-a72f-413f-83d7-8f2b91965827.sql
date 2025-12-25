-- Drop and recreate get_seller_unassigned_orders with customer_name
DROP FUNCTION IF EXISTS get_seller_unassigned_orders(uuid, date);

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
  customer_name text,
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
    c.full_name as customer_name,
    dord.subscription_id,
    dord.location_id,
    p.name as product_name,
    p.id as product_id
  FROM daily_orders dord
  JOIN subscriptions sub ON dord.subscription_id = sub.id
  JOIN products p ON sub.product_id = p.id
  LEFT JOIN customers c ON dord.customer_id = c.id
  WHERE p.seller_id = p_seller_user_id
  AND dord.date = p_date
  AND dord.assigned_agent_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;