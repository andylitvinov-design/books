-- Weekly Daybook inspiration with photographs; additive opt-in, no auto-enrollment.
-- Existing daily rows remain daily. Durable weekly ISO-week dedupe is independent.
begin;
alter table app_private.daybook_daily_preferences
 add column if not exists delivery_frequency text not null default 'daily'
  check(delivery_frequency in ('daily','weekly'));
alter table app_private.daybook_daily_preferences
 add column if not exists delivery_weekday smallint not null default 1
  check(delivery_weekday between 0 and 6);
alter table app_private.daybook_daily_preferences
 drop constraint if exists daybook_daily_preferences_consent_version_check;
alter table app_private.daybook_daily_preferences
 add constraint daybook_delivery_consent_guard check(
  (delivery_frequency='daily' and consent_version='daybook-goal-to-messenger-v1') or
  (delivery_frequency='weekly' and consent_version='daybook-goal-weekly-photo-v1'));
create index if not exists daybook_weekly_due_idx
 on app_private.daybook_daily_preferences(delivery_frequency,delivery_weekday,updated_at) where enabled;

-- Prevent a weekly opt-in from being picked by a legacy daily worker if enabled.
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
   where p.enabled and p.consented_at is not null and p.consent_version='daybook-goal-to-messenger-v1' and p.delivery_frequency='daily'
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
 declare v_goal uuid;v_inserted int;v_index integer;
 begin
  if not app_private.daybook_daily_worker_authorized() or p_day is null then return false; end if;
  select p.goal_id into v_goal
    from app_private.daybook_daily_preferences p
    join app.accounts a on a.id=p.account_id and a.status='active' and a.onboarding_state='active'
    join app_private.coaching_goals g on g.id=p.goal_id and g.account_id=p.account_id and g.status='active'
    join app_private.notification_telegram_links l on l.account_id=p.account_id and l.consent_version='hh-tg-message-alerts-v1'
    join app_private.notification_messenger_requests n on n.account_id=p.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1'
   where p.account_id=p_account and p.enabled and p.consented_at is not null
    and p.consent_version='daybook-goal-to-messenger-v1' and p.delivery_frequency='daily'
    and (now() at time zone p.timezone)::date=p_day
    and (extract(hour from (now() at time zone p.timezone))::int*60+extract(minute from (now() at time zone p.timezone))::int)
      between (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int)
          and (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int+14)
   for update of p;
  if v_goal is null then return false; end if;
  select candidates.idx into v_index from pg_catalog.generate_series(0,34) as candidates(idx)
   where not exists (
    select 1 from app_private.daybook_daily_attempts d
     where d.account_id=p_account and d.local_day >= p_day - 30
       and d.local_day < p_day and d.phrase_index=candidates.idx
   )
   order by pg_catalog.random() limit 1;
  if v_index is null then return false; end if;
  insert into app_private.daybook_daily_attempts(account_id,local_day,goal_id,phrase_index)
   values(p_account,p_day,v_goal,v_index::smallint)
   on conflict(account_id,local_day) do nothing;
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
   and p.consent_version='daybook-goal-to-messenger-v1' and p.delivery_frequency='daily'
   and (now() at time zone p.timezone)::date=p_day
   and (extract(hour from (now() at time zone p.timezone))::int*60+extract(minute from (now() at time zone p.timezone))::int)
    between (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int)
        and (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int+14)
  for update of p,l,g;
 end $f$;

create or replace function app_private.daybook_daily_ready_v2(p_account uuid,p_day date)
 returns table(goal_id uuid,focus_axis text,locale text,title_ciphertext text,
               chat_ciphertext text,chat_hash text,phrase_index smallint)
 language plpgsql security definer set search_path=''
 as $f$
 begin
  if not app_private.daybook_daily_worker_authorized() then return; end if;
  return query
  select p.goal_id,p.focus_axis,p.locale,g.title_ciphertext,l.chat_ciphertext,l.chat_hash,d.phrase_index
  from app_private.daybook_daily_preferences p
   join app_private.daybook_daily_attempts d on d.account_id=p.account_id and d.local_day=p_day
     and d.goal_id=p.goal_id and d.status='claimed' and d.claimed_at>now()-interval '30 minutes'
   join app.accounts a on a.id=p.account_id and a.status='active' and a.onboarding_state='active'
   join app_private.coaching_goals g on g.id=p.goal_id and g.account_id=p.account_id and g.status='active'
   join app_private.notification_telegram_links l on l.account_id=p.account_id and l.consent_version='hh-tg-message-alerts-v1'
   join app_private.notification_messenger_requests n on n.account_id=p.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1'
  where p.account_id=p_account and p.enabled and p.consented_at is not null
   and p.consent_version='daybook-goal-to-messenger-v1' and p.delivery_frequency='daily'
   and (now() at time zone p.timezone)::date=p_day
   and (extract(hour from (now() at time zone p.timezone))::int*60+extract(minute from (now() at time zone p.timezone))::int)
    between (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int)
        and (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int+14)
  for update of p,l,g;
 end $f$;

create table if not exists app_private.daybook_weekly_attempts(
 account_id uuid not null references app_private.daybook_daily_preferences(account_id) on delete cascade,
 week_start date not null,
 local_day date not null,
 goal_id uuid not null,
 phrase_index smallint not null check(phrase_index between 0 and 34),
 photo_index smallint not null check(photo_index between 0 and 19),
 status text not null default 'claimed' check(status in ('claimed','accepted','failed','suppressed','unknown')),
 provider_message_id text check(provider_message_id is null or length(provider_message_id)<=64),
 claimed_at timestamptz not null default now(),
 finished_at timestamptz,
 primary key(account_id,week_start),
 constraint daybook_weekly_monday_guard check(extract(isodow from week_start)=1)
);
create index if not exists daybook_weekly_history_idx
 on app_private.daybook_weekly_attempts(account_id,week_start desc,phrase_index,photo_index);
alter table app_private.daybook_weekly_attempts enable row level security;
alter table app_private.daybook_weekly_attempts force row level security;
revoke all on app_private.daybook_weekly_attempts
 from public,anon,authenticated,hh_app_inbox,hh_crm_backend,hh_app_backend;

create or replace function app_private.daybook_weekly_due_candidates(p_limit integer)
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
   where p.enabled and p.delivery_frequency='weekly'
   and p.consent_version='daybook-goal-weekly-photo-v1' and p.consented_at is not null
   and extract(dow from now() at time zone p.timezone)::int=p.delivery_weekday
   and (extract(hour from (now() at time zone p.timezone))::int*60+
       extract(minute from (now() at time zone p.timezone))::int)
       between (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int)
           and (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int+14)
     and not exists(select 1 from app_private.daybook_weekly_attempts d
      where d.account_id=p.account_id and d.week_start=date_trunc('week',(now() at time zone p.timezone)::date::timestamp)::date)
   order by p.updated_at,p.account_id limit least(greatest(coalesce(p_limit,1),1),3);
 end $f$;

create or replace function app_private.daybook_weekly_claim(p_account uuid,p_day date)
 returns boolean language plpgsql security definer set search_path=''
 as $f$
 declare v_goal uuid;v_phrase integer;v_photo integer;v_count integer;v_week date;
 begin
  if not app_private.daybook_daily_worker_authorized() or p_day is null then return false; end if;
  v_week:=date_trunc('week',p_day::timestamp)::date;
  select p.goal_id into v_goal
   from app_private.daybook_daily_preferences p
    join app.accounts a on a.id=p.account_id and a.status='active' and a.onboarding_state='active'
    join app_private.coaching_goals g on g.id=p.goal_id and g.account_id=p.account_id and g.status='active'
    join app_private.notification_telegram_links l on l.account_id=p.account_id and l.consent_version='hh-tg-message-alerts-v1'
    join app_private.notification_messenger_requests n on n.account_id=p.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1'
   where p.account_id=p_account and (now() at time zone p.timezone)::date=p_day
    and p.enabled and p.delivery_frequency='weekly'
   and p.consent_version='daybook-goal-weekly-photo-v1' and p.consented_at is not null
   and extract(dow from now() at time zone p.timezone)::int=p.delivery_weekday
   and (extract(hour from (now() at time zone p.timezone))::int*60+
       extract(minute from (now() at time zone p.timezone))::int)
       between (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int)
           and (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int+14)
   for update of p;
  if v_goal is null then return false; end if;
  select candidate.idx into v_phrase
    from pg_catalog.generate_series(0,34) as candidate(idx)
    where not exists(select 1 from app_private.daybook_weekly_attempts d
      where d.account_id=p_account and d.week_start >= v_week - 210
        and d.week_start<v_week and d.phrase_index=candidate.idx)
    order by pg_catalog.random() limit 1;
  select candidate.idx into v_photo
    from pg_catalog.generate_series(0,19) as candidate(idx)
    where not exists(select 1 from app_private.daybook_weekly_attempts d
      where d.account_id=p_account and d.week_start >= v_week - 133
        and d.week_start<v_week and d.photo_index=candidate.idx)
    order by pg_catalog.random() limit 1;
  if v_phrase is null or v_photo is null then return false; end if;
  insert into app_private.daybook_weekly_attempts(
    account_id,week_start,local_day,goal_id,phrase_index,photo_index)
   values(p_account,v_week,p_day,v_goal,v_phrase::smallint,v_photo::smallint)
   on conflict(account_id,week_start) do nothing;
  get diagnostics v_count=row_count;
  return v_count=1;
 end $f$;

create or replace function app_private.daybook_weekly_ready(p_account uuid,p_day date)
 returns table(goal_id uuid,focus_axis text,locale text,title_ciphertext text,
  chat_ciphertext text,phrase_index smallint,photo_index smallint)
 language plpgsql security definer set search_path=''
 as $f$
 begin
  if not app_private.daybook_daily_worker_authorized() or p_day is null then return; end if;
  return query select p.goal_id,p.focus_axis,p.locale,g.title_ciphertext,l.chat_ciphertext,
    d.phrase_index,d.photo_index
   from app_private.daybook_daily_preferences p
    join app_private.daybook_weekly_attempts d
      on d.account_id=p.account_id
      and d.week_start=date_trunc('week',p_day::timestamp)::date
      and d.local_day=p_day and d.goal_id=p.goal_id
      and d.status='claimed' and d.claimed_at>now()-interval '30 minutes'
    join app.accounts a on a.id=p.account_id and a.status='active' and a.onboarding_state='active'
    join app_private.coaching_goals g on g.id=p.goal_id and g.account_id=p.account_id and g.status='active'
    join app_private.notification_telegram_links l on l.account_id=p.account_id and l.consent_version='hh-tg-message-alerts-v1'
    join app_private.notification_messenger_requests n on n.account_id=p.account_id and n.channel='telegram' and n.consent_version='hh-messenger-contact-v1'
   where p.account_id=p_account and (now() at time zone p.timezone)::date=p_day
    and p.enabled and p.delivery_frequency='weekly'
   and p.consent_version='daybook-goal-weekly-photo-v1' and p.consented_at is not null
   and extract(dow from now() at time zone p.timezone)::int=p.delivery_weekday
   and (extract(hour from (now() at time zone p.timezone))::int*60+
       extract(minute from (now() at time zone p.timezone))::int)
       between (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int)
           and (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int+14)
   for update of p,l,g;
 end $f$;

create or replace function app_private.daybook_weekly_finish(
 p_account uuid,p_day date,p_status text,p_message_id text default null)
 returns boolean language plpgsql security definer set search_path=''
 as $f$
 declare v_count integer;
 begin
  if not app_private.daybook_daily_worker_authorized() or p_day is null or
    p_status not in ('accepted','failed','suppressed','unknown') or
    (p_message_id is not null and length(p_message_id)>64) then return false; end if;
  update app_private.daybook_weekly_attempts
   set status=p_status,
    provider_message_id=case when p_status='accepted' then p_message_id else null end,
    finished_at=now()
   where account_id=p_account
    and week_start=date_trunc('week',p_day::timestamp)::date
    and local_day=p_day and status='claimed';
  get diagnostics v_count=row_count;
  return v_count=1;
 end $f$;
revoke all on function app_private.daybook_weekly_due_candidates(integer),
 app_private.daybook_weekly_claim(uuid,date),
 app_private.daybook_weekly_ready(uuid,date),
 app_private.daybook_weekly_finish(uuid,date,text,text)
 from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant execute on function app_private.daybook_weekly_due_candidates(integer),
 app_private.daybook_weekly_claim(uuid,date),
 app_private.daybook_weekly_ready(uuid,date),
 app_private.daybook_weekly_finish(uuid,date,text,text)
 to hh_app_backend;
commit;
