-- P0: native auto-merge invokes the canonical direct-core failure reusable
-- workflow. Private-store GitHub OIDC ingress independently verified BOTH
-- workflow_ref and job_workflow_ref before persisting these server-owned rows.
-- Mirror that exact two-element allowlist in existing SQL functions only;
-- preserve owner, repository, CI, HEAD and separate source-publisher guards.
-- Also accept the newer SAME-EVENT ciIncident provenance for read-only executor
-- association. Never convert classification or diagnostic claims into code writes.

-- commander_ci_event_autotask_v1
CREATE OR REPLACE FUNCTION business_brain.commander_ci_event_autotask_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_ids uuid[];
  v_task uuid;
  v_number bigint;
  v_key text;
  v_title text;
  v_summary text;
  v_action text;
  v_role text;
  v_now text;
  v_payload jsonb;
  v_chat jsonb;
  v_chat_count integer;
  v_created boolean := false;
  v_event_id uuid;
  v_event jsonb;
BEGIN
  -- Second gate: only the trusted OIDC Core-failure receiver may produce tasks.
  IF NEW.repository <> 'andylitvinov-design/books'
     OR NEW.workflow_path <> '.github/workflows/hh-pr-core-release.yml'
     OR coalesce(NEW.oidc_workflow_ref,'') NOT IN (
      'andylitvinov-design/books/.github/workflows/hh-pr-direct-core-failure.yml@refs/heads/codex/bootstrap-books',
      'andylitvinov-design/books/.github/workflows/hh-native-auto-merge.yml@refs/heads/codex/bootstrap-books')
     OR NEW.base_ref <> 'codex/public-book-library'
     OR NEW.inbox_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM business_brain.owner_access
    WHERE user_id = NEW.inbox_owner_id AND can_read = true AND can_write = true
  ) THEN
    UPDATE business_brain.commander_ci_event_inbox
       SET association_status = 'OWNER_WRITE_NOT_APPROVED'
     WHERE ci_event_id = NEW.ci_event_id;
    RETURN NEW;
  END IF;

  -- Find a single current Commander task for this PR. Never guess if ambiguous.
  SELECT array_agg(task_id) INTO v_ids FROM (
    SELECT task_id
      FROM business_brain.commander_tasks
     WHERE owner_id = NEW.inbox_owner_id
       AND project_key = 'agent-commander'
       AND state NOT IN ('completed','superseded')
       AND coalesce(payload->'relatedPr','[]'::jsonb) @> to_jsonb(NEW.pr_number)
     ORDER BY updated_at DESC
     LIMIT 2
  ) matched;

  IF coalesce(array_length(v_ids,1),0) > 1 THEN
    UPDATE business_brain.commander_ci_event_inbox
       SET association_status = 'AMBIGUOUS_TASKS'
     WHERE ci_event_id = NEW.ci_event_id;
    RETURN NEW;
  END IF;

  IF coalesce(array_length(v_ids,1),0) = 1 THEN
    v_task := v_ids[1];
  ELSE
    v_key := 'github-ci:pr:' || NEW.pr_number::text;
    v_action := coalesce(nullif(left(NEW.classification->>'recommended_action',500), ''),
      'Collect the failed Core job evidence, classify its root cause, and select a safe next step.');
    v_role := coalesce(nullif(left(NEW.classification->>'responsible_role',80), ''),
      'ci-diagnostic-triage');
    v_title := left('[CI] PR #' || NEW.pr_number || ' · ' || coalesce(NEW.category,'UNKNOWN'),180);
    v_summary := left('Verified GitHub Core failure at exact HEAD ' || NEW.head_sha ||
      '; category ' || coalesce(NEW.category,'UNKNOWN') ||
      '; responsible role ' || v_role ||
      '; reason ' || coalesce(NEW.classification->>'reason_code','UNCLASSIFIED') ||
      '. This task is queued for review; no executor has started.',3000);
    v_now := to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"');
    v_task := gen_random_uuid();

    v_payload := jsonb_build_object(
      'schema','HH_COMMANDER_TASK_V1',
      'taskId',v_task,
      'title',v_title,
      'project','commander',
      'priority',CASE WHEN coalesce(NEW.category,'UNKNOWN') IN ('SECURITY','ACCESS_CONFIG') THEN 'P1' ELSE 'P2' END,
      'area','Agent Commander / CI',
      'source',NEW.run_url,
      'summary',v_summary,
      'plan',left(v_action || ' Confirm the current PR HEAD, owner restrictions, security policy and existing worker lease before any remediation.',5000),
      'prompt','Diagnose this verified CI failure and propose the next safe action. Do not launch an executor, change source, retry CI or merge without a separate exact-HEAD authorization.',
      'executor','manual',
      'mode','analysis',
      'relatedPr',jsonb_build_array(NEW.pr_number),
      'restrictions',jsonb_build_object('noCost',true,'noDuplicate',true,'verifyLive',true),
      'ciIncidentKey',v_key,
      'ciSource','github_core_failure',
      'ciCategory',coalesce(NEW.category,'UNKNOWN'),
      'ciReasonCode',coalesce(NEW.classification->>'reason_code','UNCLASSIFIED'),
      'ciResponsibleRole',v_role,
      'assignedRole',v_role,
      'ciRecommendedAction',v_action,
      'ciRecommendedStatus',coalesce(NEW.classification->>'recommended_status','UNCLASSIFIED'),
      'ciClassification',coalesce(NEW.classification,'{}'::jsonb),
      'ciEvidence',jsonb_build_object(
        'repository',NEW.repository,'prNumber',NEW.pr_number,'headSha',NEW.head_sha,
        'workflowRunId',NEW.workflow_run_id,'runAttempt',NEW.run_attempt,
        'runUrl',NEW.run_url,'failedJobs',NEW.failed_jobs,'failedSteps',NEW.failed_steps,
        'verification','GITHUB_OIDC_AND_EXACT_PR_HEAD'),
      'executionAuthorized',false,
      'sourceWriteAuthorized',false,
      'agentStarted',false
    );

    INSERT INTO business_brain.commander_tasks
      (task_id,owner_id,project_key,title,payload,state,revision)
    VALUES (v_task,NEW.inbox_owner_id,'agent-commander',v_title,v_payload,'queued_review',1)
    ON CONFLICT DO NOTHING
    RETURNING task_number INTO v_number;

    IF v_number IS NULL THEN
      -- A concurrent delivery may have won the per-PR incident key.
      SELECT task_id,task_number
        INTO v_task,v_number
        FROM business_brain.commander_tasks
       WHERE owner_id=NEW.inbox_owner_id
         AND project_key='agent-commander'
         AND state NOT IN ('completed','superseded')
         AND payload->>'ciIncidentKey'=v_key
       LIMIT 1;
      IF v_task IS NULL THEN
        RAISE EXCEPTION 'COMMANDER_CI_TASK_DEDUP_UNVERIFIED';
      END IF;
    ELSE
      v_created := true;
    END IF;
  END IF;

  -- A task must be visible as a chat. Restore a missing chat without duplicating one.
  SELECT count(*)::integer INTO v_chat_count
    FROM business_brain.commander_chats
   WHERE owner_id=NEW.inbox_owner_id AND task_id=v_task;

  IF v_chat_count = 0 THEN
    SELECT task_number,title,payload INTO v_number,v_title,v_payload
      FROM business_brain.commander_tasks
     WHERE owner_id=NEW.inbox_owner_id AND task_id=v_task
     LIMIT 1;
    v_role := coalesce(nullif(v_payload->>'assignedRole',''),
      nullif(v_payload->>'ciResponsibleRole',''),
      'ci-diagnostic-triage');
    v_summary := coalesce(v_payload->>'summary','CI task for PR #'||NEW.pr_number);
    v_title := left(coalesce(v_payload->>'title','[CI] PR #'||NEW.pr_number),110);
    v_now := to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"');
    v_chat := jsonb_build_object(
      'schema','HH_COMMANDER_THREAD_V1',
      'id',v_task,
      'title',v_title,
      'project','commander',
      'description',left(v_summary,1000),
      'goal','Diagnose the verified CI failure and prepare the approved next action.',
      'taskId',v_task,
      'taskIssueNumber',v_number,
      'assignedRole',v_role,
      'tasks','[]'::jsonb,
      'executors',jsonb_build_array('manual'),
      'prs',jsonb_build_array(NEW.pr_number),
      'status','assigned',
      'revision',1,
      'createdAt',v_now,
      'updatedAt',v_now,
      'executionState','AWAITING_EXECUTOR_NOT_DISPATCHED',
      'liveVerified',false
    );
    INSERT INTO business_brain.commander_chats
      (chat_id,owner_id,task_id,title,payload,status,execution_state,revision)
    VALUES (v_task,NEW.inbox_owner_id,v_task,v_title,v_chat,
      'assigned','AWAITING_EXECUTOR_NOT_DISPATCHED',1)
    ON CONFLICT (task_id) DO NOTHING;
  END IF;

  -- Every event is visible in the linked chat; deterministic id makes retries safe.
  v_event_id := md5('HH_COMMANDER_CI_EVENT_V1:' || NEW.ci_event_id::text)::uuid;
  v_event := jsonb_build_object(
    'schema','HH_COMMANDER_EVENT_V1',
    'id',v_event_id,
    'kind','github_report',
    'author','GitHub Actions · verified CI',
    'text',left('Core CI failed for PR #'||NEW.pr_number||' at '||left(NEW.head_sha,12)||
      '. Category: '||coalesce(NEW.category,'UNKNOWN')||
      '. Role: '||coalesce(NEW.classification->>'responsible_role','ci-diagnostic-triage')||
      '. Failed jobs: '||coalesce(NEW.failed_jobs::text,'[]')||
      '. Failed steps: '||coalesce(NEW.failed_steps::text,'[]')||
      '. Task created/linked; executor has NOT started.',1800),
    'source',jsonb_build_object('repository',NEW.repository,'workflow_run_id',NEW.workflow_run_id,
      'run_attempt',NEW.run_attempt,'head_sha',NEW.head_sha,'run_url',NEW.run_url),
    'sourceVerified',true,
    'proofLevel','GITHUB_OIDC_AND_EXACT_PR_HEAD',
    'createdAt',now()
  );
  INSERT INTO business_brain.commander_chat_events
    (event_id,chat_id,owner_id,kind,payload,source_verified)
  VALUES (v_event_id,v_task,NEW.inbox_owner_id,'github_report',v_event,true)
  ON CONFLICT (event_id) DO NOTHING;

  UPDATE business_brain.commander_chats
     SET updated_at=now()
   WHERE owner_id=NEW.inbox_owner_id AND chat_id=v_task;

  UPDATE business_brain.commander_ci_event_inbox
     SET associated_task_id=v_task,
         associated_owner_id=NEW.inbox_owner_id,
         association_status=CASE WHEN v_created
           THEN 'AUTO_TASK_CREATED_NOT_DISPATCHED'
           ELSE 'TASK_ASSIGNED_CHAT_RECORDED_NOT_DISPATCHED' END
   WHERE ci_event_id=NEW.ci_event_id AND inbox_owner_id=NEW.inbox_owner_id;

  RETURN NEW;
END;
$function$;

-- commander_assign_ci_executor_v1
CREATE OR REPLACE FUNCTION business_brain.commander_assign_ci_executor_v1(p_event uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
    OR coalesce(e.oidc_workflow_ref,'') NOT IN (
      'andylitvinov-design/books/.github/workflows/hh-pr-direct-core-failure.yml@refs/heads/codex/bootstrap-books',
      'andylitvinov-design/books/.github/workflows/hh-native-auto-merge.yml@refs/heads/codex/bootstrap-books')
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
  -- Existing owner tasks may be normalized to the newer signed CI-incident
  -- schema, but only for the SAME verified event, PR, HEAD and source URL.
  -- A reused task from an older incident must not inherit an executor.
  IF NOT FOUND OR (
       coalesce(t.payload->>'ciSource','')<>'github_core_failure'
       AND NOT (
         t.payload->>'schema'='HH_COMMANDER_TASK_V1'
         AND t.payload->'ciIncident'->>'schema'='HH_CI_INCIDENT_TASK_V1'
         AND t.payload->'ciIncident'->>'pr_number'=e.pr_number::text
         AND t.payload->'ciIncident'->>'head_sha'=e.head_sha
         AND t.payload->>'source'=e.run_url
       )
     )
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

-- commander_ci_route_followup_record_v1
CREATE OR REPLACE FUNCTION business_brain.commander_ci_route_followup_record_v1(p_event uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  e business_brain.commander_ci_event_inbox%ROWTYPE;
  t business_brain.commander_tasks%ROWTYPE;
  v_state text;
  v_reason text;
  v_action text;
  v_next timestamptz;
  v_next_raw text;
  v_receipt jsonb;
  v_executor_confirmed boolean := false;
  v_triage_state text;
BEGIN
  SELECT * INTO e FROM business_brain.commander_ci_event_inbox
   WHERE ci_event_id = p_event FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('state','EVENT_NOT_FOUND'); END IF;
  -- Strict OIDC, owner, exact CI provenance and task association boundaries.
  IF e.repository <> 'andylitvinov-design/books'
    OR e.workflow_path <> '.github/workflows/hh-pr-core-release.yml'
    OR coalesce(e.oidc_workflow_ref,'') NOT IN (
      'andylitvinov-design/books/.github/workflows/hh-pr-direct-core-failure.yml@refs/heads/codex/bootstrap-books',
      'andylitvinov-design/books/.github/workflows/hh-native-auto-merge.yml@refs/heads/codex/bootstrap-books')
    OR e.base_ref <> 'codex/public-book-library'
    OR e.inbox_owner_id IS NULL
    OR e.inbox_owner_id IS DISTINCT FROM e.associated_owner_id
    OR e.associated_task_id IS NULL
    OR e.head_sha !~ '^[a-f0-9]{40}$'
    OR e.classification->>'category' IS DISTINCT FROM e.category
    OR e.classification->>'status' IS DISTINCT FROM 'DIAGNOSTIC_ONLY'
    OR e.classification->>'source_write_authorized' IS DISTINCT FROM 'false'
    OR e.classification->>'execution_authorized' IS DISTINCT FROM 'false'
    OR NOT EXISTS (SELECT 1 FROM business_brain.owner_access o
      WHERE o.user_id=e.inbox_owner_id AND o.can_read=true AND o.can_write=true)
  THEN RETURN jsonb_build_object('state','BLOCKED_UNVERIFIED_IDENTITY'); END IF;

  SELECT * INTO t FROM business_brain.commander_tasks
    WHERE task_id=e.associated_task_id AND owner_id=e.inbox_owner_id
      AND project_key='agent-commander' FOR UPDATE;
  IF NOT FOUND
    OR t.payload->>'schema' <> 'HH_COMMANDER_TASK_V1'
    OR t.payload->'ciIncident'->>'schema' <> 'HH_CI_INCIDENT_TASK_V1'
    OR t.payload->'ciIncident'->>'pr_number' IS DISTINCT FROM e.pr_number::text
    OR t.payload->'ciIncident'->>'head_sha' IS DISTINCT FROM e.head_sha
    -- A reused task on the SAME owner, PR and HEAD may retain the older
    -- CI run URL. Persist this signed event's receipt in its own inbox row,
    -- but do not overwrite the source task's older incident evidence.
    OR NOT coalesce(t.payload->'relatedPr','[]'::jsonb) @> to_jsonb(e.pr_number)
  THEN RETURN jsonb_build_object('state','BLOCKED_TASK_PROVENANCE'); END IF;

  -- Preserve historical CI routes after independently verified newer HEAD.
  IF e.route_followup_receipt->>'state' IN
      ('SUPERSEDED_PR_MERGED_LATER_HEAD','SUPERSEDED_NEW_HEAD_RECHECK')
  THEN
    RETURN e.route_followup_receipt;
  END IF;

  -- A triage task receipt is NOT a real executor assignment. In particular,
  -- HH_CI_TEST_TRIAGE_ASSIGNMENT_V1 may say QUEUED_NOT_STARTED before the
  -- signed route arrives. Never skip its follow-up or claim a worker started.
  v_executor_confirmed := coalesce(
    e.assignment_receipt->>'schema'='HH_CI_EXECUTOR_ASSIGNMENT_V1'
    AND e.assignment_receipt->>'runId' ~*
      '^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$',
    false);
  v_triage_state := CASE
    WHEN e.assignment_receipt->>'schema'='HH_CI_TEST_TRIAGE_ASSIGNMENT_V1'
      THEN e.assignment_receipt->>'state'
    ELSE NULL END;

  -- Do not manufacture a route, executor, or dispatch ACK.
  IF e.route_receipt IS NULL
    OR e.route_receipt->>'schema' IS DISTINCT FROM 'HH_COMMANDER_CI_ROUTE_RECEIPT_V1'
    OR e.route_receipt->>'headSha' IS DISTINCT FROM e.head_sha
    OR e.route_receipt->>'inboxId' IS DISTINCT FROM e.ci_event_id::text
    OR e.route_receipt->>'dispatchAccepted' IS DISTINCT FROM '0'
    OR e.route_receipt->>'workerStarted' IS DISTINCT FROM 'false'
  THEN RETURN jsonb_build_object('state','NO_SIGNED_UNEXECUTED_ROUTE'); END IF;

  v_reason := left(coalesce(e.route_receipt->>'reason','UNVERIFIED_ROUTE'),120);
  v_state := CASE
    WHEN e.route_receipt->>'state' IN ('TASK_ROUTED_TO_REVIEW','TASK_REQUIRES_REVIEW')
      THEN 'MANUAL_REVIEW_PENDING'
    WHEN e.route_receipt->>'state'='TASK_WAITING_FOR_DISPATCH'
      THEN 'DISPATCH_ACK_PENDING'
    WHEN e.route_receipt->>'state' IN ('EXISTING_RECOVERY_ACCEPTED','TASK_AWAITING_EXISTING_RECOVERY')
      THEN 'RECOVERY_RESULT_PENDING'
    ELSE 'BLOCKED_ROUTE_EVIDENCE_RECHECK'
  END;
  IF v_executor_confirmed THEN
    v_state := 'ASSIGNMENT_RECORDED_SOURCE_UNVERIFIED';
  END IF;
  v_action := CASE
    WHEN v_state='ASSIGNMENT_RECORDED_SOURCE_UNVERIFIED'
      THEN 'VERIFY_GITHUB_EXECUTOR_RUN_AND_SOURCE_PROOF; DIAGNOSIS_NOT_REPAIR'
    WHEN v_state='DISPATCH_ACK_PENDING'
      THEN 'VERIFY_EXISTING_REPAIR_DISPATCH_ACK_AND_CLAIM; NO_BLIND_RETRY'
    WHEN v_state='RECOVERY_RESULT_PENDING'
      THEN 'VERIFY_EXISTING_RECOVERY_RESULT_AND_EXACT_HEAD_CI; NO_DISPATCH'
    WHEN e.category='BASE_OR_CI_ROUTING'
      THEN 'INSPECT_EXACT_HEAD_SPECIALIST_JOB_AND_OWNER_LEASE; NO_CI_WAKE'
    WHEN e.category='TEST_FAILURE'
      THEN 'REVIEW_CAUSAL_FAILED_TEST_AND_ALLOWLISTED_OWNER; NO_SOURCE_AUTORUN'
    WHEN e.category='MERGE_CONFLICT'
      THEN 'REVIEW_SEMANTIC_CONFLICT_AND_EXCLUSIVE_OWNER; NO_FORCE_MERGE'
    ELSE 'REVIEW_VERIFIED_CAUSAL_FAILURE_AND_SAFE_EXECUTOR; NO_AUTORUN'
  END;
  v_next_raw := t.payload->'ciIncident'->>'next_check_at';
  v_next := CASE
    WHEN v_next_raw ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}'
      THEN v_next_raw::timestamptz
    ELSE e.created_at + interval '15 minutes'
  END;

  -- Reprocessing the same signed route cannot create more tasks or reset SLA.
  IF e.route_followup_receipt->>'state' IS NOT DISTINCT FROM v_state
     AND e.route_followup_receipt->>'routeReason' IS NOT DISTINCT FROM v_reason
     AND e.route_followup_receipt->>'headSha' IS NOT DISTINCT FROM e.head_sha
     AND e.route_followup_receipt->>'routeState' IS NOT DISTINCT FROM
         (e.route_receipt->>'state')
     AND e.route_followup_receipt->>'assignmentConfirmed' IS NOT DISTINCT FROM
         v_executor_confirmed::text
     AND e.route_followup_receipt->>'assignmentState' IS NOT DISTINCT FROM
         (CASE WHEN v_executor_confirmed THEN e.assignment_receipt->>'state'
           ELSE NULL END)
     AND e.route_followup_receipt->>'triageState' IS NOT DISTINCT FROM
         v_triage_state
  THEN RETURN e.route_followup_receipt; END IF;

  v_receipt := jsonb_build_object(
    'schema','HH_CI_ROUTE_FOLLOWUP_V1','ciEventId',e.ci_event_id,
    'taskId',t.task_id,'prNumber',e.pr_number,'headSha',e.head_sha,
    'runId',e.workflow_run_id,'runAttempt',e.run_attempt,
    'evidenceUrl',e.run_url,'category',e.category,
    'state',v_state,'routeState',e.route_receipt->>'state',
    'routeReason',v_reason,
    'responsibleRole',coalesce(nullif(e.classification->>'responsible_role',''),
                               'owner-ci-review'),
    'nextAction',v_action,'nextCheckAt',v_next,
    'assignmentConfirmed',v_executor_confirmed,
    'assignmentState',(CASE WHEN v_executor_confirmed THEN
       e.assignment_receipt->>'state' ELSE NULL END),
    'triageState',v_triage_state,'taskSourceMatches',
       (t.payload->>'source' IS NOT DISTINCT FROM e.run_url),
    'dispatchAccepted',false,'workerStarted',false,
    'sourceFixVerified',false,'liveVerified',false,
    'manualRequired',(e.route_receipt->>'state' IN
       ('TASK_ROUTED_TO_REVIEW','TASK_REQUIRES_REVIEW')),
    'proofLevel','SIGNED_OIDC_ROUTE_NO_EXECUTION_PROOF',
    'recordedAt',now());

  UPDATE business_brain.commander_ci_event_inbox
    SET route_followup_receipt=v_receipt,route_followup_recorded_at=now()
    WHERE ci_event_id=e.ci_event_id;
  UPDATE business_brain.commander_tasks
    SET payload=jsonb_set(payload,'{ciRouteFollowup}',v_receipt,true),
        revision=revision+1,updated_at=now()
    WHERE task_id=t.task_id AND owner_id=t.owner_id
      AND (payload->>'source') IS NOT DISTINCT FROM e.run_url
      AND payload->'ciRouteFollowup' IS DISTINCT FROM v_receipt;
  RETURN v_receipt;
END
$function$;
