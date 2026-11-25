-- Reiki course sharing requires fresh Messenger-specific consent. Existing
-- teacher-lead consent never authorizes disclosure to a conversation.
BEGIN;
ALTER TABLE app_private.academy_course_progress
  ADD COLUMN messenger_consent boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT reiki_enrollment_account UNIQUE(id,account_id);
GRANT UPDATE(messenger_consent) ON app_private.academy_course_progress TO hh_app_backend;

CREATE TABLE app_private.reiki_course_events (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL,
  enrollment_id uuid NOT NULL,
  event_key text NOT NULL CHECK (length(event_key) BETWEEN 1 AND 160),
  kind text NOT NULL CHECK (kind IN ('start','answer','answer-edit','milestone','complete','application')),
  question_id text CHECK (question_id ~ '^[a-z][a-z0-9-]{1,48}$'),
  revision integer NOT NULL CHECK (revision >= 0),
  sequence bigint GENERATED ALWAYS AS IDENTITY,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  payload_ciphertext text NOT NULL CHECK (octet_length(payload_ciphertext) BETWEEN 24 AND 65536),
  FOREIGN KEY (enrollment_id,account_id)
    REFERENCES app_private.academy_course_progress(id,account_id) ON DELETE CASCADE,
  UNIQUE (enrollment_id,event_key)
);
CREATE INDEX reiki_events_chronology ON app_private.reiki_course_events(enrollment_id,sequence);
ALTER TABLE app_private.reiki_course_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.reiki_course_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.reiki_course_events FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend,hh_app_inbox;
GRANT SELECT,DELETE ON app_private.reiki_course_events TO hh_app_backend;
GRANT INSERT (id,account_id,enrollment_id,event_key,kind,question_id,revision,occurred_at,payload_ciphertext)
  ON app_private.reiki_course_events TO hh_app_backend;
CREATE POLICY reiki_events_self_read ON app_private.reiki_course_events
  FOR SELECT TO hh_app_backend USING(account_id=(select auth.uid()) AND (select app_private.session_active()));
CREATE POLICY reiki_events_authorized_write ON app_private.reiki_course_events
  FOR INSERT TO hh_app_backend WITH CHECK(account_id=(select auth.uid()) AND (select app_private.session_active())
    AND EXISTS (SELECT 1 FROM app_private.academy_course_progress p
                WHERE p.id=enrollment_id AND p.account_id=(select auth.uid()) AND p.messenger_consent));
CREATE POLICY reiki_events_self_delete ON app_private.reiki_course_events
  FOR DELETE TO hh_app_backend USING(account_id=(select auth.uid()) AND (select app_private.session_active()));

-- Telegram Business intake and its Messenger use intentionally different HMAC
-- domains. Capture the exact thread-domain HMAC during the existing verified
-- OIDC pairing. A contact can be reassigned, so contact_id alone is insufficient.
ALTER TABLE app_private.crm_tg_business_service_sessions
  ADD COLUMN crm_thread_account_hash text CHECK (crm_thread_account_hash ~ '^[0-9a-f]{64}$'),
  ADD COLUMN crm_thread_user_hash text CHECK (crm_thread_user_hash ~ '^[0-9a-f]{64}$');
CREATE FUNCTION app_private.reiki_record_business_peer(p_peer text,p_thread_account text,p_thread_user text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $fn$
  UPDATE app_private.crm_tg_business_service_sessions s
  SET crm_thread_account_hash=p_thread_account,crm_thread_user_hash=p_thread_user
  WHERE app_private.session_active() AND s.account_id=auth.uid() AND s.linked_at IS NOT NULL
    AND p_peer=current_setting('hh.telegram_verified_peer_hash',true) AND s.telegram_peer_hash=p_peer
    AND p_thread_account ~ '^[0-9a-f]{64}$' AND p_thread_user ~ '^[0-9a-f]{64}$'
    AND (s.crm_thread_account_hash,s.crm_thread_user_hash) IS DISTINCT FROM (p_thread_account,p_thread_user)
    AND s.stage='submitted' AND s.consent_at IS NOT NULL AND s.contact_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM app_private.crm_tg_business_cabinet_optouts o WHERE o.account_id=s.account_id)
$fn$;
REVOKE ALL ON FUNCTION app_private.reiki_record_business_peer(text,text,text)
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend,hh_app_inbox;
GRANT EXECUTE ON FUNCTION app_private.reiki_record_business_peer(text,text,text) TO hh_app_backend;

-- Internal function only. Candidate membership and peer proof are checked again
-- on every delivery, including after unlink, suppression and owner reassignment.
CREATE FUNCTION app_private.reiki_messenger_destination(p_account uuid)
RETURNS TABLE(owner_id uuid,thread_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
  WITH teacher AS (
    SELECT p.id,p.trusted_auth_user_id AS owner_id
    FROM app.practitioners p
    JOIN app.accounts master ON master.id=p.trusted_auth_user_id AND master.status='active' AND master.onboarding_state='active'
    JOIN app.accounts learner ON learner.id=p_account AND learner.status='active' AND learner.onboarding_state='active'
    WHERE p.id='246aa1a3-a371-5a83-9f4b-cd23ff027a76' AND p.active
      AND p.status IN ('approved','submitted','changes_requested') AND p.public_profile<>'{}'::jsonb
  ), proofs AS (
    SELECT 1 AS priority, t.id AS thread_id FROM teacher
    JOIN app_private.crm_tg_business_service_sessions s ON s.practitioner_id=teacher.id AND s.account_id=p_account
    JOIN app.crm_msg_accounts a ON a.owner_id=teacher.owner_id AND a.channel='telegram'
      AND a.external_hash=s.crm_thread_account_hash AND a.enabled
    JOIN app.crm_msg_threads t ON t.owner_id=a.owner_id AND t.account_id=a.id
      AND t.contact_id=s.contact_id AND t.user_hash=s.crm_thread_user_hash
    WHERE s.stage='submitted' AND s.consent_at IS NOT NULL AND s.linked_at IS NOT NULL AND s.telegram_peer_hash IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM app_private.crm_tg_business_cabinet_optouts o WHERE o.account_id=p_account)
      AND NOT EXISTS (SELECT 1 FROM app_private.crm_tg_business_secretary_optouts o
                      WHERE o.business_hash=s.business_hash AND o.user_hash=s.user_hash)
    UNION ALL
    SELECT 2,t.id FROM teacher
    JOIN app_private.crm_google_telegram_links l ON l.account_id=p_account AND l.crm_owner_id=teacher.owner_id
    JOIN app_private.notification_telegram_links v ON v.account_id=l.account_id AND v.chat_hash=l.chat_hash
    JOIN app.crm_msg_accounts a ON a.owner_id=l.crm_owner_id AND a.channel='telegram' AND a.external_hash=l.crm_bot_hash AND a.enabled
    JOIN app.crm_msg_threads t ON t.owner_id=a.owner_id AND t.account_id=a.id AND t.user_hash=l.crm_user_hash
    JOIN app_private.crm_tg_diagnostic_sessions s ON s.business_hash=a.external_hash AND s.user_hash=t.user_hash
      AND s.consent_at IS NOT NULL AND s.stage<>'stopped'
    UNION ALL
    SELECT 3,t.id FROM teacher
    JOIN app_private.crm_google_whatsapp_links l ON l.account_id=p_account AND l.crm_owner_id=teacher.owner_id
    JOIN app.crm_msg_accounts a ON a.owner_id=l.crm_owner_id AND a.channel='whatsapp' AND a.external_hash=l.business_hash AND a.enabled
    JOIN app.crm_msg_threads t ON t.owner_id=a.owner_id AND t.account_id=a.id AND t.user_hash=l.user_hash
    JOIN app_private.crm_wa_diagnostic_sessions s ON s.business_hash=a.external_hash AND s.user_hash=t.user_hash
      AND s.consent_at IS NOT NULL AND s.stage<>'stopped'
  )
  SELECT t.owner_id,t.id FROM proofs
  JOIN app.crm_msg_threads t ON t.id=proofs.thread_id AND NOT t.suppressed AND t.last_inbound_at IS NOT NULL
  JOIN app.crm_contacts c ON c.id=t.contact_id AND c.owner_id=t.owner_id AND NOT c.suppressed AND c.lifecycle<>'archived'
  GROUP BY t.owner_id,t.id ORDER BY min(proofs.priority),t.id
$fn$;
REVOKE ALL ON FUNCTION app_private.reiki_messenger_destination(uuid)
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend,hh_app_inbox;

CREATE FUNCTION app_private.reiki_messenger_destination()
RETURNS TABLE(owner_id uuid,thread_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
  SELECT d.owner_id,d.thread_id FROM app_private.reiki_messenger_destination(auth.uid()) d
  WHERE auth.uid() IS NOT NULL AND app_private.session_active()
$fn$;
REVOKE ALL ON FUNCTION app_private.reiki_messenger_destination()
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend,hh_app_inbox;
GRANT EXECUTE ON FUNCTION app_private.reiki_messenger_destination() TO hh_app_backend;
COMMIT;
