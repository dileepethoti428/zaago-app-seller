
-- 1. Deactivate duplicate subscriptions: keep only the most recent per customer+product
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY customer_id, product_id ORDER BY created_at DESC) AS rn
  FROM subscriptions
  WHERE is_active = true
)
UPDATE subscriptions
SET is_active = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Update handover RPC with GROUP BY dedup guard
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
  -- Auto-advance stale next_delivery_dates for this seller's subscriptions
  UPDATE subscriptions s
  SET next_delivery_date = (
    SELECT calculate_next_delivery_date_v2(
      handover_date,
      s.subscription_type,
      s.delivery_days
    )::date
  )
  FROM products p
  WHERE s.product_id = p.id
    AND p.seller_id = seller_user_id
    AND s.is_active = true
    AND s.next_delivery_date < handover_date;

  -- Return grouped subscription rows (dedup by customer+product per agent)
  RETURN QUERY
  SELECT
    COALESCE(da_primary.agent_id, da_last.agent_id)::text AS agent_id,
    COALESCE(da_primary.name, da_last.name)::text AS agent_name,
    COALESCE(da_primary.phone, da_last.phone)::text AS agent_phone,
    COALESCE(da_primary.profile_image, da_last.profile_image)::text AS agent_profile_image,
    1::bigint AS total_orders,
    p.id::text AS product_id,
    p.name::text AS product_name,
    COALESCE(p.unit, 'units')::text AS product_unit,
    p.image_url::text AS product_image,
    SUM(s.quantity)::numeric AS total_quantity,
    c.full_name::text AS customer_name,
    SUM(s.quantity)::numeric AS customer_quantity
  FROM subscriptions s
  JOIN products p ON p.id = s.product_id
  JOIN customers c ON c.id = s.customer_id
  LEFT JOIN delivery_agents da_primary ON da_primary.id = s.primary_agent_id
  LEFT JOIN delivery_agents da_last ON da_last.id = s.last_assigned_agent_id
  WHERE s.is_active = true
    AND s.next_delivery_date = handover_date
    AND p.seller_id = seller_user_id
    AND COALESCE(da_primary.id, da_last.id) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM subscription_vacation_periods svp
      WHERE svp.subscription_id = s.id
        AND svp.status = 'active'
        AND handover_date BETWEEN svp.start_date AND svp.end_date
    )
  GROUP BY
    COALESCE(da_primary.agent_id, da_last.agent_id),
    COALESCE(da_primary.name, da_last.name),
    COALESCE(da_primary.phone, da_last.phone),
    COALESCE(da_primary.profile_image, da_last.profile_image),
    p.id, p.name, p.unit, p.image_url,
    c.id, c.full_name
  ORDER BY COALESCE(da_primary.name, da_last.name), p.name, c.full_name;
END;
$$;
