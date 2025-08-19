-- Enable realtime for products table so changes sync across apps
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;