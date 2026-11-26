-- Reconcile authorized course history whichever arrives last: the verified
-- identity link, a provider's consent, or the existing inbound conversation.
BEGIN;
CREATE FUNCTION app_private.reiki_on_link_ready()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
  IF NEW.account_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM app_private.academy_course_progress p
    WHERE p.account_id=NEW.account_id AND p.messenger_consent
  ) THEN
    PERFORM app_private.reconcile_reiki_messenger(NEW.account_id);
  END IF;
  RETURN NULL;
END $fn$;
REVOKE ALL ON FUNCTION app_private.reiki_on_link_ready()
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend,hh_app_inbox;
CREATE TRIGGER reiki_telegram_link_ready AFTER INSERT OR UPDATE ON app_private.crm_google_telegram_links
  FOR EACH ROW EXECUTE FUNCTION app_private.reiki_on_link_ready();
CREATE TRIGGER reiki_whatsapp_link_ready AFTER INSERT OR UPDATE ON app_private.crm_google_whatsapp_links
  FOR EACH ROW EXECUTE FUNCTION app_private.reiki_on_link_ready();
CREATE TRIGGER reiki_business_link_ready AFTER UPDATE OF account_id,linked_at,crm_thread_user_hash,stage
  ON app_private.crm_tg_business_service_sessions FOR EACH ROW
  WHEN (NEW.account_id IS NOT NULL AND NEW.crm_thread_user_hash IS NOT NULL AND NEW.stage='submitted')
  EXECUTE FUNCTION app_private.reiki_on_link_ready();

CREATE FUNCTION app_private.reiki_on_chat_ready()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
  target_channel text;
  account_hash text;
  peer_hash text;
  candidate uuid;
BEGIN
  IF TG_TABLE_NAME='crm_msg_threads' THEN
    SELECT a.channel,a.external_hash INTO target_channel,account_hash
      FROM app.crm_msg_accounts a WHERE a.id=NEW.account_id AND a.enabled;
    peer_hash:=NEW.user_hash;
  ELSE
    target_channel:=CASE TG_TABLE_NAME WHEN 'crm_tg_diagnostic_sessions' THEN 'telegram' ELSE 'whatsapp' END;
    account_hash:=NEW.business_hash;
    peer_hash:=NEW.user_hash;
  END IF;
  FOR candidate IN
    SELECT p.account_id FROM app_private.academy_course_progress p JOIN (
      SELECT l.account_id FROM app_private.crm_google_telegram_links l
       WHERE target_channel='telegram' AND l.crm_bot_hash=account_hash AND l.crm_user_hash=peer_hash
      UNION
      SELECT l.account_id FROM app_private.crm_google_whatsapp_links l
       WHERE target_channel='whatsapp' AND l.business_hash=account_hash AND l.user_hash=peer_hash
      UNION
      SELECT s.account_id FROM app_private.crm_tg_business_service_sessions s
       WHERE target_channel='telegram' AND s.crm_thread_user_hash=peer_hash AND s.account_id IS NOT NULL
    ) links ON links.account_id=p.account_id
    WHERE p.messenger_consent ORDER BY p.account_id
  LOOP
    PERFORM app_private.reconcile_reiki_messenger(candidate);
  END LOOP;
  RETURN NULL;
END $fn$;
REVOKE ALL ON FUNCTION app_private.reiki_on_chat_ready()
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend,hh_app_inbox;
CREATE INDEX reiki_business_thread_proof ON app_private.crm_tg_business_service_sessions(crm_thread_user_hash)
  WHERE crm_thread_user_hash IS NOT NULL AND account_id IS NOT NULL;
CREATE TRIGGER reiki_inbound_thread_created AFTER INSERT ON app.crm_msg_threads
  FOR EACH ROW WHEN (NEW.last_inbound_at IS NOT NULL AND NOT NEW.suppressed)
  EXECUTE FUNCTION app_private.reiki_on_chat_ready();
CREATE TRIGGER reiki_first_inbound_confirmed AFTER UPDATE OF last_inbound_at ON app.crm_msg_threads
  FOR EACH ROW WHEN (OLD.last_inbound_at IS NULL AND NEW.last_inbound_at IS NOT NULL AND NOT NEW.suppressed)
  EXECUTE FUNCTION app_private.reiki_on_chat_ready();
CREATE TRIGGER reiki_telegram_consent_created AFTER INSERT ON app_private.crm_tg_diagnostic_sessions
  FOR EACH ROW WHEN (NEW.consent_at IS NOT NULL AND NEW.stage<>'stopped')
  EXECUTE FUNCTION app_private.reiki_on_chat_ready();
CREATE TRIGGER reiki_telegram_consent_ready AFTER UPDATE OF consent_at,stage ON app_private.crm_tg_diagnostic_sessions
  FOR EACH ROW WHEN ((OLD.consent_at IS NULL OR OLD.stage='stopped') AND NEW.consent_at IS NOT NULL AND NEW.stage<>'stopped')
  EXECUTE FUNCTION app_private.reiki_on_chat_ready();
CREATE TRIGGER reiki_whatsapp_consent_created AFTER INSERT ON app_private.crm_wa_diagnostic_sessions
  FOR EACH ROW WHEN (NEW.consent_at IS NOT NULL AND NEW.stage<>'stopped')
  EXECUTE FUNCTION app_private.reiki_on_chat_ready();
CREATE TRIGGER reiki_whatsapp_consent_ready AFTER UPDATE OF consent_at,stage ON app_private.crm_wa_diagnostic_sessions
  FOR EACH ROW WHEN ((OLD.consent_at IS NULL OR OLD.stage='stopped') AND NEW.consent_at IS NOT NULL AND NEW.stage<>'stopped')
  EXECUTE FUNCTION app_private.reiki_on_chat_ready();
COMMIT;
