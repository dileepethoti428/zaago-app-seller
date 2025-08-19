-- Add seller_id to products table to track which seller owns each product
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id);

-- Update existing products to have seller_id (set to first user for now)
UPDATE public.products 
SET seller_id = (SELECT id FROM auth.users LIMIT 1)
WHERE seller_id IS NULL;

-- Drop existing policies and create new ones for seller-specific access
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can create products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update their products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;

-- New policies for seller-specific access
CREATE POLICY "Sellers can view their own products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can view active products from any seller" 
ON public.products 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Sellers can create their own products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own products" 
ON public.products 
FOR UPDATE 
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own products" 
ON public.products 
FOR DELETE 
USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage all products" 
ON public.products 
FOR ALL 
USING (is_current_user_admin_v2());