-- Optional free AI metadata enrichment. Never changes source rights or Vault status.
BEGIN;
CREATE TABLE IF NOT EXISTS app_private.video_candidate_ai_suggestions_v2 (
  candidate_id uuid PRIMARY KEY REFERENCES app_private.video_source_candidates_v2(candidate_id),
  model_id text NOT NULL CHECK (model_id ~ '^[a-z0-9._/-]+:free$' AND char_length(model_id)<=120),
  goals jsonb NOT NULL CHECK (jsonb_typeof(goals)='array' AND jsonb_array_length(goals)<=4),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 10 AND 240),
  confidence text NOT NULL CHECK (confidence IN ('low','medium','high')),
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(warnings)='array' AND jsonb_array_length(warnings)<=4),
  review_required boolean NOT NULL DEFAULT true CHECK (review_required=true),
  first_run_id uuid NOT NULL REFERENCES app_private.ai_automation_runs_v2(run_id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_private.video_candidate_ai_suggestions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.video_candidate_ai_suggestions_v2 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.video_candidate_ai_suggestions_v2 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON app_private.video_candidate_ai_suggestions_v2 TO hh_app_backend;
DROP POLICY IF EXISTS hh_video_candidate_ai_owner_read_v2 ON app_private.video_candidate_ai_suggestions_v2;
CREATE POLICY hh_video_candidate_ai_owner_read_v2 ON app_private.video_candidate_ai_suggestions_v2
 FOR SELECT TO hh_app_backend USING(true);
DROP POLICY IF EXISTS hh_video_candidate_ai_owner_insert_v2 ON app_private.video_candidate_ai_suggestions_v2;
CREATE POLICY hh_video_candidate_ai_owner_insert_v2 ON app_private.video_candidate_ai_suggestions_v2
 FOR INSERT TO hh_app_backend WITH CHECK (review_required=true);
-- Both tasks are invoked via the existing :17 cron; no additional production Cron.
UPDATE app_private.ai_automation_tasks_v2 SET schedule_cron='17 */4 * * *',updated_at=now()
 WHERE task_id='video-classifier-batch' AND schedule_cron='23 */4 * * *' AND enabled=false;
UPDATE app_private.ai_automation_tasks_v2 SET schedule_cron='17 7 * * 1',updated_at=now()
 WHERE task_id='council-video-review-weekly' AND schedule_cron='41 7 * * 1' AND enabled=false;
COMMIT;
