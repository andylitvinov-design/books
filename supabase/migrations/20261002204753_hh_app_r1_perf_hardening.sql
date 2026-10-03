-- Holistic House R1 hosted hardening after first isolated Supabase deployment.
-- Add only indexes and equivalent policy rewrites; no user data changes.
create index if not exists assessment_runs_version_idx on app.assessment_runs(assessment_version_id);
create index if not exists assessment_results_source_version_idx on app.assessment_results(source_version_id);
create index if not exists assessment_results_source_fk_idx on app.assessment_results(run_id,source_version_id,account_id);
create index if not exists consent_events_account_idx on app.consent_events(account_id);
create index if not exists consultation_requests_service_practitioner_idx on app.consultation_requests(service_offering_id,recipient_practitioner_id);
create index if not exists context_events_account_idx on app.context_events(account_id);
create index if not exists profile_snapshots_account_idx on app.profile_snapshots(account_id);
create index if not exists profile_snapshots_result_account_idx on app.profile_snapshots(generating_result_id,account_id);
create index if not exists service_offerings_practitioner_idx on app.service_offerings(practitioner_id);

drop policy if exists inbox_requests_read on app.consultation_requests;
create policy inbox_requests_read on app.consultation_requests for select to hh_app_inbox
using(recipient_practitioner_id::text=(select current_setting('hh.practitioner_id',true)));

drop policy if exists inbox_requests_update on app.consultation_requests;
create policy inbox_requests_update on app.consultation_requests for update to hh_app_inbox
using(recipient_practitioner_id::text=(select current_setting('hh.practitioner_id',true)) and status in('requested','contacted'))
with check(recipient_practitioner_id::text=(select current_setting('hh.practitioner_id',true)) and status in('contacted','closed'));

drop policy if exists inbox_practitioner_read on app.practitioners;
create policy inbox_practitioner_read on app.practitioners for select to hh_app_inbox
using(id::text=(select current_setting('hh.practitioner_id',true)) and active);

drop policy if exists inbox_services_read on app.service_offerings;
create policy inbox_services_read on app.service_offerings for select to hh_app_inbox
using(practitioner_id::text=(select current_setting('hh.practitioner_id',true)));