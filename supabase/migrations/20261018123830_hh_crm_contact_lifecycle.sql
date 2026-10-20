-- Owner-scoped contact stages. Permanent suppression cannot be lifted.
create or replace function app_private.crm_contact_update_guard()
returns trigger language plpgsql security invoker set search_path=pg_catalog as $$
begin
 if OLD.suppressed AND NOT NEW.suppressed then
  raise exception 'CRM_SUPPRESSION_IMMUTABLE';
 end if;
 return NEW;
end $$;
revoke all on function app_private.crm_contact_update_guard() from public,anon,authenticated;
grant execute on function app_private.crm_contact_update_guard() to hh_crm_backend;
create trigger crm_contact_update_guard before update on app.crm_contacts
for each row execute function app_private.crm_contact_update_guard();
grant update(lifecycle) on app.crm_contacts to hh_crm_backend;
drop policy crm_contact_suppress on app.crm_contacts;
create policy crm_contact_owner_update on app.crm_contacts for update to hh_crm_backend
 using(owner_id=(select auth.uid()) and (select app_private.account_active()))
 with check(owner_id=(select auth.uid()) and (select app_private.account_active()));
alter table app.crm_contacts force row level security;
