-- Allow sellers to view vacation periods for subscriptions of their products
CREATE POLICY "Sellers can view vacation periods for their products" 
ON public.subscription_vacation_periods 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM subscriptions s
    JOIN products p ON s.product_id = p.id
    WHERE s.id = subscription_vacation_periods.subscription_id 
    AND p.seller_id = auth.uid()
  )
);