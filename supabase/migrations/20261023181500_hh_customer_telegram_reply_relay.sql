-- P1: private Telegram reply -> existing consultation messages.
-- DORMANT until an owner-approved verified bot, linking and dispatch are E2E-proven.
-- No plaintext, no phone/chat ID in database, no new external sends.
-- Preserve previous dispatch_finish 3-argument API for historical deployments.
ALTER TABLE app_private.notification_telegram_dispatch
 ADD COLUMN recipient_chat_hash text
 CHECK(recipient_chat_hash IS NULL OR recipient_chat_hash ~ '^[0-9a-f]{64}$');

CREATE OR REPLACE FUNCTION app_private.notification_tg_dispatch_finish_bound(
 p_message_id uuid,p_status text,p_provider_message_id text,p_chat_hash text)
 RETURNS boolean
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
declare changed integer;
begin
 if p_status NOT IN ('accepted','failed','suppressed')
   or (p_status='accepted' and (p_provider_message_id !~ '^[1-9][0-9]{0,15}$'
     or p_chat_hash !~ '^[0-9a-f]{64}$'))
   or (p_status<>'accepted' and p_provider_message_id is not null)
 then return false; end if;
 -- Bind the actual recipient identity used by the Bot API to THIS dispatch.
 -- A later /stop or re-pair never authorizes a reply in another chat.
 update app_private.notification_telegram_dispatch d
 set state=p_status,
     provider_message_id=case when p_status='accepted' then p_provider_message_id else null end,
     recipient_chat_hash=case when p_status='accepted' then p_chat_hash else null end,
     updated_at=now()
 where d.message_id=p_message_id and d.state='claimed'
   and (p_status<>'accepted' or exists(
     select 1 from app_private.notification_telegram_links l
     where l.account_id=d.account_id and l.chat_hash=p_chat_hash
       and l.consent_version='hh-tg-message-alerts-v1'));
 get diagnostics changed=row_count;
 return changed=1;
end
$fn$;

CREATE OR REPLACE FUNCTION app_private.notification_tg_reply_target(
 p_chat_hash text,p_notice_message_id text)
 RETURNS TABLE(request_id uuid,account_id uuid)
 LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $fn$
 select r.id,r.account_id
 from app_private.notification_telegram_dispatch d
 join app_private.notification_telegram_links l
   on l.account_id=d.account_id and l.chat_hash=d.recipient_chat_hash
 join app_private.notification_messenger_requests n
   on n.account_id=l.account_id and n.channel='telegram'
 join app.consultation_requests r
   on r.id=d.request_id and r.account_id=d.account_id
 join app.practitioner_request_messages m
   on m.id=d.message_id and m.request_id=r.id
 join app.practitioners p
   on p.id=r.recipient_practitioner_id
 join app.accounts a on a.id=r.account_id
 where p_chat_hash ~ '^[0-9a-f]{64}$'
   and p_notice_message_id ~ '^[1-9][0-9]{0,15}$'
   and l.chat_hash=p_chat_hash
   and d.state='accepted' and d.provider_message_id=p_notice_message_id
   and d.updated_at >= now()-interval '30 days'
   and l.consent_version='hh-tg-message-alerts-v1'
   and n.consent_version='hh-messenger-contact-v1' and n.topics->>'messages'='true'
   and a.status='active' and a.onboarding_state='active'
   and p.active=true and p.status in ('approved','submitted','changes_requested')
   and r.status in ('requested','contacted')
   and m.visibility='participants' and m.author_role='practitioner'
   and m.author_account_id=p.trusted_auth_user_id
 limit 1
$fn$;

CREATE OR REPLACE FUNCTION app_private.notification_tg_reply_commit(
 p_chat_hash text,p_notice_message_id text,p_request_id uuid,p_requester_id uuid,
 p_message_id uuid,p_body_ciphertext text)
 RETURNS boolean
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
declare allowed boolean; count_24h integer; inserted integer;
begin
 if p_message_id is null or p_request_id is null or p_requester_id is null
   or length(p_body_ciphertext) not between 30 and 10000 then return false; end if;
 -- Same per-request exclusive row lock as in-app participant sends.
 perform 1 from app.consultation_requests r
  where r.id=p_request_id and r.account_id=p_requester_id
    and r.status in ('requested','contacted')
  for update;
 if not found then return false; end if;
 -- Re-check consent, bot recipient hash, authorized original message and
 -- assigned active master INSIDE the locked save transaction.
 select exists(select 1 from app_private.notification_tg_reply_target(
   p_chat_hash,p_notice_message_id) t
   where t.request_id=p_request_id and t.account_id=p_requester_id)
 into allowed;
 if not allowed then return false; end if;
 if exists(select 1 from app.practitioner_request_messages
           where id=p_message_id) then return false; end if;
 select count(*)::integer into count_24h
 from app.practitioner_request_messages
 where request_id=p_request_id and author_account_id=p_requester_id
   and created_at>now()-interval '24 hours';
 if count_24h>=40 then return false; end if;
 insert into app.practitioner_request_messages
  (id,request_id,author_account_id,author_role,visibility,body_ciphertext)
 values(p_message_id,p_request_id,p_requester_id,'client','participants',p_body_ciphertext)
 on conflict do nothing;
 get diagnostics inserted=row_count;
 return inserted=1;
end
$fn$;

REVOKE ALL ON FUNCTION
 app_private.notification_tg_dispatch_finish_bound(uuid,text,text,text),
 app_private.notification_tg_reply_target(text,text),
 app_private.notification_tg_reply_commit(text,text,uuid,uuid,uuid,text)
 FROM PUBLIC,anon,authenticated,hh_app_inbox,hh_app_backend,hh_crm_backend;
GRANT EXECUTE ON FUNCTION
 app_private.notification_tg_dispatch_finish_bound(uuid,text,text,text) TO hh_app_backend;
GRANT EXECUTE ON FUNCTION
 app_private.notification_tg_reply_target(text,text),
 app_private.notification_tg_reply_commit(text,text,uuid,uuid,uuid,text) TO hh_app_inbox;

COMMENT ON FUNCTION app_private.notification_tg_reply_commit(text,text,uuid,uuid,uuid,text)
 IS 'Only verified opted-in Telegram bot reply to an exact accepted notification for that requester; ciphertext-only, account-scoped, rate-limited, replay-safe.';
