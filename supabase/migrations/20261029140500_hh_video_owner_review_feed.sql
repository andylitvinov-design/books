-- Owner video review feed for the EXISTING meditation catalog.
-- Additive state + private audit. Never touch private client media.
BEGIN;

ALTER TABLE public.hh_meditation_catalog_v1
  ADD COLUMN IF NOT EXISTS owner_review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS owner_review_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS owner_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS owner_review_version integer NOT NULL DEFAULT 0;

DO $guard$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint
   WHERE conrelid = 'public.hh_meditation_catalog_v1'::regclass
     AND conname = 'hh_meditation_owner_review_status_v1_check'
 ) THEN
   ALTER TABLE public.hh_meditation_catalog_v1
    ADD CONSTRAINT hh_meditation_owner_review_status_v1_check
      CHECK (owner_review_status IN ('pending','accepted','rejected'));
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint
   WHERE conrelid = 'public.hh_meditation_catalog_v1'::regclass
     AND conname = 'hh_meditation_owner_review_note_v1_check'
 ) THEN
   ALTER TABLE public.hh_meditation_catalog_v1
    ADD CONSTRAINT hh_meditation_owner_review_note_v1_check
      CHECK (char_length(owner_review_note) <= 500 AND owner_review_version >= 0);
 END IF;
END $guard$;
-- Owner-watched timestamps have a distinct provenance; YouTube oEmbed never
-- supplies an authoritative duration. Preserve existing metadata values.
ALTER TABLE public.hh_meditation_catalog_v1
  DROP CONSTRAINT IF EXISTS hh_meditation_catalog_v1_duration_basis_check;
ALTER TABLE public.hh_meditation_catalog_v1
  ADD CONSTRAINT hh_meditation_catalog_v1_duration_basis_check
    CHECK (duration_basis IN ('unknown','title_only','metadata_checked','owner_checked'));
DO $duration_guard$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid='public.hh_meditation_catalog_v1'::regclass
  AND conname='hh_video_owner_checked_seconds_guard'
 ) THEN
  ALTER TABLE public.hh_meditation_catalog_v1
   ADD CONSTRAINT hh_video_owner_checked_seconds_guard
    CHECK (duration_basis <> 'owner_checked' OR duration_verified_seconds BETWEEN 1 AND 600);
 END IF;
END $duration_guard$;
COMMENT ON COLUMN public.hh_meditation_catalog_v1.owner_review_status IS
 'Explicit owner moderation decision. Accepted alone does NOT authorize YouTube embed or public visibility.';
COMMENT ON COLUMN public.hh_meditation_catalog_v1.owner_review_version IS
 'Compare-and-swap revision for concurrent owner moderation and platform metadata checks.';

-- Owner-only backend role: no INSERT/DELETE rights on catalog, no direct public
-- write grants. A valid account session AND a server-set transaction flag are needed.
GRANT SELECT ON public.hh_meditation_catalog_v1 TO hh_app_backend;
GRANT UPDATE (goals,goal_weights,subtopics,duration_verified_seconds,duration_basis,owner_review_status,owner_review_note,
  owner_reviewed_at,owner_reviewed_by,owner_review_version,editorial_status,
  discovery_status,claims_risk,content_checked_at,youtube_oembed_checked_at,
  metadata_checked_at,metadata_confidence,updated_at)
 ON public.hh_meditation_catalog_v1 TO hh_app_backend;
DROP POLICY IF EXISTS hh_video_review_owner_read ON public.hh_meditation_catalog_v1;
CREATE POLICY hh_video_review_owner_read ON public.hh_meditation_catalog_v1
 FOR SELECT TO hh_app_backend USING (
    (select app_private.session_active())
    AND current_setting('hh.video_review_owner',true)='1'
 );
DROP POLICY IF EXISTS hh_video_review_owner_edit ON public.hh_meditation_catalog_v1;
CREATE POLICY hh_video_review_owner_edit ON public.hh_meditation_catalog_v1
 FOR UPDATE TO hh_app_backend
 USING (
    (select app_private.session_active())
    AND current_setting('hh.video_review_owner',true)='1'
 )
 WITH CHECK (
    (select app_private.session_active())
    AND current_setting('hh.video_review_owner',true)='1'
 );

CREATE TABLE IF NOT EXISTS app_private.hh_video_review_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 video_id varchar(11) NOT NULL REFERENCES public.hh_meditation_catalog_v1(youtube_id),
 reviewer_id uuid NOT NULL,
 action text NOT NULL CHECK (action IN ('accept','reject','save','verify_oembed','verify_duration')),
 previous_status text NOT NULL,
 new_status text NOT NULL,
 previous_goals text[] NOT NULL,
 new_goals text[] NOT NULL,
 previous_subtopics text[] NOT NULL,
 new_subtopics text[] NOT NULL,
 previous_weights jsonb NOT NULL,
 new_weights jsonb NOT NULL,
 previous_duration_seconds integer,
 new_duration_seconds integer,
 previous_duration_basis text NOT NULL,
 new_duration_basis text NOT NULL,
 note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hh_video_review_events_video_time
 ON app_private.hh_video_review_events(video_id,created_at DESC);
ALTER TABLE app_private.hh_video_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.hh_video_review_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON app_private.hh_video_review_events TO hh_app_backend;
GRANT USAGE,SELECT ON SEQUENCE app_private.hh_video_review_events_id_seq TO hh_app_backend;
DROP POLICY IF EXISTS hh_video_review_events_owner_read ON app_private.hh_video_review_events;
CREATE POLICY hh_video_review_events_owner_read ON app_private.hh_video_review_events
 FOR SELECT TO hh_app_backend USING (
   (select app_private.session_active())
   AND current_setting('hh.video_review_owner',true)='1'
 );
DROP POLICY IF EXISTS hh_video_review_events_owner_write ON app_private.hh_video_review_events;
CREATE POLICY hh_video_review_events_owner_write ON app_private.hh_video_review_events
 FOR INSERT TO hh_app_backend WITH CHECK (
   reviewer_id=(select auth.uid())
   AND (select app_private.session_active())
   AND current_setting('hh.video_review_owner',true)='1'
 );

-- Client-visible rows require explicit owner acceptance, short duration, and
-- independent checks. Existing 19 link-only candidates remain securely staged
-- until the owner accepts them. A watch/oEmbed URL never proves an iframe.
DROP POLICY IF EXISTS "Published video or curated metadata-only YouTube link"
 ON public.hh_meditation_catalog_v1;
CREATE POLICY "Published video or curated metadata-only YouTube link"
 ON public.hh_meditation_catalog_v1 FOR SELECT TO anon,authenticated
 USING (
   owner_review_status='accepted'
   AND duration_verified_seconds BETWEEN 1 AND 600
   AND duration_basis IN ('metadata_checked','owner_checked')
   AND content_checked_at IS NOT NULL
   AND (
     (
       editorial_status='approved'
       AND embed_status='confirmed'
       AND rights_status='embed_approved'
       AND embed_checked_at IS NOT NULL
     )
     OR (
       discovery_status='link_only'
       AND source_kind='external'
       AND editorial_status='candidate'
       AND youtube_oembed_checked_at IS NOT NULL
       AND metadata_confidence='public_listing'
       AND content_type='guided'
       AND claims_risk IN ('low','moderate')
       AND embed_status='unverified'
       AND rights_status='pending_embed_check'
       AND metadata_checked_at IS NOT NULL
     )
   )
 );

COMMIT;
