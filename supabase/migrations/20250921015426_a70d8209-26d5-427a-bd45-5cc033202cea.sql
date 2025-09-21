-- Drop existing function and recreate with correct signature
DROP FUNCTION IF EXISTS public.get_seller_orders(UUID);

-- Create function to get orders containing seller's products
CREATE OR REPLACE FUNCTION public.get_seller_orders(p_seller_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  address JSONB,
  items JSONB,
  total NUMERIC,
  status TEXT,
  payment_status TEXT,
  agent_id UUID,
  delivery_time_slot TEXT,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.user_id,
    o.customer_name,
    o.customer_phone,
    o.address,
    o.items,
    o.total,
    o.status,
    o.payment_status,
    o.agent_id,
    o.delivery_time_slot,
    o.special_instructions,
    o.created_at,
    o.updated_at,
    o.delivered_at
  FROM orders o
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(o.items) AS item
    WHERE (item->>'seller_id')::UUID = p_seller_id
  )
  ORDER BY o.created_at DESC;
END;
$$;