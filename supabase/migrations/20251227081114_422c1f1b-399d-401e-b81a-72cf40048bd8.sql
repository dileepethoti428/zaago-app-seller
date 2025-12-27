-- Drop existing function
DROP FUNCTION IF EXISTS get_delivery_agents_near_seller(uuid, numeric);

-- Create the fixed function with explicit type casts
CREATE OR REPLACE FUNCTION get_delivery_agents_near_seller(
  p_seller_user_id uuid,
  p_radius_km numeric DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  name text,
  email text,
  phone text,
  is_online boolean,
  is_active boolean,
  max_capacity integer,
  latitude numeric,
  longitude numeric,
  distance_km numeric,
  vehicle_type text,
  vehicle_number text,
  total_deliveries integer,
  average_rating numeric,
  performance_score numeric,
  verification_status text,
  profile_image text,
  created_at timestamptz,
  last_delivery_at timestamptz,
  last_status_change timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_lat numeric;
  seller_lng numeric;
BEGIN
  -- Get seller coordinates with explicit cast
  SELECT s.latitude::numeric, s.longitude::numeric INTO seller_lat, seller_lng
  FROM sellers s
  WHERE s.user_id = p_seller_user_id;

  -- If seller not found or no coordinates, return empty
  IF seller_lat IS NULL OR seller_lng IS NULL THEN
    RETURN;
  END IF;

  -- Return agents within radius with explicit type casts
  RETURN QUERY
  SELECT 
    da.id,
    da.agent_id,
    da.name,
    da.email,
    da.phone,
    COALESCE(da.is_online, false) as is_online,
    COALESCE(da.is_active, true) as is_active,
    COALESCE(da.max_capacity, 10) as max_capacity,
    da.latitude::numeric,
    da.longitude::numeric,
    (
      6371 * acos(
        cos(radians(seller_lat)) * cos(radians(da.latitude::numeric)) *
        cos(radians(da.longitude::numeric) - radians(seller_lng)) +
        sin(radians(seller_lat)) * sin(radians(da.latitude::numeric))
      )
    )::numeric as distance_km,
    da.vehicle_type,
    da.vehicle_number,
    COALESCE(da.total_deliveries, 0) as total_deliveries,
    da.average_rating::numeric,
    da.performance_score::numeric,
    da.verification_status,
    da.profile_image,
    da.created_at,
    da.last_delivery_at,
    da.last_status_change
  FROM delivery_agents da
  WHERE da.latitude IS NOT NULL 
    AND da.longitude IS NOT NULL
    AND da.is_active = true
    AND (
      6371 * acos(
        cos(radians(seller_lat)) * cos(radians(da.latitude::numeric)) *
        cos(radians(da.longitude::numeric) - radians(seller_lng)) +
        sin(radians(seller_lat)) * sin(radians(da.latitude::numeric))
      )
    ) <= p_radius_km
  ORDER BY distance_km ASC;
END;
$$;