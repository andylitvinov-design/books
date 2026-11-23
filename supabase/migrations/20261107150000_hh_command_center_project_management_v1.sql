-- HH Project Management v1: private additive extension to existing Command Center.
-- No new jobs, triggers, schedulers, public Data API, autonomous writers or agents.
CREATE TABLE IF NOT EXISTS app_private.cc_pm_epics (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id uuid NOT NULL REFERENCES app_private.cc_projects(id),
 title text NOT NULL CHECK(length(title) BETWEEN 6 AND 120),
 problem text NOT NULL CHECK(length(problem) BETWEEN 12 AND 700),
 outcome text NOT NULL CHECK(length(outcome) BETWEEN 12 AND 700),
 priority integer NOT NULL CHECK(priority BETWEEN 1 AND 5),
 state text NOT NULL DEFAULT 'draft' CHECK(state IN('draft','planned','active','paused','verified','cancelled')),
 selected_option_id uuid,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>=1),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cc_pm_epics_project_idx ON app_private.cc_pm_epics(project_id,created_at DESC);
CREATE TABLE IF NOT EXISTS app_private.cc_pm_options (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 epic_id uuid NOT NULL REFERENCES app_private.cc_pm_epics(id),
 key text NOT NULL CHECK(key IN ('quick','balanced','extended')),
 title text NOT NULL CHECK(length(title) BETWEEN 6 AND 100),
 approach text NOT NULL CHECK(length(approach) BETWEEN 10 AND 600),
 benefit text NOT NULL CHECK(length(benefit) BETWEEN 10 AND 500),
 risk text NOT NULL CHECK(length(risk) BETWEEN 10 AND 500),
 steps jsonb NOT NULL CHECK(jsonb_typeof(steps)='array' AND jsonb_array_length(steps) BETWEEN 1 AND 8 AND octet_length(steps::text)<12000),
 state text NOT NULL DEFAULT 'proposed' CHECK(state IN('proposed','selected','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(epic_id,key)
);
CREATE UNIQUE INDEX IF NOT EXISTS cc_pm_one_selected_idx ON app_private.cc_pm_options(epic_id) WHERE state='selected';
CREATE TABLE IF NOT EXISTS app_private.cc_pm_task_links (
 task_id uuid PRIMARY KEY REFERENCES app_private.cc_tasks(id),
 epic_id uuid NOT NULL REFERENCES app_private.cc_pm_epics(id),
 option_id uuid NOT NULL REFERENCES app_private.cc_pm_options(id),
 acceptance text NOT NULL CHECK(length(acceptance) BETWEEN 10 AND 800),
 step_position integer NOT NULL CHECK(step_position BETWEEN 0 AND 20),
 UNIQUE(option_id,step_position)
);
CREATE INDEX IF NOT EXISTS cc_pm_tasks_epic_idx ON app_private.cc_pm_task_links(epic_id,step_position);
CREATE TABLE IF NOT EXISTS app_private.cc_pm_pr_links (
 task_id uuid NOT NULL REFERENCES app_private.cc_tasks(id),
 pr_number integer NOT NULL CHECK(pr_number BETWEEN 1 AND 99999999),
 repository text NOT NULL DEFAULT 'andylitvinov-design/books' CHECK(repository='andylitvinov-design/books'),
 linked_by text NOT NULL DEFAULT 'owner' CHECK(linked_by='owner'),
 linked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(task_id,pr_number)
);
CREATE INDEX IF NOT EXISTS cc_pm_pr_lookup_idx ON app_private.cc_pm_pr_links(pr_number);
CREATE TABLE IF NOT EXISTS app_private.cc_pm_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL UNIQUE,
 epic_id uuid REFERENCES app_private.cc_pm_epics(id),
 actor text NOT NULL DEFAULT 'owner' CHECK(actor='owner'),
 event_type text NOT NULL CHECK(event_type IN ('epic_created','plans_proposed','plan_selected','pr_linked')),
 result jsonb NOT NULL CHECK(octet_length(result::text)<12000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cc_pm_events_epic_idx ON app_private.cc_pm_events(epic_id,created_at DESC);
ALTER TABLE app_private.cc_pm_epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.cc_pm_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.cc_pm_task_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.cc_pm_pr_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.cc_pm_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.cc_pm_epics,app_private.cc_pm_options,app_private.cc_pm_task_links,app_private.cc_pm_pr_links,app_private.cc_pm_events FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE app_private.cc_pm_epics IS 'Owner-only project management epics; one selected proposal; no automatic source publication.';
COMMENT ON TABLE app_private.cc_pm_pr_links IS 'Owner-approved task/PR links. GitHub API, not this table, is authoritative for CI, merge and LIVE.';