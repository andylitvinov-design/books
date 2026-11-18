-- Persist production OIDC-verified per-event historical-HEAD follow-up policy.
-- A newer PR HEAD must NEVER be repaired through a historical CI event.
-- Stale owner task context creates only an inbox-scoped, source-write-free
-- HISTORICAL_HEAD_READBACK_PENDING receipt until independent GitHub readback.
-- Mirrors already deployed live function; no extra worker/CI/deploy spend.
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
    OR NOT coalesce(t.payload->'relatedPr','[]'::jsonb) @> to_jsonb(e.pr_number)
  THEN RETURN jsonb_build_object('state','BLOCKED_TASK_PROVENANCE'); END IF;

  -- An existing owner chat/task can be explicitly matched to this PR without
  -- being a CI-created task. Record the signed CI history privately ONLY;
  -- do not rewrite the owner's task, assign an executor or claim a repair.
  IF t.payload->'ciIncident' IS NULL
     AND e.association_status='MATCHED_CHAT_EVENT_RECORDED' THEN
    IF e.route_followup_receipt->>'state'='EXISTING_OWNER_TASK_CI_ROUTE_READONLY'
    THEN RETURN e.route_followup_receipt; END IF;
    IF e.route_receipt IS NULL
      OR e.route_receipt->>'schema' IS DISTINCT FROM 'HH_COMMANDER_CI_ROUTE_RECEIPT_V1'
      OR e.route_receipt->>'inboxId' IS DISTINCT FROM e.ci_event_id::text
      OR e.route_receipt->>'headSha' IS DISTINCT FROM e.head_sha
      OR e.route_receipt->>'dispatchAccepted' IS DISTINCT FROM '0'
      OR e.route_receipt->>'workerStarted' IS DISTINCT FROM 'false'
    THEN RETURN jsonb_build_object('state','NO_SIGNED_EXISTING_OWNER_ROUTE'); END IF;
    v_receipt := jsonb_build_object(
      'schema','HH_CI_ROUTE_FOLLOWUP_V1','ciEventId',e.ci_event_id,
      'taskId',t.task_id,'prNumber',e.pr_number,'headSha',e.head_sha,
      'runId',e.workflow_run_id,'runAttempt',e.run_attempt,
      'category',e.category,'evidenceUrl',e.run_url,
      'state','EXISTING_OWNER_TASK_CI_ROUTE_READONLY',
      'routeState',e.route_receipt->>'state',
      'routeReason',e.route_receipt->>'reason',
      'responsibleRole','existing-owner-task-review',
      'nextAction','VERIFY_OWNER_TASK_AND_GITHUB_CURRENT_HEAD; NO_AUTOMATIC_SOURCE_DISPATCH',
      'nextCheckAt',null,'assignmentConfirmed',false,'dispatchAccepted',false,
      'workerStarted',false,'sourceFixVerified',false,'liveVerified',false,
      'manualRequired',false,'taskSourceMatches',false,
      'proofLevel','SIGNED_OIDC_EXISTING_OWNER_TASK_NO_SOURCE_PROOF',
      'recordedAt',now());
    UPDATE business_brain.commander_ci_event_inbox
      SET route_followup_receipt=v_receipt,route_followup_recorded_at=now()
      WHERE ci_event_id=e.ci_event_id AND route_followup_receipt IS NULL;
    -- Never mutate existing owner task or its chosen service/source.
    RETURN v_receipt;
  END IF;

  IF t.payload->'ciIncident'->>'schema' <> 'HH_CI_INCIDENT_TASK_V1'
    OR t.payload->'ciIncident'->>'pr_number' IS DISTINCT FROM e.pr_number::text
    OR coalesce(t.payload->'ciIncident'->>'head_sha','') !~ '^[a-f0-9]{40}$'
  THEN RETURN jsonb_build_object('state','BLOCKED_TASK_PROVENANCE'); END IF;

  -- A reused owner task can point to a newer HEAD. Keep older authenticated
  -- Core events in their OWN inbox row, without changing the active task.
  IF t.payload->'ciIncident'->>'head_sha' IS DISTINCT FROM e.head_sha THEN
    IF e.route_followup_receipt->>'state' IN
      ('SUPERSEDED_PR_MERGED_LATER_HEAD','SUPERSEDED_NEW_HEAD_RECHECK',
       'HISTORICAL_HEAD_READBACK_PENDING') THEN
      RETURN e.route_followup_receipt;
    END IF;
    IF e.route_receipt IS NULL
      OR e.route_receipt->>'schema' IS DISTINCT FROM 'HH_COMMANDER_CI_ROUTE_RECEIPT_V1'
      OR e.route_receipt->>'headSha' IS DISTINCT FROM e.head_sha
      OR e.route_receipt->>'inboxId' IS DISTINCT FROM e.ci_event_id::text
      OR e.route_receipt->>'dispatchAccepted' IS DISTINCT FROM '0'
      OR e.route_receipt->>'workerStarted' IS DISTINCT FROM 'false'
    THEN RETURN jsonb_build_object('state','NO_SIGNED_HISTORICAL_ROUTE'); END IF;
    v_receipt := jsonb_build_object(
      'schema','HH_CI_ROUTE_FOLLOWUP_V1','ciEventId',e.ci_event_id,
      'taskId',t.task_id,'prNumber',e.pr_number,'headSha',e.head_sha,
      'sourceTaskHeadSha',t.payload->'ciIncident'->>'head_sha',
      'runId',e.workflow_run_id,'runAttempt',e.run_attempt,
      'category',e.category,'evidenceUrl',e.run_url,
      'state','HISTORICAL_HEAD_READBACK_PENDING',
      'routeState',e.route_receipt->>'state',
      'routeReason',e.route_receipt->>'reason',
      'responsibleRole','ci-history-verifier',
      'nextAction','VERIFY_INDEPENDENT_GITHUB_HEAD_READBACK; DO_NOT_DISPATCH_OLD_HEAD',
      'nextCheckAt',null,'assignmentConfirmed',false,'dispatchAccepted',false,
      'workerStarted',false,'sourceFixVerified',false,'liveVerified',false,
      'manualRequired',false,'taskSourceMatches',false,
      'proofLevel','SIGNED_OIDC_HISTORICAL_HEAD_NOT_LIVE_READBACK',
      'recordedAt',now());
    UPDATE business_brain.commander_ci_event_inbox
      SET route_followup_receipt=v_receipt,route_followup_recorded_at=now()
      WHERE ci_event_id=e.ci_event_id AND route_followup_receipt IS NULL;
    -- No commander_tasks mutation or new worker grant for the old HEAD.
    RETURN v_receipt;
  END IF;

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
