-- Add seller_id column to categories table for private categories
ALTER TABLE public.categories 
ADD COLUMN seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX idx_categories_seller_id ON public.categories(seller_id);

-- Add comment for documentation
COMMENT ON COLUMN public.categories.seller_id IS 'If set, category is private to this seller. If NULL, category is global.';