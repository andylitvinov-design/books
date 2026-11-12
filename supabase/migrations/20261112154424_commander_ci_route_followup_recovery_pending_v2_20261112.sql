-- HH_CI_ROUTE_FOLLOWUP_V2: durable schema matching production applied version
-- 20261112154424. This self-contained migration also reconstructs the older
-- owner-scoped follow-up schema on fresh installations without needing another
-- scheduler, model, worker, CI rerun, paid API, or authenticated public grants.
ALTER TABLE business_brain.commander_ci_event_inbox
  ADD COLUMN IF NOT EXISTS route_followup_receipt jsonb,
  ADD COLUMN IF NOT EXISTS route_followup_recorded_at timestamptz;

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
BEGIN
  SELECT * INTO e FROM business_brain.commander_ci_event_inbox
   WHERE ci_event_id = p_event FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('state','EVENT_NOT_FOUND'); END IF;
  -- Strict OIDC, owner, exact CI provenance and task association boundaries.
  IF e.repository <> 'andylitvinov-design/books'
    OR e.workflow_path <> '.github/workflows/hh-pr-core-release.yml'
    OR e.oidc_workflow_ref <>
       'andylitvinov-design/books/.github/workflows/hh-pr-direct-core-failure.yml@refs/heads/codex/bootstrap-books'
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
    OR t.payload->>'source' IS DISTINCT FROM e.run_url
    OR NOT coalesce(t.payload->'relatedPr','[]'::jsonb) @> to_jsonb(e.pr_number)
  THEN RETURN jsonb_build_object('state','BLOCKED_TASK_PROVENANCE'); END IF;

  -- Preserve historical CI routes after independently verified newer HEAD.
  IF e.assignment_receipt IS NULL
    AND e.route_followup_receipt->>'state' IN
      ('SUPERSEDED_PR_MERGED_LATER_HEAD','SUPERSEDED_NEW_HEAD_RECHECK')
  THEN
    RETURN e.route_followup_receipt;
  END IF;

  -- Genuine executor receipts supersede the follow-up as an assignment
  -- stage ONLY; even a completed read-only diagnosis is not a source fix.
  IF e.assignment_receipt IS NOT NULL THEN
    IF e.route_followup_receipt IS NOT NULL
      AND e.route_followup_receipt->>'state' IS DISTINCT FROM
        'ASSIGNMENT_RECORDED_SOURCE_UNVERIFIED' THEN
      v_receipt := e.route_followup_receipt || jsonb_build_object(
        'state','ASSIGNMENT_RECORDED_SOURCE_UNVERIFIED',
        'assignmentState',e.assignment_receipt->>'state',
        'assignmentRecordedAt',now(),
        'assignmentConfirmed',true,'sourceFixVerified',false,'liveVerified',false);
      UPDATE business_brain.commander_ci_event_inbox
        SET route_followup_receipt=v_receipt,route_followup_recorded_at=now()
        WHERE ci_event_id=e.ci_event_id;
      UPDATE business_brain.commander_tasks
        SET payload=jsonb_set(payload,'{ciRouteFollowup}',v_receipt,true),
            revision=revision+1,updated_at=now()
        WHERE task_id=t.task_id AND owner_id=t.owner_id
          AND payload->'ciRouteFollowup'->>'ciEventId'=e.ci_event_id::text;
    END IF;
    RETURN jsonb_build_object('state','ASSIGNMENT_ALREADY_RECORDED');
  END IF;

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
  v_action := CASE
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
    'assignmentConfirmed',false,'dispatchAccepted',false,
    'workerStarted',false,'sourceFixVerified',false,'liveVerified',false,
    'manualRequired',(v_state='MANUAL_REVIEW_PENDING'),
    'proofLevel','SIGNED_OIDC_ROUTE_NO_EXECUTION_PROOF',
    'recordedAt',now());

  UPDATE business_brain.commander_ci_event_inbox
    SET route_followup_receipt=v_receipt,route_followup_recorded_at=now()
    WHERE ci_event_id=e.ci_event_id AND assignment_receipt IS NULL;
  UPDATE business_brain.commander_tasks
    SET payload=jsonb_set(payload,'{ciRouteFollowup}',v_receipt,true),
        revision=revision+1,updated_at=now()
    WHERE task_id=t.task_id AND owner_id=t.owner_id
      AND payload->'ciRouteFollowup' IS DISTINCT FROM v_receipt;
  RETURN v_receipt;
END
$function$;

CREATE OR REPLACE FUNCTION business_brain.commander_ci_route_followup_trigger_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $trigger$
BEGIN
  PERFORM business_brain.commander_ci_route_followup_record_v1(NEW.ci_event_id);
  RETURN NEW;
END
$trigger$;

DROP TRIGGER IF EXISTS zzz_commander_ci_route_followup_v1
  ON business_brain.commander_ci_event_inbox;
CREATE TRIGGER zzz_commander_ci_route_followup_v1
  AFTER INSERT OR UPDATE OF route_receipt,assignment_receipt,associated_task_id
  ON business_brain.commander_ci_event_inbox
  FOR EACH ROW EXECUTE FUNCTION business_brain.commander_ci_route_followup_trigger_v1();

REVOKE ALL ON FUNCTION business_brain.commander_ci_route_followup_record_v1(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION business_brain.commander_ci_route_followup_trigger_v1()
  FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN business_brain.commander_ci_event_inbox.route_followup_receipt IS
  'Owner-scoped signed route follow-up, not confirmed executor, source fix or LIVE.';
COMMENT ON FUNCTION business_brain.commander_ci_route_followup_record_v1(uuid) IS
  'Signed CI follow-up, manual/recovery/dispatch states, deadline and historical supersession with no executor dispatch.';

-- Bounded reconciliation only; no scheduling, source changes or dispatch.
DO $backfill$
DECLARE r record;
BEGIN
  FOR r IN SELECT ci_event_id FROM business_brain.commander_ci_event_inbox
    WHERE assignment_receipt IS NULL AND route_receipt IS NOT NULL
    ORDER BY created_at DESC LIMIT 500
  LOOP
    PERFORM business_brain.commander_ci_route_followup_record_v1(r.ci_event_id);
  END LOOP;
END
$backfill$;
