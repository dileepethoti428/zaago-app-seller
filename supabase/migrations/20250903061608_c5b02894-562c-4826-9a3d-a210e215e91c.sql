-- Drop and recreate get_products_within_range function with discounted price calculation
DROP FUNCTION IF EXISTS get_products_within_range(numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION get_products_within_range(
  customer_lat numeric,
  customer_lon numeric,
  range_km numeric DEFAULT 15
)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  product_description text,
  product_price numeric,
  discounted_price numeric,
  discount_percentage numeric,
  original_price numeric,
  product_image_url text,
  stock_quantity integer,
  seller_id uuid,
  seller_location jsonb,
  distance_km numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    CASE 
      WHEN p.discount_percentage IS NOT NULL AND p.discount_percentage > 0 
      THEN ROUND(p.price * (1 - p.discount_percentage / 100), 2)
      ELSE p.price
    END as product_price,
    CASE 
      WHEN p.discount_percentage IS NOT NULL AND p.discount_percentage > 0 
      THEN ROUND(p.price * (1 - p.discount_percentage / 100), 2)
      ELSE p.price
    END as discounted_price,
    COALESCE(p.discount_percentage, 0) as discount_percentage,
    p.price as original_price,
    p.image_url as product_image_url,
    -- Calculate total stock including variants
    GREATEST(
      p.stock_quantity,
      COALESCE((
        SELECT SUM(pv.stock_quantity) 
        FROM product_variants pv 
        WHERE pv.product_id = p.id 
        AND pv.is_active = true
      ), 0)
    ) as stock_quantity,
    s.id as seller_id,
    jsonb_build_object(
      'latitude', s.latitude,
      'longitude', s.longitude,
      'address', s.address,
      'city', COALESCE(s.address->>'city', ''),
      'full_address', COALESCE(s.address->>'formatted_address', s.address->>'address', '')
    ) as seller_location,
    ROUND(
      (6371 * acos(
        cos(radians(customer_lat)) * 
        cos(radians(s.latitude)) * 
        cos(radians(s.longitude) - radians(customer_lon)) + 
        sin(radians(customer_lat)) * 
        sin(radians(s.latitude))
      ))::numeric, 2
    ) as distance_km
  FROM products p
  INNER JOIN sellers s ON p.seller_id = s.id
  WHERE p.is_active = true
    AND s.location_verified = true
    AND s.latitude IS NOT NULL
    AND s.longitude IS NOT NULL
    AND (6371 * acos(
      cos(radians(customer_lat)) * 
      cos(radians(s.latitude)) * 
      cos(radians(s.longitude) - radians(customer_lon)) + 
      sin(radians(customer_lat)) * 
      sin(radians(s.latitude))
    )) <= range_km
  ORDER BY distance_km ASC;
END;
$$;