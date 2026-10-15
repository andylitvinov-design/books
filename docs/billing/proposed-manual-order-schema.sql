-- UNAPPLIED: Holistic House manual billing, additive private ledger.
-- Review exact target / role grants / RLS and apply through a controlled migration.
-- Pending orders NEVER grant entitlements; those require a separately reviewed
-- receipt-confirmation + multi-course rollout. No bank account or PII stored.
DO $$ BEGIN RAISE EXCEPTION 'UNAPPLIED MANUAL BILLING PROPOSAL: explicit approval required'; END $$;
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
  refund_digest text unique check(refund_digest ~ '^[a-f0-9]{64}$'),
  refund_verified_at timestamptz,
  refund_amount_minor bigint check(refund_amount_minor between 100 and 50000000),
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
  check ((status in ('paid','refunded')) = (paid_through_at is not null)),
  check ((status='refunded') = (refund_digest is not null)),
  check ((status='refunded') = (refund_verified_at is not null)),
  check ((status='refunded') = (refund_amount_minor is not null)),
  check (refund_amount_minor is null or refund_amount_minor=amount_received_minor)
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

-- Every transition is appended by a trusted trigger, not by the browser.
create table app_private.manual_billing_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app_private.manual_billing_orders(id),
  account_id uuid not null,
  actor_id uuid not null,
  action text not null check(action in ('requested','quoted','paid','refunded','rejected','expired')),
  revision integer not null check(revision>=0),
  recorded_at timestamptz not null default clock_timestamp()
);
create index manual_billing_events_order on app_private.manual_billing_events(order_id,recorded_at desc);
revoke all on app_private.manual_billing_events from PUBLIC,anon,authenticated,hh_app_inbox;
grant select on app_private.manual_billing_events to hh_app_backend;
alter table app_private.manual_billing_events enable row level security;
alter table app_private.manual_billing_events force row level security;
create policy manual_events_read on app_private.manual_billing_events for select to hh_app_backend
  using ((account_id=(select auth.uid()) and (select app_private.account_active()))
    or (current_setting('hh.moderator',true)='1' and (select app_private.account_active())));

create function app_private.log_manual_billing_event() returns trigger
language plpgsql security definer set search_path='' as $body$
declare changed boolean;
begin
  changed := tg_op='INSERT';
  if tg_op='UPDATE' then changed := old.status is distinct from new.status; end if;
  if changed then
    insert into app_private.manual_billing_events(order_id,account_id,actor_id,action,revision)
      values(new.id,new.account_id,auth.uid(),new.status,new.revision);
  end if;
  return new;
end $body$;
revoke all on function app_private.log_manual_billing_event() from PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox;
create trigger manual_order_audit after insert or update on app_private.manual_billing_orders
  for each row execute function app_private.log_manual_billing_event();

-- Owner-only, deadline-limited expiration. The regular owner role cannot make
-- any arbitrary changes to invoices, receipt proofs, or paid subscription dates.
create function app_private.expire_my_manual_billing_orders() returns integer
language plpgsql security definer set search_path='' as $body$
declare subject uuid; updated integer;
begin
  subject:=auth.uid();
  if subject is null or not app_private.session_active() or not app_private.account_active() then
    raise exception using errcode='42501', message='MANUAL_ORDER_ACCESS_DENIED';
  end if;
  update app_private.manual_billing_orders
     set status='expired',revision=revision+1,updated_at=clock_timestamp()
   where account_id=subject and status in ('requested','quoted')
     and expires_at < clock_timestamp();
  get diagnostics updated=row_count;
  return updated;
end $body$;
revoke all on function app_private.expire_my_manual_billing_orders() from PUBLIC,anon,authenticated,hh_app_inbox;
grant execute on function app_private.expire_my_manual_billing_orders() to hh_app_backend;

-- No client, network practitioner or non-moderator role can create a paid receipt.
-- External reference is stored only as an HMAC digest, globally unique to stop reuse.
COMMIT;
