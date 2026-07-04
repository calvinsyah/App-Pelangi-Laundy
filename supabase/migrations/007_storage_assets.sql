-- 007_storage_assets.sql
-- Create assets bucket if it doesn't exist

INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'assets' );

-- Policy to allow authenticated users to upload
CREATE POLICY "Auth Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'assets' 
    AND auth.role() = 'authenticated'
);

-- Policy to allow authenticated users to update
CREATE POLICY "Auth Update Access"
ON storage.objects FOR UPDATE
WITH CHECK (
    bucket_id = 'assets' 
    AND auth.role() = 'authenticated'
);

-- Policy to allow authenticated users to delete
CREATE POLICY "Auth Delete Access"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'assets' 
    AND auth.role() = 'authenticated'
);
