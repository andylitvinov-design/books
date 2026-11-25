-- Candidate: verified Reiki registration -> existing CRM. No provider or marketing activation.
-- Apply only after protected migration review and isolated role/RLS tests.
begin;
create table app_private.crm_reiki_registrations (
 account_id uuid primary key references app.accounts(id) on delete cascade,
 owner_id uuid not null,
 contact_id uuid not null,
 locale text not null check(locale in ('en','ru','es')),
 notice_version text not null check(notice_version='reiki-crm-registration-v1'),
 registered_at timestamptz not null default now(),
 foreign key(contact_id,owner_id) references app.crm_contacts(id,owner_id) on delete cascade
);
create index crm_reiki_registrations_owner_contact_idx
 on app_private.crm_reiki_registrations(owner_id,contact_id);
alter table app_private.crm_reiki_registrations enable row level security;
alter table app_private.crm_reiki_registrations force row level security;
revoke all on app_private.crm_reiki_registrations from public,anon,authenticated,hh_app_inbox;
grant select(account_id,owner_id,contact_id,locale,notice_version,registered_at),
 insert(account_id,owner_id,contact_id,locale,notice_version)
 on app_private.crm_reiki_registrations to hh_app_backend;
grant select on app_private.crm_reiki_registrations to hh_crm_backend;
create policy crm_reiki_registration_self_read
 on app_private.crm_reiki_registrations for select to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_reiki_registration_owner_read
 on app_private.crm_reiki_registrations for select to hh_crm_backend
 using(owner_id=(select auth.uid()) and (select app_private.account_active()));

-- Repeat the exact already deployed column-level grants (public enquiry and
-- Telegram Business migrations) to keep isolated schema replay deterministic.
grant select(id,owner_id,email_hash,suppressed) on app.crm_contacts to hh_app_backend;
grant insert(id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,lifecycle,source)
 on app.crm_contacts to hh_app_backend;
-- Reuse the existing column grants; no contact ciphertext SELECT or CRM
-- consent/activity/send permissions are granted to the app backend.
create policy crm_contact_reiki_registration_lookup on app.crm_contacts
 for select to hh_app_backend using(
 (select app_private.account_active()) and
 email_hash=current_setting('hh.reiki_registration_hash',true) and
 exists(select 1 from app.practitioners p
  where p.id='246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid
  and p.trusted_auth_user_id=crm_contacts.owner_id and p.active
  and p.public_profile<>'{}'::jsonb and p.status in ('approved','submitted','changes_requested'))
 );
create policy crm_contact_reiki_registration_insert on app.crm_contacts
 for insert to hh_app_backend with check(
 (select app_private.account_active()) and
 email_hash ~ '^[a-f0-9]{64}$' and email_hash=current_setting('hh.reiki_registration_hash',true)
 and lifecycle='lead' and source='academy' and phone_hash is null
 and email_verified=false and suppressed=false and revision=0
 and exists(select 1 from app.practitioners p
  where p.id='246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid
  and p.trusted_auth_user_id=crm_contacts.owner_id and p.active
  and p.public_profile<>'{}'::jsonb and p.status in ('approved','submitted','changes_requested'))
 );
create policy crm_reiki_registration_self_insert
 on app_private.crm_reiki_registrations for insert to hh_app_backend
 with check(account_id=(select auth.uid()) and (select app_private.account_active())
 and exists(select 1 from app.crm_contacts c join app.practitioners p on p.trusted_auth_user_id=c.owner_id
  where c.id=crm_reiki_registrations.contact_id and c.owner_id=crm_reiki_registrations.owner_id
  and c.email_hash=current_setting('hh.reiki_registration_hash',true)
  and p.id='246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid and p.active
  and p.public_profile<>'{}'::jsonb and p.status in ('approved','submitted','changes_requested')));
commit;
