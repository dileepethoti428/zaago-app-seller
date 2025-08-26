-- Create function to get products within range based on customer location
CREATE OR REPLACE FUNCTION get_products_within_range(
  customer_lat double precision,
  customer_lon double precision,
  range_km double precision DEFAULT 15
)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  product_description text,
  product_price numeric,
  product_image_url text,
  stock_quantity integer,
  seller_id uuid,
  seller_location jsonb,
  distance_km double precision
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.price as product_price,
    p.image_url as product_image_url,
    p.stock_quantity,
    p.seller_id,
    sp.location as seller_location,
    round(
      (6371 * acos(
        cos(radians(customer_lat)) * 
        cos(radians((sp.location->>'latitude')::double precision)) * 
        cos(radians((sp.location->>'longitude')::double precision) - radians(customer_lon)) + 
        sin(radians(customer_lat)) * 
        sin(radians((sp.location->>'latitude')::double precision))
      ))::numeric, 2
    ) as distance_km
  FROM products p
  INNER JOIN seller_profiles sp ON p.seller_id = sp.id
  WHERE 
    p.is_active = true 
    AND sp.location IS NOT NULL
    AND sp.location->>'latitude' IS NOT NULL
    AND sp.location->>'longitude' IS NOT NULL
    AND (6371 * acos(
      cos(radians(customer_lat)) * 
      cos(radians((sp.location->>'latitude')::double precision)) * 
      cos(radians((sp.location->>'longitude')::double precision) - radians(customer_lon)) + 
      sin(radians(customer_lat)) * 
      sin(radians((sp.location->>'latitude')::double precision))
    )) <= range_km
  ORDER BY distance_km ASC;
END;
$$;