-- Create a secure RPC function for sellers to update capacity of nearby GPS-discovered agents
-- This bypasses the location_id-based RLS policy while maintaining security via radius check

CREATE OR REPLACE FUNCTION seller_update_nearby_agent_capacity(
  p_agent_row_id uuid,
  p_new_capacity integer,
  p_radius_km numeric DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_lat numeric;
  seller_lng numeric;
  agent_lat numeric;
  agent_lng numeric;
  distance numeric;
  v_seller_user_id uuid;
BEGIN
  -- Get current user ID
  v_seller_user_id := auth.uid();
  
  IF v_seller_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get seller coordinates
  SELECT s.latitude::numeric, s.longitude::numeric INTO seller_lat, seller_lng
  FROM sellers s
  WHERE s.user_id = v_seller_user_id;

  IF seller_lat IS NULL OR seller_lng IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seller GPS coordinates not set. Please set your location first.');
  END IF;

  -- Get agent coordinates
  SELECT da.latitude::numeric, da.longitude::numeric INTO agent_lat, agent_lng
  FROM delivery_agents da
  WHERE da.id = p_agent_row_id;

  IF agent_lat IS NULL OR agent_lng IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent GPS coordinates not available');
  END IF;

  -- Calculate distance using Haversine formula
  distance := 6371 * acos(
    cos(radians(seller_lat)) * cos(radians(agent_lat)) *
    cos(radians(agent_lng) - radians(seller_lng)) +
    sin(radians(seller_lat)) * sin(radians(agent_lat))
  );

  -- Check if agent is within radius
  IF distance > p_radius_km THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent is no longer within ' || p_radius_km || 'km radius');
  END IF;

  -- Update the agent's capacity
  UPDATE delivery_agents
  SET max_capacity = p_new_capacity,
      updated_at = now()
  WHERE id = p_agent_row_id;

  RETURN jsonb_build_object('success', true, 'new_capacity', p_new_capacity, 'distance_km', round(distance::numeric, 2));
END;
$$;

-- Restrict access to authenticated users only
REVOKE ALL ON FUNCTION seller_update_nearby_agent_capacity(uuid, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION seller_update_nearby_agent_capacity(uuid, integer, numeric) TO authenticated;