/** Private PM execution receipts. No network calls inside PostgreSQL transactions. */
const P='app_private.cc_pm_';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const executionUuid=value=>typeof value==='string'&&UUID.test(value);
const cleanEvidence=value=>JSON.stringify(value||{});
export async function readApprovedExecutionTask(db,taskId,prNumber){
 const r=await db.query(`SELECT t.id,t.title,t.kind,t.state,t.source_ref,l.acceptance,
   l.epic_id,e.selected_option_id=l.option_id AS plan_approved,p.pr_number
  FROM ${P}task_links l
  JOIN app_private.cc_tasks t ON t.id=l.task_id
  JOIN ${P}epics e ON e.id=l.epic_id
  JOIN ${P}pr_links p ON p.task_id=t.id AND p.pr_number=$2
  WHERE t.id=$1 LIMIT 1`,[taskId,prNumber]);
 const task=r.rows[0];
 if(!task)return {error:'APPROVED_TASK_PR_LINK_NOT_FOUND'};
 if(task.plan_approved!==true||task.kind!=='code_change'||
    ['canceled','cancelled','completed_live','completed_verified'].includes(task.state))
   return {error:'TASK_NOT_ELIGIBLE_FOR_CODE_REPAIR'};
 if(task.source_ref && task.source_ref!=='https://github.com/andylitvinov-design/books/pull/'+prNumber)
   return {error:'TASK_SOURCE_MISMATCH'};
 return {task};
}
export async function prepareExecutionRecord(db,{taskId,prNumber,candidate,executor,requestId}){
 const sha=candidate.headSha,failure=candidate.failure;
 // Serialize the PR + SHA, not merely double-click requestId. Different tasks
 // linking the same source branch cannot reserve duplicate worker invocations.
 await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',
  ['hh-pm-exec-v3',prNumber+':'+sha]);
 const old=await db.query(`SELECT id,task_id,pr_number,expected_sha,state,workflow_run_id,
  workflow_run_url,expires_at FROM ${P}executions WHERE pr_number=$1 AND expected_sha=$2`,
  [prNumber,sha]);
 if(old.rows[0]){
  return {status:'already_prepared',reason:'ONE_EXECUTION_PER_PR_HEAD',execution:old.rows[0]};
 }
 const inserted=await db.query(`INSERT INTO ${P}executions
   (task_id,pr_number,expected_sha,failure_check_id,failure_run_id,executor,prepare_request_id,evidence)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
   RETURNING id,task_id,pr_number,expected_sha,state,expires_at`,
  [taskId,prNumber,sha,failure.checkId,failure.runId,executor,requestId,
   cleanEvidence({prUrl:candidate.prUrl,checkUrl:failure.detailsUrl,
    failedRunUrl:failure.runUrl,failedConclusion:failure.conclusion,sourceHead:sha})]);
 return {status:'prepared',execution:inserted.rows[0],candidate};
}
export async function readExecution(db,executionId,taskId){
 const r=await db.query(`SELECT e.id,e.task_id,e.pr_number,e.expected_sha,e.executor,e.state,
  e.failure_check_id,e.failure_run_id,e.created_at,e.owner_approved_at,e.expires_at,
  e.workflow_run_id,e.workflow_run_url,e.blocker_code,e.cancel_future,e.evidence
  FROM ${P}executions e
  JOIN ${P}task_links l ON l.task_id=e.task_id
  WHERE e.id=$1 AND e.task_id=$2`,[executionId,taskId]);
 if(!r.rows[0])return {error:'EXECUTION_NOT_FOUND'};
 const ev=await db.query(`SELECT stage,evidence,observed_at FROM ${P}execution_events
   WHERE execution_id=$1 ORDER BY id ASC LIMIT 40`,[executionId]);
 return {status:'observed',execution:r.rows[0],events:ev.rows};
}
export async function claimExecutionLaunch(db,{executionId,taskId,requestId}){
 const record=await db.query(`SELECT id,task_id,pr_number,expected_sha,executor,state,launch_request_id,
  failure_check_id,failure_run_id,expires_at,cancel_future
  FROM ${P}executions WHERE id=$1 AND task_id=$2 FOR UPDATE`,[executionId,taskId]);
 const row=record.rows[0];
 if(!row)return {error:'EXECUTION_NOT_FOUND'};
 if(row.launch_request_id===requestId)return {error:'ALREADY_SUBMITTED_NO_DOUBLE_DISPATCH'};
 if(row.state!=='PREPARED'||row.cancel_future)return {error:'EXECUTION_NOT_LAUNCHABLE'};
 if(Date.parse(row.expires_at)<=Date.now())return {error:'PREPARATION_EXPIRED'};
 if(row.executor!=='auto_free_repair')return {error:'EXECUTOR_HANDOFF_ONLY'};
 await db.query(`UPDATE ${P}executions SET state='DISPATCHING',owner_approved_at=now(),
  launch_request_id=$2,updated_at=now() WHERE id=$1`,[executionId,requestId]);
 await db.query(`INSERT INTO ${P}execution_events(execution_id,stage,evidence)
   VALUES($1,'OWNER_APPROVED',$2::jsonb) ON CONFLICT DO NOTHING`,
  [executionId,cleanEvidence({sourceHead:row.expected_sha,
    prUrl:'https://github.com/andylitvinov-design/books/pull/'+row.pr_number,
    approvedAt:new Date().toISOString()})]);
 return {status:'claimed',execution:row};
}
export async function settleExecutionLaunch(db,{executionId,outcome}){
 if(!outcome||!['accepted','accepted_uncorrelated','unconfirmed','blocked'].includes(outcome.status))
  return {error:'INVALID_DISPATCH_OUTCOME'};
 const state=outcome.status==='accepted'?'DISPATCH_ACCEPTED':
  ['unconfirmed','accepted_uncorrelated'].includes(outcome.status)?'DISPATCH_UNCONFIRMED':'BLOCKED';
 const runId=outcome.workflowRunId||null;
 const runUrl=outcome.workflowRunUrl||null;
 const code=state==='BLOCKED'||state==='DISPATCH_UNCONFIRMED'?
  String(outcome.reason||'UNKNOWN').slice(0,100):null;
 const r=await db.query(`UPDATE ${P}executions SET state=$2,workflow_run_id=$3,
  workflow_run_url=$4,blocker_code=$5,updated_at=now()
  WHERE id=$1 AND state='DISPATCHING'
  RETURNING id,task_id,pr_number,expected_sha,state,workflow_run_id,workflow_run_url,blocker_code`,
  [executionId,state,runId,runUrl,code]);
 if(!r.rows[0])return {error:'DISPATCH_RECEIPT_RACE_OR_MISSING'};
 if(state==='DISPATCH_ACCEPTED'){
  await db.query(`INSERT INTO ${P}execution_events(execution_id,stage,evidence)
    VALUES($1,'DISPATCH_ACCEPTED',$2::jsonb) ON CONFLICT DO NOTHING`,
   [executionId,cleanEvidence({workflowRunId:runId,workflowRunUrl:runUrl,
    sourceHead:r.rows[0].expected_sha,acceptedAt:outcome.acceptedAt})]);
 }else{
  await db.query(`INSERT INTO ${P}execution_events(execution_id,stage,evidence)
    VALUES($1,'BLOCKED',$2::jsonb) ON CONFLICT DO NOTHING`,
   [executionId,cleanEvidence({reason:code,sourceHead:r.rows[0].expected_sha})]);
 }
 return {status:state,execution:r.rows[0]};
}
export async function cancelFutureExecutionAttempts(db,{executionId,taskId,requestId}){
 const r=await db.query(`SELECT id,state,cancel_future,cancel_request_id
  FROM ${P}executions WHERE id=$1 AND task_id=$2 FOR UPDATE`,[executionId,taskId]);
 const row=r.rows[0];if(!row)return {error:'EXECUTION_NOT_FOUND'};
 if(row.cancel_request_id&&row.cancel_request_id!==requestId)
  return {status:'already_cancelled',executionId,activeRunUnchanged:true};
 await db.query(`UPDATE ${P}executions SET cancel_future=true,
  state=CASE WHEN state='PREPARED' THEN 'CANCELLED' ELSE state END,
  cancel_request_id=COALESCE(cancel_request_id,$2),updated_at=now() WHERE id=$1`,
  [executionId,requestId]);
 return {status:'future_attempts_cancelled',executionId,activeRunUnchanged:true,
  mandatoryCIUnchanged:true};
}
export async function listTaskExecutions(db,taskId){
 const r=await db.query(`SELECT id,pr_number,expected_sha,state,executor,created_at,
  workflow_run_id,workflow_run_url,blocker_code,cancel_future
  FROM ${P}executions WHERE task_id=$1 ORDER BY created_at DESC LIMIT 20`,[taskId]);
 return r.rows;
}
