-- Nullable, consent-based, first-party request attribution: no tracking ID or PII.
-- Do not prevent older public forms or migrations from accepting requests.
begin;
alter table app.public_service_enquiries
  add column if not exists attribution jsonb;
comment on column app.public_service_enquiries.attribution is
 'Opt-in first-touch public landing, prior public page, coarse traffic source and optional safe campaign slug; no free text, query, visitor IDs or contacts.';

-- A verified, booking-opted-in owner should also hear about an anonymous
-- enquiry with no contact yet. The provider receives no contact or message.
-- Preserve exact owner-scoped claim, freshness, RLS and at-most-once policy.
create or replace function app_private.notification_tg_public_enquiry_claim(
 p_enquiry_id uuid,p_practitioner_id uuid
) returns table(target_account_id uuid,target_ciphertext text,target_locale text,target_chat_hash text)
language plpgsql security definer set search_path to ''
as $body$
declare v_account uuid;v_cipher text;v_locale text;v_hash text;
begin
 if p_enquiry_id is null or p_practitioner_id is null then return; end if;
 select p.trusted_auth_user_id,l.chat_ciphertext,n.locale,l.chat_hash
 into v_account,v_cipher,v_locale,v_hash
 from app.public_service_enquiries e
 join app.practitioners p on p.id=e.recipient_practitioner_id
 join app.accounts a on a.id=p.trusted_auth_user_id
 join app_private.notification_messenger_requests n
  on n.account_id=a.id and n.channel='telegram'
 join app_private.notification_telegram_links l on l.account_id=a.id
 where e.id=p_enquiry_id and p.id=p_practitioner_id
  and e.status='requested'
  and e.created_at>now()-interval '15 minutes'
  and p.active=true and p.status in ('approved','submitted','changes_requested')
  and a.status='active' and a.onboarding_state='active'
  and n.consent_version='hh-messenger-contact-v1'
  and n.topics->>'booking'='true'
  and l.consent_version='hh-tg-message-alerts-v1'
 limit 1;
 if v_account is null then return; end if;
 insert into app_private.notification_telegram_public_dispatch(enquiry_id,account_id)
 values(p_enquiry_id,v_account) on conflict do nothing;
 if not found then return; end if;
 target_account_id:=v_account;target_ciphertext:=v_cipher;
 target_locale:=v_locale;target_chat_hash:=v_hash;
 return next;
end
$body$;
create or replace function app_private.notification_tg_public_enquiry_allowed(
 p_enquiry_id uuid,p_chat_hash text,p_practitioner_id uuid
) returns boolean language sql security definer set search_path to ''
as $body$
 select exists(
 select 1 from app_private.notification_telegram_public_dispatch d
 join app.public_service_enquiries e on e.id=d.enquiry_id
 join app.practitioners p on p.id=e.recipient_practitioner_id
 join app.accounts a on a.id=d.account_id and a.id=p.trusted_auth_user_id
 join app_private.notification_telegram_links l on l.account_id=d.account_id
 join app_private.notification_messenger_requests n on n.account_id=d.account_id and n.channel='telegram'
 where d.enquiry_id=p_enquiry_id and d.state='claimed'
 and p.id=p_practitioner_id and p.active=true
 and p.status in ('approved','submitted','changes_requested')
 and e.status='requested'
 and a.status='active' and a.onboarding_state='active'
 and l.chat_hash=p_chat_hash and l.consent_version='hh-tg-message-alerts-v1'
 and n.consent_version='hh-messenger-contact-v1' and n.topics->>'booking'='true'
 )
$body$;

comment on table app_private.notification_telegram_public_dispatch is
 'One owner-only notification attempt per actual public enquiry, including unverified guests. Provider acceptance is not delivery/read.';
commit;
