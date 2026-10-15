-- Private consultation images: expand an existing protected media pipeline.
-- Do not create a public bucket or grant anon/authenticated access.
BEGIN;
ALTER TABLE app_private.client_delivery_assets
  DROP CONSTRAINT IF EXISTS client_delivery_assets_asset_kind_check;
ALTER TABLE app_private.client_delivery_assets
  ADD CONSTRAINT client_delivery_assets_asset_kind_check
  CHECK (asset_kind IN ('audio','video','pdf','image'));

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'audio/webm','audio/mp4','audio/x-m4a','audio/mpeg',
  'video/mp4','application/pdf',
  'image/jpeg','image/png','image/webp'
]::text[]
WHERE id='hh-client-private-media' AND public=FALSE;
COMMIT;
