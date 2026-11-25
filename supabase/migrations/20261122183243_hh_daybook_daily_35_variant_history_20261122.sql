-- Daybook daily: fix the original 5-day repeat defect without another cron/provider.
-- Every account selects one of 35 localized complete reflections uniformly at
-- random, excluding ANY variant reserved in its previous 30 local calendar days.
-- Atomic selection under the existing owner row lock; ambiguous claims count.
begin;
alter table app_private.daybook_daily_attempts
 add column if not exists phrase_index smallint not null default 0
 check(phrase_index between 0 and 34);
create index if not exists daybook_attempt_phrase_history_idx
 on app_private.daybook_daily_attempts(account_id,local_day desc,phrase_index);

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
    and p.consent_version='daybook-goal-to-messenger-v1'
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

-- A versioned read retains the original v1 return type for compatibility
-- with any in-flight deployments. v2 adds only the claimed phrase index.
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
   and p.consent_version='daybook-goal-to-messenger-v1'
   and (now() at time zone p.timezone)::date=p_day
   and (extract(hour from (now() at time zone p.timezone))::int*60+extract(minute from (now() at time zone p.timezone))::int)
    between (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int)
        and (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int+14)
  for update of p,l,g;
 end $f$;
revoke all on function app_private.daybook_daily_ready_v2(uuid,date)
 from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant execute on function app_private.daybook_daily_ready_v2(uuid,date) to hh_app_backend;
commit;
