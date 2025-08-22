-- Drop existing function and recreate
DROP FUNCTION IF EXISTS public.validate_bank_details(text,text,text,text);

-- Check if sellers table exists and add bank details columns
DO $$
BEGIN
  -- Check if sellers table exists, if not create it
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sellers') THEN
    CREATE TABLE public.sellers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
      business_name TEXT,
      phone TEXT,
      bank_name TEXT,
      ifsc_code TEXT,
      account_number TEXT,
      account_holder_name TEXT,
      bank_branch TEXT,
      account_type TEXT DEFAULT 'savings',
      is_bank_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Sellers can view their own details" 
    ON public.sellers 
    FOR SELECT 
    USING (auth.uid() = user_id);

    CREATE POLICY "Sellers can update their own details" 
    ON public.sellers 
    FOR UPDATE 
    USING (auth.uid() = user_id);

    CREATE POLICY "Sellers can insert their own details" 
    ON public.sellers 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Admins can manage all seller details" 
    ON public.sellers 
    FOR ALL 
    USING (is_current_user_admin_v2());

    -- Create index for performance
    CREATE INDEX idx_sellers_user_id ON public.sellers(user_id);

    -- Add trigger for updated_at
    CREATE TRIGGER update_sellers_updated_at
    BEFORE UPDATE ON public.sellers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  ELSE
    -- If table exists, add bank columns if they don't exist
    ALTER TABLE public.sellers 
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD COLUMN IF NOT EXISTS ifsc_code TEXT,
    ADD COLUMN IF NOT EXISTS account_number TEXT,
    ADD COLUMN IF NOT EXISTS account_holder_name TEXT,
    ADD COLUMN IF NOT EXISTS bank_branch TEXT,
    ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'savings',
    ADD COLUMN IF NOT EXISTS is_bank_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create function to validate bank details with new name
CREATE OR REPLACE FUNCTION public.validate_bank_details_v2(
  bank_name TEXT,
  ifsc_code TEXT,
  account_number TEXT,
  account_holder_name TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Basic validation
  IF bank_name IS NULL OR LENGTH(bank_name) < 2 THEN
    RETURN FALSE;
  END IF;
  
  IF ifsc_code IS NULL OR LENGTH(ifsc_code) != 11 THEN
    RETURN FALSE;
  END IF;
  
  IF account_number IS NULL OR LENGTH(account_number) < 8 THEN
    RETURN FALSE;
  END IF;
  
  IF account_holder_name IS NULL OR LENGTH(account_holder_name) < 2 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;