-- LIVE parity: signed reusable hh-native-auto-merge invokes the trusted
-- hh-pr-direct-core-failure workflow. GitHub OIDC verifier (private-store Edge)
-- checks the signed job_workflow_ref before accepting either workflow_ref.
-- This migration creates NO source-write, retry, merge or model permission.
-- Idempotent for production already corrected out-of-band; on a fresh
-- database it upgrades exactly one legacy OIDC clause, or fails closed.
DO $migration$
DECLARE
  current_def text;
  old_identity constant text := $old$
    OR e.oidc_workflow_ref <>
       'andylitvinov-design/books/.github/workflows/hh-pr-direct-core-failure.yml@refs/heads/codex/bootstrap-books'$old$;
  new_identity constant text := $new$
    OR coalesce(e.oidc_workflow_ref,'') NOT IN (
       'andylitvinov-design/books/.github/workflows/hh-pr-direct-core-failure.yml@refs/heads/codex/bootstrap-books',
       'andylitvinov-design/books/.github/workflows/hh-native-auto-merge.yml@refs/heads/codex/bootstrap-books')$new$;
BEGIN
  current_def := pg_get_functiondef(
    'business_brain.commander_ci_route_followup_record_v1(uuid)'::regprocedure);
  IF current_def IS NULL THEN
    RAISE EXCEPTION 'COMMANDER_CI_FOLLOWUP_FUNCTION_MISSING';
  ELSIF position(new_identity IN current_def) > 0 THEN
    -- Safe no-op: existing production function already has both verified refs.
    RETURN;
  ELSIF position(old_identity IN current_def) > 0 THEN
    -- Restrict the change to a known historical function body, preserving every
    -- owner, task/HEAD, read-only classification and source-provenance check.
    EXECUTE replace(current_def, old_identity, new_identity);
  ELSE
    RAISE EXCEPTION 'COMMANDER_CI_FOLLOWUP_UNRECOGNIZED_IDENTITY_RULE';
  END IF;
END
$migration$;
