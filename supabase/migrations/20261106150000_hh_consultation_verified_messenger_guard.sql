-- Messenger-first v2: consultation threads cannot bypass verified provider identity.
-- Preserve historic messages and private practitioner notes. No data changes.
-- The proof is the SAME signed Telegram/CRM/account binding used by the
-- canonical Cabinet bridge. Never infer identity from phone, email or username.
CREATE FUNCTION app_private.hh_consultation_messenger_verified(p_request uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $hh$
 SELECT p_request IS NOT NULL
   AND auth.uid() IS NOT NULL
   AND app_private.session_active()
   AND EXISTS (
     SELECT 1
       FROM app.consultation_requests r
       JOIN app.practitioners p
         ON p.id = r.recipient_practitioner_id
       JOIN app_private.crm_google_telegram_links l
         ON l.account_id = r.account_id
        AND l.crm_owner_id = p.trusted_auth_user_id
       JOIN app_private.notification_telegram_links verified
         ON verified.account_id = r.account_id
        AND verified.chat_hash = l.chat_hash
       JOIN app.crm_msg_accounts bot
         ON bot.owner_id = l.crm_owner_id
        AND bot.channel = 'telegram'
        AND bot.external_hash = l.crm_bot_hash
        AND bot.enabled IS TRUE
       JOIN app.crm_msg_threads t
         ON t.account_id = bot.id
        AND t.owner_id = bot.owner_id
        AND t.user_hash = l.crm_user_hash
        AND t.suppressed IS FALSE
       JOIN app.crm_contacts c
         ON c.id = t.contact_id
        AND c.owner_id = t.owner_id
        AND c.suppressed IS FALSE
       JOIN app_private.crm_tg_diagnostic_sessions s
         ON s.business_hash = l.crm_bot_hash
        AND s.user_hash = l.crm_user_hash
        AND s.consent_at IS NOT NULL
        AND s.stage <> 'stopped'
       JOIN app.accounts customer
         ON customer.id = r.account_id
        AND customer.status = 'active'
        AND customer.onboarding_state = 'active'
       JOIN app.accounts master
         ON master.id = p.trusted_auth_user_id
        AND master.status = 'active'
        AND master.onboarding_state = 'active'
     WHERE r.id = p_request
       AND p.active IS TRUE
       AND p.status IN ('approved','submitted','changes_requested')
       AND p.trusted_auth_user_id IS NOT NULL
       -- Reads may show old history, but sends are only permitted to participants.
       AND auth.uid() IN (r.account_id,p.trusted_auth_user_id)
   )
$hh$;
REVOKE ALL ON FUNCTION app_private.hh_consultation_messenger_verified(uuid)
 FROM PUBLIC,anon,authenticated,service_role,hh_app_inbox,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.hh_consultation_messenger_verified(uuid)
 TO hh_app_backend;
COMMENT ON FUNCTION app_private.hh_consultation_messenger_verified(uuid)
 IS 'Private fail-closed participant send guard: verified Telegram identity, consent, active owner and same master CRM thread; does not create a conversation.';
