-- The account's selected categorical assessment priorities are confidential.
-- Keep them encrypted using the existing account/record authenticated context.
-- Public guest plans remain unmodified; migration is additive and reversible.
begin;

alter table app_private.assessment_plans
  add column if not exists preferences_ciphertext text;

alter table app_private.assessment_plans
  add constraint assessment_plans_preferences_owner_only
  check (guest_session_id is null or preferences_ciphertext is null);

commit;
