-- Create the corrected seller orders functions that properly check if items belong to the seller
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
   payment_status text,
   payment_method text
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
    o.payment_status,
    COALESCE(o.payment_method, 'COD') as payment_method
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

-- Create the get_seller_orders function that also works with status filters
CREATE OR REPLACE FUNCTION public.get_seller_orders(seller_user_id uuid, status_filter text[] DEFAULT NULL::text[])
 RETURNS TABLE(
   id uuid, 
   customer_name text, 
   customer_phone text, 
   address jsonb, 
   items jsonb, 
   total numeric, 
   status text, 
   payment_status text, 
   created_at timestamp with time zone, 
   delivery_time_slot text,
   seller_total numeric
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    o.id,
    o.customer_name,
    o.customer_phone,
    o.address,
    o.items,
    o.total,
    o.status,
    o.payment_status,
    o.created_at,
    o.delivery_time_slot,
    -- Calculate seller's portion of the total
    (
      SELECT COALESCE(SUM((item->>'quantity')::integer * (item->>'price')::numeric), 0)
      FROM jsonb_array_elements(o.items) AS item
      WHERE (item->>'seller_id')::uuid = seller_user_id
    ) as seller_total
  FROM orders o
  WHERE o.status != 'payment_pending'  -- Exclude payment pending orders
    AND (status_filter IS NULL OR o.status = ANY(status_filter))
    AND EXISTS (
      -- Check if any item in the order belongs to this seller
      SELECT 1 
      FROM jsonb_array_elements(o.items) AS item
      WHERE (item->>'seller_id')::uuid = seller_user_id
    )
  ORDER BY o.created_at DESC;
END;
$function$;