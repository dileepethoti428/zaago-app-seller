-- Add base_price column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS base_price numeric;

-- Update existing products: set base_price equal to current price
-- This is the safest migration - keeps customer-facing prices unchanged
UPDATE products 
SET base_price = price 
WHERE base_price IS NULL;

-- Make base_price NOT NULL after backfilling
ALTER TABLE products 
ALTER COLUMN base_price SET NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN products.base_price IS 'Product price excluding GST (entered by seller)';
COMMENT ON COLUMN products.price IS 'Final product price including GST (calculated from base_price + GST percentage)';