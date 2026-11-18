-- P0: historical signed Core-HEAD receipts are evidence, not new writes.
-- Owner/task/route OIDC checks stay unchanged; a mismatched task HEAD gets
-- only a private inbox history record, never another Repair Worker dispatch.
DO $migration$
DECLARE
  current_def text;
  old_rule constant text := $old$
  IF NOT FOUND
    OR t.payload->>'schema' <> 'HH_COMMANDER_TASK_V1'
    OR t.payload->'ciIncident'->>'schema' <> 'HH_CI_INCIDENT_TASK_V1'
    OR t.payload->'ciIncident'->>'pr_number' IS DISTINCT FROM e.pr_number::text
    OR t.payload->'ciIncident'->>'head_sha' IS DISTINCT FROM e.head_sha
    -- A reused task on the SAME owner, PR and HEAD may retain the older
    -- CI run URL. Persist this signed event's receipt in its own inbox row,
    -- but do not overwrite the source task's older incident evidence.
    OR NOT coalesce(t.payload->'relatedPr','[]'::jsonb) @> to_jsonb(e.pr_number)
  THEN RETURN jsonb_build_object('state','BLOCKED_TASK_PROVENANCE'); END IF;$old$;
  new_rule constant text := $new$
  IF NOT FOUND
    OR t.payload->>'schema' <> 'HH_COMMANDER_TASK_V1'
    OR t.payload->'ciIncident'->>'schema' <> 'HH_CI_INCIDENT_TASK_V1'
    OR t.payload->'ciIncident'->>'pr_number' IS DISTINCT FROM e.pr_number::text
    OR coalesce(t.payload->'ciIncident'->>'head_sha','') !~ '^[a-f0-9]{40}$'
    OR NOT coalesce(t.payload->'relatedPr','[]'::jsonb) @> to_jsonb(e.pr_number)
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
  END IF;$new$;
BEGIN
  current_def := pg_get_functiondef(
    'business_brain.commander_ci_route_followup_record_v1(uuid)'::regprocedure);
  IF current_def IS NULL THEN
    RAISE EXCEPTION 'COMMANDER_CI_HISTORICAL_FUNCTION_MISSING';
  ELSIF position('HISTORICAL_HEAD_READBACK_PENDING' IN current_def)>0 THEN
    RETURN;
  ELSIF position(old_rule IN current_def)>0 THEN
    EXECUTE replace(current_def,old_rule,new_rule);
  ELSE
    RAISE EXCEPTION 'COMMANDER_CI_HISTORICAL_UNRECOGNIZED_FUNCTION';
  END IF;
END
$migration$;
