-- Create sellers table for seller-specific information
CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  contact_person TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  bank_details JSONB,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Create policies for sellers
CREATE POLICY "Sellers can view their own profile" 
ON public.sellers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Sellers can update their own profile" 
ON public.sellers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Sellers can insert their own profile" 
ON public.sellers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all sellers" 
ON public.sellers 
FOR ALL 
USING (is_current_user_admin_v2());

-- Create function to handle new seller signup
CREATE OR REPLACE FUNCTION public.handle_seller_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Create seller profile if it doesn't exist
  INSERT INTO public.sellers (user_id, email, contact_person)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    contact_person = COALESCE(EXCLUDED.contact_person, sellers.contact_person);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for seller signup
DROP TRIGGER IF EXISTS on_seller_signup ON auth.users;
CREATE TRIGGER on_seller_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_seller_signup();

-- Update existing products table to ensure proper seller relationship
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS seller_user_id UUID REFERENCES auth.users(id);

-- Update products policies to work with seller_user_id
DROP POLICY IF EXISTS "Sellers can create their own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can update their own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can delete their own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can view their own products" ON public.products;

CREATE POLICY "Sellers can create their own products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.uid() = seller_user_id);

CREATE POLICY "Sellers can update their own products" 
ON public.products 
FOR UPDATE 
USING (auth.uid() = seller_user_id);

CREATE POLICY "Sellers can delete their own products" 
ON public.products 
FOR DELETE 
USING (auth.uid() = seller_user_id);

CREATE POLICY "Sellers can view their own products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = seller_user_id);

-- Create updated_at trigger for sellers
CREATE TRIGGER update_sellers_updated_at
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();