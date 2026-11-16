-- Agent Commander PR Watch v1: private owner-assigned observation only.
-- No new cron, model provider, GitHub write token or auto-merge permission.
CREATE TABLE IF NOT EXISTS app_private.cc_pr_watch (
 task_id uuid PRIMARY KEY REFERENCES app_private.cc_tasks(id) ON DELETE CASCADE,
 pr_number integer NOT NULL CHECK(pr_number BETWEEN 1 AND 99999999),
 enabled boolean NOT NULL DEFAULT true,
 stage text NOT NULL DEFAULT 'unknown' CHECK(stage IN(
  'unknown','in_progress','ci_running','needs_fix','ready_for_merge',
  'closed_without_merge','merged_waiting_live','merged_control','on_live_unverified')),
 proof jsonb NOT NULL DEFAULT '{}'::jsonb
  CHECK(jsonb_typeof(proof)='object' AND octet_length(proof::text)<3000),
 last_checked_at timestamptz,
 next_check_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 generation integer NOT NULL DEFAULT 0 CHECK(generation>=0),
 last_error text CHECK(last_error IS NULL OR length(last_error)<=80),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cc_pr_watch_due_idx
 ON app_private.cc_pr_watch(next_check_at,updated_at) WHERE enabled=true;

CREATE TABLE IF NOT EXISTS app_private.cc_pr_watch_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 task_id uuid NOT NULL REFERENCES app_private.cc_tasks(id) ON DELETE CASCADE,
 pr_number integer NOT NULL CHECK(pr_number BETWEEN 1 AND 99999999),
 event_type text NOT NULL CHECK(event_type IN('assigned','paused','status_changed')),
 stage text NOT NULL CHECK(length(stage) BETWEEN 2 AND 40),
 proof jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(octet_length(proof::text)<1200),
 observed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cc_pr_watch_events_recent_idx
 ON app_private.cc_pr_watch_events(observed_at DESC);
CREATE INDEX IF NOT EXISTS cc_pr_watch_events_task_idx
 ON app_private.cc_pr_watch_events(task_id,observed_at DESC);

ALTER TABLE app_private.cc_pr_watch ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.cc_pr_watch_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.cc_pr_watch,app_private.cc_pr_watch_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON app_private.cc_pr_watch TO hh_app_backend;
GRANT SELECT,INSERT ON app_private.cc_pr_watch_events TO hh_app_backend;
CREATE POLICY cc_pr_watch_backend ON app_private.cc_pr_watch
 FOR ALL TO hh_app_backend USING(true) WITH CHECK(true);
CREATE POLICY cc_pr_watch_events_backend ON app_private.cc_pr_watch_events
 FOR ALL TO hh_app_backend USING(true) WITH CHECK(true);
ALTER TABLE app_private.cc_pr_watch FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.cc_pr_watch_events FORCE ROW LEVEL SECURITY;
COMMENT ON TABLE app_private.cc_pr_watch IS
 'Owner-authorized PR monitoring; read-only GitHub evidence. Never dispatches source repair or claims functional LIVE.';
COMMENT ON TABLE app_private.cc_pr_watch_events IS
 'Status transitions and assignment history for Agent Commander; no untrusted PR body or private secrets.';
