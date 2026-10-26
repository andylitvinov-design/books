-- Holistic House: precise, consented Telegram Mini App -> published service -> its master.
-- Additive only: existing Andrey CRM insert policy and all legacy request records stay unchanged.
begin;

alter table app.public_service_enquiries
  add column if not exists service_offering_id uuid
    references app.service_offerings(id) on delete set null;

create index if not exists public_service_enquiries_offering_created_idx
  on app.public_service_enquiries(service_offering_id,created_at desc)
  where service_offering_id is not null;

-- The existing policy restricts CRM contact inserts to Andrey. Add a *separate*
-- tightly scoped policy for a committed request addressed to a different owner.
-- Unlike checking an arbitrary service title, the FK ties the saved application
-- to exactly one published offering and its approved, active practitioner.
create policy crm_contact_telegram_master_enquiry_insert
  on app.crm_contacts for insert to hh_app_backend
  with check (
    lifecycle='lead' and source='website'
    and email_verified=false and suppressed=false and revision=0
    and exists (
      select 1
      from app.public_service_enquiries e
      join app.service_offerings s on s.id=e.service_offering_id
      join app.practitioners p on p.id=e.recipient_practitioner_id
      where e.operation_id::text=current_setting('hh.public_enquiry_operation',true)
        and e.source_path='/' || e.locale || '/services/telegram-request'
        and e.locale in ('en','ru','es')
        and e.contact_ciphertext is not null
        and e.service_offering_id is not null
        and s.practitioner_id=p.id
        and s.active and s.status='published'
        and s.localized_copy<>'{}'::jsonb
        and p.trusted_auth_user_id=crm_contacts.owner_id
        and p.trusted_auth_user_id is not null
        and p.active and p.status='approved'
        and p.public_profile<>'{}'::jsonb
    )
  );

-- Both tables already use FORCE RLS; assert rather than silently change rights.
do $$ begin
  if not (select relrowsecurity and relforcerowsecurity
          from pg_class where oid='app.crm_contacts'::regclass)
     or not (select relrowsecurity and relforcerowsecurity
          from pg_class where oid='app.public_service_enquiries'::regclass)
  then raise exception 'Existing FORCE RLS required'; end if;
end $$;
commit;
