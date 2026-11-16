-- Holistic House AI Council 2.1 / Video Scout L0. Private research-only tables.
-- Production migration: additive, no public API grants, no modification of Vault.
-- Verify hh_app_backend privileges and RLS policies before enabling the scheduled task.
BEGIN;

CREATE TABLE IF NOT EXISTS app_private.ai_automation_tasks_v2 (
  task_id text PRIMARY KEY CHECK (task_id ~ '^[a-z][a-z0-9-]{3,63}$'),
  task_kind text NOT NULL CHECK (task_kind IN ('video_source_discovery','video_classification','strategic_review')),
  description text NOT NULL CHECK (char_length(description) BETWEEN 4 AND 220),
  schedule_cron text NOT NULL CHECK (char_length(schedule_cron) BETWEEN 5 AND 70),
  timezone text NOT NULL DEFAULT 'UTC' CHECK (timezone='UTC'),
  enabled boolean NOT NULL DEFAULT false,
  policy_version text NOT NULL CHECK (char_length(policy_version) BETWEEN 6 AND 90),
  owner_scope text NOT NULL DEFAULT 'holistic-house-owner' CHECK (owner_scope='holistic-house-owner'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_private.ai_automation_runs_v2 (
  run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id text NOT NULL REFERENCES app_private.ai_automation_tasks_v2(task_id),
  slot_utc timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'running' CHECK (state IN ('running','succeeded','no_change','partial','failed','quota_paused')),
  claim_generation integer NOT NULL DEFAULT 1 CHECK (claim_generation BETWEEN 1 AND 1000000),
  lease_until timestamptz,
  actor_scope text NOT NULL CHECK (actor_scope IN ('cron','owner','strategy')),
  policy_version text NOT NULL,
  source_calls integer NOT NULL DEFAULT 0 CHECK (source_calls BETWEEN 0 AND 2),
  candidates_inserted integer NOT NULL DEFAULT 0 CHECK (candidates_inserted BETWEEN 0 AND 20),
  duplicates integer NOT NULL DEFAULT 0 CHECK (duplicates BETWEEN 0 AND 40),
  rejected integer NOT NULL DEFAULT 0 CHECK (rejected BETWEEN 0 AND 40),
  received integer NOT NULL DEFAULT 0 CHECK (received BETWEEN 0 AND 40),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  error_code text CHECK (error_code IS NULL OR (char_length(error_code)<=64 AND error_code ~ '^[A-Z0-9_]+$')),
  result_json jsonb CHECK (result_json IS NULL OR octet_length(result_json::text)<5000),
  CONSTRAINT ai_automation_unique_hour_v2 UNIQUE (task_id,slot_utc)
);
CREATE INDEX IF NOT EXISTS ai_automation_run_recent_v2
  ON app_private.ai_automation_runs_v2(task_id,slot_utc DESC);

CREATE TABLE IF NOT EXISTS app_private.ai_automation_events_v2 (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES app_private.ai_automation_runs_v2(run_id),
  event_type text NOT NULL CHECK (event_type IN ('run_claim','run_finish','task_change','proposal_created','proposal_decision')),
  operation_id text UNIQUE CHECK (operation_id IS NULL OR operation_id ~ '^[a-f0-9-]{36}$'),
  actor_scope text NOT NULL CHECK (actor_scope IN ('cron','owner','strategy')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(payload::text)<4096),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_automation_events_recent_v2
  ON app_private.ai_automation_events_v2(created_at DESC);

CREATE TABLE IF NOT EXISTS app_private.video_source_candidates_v2 (
  candidate_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider='wikimedia_commons'),
  source_id text NOT NULL CHECK (source_id ~ '^[1-9][0-9]{0,12}$'),
  source_page text NOT NULL CHECK (char_length(source_page)<=650 AND
    source_page LIKE 'https://commons.wikimedia.org/wiki/File:%'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
  creator text NOT NULL DEFAULT '' CHECK (char_length(creator)<=180),
  license_claim text NOT NULL DEFAULT '' CHECK (char_length(license_claim)<=180),
  license_url_claim text CHECK (license_url_claim IS NULL OR char_length(license_url_claim)<=450),
  category text CHECK (category IS NULL OR category IN
    ('love-relationships','stress-anxiety','energy-confidence','goals-money','nature')),
  source_query text NOT NULL CHECK (char_length(source_query) BETWEEN 3 AND 100),
  mime text NOT NULL CHECK (mime IN ('video/webm','video/ogg','video/mp4')),
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes>0),
  width integer CHECK (width IS NULL OR width>0),
  height integer CHECK (height IS NULL OR height>0),
  sha1_claim text CHECK (sha1_claim IS NULL OR sha1_claim ~ '^[a-f0-9]{40}$'),
  review_state text NOT NULL DEFAULT 'research_only' CHECK (review_state='research_only'),
  rights_state text NOT NULL DEFAULT 'unverified' CHECK (rights_state='unverified'),
  first_run_id uuid NOT NULL REFERENCES app_private.ai_automation_runs_v2(run_id),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT video_source_unique_provider_id_v2 UNIQUE(provider,source_id)
);
CREATE INDEX IF NOT EXISTS video_source_candidates_recent_v2
  ON app_private.video_source_candidates_v2(first_seen_at DESC);

-- No implicit browser grants. Schema app_private already exists; its REST exposure is forbidden.
REVOKE ALL ON TABLE app_private.ai_automation_tasks_v2,
  app_private.ai_automation_runs_v2,
  app_private.ai_automation_events_v2,
  app_private.video_source_candidates_v2 FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON app_private.ai_automation_tasks_v2,
  app_private.ai_automation_runs_v2,
  app_private.ai_automation_events_v2,
  app_private.video_source_candidates_v2 TO hh_app_backend;
-- Events and candidates are immutable from our application except INSERT.
REVOKE UPDATE ON app_private.ai_automation_events_v2,
  app_private.video_source_candidates_v2 FROM hh_app_backend;

ALTER TABLE app_private.ai_automation_tasks_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.ai_automation_runs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.ai_automation_events_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.video_source_candidates_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.ai_automation_tasks_v2 FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.ai_automation_runs_v2 FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.ai_automation_events_v2 FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.video_source_candidates_v2 FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_automation_tasks_backend_v2 ON app_private.ai_automation_tasks_v2;
CREATE POLICY ai_automation_tasks_backend_v2 ON app_private.ai_automation_tasks_v2
  FOR ALL TO hh_app_backend USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ai_automation_runs_backend_v2 ON app_private.ai_automation_runs_v2;
CREATE POLICY ai_automation_runs_backend_v2 ON app_private.ai_automation_runs_v2
  FOR ALL TO hh_app_backend USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ai_automation_events_read_v2 ON app_private.ai_automation_events_v2;
CREATE POLICY ai_automation_events_read_v2 ON app_private.ai_automation_events_v2
  FOR SELECT TO hh_app_backend USING (true);
DROP POLICY IF EXISTS ai_automation_events_append_v2 ON app_private.ai_automation_events_v2;
CREATE POLICY ai_automation_events_append_v2 ON app_private.ai_automation_events_v2
  FOR INSERT TO hh_app_backend WITH CHECK (true);
DROP POLICY IF EXISTS video_source_candidates_read_v2 ON app_private.video_source_candidates_v2;
CREATE POLICY video_source_candidates_read_v2 ON app_private.video_source_candidates_v2
  FOR SELECT TO hh_app_backend USING (true);
DROP POLICY IF EXISTS video_source_candidates_append_v2 ON app_private.video_source_candidates_v2;
CREATE POLICY video_source_candidates_append_v2 ON app_private.video_source_candidates_v2
  FOR INSERT TO hh_app_backend WITH CHECK
    (review_state='research_only' AND rights_state='unverified');

INSERT INTO app_private.ai_automation_tasks_v2
(task_id,task_kind,description,schedule_cron,enabled,policy_version)
VALUES
('video-scout-hourly','video_source_discovery',
 'Search Wikimedia Commons for research-only video candidates every hour',
 '17 * * * *',false,'hh-video-scout-l0-v1'),
('video-classifier-batch','video_classification',
 'Optional verified-free public metadata classifier, not yet activated',
 '23 */4 * * *',false,'hh-free-classifier-v1'),
('council-video-review-weekly','strategic_review',
 'Owner-reviewed weekly recommendations; no automatic policy changes',
 '41 7 * * 1',false,'hh-council-planner-v1')
ON CONFLICT (task_id) DO NOTHING;
COMMIT;
