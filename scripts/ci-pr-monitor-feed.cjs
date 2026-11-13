'use strict';

// Public, source-attributed KPI receipt. An accepted dispatch is not a started runner,
// and a sampled automation queue is not the entire production PR backlog.
const REPO='andylitvinov-design/books';
const {capture,rows:timestampRows,VERSION:TIMESTAMP_SCHEMA}=require('./ci-pr-timestamp-inventory.cjs');
const {reconcileBlockerProgress}=require('./ci-pr-blocker-progress.cjs');
const {deliver:deliverCiDaytimeSignal,OBS_SCHEMA:CI_OBS_SCHEMA,
  withoutCurrentWatchdog}=require('./ci-pr-ci-daytime-signals.cjs');
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
function verifiedBoundedSample(input,productionCount){
 if(input==null)return null;
 if(input.schema!=='HH_WATCHDOG_VERIFIED_SAMPLE_V1'||
    input.scope!=='BOUNDED_DEEP_INSPECTION'||
    input.production!==productionCount||
    !Number.isFinite(Date.parse(input.checkedAt||'')))
  throw Error('INVALID_VERIFIED_WATCHDOG_SAMPLE');
 const fields=['inspected','mergeConflicts','coreFailures','specialistFailures',
  'specialistPolicyHolds','releaseGateOnly','verifiedSourceFailures',
  'coreFailureUnverified','specialistEvidenceUnverified',
  'sourceRepairQueued','conflictLabelsQueued'];
 const sample={schema:input.schema,scope:input.scope,
  checked_at:input.checkedAt,production_prs:productionCount};
 for(const key of fields){
  const value=validCount(input[key],'watchdog_sample.'+key);
  if(value>productionCount)throw Error('WATCHDOG_SAMPLE_EXCEEDS_INVENTORY');
  sample[key]=value;
 }
 if(fields.slice(1).some(key=>sample[key]>sample.inspected))
  throw Error('WATCHDOG_SAMPLE_EXCEEDS_INSPECTION');
 // Categories can overlap: MAX is a lower bound, never their sum.
 sample.verified_blocked_lower_bound=Math.max(
  sample.mergeConflicts,sample.coreFailures,
  sample.specialistFailures,sample.specialistPolicyHolds);
 // This optional evidence contains no extra API calls and no fixes/merge
 // claims. Reject arbitrary PRs, unknown roots, malformed HEADs and duplicates.
 if(input.blockerCases!==undefined){
  if(!Array.isArray(input.blockerCases)||input.blockerCases.length>32)
   throw Error('INVALID_MONITOR_BLOCKER_CASES');
  const roots=new Set(['MERGE_CONFLICT','CORE_REQUIRED_CHECK_FAILED',
   'SPECIALIST_PRODUCT_FAILURE','SPECIALIST_POLICY_HOLD']);
  const seen=new Set(),cases=[];
  for(const c of input.blockerCases){
   const key=c?.pr_number+':'+c?.root_code;
   if(!Number.isSafeInteger(c?.pr_number)||c.pr_number<1||
      !/^[a-f0-9]{40}$/i.test(c.head_sha||'')||!roots.has(c.root_code)||
      !['FAILURE','TIMEOUT','UNKNOWN'].includes(c.ci_result)||
      c.source_run_id!==undefined &&
       (!Number.isSafeInteger(c.source_run_id)||c.source_run_id<=0)||
      seen.has(key))throw Error('INVALID_MONITOR_BLOCKER_CASES');
   seen.add(key);
   cases.push({pr_number:c.pr_number,head_sha:c.head_sha.toLowerCase(),
     root_code:c.root_code,ci_result:c.ci_result,
     ...(c.source_run_id?{source_run_id:c.source_run_id}:{})});
  }
  sample.blocker_cases=cases;
 }
 return sample;
}
function ciWakeTimingSummary(rows,maxInspected){
 if(!Array.isArray(rows)||rows.length>maxInspected)throw Error('INVALID_CI_WAKE_TIMING_COHORT');
 const seen=new Set(),clean=[];
 const states=new Set(['CI_WAKE_UNDELIVERED','CI_CORE_CONFIRMED','WAKE_OUTCOME_NOT_YET_OBSERVED',
   'CLAIMED_NO_WAKE_RECEIPT','RESERVED_NO_CLAIM_RECEIPT']);
 const fields=['reserved_to_claim','claim_to_wake','wake_to_outcome','wake_pending_age'];
 for(const row of rows){
  if(!row||!Number.isSafeInteger(row.pr_number)||row.pr_number<1||
     !/^[a-f0-9]{12}$/i.test(row.head_sha||'')||
     !/^[a-f0-9]{32}$/i.test(row.task_key||'')||
     row.source!=='BOT_SIGNED_EXACT_TASK_RECEIPTS'||!states.has(row.state)||
     !row.duration_seconds||seen.has(row.pr_number))throw Error('UNTRUSTED_CI_WAKE_TIMING');
  seen.add(row.pr_number);
  const durations={};
  for(const field of fields){
   const value=row.duration_seconds[field];
   if(value!=null&&(!Number.isSafeInteger(value)||value<0||value>30*86400))
    throw Error('INVALID_CI_WAKE_DURATION:'+field);
   durations[field]=value??null;
  }
  clean.push({pr_number:row.pr_number,head_sha:row.head_sha,task_key:row.task_key,
   state:row.state,source:row.source,reserved_at:row.reserved_at||null,
   claimed_at:row.claimed_at||null,wake_requested_at:row.wake_requested_at||null,
   outcome_at:row.outcome_at||null,observed_at:row.observed_at,
   duration_seconds:durations});
 }
 const aggregate=field=>{
  const list=clean.map(r=>r.duration_seconds[field]).filter(Number.isSafeInteger).sort((a,b)=>a-b);
  const n=list.length, percentile=p=>n?list[Math.ceil(n*p)-1]:null;
  return {n,mean_seconds:n?Math.round(list.reduce((a,b)=>a+b,0)/n):null,
   p50_seconds:percentile(.5),p95_seconds:percentile(.95),
   coverage_of_inspected_ci_tasks:clean.length?Math.round(100*n/clean.length):null};
 };
 return {scope:'INSPECTED_CI_TASKS_ONLY_NOT_ALL_OPEN_PRS',
  observed_tasks:clean.length,example_records:clean.slice(0,3),
  omitted_examples:Math.max(0,clean.length-3),
  reserved_to_claim:aggregate('reserved_to_claim'),
  claim_to_wake:aggregate('claim_to_wake'),
  wake_to_outcome:aggregate('wake_to_outcome'),
  wake_pending_age:aggregate('wake_pending_age')};
}

// This is previously observed schedule history, never proof inferred from a
// fresh workflow_dispatch or pull_request_target callback.
function nativeCronEvidence(source,at){
 if(source?.health==='NOT_PROBED'||!source||
    typeof source.health!=='string'||typeof source.lastSeen!=='string')return null;
 const statuses=source.health.split(' | '),seen=source.lastSeen.split(' | ');
 const labels=['watchdog','ci','repair','hourly'];
 if(statuses.length!==4||seen.length!==4)return null;
 const out={},dates={};
 for(let i=0;i<4;i++){
  const prefix=labels[i]+':';
  if(!statuses[i].startsWith(prefix)||!seen[i].startsWith(prefix))return null;
  out[labels[i]]=statuses[i].slice(prefix.length);
  dates[labels[i]]=seen[i].slice(prefix.length);
 }
 const allowed=new Set(['HEALTHY','STALE','UNOBSERVED','UNKNOWN']);
 if(!allowed.has(out.watchdog)||!allowed.has(out.ci)||!allowed.has(out.hourly)||
    out.repair!=='DISPATCH_ONLY'||dates.repair!=='NOT_SCHEDULED')return null;
 const last=key=>{
  const value=dates[key],seenAt=Date.parse(value),cutoff=Date.parse(at);
  return Number.isFinite(seenAt)&&Number.isFinite(cutoff)&&
    seenAt<=cutoff+60000&&seenAt>=cutoff-365*86400000&&
    value.startsWith('20')&&value.includes('T')?value:null;
 };
 return {observed_at:at,watchdog:out.watchdog,ci:out.ci,
   watchdog_last:last('watchdog'),ci_last:last('ci')};
}
function buildMonitorSnapshot(report,context,watchdogLiveness=null){
  if(report?.schema!=='HH_CONTROL_DISPATCH_V1'||report.dryRun!==false||
     !Number.isFinite(Date.parse(report.checkedAt||''))||
     !Number.isSafeInteger(context?.runId)||context.runId<1||
     !context.repo)throw Error('INVALID_MONITOR_SOURCE');
  if(context.repo?.owner+'/'+context.repo?.repo!==REPO||
     context.ref!=='refs/heads/codex/bootstrap-books')
    throw Error('UNTRUSTED_MONITOR_CONTEXT');
  const blocked=cleanBlocked(report.blocked||{});
  const counts={
    discovered_open_prs:validCount(report.discovered??report.production,'discovered'),
    production_prs:validCount(report.production,'production'),
    actionable_prs:validCount(report.actionable,'actionable'),
    nonmanual_routed_prs:validCount(report.nonmanualRouted??report.actionable,
      'nonmanualRouted'),
    legacy_preflight_eligible_prs:validCount(report.legacyPrepEligible??0,
      'legacyPrepEligible'),
    candidates:validCount(report.candidates,'candidates'),
    inspected:validCount(report.inspected,'inspected'),
    unknown_owner_locks:validCount(blocked.OWNER_LEASE_UNVERIFIED||0,'unknown_owner_locks'),
    dispatch_requests_accepted:validCount(report.dispatchAccepted,'dispatch_requests_accepted'),
    // Historical compatibility name: ONLY recently started (<=15m) signed
    // exact-task RUNNER_STARTED receipts, never stale historical executions.
    worker_dispatches:validCount(report.runnerStartedConfirmed,'runnerStartedConfirmed')
  };
  if((report.nonmanualRouted!==undefined||report.legacyPrepEligible!==undefined)&&
     counts.nonmanual_routed_prs+counts.legacy_preflight_eligible_prs!==counts.actionable_prs)
    throw Error('ROUTABLE_POPULATIONS_INCONSISTENT');
  if(counts.candidates>counts.actionable_prs ||
     counts.inspected>counts.candidates ||
     counts.dispatch_requests_accepted>counts.inspected ||
     counts.worker_dispatches>counts.inspected)
    throw Error('MONITOR_COUNTS_INCONSISTENT');
  const ciWakeHandoff=ciWakeTimingSummary(report.ciWakeTelemetry||[],counts.inspected);
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
    ci_wake_manual_hold_unverified:validCount(blocked.CI_WAKE_MANUAL_HOLD_UNVERIFIED||0,'ci_wake_manual_hold_unverified'),
    ci_hold_recovered:validCount(report.ciHoldRecovered||0,'ci_hold_recovered'),
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
  // Label hints come from the SAME fetched PR list. They are not independently
  // verified failures or evidence authorizing any source write/merge.
  const hintKeys=['draft','hold','blocked','manual_repair','claimed',
    'specialist','gate_review','conflict','source','ci','labeled_unique'];
  const rawHints=report.backlogLabelHints;
  if(rawHints!==undefined&&(!rawHints||typeof rawHints!=='object'||Array.isArray(rawHints)))
    throw Error('INVALID_BACKLOG_LABEL_HINTS');
  const labelHints=rawHints===undefined?null:Object.fromEntries(hintKeys.map(key=>
    [key,validCount(rawHints[key]??0,'backlog_label_hints.'+key)]));
  if(labelHints&&labelHints.labeled_unique>counts.production_prs)
    throw Error('BACKLOG_LABEL_HINTS_EXCEED_INVENTORY');
  counts.labeled_outstanding_prs=labelHints?.labeled_unique??0;
  const watchdogSample=verifiedBoundedSample(report.watchdogSample,counts.production_prs);
  counts.verified_blocked_lower_bound=watchdogSample?.verified_blocked_lower_bound??0;
  const watchdogSampleStatus=watchdogSample?'VERIFIED_BOUNDED_SAMPLE':
    report.watchdogSampleStatus==='UNVERIFIED'?'UNVERIFIED':'NOT_PROVIDED';
  // The controlled quota counter is a LOWER BOUND on this run's REST use.
  // It must not be mislabeled as the combined user-hour API consumption.
  const apiBudget={
    tracked_requests:validCount(report.apiRequests??0,'apiRequests'),
    remaining_observed:report.apiRemaining==null?null:
      validCount(report.apiRemaining,'apiRemaining'),
    paused:typeof report.apiPauseReason==='string'||/^API_PAUSED/.test(report.reason||''),
    pause_reason:typeof report.apiPauseReason==='string'?
      report.apiPauseReason.slice(0,100):null,
    retry_at:Number.isFinite(Date.parse(report.apiRetryAt||''))?report.apiRetryAt:null
  };
  const blockedTotal=Object.values(blocked).reduce((sum,n)=>sum+n,0);
  if(!Number.isSafeInteger(blockedTotal))throw Error('INVALID_BLOCKED_TOTAL');
  // Public UI must never render zero blockers when a sampled handoff was denied.
  counts.total_blockers=validCount(blockedTotal,'total_blockers');
  const deliveryStatus=apiBudget.paused
    ? 'API_PAUSED_SNAPSHOT_INCOMPLETE'
    : counts.dispatch_requests_accepted>0
    ? 'DISPATCH_ACCEPTED_RUNNER_NOT_YET_PROVEN'
    : counts.candidates===0 && report.inventoryScope==='EVENT_SINGLE_PR'
    ? 'EVENT_PR_NOT_ACTIONABLE'
    : counts.candidates===0 && watchdogSample &&
      watchdogSample.inspected===0 && counts.production_prs>0
    ? 'WATCHDOG_DEEP_INSPECTION_INCOMPLETE'
    : counts.candidates===0 && counts.verified_blocked_lower_bound>0
    ? 'VERIFIED_BLOCKED_WORK_NO_AUTO_SOURCE_REPAIR'
    : counts.candidates===0 && counts.labeled_outstanding_prs>0
    ? 'OUTSTANDING_LABELED_WORK_NO_AUTO_DISPATCH'
    : counts.candidates===0 && counts.production_prs>0
    ? 'OPEN_PR_BACKLOG_NOT_FULLY_TRIAGED'
    : counts.candidates===0?'NO_AUTOMATION_ELIGIBLE_TASKS'
    : blockedTotal>0?'HANDOFF_BLOCKED':'NO_SAFE_DISPATCH';
  return {
    schema:SCHEMA,checked_at:report.checkedAt,run_id:context.runId,
    source_dry_run:false,source_schema:report.schema,
    source_event:String(context.eventName||'unknown').slice(0,40),
    source_commit:/^[a-f0-9]{40}$/i.test(context.sha||'')?context.sha:null,
    delivery_status:deliveryStatus,
    counts,queue_states:queueStates,backlog_label_hints:labelHints,
    watchdog_sample_status:watchdogSampleStatus,watchdog_sample:watchdogSample,
    api_budget:apiBudget,ci_wake_handoff:ciWakeHandoff,
    native_cron:nativeCronEvidence(watchdogLiveness,report.checkedAt),
    blocked_reasons:blocked,
    blocked_examples:blockedExamples,
    reason:typeof report.reason==='string'?report.reason.slice(0,100):null
  };
}
function parseExisting(body){
  if(typeof body!=='string'||!body.startsWith(MARKER))
    throw Error('MONITOR_FEED_MARKER_MISSING');
  const match=/\x60{3}json\s*([\s\S]*?)\s*\x60{3}/.exec(body);
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
    'CI wake timing comes from authenticated exact-task receipt timestamps in the bounded inspected CI sample, not a global PR cohort. Missing duration is null, not zero; a wake receipt does not prove Core runner execution.',
    'HTTP dispatch acceptance is NOT execution. worker_dispatches counts only trusted exact-task RUNNER_STARTED receipts started within the preceding 15 minutes and observed in the sampled sweep; it is not HTTP dispatch acceptance nor historical all-time starts. NO_ACTIONABLE_PR only means no eligible automated dispatch, NOT no blocked PRs. watchdog_sample is bounded deep-inspection evidence with overlapping categories; verified_blocked_lower_bound uses MAX, never SUM. blocker_progress tracks only exact-HEAD Watchdog cases sampled on prior verified sweeps: uninspected is NOT resolved, head change is NOT a fix, CI failure is NOT all required checks, absent LIVE proof is never success. backlog_label_hints are overlapping label-only evidence, NOT verified root causes. api_budget.tracked_requests covers instrumented calls in this run, NOT total user-hour requests. Source publication and LIVE require separate proof.',
    // Compact serialization preserves all exact PR timestamps within the existing
    // 58k public issue body budget; pretty JSON previously evicted the census.
    '',fence+'json',JSON.stringify(snapshot),fence,'',
    'Сравнение трёх 24-часовых когорт PR (исторические этапы, coverage, медиана, P90 и GitHub timelines): https://github.com/'+REPO+'/issues/3394', '',
    'Источник: https://github.com/'+REPO+'/actions/runs/'+snapshot.run_id,''].join('\n');
}
async function publishMonitorSnapshot({github,context,report,inventorySnapshot=null,watchdogLiveness=null,ciActivity=null}){
  const next=buildMonitorSnapshot(report,context,watchdogLiveness);
  const {owner,repo}=context.repo;
  const issue=(await github.rest.issues.get({owner,repo,issue_number:ISSUE_NUMBER})).data;
  if(!issue||issue.state!=='open'||issue.pull_request)
    throw Error('MONITOR_FEED_NOT_OPEN_ISSUE');
  const previous=parseExisting(issue.body);
  // Event-only reports lack schedule history; retain the previous observation
  // with its original timestamp, never upgrade a stale cron to healthy.
  if(!next.native_cron&&previous.native_cron)next.native_cron=previous.native_cron;
  // A late queue/old workflow must never replace a newer observed snapshot.
  if(Date.parse(previous.checked_at)>=Date.parse(next.checked_at))
    return {status:'OLDER_OR_DUPLICATE_DROPPED',prior_run_id:previous.run_id};
  // This routine shares the EXISTING Control Tower issue read and writer lease.
  // It may issue one @mention only for a newly confirmed daytime crossing.
  // Failure is retryable and cannot disable the existing KPI publication.
  const signal=await deliverCiDaytimeSignal({github,issue,
    prior:previous.ci_daytime_signals||null,observation:ciActivity});
  if(signal.state)next.ci_daytime_signals=signal.state;
  else if(previous.ci_daytime_signals)
    next.ci_daytime_signals=previous.ci_daytime_signals;
  // Reuse the ALREADY-FETCHED full Watchdog PR list. This does not query GitHub
  // again, trigger a CI run or post any per-PR comments.
  const prior=previous.pr_timestamp_inventory;
  const priorValid=prior?.schema===TIMESTAMP_SCHEMA&&
    timestampRows(prior).size===prior.total;
  if(inventorySnapshot!==null){
    if(report.inventoryScope!=='WATCHDOG_SHARED_SNAPSHOT'||
       report.discovered!==inventorySnapshot.length||
       report.production>inventorySnapshot.length)
      throw Error('TIMESTAMP_NOT_FULL_WATCHDOG_INVENTORY');
    if(priorValid&&Date.parse(prior.observed_at)>=Date.parse(report.checkedAt)){
      // A delayed scheduled run cannot rewind a newer verified push scan.
      next.pr_timestamp_inventory=prior;
      next.pr_timestamp_status='PRESERVED_NEWER_FULL_SCAN';
    }else{
      next.pr_timestamp_inventory=capture({prs:inventorySnapshot,
        observedAt:report.checkedAt,previous:priorValid?prior:null,
        productionExpected:report.production,totalExpected:report.discovered});
      next.pr_timestamp_status='FRESH_ALL_OPEN_PR_OBSERVATIONS';
    }
  }else if(priorValid){
    next.pr_timestamp_inventory=prior;
    next.pr_timestamp_status='PRESERVED_PRIOR_FULL_SCAN';
  }else next.pr_timestamp_status='NO_FULL_PR_TIMESTAMP_SNAPSHOT';
  // Persist and compare bounded root×PR×HEAD evidence in this SAME
  // single-writer monitor issue. Reuse the already-fetched PR inventory.
  // An absent case in a later partial sample must never mean "fixed".
  next.blocker_progress=reconcileBlockerProgress({
    previous:previous.blocker_progress,watchdogSample:next.watchdog_sample,
    inventorySnapshot,observedAt:next.checked_at});
  // Blocker cases are already represented in the canonical progress ledger;
  // do not store the raw duplicate and risk evicting full PR timestamps.
  if(next.watchdog_sample)delete next.watchdog_sample.blocker_cases;
  let body=renderSnapshot(next);
  // Keep this existing public issue below GitHub's body size budget. Never
  // silently publish truncated PR coverage as a complete inventory.
  if(body.length>58000){
    delete next.pr_timestamp_inventory;
    next.pr_timestamp_status='INVENTORY_EXCEEDS_SAFE_ISSUE_BODY_SIZE';
    body=renderSnapshot(next);
  }
  await github.rest.issues.update({owner,repo,issue_number:ISSUE_NUMBER,body});
  return {status:'PUBLISHED',run_id:next.run_id,checked_at:next.checked_at};
}

// Opportunistic signal fallback inside already-running event jobs. GitHub's
// 10-minute scheduled workflows are sometimes delayed for hours: real PR/Worker
// events already hold the identical single-writer concurrency lease, so they
// can bridge this gap without creating another runner, cron or polling service.
// Never advance checked_at/run_id of the KPI snapshot: those are independent
// Watchdog / Control Tower evidence.
async function publishCiSignalOnly({github,context,nowMs=Date.now(),minGapMs=9*60*1000}){
  if(context?.repo?.owner+'/'+context?.repo?.repo!==REPO||
     context?.ref!=='refs/heads/codex/bootstrap-books'||
     !['pull_request_target','workflow_run','workflow_dispatch'].includes(context?.eventName)||
     !Number.isSafeInteger(context?.runId)||context.runId<1||
     !Number.isFinite(nowMs)||minGapMs<8*60*1000)
    return {status:'UNTRUSTED_OR_TOO_FREQUENT_EVENT'};
  const {owner,repo}=context.repo;
  const issue=(await github.rest.issues.get({owner,repo,issue_number:ISSUE_NUMBER})).data;
  if(!issue||issue.state!=='open'||issue.pull_request)
    return {status:'MONITOR_ISSUE_UNAVAILABLE'};
  const existing=parseExisting(issue.body);
  const previous=existing.ci_daytime_signals||null;
  const last=Date.parse(previous?.last_seen_at||'');
  // Skip both freshly observed and future-dated snapshots: no extra CI reads
  // or repeated Owner mentions when many PR events arrive together.
  if(Number.isFinite(last)&&nowMs-last<minGapMs)
    return {status:'FRESH_SIGNAL_ALREADY_OBSERVED',last_seen_at:previous.last_seen_at};
  let active,queued;
  try{
    [active,queued]=await Promise.all(['in_progress','queued'].map(status=>
      github.rest.actions.listWorkflowRunsForRepo({
        owner,repo,status,per_page:status==='in_progress'?12:1
      })));
  }catch{return {status:'CI_API_UNAVAILABLE'};}
  const a=active?.data,q=queued?.data;
  if(!Number.isSafeInteger(a?.total_count)||a.total_count<0||
     !Number.isSafeInteger(q?.total_count)||q.total_count<0||
     !Array.isArray(a.workflow_runs)||!Array.isArray(q.workflow_runs))
    return {status:'CI_COUNT_UNVERIFIED'};
  const adjusted=withoutCurrentWatchdog(a.total_count,a.workflow_runs,context.runId);
  if(!Number.isSafeInteger(adjusted.running)||adjusted.running<0)
    return {status:'CI_SELF_EXCLUSION_UNVERIFIED'};
  const observation={schema:CI_OBS_SCHEMA,observed_at:new Date(nowMs).toISOString(),
    running:adjusted.running,queued:q.total_count};
  const result=await deliverCiDaytimeSignal({
    github,issue,prior:previous,observation,nowMs
  });
  if(!result.state||result.status==='INVALID_PREVIOUS'||
     result.status==='DELIVERY_UNVERIFIED_RETRYABLE'||
     result.status==='UNVERIFIED_ISSUE_COMMENTS')
    return {status:result.status||'CI_SIGNAL_NOT_RECORDED'};
  if(result.status==='OLDER_OR_DUPLICATE'||result.status==='UNKNOWN_OR_STALE')
    return {status:result.status};
  const next={...existing,ci_daytime_signals:result.state};
  const body=renderSnapshot(next);
  // Retain the full original Control Tower census. A dedicated signal writer
  // must never delete or replace its authenticated PR timestamp inventory.
  if(body.length>58000)return {status:'SIGNAL_BODY_OVER_SAFE_BUDGET'};
  await github.rest.issues.update({owner,repo,issue_number:ISSUE_NUMBER,body});
  return {status:result.status,observed_at:observation.observed_at,
    running:adjusted.running,queued:q.total_count,
    watchdog_excluded:adjusted.excluded,
    signal_level:result.alert?.level||null};
}

// A trusted control-code push already runs the Watchdog in inspection-only mode.
// Reuse its verified, already-fetched FULL list to seed first-observed times
// immediately, even when GitHub's scheduled Watchdog delivery is delayed.
// Do NOT update the KPI checked_at/run_id with a dry-run or claim fresh CI.
async function publishTimestampInventoryOnly({github,context,watchdog}){
 if(context?.repo?.owner+'/'+context?.repo?.repo!==REPO||
    context.ref!=='refs/heads/codex/bootstrap-books'||
    context.eventName!=='push'||watchdog?.dryRun!==true||
    watchdog.inventoryComplete!==true||
    watchdog.inventoryScope!=='ALL_OPEN_PRS'||
    watchdog.apiRateLimited===true||
    !Array.isArray(watchdog.prInventorySnapshot)||
    watchdog.open!==watchdog.prInventorySnapshot.length)
   return {status:'NOT_TRUSTED_FULL_INSPECTION'};
 const {owner,repo}=context.repo;
 const issue=(await github.rest.issues.get({owner,repo,issue_number:ISSUE_NUMBER})).data;
 if(!issue||issue.state!=='open'||issue.pull_request)
   throw Error('MONITOR_FEED_NOT_OPEN_ISSUE');
 const previous=parseExisting(issue.body);
 const existing=previous.pr_timestamp_inventory;
 if(existing?.schema===TIMESTAMP_SCHEMA &&
    timestampRows(existing).size===existing.total &&
    Date.parse(existing.observed_at)>=Date.parse(watchdog.checkedAt))
   return {status:'ALREADY_FRESHER',observed_at:existing.observed_at};
 const record=capture({prs:watchdog.prInventorySnapshot,
   observedAt:watchdog.checkedAt,
   previous:existing?.schema===TIMESTAMP_SCHEMA&&
     timestampRows(existing).size===existing.total?existing:null,
   productionExpected:watchdog.production,totalExpected:watchdog.open});
 const next={...previous,pr_timestamp_inventory:record,
   pr_timestamp_status:'FRESH_ALL_OPEN_PR_OBSERVATIONS'};
 const body=renderSnapshot(next);
 if(body.length>58000)throw Error('TIMESTAMP_BODY_EXCEEDS_SAFE_LIMIT');
 await github.rest.issues.update({owner,repo,issue_number:ISSUE_NUMBER,body});
 return {status:'PUBLISHED_PR_TIMESTAMPS',observed_at:record.observed_at,
   open:record.total,production:record.production};
}
module.exports={MARKER,SCHEMA,buildMonitorSnapshot,ciWakeTimingSummary,
 parseExisting,renderSnapshot,
 publishMonitorSnapshot,publishTimestampInventoryOnly,publishCiSignalOnly,nativeCronEvidence};

