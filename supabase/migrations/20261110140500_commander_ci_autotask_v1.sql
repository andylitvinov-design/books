-- HH Commander: trusted CI failure -> one review task per active PR.
-- The OIDC-authenticated inbox is the only trigger source. This does not grant
-- an executor lease, request a rerun, change product source, or authorize merge.
-- Existing Commander tasks for a PR take precedence; ambiguous ownership fails closed.
CREATE UNIQUE INDEX IF NOT EXISTS commander_ci_one_active_autotask_per_pr
ON business_brain.commander_tasks(owner_id, (payload->>'ciIncidentKey'))
WHERE state NOT IN ('completed','superseded') AND payload ? 'ciIncidentKey';

CREATE OR REPLACE FUNCTION business_brain.commander_ci_event_autotask_v1()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
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
  v_created boolean := false;
BEGIN
  -- The receiver has already verified GitHub OIDC, Core identity and PR HEAD.
  -- This secondary gate prevents unrelated inserts from creating tasks.
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
  -- Follow the exact same owner/project/PR matching rule as Commander v23.
  SELECT array_agg(task_id) INTO v_ids FROM (
    SELECT task_id FROM business_brain.commander_tasks
     WHERE owner_id = NEW.inbox_owner_id AND project_key = 'agent-commander'
       AND state NOT IN ('completed','superseded')
       AND coalesce(payload->'relatedPr','[]'::jsonb) @> to_jsonb(NEW.pr_number)
     ORDER BY updated_at DESC LIMIT 2
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
    v_action := coalesce(nullif(left(NEW.classification->>'recommended_action',500),''),
      'Collect the failed Core job evidence, classify its root cause, and select a safe repair strategy.');
    v_role := coalesce(nullif(left(NEW.classification->>'responsible_role',80),''),
      'ci-diagnostic-triage');
    v_title := left('[CI] PR #' || NEW.pr_number || ' · ' || NEW.category,180);
    v_summary := left('Verified GitHub Core failure at HEAD ' || NEW.head_sha ||
      '; category ' || NEW.category || '; role ' || v_role ||
      '; reason ' || coalesce(NEW.classification->>'reason_code','UNCLASSIFIED') ||
      '. Execution has NOT started.',3000);
    v_now := to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"');
    v_task := gen_random_uuid();
    v_payload := jsonb_build_object(
      'schema','HH_COMMANDER_TASK_V1', 'taskId',v_task,
      'title',v_title, 'project','commander', 'priority','P1',
      'area','Agent Commander / CI', 'source',NEW.run_url,
      'summary',v_summary,
      'plan',left(v_action || ' Confirm current PR HEAD, security policy and the existing worker lease before any remediation.',5000),
      'prompt','Review this verified CI failure and propose a safe next step. Do not run an executor or write source without a separate exact-HEAD authorization.',
      'executor','manual', 'mode','analysis', 'relatedPr',jsonb_build_array(NEW.pr_number),
      'restrictions',jsonb_build_object('noCost',true,'noDuplicate',true,'verifyLive',true),
      'ciIncidentKey',v_key, 'ciSource','github_core_failure',
      'ciCategory',NEW.category, 'ciReasonCode',coalesce(NEW.classification->>'reason_code','UNCLASSIFIED'),
      'ciResponsibleRole',v_role,'ciRecommendedAction',v_action,
      'ciRecommendedStatus',coalesce(NEW.classification->>'recommended_status','UNCLASSIFIED'),
      'ciClassification',NEW.classification,
      'ciEvidence',jsonb_build_object('repository',NEW.repository,'prNumber',NEW.pr_number,
        'headSha',NEW.head_sha,'workflowRunId',NEW.workflow_run_id,'runAttempt',NEW.run_attempt,
        'runUrl',NEW.run_url,'failedJobs',NEW.failed_jobs,'failedSteps',NEW.failed_steps,
        'verification','GITHUB_OIDC_AND_EXACT_PR_HEAD'),
      'executionAuthorized',false, 'sourceWriteAuthorized',false, 'agentStarted',false
    );
    INSERT INTO business_brain.commander_tasks
      (task_id,owner_id,project_key,title,payload,state,revision)
    VALUES (v_task,NEW.inbox_owner_id,'agent-commander',v_title,v_payload,'queued_review',1)
    ON CONFLICT DO NOTHING
    RETURNING task_number INTO v_number;
    IF v_number IS NULL THEN
      -- Another workflow attempt may have created this exact PR incident first.
      SELECT task_id,task_number INTO v_task,v_number
        FROM business_brain.commander_tasks
       WHERE owner_id=NEW.inbox_owner_id AND state NOT IN ('completed','superseded')
         AND payload->>'ciIncidentKey'=v_key LIMIT 1;
      IF v_task IS NULL THEN
        RAISE EXCEPTION 'COMMANDER_CI_TASK_DEDUP_UNVERIFIED';
      END IF;
    ELSE
      v_created := true;
    END IF;
    v_chat := jsonb_build_object(
      'schema','HH_COMMANDER_THREAD_V1','id',v_task,'title',left(v_title,110),
      'project','commander','description',left(v_summary,1000),
      'goal','Diagnose this verified CI failure and prepare the approved response.',
      'taskId',v_task,'taskIssueNumber',v_number,'tasks',jsonb_build_array(),
      'executors',jsonb_build_array('manual'),'prs',jsonb_build_array(NEW.pr_number),
      'status','assigned','revision',1,'createdAt',v_now,'updatedAt',v_now,
      'executionState','AWAITING_EXECUTOR_NOT_DISPATCHED','liveVerified',false);
    INSERT INTO business_brain.commander_chats
      (chat_id,owner_id,task_id,title,payload,status,execution_state,revision)
    VALUES (v_task,NEW.inbox_owner_id,v_task,left(v_title,110),v_chat,
      'assigned','AWAITING_EXECUTOR_NOT_DISPATCHED',1)
    ON CONFLICT (task_id) DO NOTHING;
  END IF;

  UPDATE business_brain.commander_ci_event_inbox
     SET associated_task_id=v_task,associated_owner_id=NEW.inbox_owner_id,
         association_status=CASE WHEN v_created
           THEN 'AUTO_TASK_CREATED_NOT_DISPATCHED' ELSE 'MATCHED_TASK_NOT_DISPATCHED' END
   WHERE ci_event_id=NEW.ci_event_id AND inbox_owner_id=NEW.inbox_owner_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS commander_ci_event_autotask_v1 ON business_brain.commander_ci_event_inbox;
CREATE TRIGGER commander_ci_event_autotask_v1
AFTER INSERT ON business_brain.commander_ci_event_inbox
FOR EACH ROW EXECUTE FUNCTION business_brain.commander_ci_event_autotask_v1();

COMMENT ON FUNCTION business_brain.commander_ci_event_autotask_v1()
IS 'OIDC-verified Core CI event to idempotent review-only Commander task + chat; never starts executor or authorizes GitHub write.';
