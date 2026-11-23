-- Daybook v1: opt-in goal disclosure to an already-verified private Telegram chat.
-- No new provider, cron, public grants or automatic enrollment. WhatsApp is intentionally out of scope.
begin;
create table if not exists app_private.daybook_daily_preferences(
 account_id uuid primary key references app.accounts(id) on delete cascade,
 goal_id uuid not null,
 focus_axis text not null check(focus_axis in ('anchor','connection','freedom','agency','love','dignity','realization','recognition')),
 daily_at text not null check(daily_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and daily_at between '07:00' and '22:00'),
 timezone text not null check(length(timezone) between 1 and 100),
 locale text not null check(locale in ('en','ru','es')),
 enabled boolean not null default false,
 consent_version text not null check(consent_version='daybook-goal-to-messenger-v1'),
 consented_at timestamptz not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(goal_id,account_id) references app_private.coaching_goals(id,account_id) on delete cascade
);
create index if not exists daybook_daily_due_idx on app_private.daybook_daily_preferences(enabled,updated_at,account_id) where enabled;
create table if not exists app_private.daybook_daily_attempts(
 account_id uuid not null references app_private.daybook_daily_preferences(account_id) on delete cascade,
 local_day date not null,
 goal_id uuid not null,
 status text not null default 'claimed' check(status in ('claimed','accepted','failed','suppressed','unknown')),
 provider_message_id text check(provider_message_id is null or length(provider_message_id)<=64),
 claimed_at timestamptz not null default now(),
 finished_at timestamptz,
 primary key(account_id,local_day)
);
alter table app_private.daybook_daily_preferences enable row level security;
alter table app_private.daybook_daily_preferences force row level security;
alter table app_private.daybook_daily_attempts enable row level security;
alter table app_private.daybook_daily_attempts force row level security;
revoke all on app_private.daybook_daily_preferences,app_private.daybook_daily_attempts
 from public,anon,authenticated,hh_app_inbox,hh_crm_backend,hh_app_backend;
grant select,insert,update,delete on app_private.daybook_daily_preferences to hh_app_backend;
drop policy if exists daybook_owner_select on app_private.daybook_daily_preferences;
create policy daybook_owner_select on app_private.daybook_daily_preferences for select to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
drop policy if exists daybook_owner_insert on app_private.daybook_daily_preferences;
create policy daybook_owner_insert on app_private.daybook_daily_preferences for insert to hh_app_backend
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
drop policy if exists daybook_owner_update on app_private.daybook_daily_preferences;
create policy daybook_owner_update on app_private.daybook_daily_preferences for update to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
drop policy if exists daybook_owner_delete on app_private.daybook_daily_preferences;
create policy daybook_owner_delete on app_private.daybook_daily_preferences for delete to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
-- Attempts are never readable to the browser. The worker accesses them only through fixed RPCs.
create or replace function app_private.daybook_daily_worker_authorized()
 returns boolean language sql stable security invoker set search_path=''
 as $f$ select (select auth.uid()) is null
  and pg_catalog.current_setting('role',true)='hh_app_backend'
  and pg_catalog.current_setting('request.jwt.claims',true)='{}'
 $f$;
revoke all on function app_private.daybook_daily_worker_authorized() from public,anon,authenticated;
grant execute on function app_private.daybook_daily_worker_authorized() to hh_app_backend;

create or replace function app_private.daybook_due_candidates(p_limit integer)
 returns table(account_id uuid,local_day text)
 language plpgsql security definer set search_path=''
 as $f$
 begin
  if not app_private.daybook_daily_worker_authorized() then return; end if;
  return query select p.account_id,((now() at time zone p.timezone)::date)::text
   from app_private.daybook_daily_preferences p
   join app.accounts a on a.id=p.account_id and a.status='active' and a.onboarding_state='active'
   join app_private.coaching_goals g on g.id=p.goal_id and g.account_id=p.account_id and g.status='active'
   join app_private.notification_telegram_links l on l.account_id=p.account_id and l.consent_version='hh-tg-message-alerts-v1'
   join app_private.notification_messenger_requests n on n.account_id=p.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1'
   where p.enabled and p.consented_at is not null and p.consent_version='daybook-goal-to-messenger-v1'
     and (extract(hour from (now() at time zone p.timezone))::int*60+extract(minute from (now() at time zone p.timezone))::int)
     between (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int)
         and (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int+14)
     and not exists(select 1 from app_private.daybook_daily_attempts d
                    where d.account_id=p.account_id and d.local_day=(now() at time zone p.timezone)::date)
   order by p.updated_at,p.account_id limit least(greatest(coalesce(p_limit,1),1),12);
 end $f$;

create or replace function app_private.daybook_daily_claim(p_account uuid,p_day date)
 returns boolean language plpgsql security definer set search_path=''
 as $f$
 declare v_goal uuid;v_inserted int;
 begin
  if not app_private.daybook_daily_worker_authorized() or p_day is null then return false; end if;
  select p.goal_id into v_goal
    from app_private.daybook_daily_preferences p
    join app.accounts a on a.id=p.account_id and a.status='active' and a.onboarding_state='active'
    join app_private.coaching_goals g on g.id=p.goal_id and g.account_id=p.account_id and g.status='active'
    join app_private.notification_telegram_links l on l.account_id=p.account_id and l.consent_version='hh-tg-message-alerts-v1'
    join app_private.notification_messenger_requests n on n.account_id=p.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1'
   where p.account_id=p_account and p.enabled and p.consented_at is not null
    and p.consent_version='daybook-goal-to-messenger-v1'
    and (now() at time zone p.timezone)::date=p_day
    and (extract(hour from (now() at time zone p.timezone))::int*60+extract(minute from (now() at time zone p.timezone))::int)
      between (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int)
          and (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int+14)
   for update of p;
  if v_goal is null then return false; end if;
  insert into app_private.daybook_daily_attempts(account_id,local_day,goal_id)
   values(p_account,p_day,v_goal) on conflict(account_id,local_day) do nothing;
  get diagnostics v_inserted=row_count;
  return v_inserted=1;
 end $f$;

create or replace function app_private.daybook_daily_ready(p_account uuid,p_day date)
 returns table(goal_id uuid,focus_axis text,locale text,title_ciphertext text,chat_ciphertext text,chat_hash text)
 language plpgsql security definer set search_path=''
 as $f$
 begin
  if not app_private.daybook_daily_worker_authorized() then return; end if;
  return query
  select p.goal_id,p.focus_axis,p.locale,g.title_ciphertext,l.chat_ciphertext,l.chat_hash
  from app_private.daybook_daily_preferences p
   join app_private.daybook_daily_attempts d on d.account_id=p.account_id and d.local_day=p_day and d.goal_id=p.goal_id and d.status='claimed' and d.claimed_at>now()-interval '30 minutes'
   join app.accounts a on a.id=p.account_id and a.status='active' and a.onboarding_state='active'
   join app_private.coaching_goals g on g.id=p.goal_id and g.account_id=p.account_id and g.status='active'
   join app_private.notification_telegram_links l on l.account_id=p.account_id and l.consent_version='hh-tg-message-alerts-v1'
   join app_private.notification_messenger_requests n on n.account_id=p.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1'
  where p.account_id=p_account and p.enabled and p.consented_at is not null
   and p.consent_version='daybook-goal-to-messenger-v1'
   and (now() at time zone p.timezone)::date=p_day
   and (extract(hour from (now() at time zone p.timezone))::int*60+extract(minute from (now() at time zone p.timezone))::int)
    between (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int)
        and (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int+14)
  for update of p,l,g;
 end $f$;

create or replace function app_private.daybook_daily_finish(p_account uuid,p_day date,p_status text,p_message_id text default null)
 returns boolean language plpgsql security definer set search_path=''
 as $f$
 declare updated_count integer;
 begin
  if not app_private.daybook_daily_worker_authorized() or p_status not in ('accepted','failed','suppressed','unknown')
    or (p_message_id is not null and length(p_message_id)>64) then return false; end if;
  update app_private.daybook_daily_attempts
    set status=p_status,provider_message_id=case when p_status='accepted' then p_message_id else null end,
        finished_at=now()
   where account_id=p_account and local_day=p_day and status='claimed';
  get diagnostics updated_count=row_count;
  return updated_count=1;
 end $f$;
revoke all on function app_private.daybook_due_candidates(integer),app_private.daybook_daily_claim(uuid,date),
 app_private.daybook_daily_ready(uuid,date),app_private.daybook_daily_finish(uuid,date,text,text)
 from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant execute on function app_private.daybook_due_candidates(integer),app_private.daybook_daily_claim(uuid,date),
 app_private.daybook_daily_ready(uuid,date),app_private.daybook_daily_finish(uuid,date,text,text)
 to hh_app_backend;
commit;