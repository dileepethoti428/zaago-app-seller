-- Add RLS policy to ensure only approved sellers can access their data
CREATE OR REPLACE FUNCTION public.is_approved_seller(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is an approved seller
  RETURN EXISTS (
    SELECT 1 FROM sellers 
    WHERE user_id = user_uuid 
    AND approval_status = 'approved'
  );
END;
$$;

-- Update products RLS policy to only allow approved sellers
DROP POLICY IF EXISTS "Sellers can manage their own products" ON products;
CREATE POLICY "Approved sellers can manage their own products" ON products
  FOR ALL USING (
    seller_id = auth.uid() AND is_approved_seller()
  )
  WITH CHECK (
    seller_id = auth.uid() AND is_approved_seller()
  );

-- Update orders RLS policy for sellers
DROP POLICY IF EXISTS "Sellers can view orders containing their products" ON orders;
CREATE POLICY "Approved sellers can view orders containing their products" ON orders
  FOR SELECT USING (
    is_approved_seller() AND
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(items) AS item
      JOIN products p ON (item->>'id')::uuid = p.id
      WHERE p.seller_id = auth.uid()
    )
  );