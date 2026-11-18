-- Private RLS-safe global quota for client-owned, signed MP4 masters.
-- App backend can see only the current owner under RLS; it must not SUM globally
-- from the table itself. This zero-argument aggregate reveals only a byte count.
BEGIN;
CREATE OR REPLACE FUNCTION app_private.personal_video_reserved_global_bytes()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT COALESCE(SUM(p.bytes), 0)::bigint
  FROM app_private.personal_videos AS p
  WHERE p.status <> 'deleted' OR p.released_at IS NULL
$$;
REVOKE ALL ON FUNCTION app_private.personal_video_reserved_global_bytes()
  FROM PUBLIC, anon, authenticated, hh_app_inbox;
GRANT EXECUTE ON FUNCTION app_private.personal_video_reserved_global_bytes()
  TO hh_app_backend;
COMMENT ON FUNCTION app_private.personal_video_reserved_global_bytes()
  IS 'Private, RLS-safe total reserved bytes for the signed client MP4 global quota';
COMMIT;
