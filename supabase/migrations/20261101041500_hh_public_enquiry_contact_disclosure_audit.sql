-- Record access only: no contact data or clinical text belongs in this table.
begin;
create table app.public_enquiry_contact_disclosures (
 id uuid primary key,
 enquiry_id uuid not null references app.public_service_enquiries(id) on delete cascade,
 operator_id uuid not null references app.accounts(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index public_enquiry_contact_disclosures_recent_idx
 on app.public_enquiry_contact_disclosures(enquiry_id,created_at desc);
alter table app.public_enquiry_contact_disclosures enable row level security;
alter table app.public_enquiry_contact_disclosures force row level security;
revoke all on app.public_enquiry_contact_disclosures from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant insert on app.public_enquiry_contact_disclosures to hh_app_backend;
create policy public_enquiry_contact_disclosures_insert on app.public_enquiry_contact_disclosures
 for insert to hh_app_backend with check (
  operator_id=(select auth.uid()) and (select app_private.account_active())
  and exists (select 1 from app.public_service_enquiries e
   join app.practitioners p on p.id=e.recipient_practitioner_id
   where e.id=enquiry_id and p.trusted_auth_user_id=(select auth.uid())
    and p.active and p.status in ('approved','submitted','changes_requested'))
 );
commit;
