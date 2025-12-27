-- Add terms acceptance tracking columns to sellers table
ALTER TABLE public.sellers 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;