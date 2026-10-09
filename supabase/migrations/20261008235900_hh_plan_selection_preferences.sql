-- Private and encrypted categorical priorities for user-chosen assessment sets.
-- Idempotent when applied through Supabase MCP ahead of repository migration replay.
begin;

alter table app_private.assessment_plans
  add column if not exists preferences_ciphertext text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'app_private.assessment_plans'::regclass
      and conname = 'assessment_plans_preferences_owner_only'
  ) then
    alter table app_private.assessment_plans
      add constraint assessment_plans_preferences_owner_only
      check (guest_session_id is null or preferences_ciphertext is null);
  end if;
end;
$$;

commit;
