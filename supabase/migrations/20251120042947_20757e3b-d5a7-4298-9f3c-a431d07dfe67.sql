-- Add tags column to products table for product categorization and display
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];

-- Add GIN index for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN (tags);

-- Add comment for documentation
COMMENT ON COLUMN products.tags IS 'Product tags for categorization and display (auto-generated or manually selected by seller)';