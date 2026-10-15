-- Holistic House: save one practitioner-published session in a verified Google account.
-- This is a separate per-session Account grant; it DOES NOT bind all legacy
-- Client records or authorize other sessions. Apply only to existing HH Supabase.
BEGIN;

CREATE TABLE IF NOT EXISTS app.saved_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  session_id uuid NOT NULL UNIQUE,
  legacy_client_id uuid NOT NULL,
  source_revision integer NOT NULL CHECK(source_revision>0),
  occurred_on date NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  removed_at timestamptz,
  CONSTRAINT saved_sessions_source_owner FOREIGN KEY(session_id,legacy_client_id)
    REFERENCES app_private.client_delivery_sessions(id,legacy_client_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS saved_sessions_account_listing
  ON app.saved_sessions(account_id,occurred_on DESC,saved_at DESC)
  WHERE removed_at IS NULL;

ALTER TABLE app.saved_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.saved_sessions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON app.saved_sessions TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON app.saved_sessions TO hh_app_backend;
CREATE POLICY own_saved_sessions_select ON app.saved_sessions FOR SELECT
  TO authenticated,hh_app_backend
  USING (account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY own_saved_sessions_insert ON app.saved_sessions FOR INSERT
  TO hh_app_backend
  WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY own_saved_sessions_update ON app.saved_sessions FOR UPDATE
  TO hh_app_backend
  USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
  WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));

-- Extend the existing short-lived, browser-cookie-proven save-intent flow.
-- These grants authorize exactly one selected session, never a whole cabinet.
ALTER TABLE app_private.save_intents
  ADD COLUMN IF NOT EXISTS source_session_grant_id uuid
    REFERENCES app_private.client_session_share_grants(id),
  ADD COLUMN IF NOT EXISTS source_session_access_version integer;

ALTER TABLE app_private.save_intents DROP CONSTRAINT IF EXISTS save_intents_source_kind_check;
ALTER TABLE app_private.save_intents ADD CONSTRAINT save_intents_source_kind_check
  CHECK(source_kind IN ('guest_result','delivered_report','legacy_document','client_session'));

ALTER TABLE app_private.save_intents DROP CONSTRAINT IF EXISTS save_intents_source_shape;
ALTER TABLE app_private.save_intents ADD CONSTRAINT save_intents_source_shape CHECK (
  (source_kind='guest_result' AND source_report_grant_id IS NULL
   AND source_session_grant_id IS NULL AND source_session_access_version IS NULL
   AND source_legacy_client_id IS NULL AND source_hash IS NULL
   AND (source_guest_session_id IS NOT NULL OR status='committed'))
  OR (source_kind='delivered_report' AND source_guest_session_id IS NULL
   AND source_report_grant_id IS NOT NULL AND source_legacy_client_id IS NULL
   AND source_hash IS NULL AND source_session_grant_id IS NULL
   AND source_session_access_version IS NULL)
  OR (source_kind='legacy_document' AND source_guest_session_id IS NULL
   AND source_report_grant_id IS NULL AND source_legacy_client_id IS NOT NULL
   AND source_hash IS NOT NULL AND source_session_grant_id IS NULL
   AND source_session_access_version IS NULL)
  OR (source_kind='client_session' AND source_guest_session_id IS NULL
   AND source_report_grant_id IS NULL AND source_legacy_client_id IS NOT NULL
   AND source_hash IS NOT NULL AND source_session_grant_id IS NOT NULL
   AND source_session_access_version > 0)
);

-- Database-level composite ownership, including the original Session ID.
ALTER TABLE app_private.client_session_share_grants
  ADD CONSTRAINT session_save_grant_composite UNIQUE(id,legacy_client_id,session_id);
ALTER TABLE app_private.save_intents
  ADD CONSTRAINT save_intent_session_grant_owner
  FOREIGN KEY(source_session_grant_id,source_legacy_client_id,source_id)
  REFERENCES app_private.client_session_share_grants(id,legacy_client_id,session_id)
  ON DELETE RESTRICT;

-- save_intents stays server-only. No direct browser grants or new policies.
REVOKE ALL ON app_private.save_intents FROM PUBLIC,anon,authenticated;
COMMIT;
