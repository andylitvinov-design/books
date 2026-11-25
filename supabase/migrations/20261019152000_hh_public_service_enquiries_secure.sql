-- A visitor can leave an enquiry without creating a clinical client account.
-- Messages and manually entered messenger contacts are encrypted by the application.
-- Public roles have zero direct table privileges and every row belongs to one practitioner.
create table app.public_service_enquiries (
  id uuid primary key,
  recipient_practitioner_id uuid not null references app.practitioners(id) on delete cascade,
  service_title text not null check(char_length(service_title) between 1 and 160),
  source_path text not null check(char_length(source_path) between 1 and 600),
  locale text not null check(locale in ('en','ru','es')),
  reference_code text not null unique check(reference_code ~ '^HH-[A-F0-9]{12}$'),
  description_ciphertext text not null check(char_length(description_ciphertext) between 40 and 14000),
  contact_ciphertext text,
  contact_channel text check(contact_channel in ('whatsapp','telegram')),
  status text not null default 'requested' check(status in ('requested','contacted','closed')),
  revision integer not null default 0 check(revision >= 0),
  operation_id uuid not null unique,
  operation_hash text not null check(operation_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index public_service_enquiries_inbox_idx
  on app.public_service_enquiries(recipient_practitioner_id,created_at desc,id desc);
alter table app.public_service_enquiries enable row level security;
alter table app.public_service_enquiries force row level security;
revoke all on app.public_service_enquiries from public,anon,authenticated,hh_app_inbox;
grant select,insert,update on app.public_service_enquiries to hh_app_backend;

-- Guest idempotency is strictly one UUID per request transaction; it does not permit listing.
create policy public_service_enquiry_read on app.public_service_enquiries
  for select to hh_app_backend using (
    operation_id::text = current_setting('hh.public_enquiry_operation',true)
    or exists (
      select 1 from app.practitioners p
      where p.id=public_service_enquiries.recipient_practitioner_id
        and p.trusted_auth_user_id=(select auth.uid())
        and p.active and p.status in ('approved','submitted','changes_requested')
        and (select app_private.account_active())
    )
  );
create policy public_service_enquiry_insert on app.public_service_enquiries
  for insert to hh_app_backend with check (
    operation_id::text = current_setting('hh.public_enquiry_operation',true)
    and exists (
      select 1 from app.practitioners p
      where p.id=public_service_enquiries.recipient_practitioner_id
        and p.active and p.public_profile<>'{}'::jsonb
        and p.status in ('approved','submitted','changes_requested')
    )
  );
create policy public_service_enquiry_update on app.public_service_enquiries
  for update to hh_app_backend using (
    exists (
      select 1 from app.practitioners p
      where p.id=public_service_enquiries.recipient_practitioner_id
        and p.trusted_auth_user_id=(select auth.uid())
        and p.active and p.status in ('approved','submitted','changes_requested')
        and (select app_private.account_active())
    )
  ) with check (
    exists (
      select 1 from app.practitioners p
      where p.id=public_service_enquiries.recipient_practitioner_id
        and p.trusted_auth_user_id=(select auth.uid())
        and p.active and p.status in ('approved','submitted','changes_requested')
        and (select app_private.account_active())
    )
  );
