-- HH Messenger-first: a verified Telegram CRM conversation is the canonical
-- customer / practitioner thread for the first-party Cabinet. No new chat table,
-- no provider credentials, no marketing opt-in, no webhook changes.
-- All three functions are private, FORCE-RLS-compatible, and only callable
-- through hh_app_backend with a verified live auth.sessions JWT.
CREATE FUNCTION app_private.hh_messenger_self_thread()
RETURNS TABLE(
  thread_id uuid, owner_id uuid, practitioner_slug text,
  practitioner_name text, last_message_at timestamptz, can_send boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $hh$
 SELECT t.id,t.owner_id,p.slug,
        COALESCE(NULLIF(pg_catalog.btrim(p.public_profile->>'displayName'),''),p.slug),
        t.last_message_at,
        (t.suppressed IS FALSE AND s.consent_at IS NOT NULL
         AND s.stage <> 'stopped') AS can_send
 FROM app_private.crm_google_telegram_links l
 JOIN app_private.notification_telegram_links verified
   ON verified.account_id=l.account_id AND verified.chat_hash=l.chat_hash
 JOIN app.accounts member
   ON member.id=l.account_id AND member.status='active'
      AND member.onboarding_state='active'
 JOIN app.accounts master
   ON master.id=l.crm_owner_id AND master.status='active'
      AND master.onboarding_state='active'
 JOIN app.crm_msg_accounts bot
   ON bot.owner_id=l.crm_owner_id AND bot.channel='telegram'
      AND bot.external_hash=l.crm_bot_hash AND bot.enabled IS TRUE
 JOIN app.crm_msg_threads t
   ON t.account_id=bot.id AND t.owner_id=l.crm_owner_id
      AND t.user_hash=l.crm_user_hash
 JOIN app.practitioners p
   ON p.trusted_auth_user_id=l.crm_owner_id AND p.active IS TRUE
      AND p.status IN ('approved','submitted','changes_requested')
      AND p.public_profile <> '{}'::jsonb
 LEFT JOIN app_private.crm_tg_diagnostic_sessions s
   ON s.business_hash=l.crm_bot_hash AND s.user_hash=l.crm_user_hash
 WHERE l.account_id=auth.uid() AND auth.uid() IS NOT NULL
       AND app_private.session_active()
 ORDER BY t.last_message_at DESC, p.slug
 LIMIT 1
$hh$;
REVOKE ALL ON FUNCTION app_private.hh_messenger_self_thread()
 FROM PUBLIC,anon,authenticated,service_role,hh_app_inbox,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.hh_messenger_self_thread()
 TO hh_app_backend;

-- The client sees only its own provider-backed CRM messages. Owner-only
-- CRM notes, undelivered replies, recipient IDs and private media refs are
-- NEVER projected. Ciphertext is decrypted only by the first-party server.
CREATE FUNCTION app_private.hh_messenger_self_messages(
 p_thread uuid,p_before_at timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL)
RETURNS TABLE(
 message_id uuid,direction text,status text,body_ciphertext text,
 created_at timestamptz,at_cursor text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $hh$
 SELECT i.id,i.direction,i.status,i.body_ciphertext,i.created_at,i.created_at::text
 FROM app_private.hh_messenger_self_thread() allowed
 JOIN app.crm_msg_items i
   ON i.thread_id=allowed.thread_id AND i.owner_id=allowed.owner_id
 WHERE allowed.thread_id=p_thread
   AND i.direction IN ('in','out')
   AND (i.direction='in' OR i.status IN ('accepted','delivered','read'))
   AND (p_before_at IS NULL OR
     (i.created_at,i.id)<(p_before_at,p_before_id))
 ORDER BY i.created_at DESC,i.id DESC LIMIT 51
$hh$;
REVOKE ALL ON FUNCTION app_private.hh_messenger_self_messages(uuid,timestamptz,uuid)
 FROM PUBLIC,anon,authenticated,service_role,hh_app_inbox,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.hh_messenger_self_messages(uuid,timestamptz,uuid)
 TO hh_app_backend;

-- A Cabinet send is appended as a customer inbound to the SAME CRM thread.
-- It cannot reopen a STOPped chat, refresh the WhatsApp provider window,
-- create a different contact or generate a provider outbound send.
-- The server authenticates the author and seals the message with the same
-- CRM per-message context used by Telegram webhook ingestion.
CREATE FUNCTION app_private.hh_messenger_self_send(
 p_thread uuid,p_message_id uuid,p_body_ciphertext text,p_request_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $hh$
DECLARE v_owner uuid; v_allowed boolean; v_prior record; v_count integer;
BEGIN
 IF auth.uid() IS NULL OR NOT app_private.session_active() THEN
  RAISE EXCEPTION 'MESSENGER_SIGN_IN_REQUIRED' USING ERRCODE='42501';
 END IF;
 IF p_thread IS NULL OR p_message_id IS NULL OR
    p_body_ciphertext IS NULL OR pg_catalog.length(p_body_ciphertext) NOT BETWEEN 24 AND 16384
    OR p_request_hash IS NULL OR p_request_hash !~ '^[0-9a-f]{64}$' THEN
  RAISE EXCEPTION 'MESSENGER_INVALID_MESSAGE' USING ERRCODE='22023';
 END IF;
 -- A lock serializes customer send / duplicate checks for this exact thread.
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('hh-cabinet-crm:'||p_thread::text,0));
 SELECT t.owner_id,t.can_send INTO v_owner,v_allowed
  FROM app_private.hh_messenger_self_thread() t WHERE t.thread_id=p_thread;
 IF v_owner IS NULL OR v_allowed IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'MESSENGER_VERIFICATION_REQUIRED' USING ERRCODE='42501';
 END IF;
 -- Do not allow the client to overwrite/impersonate a provider message ID.
 SELECT i.owner_id,i.thread_id,i.direction,i.request_hash
   INTO v_prior FROM app.crm_msg_items i WHERE i.id=p_message_id;
 IF FOUND THEN
  IF v_prior.owner_id<>v_owner OR v_prior.thread_id<>p_thread OR
     v_prior.direction<>'in' OR v_prior.request_hash IS DISTINCT FROM p_request_hash THEN
    RAISE EXCEPTION 'MESSENGER_MESSAGE_CONFLICT' USING ERRCODE='23505';
  END IF;
  RETURN false;
 END IF;
 SELECT pg_catalog.count(*)::int INTO v_count FROM app.crm_msg_items i
 WHERE i.owner_id=v_owner AND i.thread_id=p_thread AND i.direction='in'
  AND i.request_hash IS NOT NULL
  AND i.created_at > now()-interval '24 hours';
 IF v_count>=40 THEN
  RAISE EXCEPTION 'MESSENGER_RATE_LIMITED' USING ERRCODE='22023';
 END IF;
 INSERT INTO app.crm_msg_items(
  id,owner_id,thread_id,direction,status,body_ciphertext,request_hash)
 VALUES(p_message_id,v_owner,p_thread,'in','received',
        p_body_ciphertext,p_request_hash);
 UPDATE app.crm_msg_threads
 SET unread_count=unread_count+1,last_message_at=now()
 WHERE id=p_thread AND owner_id=v_owner;
 RETURN true;
END
$hh$;
REVOKE ALL ON FUNCTION app_private.hh_messenger_self_send(uuid,uuid,text,text)
 FROM PUBLIC,anon,authenticated,service_role,hh_app_inbox,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.hh_messenger_self_send(uuid,uuid,text,text)
 TO hh_app_backend;
