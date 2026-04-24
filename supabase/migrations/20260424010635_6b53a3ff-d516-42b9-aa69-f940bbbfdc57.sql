CREATE OR REPLACE FUNCTION public.get_seller_subscription_handover_direct(
  seller_user_id UUID,
  handover_date DATE
)
RETURNS TABLE(
  agent_id TEXT,
  agent_name TEXT,
  agent_phone TEXT,
  agent_profile_image TEXT,
  total_orders BIGINT,
  product_id TEXT,
  product_name TEXT,
  product_unit TEXT,
  product_image TEXT,
  total_quantity NUMERIC,
  customer_name TEXT,
  customer_quantity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    da.agent_id::text AS agent_id,
    da.name::text AS agent_name,
    da.phone::text AS agent_phone,
    da.profile_image::text AS agent_profile_image,
    1::bigint AS total_orders,
    p.id::text AS product_id,
    p.name::text AS product_name,
    COALESCE(p.unit, 'units')::text AS product_unit,
    p.image_url::text AS product_image,
    SUM(d.quantity)::numeric AS total_quantity,
    c.full_name::text AS customer_name,
    SUM(d.quantity)::numeric AS customer_quantity
  FROM daily_orders d
  JOIN subscriptions s ON s.id = d.subscription_id
  JOIN products p ON p.id = s.product_id
  JOIN customers c ON c.id = d.customer_id
  JOIN delivery_agents da ON da.agent_id = d.assigned_agent_id
  WHERE d.date = handover_date
    AND d.status IN ('pending', 'assigned', 'out_for_delivery', 'delivered')
    AND p.seller_id = seller_user_id
    AND NOT EXISTS (
      SELECT 1 FROM subscription_vacation_periods svp
      WHERE svp.subscription_id = s.id
        AND svp.status = 'active'
        AND handover_date BETWEEN svp.start_date AND svp.end_date
    )
  GROUP BY
    da.agent_id, da.name, da.phone, da.profile_image,
    p.id, p.name, p.unit, p.image_url,
    c.id, c.full_name
  ORDER BY da.name, p.name, c.full_name;
END;
$$;