-- SUPERSEDED / INACTIVE PR427 DRAFT: do not apply.
-- Canonical notifications use existing app_private tables and dispatcher.
-- See docs/billing/NOTIFICATION-RECONCILIATION.md.
-- UNAPPLIED PROPOSAL. Requires explicit approval and isolated SQL/RLS testing.
-- Depends on reviewed enrollment schema and billing subscription schema.
-- No role membership, environment values, keys or cron are configured here.
DO $$ BEGIN RAISE EXCEPTION 'UNAPPLIED NOTIFICATION DISPATCH PROPOSAL: explicit approval required'; END $$;
begin;
create role hh_course_push_worker nologin noinherit nosuperuser nobypassrls;
grant usage on schema app_private to hh_course_push_worker;
-- APPROVAL-NEEDED PLACEHOLDER: GRANT hh_course_push_worker TO <restricted runtime login>;
-- Never grant hh_app_backend or hh_billing_backend TO this worker role.
create table app_private.course_push_deliveries (
  device_id uuid not null references app_private.course_push_devices(id) on delete cascade,
  environment text not null check(environment in ('sandbox','live')),
  local_day date not null,
  claim_id uuid not null,
  status text not null check(status in ('dispatching','retry','accepted','skipped','unknown','failed','revoked')),
  attempts integer not null check(attempts between 1 and 3),
  provider_status integer check(provider_status between 100 and 599),
  next_attempt_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(device_id,environment,local_day)
);
alter table app_private.course_push_deliveries enable row level security;
alter table app_private.course_push_deliveries force row level security;
revoke all on app_private.course_push_deliveries from public,anon,authenticated,hh_app_backend,hh_app_inbox,hh_course_push_worker;
-- Helpers must be owned by the trusted migration owner, never a runtime role.
-- The worker can execute only these fixed queries, not SELECT health/client tables.
create function app_private.course_push_snapshot(p_device uuid,p_environment text,p_lock boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d record; p record; a record; paid timestamptz; owner uuid; cycle_active boolean;
begin
  if p_environment not in ('sandbox','live') then return null; end if;
  select account_id into owner from app_private.course_push_devices where id=p_device and environment=p_environment;
  if owner is null then return null; end if;
  if p_lock then
    perform id from app.accounts where id=owner for update;
    perform owner_id from billing_private.accounts where owner_id=owner and environment=p_environment order by provider for share;
    perform id from app_private.growth_courses where account_id=owner for share;
    perform id from app_private.growth_cycles where account_id=owner order by id for share;
    perform account_id from app_private.course_notification_preferences where account_id=owner and environment=p_environment for update;
    perform id from app_private.course_push_devices where id=p_device and environment=p_environment for update;
  end if;
  select id,account_id,environment,subscription_ciphertext,consent_version,revoked_at into d from app_private.course_push_devices where id=p_device and environment=p_environment;
  if not found then return null; end if;
  select enabled,timezone,locale,daily_at,quiet_hours_enabled,quiet_start,quiet_end into p from app_private.course_notification_preferences where account_id=owner and environment=p_environment;
  if not found then return null; end if;
  select status,onboarding_state into a from app.accounts where id=owner;
  if not found then return null; end if;
  select exists(select 1 from app_private.growth_cycles cy
    join app_private.growth_courses co on co.id=cy.course_id and co.account_id=cy.account_id
    where cy.account_id=owner and cy.status='active' and co.status='active') into cycle_active;
  select max(paid_through_at) into paid from billing_private.subscriptions
    where owner_id=owner and environment=p_environment and plan_id in ('start','advanced','premium') and is_current and revoked_at is null;
  return jsonb_build_object(
    'accountId',owner,'deviceId',p_device,
    'accountActive',a.status='active' and a.onboarding_state='active',
    'courseActive',cycle_active,
    'deviceActive',d.revoked_at is null,'consentVersion',d.consent_version,
    'entitlementActive',coalesce(paid>clock_timestamp(),false),'paidThrough',paid,
    'subscriptionCiphertext',case when p_lock then d.subscription_ciphertext else null end,
    'preferences',jsonb_build_object('enabled',p.enabled,'timezone',p.timezone,'locale',p.locale,'dailyAt',p.daily_at,
      'quietHoursEnabled',p.quiet_hours_enabled,'quietStart',p.quiet_start,'quietEnd',p.quiet_end));
end $$;
create function app_private.course_push_due(s jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare p jsonb; t timestamp; m integer; scheduled integer; qs integer; qe integer;
begin
  if s is null or not coalesce((s->>'accountActive')::boolean,false) or not coalesce((s->>'courseActive')::boolean,false)
    or not coalesce((s->>'entitlementActive')::boolean,false) or not coalesce((s->>'deviceActive')::boolean,false)
    or coalesce(s->>'consentVersion','')<>'course-push-v1' then return false; end if;
  p=s->'preferences';
  if not coalesce((p->>'enabled')::boolean,false) or not exists(select 1 from pg_catalog.pg_timezone_names where name=p->>'timezone') then return false; end if;
  t=clock_timestamp() at time zone (p->>'timezone');
  m=extract(hour from t)::integer*60+extract(minute from t)::integer;
  scheduled=split_part(p->>'dailyAt',':',1)::integer*60+split_part(p->>'dailyAt',':',2)::integer;
  if m<scheduled or m>=scheduled+60 then return false; end if;
  if (p->>'quietHoursEnabled')::boolean then
    qs=split_part(p->>'quietStart',':',1)::integer*60+split_part(p->>'quietStart',':',2)::integer;
    qe=split_part(p->>'quietEnd',':',1)::integer*60+split_part(p->>'quietEnd',':',2)::integer;
    if (qs<qe and m>=qs and m<qe) or (qs>=qe and (m>=qs or m<qe)) then return false; end if;
  end if;
  return true;
end $$;
create function app_private.course_push_candidates(p_environment text,p_limit integer)
returns table(device_id uuid) language sql security definer set search_path='' as $$
  select d.id from app_private.course_push_devices d
  join app_private.course_notification_preferences p on p.account_id=d.account_id and p.environment=d.environment
  where d.environment=p_environment and p.enabled and d.revoked_at is null
    and app_private.course_push_due(app_private.course_push_snapshot(d.id,p_environment,false))
    and not exists(select 1 from app_private.course_push_deliveries q
      where q.device_id=d.id and q.environment=p_environment and q.local_day=(clock_timestamp() at time zone p.timezone)::date
      and (q.status<>'retry' or q.attempts>=3 or q.next_attempt_at>clock_timestamp()))
  order by d.id limit least(greatest(p_limit,1),50)
$$;
create function app_private.course_push_claim(p_device uuid,p_environment text,p_day date,p_claim uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb; attempt integer;
begin
  -- Match enrollment/unsubscribe lock order even while creating the durable claim.
  s=app_private.course_push_snapshot(p_device,p_environment,true);
  if not app_private.course_push_due(s) or p_day<>(clock_timestamp() at time zone (s->'preferences'->>'timezone'))::date then return null; end if;
  insert into app_private.course_push_deliveries(device_id,environment,local_day,claim_id,status,attempts)
    values(p_device,p_environment,p_day,p_claim,'dispatching',1)
    on conflict(device_id,environment,local_day) do update set claim_id=excluded.claim_id,status='dispatching',
      attempts=app_private.course_push_deliveries.attempts+1,next_attempt_at=null,updated_at=clock_timestamp()
    where app_private.course_push_deliveries.status='retry' and app_private.course_push_deliveries.attempts<3
      and app_private.course_push_deliveries.next_attempt_at<=clock_timestamp()
    returning attempts into attempt;
  return case when attempt is null then null else jsonb_build_object('attempt',attempt) end;
end $$;
create function app_private.course_push_claim_valid(p_device uuid,p_environment text,p_day date,p_claim uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare valid boolean;
begin
  select true into valid from app_private.course_push_deliveries where device_id=p_device and environment=p_environment
    and local_day=p_day and claim_id=p_claim and status='dispatching' for update;
  return coalesce(valid,false);
end $$;
create function app_private.course_push_finish(p_device uuid,p_environment text,p_day date,p_claim uuid,p_status text,p_code integer,p_retry timestamptz)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_status not in ('retry','accepted','skipped','unknown','failed','revoked') or (p_code is not null and p_code not between 100 and 599)
    or (p_status='retry' and (p_retry is null or p_retry<=clock_timestamp() or p_retry>clock_timestamp()+interval '5 minutes')) then
    raise exception 'PUSH_OUTCOME_INVALID';
  end if;
  update app_private.course_push_deliveries set status=p_status,provider_status=p_code,next_attempt_at=p_retry,updated_at=clock_timestamp()
    where device_id=p_device and environment=p_environment and local_day=p_day and claim_id=p_claim and status='dispatching';
  if found and p_status='revoked' then update app_private.course_push_devices set revoked_at=clock_timestamp(),updated_at=clock_timestamp()
    where id=p_device and environment=p_environment; end if;
end $$;
revoke all on function app_private.course_push_snapshot(uuid,text,boolean),app_private.course_push_due(jsonb),app_private.course_push_candidates(text,integer),app_private.course_push_claim(uuid,text,date,uuid),app_private.course_push_claim_valid(uuid,text,date,uuid),app_private.course_push_finish(uuid,text,date,uuid,text,integer,timestamptz) from public,anon,authenticated,hh_app_backend,hh_app_inbox;
grant execute on function app_private.course_push_snapshot(uuid,text,boolean),app_private.course_push_candidates(text,integer),app_private.course_push_claim(uuid,text,date,uuid),app_private.course_push_claim_valid(uuid,text,date,uuid),app_private.course_push_finish(uuid,text,date,uuid,text,integer,timestamptz) to hh_course_push_worker;
-- A crash after the committed claim never auto-retries: stale 'dispatching' is an
-- UNKNOWN attempt. Retention/operational cleanup requires a separately reviewed task.
-- Billing expiry is re-evaluated immediately before sending, and canceled-but-paid
-- access remains eligible until paid_through_at. Only generic content is delivered.
rollback;
