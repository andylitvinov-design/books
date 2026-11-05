-- Owner-only Telegram pilot for actual, contact-bearing public enquiries.
-- Schema alone does not turn on outbound sends; HH_CLIENT_TG_OWNER_PILOT_ENABLED is a separate gate.
begin;
create table app_private.notification_telegram_public_dispatch(
 enquiry_id uuid primary key references app.public_service_enquiries(id) on delete cascade,
 account_id uuid not null references app.accounts(id) on delete cascade,
 state text not null default 'claimed' check(state in ('claimed','accepted','failed','suppressed')),
 provider_message_id text check(provider_message_id is null or length(provider_message_id)<=64),
 claimed_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table app_private.notification_telegram_public_dispatch enable row level security;
alter table app_private.notification_telegram_public_dispatch force row level security;
revoke all on app_private.notification_telegram_public_dispatch
 from public,anon,authenticated,hh_app_inbox,hh_app_backend,hh_crm_backend;

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
  and e.contact_ciphertext is not null and e.status='requested'
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
 and e.status='requested' and e.contact_ciphertext is not null
 and a.status='active' and a.onboarding_state='active'
 and l.chat_hash=p_chat_hash and l.consent_version='hh-tg-message-alerts-v1'
 and n.consent_version='hh-messenger-contact-v1' and n.topics->>'booking'='true'
 )
$body$;
create or replace function app_private.notification_tg_public_enquiry_finish(
 p_enquiry_id uuid,p_status text,p_provider_message_id text
) returns boolean language plpgsql security definer set search_path to ''
as $body$
declare n integer;
begin
 if p_status not in ('accepted','failed','suppressed') or
  (p_provider_message_id is not null and length(p_provider_message_id)>64) then return false; end if;
 update app_private.notification_telegram_public_dispatch
 set state=p_status,provider_message_id=case when p_status='accepted' then p_provider_message_id else null end,
 updated_at=now()
 where enquiry_id=p_enquiry_id and state='claimed';
 get diagnostics n=row_count;
 return n>0;
end
$body$;
revoke all on function app_private.notification_tg_public_enquiry_claim(uuid,uuid),
 app_private.notification_tg_public_enquiry_allowed(uuid,text,uuid),
 app_private.notification_tg_public_enquiry_finish(uuid,text,text)
 from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant execute on function app_private.notification_tg_public_enquiry_claim(uuid,uuid),
 app_private.notification_tg_public_enquiry_allowed(uuid,text,uuid),
 app_private.notification_tg_public_enquiry_finish(uuid,text,text) to hh_app_backend;
comment on table app_private.notification_telegram_public_dispatch is
 'At most one owner-only Telegram Bot API attempt for an actual contact-bearing public enquiry. Accepted != delivered/read.';
commit;