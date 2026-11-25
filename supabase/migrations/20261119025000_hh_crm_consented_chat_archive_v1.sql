-- HH CRM #5073: future transcript opt-in is independent of diagnostic AI
-- consent, marketing, messenger verification and the owner handoff state.
ALTER TABLE app.crm_msg_threads
 ADD COLUMN IF NOT EXISTS transcript_shared_at timestamptz,
 ADD COLUMN IF NOT EXISTS transcript_nudge_at timestamptz;

-- Only a verified, signed Telegram Bot webhook role can record the client's
-- /share_chat or /stop_share. No public or browser callable RPC exists.
CREATE OR REPLACE FUNCTION app_private.crm_msg_bot_chat_mode_v1(
 p_account_hash text,p_user_hash text,p_action text)
RETURNS TABLE(is_manual boolean,is_shared boolean,should_prompt boolean,owner_id uuid)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $hh$
DECLARE v_id uuid;v_owner uuid;v_manual timestamptz;
 v_shared timestamptz;v_nudge timestamptz;v_prompt boolean:=false;
BEGIN
 IF p_action NOT IN ('peek','share_on','share_off','nudge') OR
    p_account_hash !~ '^[a-f0-9]{64}$' OR p_user_hash !~ '^[a-f0-9]{64}$'
 THEN RETURN; END IF;
 SELECT t.id,t.owner_id,t.human_takeover_at,t.transcript_shared_at,t.transcript_nudge_at
  INTO v_id,v_owner,v_manual,v_shared,v_nudge
 FROM app.crm_msg_threads t
 JOIN app.crm_msg_accounts a ON a.id=t.account_id AND a.owner_id=t.owner_id
 JOIN app.crm_contacts c ON c.id=t.contact_id AND c.owner_id=t.owner_id
 WHERE a.channel='telegram' AND a.enabled IS TRUE AND a.external_hash=p_account_hash
   AND t.user_hash=p_user_hash AND t.suppressed IS FALSE
   AND c.suppressed IS FALSE AND c.lifecycle<>'archived'
 FOR UPDATE OF t;
 IF v_id IS NULL THEN
  RETURN QUERY SELECT false,false,false,NULL::uuid;RETURN;
 END IF;
 IF p_action='share_on' THEN
  UPDATE app.crm_msg_threads SET transcript_shared_at=now()
   WHERE id=v_id AND owner_id=v_owner
   RETURNING transcript_shared_at INTO v_shared;
 ELSIF p_action='share_off' THEN
  UPDATE app.crm_msg_threads SET transcript_shared_at=NULL
   WHERE id=v_id AND owner_id=v_owner;
  v_shared:=NULL;
 ELSIF p_action='nudge' AND v_manual IS NOT NULL AND v_shared IS NULL
   AND (v_nudge IS NULL OR v_nudge<now()-interval '1 day') THEN
  UPDATE app.crm_msg_threads SET transcript_nudge_at=now()
   WHERE id=v_id AND owner_id=v_owner;
  v_prompt:=true;
 END IF;
 RETURN QUERY SELECT v_manual IS NOT NULL,v_shared IS NOT NULL,v_prompt,v_owner;
END
$hh$;
REVOKE ALL ON FUNCTION app_private.crm_msg_bot_chat_mode_v1(text,text,text)
 FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.crm_msg_bot_chat_mode_v1(text,text,text)
 TO hh_app_inbox;

CREATE OR REPLACE FUNCTION app_private.crm_msg_bot_archive_reply_v1(
 p_account_hash text,p_user_hash text,p_id uuid,p_body_ciphertext text,
 p_provider_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $hh$
DECLARE v_thread uuid;v_owner uuid;v_count integer;
BEGIN
 IF p_account_hash !~ '^[a-f0-9]{64}$' OR
    p_user_hash !~ '^[a-f0-9]{64}$' OR
    p_provider_hash !~ '^[a-f0-9]{64}$' OR
    p_id IS NULL OR p_body_ciphertext IS NULL OR
    pg_catalog.length(p_body_ciphertext) NOT BETWEEN 30 AND 45000
 THEN RETURN false;END IF;
 SELECT t.id,t.owner_id INTO v_thread,v_owner
 FROM app.crm_msg_threads t
 JOIN app.crm_msg_accounts a ON a.id=t.account_id AND a.owner_id=t.owner_id
 JOIN app.crm_contacts c ON c.id=t.contact_id AND c.owner_id=t.owner_id
 WHERE a.channel='telegram' AND a.enabled IS TRUE
   AND a.external_hash=p_account_hash AND t.user_hash=p_user_hash
   AND t.transcript_shared_at IS NOT NULL AND t.human_takeover_at IS NULL
   AND t.suppressed IS FALSE AND c.suppressed IS FALSE
   AND c.lifecycle<>'archived'
 FOR UPDATE OF t;
 IF v_thread IS NULL THEN RETURN false;END IF;
 INSERT INTO app.crm_msg_items(id,owner_id,thread_id,direction,status,
  body_ciphertext,provider_hash)
 VALUES(p_id,v_owner,v_thread,'out','accepted',p_body_ciphertext,p_provider_hash)
 ON CONFLICT (thread_id,provider_hash) DO NOTHING;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 IF v_count=1 THEN
  UPDATE app.crm_msg_threads SET last_message_at=now()
   WHERE id=v_thread AND owner_id=v_owner;
 END IF;
 RETURN v_count=1;
END
$hh$;
REVOKE ALL ON FUNCTION app_private.crm_msg_bot_archive_reply_v1(text,text,uuid,text,text)
 FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.crm_msg_bot_archive_reply_v1(text,text,uuid,text,text)
 TO hh_app_inbox;
