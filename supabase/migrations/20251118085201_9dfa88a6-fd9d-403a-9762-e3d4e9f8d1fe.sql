-- Add product location columns for GPS-based filtering
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS product_lng DOUBLE PRECISION;

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_products_location 
ON products (product_lat, product_lng) 
WHERE product_lat IS NOT NULL AND product_lng IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN products.product_lat IS 'Product GPS latitude for distance-based filtering';
COMMENT ON COLUMN products.product_lng IS 'Product GPS longitude for distance-based filtering';