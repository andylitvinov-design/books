-- UNAPPLIED: Holistic House manual billing, additive private ledger.
-- Review exact target / role grants / RLS and apply through a controlled migration.
-- Pending orders NEVER grant entitlements; those require a separately reviewed
-- receipt-confirmation + multi-course rollout. No bank account or PII stored.
DO $ BEGIN RAISE EXCEPTION 'UNAPPLIED MANUAL BILLING PROPOSAL: explicit approval required'; END $;
BEGIN;

create table app_private.manual_billing_orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null, -- logical UUID: financial-retention review on account deletion
  operation_id uuid not null,
  plan_id text not null check (plan_id in ('advanced','premium')),
  method_id text not null check (method_id in ('paypal-eur','paypal-usd','interac-cad','privatbank-uah')),
  currency text not null check (currency in ('EUR','USD','CAD','UAH')),
  reference_euro_cents integer not null check(reference_euro_cents in (2000,10000)),
  first_month_candidate boolean not null default false,
  first_month_discount_applied boolean not null default false,
  revision integer not null default 0 check(revision>=0),
  status text not null default 'requested' check(status in ('requested','quoted','paid','rejected','refunded','expired')),
  invoice_currency text check(invoice_currency in ('EUR','USD','CAD','UAH')),
  invoice_amount_minor bigint check(invoice_amount_minor between 100 and 50000000),
  quote_confirmed_at timestamptz,
  receipt_digest text unique check(receipt_digest ~ '^[a-f0-9]{64}$'),
  receipt_channel text check(receipt_channel in ('bank_statement','paypal_transaction')),
  amount_received_minor bigint check(amount_received_minor between 100 and 50000000),
  reviewer_id uuid,
  verified_at timestamptz,
  paid_from_at timestamptz,
  paid_through_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,operation_id),
  check (invoice_currency is null or invoice_currency=currency),
  check ((status='requested' and invoice_amount_minor is null and quote_confirmed_at is null)
      or (status<>'requested')),
  check ((status in ('paid','refunded')) = (verified_at is not null)),
  check ((status in ('paid','refunded')) = (receipt_digest is not null)),
  check ((status in ('paid','refunded')) = (paid_through_at is not null))
);
create unique index manual_one_pending_per_owner
  on app_private.manual_billing_orders(account_id) where status in ('requested','quoted');
create index manual_orders_owner_recent on app_private.manual_billing_orders(account_id,created_at desc);
create index manual_orders_review_queue on app_private.manual_billing_orders(status,created_at desc);

revoke all on app_private.manual_billing_orders from PUBLIC,anon,authenticated,hh_app_inbox;
grant select,insert,update on app_private.manual_billing_orders to hh_app_backend;
alter table app_private.manual_billing_orders enable row level security;
alter table app_private.manual_billing_orders force row level security;
create policy manual_orders_read on app_private.manual_billing_orders
  for select to hh_app_backend
  using ((account_id=(select auth.uid()) and (select app_private.account_active()))
    or (current_setting('hh.moderator',true)='1' and (select app_private.account_active())));
create policy manual_orders_owner_create on app_private.manual_billing_orders
  for insert to hh_app_backend
  with check(account_id=(select auth.uid()) and (select app_private.account_active())
    and status='requested' and invoice_amount_minor is null and verified_at is null);
create policy manual_orders_reviewer_change on app_private.manual_billing_orders
  for update to hh_app_backend
  using (current_setting('hh.moderator',true)='1' and (select app_private.account_active()))
  with check (current_setting('hh.moderator',true)='1' and (select app_private.account_active()));

-- No client, network practitioner or non-moderator role can create a paid receipt.
-- External reference is stored only as an HMAC digest, globally unique to stop reuse.
COMMIT;
