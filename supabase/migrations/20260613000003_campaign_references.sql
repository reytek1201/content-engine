-- Campaign reference image URLs (product, style, logo)

ALTER TABLE public.campaigns
  ADD COLUMN product_reference_url TEXT,
  ADD COLUMN style_reference_url TEXT,
  ADD COLUMN logo_reference_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-refs',
  'campaign-refs',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY campaign_refs_insert_own ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'campaign-refs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY campaign_refs_select_public ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'campaign-refs');

CREATE POLICY campaign_refs_update_own ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'campaign-refs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY campaign_refs_delete_own ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'campaign-refs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
