-- Verified Google ↔ Telegram CRM identity. No marketing or provider dispatch.
CREATE TABLE app_private.crm_google_telegram_links (
 account_id uuid PRIMARY KEY REFERENCES app_private.notification_telegram_links(account_id) ON DELETE CASCADE,
 crm_owner_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
 chat_hash text NOT NULL CHECK(chat_hash ~ '^[0-9a-f]{64}$'),
 crm_bot_hash text NOT NULL CHECK(crm_bot_hash ~ '^[0-9a-f]{64}$'),
 crm_user_hash text NOT NULL CHECK(crm_user_hash ~ '^[0-9a-f]{64}$'),
 notice_version text NOT NULL DEFAULT 'hh-telegram-google-crm-link-v1'
  CHECK(notice_version = 'hh-telegram-google-crm-link-v1'),
 linked_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(crm_bot_hash,crm_user_hash)
);
CREATE INDEX crm_google_telegram_owner_lookup
 ON app_private.crm_google_telegram_links(crm_owner_id,crm_bot_hash,crm_user_hash);
ALTER TABLE app_private.crm_google_telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.crm_google_telegram_links FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.crm_google_telegram_links FROM PUBLIC,anon,authenticated,hh_app_inbox;
GRANT SELECT,DELETE ON app_private.crm_google_telegram_links TO hh_app_backend;
GRANT SELECT ON app_private.crm_google_telegram_links TO hh_crm_backend;
CREATE POLICY crm_google_telegram_self_read ON app_private.crm_google_telegram_links FOR SELECT
 TO hh_app_backend USING(account_id=(select auth.uid()) AND (select app_private.session_active()));
CREATE POLICY crm_google_telegram_self_delete ON app_private.crm_google_telegram_links FOR DELETE
 TO hh_app_backend USING(account_id=(select auth.uid()) AND (select app_private.session_active()));
CREATE POLICY crm_google_telegram_owner_read ON app_private.crm_google_telegram_links FOR SELECT
 TO hh_crm_backend USING(crm_owner_id=(select auth.uid()) AND (select app_private.account_active()));
CREATE FUNCTION app_private.crm_google_link_verified_self(
 p_chat_hash text,p_bot_hash text,p_user_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_account uuid := auth.uid(); v_owner uuid;
BEGIN
 IF v_account IS NULL OR p_chat_hash !~ '^[0-9a-f]{64}$' OR
    p_bot_hash !~ '^[0-9a-f]{64}$' OR p_user_hash !~ '^[0-9a-f]{64}$' OR
    NOT app_private.session_active() THEN RETURN false; END IF;
 IF NOT EXISTS(
   SELECT 1 FROM app_private.notification_telegram_links link
   JOIN app.accounts client ON client.id=link.account_id
   WHERE link.account_id=v_account AND link.chat_hash=p_chat_hash
     AND client.status='active' AND client.onboarding_state='active'
 ) THEN RETURN false; END IF;
 SELECT bot.owner_id INTO v_owner FROM app.crm_msg_accounts bot
 JOIN app.accounts owner_account ON owner_account.id=bot.owner_id
 WHERE bot.channel='telegram' AND bot.enabled AND bot.external_hash=p_bot_hash
   AND owner_account.status='active' AND owner_account.onboarding_state='active' LIMIT 1;
 IF v_owner IS NULL THEN RETURN false; END IF;
 INSERT INTO app_private.crm_google_telegram_links
 (account_id,crm_owner_id,chat_hash,crm_bot_hash,crm_user_hash,notice_version)
 VALUES(v_account,v_owner,p_chat_hash,p_bot_hash,p_user_hash,'hh-telegram-google-crm-link-v1')
 ON CONFLICT(account_id) DO UPDATE SET
  crm_owner_id=excluded.crm_owner_id,chat_hash=excluded.chat_hash,
  crm_bot_hash=excluded.crm_bot_hash,crm_user_hash=excluded.crm_user_hash,
  linked_at=now(),notice_version=excluded.notice_version;
 RETURN true;
EXCEPTION WHEN unique_violation THEN RETURN false;
END $fn$;
REVOKE ALL ON FUNCTION app_private.crm_google_link_verified_self(text,text,text)
 FROM PUBLIC,anon,authenticated,hh_app_inbox,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.crm_google_link_verified_self(text,text,text) TO hh_app_backend;
-- A newly verified Telegram identity invalidates the prior account-to-CRM link.
CREATE FUNCTION app_private.crm_google_revoke_on_chat_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
 DELETE FROM app_private.crm_google_telegram_links
  WHERE account_id=OLD.account_id AND chat_hash=OLD.chat_hash;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION app_private.crm_google_revoke_on_chat_change()
 FROM PUBLIC,anon,authenticated,hh_app_backend,hh_crm_backend,hh_app_inbox;
CREATE TRIGGER crm_google_verified_chat_changed
 AFTER UPDATE OF chat_hash ON app_private.notification_telegram_links
 FOR EACH ROW WHEN (OLD.chat_hash IS DISTINCT FROM NEW.chat_hash)
 EXECUTE FUNCTION app_private.crm_google_revoke_on_chat_change();
