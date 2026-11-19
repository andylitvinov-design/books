-- A manual CRM reply accepted by Telegram pauses AI for 48 hours in that
-- same verified owner/thread. Both bot and Business reuse this one read-only
-- boolean bridge. No raw Telegram IDs, text, photos, tokens or broad table grants.
BEGIN;
CREATE OR REPLACE FUNCTION app_private.crm_msg_human_reply_recent(
 p_account_hash text,p_user_hash text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $fn$
 SELECT coalesce(
   p_account_hash ~ '^[a-f0-9]{64}$' AND
   p_user_hash ~ '^[a-f0-9]{64}$' AND
   EXISTS(
     SELECT 1 FROM app.crm_msg_accounts a
     JOIN app.accounts owner_account ON owner_account.id=a.owner_id
       AND owner_account.status='active'
     JOIN app.crm_msg_threads t ON t.account_id=a.id AND t.owner_id=a.owner_id
     JOIN app.crm_contacts c ON c.id=t.contact_id AND c.owner_id=t.owner_id
     JOIN app.crm_msg_items i ON i.thread_id=t.id AND i.owner_id=t.owner_id
     WHERE a.channel='telegram' AND a.enabled
       AND a.external_hash=p_account_hash AND t.user_hash=p_user_hash
       AND NOT t.suppressed AND NOT c.suppressed AND c.lifecycle<>'archived'
       AND i.direction='out' AND i.campaign_id IS NULL
       AND i.request_hash IS NOT NULL -- only owner-initiated CRM sends; never archived bot replies
       AND i.status IN ('accepted','delivered','read')
       AND i.created_at > pg_catalog.now()-interval '48 hours'
   ),false);
$fn$;
REVOKE ALL ON FUNCTION app_private.crm_msg_human_reply_recent(text,text)
 FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.crm_msg_human_reply_recent(text,text)
 TO hh_app_inbox;
COMMENT ON FUNCTION app_private.crm_msg_human_reply_recent(text,text)
 IS 'Owner manual CRM reply accepted within 48 hours; private boolean handoff for signed Telegram webhook; no sensitive content.';
COMMIT;
