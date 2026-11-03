-- Owner-curated public Library publications; no private media is exposed.
BEGIN;
ALTER TABLE app_private.practitioner_materials
  ADD COLUMN IF NOT EXISTS public_locale text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='hh_material_public_youtube_only') THEN
    ALTER TABLE app_private.practitioner_materials
      ADD CONSTRAINT hh_material_public_youtube_only
      CHECK (published_at IS NULL OR
        (kind='youtube' AND status='ready' AND public_locale IN ('en','ru','es')));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS hh_material_public_feed_idx
  ON app_private.practitioner_materials(public_locale,published_at DESC)
  WHERE published_at IS NOT NULL AND kind='youtube' AND status='ready';
-- Existing RLS, backend-only grants, and private media storage remain unchanged.
COMMIT;
