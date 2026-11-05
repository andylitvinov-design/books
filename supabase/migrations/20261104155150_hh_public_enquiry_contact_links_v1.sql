-- Applied/verified on Holistic House production with version 20261104155150.
-- Additive owner-scoped link. Neither a name nor an unverified email/phone
-- is proof that a new request belongs to an older CRM contact.
create table app_private.public_enquiry_contact_links (
  enquiry_id uuid primary key references app.public_service_enquiries(id) on delete cascade,
  owner_id uuid not null,
  contact_id uuid not null,
  evidence text not null default 'created_from_this_enquiry'
    check (evidence = 'created_from_this_enquiry'),
  created_at timestamptz not null default now(),
  constraint public_enquiry_contact_links_contact_owner_fk
    foreign key (contact_id,owner_id) references app.crm_contacts(id,owner_id) on delete cascade
);
create index public_enquiry_contact_links_owner_contact_idx
  on app_private.public_enquiry_contact_links(owner_id,contact_id);
alter table app_private.public_enquiry_contact_links enable row level security;
alter table app_private.public_enquiry_contact_links force row level security;
revoke all on app_private.public_enquiry_contact_links from public, anon, authenticated;
grant insert (enquiry_id,owner_id,contact_id,evidence)
  on app_private.public_enquiry_contact_links to hh_app_backend;
grant select (enquiry_id,owner_id,contact_id,evidence,created_at)
  on app_private.public_enquiry_contact_links to hh_crm_backend;
create policy public_enquiry_contact_links_guest_ingest on app_private.public_enquiry_contact_links
  for insert to hh_app_backend
  with check (
    evidence='created_from_this_enquiry'
    and exists (
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
create policy public_enquiry_contact_links_owner_read on app_private.public_enquiry_contact_links
  for select to hh_crm_backend
  using (
    owner_id=(select auth.uid())
    and (select app_private.account_active())
  );
