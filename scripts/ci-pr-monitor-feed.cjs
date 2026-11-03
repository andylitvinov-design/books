'use strict';

// Public, source-attributed KPI receipt. An accepted dispatch is not a started runner,
// and a sampled automation queue is not the entire production PR backlog.
const REPO='andylitvinov-design/books';
const ISSUE_NUMBER=3128;
const MARKER='<!-- HH_CONTROL_TOWER_PUBLIC_KPI_V1 -->';
const SCHEMA='HH_CONTROL_DISPATCH_METRICS_V1';
const validCount=(value,key)=>{
  if(!Number.isSafeInteger(value)||value<0)throw Error('INVALID_MONITOR_COUNT:'+key);
  return value;
};
function cleanBlocked(input){
  if(!input||typeof input!=='object'||Array.isArray(input))
    throw Error('INVALID_MONITOR_BLOCKERS');
  const result={};
  for(const [reason,value] of Object.entries(input)){
    if(!/^[A-Z][A-Z0-9_]{0,79}$/.test(reason))continue;
    result[reason]=validCount(value,'blocked.'+reason);
  }
  return result;
}
function buildMonitorSnapshot(report,context){
  if(report?.schema!=='HH_CONTROL_DISPATCH_V1'||report.dryRun!==false||
     !Number.isFinite(Date.parse(report.checkedAt||''))||
     !Number.isSafeInteger(context?.runId)||context.runId<1||
     !context.repo)throw Error('INVALID_MONITOR_SOURCE');
  if(context.repo?.owner+'/'+context.repo?.repo!==REPO||
     context.ref!=='refs/heads/codex/bootstrap-books')
    throw Error('UNTRUSTED_MONITOR_CONTEXT');
  const blocked=cleanBlocked(report.blocked||{});
  const counts={
    production_prs:validCount(report.production,'production'),
    actionable_prs:validCount(report.actionable,'actionable'),
    candidates:validCount(report.candidates,'candidates'),
    inspected:validCount(report.inspected,'inspected'),
    unknown_owner_locks:validCount(blocked.OWNER_LEASE_UNVERIFIED||0,'unknown_owner_locks'),
    dispatch_requests_accepted:validCount(report.dispatchAccepted,'dispatch_requests_accepted'),
    // Historical compatibility name: ONLY trusted exact-task RUNNER_STARTED receipts.
    worker_dispatches:validCount(report.runnerStartedConfirmed,'runnerStartedConfirmed')
  };
  if(counts.candidates>counts.actionable_prs ||
     counts.inspected>counts.candidates ||
     counts.dispatch_requests_accepted>counts.inspected ||
     counts.worker_dispatches>counts.inspected)
    throw Error('MONITOR_COUNTS_INCONSISTENT');
  const queueStates={
    awaiting_core:validCount(report.ciWakePending||0,'awaiting_core'),
    core_confirmed:validCount(report.ciCoreConfirmed||0,'core_confirmed'),
    core_workflow_queued:validCount(report.ciCoreQueued||0,'core_workflow_queued'),
    core_runner_running:validCount(report.ciCoreRunning||0,'core_runner_running'),
    core_waiting_runner:validCount(report.ciCoreWaitingRunner||0,'core_waiting_runner'),
    wake_undelivered:validCount(report.ciWakeEscalated||0,'wake_undelivered'),
    parent_blocked:validCount(blocked.STACKED_PARENT||0,'parent_blocked'),
    source_proof_missing:validCount(blocked.SOURCE_PROOF_MISSING||0,'source_proof_missing'),
    source_proof_unverified:validCount(blocked.SOURCE_PROOF_UNVERIFIED||0,'source_proof_unverified'),
    conflict_unverified:validCount(blocked.CONFLICT_NOT_VERIFIED||0,'conflict_unverified'),
    already_handled:validCount(blocked.ALREADY_HANDLED||0,'already_handled'),
    manual_conflict_handoffs:validCount(report.manualConflictHandoffs||0,'manual_conflict_handoffs')
  };
  const blockedExamples={};
  for(const [reason,rows] of Object.entries(report.blockerExamples||{})){
    if(!(reason in blocked)||!Array.isArray(rows))continue;
    const safe=rows.slice(0,3).filter(row=>
      Number.isSafeInteger(row.pr_number)&&row.pr_number>0 &&
      /^[a-f0-9]{12}$/i.test(row.head_sha||''))
      .map(row=>({pr_number:row.pr_number,head_sha:row.head_sha}));
    if(safe.length)blockedExamples[reason]=safe;
  }
  const blockedTotal=Object.values(blocked).reduce((sum,n)=>sum+n,0);
  if(!Number.isSafeInteger(blockedTotal))throw Error('INVALID_BLOCKED_TOTAL');
  const deliveryStatus=counts.dispatch_requests_accepted>0
    ? 'DISPATCH_ACCEPTED_RUNNER_NOT_YET_PROVEN'
    : counts.candidates===0?'NO_AUTOMATION_ELIGIBLE_TASKS'
    : blockedTotal>0?'HANDOFF_BLOCKED':'NO_SAFE_DISPATCH';
  return {
    schema:SCHEMA,checked_at:report.checkedAt,run_id:context.runId,
    source_dry_run:false,source_schema:report.schema,
    source_event:String(context.eventName||'unknown').slice(0,40),
    source_commit:/^[a-f0-9]{40}$/i.test(context.sha||'')?context.sha:null,
    delivery_status:deliveryStatus,
    counts,queue_states:queueStates,blocked_reasons:blocked,
    blocked_examples:blockedExamples,
    reason:typeof report.reason==='string'?report.reason.slice(0,100):null
  };
}
function parseExisting(body){
  if(typeof body!=='string'||!body.startsWith(MARKER))
    throw Error('MONITOR_FEED_MARKER_MISSING');
  const match=/``json\s*([\s\S]*?)\s*```/.exec(body);
  if(!match)throw Error('MONITOR_FEED_JSON_MISSING');
  let prior;try{prior=JSON.parse(match[1]);}catch{throw Error('MONITOR_FEED_JSON_INVALID');}
  if(prior?.schema!==SCHEMA||!Number.isFinite(Date.parse(prior.checked_at||''))||
     !Number.isSafeInteger(prior.run_id)||prior.run_id<1)
    throw Error('MONITOR_FEED_UNVERIFIED');
  return prior;
}
function renderSnapshot(snapshot){
  const fence=String.fromCharCode(96).repeat(3);
  return [MARKER,'## Watchdog direct handoff — public snapshot',
    'HTTP dispatch acceptance is NOT execution. worker_dispatches counts only trusted exact-task RUNNER_STARTED receipts observed in this sweep; it is not the number of HTTP requests. Production PR backlog and actionable dispatch candidates are different quantities. Source publication and LIVE require separate proof.',
    '',fence+'json',JSON.stringify(snapshot,null,2),fence,'',
    'Источник: https://github.com/'+REPO+'/actions/runs/'+snapshot.run_id,''].join('\n');
}
async function publishMonitorSnapshot({github,context,report}){
  const next=buildMonitorSnapshot(report,context);
  const {owner,repo}=context.repo;
  const issue=(await github.rest.issues.get({owner,repo,issue_number:ISSUE_NUMBER})).data;
  if(!issue||issue.state!=='open'||issue.pull_request)
    throw Error('MONITOR_FEED_NOT_OPEN_ISSUE');
  const previous=parseExisting(issue.body);
  // A late queue/old workflow must never replace a newer observed snapshot.
  if(Date.parse(previous.checked_at)>=Date.parse(next.checked_at))
    return {status:'OLDER_OR_DUPLICATE_DROPPED',prior_run_id:previous.run_id};
  const body=renderSnapshot(next);
  await github.rest.issues.update({owner,repo,issue_number:ISSUE_NUMBER,body});
  return {status:'PUBLISHED',run_id:next.run_id,checked_at:next.checked_at};
}
module.exports={MARKER,SCHEMA,buildMonitorSnapshot,parseExisting,renderSnapshot,publishMonitorSnapshot};
