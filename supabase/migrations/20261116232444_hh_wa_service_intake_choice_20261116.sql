-- Extend only the existing consented WhatsApp CRM session; retain FORCE RLS.
-- No new provider, paid channel, owner role or scheduled resource.
alter table app_private.crm_wa_diagnostic_sessions
 add column if not exists service_key text,
 add column if not exists delivery_format text;
do $$
begin
 if not exists (
  select 1 from pg_constraint where
  conname='crm_wa_diagnostic_sessions_service_key_check'
  and conrelid='app_private.crm_wa_diagnostic_sessions'::regclass
 ) then
  alter table app_private.crm_wa_diagnostic_sessions
   add constraint crm_wa_diagnostic_sessions_service_key_check
   check (service_key is null or service_key in
    ('homeopathy','coaching','reiki','constellations','business'));
 end if;
 if not exists (
  select 1 from pg_constraint where
  conname='crm_wa_diagnostic_sessions_delivery_format_check'
  and conrelid='app_private.crm_wa_diagnostic_sessions'::regclass
 ) then
  alter table app_private.crm_wa_diagnostic_sessions
   add constraint crm_wa_diagnostic_sessions_delivery_format_check
   check (delivery_format is null or delivery_format in
    ('online','inperson','async'));
 end if;
end $$;
