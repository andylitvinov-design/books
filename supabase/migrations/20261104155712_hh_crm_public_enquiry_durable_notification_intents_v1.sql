-- Applied on Holistic House production as version 20261104155712.
-- Intent is written inside the original guest transaction; it is NOT a send.
-- Recover only notifications with no provider claim; no background cron.
create table app_private.notification_public_enquiry_intents (
  enquiry_id uuid primary key references app.public_service_enquiries(id) on delete cascade,
  owner_id uuid not null references app.accounts(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index notification_public_enquiry_intents_owner_idx
  on app_private.notification_public_enquiry_intents(owner_id,created_at desc,enquiry_id);
alter table app_private.notification_public_enquiry_intents enable row level security;
alter table app_private.notification_public_enquiry_intents force row level security;
revoke all on app_private.notification_public_enquiry_intents from public,anon,authenticated;
grant insert (enquiry_id,owner_id)
  on app_private.notification_public_enquiry_intents to hh_app_backend;
grant select (enquiry_id,owner_id,created_at)
  on app_private.notification_public_enquiry_intents to hh_app_backend;
create policy notification_public_intent_guest_insert on app_private.notification_public_enquiry_intents
  for insert to hh_app_backend with check (
    exists (
      select 1 from app.public_service_enquiries e
      join app.practitioners p on p.id=e.recipient_practitioner_id
      where e.id=enquiry_id
        and e.operation_id::text=current_setting('hh.public_enquiry_operation',true)
        and e.contact_ciphertext is not null
        and p.trusted_auth_user_id=owner_id
        and p.active
        and p.status in ('approved','submitted','changes_requested')
    )
  );
create policy notification_public_intent_owner_read on app_private.notification_public_enquiry_intents
  for select to hh_app_backend using (
    owner_id=(select auth.uid()) and (select app_private.session_active())
  );
-- Allow only owner-visible existence check, not provider delivery details.
grant select (enquiry_id,account_id)
  on app_private.notification_telegram_public_dispatch to hh_app_backend;
create policy notification_public_dispatch_owner_lookup on app_private.notification_telegram_public_dispatch
  for select to hh_app_backend using (
    account_id=(select auth.uid()) and (select app_private.session_active())
  );
