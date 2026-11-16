-- Agent Director error -> policy -> one durable owner task in existing Commander store.
-- No new queue, retry worker, dispatch, provider, bypass or source write.
-- Existing OIDC CI failure trigger remains the only trusted CI ingestion route.
CREATE OR REPLACE FUNCTION business_brain.commander_error_strategy_v1(p_reason text)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $policy$
DECLARE
  c text := left(coalesce(nullif(regexp_replace(upper(coalesce(p_reason,'')),'[^A-Z0-9_]','','g'),''),'UNSPECIFIED_EXECUTOR_FAILURE'),110);
  category text := 'UNKNOWN';
  strategy text := 'INVESTIGATE';
  action text := 'Inspect the verified run and its current evidence, choose one safe next action; do not automatically retry or write source.';
  owner_role text := 'agent-director-diagnostic';
BEGIN
  IF c IN ('OWNED_MODEL_RUNTIME_NOT_CONFIGURED','OWNED_MODEL_OPENROUTER_KEY_REJECTED',
    'AGENT_DIRECTOR_GITHUB_APP_NOT_CONFIGURED','OWNED_GITHUB_APP_NOT_CONFIGURED',
    'OWNER_SESSION_REQUIRED','OWNER_PRIVATE_STORE_WRITE_DENIED','OWNER_ACCESS_DENIED') THEN
    category := 'AUTH_OR_PERMISSION'; strategy := 'OWNER_ACTION_REQUIRED';
    action := 'Verify owner authorization and protected provider/App configuration; no automatic retry or secret exposure.';
    owner_role := 'owner-configuration';
  ELSIF c IN ('OWNED_MODEL_FREE_RATE_LIMIT','OPENROUTER_FREE_RATE_LIMIT','TIMEOUT_OR_RATE_LIMIT') THEN
    category := 'TIMEOUT_OR_RATE_LIMIT'; strategy := 'WAIT_QUOTA_NO_AUTO_RETRY';
    action := 'Respect the provider quota and wait for a separate approved retry; do not repeat a billable request.';
  ELSIF c IN ('OWNED_MODEL_COST_UNVERIFIED','OWNED_MODEL_BILLABLE_RESPONSE_HOLD',
    'OWNED_MODEL_NOT_FREE_IN_CATALOG','OWNED_MODEL_NO_VERIFIED_FREE_MODELS',
    'OWNED_GITHUB_CI_COST_UNVERIFIED') THEN
    category := 'COST_POLICY_HOLD'; strategy := 'NO_SAFE_AUTO_ACTION';
    action := 'Stop model/CI execution until current zero-cost proof is independently verified.';
    owner_role := 'cost-and-policy-review';
  ELSIF c IN ('OWNED_MODEL_PROVIDER_UNAVAILABLE','OWNED_MODEL_FREE_CATALOG_UNAVAILABLE',
    'AGENT_DIRECTOR_DISPATCH_UNCONFIRMED','OWNED_MODEL_REQUEST_FAILED',
    'OWNED_MODEL_RESPONSE_NOT_ACCEPTED') THEN
    category := 'MODEL_OR_TRANSPORT'; strategy := 'INVESTIGATE';
    action := 'Inspect provider/network receipts and idempotency before considering any single approved retry.';
  ELSIF c IN ('FREE_AI_OPENROUTER_PATCH_RESPONSE_INVALID','PATCH_RESPONSE_INVALID') THEN
    category := 'PATCH_RESPONSE_INVALID'; strategy := 'REPAIR_SOURCE_AFTER_REVIEW';
    action := 'Inspect rejected patch evidence and task context, repair once under exact-HEAD and lease gates.';
    owner_role := 'verified-source-repair';
  ELSIF c IN ('OWNED_GITHUB_BASE_HEAD_STALE','STALE_SHA','GITHUB_HEAD_STALE') THEN
    category := 'STALE_SHA'; strategy := 'REBASE_RECHECK';
    action := 'Read the live GitHub branch and blob SHA again before preparing a fresh approved patch.';
    owner_role := 'github-source-review';
  ELSIF c IN ('MERGE_CONFLICT','GITHUB_MERGE_CONFLICT') THEN
    category := 'MERGE_CONFLICT'; strategy := 'REBASE_RECHECK';
    action := 'Inspect conflict on current PR HEAD; reconcile source safely and revalidate protected checks.';
  ELSIF c IN ('CI_ROUTING_FAILURE','BASE_OR_CI_ROUTING','CI_WORKFLOW_BUDGET_GUARD') THEN
    category := 'CI_ROUTING_FAILURE'; strategy := 'FIX_ROUTING';
    action := 'Inspect workflow ownership, trusted Core check and exact-head routing, not source changes.';
    owner_role := 'ci-infrastructure';
  ELSIF c IN ('DEPLOY_FAILURE','VERCEL_DEPLOY_FAILURE') THEN
    category := 'DEPLOY_FAILURE'; strategy := 'INVESTIGATE_DEPLOY';
    action := 'Inspect exact deployed commit, build logs and production alias; preserve last READY rollback.';
    owner_role := 'release-diagnostics';
  ELSIF c IN ('OWNED_MODEL_SENSITIVE_CONTENT_REJECTED','OWNED_GITHUB_PATH_NOT_APPROVED',
    'OWNED_GITHUB_OWNER_APPROVAL_REQUIRED','SOURCE_WRITE_POLICY_DENIED') THEN
    category := 'SECURITY_OR_CONSENT'; strategy := 'NO_SAFE_AUTO_ACTION';
    action := 'Stop the operation; inspect owner consent and allowlist without exposing sensitive source.';
    owner_role := 'security-policy-review';
  END IF;
  RETURN jsonb_build_object('schema','HH_AGENT_DIRECTOR_ERROR_TRIAGE_V1',
    'ruleset_version','1.0.0','reason_code',c,'category',category,'strategy',strategy,
    'recommended_action',action,'responsible_role',owner_role,
    'max_auto_retries',0,'source_write_authorized',false,
    'agent_started_by_triage',false,'independent_review_required',true);
END
$policy$;

CREATE UNIQUE INDEX IF NOT EXISTS commander_one_run_incident_task_v1
ON business_brain.commander_tasks(owner_id, (payload->>'runIncidentKey'))
WHERE state NOT IN ('completed','superseded') AND payload ? 'runIncidentKey';

CREATE OR REPLACE FUNCTION business_brain.commander_run_error_autotask_v1()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $trigger$
DECLARE
  decision jsonb;
  code text;
  incident_key text;
  task_title text;
  task_state text;
  task_payload jsonb;
  saved_task uuid;
  event_id uuid;
  now_text text;
  event_payload jsonb;
BEGIN
  IF NEW.status NOT IN ('BLOCKED','FAILED') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status
    AND OLD.reason_code IS NOT DISTINCT FROM NEW.reason_code THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM business_brain.owner_access o
    JOIN business_brain.commander_chats c ON c.owner_id=o.user_id
    WHERE o.user_id=NEW.owner_id AND c.chat_id=NEW.chat_id
      AND o.can_read=true AND o.can_write=true
  ) THEN RETURN NEW; END IF;

  decision := business_brain.commander_error_strategy_v1(NEW.reason_code);
  code := decision->>'reason_code';
  incident_key := 'agent-director:run:' || NEW.run_id::text;
  task_title := left('[Executor] ' || (decision->>'category') || ' · ' || code,180);
  task_state := CASE WHEN decision->>'strategy' IN ('OWNER_ACTION_REQUIRED','NO_SAFE_AUTO_ACTION')
    THEN 'blocked' ELSE 'queued_review' END;
  now_text := to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"');
  task_payload := jsonb_build_object(
    'schema','HH_COMMANDER_TASK_V1','taskId',NEW.run_id,'title',task_title,
    'project','commander','priority','P1','area','Agent Director / execution error',
    'source','agent-director-run:' || NEW.run_id::text,
    'summary',left('Verified persisted Commander run '||NEW.run_id::text||
      ' returned '||NEW.status||'; reason='||code||
      '. Classification does not mean repair or execution.',2400),
    'plan',left(decision->>'recommended_action',1200),
    'prompt','Investigate this exact authenticated run; keep consent, cost, lease and GitHub protection intact.',
    'executor','manual','mode','analysis','relatedPr',jsonb_build_array(),
    'runIncidentKey',incident_key,'runId',NEW.run_id,'chatId',NEW.chat_id,
    'requestSha256',NEW.request_sha256,'reasonCode',code,'errorCategory',decision->>'category',
    'strategy',decision->>'strategy','responsibleRole',decision->>'responsible_role',
    'classification',decision,'restrictions',jsonb_build_object(
      'noCost',true,'noDuplicate',true,'noAutoRetry',true,'verifyLive',true),
    'executionAuthorized',false,'sourceWriteAuthorized',false,'agentStarted',false,
    'createdAt',now_text,'updatedAt',now_text
  );
  INSERT INTO business_brain.commander_tasks
    (task_id,owner_id,project_key,title,payload,state,revision)
  VALUES (NEW.run_id,NEW.owner_id,'agent-commander',task_title,task_payload,task_state,1)
  ON CONFLICT (task_id) DO UPDATE
  SET payload=business_brain.commander_tasks.payload ||
        jsonb_build_object('reasonCode',code,'classification',decision,
          'errorCategory',decision->>'category','strategy',decision->>'strategy',
          'updatedAt',now_text),
      revision=business_brain.commander_tasks.revision+1,updated_at=now()
  WHERE business_brain.commander_tasks.owner_id=NEW.owner_id
    AND business_brain.commander_tasks.state NOT IN ('completed','superseded')
    AND business_brain.commander_tasks.payload->>'runIncidentKey'=incident_key
    AND business_brain.commander_tasks.payload->>'reasonCode' IS DISTINCT FROM code
  RETURNING task_id INTO saved_task;

  IF saved_task IS NULL THEN RETURN NEW; END IF;
  event_id := gen_random_uuid();
  event_payload := jsonb_build_object('schema','HH_COMMANDER_EVENT_V1',
    'id',event_id,'kind','error_triage','author','Agent Director / ruleset v1',
    'text',left('Run '||NEW.run_id::text||' blocked/failed ('||code||'). Strategy: '||
      (decision->>'strategy')||'. Task recorded, executor NOT started.',1600),
    'runId',NEW.run_id,'taskId',saved_task,'reasonCode',code,
    'classification',decision,'sourceVerified',false,
    'proofLevel','ERROR_OBSERVED_NOT_REPAIRED','createdAt',now_text);
  INSERT INTO business_brain.commander_chat_events
    (event_id,chat_id,owner_id,kind,payload,source_verified)
  VALUES(event_id,NEW.chat_id,NEW.owner_id,'note',event_payload,false);
  RETURN NEW;
END
$trigger$;

DROP TRIGGER IF EXISTS commander_run_error_autotask_v1 ON business_brain.commander_execution_runs;
CREATE TRIGGER commander_run_error_autotask_v1
AFTER INSERT OR UPDATE OF status,reason_code ON business_brain.commander_execution_runs
FOR EACH ROW WHEN (NEW.status IN ('BLOCKED','FAILED'))
EXECUTE FUNCTION business_brain.commander_run_error_autotask_v1();

REVOKE ALL ON FUNCTION business_brain.commander_error_strategy_v1(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION business_brain.commander_run_error_autotask_v1() FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION business_brain.commander_run_error_autotask_v1()
IS 'Persist exactly one owner-scoped triage task/event per failed Commander run and policy revision; no dispatch or source write.';
