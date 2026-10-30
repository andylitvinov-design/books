-- Holistic House CAD prepaid wallet: private immutable amounts, proof-gated ledger.
-- Requires existing hh_app_backend restricted role and app_private.account_active().
-- No user-supplied payment redirect, provisional credit, cash-out, or direct browser table grants.
create table app_private.wallet_topups (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null,
 operation_id uuid not null,
 amount_minor integer not null check (amount_minor between 100 and 100000),
 currency text not null default 'CAD' check (currency='CAD'),
 provider text not null check (provider in ('paypal_personal','square_api')),
 status text not null default 'pending' check (status in ('pending','checkout_ready','reported','credited','rejected','reversed')),
 receipt_reference text check (receipt_reference is null or receipt_reference ~ '^[A-Z0-9-]{8,80}$'),
 receipt_digest text unique check (receipt_digest is null or receipt_digest ~ '^[a-f0-9]{64}$'),
 provider_order_id text unique check (provider_order_id is null or provider_order_id ~ '^[A-Za-z0-9_-]{5,192}$'),
 provider_link_id text unique check (provider_link_id is null or provider_link_id ~ '^[A-Za-z0-9_-]{5,192}$'),
 provider_payment_id text unique check (provider_payment_id is null or provider_payment_id ~ '^[A-Za-z0-9_-]{5,192}$'),
 checkout_url text check (checkout_url is null or checkout_url ~ '^https://(square[.]link/u/|sandbox[.]square[.]link/u/|staging[.]square[.]link/u/|checkout[.]square[.]site/)[A-Za-z0-9_-]{5,120}$'),
 reviewer_id uuid, verified_at timestamptz,
 revision integer not null default 0 check (revision>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(account_id,operation_id),
 constraint wallet_provider_data_check check (
   (provider='paypal_personal' and provider_order_id is null and provider_link_id is null and
    provider_payment_id is null and checkout_url is null) or
   (provider='square_api' and receipt_reference is null and receipt_digest is null and
    reviewer_id is null and (
      (provider_order_id is null and provider_link_id is null and checkout_url is null) or
      (provider_order_id is not null and provider_link_id is not null and checkout_url is not null)
    ))
 ),
 constraint wallet_verified_data_check check (
   (status not in ('credited','reversed') or verified_at is not null) and
   (status <> 'credited' or
      (provider='paypal_personal' and receipt_reference is not null and receipt_digest is not null and reviewer_id is not null) or
      (provider='square_api' and provider_payment_id is not null))
 )
);
create index wallet_topups_account_date on app_private.wallet_topups(account_id, created_at desc, id desc);
create index wallet_topups_review_date on app_private.wallet_topups(status, created_at desc)
 where provider='paypal_personal' and status in ('reported','credited','reversed','rejected');
create unique index wallet_topups_one_open_square on app_private.wallet_topups(account_id)
 where provider='square_api' and status in ('pending','checkout_ready');

create table app_private.wallet_entries (
 id uuid primary key default gen_random_uuid(),
 topup_id uuid not null references app_private.wallet_topups(id),
 account_id uuid not null,
 kind text not null check (kind in ('credit','reversal')),
 amount_minor integer not null check (amount_minor between -100000 and 100000 and amount_minor<>0),
 created_at timestamptz not null default now(),
 unique(topup_id, kind),
 check ((kind='credit' and amount_minor>0) or (kind='reversal' and amount_minor<0))
);
create index wallet_entries_account_date on app_private.wallet_entries(account_id, created_at desc, id desc);

alter table app_private.wallet_topups enable row level security;
alter table app_private.wallet_topups force row level security;
alter table app_private.wallet_entries enable row level security;
alter table app_private.wallet_entries force row level security;
revoke all on app_private.wallet_topups, app_private.wallet_entries from public, anon, authenticated, hh_app_inbox, hh_app_backend;
grant select,insert on app_private.wallet_topups to hh_app_backend;
grant update(status, receipt_reference, receipt_digest, provider_order_id, provider_link_id,
  provider_payment_id, checkout_url, reviewer_id, verified_at, revision, updated_at)
  on app_private.wallet_topups to hh_app_backend;
grant select,insert on app_private.wallet_entries to hh_app_backend;

create policy wallet_topups_read on app_private.wallet_topups
 for select to hh_app_backend using (
   (account_id=(select auth.uid()) and (select app_private.account_active()))
   or current_setting('hh.moderator',true)='1'
   or current_setting('hh.wallet_provider_verified',true)='1'
 );
create policy wallet_topups_create on app_private.wallet_topups
 for insert to hh_app_backend with check (
   account_id=(select auth.uid()) and (select app_private.account_active())
   and status='pending' and revision=0 and receipt_reference is null
   and receipt_digest is null and provider_payment_id is null and reviewer_id is null
   and verified_at is null and checkout_url is null and provider_order_id is null
   and provider_link_id is null
 );
create policy wallet_topups_change on app_private.wallet_topups
 for update to hh_app_backend using (
   (account_id=(select auth.uid()) and (select app_private.account_active()))
   or current_setting('hh.moderator',true)='1'
   or current_setting('hh.wallet_provider_verified',true)='1'
 ) with check (
   (account_id=(select auth.uid()) and (select app_private.account_active()))
   or current_setting('hh.moderator',true)='1'
   or current_setting('hh.wallet_provider_verified',true)='1'
 );
create policy wallet_entries_read on app_private.wallet_entries
 for select to hh_app_backend using (
   (account_id=(select auth.uid()) and (select app_private.account_active()))
   or current_setting('hh.moderator',true)='1'
   or current_setting('hh.wallet_provider_verified',true)='1'
 );
create policy wallet_entries_verified_create on app_private.wallet_entries
 for insert to hh_app_backend with check (
   current_setting('hh.wallet_review_verified',true)='1'
   or current_setting('hh.wallet_provider_verified',true)='1'
 );

create function app_private.wallet_topup_insert_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status<>'pending' or new.revision<>0 or new.receipt_reference is not null or
    new.receipt_digest is not null or new.provider_order_id is not null or
    new.provider_link_id is not null or new.provider_payment_id is not null or
    new.checkout_url is not null or new.reviewer_id is not null or
    new.verified_at is not null then
   raise exception 'WALLET_TOPUP_INSERT_UNVERIFIED';
 end if;
 return new;
end $$;
create trigger wallet_topup_insert_guard before insert on app_private.wallet_topups
 for each row execute function app_private.wallet_topup_insert_guard();

create function app_private.wallet_topup_update_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if row(new.id,new.account_id,new.operation_id,new.amount_minor,new.currency,new.provider,new.created_at) is distinct from
    row(old.id,old.account_id,old.operation_id,old.amount_minor,old.currency,old.provider,old.created_at)
    or new.revision<>old.revision+1
    or (old.receipt_reference is not null and new.receipt_reference is distinct from old.receipt_reference)
    or (old.receipt_digest is not null and new.receipt_digest is distinct from old.receipt_digest)
    or (old.provider_order_id is not null and new.provider_order_id is distinct from old.provider_order_id)
    or (old.provider_link_id is not null and new.provider_link_id is distinct from old.provider_link_id)
    or (old.provider_payment_id is not null and new.provider_payment_id is distinct from old.provider_payment_id)
    or (old.checkout_url is not null and new.checkout_url is distinct from old.checkout_url)
    or (old.verified_at is not null and new.verified_at is distinct from old.verified_at)
    or (old.reviewer_id is not null and new.reviewer_id is distinct from old.reviewer_id)
    or new.updated_at < old.updated_at then
   raise exception 'WALLET_TOPUP_IMMUTABLE';
 end if;

 if old.status='pending' and new.status='reported' and old.provider='paypal_personal' and
    new.receipt_reference is not null and new.receipt_digest is null and
    new.reviewer_id is null and new.verified_at is null then return new; end if;

 if old.status='pending' and new.status='checkout_ready' and old.provider='square_api' and
    new.provider_link_id is not null and new.provider_order_id is not null and
    new.checkout_url is not null and new.provider_payment_id is null then return new; end if;

 if old.status='reported' and new.status='credited' and old.provider='paypal_personal' and
    current_setting('hh.wallet_review_verified',true)='1' and
    current_setting('hh.moderator',true)='1' and
    new.receipt_digest is not null and new.reviewer_id is not null and
    new.verified_at is not null then return new; end if;

 if old.status='checkout_ready' and new.status='credited' and old.provider='square_api' and
    current_setting('hh.wallet_provider_verified',true)='1' and
    new.provider_payment_id is not null and new.verified_at is not null then return new; end if;

 if old.status='credited' and new.status='reversed' and
    ((old.provider='paypal_personal' and current_setting('hh.wallet_review_verified',true)='1'
      and current_setting('hh.moderator',true)='1') or
     (old.provider='square_api' and current_setting('hh.wallet_provider_verified',true)='1')) then
   return new;
 end if;

 if old.status in ('pending','reported') and new.status='rejected' and
    current_setting('hh.wallet_review_verified',true)='1' and
    current_setting('hh.moderator',true)='1' then return new; end if;

 raise exception 'WALLET_TOPUP_TRANSITION_DENIED';
end $$;
create trigger wallet_topup_update_guard before update on app_private.wallet_topups
 for each row execute function app_private.wallet_topup_update_guard();

create function app_private.wallet_ledger_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
declare parent app_private.wallet_topups%rowtype;
begin
 if current_setting('hh.wallet_review_verified',true) is distinct from '1' and
    current_setting('hh.wallet_provider_verified',true) is distinct from '1' then
   raise exception 'WALLET_PROVIDER_PROOF_REQUIRED';
 end if;
 select * into parent from app_private.wallet_topups where id=new.topup_id for update;
 if not found or new.account_id<>parent.account_id or
    (new.kind='credit' and (new.amount_minor<>parent.amount_minor or parent.status<>'credited')) or
    (new.kind='reversal' and (new.amount_minor<>-parent.amount_minor or parent.status<>'reversed')) then
   raise exception 'WALLET_LEDGER_EVIDENCE_MISMATCH';
 end if;
 return new;
end $$;
create trigger wallet_ledger_guard before insert on app_private.wallet_entries
 for each row execute function app_private.wallet_ledger_guard();

revoke all on function app_private.wallet_topup_insert_guard(),
 app_private.wallet_topup_update_guard(), app_private.wallet_ledger_guard()
 from public, anon, authenticated, hh_app_inbox;
grant execute on function app_private.wallet_topup_insert_guard(),
 app_private.wallet_topup_update_guard(), app_private.wallet_ledger_guard() to hh_app_backend;

comment on table app_private.wallet_topups is
 'CAD prepaid service credit. Provider-specific evidence; no cash-out or transfer. Manual PayPal requires owner receipt reconciliation.';
comment on table app_private.wallet_entries is
 'Append-only signed CAD cents. One credit and at most one reversal per top-up. No browser privileges.';