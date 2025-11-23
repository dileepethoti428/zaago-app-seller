-- Create subcategories table
CREATE TABLE IF NOT EXISTS public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_is_active ON public.subcategories(is_active);

-- Add comment
COMMENT ON TABLE public.subcategories IS 'Product subcategories linked to main categories';

-- Add subcategory_id to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products(subcategory_id);

-- Add comment
COMMENT ON COLUMN public.products.subcategory_id IS 'Optional subcategory for more specific product classification';

-- Enable RLS
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subcategories
CREATE POLICY "Anyone can view active subcategories"
  ON public.subcategories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage all subcategories"
  ON public.subcategories FOR ALL
  USING (is_current_user_admin_v2());

CREATE POLICY "Sellers can insert subcategories"
  ON public.subcategories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sellers can update subcategories"
  ON public.subcategories FOR UPDATE
  USING (true);