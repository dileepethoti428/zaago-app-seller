-- Function to create seller record automatically on signup
CREATE OR REPLACE FUNCTION public.handle_new_seller()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert seller record with pending approval status
  INSERT INTO public.sellers (
    user_id,
    email,
    name,
    business_name,
    phone,
    approval_status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'business_name',
      NEW.email
    ),
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'phone',
    'pending'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created_seller ON auth.users;
CREATE TRIGGER on_auth_user_created_seller
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_seller();

-- Ensure approval_status column exists with default value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sellers' 
    AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.sellers 
    ADD COLUMN approval_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Add constraint for valid statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'sellers_approval_status_check'
  ) THEN
    ALTER TABLE public.sellers
    ADD CONSTRAINT sellers_approval_status_check
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;