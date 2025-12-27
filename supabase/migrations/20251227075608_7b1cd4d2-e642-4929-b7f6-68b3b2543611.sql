-- Update the get_delivery_agents_near_seller function to return more fields
CREATE OR REPLACE FUNCTION public.get_delivery_agents_near_seller(
  seller_lat double precision,
  seller_lng double precision,
  radius_km double precision DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  agent_id text,
  name text,
  email text,
  phone text,
  is_online boolean,
  is_active boolean,
  max_capacity integer,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    da.id,
    da.agent_id,
    da.name,
    da.email,
    da.phone,
    da.is_online,
    da.is_active,
    da.max_capacity,
    da.latitude,
    da.longitude,
    (
      6371 * acos(
        cos(radians(seller_lat)) * cos(radians(da.latitude)) *
        cos(radians(da.longitude) - radians(seller_lng)) +
        sin(radians(seller_lat)) * sin(radians(da.latitude))
      )
    ) AS distance_km,
    da.vehicle_type,
    da.vehicle_number,
    da.total_deliveries,
    da.average_rating,
    da.performance_score,
    da.verification_status,
    da.profile_image,
    da.created_at,
    da.last_delivery_at,
    da.last_status_change
  FROM delivery_agents da
  WHERE 
    da.latitude IS NOT NULL 
    AND da.longitude IS NOT NULL
    AND da.is_active = true
    AND (
      6371 * acos(
        cos(radians(seller_lat)) * cos(radians(da.latitude)) *
        cos(radians(da.longitude) - radians(seller_lng)) +
        sin(radians(seller_lat)) * sin(radians(da.latitude))
      )
    ) <= radius_km
  ORDER BY distance_km ASC;
END;
$$;