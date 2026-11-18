-- Existing owner tasks may be linked to a verified PR Core error without
-- being CI-created. Keep their signed event history in the owner-only inbox,
-- leaving the original owner task and all source privileges UNCHANGED.
DO $migration$
DECLARE
  current_def text;
  original_block constant text := $old$
  IF NOT FOUND
    OR t.payload->>'schema' <> 'HH_COMMANDER_TASK_V1'
    OR t.payload->'ciIncident'->>'schema' <> 'HH_CI_INCIDENT_TASK_V1'
    OR t.payload->'ciIncident'->>'pr_number' IS DISTINCT FROM e.pr_number::text
    OR coalesce(t.payload->'ciIncident'->>'head_sha','') !~ '^[a-f0-9]{40}$'
    OR NOT coalesce(t.payload->'relatedPr','[]'::jsonb) @> to_jsonb(e.pr_number)
  THEN RETURN jsonb_build_object('state','BLOCKED_TASK_PROVENANCE'); END IF;$old$;
  updated_block constant text := $new$
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
  THEN RETURN jsonb_build_object('state','BLOCKED_TASK_PROVENANCE'); END IF;$new$;
BEGIN
  current_def := pg_get_functiondef(
    'business_brain.commander_ci_route_followup_record_v1(uuid)'::regprocedure);
  IF current_def IS NULL THEN
    RAISE EXCEPTION 'COMMANDER_OWNER_CI_HISTORY_FUNCTION_MISSING';
  ELSIF position('EXISTING_OWNER_TASK_CI_ROUTE_READONLY' IN current_def)>0 THEN
    RETURN;
  ELSIF position(original_block IN current_def)>0 THEN
    EXECUTE replace(current_def,original_block,updated_block);
  ELSE
    RAISE EXCEPTION 'COMMANDER_OWNER_CI_HISTORY_UNRECOGNIZED_FUNCTION';
  END IF;
END
$migration$;
