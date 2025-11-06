-- Create customers table for seller's customer base
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure seller cannot have duplicate customers with same phone
  UNIQUE(seller_id, phone)
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Sellers can view their own customers" 
ON public.customers 
FOR SELECT 
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own customers" 
ON public.customers 
FOR UPDATE 
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own customers" 
ON public.customers 
FOR DELETE 
USING (auth.uid() = seller_id);

-- Admins can manage all customers
CREATE POLICY "Admins can manage all customers"
ON public.customers
FOR ALL
USING (is_current_user_admin_v2());

-- Add trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster lookups
CREATE INDEX idx_customers_seller_id ON public.customers(seller_id);
CREATE INDEX idx_customers_phone ON public.customers(phone);

-- Add customer_id column to subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE;

-- Create index for customer_id lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON public.subscriptions(customer_id);