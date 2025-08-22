-- Create products table if not exists
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  category_id UUID REFERENCES public.categories(id),
  sku TEXT,
  weight NUMERIC,
  dimensions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for products
-- Sellers can view their own products
CREATE POLICY "Sellers can view own products" 
ON public.products 
FOR SELECT 
USING (seller_id IN (
  SELECT user_id FROM public.profiles WHERE user_id = auth.uid()
));

-- Sellers can insert their own products
CREATE POLICY "Sellers can create own products" 
ON public.products 
FOR INSERT 
WITH CHECK (seller_id IN (
  SELECT user_id FROM public.profiles WHERE user_id = auth.uid()
));

-- Sellers can update their own products
CREATE POLICY "Sellers can update own products" 
ON public.products 
FOR UPDATE 
USING (seller_id IN (
  SELECT user_id FROM public.profiles WHERE user_id = auth.uid()
));

-- Sellers can delete their own products
CREATE POLICY "Sellers can delete own products" 
ON public.products 
FOR DELETE 
USING (seller_id IN (
  SELECT user_id FROM public.profiles WHERE user_id = auth.uid()
));

-- Admins can manage all products
CREATE POLICY "Admins can manage all products" 
ON public.products 
FOR ALL 
USING (is_current_user_admin_v2());

-- Anyone can view active products (for customers)
CREATE POLICY "Anyone can view active products" 
ON public.products 
FOR SELECT 
USING (is_active = true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_products_updated_at();

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for product image uploads
CREATE POLICY "Sellers can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'product-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers can update their product images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'product-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers can delete their product images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'product-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Anyone can view product images
CREATE POLICY "Anyone can view product images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');