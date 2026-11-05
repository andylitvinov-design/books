-- Guest replies belong to an EXISTING encrypted website enquiry, not a
-- second CRM or standalone contact directory. Feature gated until E2E.
-- This migration must be applied only at the guarded release stage.
create table app_private.public_enquiry_chat_messages (
  id uuid primary key,
  enquiry_id uuid not null references app.public_service_enquiries(id) on delete cascade,
  owner_id uuid not null references app.accounts(id) on delete cascade,
  author_role text not null check(author_role in ('guest','operator')),
  operation_id uuid not null,
  body_ciphertext text not null check(char_length(body_ciphertext) between 40 and 16000),
  created_at timestamptz not null default now(),
  unique(enquiry_id,operation_id)
);
create index public_enquiry_chat_owner_idx
 on app_private.public_enquiry_chat_messages(owner_id,enquiry_id,created_at desc,id desc);
alter table app_private.public_enquiry_chat_messages enable row level security;
alter table app_private.public_enquiry_chat_messages force row level security;
revoke all on app_private.public_enquiry_chat_messages from public,anon,authenticated;
grant select (id,enquiry_id,owner_id,author_role,operation_id,body_ciphertext,created_at)
 on app_private.public_enquiry_chat_messages to hh_app_backend;
grant insert (id,enquiry_id,owner_id,author_role,operation_id,body_ciphertext)
 on app_private.public_enquiry_chat_messages to hh_app_backend;

-- Only the request named by a server-verified HttpOnly signed capability may
-- be read. JWT-less guests do not receive generic SELECT on other enquiries.
create policy public_enquiry_chat_guest_read on app_private.public_enquiry_chat_messages
 for select to hh_app_backend using(
   enquiry_id::text=current_setting('hh.guest_chat_enquiry',true)
   and exists (
     select 1 from app.public_service_enquiries e
      where e.id=enquiry_id
        and e.operation_id::text=current_setting('hh.public_enquiry_operation',true)
        and e.contact_ciphertext is not null
   )
 );
create policy public_enquiry_chat_guest_write on app_private.public_enquiry_chat_messages
 for insert to hh_app_backend with check(
   author_role='guest'
   and enquiry_id::text=current_setting('hh.guest_chat_enquiry',true)
   and operation_id::text=current_setting('hh.guest_chat_message',true)
   and exists (
     select 1 from app.public_service_enquiries e
       join app.practitioners p on p.id=e.recipient_practitioner_id
      where e.id=enquiry_id
        and e.operation_id::text=current_setting('hh.public_enquiry_operation',true)
        and e.status in ('requested','contacted')
        and e.contact_ciphertext is not null
        and p.active
        and p.trusted_auth_user_id=owner_id
   )
 );

-- Authenticated operators must also be the REAL assigned practitioner,
-- not merely know a UUID or a visitor-supplied name/phone.
create policy public_enquiry_chat_owner_read on app_private.public_enquiry_chat_messages
 for select to hh_app_backend using(
   owner_id=(select auth.uid())
   and (select app_private.session_active())
   and exists (
     select 1 from app.public_service_enquiries e
       join app.practitioners p on p.id=e.recipient_practitioner_id
      where e.id=enquiry_id and p.trusted_auth_user_id=owner_id and p.active
   )
 );
create policy public_enquiry_chat_owner_write on app_private.public_enquiry_chat_messages
 for insert to hh_app_backend with check(
   author_role='operator'
   and owner_id=(select auth.uid())
   and (select app_private.session_active())
   and exists (
     select 1 from app.public_service_enquiries e
       join app.practitioners p on p.id=e.recipient_practitioner_id
      where e.id=enquiry_id and e.status in ('requested','contacted')
        and p.trusted_auth_user_id=owner_id and p.active
   )
 );
