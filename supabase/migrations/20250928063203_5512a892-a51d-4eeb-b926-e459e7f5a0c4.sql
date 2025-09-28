-- Fix the function to remove the non-existent payment_method column
DROP FUNCTION IF EXISTS public.get_seller_specific_orders(uuid);

CREATE OR REPLACE FUNCTION public.get_seller_specific_orders(p_seller_user_id uuid)
 RETURNS TABLE(
   order_id uuid, 
   customer_name text, 
   customer_phone text, 
   address jsonb, 
   delivery_date text, 
   agent_id uuid, 
   created_at timestamp with time zone,
   status text,
   total numeric,
   items jsonb,
   seller_total numeric,
   payment_status text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    o.id as order_id,
    o.customer_name,
    o.customer_phone,
    o.address,
    o.delivery_date,
    o.agent_id,
    o.created_at,
    o.status,
    o.total,
    o.items,
    -- Calculate seller's portion of the total
    (
      SELECT COALESCE(SUM((item->>'quantity')::integer * (item->>'price')::numeric), 0)
      FROM jsonb_array_elements(o.items) AS item
      WHERE (item->>'seller_id')::uuid = p_seller_user_id
    ) as seller_total,
    o.payment_status
  FROM orders o
  WHERE o.status != 'payment_pending'  -- Exclude payment pending orders
    AND EXISTS (
      -- Check if any item in the order belongs to this seller
      SELECT 1 
      FROM jsonb_array_elements(o.items) AS item
      WHERE (item->>'seller_id')::uuid = p_seller_user_id
    )
  ORDER BY o.created_at DESC;
END;
$function$;