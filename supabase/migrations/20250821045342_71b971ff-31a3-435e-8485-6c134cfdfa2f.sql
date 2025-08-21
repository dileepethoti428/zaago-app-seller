-- Drop existing policies if they exist
DROP POLICY IF EXISTS "sellers_admin_all" ON public.sellers;
DROP POLICY IF EXISTS "sellers_manage_own" ON public.sellers;
DROP POLICY IF EXISTS "sellers_insert_own" ON public.sellers;
DROP POLICY IF EXISTS "sellers_select_own" ON public.sellers;
DROP POLICY IF EXISTS "sellers_update_own" ON public.sellers;
DROP POLICY IF EXISTS "sellers_delete_own" ON public.sellers;

-- Admins can do anything
CREATE POLICY "sellers_admin_all" ON public.sellers
FOR ALL
TO authenticated
USING (is_current_user_admin_v2())
WITH CHECK (is_current_user_admin_v2());

-- Users can select their own seller record
CREATE POLICY "sellers_select_own" ON public.sellers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own seller record
CREATE POLICY "sellers_update_own" ON public.sellers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own seller record
CREATE POLICY "sellers_delete_own" ON public.sellers
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can insert their own row
CREATE POLICY "sellers_insert_own" ON public.sellers
FOR INSERT
TO authenticated
WITH CHECK (coalesce(user_id, auth.uid()) = auth.uid());