-- Separate finite topic; no auto-enrollment or modification of other channels.
begin;
create table app_private.reiki_hints_preferences(
 account_id uuid primary key references app.accounts(id) on delete cascade,
 locale text not null check(locale in ('en','ru','es')),
 daily_at text not null check(daily_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and daily_at between '07:00' and '22:00'),
 timezone text not null check(length(timezone) between 1 and 100),
 consent_version text not null check(consent_version='hh-reiki-hints-30-v1'),
 catalog_version text not null check(catalog_version='hh-reiki-hints-v2'),
 consented_at timestamptz not null default now(),
 start_day date,
 chat_hash text,
 link_verified_at timestamptz,
 stopped_at timestamptz,
 constraint reiki_hints_bound_pair check((chat_hash is null)=(link_verified_at is null)),
 constraint reiki_hints_started_bound check(start_day is null or chat_hash is not null)
);
create table app_private.reiki_hints_attempts(
 account_id uuid not null references app_private.reiki_hints_preferences(account_id) on delete cascade,
 local_day date not null,
 slot smallint not null check(slot between 1 and 30),
 status text not null default 'claimed' check(status in ('claimed','accepted','unknown','suppressed')),
 provider_message_id text check(provider_message_id is null or length(provider_message_id)<=64),
 claimed_at timestamptz not null default now(),
 finished_at timestamptz,
 primary key(account_id,local_day),unique(account_id,slot)
);
alter table app_private.reiki_hints_preferences enable row level security;
alter table app_private.reiki_hints_preferences force row level security;
alter table app_private.reiki_hints_attempts enable row level security;
alter table app_private.reiki_hints_attempts force row level security;
revoke all on app_private.reiki_hints_preferences,app_private.reiki_hints_attempts from public,anon,authenticated,hh_app_backend,hh_app_inbox,hh_crm_backend;
grant select,insert,update on app_private.reiki_hints_preferences to hh_app_backend;
grant select on app_private.reiki_hints_attempts to hh_app_backend;
create policy reiki_hints_owner_read on app_private.reiki_hints_preferences for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy reiki_hints_owner_create on app_private.reiki_hints_preferences for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy reiki_hints_owner_update on app_private.reiki_hints_preferences for update to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active())) with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy reiki_hints_owner_attempts on app_private.reiki_hints_attempts for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create index reiki_hints_pending_idx on app_private.reiki_hints_preferences(consented_at,account_id) where stopped_at is null;
-- Start at the next chosen local time after a valid consent AND verified bot link.
-- A confirmed chat and its verification timestamp are pinned; disconnect/relink
-- cannot silently transfer/restart an existing finite series.
create function app_private.reiki_hints_due(p_limit integer)
 returns table(account_id uuid,local_day text)
 language plpgsql security definer set search_path='' as $f$
 begin
  if not app_private.daybook_daily_worker_authorized() then return; end if;
  with pending as (
   select p.account_id,l.chat_hash,l.verified_at,
    ((now() at time zone p.timezone)::date+
      case when (now() at time zone p.timezone)::time >= p.daily_at::time then 1 else 0 end) as first_day
   from app_private.reiki_hints_preferences p
   join app.accounts a on a.id=p.account_id and a.status='active' and a.onboarding_state='active'
   join app_private.notification_telegram_links l on l.account_id=p.account_id and l.consent_version='hh-tg-message-alerts-v1'
   join app_private.notification_messenger_requests n on n.account_id=p.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1'
   where p.stopped_at is null and p.start_day is null
    and p.consent_version='hh-reiki-hints-30-v1' and p.catalog_version='hh-reiki-hints-v2'
    and (p.chat_hash is null or (p.chat_hash=l.chat_hash and p.link_verified_at=l.verified_at))
   order by p.consented_at,p.account_id limit 12 for update of p skip locked
  )
  update app_private.reiki_hints_preferences p set start_day=q.first_day,chat_hash=q.chat_hash,link_verified_at=q.verified_at from pending q where p.account_id=q.account_id;
  return query select p.account_id,((now() at time zone p.timezone)::date)::text
   from app_private.reiki_hints_preferences p
   join app.accounts a on a.id=p.account_id and a.status='active' and a.onboarding_state='active'
   join app_private.notification_telegram_links l on l.account_id=p.account_id and l.consent_version='hh-tg-message-alerts-v1' and l.chat_hash=p.chat_hash and l.verified_at=p.link_verified_at
   join app_private.notification_messenger_requests n on n.account_id=p.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1'
   where p.stopped_at is null and p.consent_version='hh-reiki-hints-30-v1' and p.catalog_version='hh-reiki-hints-v2'
    and ((now() at time zone p.timezone)::date-p.start_day) between 0 and 29
    and (now() at time zone p.timezone)::time>=p.daily_at::time
    and not exists(select 1 from app_private.reiki_hints_attempts d where d.account_id=p.account_id and d.local_day=(now() at time zone p.timezone)::date)
   order by p.start_day,p.consented_at,p.account_id limit least(greatest(coalesce(p_limit,1),1),3);
 end $f$;
create function app_private.reiki_hints_claim(p_account uuid,p_day date) returns boolean
 language plpgsql security definer set search_path='' as $f$
 declare v_slot smallint;v_count integer;
 begin
  if not app_private.daybook_daily_worker_authorized() or p_day is null then return false; end if;
  select (p_day-p.start_day+1)::smallint into v_slot
   from app_private.reiki_hints_preferences p
   join app.accounts a on a.id=p.account_id and a.status='active' and a.onboarding_state='active'
   join app_private.notification_telegram_links l on l.account_id=p.account_id and l.consent_version='hh-tg-message-alerts-v1' and l.chat_hash=p.chat_hash and l.verified_at=p.link_verified_at
   join app_private.notification_messenger_requests n on n.account_id=p.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1'
   where p.account_id=p_account and p.stopped_at is null and p.consent_version='hh-reiki-hints-30-v1' and p.catalog_version='hh-reiki-hints-v2'
    and (now() at time zone p.timezone)::date=p_day and (p_day-p.start_day) between 0 and 29
    and (now() at time zone p.timezone)::time>=p.daily_at::time
   for update of p;
  if v_slot is null then return false; end if;
  insert into app_private.reiki_hints_attempts(account_id,local_day,slot) values(p_account,p_day,v_slot) on conflict do nothing;
  get diagnostics v_count=row_count;return v_count=1;
 end $f$;
create function app_private.reiki_hints_ready(p_account uuid,p_day date)
 returns table(slot smallint,locale text,chat_ciphertext text,chat_hash text)
 language plpgsql security definer set search_path='' as $f$
 begin
  if not app_private.daybook_daily_worker_authorized() or p_day is null then return; end if;
  return query select d.slot,p.locale,l.chat_ciphertext,l.chat_hash
   from app_private.reiki_hints_preferences p
   join app_private.reiki_hints_attempts d on d.account_id=p.account_id and d.local_day=p_day and d.status='claimed' and d.claimed_at>now()-interval '15 minutes'
   join app.accounts a on a.id=p.account_id and a.status='active' and a.onboarding_state='active'
   join app_private.notification_telegram_links l on l.account_id=p.account_id and l.consent_version='hh-tg-message-alerts-v1' and l.chat_hash=p.chat_hash and l.verified_at=p.link_verified_at
   join app_private.notification_messenger_requests n on n.account_id=p.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1'
   where p.account_id=p_account and p.stopped_at is null and p.consent_version='hh-reiki-hints-30-v1' and p.catalog_version='hh-reiki-hints-v2'
    and (now() at time zone p.timezone)::date=p_day and (p_day-p.start_day) between 0 and 29
    and d.slot=p_day-p.start_day+1 and (now() at time zone p.timezone)::time>=p.daily_at::time
   for update of p,l,n;
 end $f$;
create function app_private.reiki_hints_finish(p_account uuid,p_day date,p_status text,p_receipt text)
 returns boolean language plpgsql security definer set search_path='' as $f$
 declare v_count integer;
 begin
  if not app_private.daybook_daily_worker_authorized() or p_day is null or p_status is null or p_status not in ('accepted','unknown','suppressed') or
   (p_status='accepted' and (p_receipt is null or p_receipt !~ '^[0-9]{1,64}$')) then return false; end if;
  update app_private.reiki_hints_attempts set status=p_status,provider_message_id=case when p_status='accepted' then p_receipt else null end,finished_at=now()
   where account_id=p_account and local_day=p_day and status='claimed';
  get diagnostics v_count=row_count;return v_count=1;
 end $f$;
revoke all on function app_private.reiki_hints_due(integer),app_private.reiki_hints_claim(uuid,date),app_private.reiki_hints_ready(uuid,date),app_private.reiki_hints_finish(uuid,date,text,text)
 from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant execute on function app_private.reiki_hints_due(integer),app_private.reiki_hints_claim(uuid,date),app_private.reiki_hints_ready(uuid,date),app_private.reiki_hints_finish(uuid,date,text,text) to hh_app_backend;
commit;
