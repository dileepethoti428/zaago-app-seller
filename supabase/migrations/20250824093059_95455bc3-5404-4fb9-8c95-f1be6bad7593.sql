-- Create sellers table with proper structure and constraints
CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_name TEXT,
  business_type TEXT DEFAULT 'individual',
  gst_number TEXT,
  pan_number TEXT,
  phone TEXT,
  bank_name TEXT,
  ifsc_code TEXT,
  account_number TEXT,
  account_holder_name TEXT,
  account_type TEXT DEFAULT 'savings',
  commission_rate NUMERIC DEFAULT 10.0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create unique index on user_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS sellers_user_id_unique ON public.sellers(user_id);

-- Enable Row Level Security
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own seller details" 
ON public.sellers 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all seller details" 
ON public.sellers 
FOR ALL 
USING (is_current_user_admin_v2())
WITH CHECK (is_current_user_admin_v2());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_sellers()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sellers_updated_at
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_sellers();