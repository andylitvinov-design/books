-- Reusable owner-curated educational materials. Never grants clients direct table or bucket access.
BEGIN;
CREATE TABLE IF NOT EXISTS app_private.practitioner_materials (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('youtube','image','video')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 140),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  url text,
  mime text,
  object_key text UNIQUE,
  storage_provider text NOT NULL DEFAULT 'supabase'
    CHECK (storage_provider IN ('supabase','r2','s3_ca')),
  expected_bytes bigint,
  bytes bigint,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready')),
  created_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz,
  CONSTRAINT practitioner_materials_payload CHECK (
    (kind='youtube' AND url IS NOT NULL AND mime IS NULL AND object_key IS NULL
       AND expected_bytes IS NULL AND bytes IS NULL AND status='ready')
    OR (kind IN ('image','video') AND url IS NULL AND mime IS NOT NULL
       AND object_key IS NOT NULL AND expected_bytes BETWEEN 128 AND 200000000)
  )
);
CREATE INDEX IF NOT EXISTS practitioner_materials_ready
  ON app_private.practitioner_materials(created_at DESC) WHERE status='ready';
ALTER TABLE app_private.practitioner_materials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.practitioner_materials FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON app_private.practitioner_materials TO hh_app_backend;
DROP POLICY IF EXISTS practitioner_materials_backend_only ON app_private.practitioner_materials;
CREATE POLICY practitioner_materials_backend_only
  ON app_private.practitioner_materials FOR ALL TO hh_app_backend
  USING (true) WITH CHECK (true);
-- Existing private bucket stays private and only accepts browser-processed photo types.
-- Videos remain gated by the existing external R2/S3 adapter unless explicitly opted in.
COMMIT;
