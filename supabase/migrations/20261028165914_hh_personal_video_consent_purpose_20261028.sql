-- Extend EXISTING owner-consent registry with an independent, versioned
-- private personal-video save purpose. Keep all existing four purposes unchanged.
-- The old CHECK otherwise rejects every new My Videos upload intent.
begin;
alter table app.consent_events drop constraint if exists consent_events_purpose_check;
alter table app.consent_events add constraint consent_events_purpose_check
  check (purpose in (
    'necessary_app_processing',
    'adult_attestation',
    'marketing',
    'practitioner_sharing',
    'personal_video_cloud_save_v1'
  ));
commit;
