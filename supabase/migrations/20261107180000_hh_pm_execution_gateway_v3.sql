-- HH PM Execution Gateway 3.0: additive owner-only execution receipts.
-- Existing Command Center is the ONLY project/task graph; no second task database.
-- No external model, scheduler, trigger, Data API access or paid service.
CREATE TABLE IF NOT EXISTS app_private.cc_pm_executions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 task_id uuid NOT NULL REFERENCES app_private.cc_pm_task_links(task_id),
 pr_number integer NOT NULL CHECK (pr_number BETWEEN 1 AND 99999999),
 expected_sha text NOT NULL CHECK (expected_sha ~ '^[0-9a-f]{40}$'),
 failure_check_id bigint NOT NULL CHECK (failure_check_id>0),
 failure_run_id bigint NOT NULL CHECK (failure_run_id>0),
 executor text NOT NULL CHECK (executor IN ('auto_free_repair','chatgpt_work','codex_host')),
 state text NOT NULL DEFAULT 'PREPARED' CHECK (state IN ('PREPARED','DISPATCHING','DISPATCH_ACCEPTED','DISPATCH_UNCONFIRMED','BLOCKED','CANCELLED')),
 prepare_request_id uuid NOT NULL UNIQUE,
 launch_request_id uuid UNIQUE,
 cancel_request_id uuid UNIQUE,
 owner_approved_at timestamptz,
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '10 minutes'),
 workflow_run_id bigint CHECK (workflow_run_id>0),
 workflow_run_url text CHECK (workflow_run_url IS NULL OR workflow_run_url ~ '^https://github.com/andylitvinov-design/books/actions/runs/[1-9][0-9]*$'),
 cancel_future boolean NOT NULL DEFAULT false,
 blocker_code text,
 evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(evidence::text)<=4000),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(pr_number,expected_sha)
);
CREATE INDEX IF NOT EXISTS cc_pm_exec_task_idx ON app_private.cc_pm_executions(task_id,created_at DESC);
CREATE TABLE IF NOT EXISTS app_private.cc_pm_execution_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 execution_id uuid NOT NULL REFERENCES app_private.cc_pm_executions(id),
 stage text NOT NULL CHECK (stage IN ('OWNER_APPROVED','DISPATCH_ACCEPTED','RUNNER_STARTED',
  'PATCH_VERIFIED','COMMIT_PUBLISHED','CI_RUNNING','CI_GREEN','MERGED',
  'DEPLOYED_SHA_VERIFIED','LIVE_VERIFIED','BLOCKED')),
 evidence jsonb NOT NULL CHECK (octet_length(evidence::text)<=4000),
 observed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (execution_id,stage)
);
CREATE INDEX IF NOT EXISTS cc_pm_exec_events_idx ON app_private.cc_pm_execution_events(execution_id,id);
ALTER TABLE app_private.cc_pm_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.cc_pm_executions FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.cc_pm_execution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.cc_pm_execution_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.cc_pm_executions,app_private.cc_pm_execution_events FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE app_private.cc_pm_execution_events_id_seq FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON app_private.cc_pm_executions TO hh_app_backend;
GRANT SELECT,INSERT ON app_private.cc_pm_execution_events TO hh_app_backend;
GRANT USAGE ON SEQUENCE app_private.cc_pm_execution_events_id_seq TO hh_app_backend;
CREATE POLICY cc_pm_backend_executions ON app_private.cc_pm_executions
 FOR ALL TO hh_app_backend USING (true) WITH CHECK (true);
CREATE POLICY cc_pm_backend_execution_events ON app_private.cc_pm_execution_events
 FOR ALL TO hh_app_backend USING (true) WITH CHECK (true);
COMMENT ON TABLE app_private.cc_pm_executions IS 'Private PM execution receipts; launch CAS + exact PR SHA prevents duplicate agents; no source write privileges.';
COMMENT ON TABLE app_private.cc_pm_execution_events IS 'Verified stage evidence only; dispatch acceptance never equals a worker commit or LIVE.';
