-- P0 #5152: owner-controlled manual takeover applies to WhatsApp as well
-- as Telegram, using the SAME encrypted CRM thread and hash-scoped RPC.
-- Never authorize public callers, unknown channels or suppressed contacts.
-- Requires existing app.crm_msg_threads.human_takeover_at (20261119023500).
CREATE OR REPLACE FUNCTION app_private.crm_msg_human_takeover_active_v1(
 p_account_hash text,p_user_hash text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $hh$
 SELECT COALESCE(
  p_account_hash ~ '^[a-f0-9]{64}$' AND
  p_user_hash ~ '^[a-f0-9]{64}$' AND
  EXISTS(
    SELECT 1 FROM app.crm_msg_threads t
    JOIN app.crm_msg_accounts a
      ON a.id=t.account_id AND a.owner_id=t.owner_id
    JOIN app.crm_contacts c
      ON c.id=t.contact_id AND c.owner_id=t.owner_id
    WHERE a.channel IN ('telegram','whatsapp') AND a.enabled IS TRUE
      AND a.external_hash=p_account_hash AND t.user_hash=p_user_hash
      AND t.human_takeover_at IS NOT NULL
      AND t.suppressed IS FALSE AND c.suppressed IS FALSE
      AND c.lifecycle<>'archived'
  ),false)
$hh$;
REVOKE ALL ON FUNCTION app_private.crm_msg_human_takeover_active_v1(text,text)
 FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.crm_msg_human_takeover_active_v1(text,text)
 TO hh_app_inbox;
