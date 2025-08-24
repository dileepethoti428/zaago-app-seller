-- Add approval status and admin approval fields to sellers table
ALTER TABLE public.sellers 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing sellers to approved status (for existing data)
UPDATE public.sellers SET approval_status = 'approved', approved_at = now() WHERE approval_status = 'pending';