-- Public marketplace enquiry -> consented unverified lead for the actual owner.
-- Existing direct Andrey/course policy is unchanged. The new policy is scoped
-- to a verified public service URL, a stored encrypted enquiry and its owner.
-- Neither anonymous/authenticated users nor other backend roles gain table
-- privileges or the ability to read another practitioner's private records.
begin;

create policy crm_contact_marketplace_service_enquiry_insert
  on app.crm_contacts for insert to hh_app_backend
  with check (
    lifecycle = 'lead' and source = 'website'
    and email_verified = false and suppressed = false and revision = 0
    and exists (
      select 1 from app.public_service_enquiries e
      join app.practitioners p on p.id = e.recipient_practitioner_id
      join app.service_offerings s on s.practitioner_id = p.id
      where e.operation_id::text = current_setting('hh.public_enquiry_operation', true)
        and e.contact_ciphertext is not null
        and p.id <> '246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid
        and p.trusted_auth_user_id = crm_contacts.owner_id
        and p.active and p.public_profile <> '{}'::jsonb
        and p.status in ('approved', 'submitted', 'changes_requested')
        and s.active and s.localized_copy <> '{}'::jsonb
        and s.status in ('published', 'submitted', 'changes_requested')
        and e.source_path = '/' || e.locale || '/services/' || p.slug || '/' || s.slug
    )
  );

commit;
