-- Human triage of public research candidates, not source rights clearance.
-- Existing research rows remain immutable; no media download / Vault writes / new spend.
BEGIN;
CREATE TABLE IF NOT EXISTS app_private.video_candidate_editorial_reviews_v1 (
  candidate_id uuid PRIMARY KEY REFERENCES app_private.video_source_candidates_v2(candidate_id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('shortlisted_for_rights_review','needs_more_evidence','rejected')),
  reason text NOT NULL CHECK (reason IN ('owner_visual_preselection','source_metadata_unclear','not_relevant')),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hh_candidate_decision_reason_pair CHECK (
    (decision='shortlisted_for_rights_review' AND reason='owner_visual_preselection') OR
    (decision='needs_more_evidence' AND reason='source_metadata_unclear') OR
    (decision='rejected' AND reason='not_relevant'))
);
CREATE TABLE IF NOT EXISTS app_private.video_candidate_editorial_events_v1 (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES app_private.video_source_candidates_v2(candidate_id) ON DELETE RESTRICT,
  operation_id uuid NOT NULL UNIQUE,
  decision text NOT NULL CHECK (decision IN ('shortlisted_for_rights_review','needs_more_evidence','rejected')),
  reason text NOT NULL CHECK (reason IN ('owner_visual_preselection','source_metadata_unclear','not_relevant')),
  actor_scope text NOT NULL CHECK (actor_scope='owner'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS video_candidate_editorial_events_created_v1
 ON app_private.video_candidate_editorial_events_v1(created_at DESC);
REVOKE ALL ON app_private.video_candidate_editorial_reviews_v1,
  app_private.video_candidate_editorial_events_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE(decision,reason,reviewed_at)
 ON app_private.video_candidate_editorial_reviews_v1 TO hh_app_backend;
GRANT SELECT,INSERT ON app_private.video_candidate_editorial_events_v1 TO hh_app_backend;
ALTER TABLE app_private.video_candidate_editorial_reviews_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.video_candidate_editorial_reviews_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.video_candidate_editorial_events_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.video_candidate_editorial_events_v1 FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hh_candidate_editorial_review_read_v1 ON app_private.video_candidate_editorial_reviews_v1;
CREATE POLICY hh_candidate_editorial_review_read_v1 ON app_private.video_candidate_editorial_reviews_v1
 FOR SELECT TO hh_app_backend USING(true);
DROP POLICY IF EXISTS hh_candidate_editorial_review_insert_v1 ON app_private.video_candidate_editorial_reviews_v1;
CREATE POLICY hh_candidate_editorial_review_insert_v1 ON app_private.video_candidate_editorial_reviews_v1
 FOR INSERT TO hh_app_backend WITH CHECK(true);
DROP POLICY IF EXISTS hh_candidate_editorial_review_update_v1 ON app_private.video_candidate_editorial_reviews_v1;
CREATE POLICY hh_candidate_editorial_review_update_v1 ON app_private.video_candidate_editorial_reviews_v1
 FOR UPDATE TO hh_app_backend USING(true) WITH CHECK(true);
DROP POLICY IF EXISTS hh_candidate_editorial_event_read_v1 ON app_private.video_candidate_editorial_events_v1;
CREATE POLICY hh_candidate_editorial_event_read_v1 ON app_private.video_candidate_editorial_events_v1
 FOR SELECT TO hh_app_backend USING(true);
DROP POLICY IF EXISTS hh_candidate_editorial_event_append_v1 ON app_private.video_candidate_editorial_events_v1;
CREATE POLICY hh_candidate_editorial_event_append_v1 ON app_private.video_candidate_editorial_events_v1
 FOR INSERT TO hh_app_backend WITH CHECK(actor_scope='owner');
COMMIT;
