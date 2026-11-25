-- Server-owned, idempotent daily-course push dispatch.
-- SECURITY DEFINER functions are callable only by hh_app_backend, not anon
-- or authenticated/PostgREST; they emit no client scores, notes or health text.
begin;
create table app_private.notification_dispatch_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  subscription_id uuid not null references app_private.push_subscriptions(id) on delete cascade,
  local_day date not null,
  attempted_at timestamptz not null default now(),
  accepted boolean not null default false,
  expired boolean not null default false,
  unique(subscription_id,local_day)
);
create index notification_dispatch_cleanup on app_private.notification_dispatch_log(attempted_at);
revoke all on table app_private.notification_dispatch_log from public,anon,authenticated,hh_app_inbox;
alter table app_private.notification_dispatch_log enable row level security;

create function app_private.claim_due_course_pushes(p_now timestamptz,p_limit integer)
returns table(
  account_id uuid,subscription_id uuid,endpoint text,p256dh text,
  auth_secret text,locale text,local_day date
)
language sql security definer set search_path='' as $sql$
  with eligible as materialized (
    select p.account_id,s.id as subscription_id,s.endpoint,s.p256dh,s.auth_secret,
           p.locale,(p_now at time zone p.time_zone)::date as local_day
    from app_private.notification_preferences p
    join app_private.push_subscriptions s on s.account_id=p.account_id
    join app.accounts a on a.id=p.account_id
    where a.status='active' and a.onboarding_state='active'
      and p.enabled and p.course_reminders
      and extract(hour from p_now at time zone p.time_zone)=p.reminder_hour
      and exists(
        select 1 from app_private.growth_cycles c
        where c.account_id=p.account_id and c.status='active'
          and c.start_local_date<=(p_now at time zone c.time_zone)::date
          and (p_now at time zone c.time_zone)::date<c.start_local_date+c.duration_days
          and not exists (
            select 1 from app_private.growth_sessions g
            where g.account_id=c.account_id and g.cycle_id=c.id
              and g.local_date=(p_now at time zone c.time_zone)::date
          )
      )
    order by p.account_id,s.id
    limit greatest(1,least(p_limit,60))
  ), inserted as (
    insert into app_private.notification_dispatch_log(account_id,subscription_id,local_day)
    select e.account_id,e.subscription_id,e.local_day from eligible e
    on conflict(subscription_id,local_day) do nothing
    returning account_id,subscription_id,local_day
  )
  select e.account_id,e.subscription_id,e.endpoint,e.p256dh,
         e.auth_secret,e.locale,e.local_day
  from eligible e join inserted i using(account_id,subscription_id,local_day);
$sql$;

create function app_private.finish_course_push(
  p_subscription_id uuid,p_local_day date,p_accepted boolean,p_expired boolean
) returns void language plpgsql security definer set search_path='' as $sql$
begin
  update app_private.notification_dispatch_log
    set accepted=p_accepted,expired=p_expired
    where subscription_id=p_subscription_id and local_day=p_local_day;
  if p_expired then
    delete from app_private.push_subscriptions where id=p_subscription_id;
    update app_private.notification_preferences p set enabled=false,updated_at=now()
    where not exists(select 1 from app_private.push_subscriptions s where s.account_id=p.account_id);
  end if;
end
$sql$;

revoke all on function app_private.claim_due_course_pushes(timestamptz,integer)
 from public,anon,authenticated,hh_app_inbox;
revoke all on function app_private.finish_course_push(uuid,date,boolean,boolean)
 from public,anon,authenticated,hh_app_inbox;
grant execute on function app_private.claim_due_course_pushes(timestamptz,integer),
 app_private.finish_course_push(uuid,date,boolean,boolean) to hh_app_backend;
commit;
