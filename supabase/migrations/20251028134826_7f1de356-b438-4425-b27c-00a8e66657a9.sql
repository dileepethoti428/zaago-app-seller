-- Force apply NOT NULL constraints on product_suggestions location fields
-- Step 1: Delete any existing suggestions with NULL location data
DELETE FROM product_suggestions 
WHERE customer_latitude IS NULL OR customer_longitude IS NULL;

-- Step 2: Apply NOT NULL constraints
ALTER TABLE product_suggestions 
ALTER COLUMN customer_latitude SET NOT NULL;

ALTER TABLE product_suggestions 
ALTER COLUMN customer_longitude SET NOT NULL;

-- Step 3: Add a check constraint to ensure valid coordinate ranges
ALTER TABLE product_suggestions
ADD CONSTRAINT valid_latitude CHECK (customer_latitude >= -90 AND customer_latitude <= 90);

ALTER TABLE product_suggestions
ADD CONSTRAINT valid_longitude CHECK (customer_longitude >= -180 AND customer_longitude <= 180);

-- Step 4: Create an index for better query performance on location-based searches
CREATE INDEX IF NOT EXISTS idx_product_suggestions_location 
ON product_suggestions(customer_latitude, customer_longitude);