-- Add a distinct contact-only, messenger-first route to the existing
-- signed Telegram CRM session. The diagnostic questionnaire is unchanged.
-- There are no new provider credentials, recipients, grants or marketing consents.
ALTER TABLE app_private.crm_tg_diagnostic_sessions
 ADD COLUMN chat_mode text NOT NULL DEFAULT 'diagnostic'
 CONSTRAINT crm_tg_diagnostic_sessions_chat_mode_check
 CHECK(chat_mode IN ('diagnostic','direct'));
COMMENT ON COLUMN app_private.crm_tg_diagnostic_sessions.chat_mode
 IS 'diagnostic: existing questionnaire; direct: owner messenger-first /agree text conversation. Consent and STOP use the existing signed webhook and encrypted CRM.';

-- A signed Telegram webhook must never bypass a master/client block just
-- because the consent stage still says "done". Return only a Boolean,
-- without exposing a contact, chat ID, message or any user information.
CREATE FUNCTION app_private.hh_crm_direct_contact_suppressed(
 p_bot_hash text,p_user_hash text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $hh$
 SELECT CASE WHEN p_bot_hash ~ '^[a-f0-9]{64}$'
                 AND p_user_hash ~ '^[a-f0-9]{64}$'
  THEN EXISTS (
    SELECT 1
    FROM app.crm_msg_accounts a
    JOIN app.crm_msg_threads t ON t.account_id=a.id AND t.owner_id=a.owner_id
    JOIN app.crm_contacts c ON c.id=t.contact_id AND c.owner_id=t.owner_id
    WHERE a.channel='telegram' AND a.enabled IS TRUE
      AND a.external_hash=p_bot_hash AND t.user_hash=p_user_hash
      AND (t.suppressed OR c.suppressed OR c.lifecycle='archived')
  )
  ELSE TRUE END
$hh$;
REVOKE ALL ON FUNCTION app_private.hh_crm_direct_contact_suppressed(text,text)
 FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.hh_crm_direct_contact_suppressed(text,text)
 TO hh_app_inbox;
COMMENT ON FUNCTION app_private.hh_crm_direct_contact_suppressed(text,text)
 IS 'Boolean-only owner Telegram signed-webhook guard; blocks suppressed/archived CRM recipients without exposing identities.';
