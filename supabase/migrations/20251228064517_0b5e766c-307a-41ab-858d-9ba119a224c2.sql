-- Create a security definer function to check if a customer has subscriptions to seller's products
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.customer_has_subscription_to_seller_products(
  _customer_id UUID,
  _seller_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM subscriptions s
    JOIN products p ON s.product_id = p.id
    WHERE s.customer_id = _customer_id
    AND p.seller_id = _seller_user_id
  )
$$;

-- Drop the problematic RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "Sellers can view customers with subscriptions to their products" ON public.customers;

-- Create a new RLS policy using the security definer function
CREATE POLICY "Sellers can view customers with subscriptions to their products" 
ON public.customers
FOR SELECT
USING (
  auth.uid() = seller_id 
  OR 
  public.customer_has_subscription_to_seller_products(id, auth.uid())
);