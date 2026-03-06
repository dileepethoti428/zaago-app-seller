CREATE POLICY "Sellers can update their orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());