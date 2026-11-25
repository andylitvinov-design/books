-- HH PM v1 — follow-up security/functional repair for the existing private database role.
-- The backend connection explicitly SET LOCAL ROLE hh_app_backend; without grants and
-- matching RLS policies, the owner-only Project Management API cannot read any PM data.
-- No anon/authenticated grants, no public Data API, no cron, no paid service.
GRANT SELECT, INSERT, UPDATE ON TABLE
 app_private.cc_pm_epics,
 app_private.cc_pm_options,
 app_private.cc_pm_task_links,
 app_private.cc_pm_pr_links,
 app_private.cc_pm_events
 TO hh_app_backend;

CREATE POLICY cc_pm_backend_epics ON app_private.cc_pm_epics
 FOR ALL TO hh_app_backend USING (true) WITH CHECK (true);
CREATE POLICY cc_pm_backend_options ON app_private.cc_pm_options
 FOR ALL TO hh_app_backend USING (true) WITH CHECK (true);
CREATE POLICY cc_pm_backend_task_links ON app_private.cc_pm_task_links
 FOR ALL TO hh_app_backend USING (true) WITH CHECK (true);
CREATE POLICY cc_pm_backend_pr_links ON app_private.cc_pm_pr_links
 FOR ALL TO hh_app_backend USING (true) WITH CHECK (true);
CREATE POLICY cc_pm_backend_events ON app_private.cc_pm_events
 FOR ALL TO hh_app_backend USING (true) WITH CHECK (true);

-- Match existing Command Center private tables: even the table owner must obey RLS.
ALTER TABLE app_private.cc_pm_epics FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.cc_pm_options FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.cc_pm_task_links FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.cc_pm_pr_links FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.cc_pm_events FORCE ROW LEVEL SECURITY;