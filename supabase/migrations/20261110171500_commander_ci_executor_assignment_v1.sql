-- Holistic House / Agents Director: authenticated CI incident -> concrete read-only executor.
-- Reuses commander_ci_event_inbox, commander_tasks, commander_chats and
-- commander_execution_runs. NO second queue, cron, paid provider or GitHub writes.
ALTER TABLE business_brain.commander_ci_event_inbox
  ADD COLUMN IF NOT EXISTS assignment_receipt jsonb;
ALTER TABLE business_brain.commander_ci_event_inbox
  DROP CONSTRAINT IF EXISTS commander_ci_assignment_receipt_is_object;
ALTER TABLE business_brain.commander_ci_event_inbox
  ADD CONSTRAINT commander_ci_assignment_receipt_is_object
  CHECK (assignment_receipt IS NULL OR
    (jsonb_typeof(assignment_receipt)='object' AND pg_column_size(assignment_receipt)<=6000));

CREATE OR REPLACE FUNCTION business_brain.commander_assign_ci_executor_v1(p_event uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  e business_brain.commander_ci_event_inbox%ROWTYPE;
  t business_brain.commander_tasks%ROWTYPE;
  v_chats uuid[];
  v_chat uuid;
  v_key text;
  v_role text;
  v_strategy text;
  v_action text;
  v_executor text := 'manual';
  v_state text := 'MANUAL_REQUIRED';
  v_reason text := 'OWNER_REVIEW_REQUIRED';
  v_next timestamptz := now()+interval '1 hour';
  v_run uuid;
  v_existing business_brain.commander_execution_runs%ROWTYPE;
  v_active uuid;
  v_message text;
  v_payload jsonb;
  v_receipt jsonb;
  v_count integer;
  v_latest boolean;
  v_started boolean := false;
  v_verified boolean := false;
  v_cost numeric := null;
  v_status text;
  v_event_id uuid;
BEGIN
  SELECT * INTO e FROM business_brain.commander_ci_event_inbox
    WHERE ci_event_id=p_event FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('state','EVENT_NOT_FOUND'); END IF;
  -- Signed OIDC attestation is stored by the existing authenticated Edge receiver.
  IF e.repository<>'andylitvinov-design/books'
    OR e.workflow_path<>'.github/workflows/hh-pr-core-release.yml'
    OR e.oidc_workflow_ref<>
      'andylitvinov-design/books/.github/workflows/hh-pr-direct-core-failure.yml@refs/heads/codex/bootstrap-books'
    OR e.base_ref<>'codex/public-book-library'
    OR e.inbox_owner_id IS NULL OR e.associated_task_id IS NULL
    OR e.associated_owner_id IS DISTINCT FROM e.inbox_owner_id
    OR e.classification IS NULL OR e.classification->>'category' IS DISTINCT FROM e.category
    OR e.classification->>'status'<>'DIAGNOSTIC_ONLY'
    OR e.classification->>'execution_authorized'<>'false'
    OR e.classification->>'source_write_authorized'<>'false'
    OR e.head_sha !~ '^[a-f0-9]{40}$'
    OR e.association_status NOT IN (
      'MATCHED_CHAT_EVENT_RECORDED','TASK_ASSIGNED_CHAT_RECORDED_NOT_DISPATCHED',
      'AUTO_TASK_CREATED_NOT_DISPATCHED')
    OR NOT EXISTS (
      SELECT 1 FROM business_brain.owner_access
      WHERE user_id=e.inbox_owner_id AND can_read=true AND can_write=true
    ) THEN
    RETURN jsonb_build_object('state','BLOCKED_UNVERIFIED_IDENTITY_OR_POLICY');
  END IF;
  SELECT * INTO t FROM business_brain.commander_tasks
    WHERE task_id=e.associated_task_id AND owner_id=e.inbox_owner_id
      AND project_key='agent-commander' FOR UPDATE;
  IF NOT FOUND OR coalesce(t.payload->>'ciSource','')<>'github_core_failure'
    OR NOT coalesce(t.payload->'relatedPr','[]'::jsonb) @> to_jsonb(e.pr_number) THEN
    RETURN jsonb_build_object('state','BLOCKED_EXISTING_OWNER_TASK_REVIEW');
  END IF;
  SELECT array_agg(chat_id) INTO v_chats FROM (
    SELECT chat_id FROM business_brain.commander_chats
      WHERE owner_id=e.inbox_owner_id AND task_id=t.task_id LIMIT 2
  ) c;
  IF coalesce(array_length(v_chats,1),0)<>1 THEN
    RETURN jsonb_build_object('state','BLOCKED_AMBIGUOUS_OR_MISSING_CHAT');
  END IF;
  v_chat := v_chats[1];
  v_role := left(coalesce(nullif(e.classification->>'responsible_role',''),
    'ci-diagnostic-triage'),80);
  v_action := left(coalesce(nullif(e.classification->>'recommended_action',''),
    'Investigate the exact-HEAD failed CI evidence without source writes.'),500);
  v_strategy := CASE e.category
    WHEN 'SECURITY' THEN 'SECURITY_OWNER_REVIEW'
    WHEN 'ACCESS_CONFIG' THEN 'OWNER_CONFIGURATION_CHANGE'
    WHEN 'MERGE_CONFLICT' THEN 'SEMANTIC_CONFLICT_TRIAGE'
    WHEN 'BASE_ADVANCED' THEN 'PROTECTED_BASE_RECONCILIATION'
    WHEN 'BASE_OR_CI_ROUTING' THEN 'CI_ROUTING_DIAGNOSIS'
    WHEN 'INFRASTRUCTURE' THEN 'BOUNDED_INFRA_DIAGNOSIS'
    WHEN 'AUTOMATION_PROCESS' THEN 'RECOVER_EXISTING_TASK'
    WHEN 'AI_EXECUTOR' THEN 'ZERO_COST_PROVIDER_HOLD'
    WHEN 'INTEGRATION' THEN 'INTEGRATION_DIAGNOSIS'
    WHEN 'TYPESCRIPT' THEN 'GUARDED_SOURCE_REPAIR_DIAGNOSIS'
    WHEN 'TEST_FAILURE' THEN 'TEST_FAILURE_TRIAGE'
    WHEN 'SOURCE_CODE' THEN 'GUARDED_SOURCE_REPAIR_DIAGNOSIS'
    ELSE 'SECONDARY_DIAGNOSIS' END;
  -- Security, credentials and the free provider itself never self-invoke AI.
  IF e.category IN ('SECURITY','ACCESS_CONFIG','AI_EXECUTOR') THEN
    v_reason := 'SENSITIVE_OR_PROVIDER_OWNER_ACTION_REQUIRED';
  ELSE
    v_executor := 'openrouter';
    v_key := 'ci-readonly:'||e.pr_number::text||':'||e.head_sha;
    SELECT * INTO v_existing FROM business_brain.commander_execution_runs
      WHERE owner_id=e.inbox_owner_id AND chat_id=v_chat
        AND idempotency_key=v_key LIMIT 1;
    IF NOT FOUND THEN
      SELECT run_id INTO v_active FROM business_brain.commander_execution_runs
        WHERE task_id=t.task_id AND owner_id=e.inbox_owner_id
          AND status IN ('QUEUED','STARTING','RUNNING')
          AND request_payload->>'ciReadonlyDiagnosis'='true'
        ORDER BY created_at ASC LIMIT 1;
      IF v_active IS NOT NULL THEN
        v_state := 'WAITING_PRIOR_EXECUTOR';
        v_reason := 'ONE_ACTIVE_EXECUTOR_PER_PR';
        v_next := now()+interval '10 minutes';
      ELSE
        SELECT count(*) INTO v_count
          FROM business_brain.commander_execution_runs
          WHERE task_id=t.task_id AND owner_id=e.inbox_owner_id
            AND request_payload->>'ciReadonlyDiagnosis'='true'
            AND created_at>now()-interval '24 hours';
        IF v_count>=3 THEN
          v_state := 'BLOCKED_DAILY_FREE_DIAGNOSTIC_LIMIT';
          v_reason := 'MAX_THREE_FREE_DIAGNOSES_PER_PR_PER_24H';
          v_next := now()+interval '24 hours';
        ELSE
          v_message := left(
            'Read-only CI incident diagnosis. PR #'||e.pr_number||
            ', exact HEAD '||e.head_sha||', Core run '||e.workflow_run_id||
            ', attempt '||e.run_attempt||'. Classifier: '||e.category||
            ', reason '||coalesce(e.classification->>'reason_code','UNKNOWN')||
            ', recommended strategy '||v_strategy||'. Evidence: '||e.run_url||
            '. Failed jobs: '||left(e.failed_jobs::text,750)||
            '. Failed steps: '||left(e.failed_steps::text,1200)||
            '. Next action: '||v_action||
            '. Explain probable root and concrete next safe diagnostic step in Russian.'||
            ' If evidence is insufficient, state UNKNOWN and the required evidence.'||
            ' NEVER claim to run GitHub, change files, commit, merge, restart CI or deploy.'||
            ' Source correction requires a separate protected exact-HEAD Repair Worker.',
            4500);
          v_payload := jsonb_build_object(
            'ciReadonlyDiagnosis',true,'ciEventId',e.ci_event_id,'ciHeadSha',e.head_sha,
            'ciPrNumber',e.pr_number,'confirmGitHubWrite',false,
            'message',v_message,'goal','Classify and advise on verified CI failure only',
            'acceptanceCriteria',jsonb_build_array('Evidence-grounded diagnosis',
              'Specific next safe action','Never claim source changes or VERIFIED CI'),
            'modelId','openrouter/free',
            'contextCapsule',jsonb_build_object('schema','HH_COMMANDER_TASK_CONTEXT_V1',
              'taskId',t.task_id,'chatId',v_chat,'linkedPrHints',
              jsonb_build_array(e.pr_number),'linkedPrHintsVerified',false,
              'verifiedCiHeadSha',e.head_sha,'requiredBeforeSourceChange',
              'Separate owner-authorized exact-HEAD GitHub Repair Worker only'));
          v_run := pg_catalog.md5('HH_CI_READONLY_V1:'||v_key)::uuid;
          INSERT INTO business_brain.commander_execution_runs
            (run_id,owner_id,chat_id,task_id,idempotency_key,request_sha256,
             executor,status,reason_code,request_payload,receipt)
          VALUES (v_run,e.inbox_owner_id,v_chat,t.task_id,v_key,
            pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_message,'UTF8')),'hex'),
            'openrouter','QUEUED','OPENROUTER_WORKER_QUEUED',v_payload,
            jsonb_build_object('status','QUEUED','dispatchAttempted',false,
              'agentStarted',false,'executionVerified',false,'sourceWrite',null,
              'proofLevel','NOT_STARTED_NO_EXECUTION_RECEIPT'))
          ON CONFLICT (owner_id,chat_id,idempotency_key) DO NOTHING;
          SELECT * INTO v_existing FROM business_brain.commander_execution_runs
            WHERE owner_id=e.inbox_owner_id AND chat_id=v_chat
              AND idempotency_key=v_key LIMIT 1;
          IF NOT FOUND THEN RAISE EXCEPTION 'CI_EXECUTOR_RESERVATION_NOT_PERSISTED'; END IF;
        END IF;
      END IF;
    END IF;
    IF v_existing.run_id IS NOT NULL THEN
      v_run := v_existing.run_id;
      v_status := v_existing.status;
      v_started := v_existing.started_at IS NOT NULL;
      v_verified := v_status='COMPLETED'
        AND v_existing.receipt->>'executionVerified'='true'
        AND v_existing.receipt->>'zeroCostVerified'='true'
        AND v_existing.cost_usd=0;
      v_cost := v_existing.cost_usd;
      v_state := CASE v_status
        WHEN 'COMPLETED' THEN 'DIAGNOSIS_COMPLETED_NOT_SOURCE_REPAIR'
        WHEN 'RUNNING' THEN 'WORKER_STARTED'
        WHEN 'STARTING' THEN 'WORKER_STARTING'
        WHEN 'FAILED' THEN 'BLOCKED_EXECUTOR_FAILED'
        WHEN 'BLOCKED' THEN 'BLOCKED_EXECUTOR'
        ELSE 'QUEUED_NOT_STARTED' END;
      v_reason := coalesce(v_existing.reason_code,
        CASE WHEN v_status='COMPLETED' THEN 'OPENROUTER_RESPONSE_VERIFIED'
          ELSE 'WAITING_OPENROUTER_WORKER' END);
      v_next := now()+CASE WHEN v_status='COMPLETED' THEN interval '1 hour'
        ELSE interval '10 minutes' END;
    END IF;
  END IF;
  v_receipt := jsonb_build_object(
    'schema','HH_CI_EXECUTOR_ASSIGNMENT_V1','ciEventId',e.ci_event_id,
    'taskId',t.task_id,'prNumber',e.pr_number,'headSha',e.head_sha,
    'category',e.category,'strategy',v_strategy,'responsibleRole',v_role,
    'executor',v_executor,'executorId',CASE WHEN v_executor='openrouter'
      THEN 'agent-commander-openrouter-worker' ELSE 'repository-owner-manual' END,
    'runId',v_run,'state',v_state,'reasonCode',v_reason,
    'nextAction',v_action,'nextCheckAt',v_next,
    'agentStarted',v_started,'executionVerified',v_verified,
    'sourceWriteAuthorized',false,'sourceFixVerified',false,'liveVerified',false,
    'costUsd',v_cost,'createdAt',now());
  UPDATE business_brain.commander_ci_event_inbox
    SET assignment_receipt=v_receipt WHERE ci_event_id=e.ci_event_id;
  SELECT NOT EXISTS(
    SELECT 1 FROM business_brain.commander_ci_event_inbox newer
     WHERE newer.associated_task_id=t.task_id
       AND (newer.created_at>e.created_at OR
         (newer.created_at=e.created_at AND newer.ci_event_id>e.ci_event_id))
  ) INTO v_latest;
  IF v_latest THEN
    UPDATE business_brain.commander_tasks
      SET payload=payload||jsonb_build_object('ciAssignment',v_receipt,
        'assignedRole',v_role,'executor',v_executor,'agentStarted',v_started),
        revision=revision+1,updated_at=now()
      WHERE task_id=t.task_id AND owner_id=e.inbox_owner_id;
  END IF;
  v_event_id := pg_catalog.md5('HH_CI_ASSIGNMENT_V1:'||e.ci_event_id::text)::uuid;
  INSERT INTO business_brain.commander_chat_events
    (event_id,chat_id,owner_id,kind,payload,source_verified)
  VALUES (v_event_id,v_chat,e.inbox_owner_id,'github_report',
    jsonb_build_object('schema','HH_COMMANDER_EVENT_V1','id',v_event_id,
      'kind','github_report','author','Agents Director · CI task assignment',
      'text',left('PR #'||e.pr_number||': '||v_strategy||
       '; executor '||v_executor||'; status '||v_state||
       '. No source patch, successful CI or LIVE has been verified.',900),
      'assignment',v_receipt,'sourceVerified',true,
      'proofLevel','OWNER_SCOPED_OIDC_TASK_ASSIGNMENT_NOT_REPAIR',
      'createdAt',now()),true)
  ON CONFLICT (event_id) DO NOTHING;
  RETURN v_receipt;
END;
$function$;

REVOKE ALL ON FUNCTION business_brain.commander_assign_ci_executor_v1(uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION business_brain.commander_ci_assignment_trigger_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  -- AFTER the existing commander_ci_event_autotask_v2 trigger creates its
  -- durable task/chat. Read live row, not the pre-trigger NEW snapshot.
  PERFORM business_brain.commander_assign_ci_executor_v1(NEW.ci_event_id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zz_commander_ci_assign_executor_v1
  ON business_brain.commander_ci_event_inbox;
CREATE TRIGGER zz_commander_ci_assign_executor_v1
  AFTER INSERT OR UPDATE OF classification,category,pr_number,head_sha
  ON business_brain.commander_ci_event_inbox
  FOR EACH ROW EXECUTE FUNCTION business_brain.commander_ci_assignment_trigger_v1();
REVOKE ALL ON FUNCTION business_brain.commander_ci_assignment_trigger_v1()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION business_brain.commander_ci_worker_assignment_sync_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_state text;
  v_verified boolean;
  v_next timestamptz := now()+interval '10 minutes';
BEGIN
  IF NEW.request_payload->>'ciReadonlyDiagnosis' IS DISTINCT FROM 'true' THEN
    RETURN NEW;
  END IF;
  v_verified := NEW.status='COMPLETED'
    AND NEW.receipt->>'executionVerified'='true'
    AND NEW.receipt->>'zeroCostVerified'='true'
    AND NEW.cost_usd=0;
  v_state := CASE NEW.status
    WHEN 'COMPLETED' THEN 'DIAGNOSIS_COMPLETED_NOT_SOURCE_REPAIR'
    WHEN 'RUNNING' THEN 'WORKER_STARTED'
    WHEN 'STARTING' THEN 'WORKER_STARTING'
    WHEN 'FAILED' THEN 'BLOCKED_EXECUTOR_FAILED'
    WHEN 'BLOCKED' THEN 'BLOCKED_EXECUTOR'
    ELSE 'QUEUED_NOT_STARTED' END;
  IF NEW.status IN ('COMPLETED','FAILED','BLOCKED') THEN
    v_next := now()+interval '1 hour';
  END IF;
  UPDATE business_brain.commander_ci_event_inbox
    SET assignment_receipt=assignment_receipt||
      jsonb_build_object('state',v_state,'reasonCode',NEW.reason_code,
        'agentStarted',NEW.started_at IS NOT NULL,'executionVerified',v_verified,
        'sourceFixVerified',false,'liveVerified',false,'costUsd',NEW.cost_usd,
        'nextCheckAt',v_next,'observedAt',now())
    WHERE (assignment_receipt->>'runId')=NEW.run_id::text
      AND assignment_receipt->>'schema'='HH_CI_EXECUTOR_ASSIGNMENT_V1';
  UPDATE business_brain.commander_tasks
    SET payload=payload||jsonb_build_object(
      'ciAssignment',(payload->'ciAssignment')||
        jsonb_build_object('state',v_state,'reasonCode',NEW.reason_code,
          'agentStarted',NEW.started_at IS NOT NULL,
          'executionVerified',v_verified,'sourceFixVerified',false,
          'liveVerified',false,'costUsd',NEW.cost_usd,
          'nextCheckAt',v_next,'observedAt',now()),
      'agentStarted',NEW.started_at IS NOT NULL),
      revision=revision+1,updated_at=now()
    WHERE task_id=NEW.task_id AND owner_id=NEW.owner_id
      AND payload->'ciAssignment'->>'runId'=NEW.run_id::text;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zz_commander_ci_worker_assignment_sync_v1
  ON business_brain.commander_execution_runs;
CREATE TRIGGER zz_commander_ci_worker_assignment_sync_v1
  AFTER UPDATE OF status,reason_code ON business_brain.commander_execution_runs
  FOR EACH ROW WHEN (old.status IS DISTINCT FROM new.status OR
    old.reason_code IS DISTINCT FROM new.reason_code)
  EXECUTE FUNCTION business_brain.commander_ci_worker_assignment_sync_v1();
REVOKE ALL ON FUNCTION business_brain.commander_ci_worker_assignment_sync_v1()
  FROM PUBLIC, anon, authenticated;