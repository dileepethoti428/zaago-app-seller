
CREATE OR REPLACE FUNCTION public.get_seller_subscription_handover_direct(
  seller_user_id UUID,
  handover_date DATE
)
RETURNS TABLE(
  agent_id      UUID,
  agent_name    TEXT,
  agent_phone   TEXT,
  agent_profile_image TEXT,
  total_orders  BIGINT,
  product_id    UUID,
  product_name  TEXT,
  product_unit  TEXT,
  product_image TEXT,
  total_quantity BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    da.agent_id                           AS agent_id,
    da.name                               AS agent_name,
    da.phone                              AS agent_phone,
    da.profile_image                      AS agent_profile_image,
    COUNT(DISTINCT s.id)::BIGINT          AS total_orders,
    p.id                                  AS product_id,
    p.name                                AS product_name,
    COALESCE(p.unit, 'units')             AS product_unit,
    p.image_url                           AS product_image,
    SUM(s.quantity)::BIGINT               AS total_quantity
  FROM subscriptions s
  JOIN products p ON p.id = s.product_id
  JOIN delivery_agents da ON da.id = COALESCE(s.primary_agent_id, s.last_assigned_agent_id)
  WHERE
    s.is_active = true
    AND s.next_delivery_date = handover_date
    AND p.seller_id = seller_user_id
    AND COALESCE(s.primary_agent_id, s.last_assigned_agent_id) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM subscription_vacation_periods svp
      WHERE svp.subscription_id = s.id
        AND svp.status = 'active'
        AND handover_date BETWEEN svp.start_date AND svp.end_date
    )
  GROUP BY
    da.agent_id,
    da.name,
    da.phone,
    da.profile_image,
    p.id,
    p.name,
    p.unit,
    p.image_url
  ORDER BY da.name, p.name;
END;
$$;
