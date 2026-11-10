-- Keep the private Commander CI inbox aligned with HH_CI_ERROR_RULESET_V1.
-- Classification remains diagnostic-only; this constraint does not grant execution authority.
alter table business_brain.commander_ci_event_inbox
  drop constraint if exists commander_ci_event_inbox_category_check;

alter table business_brain.commander_ci_event_inbox
  add constraint commander_ci_event_inbox_category_check
  check (category = any (array[
    'SECURITY',
    'ACCESS_CONFIG',
    'MERGE_CONFLICT',
    'BASE_ADVANCED',
    'BASE_OR_CI_ROUTING',
    'INFRASTRUCTURE',
    'AUTOMATION_PROCESS',
    'AI_EXECUTOR',
    'INTEGRATION',
    'TYPESCRIPT',
    'TEST_FAILURE',
    'SOURCE_CODE',
    'UNKNOWN'
  ]::text[]));

comment on constraint commander_ci_event_inbox_category_check
  on business_brain.commander_ci_event_inbox is
  'Accepts the complete HH_CI_ERROR_RULESET_V1 category taxonomy.';
