-- Every OIDC-trusted CI event gets a durable classification disposition,
-- even if the serialized source-writer dispatcher run was cancelled or never started.
-- This is an advisory audit, NEVER a signed execution/dispatch/commit receipt.
ALTER TABLE business_brain.commander_ci_event_inbox
  ADD COLUMN IF NOT EXISTS triage_receipt jsonb,
  ADD COLUMN IF NOT EXISTS triage_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS historical_pr_readback jsonb;
DO $body$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint
   WHERE conrelid='business_brain.commander_ci_event_inbox'::regclass
     AND conname='commander_ci_triage_receipt_object_v1') THEN
  ALTER TABLE business_brain.commander_ci_event_inbox
    ADD CONSTRAINT commander_ci_triage_receipt_object_v1
      CHECK(triage_receipt IS NULL OR
        (jsonb_typeof(triage_receipt)='object' AND pg_column_size(triage_receipt)<=6000));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint
   WHERE conrelid='business_brain.commander_ci_event_inbox'::regclass
     AND conname='commander_ci_historical_pr_readback_object_v1') THEN
  ALTER TABLE business_brain.commander_ci_event_inbox
    ADD CONSTRAINT commander_ci_historical_pr_readback_object_v1
      CHECK(historical_pr_readback IS NULL OR
        (jsonb_typeof(historical_pr_readback)='object' AND pg_column_size(historical_pr_readback)<=2500));
 END IF;
END
$body$;

CREATE OR REPLACE FUNCTION business_brain.commander_ci_build_triage_receipt_v1(
  p_category text,p_classification jsonb,p_pr_number integer,p_head_sha text,
  p_workflow_run_id bigint,p_run_attempt integer,p_run_url text,p_origin text
) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $func$
DECLARE
  v_category text := coalesce(nullif(p_category,''),'UNKNOWN');
  v_state text;
  v_strategy text;
  v_action text;
  v_role text;
  v_reason text;
BEGIN
  v_state:=CASE
    WHEN v_category IN ('SECURITY','ACCESS_CONFIG','MERGE_CONFLICT','UNKNOWN') OR
      p_classification->>'requires_human'='true'
      THEN 'OWNER_REVIEW_REQUIRED_NOT_DISPATCHED'
    WHEN v_category IN ('SOURCE_CODE','TYPESCRIPT')
      THEN 'GUARDED_SOURCE_DISPATCH_UNVERIFIED'
    WHEN v_category IN ('BASE_ADVANCED','INFRASTRUCTURE')
      THEN 'EXISTING_RECOVERY_RECHECK_REQUIRED'
    ELSE 'DIAGNOSTIC_REVIEW_REQUIRED_NOT_DISPATCHED'
  END;
  v_role:=coalesce(nullif(left(p_classification->>'responsible_role',80),''),
    'ci-diagnostic-triage');
  v_reason:=coalesce(nullif(left(p_classification->>'reason_code',120),''),
    'UNCLASSIFIED_FAILURE');
  v_strategy:=coalesce(nullif(left(p_classification->>'strategy_code',90),''),
    CASE v_category
      WHEN 'SECURITY' THEN 'SECURITY_OWNER_REVIEW'
      WHEN 'ACCESS_CONFIG' THEN 'OWNER_CONFIGURATION_CHANGE'
      WHEN 'MERGE_CONFLICT' THEN 'SEMANTIC_CONFLICT_TRIAGE'
      WHEN 'BASE_ADVANCED' THEN 'PROTECTED_BASE_RECONCILIATION'
      WHEN 'BASE_OR_CI_ROUTING' THEN 'CI_ROUTING_DIAGNOSIS'
      WHEN 'INFRASTRUCTURE' THEN 'BOUNDED_INFRA_DIAGNOSIS'
      WHEN 'AUTOMATION_PROCESS' THEN 'RECOVER_EXISTING_TASK'
      WHEN 'AI_EXECUTOR' THEN 'ZERO_COST_EXECUTOR_DIAGNOSIS'
      WHEN 'INTEGRATION' THEN 'INTEGRATION_OWNER_DIAGNOSIS'
      WHEN 'TYPESCRIPT' THEN 'GUARDED_SOURCE_REPAIR'
      WHEN 'TEST_FAILURE' THEN 'TEST_FAILURE_TRIAGE'
      WHEN 'SOURCE_CODE' THEN 'GUARDED_SOURCE_REPAIR'
      ELSE 'SECONDARY_DIAGNOSIS'
    END
  );
  v_action:=coalesce(nullif(left(p_classification->>'next_action',90),''),
    CASE v_category
      WHEN 'BASE_OR_CI_ROUTING' THEN 'INSPECT_REQUIRED_HEAD_CHECKS'
      WHEN 'BASE_ADVANCED' THEN 'VERIFY_BASE_AND_SINGLE_WRITER'
      WHEN 'INFRASTRUCTURE' THEN 'VERIFY_TRANSIENT_PROOF_BEFORE_RETRY'
      WHEN 'SOURCE_CODE' THEN 'VERIFY_SOURCE_SCOPE_AND_CI'
      WHEN 'TYPESCRIPT' THEN 'VERIFY_SOURCE_SCOPE_AND_CI'
      WHEN 'MERGE_CONFLICT' THEN 'ASSIGN_SEMANTIC_CONFLICT_OWNER'
      WHEN 'SECURITY' THEN 'REVIEW_FAILED_SECURITY_GATE'
      WHEN 'ACCESS_CONFIG' THEN 'VERIFY_PERMISSION_OR_CONFIGURATION'
      WHEN 'AUTOMATION_PROCESS' THEN 'CHECK_LEASE_PROMPT_AND_WORKER_RECEIPTS'
      WHEN 'AI_EXECUTOR' THEN 'VALIDATE_FREE_MODEL_RESPONSE'
      WHEN 'TEST_FAILURE' THEN 'DIAGNOSE_PRODUCT_FIXTURE_OR_ORACLE'
      WHEN 'INTEGRATION' THEN 'VERIFY_IDEMPOTENT_INTEGRATION'
      ELSE 'INSPECT_CAUSAL_JOB_AND_CLASSIFY_AGAIN'
    END
  );
  RETURN jsonb_build_object(
    'schema','HH_CI_TRIAGE_DISPOSITION_V1',
    'provenance',p_origin,
    'proofLevel','RECORDED_CI_CLASSIFICATION_ONLY_NOT_DISPATCH',
    'state',v_state,'strategyCode',v_strategy,'responsibleRole',v_role,
    'nextAction',v_action,'reasonCode',v_reason,'category',v_category,
    'rulesetVersion',coalesce(p_classification->>'ruleset_version','UNKNOWN'),
    'prNumber',p_pr_number,'headSha',p_head_sha,
    'workflowRunId',p_workflow_run_id,'runAttempt',p_run_attempt,
    'evidenceUrl',p_run_url,
    'dispatchVerified',false,'workerStartVerified',false,
    'sourceCommitVerified',false,'liveVerified',false,
    'recordedAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
END $func$;

CREATE OR REPLACE FUNCTION business_brain.commander_ci_triage_on_insert_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $func$
BEGIN
 IF NEW.repository='andylitvinov-design/books' AND
    NEW.workflow_path='.github/workflows/hh-pr-core-release.yml' AND
    NEW.inbox_owner_id IS NOT NULL THEN
   NEW.triage_receipt:=business_brain.commander_ci_build_triage_receipt_v1(
     NEW.category,NEW.classification,NEW.pr_number,NEW.head_sha,
     NEW.workflow_run_id,NEW.run_attempt,NEW.run_url,
     'OIDC_TRUSTED_CI_INBOX_INSERT');
   NEW.triage_recorded_at:=now();
 END IF;
 RETURN NEW;
END $func$;

DROP TRIGGER IF EXISTS commander_ci_triage_on_insert_v1
  ON business_brain.commander_ci_event_inbox;
CREATE TRIGGER commander_ci_triage_on_insert_v1
BEFORE INSERT ON business_brain.commander_ci_event_inbox
FOR EACH ROW EXECUTE FUNCTION business_brain.commander_ci_triage_on_insert_v1();

-- Backfill only already OIDC-ingested events, not synthetic new failures.
-- A historical disposition is NOT a fabricated dispatcher acceptance.
UPDATE business_brain.commander_ci_event_inbox
SET triage_receipt=business_brain.commander_ci_build_triage_receipt_v1(
      category,classification,pr_number,head_sha,workflow_run_id,run_attempt,
      run_url,'EXISTING_AUTHENTICATED_INBOX_BACKFILL'),
    triage_recorded_at=now()
WHERE triage_receipt IS NULL AND
  repository='andylitvinov-design/books' AND
  workflow_path='.github/workflows/hh-pr-core-release.yml' AND
  associated_task_id IS NOT NULL;

COMMENT ON COLUMN business_brain.commander_ci_event_inbox.triage_receipt
IS 'Versioned, owner-private classification decision; not proof of task dispatch, worker claim, source commit or LIVE.';
COMMENT ON COLUMN business_brain.commander_ci_event_inbox.historical_pr_readback
IS 'Independently checked GitHub PR lifecycle snapshot, not an OIDC dispatcher receipt.';
