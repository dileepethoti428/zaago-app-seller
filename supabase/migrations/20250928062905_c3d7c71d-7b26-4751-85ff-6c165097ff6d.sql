-- Step by step fix: First drop the problematic functions
DROP FUNCTION IF EXISTS public.get_seller_specific_orders(text);
DROP FUNCTION IF EXISTS public.get_seller_orders(text, text[]);
DROP FUNCTION IF EXISTS public.get_seller_orders(uuid, text[]);