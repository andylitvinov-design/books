-- Owner-only pilot can notify about true participant-visible client messages.
-- Also align verified notification claims with the remote booking statuses
-- that are legitimately writable by the client/practitioner RLS policy.
-- Does not enable customer sends or change Bot API configuration.
begin;
CREATE OR REPLACE FUNCTION app_private.notification_tg_message_claim(p_message_id uuid)
 RETURNS TABLE(target_account_id uuid, target_request_id uuid, target_ciphertext text, target_locale text, target_chat_hash text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_account uuid;v_request uuid;v_cipher text;v_locale text;v_hash text;
begin
 select case when m.author_role='practitioner' then r.account_id
             when m.author_role='client' then p.trusted_auth_user_id end,
        r.id,l.chat_ciphertext,n.locale,l.chat_hash
 into v_account,v_request,v_cipher,v_locale,v_hash
 from app.practitioner_request_messages m
 join app.consultation_requests r on r.id=m.request_id
 join app.practitioners p on p.id=r.recipient_practitioner_id
 join app.accounts a on a.id=case when m.author_role='practitioner' then r.account_id
                         else p.trusted_auth_user_id end
 join app_private.notification_messenger_requests n on n.account_id=a.id and n.channel='telegram'
 join app_private.notification_telegram_links l on l.account_id=a.id
 where m.id=p_message_id and m.visibility='participants'
   and m.created_at>now()-interval '15 minutes'
   and ((m.author_role='practitioner' and m.author_account_id=p.trusted_auth_user_id
         and m.author_account_id<>r.account_id)
        or (m.author_role='client' and m.author_account_id=r.account_id
         and m.author_account_id<>p.trusted_auth_user_id))
   and p.active=true and p.status in ('approved','submitted','changes_requested')
   and (r.status in ('requested','contacted') or
     (r.remote_booking is not null and r.status in
       ('reschedule_proposed','confirmed','in_progress')))
   and a.status='active' and a.onboarding_state='active'
   and n.topics->>'messages'='true'
   and n.consent_version='hh-messenger-contact-v1'
   and l.consent_version='hh-tg-message-alerts-v1'
 limit 1;
 if v_account is null then return; end if;
 insert into app_private.notification_telegram_dispatch(message_id,account_id,request_id)
 values(p_message_id,v_account,v_request) on conflict do nothing;
 if not found then return; end if;
 target_account_id:=v_account;target_request_id:=v_request;
 target_ciphertext:=v_cipher;target_locale:=v_locale;target_chat_hash:=v_hash;
 return next;
end
$function$;

create or replace function app_private.notification_tg_owner_pilot_target(
 p_message_id uuid,p_practitioner_id uuid
) returns uuid language sql security definer set search_path to ''
as $body$
 select p.trusted_auth_user_id
 from app.practitioner_request_messages m
 join app.consultation_requests r on r.id=m.request_id
 join app.practitioners p on p.id=r.recipient_practitioner_id
 join app.accounts a on a.id=p.trusted_auth_user_id
 where m.id=p_message_id and p.id=p_practitioner_id
   and m.author_role='client' and m.visibility='participants'
   and m.author_account_id=r.account_id and m.author_account_id<>p.trusted_auth_user_id
   and m.created_at>now()-interval '15 minutes'
   and (r.status in ('requested','contacted') or
     (r.remote_booking is not null and r.status in
       ('reschedule_proposed','confirmed','in_progress')))
   and p.active=true and p.status in ('approved','submitted','changes_requested')
   and a.status='active' and a.onboarding_state='active'
 limit 1
$body$;
revoke all on function app_private.notification_tg_owner_pilot_target(uuid,uuid)
 from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant execute on function app_private.notification_tg_owner_pilot_target(uuid,uuid)
 to hh_app_backend;
commit;