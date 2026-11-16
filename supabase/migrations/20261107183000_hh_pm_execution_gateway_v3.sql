-- PM Execution Gateway v3: extend existing private event ledger, no parallel queue.
-- Owner auth and existing FORCE RLS/backend grants remain unchanged.
ALTER TABLE app_private.cc_pm_events
 DROP CONSTRAINT cc_pm_events_event_type_check;
ALTER TABLE app_private.cc_pm_events
 ADD CONSTRAINT cc_pm_events_event_type_check
 CHECK (event_type IN ('epic_created','plans_proposed','plan_selected','pr_linked',
  'execution_launch','execution_cancelled'));
CREATE INDEX IF NOT EXISTS cc_pm_execution_task_events_idx
 ON app_private.cc_pm_events ((result->>'taskId'),created_at DESC)
 WHERE event_type IN ('execution_launch','execution_cancelled');
-- Never grant access to anon, authenticated or PUBLIC.
