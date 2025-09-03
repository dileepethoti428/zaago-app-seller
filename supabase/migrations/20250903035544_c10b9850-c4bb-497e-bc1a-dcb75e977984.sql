-- Add discount functionality to product variants
ALTER TABLE product_variants 
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- Add computed discount price field for reference
ALTER TABLE product_variants 
ADD COLUMN IF NOT EXISTS discounted_price NUMERIC(10,2) GENERATED ALWAYS AS (
  CASE 
    WHEN discount_percentage > 0 THEN price * (1 - discount_percentage / 100)
    ELSE price
  END
) STORED;