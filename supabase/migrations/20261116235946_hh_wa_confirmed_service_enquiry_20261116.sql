-- Applied in existing Supabase production under version 20261116235946.
-- Keep the table's existing FORCE ROW LEVEL SECURITY; grant only exact backend
-- columns with operation-scoped RLS for the verified, consented finalizer.
alter table app_private.crm_wa_diagnostic_sessions
 add column if not exists service_operation_id uuid;
grant select (business_hash,user_hash,stage,locale,consent_at,service_key,delivery_format,service_operation_id)
 on app_private.crm_wa_diagnostic_sessions to hh_app_backend;
drop policy if exists crm_wa_confirmed_service_finalize_read on app_private.crm_wa_diagnostic_sessions;
create policy crm_wa_confirmed_service_finalize_read
 on app_private.crm_wa_diagnostic_sessions for select to hh_app_backend
 using (service_operation_id is not null
  and service_operation_id::text=current_setting('hh.wa_service_operation',true)
  and stage='done' and consent_at is not null);
