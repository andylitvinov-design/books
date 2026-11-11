-- HH Commander CI task assignment v2.
-- Complete the task/chat association for new events and safely recover older unmatched inbox rows.
-- This only creates queued review work; it never starts an executor or grants source-write authority.

CREATE OR REPLACE FUNCTION business_brain.commander_ci_event_autotask_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
     OR NEW.oidc_workflow_ref <> 'andylitvinov-design/books/.github/workflows/hh-pr-direct-core-failure.yml@refs/heads/codex/bootstrap-books'
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
$$;

DROP TRIGGER IF EXISTS commander_ci_event_autotask_v1 ON business_brain.commander_ci_event_inbox;
CREATE TRIGGER commander_ci_event_autotask_v2
AFTER INSERT OR UPDATE OF classification,category,pr_number,head_sha
ON business_brain.commander_ci_event_inbox
FOR EACH ROW EXECUTE FUNCTION business_brain.commander_ci_event_autotask_v1();

-- Backfill all prior events through the same idempotent path. This also repairs
-- MATCHED_TASK_NO_CHAT rows and never reopens completed/superseded tasks.
UPDATE business_brain.commander_ci_event_inbox
   SET category=category
 WHERE association_status IN ('UNMATCHED','MATCHED_TASK_NO_CHAT','AMBIGUOUS_TASKS')
    OR associated_task_id IS NOT NULL;
