-- WebM/Opus from Android voice recorders was already allowed in the
-- consultation bucket; enable the same private MIME in course assets.
-- Preserve every existing allowed format and keep public=false and RLS.
BEGIN;
UPDATE storage.buckets AS b SET allowed_mime_types=(
  SELECT array_agg(DISTINCT mime ORDER BY mime)
  FROM unnest(coalesce(b.allowed_mime_types,ARRAY[]::text[]) ||
    ARRAY['audio/webm']::text[]) AS mime
)
WHERE b.id='hh-practitioner-course-media' AND b.public IS FALSE;
COMMIT;
