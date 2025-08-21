-- Ensure sellers table exists with proper columns and constraints
CREATE TABLE IF NOT EXISTS public.sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  address text,
  business_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Defaults/maintenance trigger to set user_id/email and updated_at
CREATE OR REPLACE FUNCTION public.set_seller_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  IF NEW.email IS NULL THEN
    NEW.email := auth.email();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_seller_defaults ON public.sellers;
CREATE TRIGGER trg_set_seller_defaults
BEFORE INSERT OR UPDATE ON public.sellers
FOR EACH ROW EXECUTE FUNCTION public.set_seller_defaults();

-- Policies: admin full, owners manage own, controlled insert
DROP POLICY IF EXISTS "sellers_admin_all" ON public.sellers;
DROP POLICY IF EXISTS "sellers_manage_own" ON public.sellers;
DROP POLICY IF EXISTS "sellers_insert_own" ON public.sellers;

-- Admins can do anything
CREATE POLICY "sellers_admin_all" ON public.sellers
AS PERMISSIVE FOR ALL
TO authenticated
USING (is_current_user_admin_v2())
WITH CHECK (is_current_user_admin_v2());

-- Owners can select/update/delete their own row
CREATE POLICY "sellers_manage_own" ON public.sellers
AS PERMISSIVE FOR SELECT, UPDATE, DELETE
TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can insert their own row
CREATE POLICY "sellers_insert_own" ON public.sellers
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (coalesce(user_id, auth.uid()) = auth.uid());
