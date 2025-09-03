-- Update the get_products_within_range function to properly calculate total stock including variants
CREATE OR REPLACE FUNCTION get_products_within_range(
  customer_lat double precision,
  customer_lon double precision,
  range_km double precision DEFAULT 15
)
RETURNS TABLE(
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.price as product_price,
    p.image_url as product_image_url,
    -- Calculate total stock: base product stock + sum of all variant stocks
    GREATEST(0, COALESCE(p.stock_quantity, 0) + COALESCE(
      (SELECT SUM(pv.stock_quantity) 
       FROM product_variants pv 
       WHERE pv.product_id = p.id AND pv.is_active = true), 0
    )) as stock_quantity,
    p.seller_id,
    jsonb_build_object(
      'latitude', sl.latitude,
      'longitude', sl.longitude,
      'address', sl.address,
      'city', sl.city,
      'state', sl.state,
      'country', sl.country,
      'postal_code', sl.postal_code
    ) as seller_location,
    -- Calculate distance using haversine formula
    (
      6371 * acos(
        cos(radians(customer_lat)) * 
        cos(radians(sl.latitude)) * 
        cos(radians(sl.longitude) - radians(customer_lon)) + 
        sin(radians(customer_lat)) * 
        sin(radians(sl.latitude))
      )
    ) as distance_km
  FROM 
    products p
  JOIN 
    seller_locations sl ON p.seller_id = sl.seller_id
  WHERE 
    p.is_active = true
    AND sl.is_primary = true
    AND (
      6371 * acos(
        cos(radians(customer_lat)) * 
        cos(radians(sl.latitude)) * 
        cos(radians(sl.longitude) - radians(customer_lon)) + 
        sin(radians(customer_lat)) * 
        sin(radians(sl.latitude))
      )
    ) <= range_km
  ORDER BY 
    distance_km ASC;
END;
$$;