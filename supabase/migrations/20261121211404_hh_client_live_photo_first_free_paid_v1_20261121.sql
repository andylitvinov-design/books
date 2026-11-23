-- Exactly one lifetime complimentary HeyGen live-photo generation per account.
-- All later AI jobs require an independently verified, single-use manual receipt.
-- Retain spent entitlements even after the user deletes the generated MP4.
begin;
create table if not exists app_private.client_live_photo_orders_v1 (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  request_id uuid not null,
  currency text not null default 'EUR' check (currency='EUR'),
  price_minor integer not null default 250 check (price_minor=250),
  payment_method text not null default 'paypal-eur'
    check (payment_method in ('paypal-eur')),
  status text not null default 'requested'
    check (status in ('requested','verified','consumed','rejected','refunded')),
  receipt_digest text unique
    check (receipt_digest is null or receipt_digest ~ '^[0-9a-f]{64}$'),
  reviewer_id uuid,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, request_id),
  unique(account_id, id),
  check (status not in ('verified','consumed') or (receipt_digest is not null and verified_at is not null)),
  check (status <> 'consumed' or consumed_at is not null)
);
alter table app_private.client_live_photo_orders_v1 enable row level security;
alter table app_private.client_live_photo_orders_v1 force row level security;
revoke all on app_private.client_live_photo_orders_v1 from public, anon, authenticated, hh_app_inbox;
grant select, insert, update on app_private.client_live_photo_orders_v1 to hh_app_backend;
drop policy if exists hh_live_photo_orders_owner_v1 on app_private.client_live_photo_orders_v1;
create policy hh_live_photo_orders_owner_v1 on app_private.client_live_photo_orders_v1
  for all to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
drop policy if exists hh_live_photo_orders_moderator_v1 on app_private.client_live_photo_orders_v1;
create policy hh_live_photo_orders_moderator_v1 on app_private.client_live_photo_orders_v1
  for all to hh_app_backend
  using(current_setting('hh.moderator',true)='1')
  with check(current_setting('hh.moderator',true)='1');
create index if not exists hh_live_photo_orders_owner_idx
  on app_private.client_live_photo_orders_v1(account_id,created_at desc);
create index if not exists hh_live_photo_orders_review_idx
  on app_private.client_live_photo_orders_v1(status,created_at desc);

alter table app_private.client_live_photos_v1
  add column if not exists billing_kind text not null default 'free'
  check (billing_kind in ('free','paid'));
alter table app_private.client_live_photos_v1
  add column if not exists paid_order_id uuid;
alter table app_private.client_live_photos_v1
  drop constraint if exists hh_client_live_photo_billing_required;
alter table app_private.client_live_photos_v1
  add constraint hh_client_live_photo_billing_required check
    ((billing_kind='free' and paid_order_id is null) or
     (billing_kind='paid' and paid_order_id is not null));
alter table app_private.client_live_photos_v1
  drop constraint if exists hh_client_live_photo_order_owner_fk;
alter table app_private.client_live_photos_v1
  add constraint hh_client_live_photo_order_owner_fk
  foreign key(account_id,paid_order_id)
  references app_private.client_live_photo_orders_v1(account_id,id);
-- This partial unique index deliberately includes failed/deleted results.
-- It cannot be reset by deleting a finished video, logging out or changing devices.
create unique index if not exists hh_one_free_live_photo_lifetime_idx
  on app_private.client_live_photos_v1(account_id) where billing_kind='free';
create unique index if not exists hh_one_render_per_paid_live_photo_order_idx
  on app_private.client_live_photos_v1(paid_order_id) where paid_order_id is not null;
commit;
