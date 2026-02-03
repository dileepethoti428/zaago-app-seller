-- Create secure RPC function for seller subscription handover data
CREATE OR REPLACE FUNCTION get_seller_subscription_handover_data(
  seller_user_id UUID,
  handover_date DATE
)
RETURNS TABLE (
  agent_id TEXT,
  agent_name TEXT,
  agent_phone TEXT,
  agent_profile_image TEXT,
  total_orders INTEGER,
  product_id UUID,
  product_name TEXT,
  product_unit TEXT,
  product_image TEXT,
  total_quantity INTEGER,
  delivery_time_slot TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: Validate that the caller is the seller
  IF auth.uid() IS NULL OR auth.uid() != seller_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Invalid seller_user_id';
  END IF;
  
  RETURN QUERY
  SELECT 
    da.agent_id::TEXT,
    da.name::TEXT,
    da.phone::TEXT,
    da.profile_image::TEXT,
    COUNT(DISTINCT dord.id)::INTEGER as total_orders,
    p.id as product_id,
    p.name::TEXT as product_name,
    p.unit::TEXT as product_unit,
    p.image_url::TEXT as product_image,
    SUM(dord.quantity)::INTEGER as total_quantity,
    s.delivery_time_slot::TEXT
  FROM daily_orders dord
  INNER JOIN subscriptions s ON dord.subscription_id = s.id
  INNER JOIN products p ON s.product_id = p.id
  INNER JOIN delivery_agents da ON dord.assigned_agent_id = da.agent_id
  WHERE dord.date = handover_date
    AND dord.status IN ('pending', 'assigned', 'out_for_delivery')
    AND p.seller_id = seller_user_id
    AND s.is_active = TRUE
    AND dord.assigned_agent_id IS NOT NULL
  GROUP BY 
    da.agent_id, da.name, da.phone, da.profile_image,
    p.id, p.name, p.unit, p.image_url, s.delivery_time_slot
  ORDER BY da.name, p.name;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION get_seller_subscription_handover_data IS 'Returns aggregated subscription handover data for a seller, grouped by delivery agent and product';