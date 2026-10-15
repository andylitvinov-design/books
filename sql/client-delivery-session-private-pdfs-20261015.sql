-- 2026-10-15 · Holistic House · allow PRIVATE additional PDF materials per session.
-- Additive and opt-in. Maintains original RLS and session/client ownership keys.
BEGIN;

ALTER TABLE app_private.client_delivery_assets
  DROP CONSTRAINT IF EXISTS client_delivery_assets_asset_kind_check;
ALTER TABLE app_private.client_delivery_assets
  ADD CONSTRAINT client_delivery_assets_asset_kind_check
  CHECK (asset_kind IN ('audio', 'video', 'pdf'));

-- The bucket remains private and capped for the existing Supabase Free tier.
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'application/pdf')
WHERE id = 'hh-client-private-media'
  AND public = false
  AND file_size_limit <= 50000000
  AND allowed_mime_types IS NOT NULL
  AND NOT ('application/pdf' = ANY(allowed_mime_types));

COMMIT;
