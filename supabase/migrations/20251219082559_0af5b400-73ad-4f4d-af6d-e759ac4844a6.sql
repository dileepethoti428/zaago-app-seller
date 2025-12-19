-- Add packed_at column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS packed_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.packed_at IS 'Timestamp when the order was marked as packed';