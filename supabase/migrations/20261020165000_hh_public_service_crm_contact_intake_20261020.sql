-- Atomic first-party registration -> owner CRM contact.
-- Application may INSERT one unverified lead only after saving its encrypted
-- public_service_enquiries row within the same guest transaction.
-- No public/anon/authenticated table access, marketing consent or send privileges.
begin;

grant insert (id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,lifecycle,source)
  on app.crm_contacts to hh_app_backend;

create policy crm_contact_public_enquiry_insert on app.crm_contacts
for insert to hh_app_backend
with check (
  lifecycle = 'lead' and source in ('website','academy')
  and email_verified = false and suppressed = false and revision = 0
  and exists (
    select 1
    from app.public_service_enquiries e
    join app.practitioners p on p.id=e.recipient_practitioner_id
    where e.operation_id::text = current_setting('hh.public_enquiry_operation',true)
      and e.contact_ciphertext is not null
      and p.id='246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid
      and p.trusted_auth_user_id=crm_contacts.owner_id
      and p.active and p.public_profile<>'{}'::jsonb
      and p.status in ('approved','submitted','changes_requested')
  )
);
commit;
