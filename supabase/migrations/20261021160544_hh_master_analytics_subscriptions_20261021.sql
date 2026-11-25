-- Applied to production project holistichouse 2026-10-21.
-- Aggregate-only My Practice service statistics; NO outbound channels enabled here.
create table app_private.practitioner_analytics_subscriptions(
 practitioner_id uuid primary key references app.practitioners(id) on delete cascade,
 channel text not null check(channel in ('telegram','whatsapp')),
 frequency text not null check(frequency in ('daily','weekly')),
 locale text not null check(locale in ('en','ru','es')),
 consent_version text not null check(consent_version='hh-master-aggregate-stats-v1'),
 consented_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table app_private.practitioner_analytics_dispatches(
 practitioner_id uuid not null references app.practitioners(id) on delete cascade,
 report_day date not null,
 kind text not null check(kind in ('daily','weekly','manual')),
 channel text not null default 'telegram' check(channel='telegram'),
 status text not null default 'claimed' check(status in ('claimed','accepted','failed','suppressed')),
 claim_token uuid not null,
 provider_message_id text check(provider_message_id is null or length(provider_message_id)<=64),
 claimed_at timestamptz not null default now(),
 finished_at timestamptz,
 primary key(practitioner_id,report_day,kind)
);
create index practitioner_analytics_dispatches_claimed_at on app_private.practitioner_analytics_dispatches(claimed_at);
alter table app_private.practitioner_analytics_subscriptions enable row level security;
alter table app_private.practitioner_analytics_subscriptions force row level security;
alter table app_private.practitioner_analytics_dispatches enable row level security;
alter table app_private.practitioner_analytics_dispatches force row level security;
revoke all on app_private.practitioner_analytics_subscriptions,
 app_private.practitioner_analytics_dispatches
 from public,anon,authenticated,service_role,hh_app_inbox,hh_crm_backend,hh_app_backend;
grant select,insert,update,delete on app_private.practitioner_analytics_subscriptions to hh_app_backend;
grant select,insert,update on app_private.practitioner_analytics_dispatches to hh_app_backend;
-- Private backend-only tables. API checks verified session + exact practitioner ownership.
create policy master_analytics_backend on app_private.practitioner_analytics_subscriptions
 for all to hh_app_backend using(true) with check(true);
create policy master_analytics_delivery_backend on app_private.practitioner_analytics_dispatches
 for all to hh_app_backend using(true) with check(true);

-- SECURE: do not trust a typed handle/phone; require an encrypted Telegram
-- chat previously verified by /start and current explicit master opt-in.
create function app_private.master_analytics_claim(
 p_practitioner uuid,p_day date,p_kind text,p_token uuid
) returns table(target_account_id uuid,target_ciphertext text,target_chat_hash text,
 target_locale text,target_frequency text)
language sql security definer set search_path to ''
as $claim$
 with eligible as (
  select p.id as practitioner_id,p.trusted_auth_user_id as account_id,
   l.chat_ciphertext,l.chat_hash,s.locale,s.frequency
  from app.practitioners p
  join app.accounts a on a.id=p.trusted_auth_user_id
  join app_private.practitioner_analytics_subscriptions s on s.practitioner_id=p.id
  join app_private.notification_telegram_links l on l.account_id=a.id
  where p.id=p_practitioner and p.active and p.status='approved'
    and a.status='active' and a.onboarding_state='active'
    and s.channel='telegram' and s.consent_version='hh-master-aggregate-stats-v1'
    and l.consent_version='hh-tg-message-alerts-v1'
    and p_kind in ('daily','weekly','manual') and p_token is not null
    and p_day between date '2020-01-01' and (now() at time zone 'America/Toronto')::date
    and (p_kind='manual' or s.frequency=p_kind)
 ), inserted as (
   insert into app_private.practitioner_analytics_dispatches
      (practitioner_id,report_day,kind,claim_token)
   select practitioner_id,p_day,p_kind,p_token from eligible
   on conflict do nothing returning practitioner_id
 )
 select e.account_id,e.chat_ciphertext,e.chat_hash,e.locale,e.frequency
 from eligible e join inserted i on i.practitioner_id=e.practitioner_id
$claim$;

create function app_private.master_analytics_allowed(
 p_practitioner uuid,p_day date,p_kind text,p_hash text
) returns boolean language sql security definer set search_path to ''
as $allowed$
 select exists(
  select 1 from app_private.practitioner_analytics_dispatches d
  join app.practitioners p on p.id=d.practitioner_id
  join app.accounts a on a.id=p.trusted_auth_user_id
  join app_private.practitioner_analytics_subscriptions s on s.practitioner_id=p.id
  join app_private.notification_telegram_links l on l.account_id=a.id
  where d.practitioner_id=p_practitioner and d.report_day=p_day
    and d.kind=p_kind and d.status='claimed'
    and p.active and p.status='approved'
    and a.status='active' and a.onboarding_state='active'
    and s.channel='telegram' and s.consent_version='hh-master-aggregate-stats-v1'
    and (p_kind='manual' or s.frequency=p_kind)
    and l.chat_hash=p_hash and l.consent_version='hh-tg-message-alerts-v1'
 )
$allowed$;
create function app_private.master_analytics_finish(
 p_practitioner uuid,p_day date,p_kind text,p_token uuid,p_status text,p_message text
) returns boolean language plpgsql security definer set search_path to ''
as $finish$
declare n integer;
begin
 if p_status not in ('accepted','failed','suppressed') or
    (p_message is not null and length(p_message)>64) then return false; end if;
 update app_private.practitioner_analytics_dispatches set status=p_status,
  provider_message_id=case when p_status='accepted' then p_message else null end,
  finished_at=now()
 where practitioner_id=p_practitioner and report_day=p_day and kind=p_kind
  and claim_token=p_token and status='claimed';
 get diagnostics n=row_count;
 return n=1;
end
$finish$;
revoke all on function app_private.master_analytics_claim(uuid,date,text,uuid),
 app_private.master_analytics_allowed(uuid,date,text,text),
 app_private.master_analytics_finish(uuid,date,text,uuid,text,text)
 from public,anon,authenticated,service_role,hh_app_inbox,hh_crm_backend;
grant execute on function app_private.master_analytics_claim(uuid,date,text,uuid),
 app_private.master_analytics_allowed(uuid,date,text,text),
 app_private.master_analytics_finish(uuid,date,text,uuid,text,text)
 to hh_app_backend;
comment on table app_private.practitioner_analytics_subscriptions is
 'Explicit master aggregate-only stats opt-in; WhatsApp remains pending until official provider verification.';
comment on table app_private.practitioner_analytics_dispatches is
 'At-most-once Bot API attempts per master, report day and kind; accepted is not delivered/read.';
