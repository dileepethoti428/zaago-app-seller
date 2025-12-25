-- Create RPC function to get seller's regular orders for today with overview counts
CREATE OR REPLACE FUNCTION get_seller_orders_today_overview(seller_user_id uuid)
RETURNS TABLE (
  id uuid,
  assigned_agent_id uuid,
  status text,
  delivery_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    o.id,
    o.assigned_agent_id,
    o.status,
    o.delivery_date
  FROM orders o
  WHERE o.delivery_date = CURRENT_DATE
    AND o.status != 'payment_pending'
    AND EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(o.items) AS item
      WHERE (item->>'seller_id')::uuid = seller_user_id
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_seller_orders_today_overview(uuid) TO authenticated;