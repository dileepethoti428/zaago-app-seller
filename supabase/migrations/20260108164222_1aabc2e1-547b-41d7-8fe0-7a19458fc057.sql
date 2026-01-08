-- Create exports storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read from exports bucket (files are public URLs)
CREATE POLICY "Public read access for exports"
ON storage.objects FOR SELECT
USING (bucket_id = 'exports');

-- Allow authenticated users to insert exports
CREATE POLICY "Authenticated users can upload exports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'exports' AND auth.role() = 'authenticated');

-- Allow service role to manage exports (for edge function)
CREATE POLICY "Service role can manage exports"
ON storage.objects FOR ALL
USING (bucket_id = 'exports')
WITH CHECK (bucket_id = 'exports');