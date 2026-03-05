
CREATE OR REPLACE FUNCTION public.get_seller_subscription_handover_data(seller_user_id uuid, handover_date date)
RETURNS TABLE(agent_id uuid, agent_name text, agent_phone text, agent_profile_image text, total_orders bigint, product_id uuid, product_name text, product_unit text, product_image text, total_quantity bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    AND NOT EXISTS (
      SELECT 1 FROM subscription_vacation_periods svp
      WHERE svp.subscription_id = s.id
        AND svp.status = 'active'
        AND handover_date BETWEEN svp.start_date AND svp.end_date
    )
  GROUP BY 
    da.agent_id, da.name, da.phone, da.profile_image,
    p.id, p.name, p.unit, p.image_url
  ORDER BY da.name, p.name;
END;
$function$;
