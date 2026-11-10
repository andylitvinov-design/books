
alter table app_private.coaching_session_records
 add constraint coaching_session_records_voice_profile_key_fkey
 foreign key (voice_profile_key) references app_private.coaching_voice_profiles(voice_profile_key) on delete set null;
create index if not exists coaching_session_records_voice_profile_fk_idx on app_private.coaching_session_records(voice_profile_key);
create trigger coaching_voice_profiles_updated_at before update on app_private.coaching_voice_profiles for each row execute function app_private.coaching_set_updated_at();

drop policy if exists coaching_session_state_versions_owner_update on app_private.coaching_session_state_versions;
drop policy if exists coaching_session_state_versions_owner_delete on app_private.coaching_session_state_versions;
revoke update, delete on app_private.coaching_session_state_versions from hh_app_backend;
grant select, insert on app_private.coaching_session_state_versions to hh_app_backend;

drop policy if exists coaching_report_versions_owner_update on app_private.coaching_report_versions;
drop policy if exists coaching_report_versions_owner_delete on app_private.coaching_report_versions;
revoke update, delete on app_private.coaching_report_versions from hh_app_backend;
grant select, insert on app_private.coaching_report_versions to hh_app_backend;

drop policy if exists coaching_session_consents_owner_delete on app_private.coaching_session_consents;
drop policy if exists coaching_session_consents_owner_update on app_private.coaching_session_consents;
revoke delete, update on app_private.coaching_session_consents from hh_app_backend;
grant select, insert on app_private.coaching_session_consents to hh_app_backend;
