-- HH Command Center v1. Fail-closed, additive, PRIVATE backend-owned objects.
-- Deploy only via reviewed owner-approved database migration. No guest grants.
BEGIN;

CREATE TABLE IF NOT EXISTS app_private.cc_settings (
  scope text PRIMARY KEY DEFAULT 'owner' CHECK (scope='owner'),
  enabled boolean NOT NULL DEFAULT false,
  max_runs_per_day int NOT NULL DEFAULT 12 CHECK (max_runs_per_day BETWEEN 0 AND 144),
  policy_version text NOT NULL DEFAULT 'hh-command-center-v1' CHECK (policy_version='hh-command-center-v1'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app_private.cc_settings(scope,enabled) VALUES('owner',false)
ON CONFLICT(scope) DO NOTHING;

CREATE TABLE IF NOT EXISTS app_private.cc_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK(length(title) BETWEEN 5 AND 120),
  summary text NOT NULL CHECK(length(summary) BETWEEN 8 AND 550),
  state text NOT NULL DEFAULT 'proposed' CHECK(state IN('proposed','active','paused','completed')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_private.cc_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid REFERENCES app_private.cc_objectives(id),
  title text NOT NULL CHECK(length(title) BETWEEN 4 AND 120),
  summary text NOT NULL DEFAULT '' CHECK(length(summary)<=550),
  state text NOT NULL DEFAULT 'planned' CHECK(state IN('planned','active','paused','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_private.cc_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid REFERENCES app_private.cc_objectives(id),
  initiative_id uuid REFERENCES app_private.cc_initiatives(id),
  title text NOT NULL CHECK(length(title) BETWEEN 4 AND 120),
  summary text NOT NULL CHECK(length(summary) BETWEEN 8 AND 550),
  state text NOT NULL DEFAULT 'planned' CHECK(state IN('planned','active','paused','completed')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_private.cc_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES app_private.cc_projects(id),
  title text NOT NULL CHECK(length(title) BETWEEN 4 AND 120),
  acceptance_json jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(octet_length(acceptance_json::text)<5000),
  state text NOT NULL DEFAULT 'planned' CHECK(state IN('planned','active','verified','paused')),
  due_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_private.cc_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES app_private.cc_projects(id),
  milestone_id uuid REFERENCES app_private.cc_milestones(id),
  kind text NOT NULL CHECK(kind IN('repo_pr_audit','repo_issue_audit','code_change','release_verify','research','product_spec','analytics_review','human_decision')),
  title text NOT NULL CHECK(length(title) BETWEEN 6 AND 140),
  description text NOT NULL CHECK(length(description) BETWEEN 10 AND 800),
  source_ref text CHECK(source_ref IS NULL OR length(source_ref)<=180),
  dedupe_key text UNIQUE CHECK(dedupe_key IS NULL OR length(dedupe_key)<=220),
  priority int NOT NULL DEFAULT 50 CHECK(priority BETWEEN 0 AND 100),
  auto_allowed boolean NOT NULL DEFAULT false,
  state text NOT NULL DEFAULT 'needs_spec' CHECK(state IN(
    'inbox','needs_spec','planned','ready','running','retry_wait','awaiting_evidence',
    'completed_verified','completed_live','blocked_dependency','blocked_approval',
    'blocked_no_runner','blocked_budget','blocked_external','paused','dead_letter','canceled')),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempt_count int NOT NULL DEFAULT 0 CHECK(attempt_count BETWEEN 0 AND 10),
  generation int NOT NULL DEFAULT 0 CHECK(generation BETWEEN 0 AND 10),
  current_run_id uuid,
  policy_version text NOT NULL DEFAULT 'hh-command-center-v1' CHECK(policy_version='hh-command-center-v1'),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(NOT auto_allowed OR kind IN('repo_pr_audit','repo_issue_audit')),
  CHECK(state<>'completed_live') -- no owner/API fabricated LIVE; future verified release migration owns this gate
);
CREATE INDEX IF NOT EXISTS cc_tasks_queue_v1
  ON app_private.cc_tasks(priority DESC,created_at) WHERE state IN('ready','retry_wait');
CREATE INDEX IF NOT EXISTS cc_tasks_project_v1
  ON app_private.cc_tasks(project_id,created_at DESC);
CREATE TABLE IF NOT EXISTS app_private.cc_task_dependencies (
  task_id uuid NOT NULL REFERENCES app_private.cc_tasks(id) ON DELETE CASCADE,
  blocked_by_task_id uuid NOT NULL REFERENCES app_private.cc_tasks(id) ON DELETE CASCADE,
  PRIMARY KEY(task_id,blocked_by_task_id),CHECK(task_id<>blocked_by_task_id)
);
CREATE OR REPLACE FUNCTION app_private.cc_reject_dependency_cycles_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF EXISTS(
    WITH RECURSIVE parents(id) AS (
      SELECT NEW.blocked_by_task_id
      UNION
      SELECT d.blocked_by_task_id FROM app_private.cc_task_dependencies d
      JOIN parents p ON d.task_id=p.id
    ) SELECT 1 FROM parents WHERE id=NEW.task_id
  ) THEN RAISE EXCEPTION 'CC_DEPENDENCY_CYCLE'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS cc_dependency_no_cycles_v1 ON app_private.cc_task_dependencies;
CREATE TRIGGER cc_dependency_no_cycles_v1 BEFORE INSERT OR UPDATE ON app_private.cc_task_dependencies
  FOR EACH ROW EXECUTE FUNCTION app_private.cc_reject_dependency_cycles_v1();
REVOKE ALL ON FUNCTION app_private.cc_reject_dependency_cycles_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.cc_reject_dependency_cycles_v1() TO hh_app_backend;

CREATE TABLE IF NOT EXISTS app_private.cc_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES app_private.cc_tasks(id),
  generation int NOT NULL CHECK(generation BETWEEN 1 AND 10),
  worker_id text NOT NULL CHECK(worker_id='github-public-reader'),
  state text NOT NULL DEFAULT 'running' CHECK(state IN('running','succeeded','failed','unconfirmed')),
  lease_until timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  error_code text CHECK(error_code IS NULL OR error_code ~ '^[A-Z0-9_]{3,64}$'),
  receipt jsonb CHECK(receipt IS NULL OR octet_length(receipt::text)<4000),
  UNIQUE(task_id,generation)
);
CREATE INDEX IF NOT EXISTS cc_runs_recent_v1 ON app_private.cc_runs(started_at DESC);
CREATE TABLE IF NOT EXISTS app_private.cc_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES app_private.cc_tasks(id),
  run_id uuid NOT NULL REFERENCES app_private.cc_runs(id),
  evidence_kind text NOT NULL CHECK(evidence_kind IN('github_pr_readback','github_issue_readback')),
  verifier text NOT NULL CHECK(verifier='github_api'),
  source_url text NOT NULL CHECK(source_url LIKE 'https://github.com/andylitvinov-design/books/%' AND length(source_url)<=180),
  observed jsonb NOT NULL CHECK(octet_length(observed::text)<4000),
  created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(run_id,evidence_kind)
);
CREATE INDEX IF NOT EXISTS cc_evidence_task_v1 ON app_private.cc_evidence(task_id,created_at DESC);
CREATE TABLE IF NOT EXISTS app_private.cc_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES app_private.cc_tasks(id),
  run_id uuid REFERENCES app_private.cc_runs(id),
  actor text NOT NULL CHECK(actor IN('owner','dispatcher','verifier','system')),
  event_type text NOT NULL CHECK(event_type IN('objective_created','project_created','task_created','task_changed','settings_changed','run_claim','run_settled','run_expired','tick')),
  request_id uuid UNIQUE, payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(octet_length(payload::text)<2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cc_events_recent_v1 ON app_private.cc_events(created_at DESC);
CREATE TABLE IF NOT EXISTS app_private.cc_scheduler_slots (
  slot_utc timestamptz PRIMARY KEY,
  state text NOT NULL DEFAULT 'running' CHECK(state IN('running','succeeded','no_change','failed')),
  last_error text CHECK(last_error IS NULL OR last_error ~ '^[A-Z0-9_]{3,64}$'),
  started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE TABLE IF NOT EXISTS app_private.cc_reports (
  date_utc date PRIMARY KEY, payload jsonb NOT NULL CHECK(octet_length(payload::text)<9000),
  observed_at timestamptz NOT NULL DEFAULT now()
);
-- Future provider activation reserves a durable outbox but cannot launch an unapproved runtime.
CREATE TABLE IF NOT EXISTS app_private.cc_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),task_id uuid NOT NULL REFERENCES app_private.cc_tasks(id),
  capability text NOT NULL CHECK(capability IN('github.public.read','agent.launch')),
  state text NOT NULL DEFAULT 'blocked_policy' CHECK(state IN('blocked_policy','pending','claimed','settled','unconfirmed')),
  idempotency_key text NOT NULL UNIQUE CHECK(length(idempotency_key) BETWEEN 10 AND 180),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No Data API access; existing role is the only intended server principal.
DO $$ DECLARE name text; BEGIN
  FOREACH name IN ARRAY ARRAY[
    'cc_settings','cc_objectives','cc_initiatives','cc_projects','cc_milestones',
    'cc_tasks','cc_task_dependencies','cc_runs','cc_evidence','cc_events',
    'cc_scheduler_slots','cc_reports','cc_outbox'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE app_private.%I FROM PUBLIC, anon, authenticated',name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE app_private.%I TO hh_app_backend',name);
    EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('ALTER TABLE app_private.%I FORCE ROW LEVEL SECURITY',name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON app_private.%I','cc_backend_'||name,name);
    EXECUTE format('CREATE POLICY %I ON app_private.%I FOR ALL TO hh_app_backend USING (true) WITH CHECK (true)',
      'cc_backend_'||name,name);
  END LOOP;
END $$;
-- Append-only evidence/audit. Task and run mutations remain backend-controlled.
REVOKE UPDATE ON app_private.cc_evidence,app_private.cc_events,app_private.cc_outbox FROM hh_app_backend;
COMMIT;
