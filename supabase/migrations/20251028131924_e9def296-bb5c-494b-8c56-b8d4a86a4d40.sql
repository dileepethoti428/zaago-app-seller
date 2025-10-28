-- Add location data to product_suggestions table
ALTER TABLE product_suggestions 
ADD COLUMN customer_latitude double precision,
ADD COLUMN customer_longitude double precision,
ADD COLUMN customer_location jsonb DEFAULT '{}'::jsonb;

-- Create function to get suggestions within range
CREATE OR REPLACE FUNCTION get_suggestions_within_range(
  seller_lat double precision,
  seller_lon double precision,
  range_km double precision DEFAULT 15
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  product_name text,
  description text,
  category text,
  estimated_price_range text,
  additional_notes text,
  image_url text,
  suggested_images text[],
  status text,
  admin_notes text,
  created_at timestamptz,
  updated_at timestamptz,
  customer_latitude double precision,
  customer_longitude double precision,
  customer_location jsonb,
  distance_km double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.user_id,
    ps.product_name,
    ps.description,
    ps.category,
    ps.estimated_price_range,
    ps.additional_notes,
    ps.image_url,
    ps.suggested_images,
    ps.status,
    ps.admin_notes,
    ps.created_at,
    ps.updated_at,
    ps.customer_latitude,
    ps.customer_longitude,
    ps.customer_location,
    (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(seller_lat)) * 
          cos(radians(ps.customer_latitude)) * 
          cos(radians(ps.customer_longitude) - radians(seller_lon)) + 
          sin(radians(seller_lat)) * 
          sin(radians(ps.customer_latitude))
        ))
      )
    )::double precision as distance_km
  FROM product_suggestions ps
  WHERE ps.customer_latitude IS NOT NULL 
    AND ps.customer_longitude IS NOT NULL
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(seller_lat)) * 
          cos(radians(ps.customer_latitude)) * 
          cos(radians(ps.customer_longitude) - radians(seller_lon)) + 
          sin(radians(seller_lat)) * 
          sin(radians(ps.customer_latitude))
        ))
      )
    ) <= range_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;