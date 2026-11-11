-- Preserve the validated shared classifier decision alongside each trusted CI event.
alter table business_brain.commander_ci_event_inbox
  add column if not exists classification jsonb;

alter table business_brain.commander_ci_event_inbox
  drop constraint if exists commander_ci_event_inbox_classification_check;

alter table business_brain.commander_ci_event_inbox
  add constraint commander_ci_event_inbox_classification_check
  check (classification is null or jsonb_typeof(classification) = 'object');

comment on column business_brain.commander_ci_event_inbox.classification is
  'Validated HH_CI_ERROR_CLASSIFICATION_V1 decision metadata; diagnostic-only, never execution authority.';
