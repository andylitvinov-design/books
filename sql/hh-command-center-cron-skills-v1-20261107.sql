-- Cron Skills for existing Command Center. Additive, private, opt-in.
-- No cron schedules, external services, credentials, RLS exemptions or new CI.
BEGIN;
CREATE TABLE IF NOT EXISTS app_private.cc_skill_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 skill_id text NOT NULL CHECK(skill_id ~ '^[a-z][a-z0-9_-]{1,30}\.[a-z][a-z0-9_-]{1,45}$'),
 project_key text NOT NULL DEFAULT 'holistichouse' CHECK(project_key='holistichouse'),
 schedule text NOT NULL CHECK(schedule IN('10m','30m','hourly','daily_9','weekly_mon_9')),
 enabled boolean NOT NULL DEFAULT false,
 next_due_at timestamptz NOT NULL,
 generation int NOT NULL DEFAULT 0 CHECK(generation BETWEEN 0 AND 1000000),
 active_run_id uuid, lease_until timestamptz,
 last_finished_at timestamptz,
 last_state text CHECK(last_state IS NULL OR last_state IN('succeeded','failed','unconfirmed')),
 last_error text CHECK(last_error IS NULL OR last_error ~ '^[A-Z0-9_]{3,64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(skill_id,project_key),
 CHECK((active_run_id IS NULL)=(lease_until IS NULL))
);
CREATE INDEX IF NOT EXISTS cc_skill_jobs_due_v1
 ON app_private.cc_skill_jobs(next_due_at,id) WHERE enabled=true;
CREATE TABLE IF NOT EXISTS app_private.cc_skill_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES app_private.cc_skill_jobs(id),
 skill_id text NOT NULL CHECK(length(skill_id) BETWEEN 3 AND 80),
 generation int NOT NULL CHECK(generation BETWEEN 1 AND 1000000),
 state text NOT NULL DEFAULT 'running' CHECK(state IN('running','succeeded','failed','unconfirmed')),
 lease_until timestamptz,
 receipt jsonb CHECK(receipt IS NULL OR octet_length(receipt::text)<4000),
 error_code text CHECK(error_code IS NULL OR error_code ~ '^[A-Z0-9_]{3,64}$'),
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 UNIQUE(job_id,generation)
);
CREATE INDEX IF NOT EXISTS cc_skill_runs_recent_v1
 ON app_private.cc_skill_runs(started_at DESC);
CREATE TABLE IF NOT EXISTS app_private.cc_skill_events (
 request_id uuid PRIMARY KEY,
 skill_id text NOT NULL CHECK(length(skill_id) BETWEEN 3 AND 80),
 action text NOT NULL CHECK(action IN('configure','pause','resume','queue_now')),
 created_at timestamptz NOT NULL DEFAULT now()
);
-- Never grant client/anon access to operational schedules or execution receipts.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['cc_skill_jobs','cc_skill_runs','cc_skill_events'] LOOP
  EXECUTE format('REVOKE ALL ON TABLE app_private.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON TABLE app_private.%I TO hh_app_backend',t);
  EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE app_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON app_private.%I','cc_backend_'||t,t);
  EXECUTE format('CREATE POLICY %I ON app_private.%I FOR ALL TO hh_app_backend USING(true) WITH CHECK(true)',
   'cc_backend_'||t,t);
 END LOOP;
END $$;
REVOKE UPDATE ON app_private.cc_skill_events FROM hh_app_backend;
-- A single low-frequency, database-only briefing is enabled with owner request
-- after the code is deployed; leave the schema and all jobs disabled initially.
COMMIT;
