-- Personal Video Gift data contract. The free editor never uploads photos.
-- This migration does NOT enable external HeyGen jobs.
BEGIN;
ALTER TABLE app_private.personal_videos
 DROP CONSTRAINT IF EXISTS personal_videos_duration_seconds_check;
ALTER TABLE app_private.personal_videos
 ADD CONSTRAINT personal_videos_duration_seconds_check
 CHECK(duration_seconds IN (10,15,20,25,30,60));

CREATE TABLE IF NOT EXISTS app_private.video_gift_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
 idempotency_key uuid NOT NULL,
 status text NOT NULL DEFAULT 'draft'
  CHECK(status IN ('draft','awaiting_payment','approved','queued','running','ready','failed','cancelled','deleted')),
 locale text NOT NULL CHECK(locale IN ('ru','en','es')),
 aspect text NOT NULL CHECK(aspect IN ('portrait','landscape')),
 occasion text NOT NULL CHECK(occasion IN ('birthday','love','thanks','support','anniversary','custom')),
 motion text NOT NULL CHECK(motion IN ('gentle-zoom','soft-pan','still','smile','blink','head-turn','wave')),
 provider text CHECK(provider IS NULL OR provider='heygen'),
 provider_job_id text CHECK(provider_job_id IS NULL OR length(provider_job_id) BETWEEN 8 AND 255),
 ai_seconds integer NOT NULL DEFAULT 0 CHECK(ai_seconds IN (0,5)),
 max_cost_usd_cents integer NOT NULL DEFAULT 0 CHECK(max_cost_usd_cents BETWEEN 0 AND 1000),
 estimated_cost_usd_cents integer NOT NULL DEFAULT 0 CHECK(estimated_cost_usd_cents BETWEEN 0 AND 1000),
 actual_cost_usd_cents integer NOT NULL DEFAULT 0 CHECK(actual_cost_usd_cents BETWEEN 0 AND 1000),
 source_private_key text,
 animation_private_key text,
 final_private_key text,
 consent_version text NOT NULL DEFAULT 'video-gift-v1'
  CHECK(consent_version='video-gift-v1'),
 photo_rights_attested boolean NOT NULL DEFAULT false,
 subject_permission_attested boolean NOT NULL DEFAULT false,
 minor_subject boolean NOT NULL DEFAULT false,
 guardian_permission_attested boolean NOT NULL DEFAULT false,
 voice_rights_attested boolean NOT NULL DEFAULT false,
 provider_processing_approved_at timestamptz,
 payment_verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 retention_until timestamptz NOT NULL DEFAULT (now()+interval '7 days'),
 deleted_at timestamptz,
 UNIQUE(account_id,idempotency_key),
 CHECK(estimated_cost_usd_cents<=max_cost_usd_cents),
 CHECK(actual_cost_usd_cents<=max_cost_usd_cents),
 CHECK(NOT minor_subject OR guardian_permission_attested),
 CHECK(source_private_key IS NULL OR
  source_private_key ~ '^video-gifts/[a-f0-9-]{36}/[a-f0-9-]{36}/source[.]jpg$'),
 CHECK(animation_private_key IS NULL OR
  animation_private_key ~ '^video-gifts/[a-f0-9-]{36}/[a-f0-9-]{36}/animation[.]mp4$'),
 CHECK(final_private_key IS NULL OR
  final_private_key ~ '^video-gifts/[a-f0-9-]{36}/[a-f0-9-]{36}/master[.]mp4$'),
 CHECK(
  (ai_seconds=0 AND provider IS NULL AND provider_job_id IS NULL AND
   source_private_key IS NULL AND animation_private_key IS NULL AND
   provider_processing_approved_at IS NULL AND payment_verified_at IS NULL AND
   max_cost_usd_cents=0 AND estimated_cost_usd_cents=0 AND actual_cost_usd_cents=0)
  OR
  (ai_seconds=5 AND provider='heygen' AND photo_rights_attested AND
   subject_permission_attested AND provider_processing_approved_at IS NOT NULL AND
   max_cost_usd_cents>0 AND estimated_cost_usd_cents>0)
 ),
 CHECK(status NOT IN ('queued','running','ready') OR
  (ai_seconds=5 AND payment_verified_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS hh_video_gift_jobs_owner_created_idx
 ON app_private.video_gift_jobs(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS hh_video_gift_jobs_retention_idx
 ON app_private.video_gift_jobs(retention_until) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS hh_video_gift_jobs_provider_id_unique
 ON app_private.video_gift_jobs(provider,provider_job_id) WHERE provider_job_id IS NOT NULL;
ALTER TABLE app_private.video_gift_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.video_gift_jobs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.video_gift_jobs FROM PUBLIC,anon,authenticated,service_role,hh_app_inbox,hh_app_backend;
GRANT SELECT,INSERT ON app_private.video_gift_jobs TO hh_app_backend;
-- No public/client route submits paid state. A user can only insert a free
-- metadata-only draft through a verified, account-scoped backend transaction.
DROP POLICY IF EXISTS hh_video_gift_owner_select ON app_private.video_gift_jobs;
CREATE POLICY hh_video_gift_owner_select ON app_private.video_gift_jobs
 FOR SELECT TO hh_app_backend
 USING(account_id=(select auth.uid()) AND (select app_private.account_active()));
DROP POLICY IF EXISTS hh_video_gift_owner_draft ON app_private.video_gift_jobs;
CREATE POLICY hh_video_gift_owner_draft ON app_private.video_gift_jobs
 FOR INSERT TO hh_app_backend
 WITH CHECK(account_id=(select auth.uid()) AND (select app_private.account_active())
  AND status='draft' AND ai_seconds=0 AND provider IS NULL AND
  source_private_key IS NULL AND animation_private_key IS NULL AND
  final_private_key IS NULL AND payment_verified_at IS NULL);
COMMIT;
