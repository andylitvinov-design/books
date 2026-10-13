-- Multi-course support: preserve legacy owner-scoped journals and cycles.
-- Billing is server-owned; no client can edit entitlements or raw Stripe fields.
begin;
alter table app_private.growth_courses drop constraint if exists growth_courses_account_id_key;
alter table app_private.growth_courses drop constraint if exists growth_courses_status_check;
alter table app_private.growth_courses add constraint growth_courses_status_check
  check (status in ('active','paused','completed','archived','locked'));
alter table app_private.growth_courses
  add column if not exists is_primary boolean not null default false,
  add column if not exists finished_at timestamptz;
-- Locked courses are read-only but keep encrypted notes and progress for resubscription.
-- Previously finished cycles did not mark their parent courses as completed.
update app_private.growth_courses c set status='completed',finished_at=coalesce(
  (select max(finished_at) from app_private.growth_cycles v where v.course_id=c.id and v.status='completed'), now())
where c.stage=4 and not exists (
  select 1 from app_private.growth_cycles v where v.course_id=c.id and v.status in ('active','paused')
) and exists (select 1 from app_private.growth_cycles v where v.course_id=c.id and v.status='completed');
update app_private.growth_courses set is_primary=true where status in ('active','paused');
create unique index if not exists growth_courses_one_active_primary
  on app_private.growth_courses(account_id) where is_primary and status in ('active','paused');
create index if not exists growth_courses_active_owner
  on app_private.growth_courses(account_id,updated_at desc) where status in ('active','paused');
-- Every course has its own independently running 14-day cycle.
drop index if exists app_private.growth_one_current_cycle;
create unique index if not exists growth_one_current_cycle_per_course
  on app_private.growth_cycles(course_id) where status in ('active','paused');

create table if not exists app_private.course_billing (
  account_id uuid primary key references app.accounts(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','start','advanced','premium')),
  stripe_status text not null default 'inactive',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_event_created bigint not null default 0,
  updated_at timestamptz not null default now()
);
revoke all on app_private.course_billing from public,anon,authenticated,hh_app_inbox;
grant select,insert,update on app_private.course_billing to hh_app_backend;
alter table app_private.course_billing enable row level security;
create policy course_billing_owner_read on app_private.course_billing
  for select to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy course_billing_owner_insert on app_private.course_billing
  for insert to hh_app_backend
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy course_billing_owner_update on app_private.course_billing
  for update to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));

create table if not exists app_private.course_billing_events (
  event_id text primary key,
  account_id uuid not null references app.accounts(id) on delete cascade,
  event_type text not null,
  event_created bigint not null,
  received_at timestamptz not null default now()
);
revoke all on app_private.course_billing_events from public,anon,authenticated,hh_app_inbox;
grant select,insert on app_private.course_billing_events to hh_app_backend;
alter table app_private.course_billing_events enable row level security;
create policy course_billing_events_owner_read on app_private.course_billing_events
  for select to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy course_billing_events_owner_insert on app_private.course_billing_events
  for insert to hh_app_backend
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));

-- Webhooks run without a client login. Only a Stripe-signature-verified server
-- endpoint may call this narrowly scoped function as hh_app_backend.
-- User-facing RLS remains strict and never grants billing edits.
create or replace function app_private.apply_course_billing_event(
  p_account_id uuid,p_event_id text,p_event_type text,p_created bigint,
  p_tier text,p_status text,p_customer text,p_subscription text,p_price text,
  p_period_end timestamptz,p_cancel boolean
) returns boolean
language plpgsql security definer set search_path = ''
as $body$
declare old_created bigint; permitted_count integer; locked_id uuid;
begin
  if p_account_id is null or p_event_id !~ '^evt_[A-Za-z0-9_]+
    or p_event_type not like 'customer.subscription.%'
    or p_created<1 or p_tier not in ('free','start','advanced','premium')
    or p_status not in ('active','trialing','past_due','unpaid','canceled','incomplete','incomplete_expired','paused','inactive')
    then raise exception 'INVALID_BILLING_EVENT'; end if;
  perform 1 from app.accounts where id=p_account_id and status='active' for update;
  if not found then return false; end if;
  select last_event_created into old_created from app_private.course_billing where account_id=p_account_id for update;
  if old_created is not null and p_created<old_created then return false; end if;
  insert into app_private.course_billing_events(event_id,account_id,event_type,event_created)
  values(p_event_id,p_account_id,p_event_type,p_created)
  on conflict(event_id) do nothing;
  if not found then return false; end if;
  insert into app_private.course_billing(
    account_id,tier,stripe_status,stripe_customer_id,stripe_subscription_id,
    stripe_price_id,current_period_end,cancel_at_period_end,last_event_created,updated_at
  ) values(
    p_account_id,p_tier,p_status,p_customer,p_subscription,
    p_price,p_period_end,coalesce(p_cancel,false),p_created,now()
  ) on conflict(account_id) do update set
    tier=excluded.tier,stripe_status=excluded.stripe_status,
    stripe_customer_id=excluded.stripe_customer_id,stripe_subscription_id=excluded.stripe_subscription_id,
    stripe_price_id=excluded.stripe_price_id,current_period_end=excluded.current_period_end,
    cancel_at_period_end=excluded.cancel_at_period_end,last_event_created=excluded.last_event_created,
    updated_at=now();
  permitted_count:=case when p_tier in ('advanced','premium')
    and p_status in ('active','trialing') and p_period_end>now() then 5 else 1 end;
  for locked_id in
    select id from app_private.growth_courses where account_id=p_account_id
      and status in ('active','paused')
    order by is_primary desc,updated_at desc,id
    offset permitted_count
  loop
    update app_private.growth_courses set status='locked',is_primary=false,
      revision=revision+1,updated_at=now() where id=locked_id;
    update app_private.growth_cycles set status='paused',revision=revision+1,
      updated_at=now() where course_id=locked_id and account_id=p_account_id and status='active';
  end loop;
  return true;
end;
$body$;
revoke all on function app_private.apply_course_billing_event(
  uuid,text,text,bigint,text,text,text,text,text,timestamptz,boolean
) from public,anon,authenticated,hh_app_inbox;
grant execute on function app_private.apply_course_billing_event(
  uuid,text,text,bigint,text,text,text,text,text,timestamptz,boolean
) to hh_app_backend;
commit;
