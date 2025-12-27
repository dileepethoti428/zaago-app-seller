-- Allow sellers to insert their own categories
CREATE POLICY "Sellers can insert their own categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid());

-- Allow sellers to view their own categories
CREATE POLICY "Sellers can view their own categories"
ON public.categories
FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

-- Allow sellers to update their own categories
CREATE POLICY "Sellers can update their own categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- Allow sellers to delete their own categories
CREATE POLICY "Sellers can delete their own categories"
ON public.categories
FOR DELETE
TO authenticated
USING (seller_id = auth.uid());