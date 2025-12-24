-- Add location_id column to sellers table for filtering delivery agents
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS location_id INTEGER DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN public.sellers.location_id IS 'References the location where this seller operates, used to filter delivery agents';