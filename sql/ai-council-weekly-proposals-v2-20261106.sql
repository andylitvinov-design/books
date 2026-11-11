-- Weekly Council 4+1 proposals. No autonomous configuration, payment or media writes.
BEGIN;
CREATE TABLE IF NOT EXISTS app_private.ai_automation_proposals_v2 (
 proposal_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid NOT NULL UNIQUE REFERENCES app_private.ai_automation_runs_v2(run_id),
 task_id text NOT NULL REFERENCES app_private.ai_automation_tasks_v2(task_id)
   CHECK (task_id='council-video-review-weekly'),
 proposal jsonb NOT NULL CHECK (jsonb_typeof(proposal)='object' AND
   octet_length(proposal::text)<6500 AND proposal @> '{"ownerApprovalRequired":true,"rightsApproved":false,"publishAuthorized":false}'::jsonb),
 model_policy text NOT NULL DEFAULT 'hh-council-planner-v1' CHECK (model_policy='hh-council-planner-v1'),
 state text NOT NULL DEFAULT 'pending_owner_review'
   CHECK (state IN ('pending_owner_review','accepted_for_manual_planning','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS ai_automation_proposals_recent_v2
 ON app_private.ai_automation_proposals_v2(created_at DESC);
ALTER TABLE app_private.ai_automation_proposals_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.ai_automation_proposals_v2 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.ai_automation_proposals_v2 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE(state,reviewed_at) ON app_private.ai_automation_proposals_v2 TO hh_app_backend;
DROP POLICY IF EXISTS ai_council_proposals_read_v2 ON app_private.ai_automation_proposals_v2;
CREATE POLICY ai_council_proposals_read_v2 ON app_private.ai_automation_proposals_v2
 FOR SELECT TO hh_app_backend USING(true);
DROP POLICY IF EXISTS ai_council_proposals_insert_v2 ON app_private.ai_automation_proposals_v2;
CREATE POLICY ai_council_proposals_insert_v2 ON app_private.ai_automation_proposals_v2
 FOR INSERT TO hh_app_backend WITH CHECK (state='pending_owner_review');
DROP POLICY IF EXISTS ai_council_proposals_review_v2 ON app_private.ai_automation_proposals_v2;
CREATE POLICY ai_council_proposals_review_v2 ON app_private.ai_automation_proposals_v2
 FOR UPDATE TO hh_app_backend USING (state='pending_owner_review')
 WITH CHECK (state IN ('accepted_for_manual_planning','rejected'));
-- One existing hourly tick is the only dispatcher. No extra paid runner or scheduled job.
UPDATE app_private.ai_automation_tasks_v2
 SET schedule_cron='17 7 * * 1',updated_at=now()
 WHERE task_id='council-video-review-weekly' AND enabled=false AND schedule_cron='41 7 * * 1';
COMMIT;
