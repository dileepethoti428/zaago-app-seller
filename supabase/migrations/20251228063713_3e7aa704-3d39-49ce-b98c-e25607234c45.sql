-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Sellers can view their own customers" ON public.customers;

-- Create a new policy that allows sellers to view:
-- 1. Customers they created (seller_id = auth.uid())
-- 2. Customers who have subscriptions to their products
CREATE POLICY "Sellers can view customers with subscriptions to their products" 
ON public.customers
FOR SELECT
USING (
  auth.uid() = seller_id 
  OR 
  EXISTS (
    SELECT 1 FROM subscriptions s
    JOIN products p ON s.product_id = p.id
    WHERE s.customer_id = customers.id
    AND p.seller_id = auth.uid()
  )
);