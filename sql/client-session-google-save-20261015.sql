-- Holistic House #585: explicit, one-session-at-a-time transfer into Google Cabinet.
-- Additive; no hidden Google link and no access to other consultations.
BEGIN;

ALTER TABLE app_private.save_intents
  ADD COLUMN IF NOT EXISTS source_session_grant_id uuid
    REFERENCES app_private.client_session_share_grants(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_session_grant_version integer,
  ADD COLUMN IF NOT EXISTS source_cabinet_selector text;

ALTER TABLE app_private.save_intents
  DROP CONSTRAINT IF EXISTS save_intents_source_kind_check;
ALTER TABLE app_private.save_intents
  ADD CONSTRAINT save_intents_source_kind_check
  CHECK (source_kind IN ('guest_result','delivered_report','legacy_document','client_session'));

ALTER TABLE app_private.save_intents
  DROP CONSTRAINT IF EXISTS save_intents_source_shape;
ALTER TABLE app_private.save_intents
  ADD CONSTRAINT save_intents_source_shape CHECK (
    (source_kind='guest_result'
      AND source_report_grant_id IS NULL AND source_legacy_client_id IS NULL
      AND source_hash IS NULL AND source_session_grant_id IS NULL
      AND source_session_grant_version IS NULL AND source_cabinet_selector IS NULL
      AND (source_guest_session_id IS NOT NULL OR status='committed'))
    OR
    (source_kind='delivered_report'
      AND source_guest_session_id IS NULL AND source_report_grant_id IS NOT NULL
      AND source_legacy_client_id IS NULL AND source_hash IS NULL
      AND source_session_grant_id IS NULL AND source_session_grant_version IS NULL
      AND source_cabinet_selector IS NULL)
    OR
    (source_kind='legacy_document'
      AND source_guest_session_id IS NULL AND source_report_grant_id IS NULL
      AND source_legacy_client_id IS NOT NULL AND source_hash IS NOT NULL
      AND source_session_grant_id IS NULL AND source_session_grant_version IS NULL
      AND source_cabinet_selector IS NULL)
    OR
    (source_kind='client_session'
      AND source_guest_session_id IS NULL AND source_report_grant_id IS NULL
      AND source_legacy_client_id IS NOT NULL AND source_hash IS NOT NULL
      AND ((source_session_grant_id IS NOT NULL AND source_session_grant_version > 0
          AND source_cabinet_selector IS NULL)
        OR (source_session_grant_id IS NULL AND source_session_grant_version IS NULL
          AND source_cabinet_selector ~ '^[A-Za-z0-9_-]{22}$')))
  );

CREATE TABLE IF NOT EXISTS app.saved_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  source_session_id uuid NOT NULL UNIQUE,
  legacy_client_id uuid NOT NULL,
  source_revision integer NOT NULL CHECK(source_revision>0),
  source_hash text NOT NULL CHECK(source_hash ~ '^sha256:[a-f0-9]{64}$'),
  source_grant_id uuid REFERENCES app_private.client_session_share_grants(id) ON DELETE RESTRICT,
  occurred_on date NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  removed_at timestamptz,
  consent_version text NOT NULL DEFAULT 'session-v1-2026-10-15',
  consented_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_sessions_session_owner
    FOREIGN KEY(source_session_id,legacy_client_id)
    REFERENCES app_private.client_delivery_sessions(id,legacy_client_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS saved_sessions_owner_archive
  ON app.saved_sessions(account_id,occurred_on DESC,saved_at DESC)
  WHERE removed_at IS NULL;

REVOKE ALL ON app.saved_sessions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON app.saved_sessions TO authenticated,hh_app_backend;
GRANT INSERT,UPDATE,DELETE ON app.saved_sessions TO hh_app_backend;
ALTER TABLE app.saved_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS own_saved_sessions_read ON app.saved_sessions;
CREATE POLICY own_saved_sessions_read ON app.saved_sessions
  FOR SELECT TO authenticated,hh_app_backend
  USING (account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));

DROP POLICY IF EXISTS own_saved_sessions_insert ON app.saved_sessions;
CREATE POLICY own_saved_sessions_insert ON app.saved_sessions
  FOR INSERT TO hh_app_backend
  WITH CHECK (account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));

DROP POLICY IF EXISTS own_saved_sessions_update ON app.saved_sessions;
CREATE POLICY own_saved_sessions_update ON app.saved_sessions
  FOR UPDATE TO hh_app_backend
  USING (account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
  WITH CHECK (account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));

REVOKE ALL ON app_private.save_intents FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON app_private.save_intents TO hh_app_backend;
COMMIT;
