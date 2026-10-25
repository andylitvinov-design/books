-- Holistic House · Reiki Practitioner voluntary donation receipts, 25 October 2026
-- Separate financial proof from encrypted course answers and CRM contacts.
-- PayPal.Me is NOT an authenticated capture API: owner proof is mandatory.
begin;

create table if not exists app_private.reiki_donation_orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  application_lead_id uuid not null unique references app_private.reiki_course_leads(id) on delete cascade,
  operation_id uuid not null,
  traditions text[] not null check (
    cardinality(traditions) between 1 and 2 and
    traditions <@ array['tantra','kundalini','yggdrasil']::text[]
  ),
  currency text not null default 'EUR' check (currency = 'EUR'),
  amount_minor integer not null check (amount_minor between 100 and 25000 and amount_minor % 100 = 0),
  status text not null default 'pending' check (status in ('pending','review','paid')),
  claim_ciphertext text,
  claim_digest text unique check (claim_digest is null or claim_digest ~ '^[0-9a-f]{64}$'),
  verified_digest text unique check (verified_digest is null or verified_digest ~ '^[0-9a-f]{64}$'),
  paid_minor integer check (paid_minor is null or paid_minor > 0),
  verified_at timestamptz,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, operation_id),
  constraint reiki_donation_receipt_state check (
    (status = 'pending' and claim_ciphertext is null and claim_digest is null
      and paid_minor is null and verified_digest is null and verified_at is null) or
    (status = 'review' and claim_ciphertext is not null and claim_digest is not null
      and paid_minor is null and verified_digest is null and verified_at is null) or
    (status = 'paid' and claim_ciphertext is not null and claim_digest is not null
      and paid_minor = amount_minor and verified_digest = claim_digest and verified_at is not null)
  )
);
create index if not exists reiki_donation_orders_account_time_idx
  on app_private.reiki_donation_orders(account_id, created_at desc);
create index if not exists reiki_donation_orders_owner_queue_idx
  on app_private.reiki_donation_orders(status, created_at desc);
alter table app_private.reiki_donation_orders enable row level security;
alter table app_private.reiki_donation_orders force row level security;
revoke all on app_private.reiki_donation_orders from public, anon, authenticated;
do $revoke_service$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app_private.reiki_donation_orders from service_role';
  end if;
end $revoke_service$;

grant select, insert on app_private.reiki_donation_orders to hh_app_backend;
grant update(status,claim_ciphertext,claim_digest,revision,updated_at)
  on app_private.reiki_donation_orders to hh_app_backend;
create policy reiki_donations_student_read on app_private.reiki_donation_orders
  for select to hh_app_backend
  using (account_id = (select auth.uid()) and (select app_private.account_active()));
create policy reiki_donations_student_insert on app_private.reiki_donation_orders
  for insert to hh_app_backend
  with check (account_id = (select auth.uid()) and (select app_private.account_active())
    and status = 'pending' and paid_minor is null and verified_at is null);
create policy reiki_donations_student_claim on app_private.reiki_donation_orders
  for update to hh_app_backend
  using (account_id = (select auth.uid()) and (select app_private.account_active())
    and status = 'pending')
  with check (account_id = (select auth.uid()) and (select app_private.account_active())
    and status = 'review' and paid_minor is null and verified_at is null
    and claim_digest is not null and claim_ciphertext is not null);

-- Owner-only CRM role after the existing admin PIN/session boundary.
grant select on app_private.reiki_donation_orders to hh_app_inbox;
grant update(status,paid_minor,verified_digest,verified_at,revision,updated_at)
  on app_private.reiki_donation_orders to hh_app_inbox;
create policy reiki_donations_owner_read on app_private.reiki_donation_orders
  for select to hh_app_inbox
  using (current_setting('hh.practitioner_id',true) =
    '246aa1a3-a371-5a83-9f4b-cd23ff027a76');
create policy reiki_donations_owner_verify on app_private.reiki_donation_orders
  for update to hh_app_inbox
  using (current_setting('hh.practitioner_id',true) =
    '246aa1a3-a371-5a83-9f4b-cd23ff027a76' and status = 'review')
  with check (current_setting('hh.practitioner_id',true) =
    '246aa1a3-a371-5a83-9f4b-cd23ff027a76' and status = 'paid');

commit;
