-- Create a function to get products within a specified range of customer location
CREATE OR REPLACE FUNCTION get_products_within_range(
  customer_lat NUMERIC,
  customer_lon NUMERIC, 
  range_km NUMERIC DEFAULT 15
) RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_description TEXT,
  product_price NUMERIC,
  product_image_url TEXT,
  stock_quantity INTEGER,
  seller_id UUID,
  seller_location JSONB,
  distance_km NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.stock_quantity,
    s.user_id,
    jsonb_build_object(
      'latitude', s.latitude,
      'longitude', s.longitude,
      'address', s.address,
      'city', (s.address->>'city')
    ) as seller_location,
    calculate_distance(customer_lat, customer_lon, s.latitude, s.longitude) as distance_km
  FROM products p
  JOIN sellers s ON p.seller_id = s.user_id
  WHERE s.latitude IS NOT NULL 
    AND s.longitude IS NOT NULL
    AND s.approval_status = 'approved'
    AND p.stock_quantity > 0
    AND calculate_distance(customer_lat, customer_lon, s.latitude, s.longitude) <= range_km
  ORDER BY distance_km ASC;
END;
$$;