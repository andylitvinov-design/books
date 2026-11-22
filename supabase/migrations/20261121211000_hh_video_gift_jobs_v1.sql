-- Personal Video Gift: additive/private schema, no paid provider enabled by this migration.
-- Apply through the existing vetted database migration path before exposing save/AI.
BEGIN;
ALTER TABLE app_private.personal_videos
  DROP CONSTRAINT IF EXISTS personal_videos_theme_check;
ALTER TABLE app_private.personal_videos ADD CONSTRAINT personal_videos_theme_check
  CHECK(theme IN ('money','relationships','energy','goals','health','life','gift'));
ALTER TABLE app_private.personal_videos
  DROP CONSTRAINT IF EXISTS personal_videos_duration_seconds_check;
ALTER TABLE app_private.personal_videos ADD CONSTRAINT personal_videos_duration_seconds_check
  CHECK(duration_seconds IN (10,15,20,25,30,60));

CREATE TABLE IF NOT EXISTS app_private.video_gift_jobs(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  locale text NOT NULL CHECK(locale IN ('ru','en','es')),
  occasion text NOT NULL CHECK(occasion IN ('birthday','love','thanks','support','anniversary','custom')),
  source_owner text NOT NULL CHECK(source_owner IN ('self','other','minor')),
  motion text NOT NULL CHECK(motion IN ('zoom','pan','float','smile','blink','turn','wave')),
  aspect text NOT NULL CHECK(aspect IN ('portrait','landscape')),
  mode text NOT NULL DEFAULT 'free' CHECK(mode IN ('free','heygen')),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN (
    'draft','awaiting_payment','queued','processing','ready','failed','cancelled','expired'
  )),
  duration_seconds integer NOT NULL DEFAULT 25 CHECK(duration_seconds=25),
  ai_seconds integer NOT NULL DEFAULT 0 CHECK(ai_seconds IN (0,5)),
  estimate_usd_cents integer NOT NULL DEFAULT 0 CHECK(estimate_usd_cents BETWEEN 0 AND 500),
  max_job_usd_cents integer NOT NULL DEFAULT 0 CHECK(max_job_usd_cents BETWEEN 0 AND 500),
  actual_usd_cents integer CHECK(actual_usd_cents BETWEEN 0 AND 500),
  payment_receipt_digest text UNIQUE CHECK (
    payment_receipt_digest IS NULL OR payment_receipt_digest ~ '^[a-f0-9]{64}$'
  ),
  payment_verified_at timestamptz,
  provider text CHECK(provider IS NULL OR provider='heygen'),
  provider_model text CHECK(provider_model IS NULL OR provider_model='heygen-video-1'),
  provider_job_id text UNIQUE CHECK(provider_job_id IS NULL OR length(provider_job_id) BETWEEN 8 AND 255),
  -- All keys must point to the existing PRIVATE storage bucket, never public/.
  photo_object_key text CHECK(photo_object_key IS NULL OR photo_object_key ~
    '^video-gifts/[a-f0-9-]{36}/[a-f0-9-]{36}/source[.]jpg$'),
  clip_object_key text CHECK(clip_object_key IS NULL OR clip_object_key ~
    '^video-gifts/[a-f0-9-]{36}/[a-f0-9-]{36}/motion[.]mp4$'),
  final_video_id uuid REFERENCES app_private.personal_videos(id) ON DELETE SET NULL,
  rights_confirmed boolean NOT NULL DEFAULT false,
  subject_consent boolean NOT NULL DEFAULT false,
  guardian_consent boolean NOT NULL DEFAULT false,
  voice_consent boolean NOT NULL DEFAULT false,
  consent_version text NOT NULL DEFAULT 'video-gift-v1',
  consent_recorded_at timestamptz,
  provider_claimed_at timestamptz,
  failure_code text CHECK(failure_code IS NULL OR failure_code ~ '^[A-Z0-9_]{2,60}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '14 days'),
  deleted_at timestamptz,
  CONSTRAINT video_gift_idempotency UNIQUE(account_id,idempotency_key),
  CONSTRAINT video_gift_photo_consent CHECK (
    (mode='free' AND ai_seconds=0 AND provider IS NULL AND
     provider_job_id IS NULL AND photo_object_key IS NULL AND clip_object_key IS NULL AND
     actual_usd_cents IS NULL AND estimate_usd_cents=0 AND max_job_usd_cents=0)
    OR
    (mode='heygen' AND ai_seconds=5 AND provider='heygen' AND provider_model='heygen-video-1'
      AND rights_confirmed AND (source_owner='self' OR subject_consent)
      AND (source_owner<>'minor' OR guardian_consent)
      AND consent_recorded_at IS NOT NULL)
  ),
  CONSTRAINT video_gift_paid_precondition CHECK (
    mode='free'
    OR status IN ('draft','awaiting_payment','cancelled','failed','expired')
    OR (payment_receipt_digest IS NOT NULL AND payment_verified_at IS NOT NULL
        AND max_job_usd_cents>=estimate_usd_cents AND max_job_usd_cents>0)
  ),
  CONSTRAINT video_gift_provider_claim CHECK (
    provider_job_id IS NULL OR
    (mode='heygen' AND provider_claimed_at IS NOT NULL
      AND payment_verified_at IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS hh_video_gift_owner_created_idx
  ON app_private.video_gift_jobs(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS hh_video_gift_pending_idx
  ON app_private.video_gift_jobs(status,created_at)
  WHERE status IN ('queued','processing','failed');
ALTER TABLE app_private.video_gift_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.video_gift_jobs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.video_gift_jobs
  FROM PUBLIC,anon,authenticated,service_role,hh_app_inbox,hh_app_backend;
GRANT SELECT,INSERT ON app_private.video_gift_jobs TO hh_app_backend;
GRANT UPDATE(status,provider_job_id,provider_claimed_at,clip_object_key,final_video_id,
  actual_usd_cents,failure_code,updated_at,deleted_at)
  ON app_private.video_gift_jobs TO hh_app_backend;
CREATE POLICY hh_video_gift_owner_read ON app_private.video_gift_jobs FOR SELECT
  TO hh_app_backend
  USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
-- A user/backend may create only a genuinely free, inert draft.
-- Paid orders and provider dispatch require an independently reviewed moderator path.
CREATE POLICY hh_video_gift_owner_draft ON app_private.video_gift_jobs FOR INSERT
  TO hh_app_backend WITH CHECK (
    account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active())
    AND mode='free' AND status='draft' AND rights_confirmed
    AND (source_owner='self' OR subject_consent)
    AND (source_owner<>'minor' OR guardian_consent)
  );
CREATE POLICY hh_video_gift_admin_update ON app_private.video_gift_jobs FOR UPDATE
  TO hh_app_backend
  USING(current_setting('hh.moderator',true)='1')
  WITH CHECK(current_setting('hh.moderator',true)='1');
COMMENT ON TABLE app_private.video_gift_jobs IS
  'Private, owner-scoped 25s Video Gift jobs; paid API disabled until verified receipt, explicit consent, quote and budget';
COMMIT;
