-- Add images column to products table for multiple image support
ALTER TABLE public.products ADD COLUMN images jsonb DEFAULT '[]'::jsonb;