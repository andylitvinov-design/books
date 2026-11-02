-- Applied via Supabase migration ledger: 20261020162221.
-- Private account contact phone, never an SMS marketing opt-in or verified mobile.
create table app_private.client_contact_phones (
  account_id uuid primary key references app.accounts(id) on delete cascade,
  phone_ciphertext text not null,
  phone_fingerprint text not null check (phone_fingerprint ~ '^[0-9a-f]{64}$'),
  phone_last4 text not null check (phone_last4 ~ '^[0-9]{4}$'),
  consent_version text not null check (consent_version='client-contact-phone-v1'),
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table app_private.client_contact_phones is
 'Encrypted owner-managed phone only; NOT verified phone, SMS consent, business CRM contact or campaign subscriber.';
alter table app_private.client_contact_phones enable row level security;
alter table app_private.client_contact_phones force row level security;
revoke all on app_private.client_contact_phones from public,anon,authenticated;
grant select,insert,delete on app_private.client_contact_phones to hh_app_backend;
grant update (phone_ciphertext,phone_fingerprint,phone_last4,consent_version,consented_at,updated_at)
 on app_private.client_contact_phones to hh_app_backend;
create policy client_contact_phone_read on app_private.client_contact_phones
 for select to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.session_active()));
create policy client_contact_phone_insert on app_private.client_contact_phones
 for insert to hh_app_backend
 with check(account_id=(select auth.uid()) and (select app_private.session_active()));
create policy client_contact_phone_update on app_private.client_contact_phones
 for update to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.session_active()))
 with check(account_id=(select auth.uid()) and (select app_private.session_active()));
create policy client_contact_phone_remove on app_private.client_contact_phones
 for delete to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.session_active()));