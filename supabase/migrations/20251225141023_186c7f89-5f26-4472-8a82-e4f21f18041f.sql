-- Create RPC function to get delivery agents within 10km of seller
CREATE OR REPLACE FUNCTION get_delivery_agents_near_seller(
  p_seller_user_id uuid,
  p_radius_km numeric DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  agent_id text,
  name text,
  max_capacity integer,
  is_online boolean,
  latitude double precision,
  longitude double precision,
  distance_km numeric
) AS $$
DECLARE
  seller_lat double precision;
  seller_lng double precision;
BEGIN
  -- Get seller's coordinates
  SELECT s.latitude, s.longitude INTO seller_lat, seller_lng
  FROM sellers s
  WHERE s.user_id = p_seller_user_id;
  
  -- If seller has no coordinates, return empty
  IF seller_lat IS NULL OR seller_lng IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    da.id,
    da.agent_id,
    da.name,
    COALESCE(da.max_capacity, 30)::integer as max_capacity,
    COALESCE(da.is_online, true) as is_online,
    da.latitude,
    da.longitude,
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(seller_lat)) * cos(radians(da.latitude)) * 
        cos(radians(da.longitude) - radians(seller_lng)) + 
        sin(radians(seller_lat)) * sin(radians(da.latitude))
      ))
    ))::numeric as distance_km
  FROM delivery_agents da
  WHERE da.is_active = true
  AND da.latitude IS NOT NULL
  AND da.longitude IS NOT NULL
  AND (
    6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(seller_lat)) * cos(radians(da.latitude)) * 
        cos(radians(da.longitude) - radians(seller_lng)) + 
        sin(radians(seller_lat)) * sin(radians(da.latitude))
      ))
    )
  ) <= p_radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;