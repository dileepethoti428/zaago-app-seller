-- Add NOT NULL constraints to product_suggestions location fields
-- This prevents any future submissions without location data

-- First, delete any existing suggestions with NULL location data
DELETE FROM product_suggestions 
WHERE customer_latitude IS NULL OR customer_longitude IS NULL;

-- Now add the NOT NULL constraints
ALTER TABLE product_suggestions 
ALTER COLUMN customer_latitude SET NOT NULL,
ALTER COLUMN customer_longitude SET NOT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN product_suggestions.customer_latitude IS 'Customer latitude - required for location-based suggestions';
COMMENT ON COLUMN product_suggestions.customer_longitude IS 'Customer longitude - required for location-based suggestions';