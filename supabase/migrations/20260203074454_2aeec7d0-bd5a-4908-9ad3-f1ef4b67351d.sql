-- Drop and recreate RPC function to aggregate products without time slot grouping
DROP FUNCTION IF EXISTS public.get_seller_subscription_handover_data(UUID, DATE);

CREATE FUNCTION public.get_seller_subscription_handover_data(
  seller_user_id UUID,
  handover_date DATE
)
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  agent_phone TEXT,
  agent_profile_image TEXT,
  total_orders BIGINT,
  product_id UUID,
  product_name TEXT,
  product_unit TEXT,
  product_image TEXT,
  total_quantity BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    da.agent_id::UUID,
    da.name::TEXT AS agent_name,
    da.phone::TEXT AS agent_phone,
    da.profile_image::TEXT AS agent_profile_image,
    COUNT(DISTINCT dord.id)::BIGINT AS total_orders,
    p.id::UUID AS product_id,
    p.name::TEXT AS product_name,
    COALESCE(p.unit, 'units')::TEXT AS product_unit,
    p.image_url::TEXT AS product_image,
    SUM(dord.quantity)::BIGINT AS total_quantity
  FROM daily_orders dord
  INNER JOIN subscriptions s ON dord.subscription_id = s.id
  INNER JOIN products p ON s.product_id = p.id
  INNER JOIN delivery_agents da ON dord.assigned_agent_id = da.agent_id
  WHERE dord.date = handover_date
    AND dord.assigned_agent_id IS NOT NULL
    AND dord.status IN ('pending', 'confirmed')
    AND p.seller_id = seller_user_id
  GROUP BY 
    da.agent_id, da.name, da.phone, da.profile_image,
    p.id, p.name, p.unit, p.image_url
  ORDER BY da.name, p.name;
END;
$$;