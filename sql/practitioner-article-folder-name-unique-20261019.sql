-- Name uniqueness for author-created material folders (case- and whitespace-insensitive).
-- Created separately from the initial private article-folders migration.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS practitioner_article_folders_display_name_unique
  ON app.practitioner_article_folders (practitioner_id, lower(btrim(name)));
COMMIT;
