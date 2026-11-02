-- Master cabinet article folders. Keep authored articles private until explicitly submitted/approved.
BEGIN;
CREATE TABLE IF NOT EXISTS app.practitioner_article_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES app.practitioners(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (practitioner_id, slug),
  UNIQUE (id, practitioner_id)
);
ALTER TABLE app.practitioner_articles ADD COLUMN IF NOT EXISTS folder_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='practitioner_articles_folder_owner_fk'
      AND conrelid='app.practitioner_articles'::regclass
  ) THEN
    ALTER TABLE app.practitioner_articles
      ADD CONSTRAINT practitioner_articles_folder_owner_fk
      FOREIGN KEY (folder_id, practitioner_id)
      REFERENCES app.practitioner_article_folders(id, practitioner_id)
      ON DELETE SET NULL (folder_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS practitioner_articles_folder_owner_sort
  ON app.practitioner_articles(practitioner_id, folder_id, updated_at DESC);
ALTER TABLE app.practitioner_article_folders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.practitioner_article_folders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.practitioner_article_folders TO hh_app_backend;
DROP POLICY IF EXISTS practitioner_article_folders_owner ON app.practitioner_article_folders;
CREATE POLICY practitioner_article_folders_owner
  ON app.practitioner_article_folders FOR ALL TO hh_app_backend
  USING (
    EXISTS (
      SELECT 1 FROM app.practitioners p
      WHERE p.id=practitioner_id
        AND p.trusted_auth_user_id=(SELECT auth.uid())
        AND p.active
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app.practitioners p
      WHERE p.id=practitioner_id
        AND p.trusted_auth_user_id=(SELECT auth.uid())
        AND p.active
    )
  );
COMMIT;
