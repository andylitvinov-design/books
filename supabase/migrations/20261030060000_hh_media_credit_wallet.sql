-- Holistic House media credits. Amounts are integer US cents (not transferable cash).
-- Private-only wallet. No Data API grants, no anonymous balance reads.
begin;

create table app_private.media_credit_wallets (
  account_id uuid primary key references app.accounts(id) on delete cascade,
  bonus_minor integer not null default 200 check (bonus_minor between 0 and 10000000),
  paid_minor integer not null default 0 check (paid_minor between 0 and 10000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table app_private.media_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  idempotency_key text not null unique check (length(idempotency_key) between 9 and 160),
  kind text not null check (kind in ('welcome','topup','spend','restore','chargeback')),
  bonus_delta integer not null default 0,
  paid_delta integer not null default 0,
  created_at timestamptz not null default now(),
  check (bonus_delta <> 0 or paid_delta <> 0)
);
create index media_credit_ledger_account_idx
  on app_private.media_credit_ledger(account_id,created_at desc,id);

create table app_private.media_credit_topups (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null,
  account_id uuid not null references app.accounts(id) on delete cascade,
  provider text not null check (provider in ('stripe','paypal')),
  environment text not null check (environment in ('live','sandbox')),
  amount_minor integer not null check (amount_minor in (500,1000,2000)),
  currency text not null default 'USD' check (currency='USD'),
  locale text not null check (locale in ('en','ru','es')),
  status text not null default 'pending'
    check (status in ('pending','checkout_ready','paid','held','reversed')),
  provider_checkout_id text unique check (length(provider_checkout_id) between 8 and 200),
  provider_capture_id text unique check (length(provider_capture_id) between 8 and 200),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,operation_id),
  check (status not in ('paid','held','reversed') or (provider_capture_id is not null and paid_at is not null))
);
create index media_credit_topups_account_idx
  on app_private.media_credit_topups(account_id,created_at desc,id);

-- Prepared for real provider jobs. Local/free video and device TTS do not enter this table.
create table app_private.media_credit_jobs (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null,
  account_id uuid not null references app.accounts(id) on delete cascade,
  sku text not null check (sku in ('video-smart','video-pro','audio-smart','audio-pro')),
  price_minor integer not null check (
    (sku='video-smart' and price_minor=200) or
    (sku='video-pro' and price_minor=990) or
    (sku='audio-smart' and price_minor=50) or
    (sku='audio-pro' and price_minor=150)
  ),
  bonus_spent integer not null default 0 check (bonus_spent>=0),
  paid_spent integer not null default 0 check (paid_spent>=0),
  status text not null default 'reserved' check (status in ('reserved','completed','failed')),
  provider_task_id text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique(account_id,operation_id),
  check(bonus_spent+paid_spent=price_minor)
);

alter table app_private.media_credit_wallets enable row level security;
alter table app_private.media_credit_wallets force row level security;
alter table app_private.media_credit_ledger enable row level security;
alter table app_private.media_credit_ledger force row level security;
alter table app_private.media_credit_topups enable row level security;
alter table app_private.media_credit_topups force row level security;
alter table app_private.media_credit_jobs enable row level security;
alter table app_private.media_credit_jobs force row level security;

revoke all on app_private.media_credit_wallets,app_private.media_credit_ledger,
  app_private.media_credit_topups,app_private.media_credit_jobs from public,anon,authenticated,hh_app_inbox;
grant select,insert,update on app_private.media_credit_wallets to hh_app_backend;
grant select,insert on app_private.media_credit_ledger to hh_app_backend;
grant select,insert,update(status,provider_checkout_id,provider_capture_id,paid_at,updated_at)
  on app_private.media_credit_topups to hh_app_backend;
grant select,insert,update(status,provider_task_id,finished_at)
  on app_private.media_credit_jobs to hh_app_backend;

create policy media_credit_wallet_account on app_private.media_credit_wallets
  for all to hh_app_backend using (
    (account_id=(select auth.uid()) and (select app_private.account_active()))
    or current_setting('hh.media_payment_verified',true)='true'
  ) with check (
    (account_id=(select auth.uid()) and (select app_private.account_active()))
    or current_setting('hh.media_payment_verified',true)='true'
  );
create policy media_credit_ledger_account on app_private.media_credit_ledger
  for select to hh_app_backend using (
    account_id=(select auth.uid()) and (select app_private.account_active())
  );
create policy media_credit_ledger_insert on app_private.media_credit_ledger
  for insert to hh_app_backend with check (
    (account_id=(select auth.uid()) and (select app_private.account_active()))
    or current_setting('hh.media_payment_verified',true)='true'
  );
create policy media_credit_topup_account on app_private.media_credit_topups
  for all to hh_app_backend using (
    (account_id=(select auth.uid()) and (select app_private.account_active()))
    or current_setting('hh.media_payment_verified',true)='true'
  ) with check (
    (account_id=(select auth.uid()) and (select app_private.account_active()))
    or current_setting('hh.media_payment_verified',true)='true'
  );
create policy media_credit_jobs_account on app_private.media_credit_jobs
  for all to hh_app_backend using (
    account_id=(select auth.uid()) and (select app_private.account_active())
  ) with check (
    account_id=(select auth.uid()) and (select app_private.account_active())
  );

-- Only a provider-verified server transaction may mark a top-up as paid.
create function app_private.media_credit_topup_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.account_id<>old.account_id or new.operation_id<>old.operation_id
    or new.provider<>old.provider or new.environment<>old.environment
    or new.currency<>old.currency or new.amount_minor<>old.amount_minor
    or new.locale<>old.locale or new.created_at<>old.created_at then
    raise exception 'MEDIA_CREDIT_TOPUP_IMMUTABLE';
  end if;
  if old.provider_checkout_id is not null and
    new.provider_checkout_id is distinct from old.provider_checkout_id then
    raise exception 'MEDIA_CREDIT_PROVIDER_ID_IMMUTABLE';
  end if;
  if old.provider_capture_id is not null and
    new.provider_capture_id is distinct from old.provider_capture_id then
    raise exception 'MEDIA_CREDIT_CAPTURE_ID_IMMUTABLE';
  end if;
  if new.status in ('paid','held','reversed') and
    (new.status is distinct from old.status or new.provider_capture_id is distinct from old.provider_capture_id) and
    current_setting('hh.media_payment_verified',true) is distinct from 'true' then
    raise exception 'MEDIA_CREDIT_PAYMENT_PROOF_REQUIRED';
  end if;
  if old.status in ('paid','held','reversed') and
    new.status in ('pending','checkout_ready') then
    raise exception 'MEDIA_CREDIT_PAYMENT_CANNOT_REGRESS';
  end if;
  return new;
end; $$;
revoke all on function app_private.media_credit_topup_guard() from public,anon,authenticated,hh_app_inbox;
grant execute on function app_private.media_credit_topup_guard() to hh_app_backend;
create trigger media_credit_topup_guard before update
  on app_private.media_credit_topups for each row
  execute function app_private.media_credit_topup_guard();

comment on table app_private.media_credit_wallets is
  'Personal non-withdrawable USD-equivalent media-generation credit balance: bonus and purchased portions tracked separately.';
commit;