-- Create sellers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  business_name TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sellers table
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Create policies for sellers table
CREATE POLICY "Sellers can view their own profile" 
ON public.sellers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Sellers can create their own profile" 
ON public.sellers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can update their own profile" 
ON public.sellers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all sellers" 
ON public.sellers 
FOR ALL 
USING (is_current_user_admin_v2());

-- Create trigger for updated_at
CREATE TRIGGER update_sellers_updated_at
BEFORE UPDATE ON public.sellers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get seller orders (orders containing seller's products)
CREATE OR REPLACE FUNCTION public.get_seller_orders(seller_user_id UUID, status_filter TEXT[] DEFAULT NULL)
RETURNS TABLE(
  order_id UUID,
  user_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  address JSONB,
  items JSONB,
  total NUMERIC,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  delivery_date DATE,
  agent_id UUID,
  delivered BOOLEAN,
  payment_status TEXT,
  special_instructions TEXT,
  seller_total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    o.id as order_id,
    o.user_id,
    o.customer_name,
    o.customer_phone,
    o.address,
    o.items,
    o.total,
    o.status,
    o.created_at,
    o.updated_at,
    o.delivery_date,
    o.agent_id,
    o.delivered,
    o.payment_status,
    o.special_instructions,
    -- Calculate seller's portion of the order total
    (
      SELECT COALESCE(SUM((item->>'quantity')::INTEGER * (item->>'price')::NUMERIC), 0)
      FROM jsonb_array_elements(o.items) AS item
      WHERE (item->>'id')::UUID IN (
        SELECT p.id FROM products p WHERE p.seller_id = seller_user_id
      )
    ) as seller_total
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE p.seller_id = seller_user_id
  )
  AND (status_filter IS NULL OR o.status = ANY(status_filter))
  ORDER BY o.created_at DESC;
END;
$$;