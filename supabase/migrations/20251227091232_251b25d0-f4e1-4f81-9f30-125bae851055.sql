-- Add soft deletion columns to sellers table
ALTER TABLE public.sellers 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS deletion_requested_by UUID REFERENCES auth.users(id);

-- Create index for faster queries on non-deleted sellers
CREATE INDEX IF NOT EXISTS idx_sellers_is_deleted ON public.sellers(is_deleted) WHERE is_deleted = false;

-- Update RLS policy to allow sellers to soft delete their own account
CREATE POLICY "Sellers can soft delete their own account"
ON public.sellers
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);