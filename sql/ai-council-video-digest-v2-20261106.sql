-- Owner-only daily Video Scout Telegram digest. No new cron, bots, credentials, models or fees.
-- This additive change extends existing PRIVATE task kind and seeds OFF by default.
BEGIN;
ALTER TABLE app_private.ai_automation_tasks_v2
  DROP CONSTRAINT IF EXISTS ai_automation_tasks_v2_task_kind_check;
ALTER TABLE app_private.ai_automation_tasks_v2
  ADD CONSTRAINT ai_automation_tasks_v2_task_kind_check
  CHECK (task_kind IN ('video_source_discovery','video_classification','strategic_review','report_delivery'));
INSERT INTO app_private.ai_automation_tasks_v2
(task_id,task_kind,description,schedule_cron,enabled,policy_version)
VALUES ('video-scout-digest-daily','report_delivery',
  'Optional daily verified statistics to the already paired owner Telegram only',
  '17 15 * * *',false,'hh-video-scout-digest-v1')
ON CONFLICT (task_id) DO NOTHING;
-- Keep all existing forced RLS, private grants and owner session protections unchanged.
COMMIT;
