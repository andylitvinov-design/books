-- #5152: accepted WhatsApp Ali replies belong in one protected CRM thread.
-- Neutral unconsented enquiries are NOT a license to store bot/chat content.
-- Requires existing FORCE-RLS WhatsApp diagnostic consent/session + CRM tables.
CREATE OR REPLACE FUNCTION app_private.crm_msg_wa_archive_ali_reply_v1(
 p_account_hash text,p_user_hash text,p_id uuid,p_body_ciphertext text,p_provider_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $hh$
DECLARE v_thread uuid;v_owner uuid;v_account uuid;v_count integer;v_receipt text;
BEGIN
 IF p_account_hash !~ '^[a-f0-9]{64}$' OR p_user_hash !~ '^[a-f0-9]{64}$' OR
    p_provider_hash !~ '^[a-f0-9]{64}$' OR p_id IS NULL OR
    p_body_ciphertext IS NULL OR
    pg_catalog.length(p_body_ciphertext) NOT BETWEEN 30 AND 45000
 THEN RETURN false;END IF;
 SELECT t.id,t.owner_id,t.account_id INTO v_thread,v_owner,v_account
 FROM app.crm_msg_threads t
 JOIN app.crm_msg_accounts a ON a.id=t.account_id AND a.owner_id=t.owner_id
 JOIN app.accounts o ON o.id=a.owner_id AND o.status='active'
 JOIN app.crm_contacts c ON c.id=t.contact_id AND c.owner_id=t.owner_id
 WHERE a.channel='whatsapp' AND a.enabled IS TRUE
   AND a.external_hash=p_account_hash AND t.user_hash=p_user_hash
   AND t.human_takeover_at IS NULL AND t.suppressed IS FALSE
   AND c.suppressed IS FALSE AND c.lifecycle<>'archived'
   AND EXISTS(
     SELECT 1 FROM app_private.crm_wa_diagnostic_sessions s
     WHERE s.business_hash=p_account_hash AND s.user_hash=p_user_hash
       AND s.consent_at IS NOT NULL
       AND s.stage IN ('focus','photo','question','drawing','done')
   )
 FOR UPDATE OF t;
 IF v_thread IS NULL THEN RETURN false;END IF;
 INSERT INTO app.crm_msg_items(id,owner_id,thread_id,direction,status,
   body_ciphertext,provider_hash)
 VALUES(p_id,v_owner,v_thread,'out','accepted',p_body_ciphertext,p_provider_hash)
 ON CONFLICT (thread_id,provider_hash) DO NOTHING;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 IF v_count<>1 THEN RETURN false;END IF;
 -- A genuine signed Meta status callback can race the HTTP Send response.
 -- Retain an earlier trusted status instead of incorrectly displaying accepted.
 SELECT r.status INTO v_receipt FROM app.crm_msg_receipts r
  WHERE r.owner_id=v_owner AND r.account_id=v_account
    AND r.provider_hash=p_provider_hash
    AND r.status IN ('delivered','read','failed')
  ORDER BY r.received_at DESC LIMIT 1;
 IF v_receipt IS NOT NULL THEN
   UPDATE app.crm_msg_items SET status=v_receipt,updated_at=now()
   WHERE id=p_id AND owner_id=v_owner;
 END IF;
 UPDATE app.crm_msg_threads SET last_message_at=now()
 WHERE id=v_thread AND owner_id=v_owner;
 RETURN true;
END
$hh$;
REVOKE ALL ON FUNCTION app_private.crm_msg_wa_archive_ali_reply_v1(text,text,uuid,text,text)
 FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.crm_msg_wa_archive_ali_reply_v1(text,text,uuid,text,text)
 TO hh_app_inbox;
