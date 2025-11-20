-- Add gst_percentage column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS gst_percentage numeric DEFAULT 0 
CHECK (gst_percentage >= 0 AND gst_percentage <= 100);

-- Add comment for documentation
COMMENT ON COLUMN products.gst_percentage IS 'GST percentage for display purposes (0-100)';

-- Create index for potential filtering
CREATE INDEX IF NOT EXISTS idx_products_gst_percentage ON products(gst_percentage);