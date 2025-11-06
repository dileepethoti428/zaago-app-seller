-- Make user_id nullable to support seller-created subscriptions for customers without app accounts
ALTER TABLE public.subscriptions ALTER COLUMN user_id DROP NOT NULL;

-- Add created_by column to track who created the subscription
ALTER TABLE public.subscriptions ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Add source column to track subscription origin
ALTER TABLE public.subscriptions ADD COLUMN source TEXT DEFAULT 'customer_app';

-- Create index for better query performance
CREATE INDEX idx_subscriptions_created_by ON public.subscriptions(created_by);
CREATE INDEX idx_subscriptions_source ON public.subscriptions(source);

-- Update RLS policies to allow both seller and customer-created subscriptions
DROP POLICY IF EXISTS "Sellers can view subscriptions for their products" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;

-- Sellers can view subscriptions for their products
CREATE POLICY "Sellers can view subscriptions for their products" ON public.subscriptions
FOR SELECT USING (
  product_id IN (
    SELECT id FROM public.products WHERE seller_id = auth.uid()
  )
);

-- Customers can view their own subscriptions (both user_id and customer_id based)
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
FOR SELECT USING (
  user_id = auth.uid() OR 
  customer_id IN (
    SELECT id FROM public.customers WHERE seller_id = auth.uid()
  )
);

-- Allow subscription creation by sellers and customers
CREATE POLICY "Users can create subscriptions" ON public.subscriptions
FOR INSERT WITH CHECK (
  -- Sellers creating for their customers
  (created_by = auth.uid() AND source = 'seller_manual') OR
  -- Customers creating for themselves
  (user_id = auth.uid() AND source = 'customer_app')
);

-- Allow updating own subscriptions
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
FOR UPDATE USING (
  created_by = auth.uid() OR user_id = auth.uid()
);