
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS aadhaar_number text,
  ADD COLUMN IF NOT EXISTS aadhaar_front_url text,
  ADD COLUMN IF NOT EXISTS aadhaar_back_url text,
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS pan_image_url text,
  ADD COLUMN IF NOT EXISTS selfie_url text,
  ADD COLUMN IF NOT EXISTS fssai_number text,
  ADD COLUMN IF NOT EXISTS fssai_license_url text,
  ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'pending';

INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-kyc', 'seller-kyc', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Sellers can upload own KYC"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'seller-kyc' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Sellers can view own KYC"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'seller-kyc' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Sellers can update own KYC"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'seller-kyc' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all seller KYC"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'seller-kyc' AND public.is_current_user_admin_v2());
