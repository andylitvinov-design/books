-- Extend the existing private owner material catalog and private course media to
-- accept phone audio. Do not create buckets, publish originals or alter client RLS.
BEGIN;

ALTER TABLE app_private.practitioner_materials
  DROP CONSTRAINT IF EXISTS practitioner_materials_kind_check;
ALTER TABLE app_private.practitioner_materials
  ADD CONSTRAINT practitioner_materials_kind_check
  CHECK (kind IN ('youtube','image','video','audio'));

ALTER TABLE app_private.practitioner_materials
  DROP CONSTRAINT IF EXISTS practitioner_materials_payload;
ALTER TABLE app_private.practitioner_materials
  ADD CONSTRAINT practitioner_materials_payload CHECK (
    (kind = 'youtube' AND url IS NOT NULL AND mime IS NULL
      AND object_key IS NULL AND expected_bytes IS NULL
      AND bytes IS NULL AND status = 'ready')
    OR (kind IN ('image','video','audio') AND url IS NULL
      AND mime IS NOT NULL AND object_key IS NOT NULL
      AND expected_bytes BETWEEN 128 AND
        CASE WHEN kind = 'audio' THEN 20000000 ELSE 200000000 END
      AND (kind <> 'audio' OR mime IN (
        'audio/mpeg','audio/mp4','audio/x-m4a','audio/webm',
        'audio/wav','audio/x-wav','audio/ogg','audio/flac','audio/aac')))
  );

-- Keep the source and destination buckets private; preserve existing MIME
-- types, file size limits and storage objects. Only append audio MIME types.
UPDATE storage.buckets AS b SET allowed_mime_types = (
  SELECT array_agg(DISTINCT mime ORDER BY mime)
  FROM unnest(
    coalesce(b.allowed_mime_types,ARRAY[]::text[]) ||
    ARRAY['audio/wav','audio/x-wav','audio/ogg','audio/flac','audio/aac']::text[]
  ) AS mime
)
WHERE b.id IN ('hh-client-private-media','hh-practitioner-course-media')
  AND b.public IS FALSE;

COMMIT;
