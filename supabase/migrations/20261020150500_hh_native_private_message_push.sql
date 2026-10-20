-- Holistic House: distinct APNs/FCM registration for signed native apps.
-- Existing opt-in Web Push and live-activity tokens are unchanged.
-- No Firebase or Apple credentials are stored in this database.
create table if not exists app_private.native_push_devices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  platform text not null check(platform in ('ios','android')),
  environment text not null check(environment in ('sandbox','production')),
  app_id text not null default 'com.holistichouse.app'
    check(app_id='com.holistichouse.app'),
  token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
  token_ciphertext text not null check(char_length(token_ciphertext) between 80 and 12000),
  locale text not null check(locale in ('en','ru')),
  message_alerts boolean not null default false,
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not message_alerts or consented_at is not null)
);
create index if not exists native_push_devices_account_idx
  on app_private.native_push_devices(account_id,created_at desc);
alter table app_private.native_push_devices enable row level security;
alter table app_private.native_push_devices force row level security;
revoke all on app_private.native_push_devices from public,anon,authenticated;
grant select,insert,update,delete on app_private.native_push_devices to hh_app_backend;
create policy native_push_devices_owner on app_private.native_push_devices
  for all to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.account_active()))
  with check (account_id=(select auth.uid()) and (select app_private.account_active()));

-- No direct delivery-ledger access, even for authenticated clients.
-- Idempotent claim: one unique (message,device) prevents duplicate sends.
create table if not exists app_private.native_push_delivery_log (
  message_id uuid not null references app.practitioner_request_messages(id) on delete cascade,
  device_id uuid not null references app_private.native_push_devices(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  state text not null default 'claimed'
    check(state in ('claimed','accepted','rejected','unknown','revoked')),
  provider_status integer,
  completed_at timestamptz,
  primary key(message_id,device_id)
);
alter table app_private.native_push_delivery_log enable row level security;
alter table app_private.native_push_delivery_log force row level security;
revoke all on app_private.native_push_delivery_log from public,anon,authenticated,hh_app_backend;

-- Restrict recipient lookup to a verified, newly committed practitioner reply.
-- Raw messages, patient identity, tests and medical data never leave Postgres.
create or replace function app_private.claim_native_private_message_push(p_message_id uuid)
returns table(
  device_id uuid,account_id uuid,token_ciphertext text,
  platform text,environment text,locale text,request_id uuid
)
language sql security definer set search_path = ''
as $$
  with eligible as (
    select d.id as device_id,d.account_id,d.token_ciphertext,
           d.platform,d.environment,d.locale,r.id as request_id
    from app.practitioner_request_messages msg
    join app.consultation_requests r on r.id=msg.request_id
    join app.practitioners practitioner on practitioner.id=r.recipient_practitioner_id
    join app.accounts account on account.id=r.account_id
    join app_private.native_push_devices d on d.account_id=r.account_id
    where msg.id=p_message_id
      and msg.author_role='practitioner'
      and msg.visibility='participants'
      and msg.author_account_id=practitioner.trusted_auth_user_id
      and practitioner.active=true
      and practitioner.status in ('approved','submitted','changes_requested')
      and r.status in ('requested','contacted')
      and account.status='active'
      and account.onboarding_state='active'
      and d.message_alerts=true
      and d.consented_at is not null
      and msg.created_at>now()-interval '15 minutes'
    order by d.created_at desc
    limit 5
  ), claimed as (
    insert into app_private.native_push_delivery_log(message_id,device_id)
    select p_message_id,e.device_id from eligible e
    on conflict(message_id,device_id) do nothing
    returning device_id
  )
  select e.device_id,e.account_id,e.token_ciphertext,e.platform,
         e.environment,e.locale,e.request_id
  from eligible e join claimed c on c.device_id=e.device_id
$$;
revoke all on function app_private.claim_native_private_message_push(uuid)
  from public,anon,authenticated;
grant execute on function app_private.claim_native_private_message_push(uuid)
  to hh_app_backend;

create or replace function app_private.finish_native_private_message_push(
  p_message_id uuid,p_device_id uuid,p_state text,p_provider_status integer
)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if p_state not in ('accepted','rejected','unknown','revoked') then return false; end if;
  update app_private.native_push_delivery_log
  set state=p_state,provider_status=p_provider_status,completed_at=now()
  where message_id=p_message_id and device_id=p_device_id and state='claimed';
  return found;
end;
$$;
revoke all on function app_private.finish_native_private_message_push(uuid,uuid,text,integer)
  from public,anon,authenticated;
grant execute on function app_private.finish_native_private_message_push(uuid,uuid,text,integer)
  to hh_app_backend;
