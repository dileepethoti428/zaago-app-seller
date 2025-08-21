-- Fix existing sellers policies that already exist
DROP POLICY IF EXISTS "Sellers can view their own profile" ON public.sellers;
DROP POLICY IF EXISTS "Sellers can insert their own profile" ON public.sellers;

-- Create corrected policies with unique names
CREATE POLICY "Sellers can view own profile" 
ON public.sellers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Sellers can insert own profile" 
ON public.sellers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update existing products to use seller_user_id properly
UPDATE public.products 
SET seller_user_id = seller_id 
WHERE seller_user_id IS NULL AND seller_id IS NOT NULL;