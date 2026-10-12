-- Account holders may add small selections repeatedly without erasing earlier tests.
-- Guest testing remains capped at 12. Existing rows all satisfy this relaxed check.
begin;

alter table app_private.assessment_plans
  drop constraint if exists assessment_plans_definition_ids_check;

alter table app_private.assessment_plans
  add constraint assessment_plans_definition_ids_check
  check (
    (account_id is not null and guest_session_id is null
      and cardinality(definition_ids) between 1 and 100)
    or
    (guest_session_id is not null and account_id is null
      and cardinality(definition_ids) between 1 and 12)
  );

commit;
