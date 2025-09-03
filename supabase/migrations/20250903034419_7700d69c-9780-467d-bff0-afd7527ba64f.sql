-- Fix product_variants table schema
-- Drop the old price_adjustment column approach and use price directly
ALTER TABLE product_variants 
DROP COLUMN IF EXISTS price_adjustment;

-- Make sure the price column exists and has proper constraints
ALTER TABLE product_variants 
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0;