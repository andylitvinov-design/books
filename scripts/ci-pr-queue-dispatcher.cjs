'use strict';
/** Trusted default-branch single-writer queue dispatcher: no source checkout, no merge. */
const {REPO,PROD,DEFAULT,SHA,laneOf,validPR,validLegacyPrep,taskFor,reservation,commentBody,reservationStatus,parseRecords,readCompleteIssueComments,trustedControlComment,DEFINITIVE_DISPATCH_DENIAL}=require('./ci-pr-task-state.cjs');
const {latestErrorTaskId,dispatchAcceptance,dispatchAcceptanceBody,
 REPAIR_EXECUTOR,CI_EXECUTOR}=require('./ci-pr-error-task.cjs');
const {priorityFor,rankedCandidates}=require('./ci-pr-priority.cjs');
const {run:reconcileLegacyCiDenial}=require('./ci-pr-ci-legacy-recovery.cjs');
const {WORKFLOWS,admission,snapshot,verifiedGhostRepairCapacity,
 verifiedStaleMergedRepairCapacity,GHOST_REPAIR_MODE,STALE_MERGED_REPAIR_MODE}
 =require('./ci-pr-capacity.cjs');
const {repairMode,safeFiles,hasVerifiedSourceHandoff,verifiedCoreCodeFailure}=require('./ci-pr-repair-worker.cjs');
const {safeSourcePath: safeFreeSourcePath,
 assessCompleteFreeRepairScope}=require('./ci-pr-repair-free-agent.cjs');
const {verifiedRunnerReceipt,recentlyStartedRunner}=require('./ci-pr-runner-evidence.cjs');
const {reconcileCiWake,recoverVerifiedCiManualHold}=require('./ci-pr-ci-wake-reconcile.cjs');
const {classifyIndependentSpecialistChecks,latestByName}=require('./ci-pr-ten-minute-watchdog.cjs');
const {PATHS:QUALITY_EVENT_PATHS,isTrustedQualityFailureEvent,qualityEventMatchesPR}=require('./ci-pr-quality-event.cjs');
const WORKER_PATH={repair:'hh-pr-repair-worker.yml',legacy:'hh-pr-repair-worker.yml',
 conflict:'hh-pr-repair-worker.yml',ci:'hh-pr-ci-worker.yml'};
const MAX_DISPATCH=2, MAX_MANUAL_CONFLICT_HANDOFFS=2, MAX_INSPECT=16, MAX_CONFLICT_ONLY_INSPECT=6, MAX_API=55, MIN_RATE=250;
// Only after a terminally handled hourly candidate: bounded alternative PR
// checks, not additional worker executions or source authorisations.
const MAX_LEGACY_BACKUPS=4, MAX_LEGACY_HOURLY_HISTORY=20;
const RELEVANT=new Set(['HH PR 10-minute watchdog','HH PR source Repair Worker','HH zero-cost PR CI worker','HH PR core release gate',...Object.keys(QUALITY_EVENT_PATHS)]);
function validOwnerRepairTarget(context,target){
 return !!(target&&typeof target==='object'&&!Array.isArray(target)&&
  context?.repo?.owner==='andylitvinov-design'&&context.repo.repo==='books'&&
  context.eventName==='workflow_dispatch'&&
  context.ref==='refs/heads/codex/bootstrap-books'&&
  context.actor==='andylitvinov-design'&&
  Number.isSafeInteger(target.prNumber)&&target.prNumber>0&&target.prNumber<=99999999&&
  SHA.test(target.expectedSha||'')&&
  Object.keys(target).every(key=>key==='prNumber'||key==='expectedSha'));
}
function verifiedSourceGreen(checks){
 if(!checks||!Array.isArray(checks.check_runs)||
    !Number.isSafeInteger(checks.total_count)||
    checks.check_runs.length!==checks.total_count)return false;
 const latest=latestByName(checks.check_runs);
 const green=c=>c?.app?.id===15368&&c.status==='completed'&&c.conclusion==='success';
 const build=latest.get('core-lint-types-build'),scope=latest.get('classify-change');
 if(build&&build.conclusion!=='success')return false;
 return green(latest.get('hh-core-verified'))||
   (green(build)&&latest.get('hh-merge-check')?.app?.id===15368&&
    (!scope||green(scope)));
}
function verifiedSpecialistProductFailure(checks){
 if(classifyIndependentSpecialistChecks(checks)!=='PRODUCT_FAILURE'||
    !verifiedSourceGreen(checks))return false;
 const specialist=latestByName(checks.check_runs).get('hh-specialist');
 return specialist?.app?.id===15368&&specialist.status==='completed'&&
   specialist.conclusion==='failure';
}
// Red aggregate gates with green source and no failed independent QA are
// policy/stale-base blockers, not a source-writing authorization.
function verifiedAggregatePolicyHold(checks){
 const decision=classifyIndependentSpecialistChecks(checks);
 if(!['POLICY_OR_SKIPPED','SPECIALIST_CONTRACT_FAILED'].includes(decision)||
    !verifiedSourceGreen(checks))return false;
 const latest=latestByName(checks.check_runs);
 const specialist=latest.get('hh-specialist'),merge=latest.get('hh-merge-check');
 if(specialist?.app?.id!==15368||specialist.status!=='completed'||
    specialist.conclusion!=='failure'||merge?.app?.id!==15368||
    merge.status!=='completed'||merge.conclusion!=='failure')return false;
 const inherited=new Set(['hh-specialist','hh-merge-check','hh-specialists-verified',
   'release-ready','hh-core-verified','classify-change','core-lint-types-build']);
 const trustedPolicyJobs=new Set(['guard-unit','actionlint-changed']);
 return ![...latest.values()].some(c=>!inherited.has(c.name)&&
   ['failure','timed_out','startup_failure','cancelled','action_required'].includes(c.conclusion)&&
   !(trustedPolicyJobs.has(c.name)&&c.app?.id===15368&&
     c.status==='completed'&&c.conclusion==='failure'));

}
function trustedContext(context){
 if(context.repo?.owner+'/'+context.repo?.repo!==REPO)return false;
 if(context.eventName==='pull_request_target'){
  const pr=context.payload?.pull_request;
  return context.ref==='refs/heads/'+DEFAULT &&
   ['opened','reopened','synchronize','ready_for_review'].includes(context.payload?.action) &&
   Number.isSafeInteger(pr?.number)&&pr.number>0&&!pr.draft &&
   pr.base?.ref===PROD&&pr.head?.repo?.full_name===REPO&&
   SHA.test(pr.head?.sha||'');
 }
 if(context.ref!=='refs/heads/'+DEFAULT)return false;
 if(context.eventName==='workflow_run'){
  const w=context.payload?.workflow_run;
  const verifiedCoreFailure=w?.name==='HH PR core release gate' &&
    w.event==='pull_request' &&
    ['failure','timed_out','startup_failure'].includes(w.conclusion);
  const verifiedQualityFailure=isTrustedQualityFailureEvent(context);
  const trustedWorker=w?.name!=='HH PR core release gate' &&
    ['workflow_dispatch','schedule'].includes(w?.event);
  return !!(w&&RELEVANT.has(w.name)&&w.status==='completed'&&
    (verifiedCoreFailure||verifiedQualityFailure||trustedWorker)&&
    w.repository?.full_name===REPO&&
    (!w.head_repository?.full_name||w.head_repository.full_name===REPO));
 }
 return ['schedule','push','workflow_dispatch'].includes(context.eventName);
}
/**
 * A completed PUSH of the trusted Repair/CI workflow is audit-only, so it
 * must not occupy the 2-minute post-worker cooldown. Unknown/active runs
 * still fail closed. Successful real worker completions get a short
 * propagation grace; failed attempts keep the longer backoff.
 */
function workerBusyOrCooling(runs,now,lane=null){
 if(!Array.isArray(runs))return true;
 return runs.some(r=>{
  if(!r||typeof r!=='object')return true;
  // A schedule/push CI backstop is read-only, with a different workflow lease.
  // Only addressed CI workers can claim task capacity or delay the next claim.
  if(lane==='ci'&&['schedule','push'].includes(r.event))return false;
  if(['in_progress','queued','requested','waiting','pending'].includes(r.status))return true;
  if(r.status!=='completed')return true;
  if(r.event==='push')return false;
  if(!['workflow_dispatch','schedule'].includes(r.event)||!r.conclusion)return true;
  const completed=Date.parse(r.updated_at||r.created_at||'');
  if(!Number.isFinite(completed)||completed>now)return true;
  const cooldown=r.conclusion==='success'?30_000:120_000;
  return now-completed<cooldown;
 });
}
function planCandidates(prs,now){
 const available=prs.filter(pr=>(validPR(pr)||validLegacyPrep(pr))&&laneOf(pr));
 const ranked=rankedCandidates(available,now);
 if(!ranked.length)return [];
 // Source and manual conflict have separate resources. Inspect more than the
 // first source before handing that worker to an owner-only conflict. One
 // out of six ten-minute turns gives conflict triage first refusal so an
 // indefinitely nonempty source queue cannot starve it.
 const fairnessTurn=Math.floor(now/600000)%6===5;
 const source=ranked.filter(pr=>laneOf(pr)==='repair');
 const conflict=ranked.find(pr=>laneOf(pr)==='conflict');
 const ci=ranked.find(pr=>laneOf(pr)==='ci');
 // Legacy PREPARED is signed read-only metadata, not source repair.
 // Previous 4-candidate/10-minute rotation launched many no-source workers
 // per hour even with no free code executor; these compete with real Core.
 // Inspect ONE stable legacy candidate during each UTC hour, regardless of
 // scheduler jitter. A signed terminal task receipt suppresses repeat work
 // for that exact source HEAD; the next hour rotates to a different old PR.
 // No extra cron, slot, workflow or source writing authority is created.
 const legacy=ranked.filter(pr=>laneOf(pr)==='legacy')
  .sort((a,b)=>a.number-b.number);
 const legacyStart=legacy.length?Math.floor(now/3600000)%legacy.length:0;
 const oldCandidates=Number.isFinite(now)&&now>=0&&legacy.length?
  [legacy[legacyStart]]:[];
 // GitHub PR list does not include mergeability. A historical manual label
 // can hide a verified DIRTY conflict until an exact-HEAD live PR read.
 // Sample at most two rotating manual-conflict hints (read-only) each turn.
 const manualConflictHints=legacy.filter(pr=>
  (pr.labels||[]).some(label=>label.name==='hh:conflict-repair-needed'));
 const manualConflictProbes=slots=>{
  const pool=manualConflictHints.filter(pr=>
   !oldCandidates.some(old=>old.number===pr.number));
  const count=Math.min(2,Math.max(0,slots),pool.length);
  const start=pool.length?(Math.floor(now/600000)*Math.max(1,count))%pool.length:0;
  return Array.from({length:count},(_,i)=>pool[(start+i)%pool.length]);
 };
 // During conflict-only backlogs, rotate a bounded window rather than reread
 // the same 16 already handed-off exact HEADs on each ten-minute cycle.
 if(!source.length&&!ci){
  const conflicts=ranked.filter(pr=>laneOf(pr)==='conflict');
  const room=Math.min(MAX_CONFLICT_ONLY_INSPECT,conflicts.length);
  // Always inspect the most important P1/R01 first; rotate the rest so
  // lower-priority conflicts are never permanently excluded. A handoff is
  // only a receipt: the code-writing Chat/Codex lane owns the actual repair.
  const fast=conflicts.slice(0,Math.min(2,room));
  const probes=manualConflictProbes(MAX_CONFLICT_ONLY_INSPECT-fast.length-oldCandidates.length);
  const tail=conflicts.slice(fast.length);
  const rotating=Math.max(0,Math.min(tail.length,
   MAX_CONFLICT_ONLY_INSPECT-fast.length-oldCandidates.length-probes.length));
  const offset=tail.length?(Math.floor(now/600000)*Math.max(1,rotating))%tail.length:0;
  const hintNumbers=new Set(probes.map(pr=>pr.number));
  return [...fast,...oldCandidates,...probes,
   ...Array.from({length:rotating},(_,i)=>tail[(offset+i)%tail.length])]
   .slice(0,MAX_CONFLICT_ONLY_INSPECT)
   .map(pr=>{
    const task=taskFor(pr,priorityFor(pr,now));
    return task&&hintNumbers.has(pr.number)?
     {...task,manual_conflict_probe:true}:task;
   });
 }
 const picked=[],chosen=new Set();
 const add=pr=>{if(pr&&!chosen.has(pr.number)&&picked.length<MAX_INSPECT){picked.push(pr);chosen.add(pr.number);}};
 if(fairnessTurn)add(conflict);
 add(source[0]);add(ci);
 for(const old of oldCandidates)add(old);
 // Keep priority among the first three sources and rotate the remainder.
 for(const pr of source.slice(1,3))if(picked.length<MAX_INSPECT-(conflict&&!chosen.has(conflict.number)?1:0))add(pr);
 // Preserve source/CI priority and a real-conflict slot before manual probes.
 const probes=manualConflictProbes(MAX_INSPECT-picked.length-
  (conflict&&!chosen.has(conflict.number)?1:0));
 for(const pr of probes)add(pr);
 const sourceRoom=Math.max(0,MAX_INSPECT-picked.length-(conflict&&!chosen.has(conflict.number)?1:0));
 const tail=source.filter(pr=>!chosen.has(pr.number));
 const offset=tail.length?(Math.floor(now/600000)*Math.max(1,sourceRoom))%tail.length:0;
 for(let i=0;i<tail.length&&picked.length<MAX_INSPECT-(conflict&&!chosen.has(conflict.number)?1:0);i++)add(tail[(offset+i)%tail.length]);
 add(conflict);
 // Legacy is a read-only hourly lane; never let the generic refill loop
 // re-add 20+ old tasks and bypass the single-candidate hour budget.
 const rest=ranked.filter(pr=>!chosen.has(pr.number)&&laneOf(pr)!=='legacy')
  .sort((a,b)=>a.number-b.number);
 const room=Math.min(MAX_INSPECT-picked.length,rest.length);
 const start=rest.length?(Math.floor(now/600000)*Math.max(1,room))%rest.length:0;
 for(let i=0;i<room;i++)add(rest[(start+i)%rest.length]);
 const hintNumbers=new Set(probes.map(pr=>pr.number));
 return picked.map(pr=>{
  const task=taskFor(pr,priorityFor(pr,now));
  return task&&hintNumbers.has(pr.number)?
   {...task,manual_conflict_probe:true}:task;
 });
}
// This is a label-only inventory observation, NOT a source-repair admission.
// Hold/Draft/conflict/specialist labels may overlap. No extra GitHub reads.
function backlogLabelHints(prs){
 if(!Array.isArray(prs))throw Error('INVALID_BACKLOG_INVENTORY');
 const result={draft:0,hold:0,blocked:0,manual_repair:0,claimed:0,
   specialist:0,gate_review:0,conflict:0,source:0,ci:0,labeled_unique:0};
 for(const pr of prs){
  if(pr?.draft)result.draft++;
  const labels=new Set((pr?.labels||[]).map(l=>l?.name||l).filter(l=>typeof l==='string'));
  for(const [key,name] of [
   ['hold','hh:hold'],['blocked','hh:blocked'],
   ['manual_repair','hh:repair-manual'],['claimed','hh:worker-claimed'],
   ['specialist','hh:specialist-repair-needed'],['gate_review','hh:release-gate-review'],
   ['conflict','hh:conflict-repair-needed'],['source','hh:repair-needed'],
   ['ci','hh:ci-needed']
  ])if(labels.has(name))result[key]++;
  if(['hh:hold','hh:blocked','hh:repair-manual','hh:worker-claimed',
    'hh:specialist-repair-needed','hh:release-gate-review',
    'hh:conflict-repair-needed','hh:repair-needed','hh:ci-needed']
    .some(name=>labels.has(name)))result.labeled_unique++;
 }
 return result;
}

/**
 * Diagnostic timestamps from bot-signed, exact PR/HEAD/task receipts already
 * read during queue inspection. These are observed transitions, not proof of
 * GitHub webhook delivery, source publication or a running Core job.
 */
function signedCiWakeTiming(task,comments,now){
 if(task?.lane!=='ci'||!Array.isArray(comments)||!Number.isFinite(now))return null;
 const signed=parseRecords(comments.filter(trustedControlComment));
 if(!signed)return null;
 const rows=signed.filter(r=>r.task_key===task.task_key&&
  r.pr_number===task.pr_number&&r.head_sha===task.head_sha&&r.lane==='ci');
 const parse=raw=>{const t=Date.parse(raw||'');return Number.isFinite(t)?t:null;};
 const earliest=(state,key)=>rows.filter(r=>r.state===state)
  .map(r=>({state,t:parse(r[key])})).filter(r=>r.t!==null)
  .sort((a,b)=>a.t-b.t)[0]||null;
 const reserved=earliest('RESERVED','created_at');
 const claimed=earliest('CLAIMED','created_at');
 const wake=earliest('CI_WAKE_REQUESTED','observed_at');
 const outcomes=rows.filter(r=>['CI_WAKE_UNDELIVERED','CI_CORE_CONFIRMED'].includes(r.state))
  .map(r=>({state:r.state,t:parse(r.created_at)}))
  .filter(r=>r.t!==null&&wake&&r.t>=wake.t)
  .sort((a,b)=>a.t-b.t);
 const outcome=outcomes[0]||null;
 if(!reserved&&!claimed&&!wake&&!outcome)return null;
 const duration=(a,b)=>a!==null&&b!==null&&b>=a&&b-a<=30*86400000?
   Math.round((b-a)/1000):null;
 const iso=r=>r?new Date(r.t).toISOString():null;
 return {
  pr_number:task.pr_number,head_sha:task.head_sha.slice(0,12),task_key:task.task_key,
  source:'BOT_SIGNED_EXACT_TASK_RECEIPTS',
  state:outcome?.state||(wake?'WAKE_OUTCOME_NOT_YET_OBSERVED':
   claimed?'CLAIMED_NO_WAKE_RECEIPT':'RESERVED_NO_CLAIM_RECEIPT'),
  reserved_at:iso(reserved),claimed_at:iso(claimed),wake_requested_at:iso(wake),
  outcome_at:iso(outcome),observed_at:new Date(now).toISOString(),
  duration_seconds:{
    reserved_to_claim:duration(reserved?.t??null,claimed?.t??null),
    claim_to_wake:duration(claimed?.t??null,wake?.t??null),
    wake_to_outcome:duration(wake?.t??null,outcome?.t??null),
    wake_pending_age:outcome?null:duration(wake?.t??null,now)
  }
 };
}

// Bounded exact-run Watchdog inspection, not a repository-wide proof or
// authorization to edit sources. Categories may overlap within the sample.
function trustedWatchdogSample(evidence,productionCount){
 if(!evidence||evidence.inventoryComplete!==true||
    evidence.inventoryScope!=='ALL_OPEN_PRS'||
    evidence.production!==productionCount||
    !Number.isFinite(Date.parse(evidence.checkedAt||'')))return null;
 const fields=['inspected','mergeConflicts','coreFailures','specialistFailures',
  'specialistPolicyHolds','releaseGateOnly','verifiedSourceFailures',
  'coreFailureUnverified','specialistEvidenceUnverified',
  'sourceRepairQueued','conflictLabelsQueued'];
 const sample={schema:'HH_WATCHDOG_VERIFIED_SAMPLE_V1',
  scope:'BOUNDED_DEEP_INSPECTION',checkedAt:evidence.checkedAt,
  production:productionCount};
 for(const field of fields){
  const value=evidence[field];
  if(!Number.isSafeInteger(value)||value<0||value>productionCount)return null;
  sample[field]=value;
 }
 if(sample.inspected>productionCount ||
    fields.slice(1).some(field=>sample[field]>sample.inspected))return null;
 // Only the trusted same-run Watchdog supplies these exact-HEAD samples.
 // Historical labels and pending checks cannot masquerade as root cases.
 if(evidence.blockerCases!==undefined){
  if(!Array.isArray(evidence.blockerCases)||evidence.blockerCases.length>32)return null;
  const roots=new Set(['MERGE_CONFLICT','CORE_REQUIRED_CHECK_FAILED',
   'SPECIALIST_PRODUCT_FAILURE','SPECIALIST_POLICY_HOLD']);
  const seen=new Set(),cases=[];
  for(const row of evidence.blockerCases){
   if(!Number.isSafeInteger(row?.pr_number)||row.pr_number<=0||
      !/^[a-f0-9]{40}$/i.test(row.head_sha||'')||
      !roots.has(row.root_code)||
      !['FAILURE','TIMEOUT','UNKNOWN'].includes(row.ci_result)||
      row.source_run_id!==undefined&&
       (!Number.isSafeInteger(row.source_run_id)||row.source_run_id<=0))return null;
   const key=row.pr_number+':'+row.root_code;
   if(seen.has(key))return null;
   seen.add(key);
   cases.push({...row,head_sha:row.head_sha.toLowerCase()});
  }
  sample.blockerCases=cases;
 }
 return sample;
}


/**
 * Fail closed on ambiguous existing Repair Worker history. GitHub lists
 * workflow runs newest first: every current-UTC-hour dispatch, even failed or
 * already completed, occupies the ONE allowed legacy preflight opportunity.
 * A source repair in that hour conservatively reserves this same slot.
 * Reads do not authorize a source write, a manual-hold removal or a merge.
 */
function legacyHourlyWorkerSlot(data,now){
 if(!Number.isFinite(now)||now<0||!data||
    !Number.isSafeInteger(data.total_count)||data.total_count<0||
    !Array.isArray(data.workflow_runs)||
    data.workflow_runs.length>MAX_LEGACY_HOURLY_HISTORY||
    data.total_count<data.workflow_runs.length||
    (data.total_count>0&&!data.workflow_runs.length)||
    (data.total_count>data.workflow_runs.length&&
     data.workflow_runs.length<MAX_LEGACY_HOURLY_HISTORY))
  return 'HISTORY_UNVERIFIED';
 const hourStart=Math.floor(now/3600000)*3600000;
 let previous=Infinity;
 for(const r of data.workflow_runs){
  const created=Date.parse(r?.created_at||'');
  if(!Number.isSafeInteger(r?.id)||r.id<1||
     r.name!=='HH PR source Repair Worker'||
     r.event!=='workflow_dispatch'||r.head_branch!==DEFAULT||
     r.repository?.full_name!==REPO||
     !Number.isFinite(created)||created>now+60000||
     created>previous)return 'HISTORY_UNVERIFIED';
  previous=created;
  if(created>=hourStart)return 'HOURLY_SLOT_USED';
 }
 return 'FREE';
}

async function run({github,core,context,now=Date.now(),dryRun=false,capacityFn=snapshot,focusPrNumber=null,focusPrSnapshot=null,inventorySnapshot=null,watchdogEvidence=null,manualTarget=null}){
 const summary={schema:'HH_CONTROL_DISPATCH_V1',checkedAt:new Date(now).toISOString(),
  dryRun,discovered:0,production:0,actionable:0,candidates:0,
  inspected:0,dispatchAccepted:0,wouldDispatch:0,
  staleConflictCleared:0,wouldClearStaleConflict:0,
  manualConflictHandoffs:0,wouldManualConflictHandoffs:0,
  verifiedManualConflictReroutes:0,verifiedSourceConflictReroutes:0,dependentPrsLinked:0,
  conflictQueueReleased:0,unconfirmedHandoffs:0,
  manualSourceEscalations:0,wouldManualSourceEscalations:0,
  specialistReclassified:0,wouldSpecialistReclassify:0,
  policyReclassified:0,wouldPolicyReclassify:0,
  definitiveDispatchRejections:0,repairDispatchAccepted:0,
  dispatchReceiptsConfirmed:0,dispatchReceiptsUnverified:0,
  actionableByLane:{repair:0,legacy:0,ci:0,conflict:0},
  legacyDispatchAccepted:0,
  capacityReason:null,blocked:{},legacyCiRecovery:null,
  workerRuns:[],blockerExamples:{},ciWakeOutcomes:{},ciWakeTelemetry:[],
  ciCoreConfirmed:0,ciCoreQueued:0,ciCoreRunning:0,ciCoreWaitingRunner:0,ciHoldRecovered:0,
  ciWakeEscalated:0,ciWakePending:0,
  apiRequests:0,apiRemaining:null,cronState:'NOT_PROBED',
  eventFocused:focusPrNumber!==null,
  inventoryScope:manualTarget!==null?'OWNER_PM_EXACT_PR':focusPrNumber!==null?'EVENT_SINGLE_PR':
   inventorySnapshot!==null?'WATCHDOG_SHARED_SNAPSHOT':'ALL_OPEN_PRS',reason:null};
 // An accepted dispatch is NOT execution: only a signed real-runner
 // receipt contributes to the separate confirmation count.
 summary.runnerStartedConfirmed=0;
 summary.runnerEvidence=[];
 const log=s=>core.info('HH_CONTROL_TOWER: '+s);
 let currentTask=null;
 const blocked=reason=>{
   summary.blocked[reason]=(summary.blocked[reason]||0)+1;
   if(currentTask){
     const examples=summary.blockerExamples[reason]||[];
     if(examples.length<3&&!examples.some(x=>x.pr_number===currentTask.pr_number))
       examples.push({pr_number:currentTask.pr_number,head_sha:currentTask.head_sha.slice(0,12)});
     summary.blockerExamples[reason]=examples;
   }
 };
 const finish=async()=>{log(JSON.stringify(summary));await core.summary
   .addHeading('HH Control Tower 2.0 — queue dispatch')
   .addCodeBlock(JSON.stringify(summary,null,2)).write();return summary;};
 if(!trustedContext(context)){summary.reason='UNTRUSTED_EVENT';return finish();}
 if(manualTarget!==null&&!validOwnerRepairTarget(context,manualTarget)){
  summary.reason='UNTRUSTED_OWNER_TARGET';return finish();
 }
 if(manualTarget!==null&&(focusPrNumber!==null||inventorySnapshot!==null)){
  summary.reason='OWNER_TARGET_CONFLICTING_SOURCE';return finish();
 }
 const conflictEvent=context.eventName==='pull_request_target';
 if(conflictEvent&&(focusPrNumber===null||!focusPrSnapshot)){
  summary.reason='CONFLICT_EVENT_REQUIRES_SNAPSHOT';return finish();
 }
 const {owner,repo}=context.repo;
 const {createQuotaGuard,classify}=require('./ci-pr-api-quota.cjs');
 const quota=createQuotaGuard({maxCalls:MAX_API,minRemaining:MIN_RATE,
  onPause:state=>log('API_PAUSED '+state.reason+' retryAt='+(state.retryAt||'next cycle'))});
 const limited=async(name,fn)=>{
  try{return await quota.limited(name,fn);}
  finally{
   summary.apiRequests=quota.state.requests;
   summary.apiRemaining=quota.state.remaining;
   if(quota.state.paused){
    summary.apiPauseReason=quota.state.reason;
    summary.apiRetryAt=quota.state.retryAt;
   }
  }
 };
 let prs=[];
 try{
  if(manualTarget!==null){
    const res=await limited('pm-owner-pr',()=>github.rest.pulls.get({
      owner,repo,pull_number:manualTarget.prNumber
    }));
    const selected=res?.data;
    if(!selected||selected.number!==manualTarget.prNumber||
       selected.head?.sha?.toLowerCase()!==manualTarget.expectedSha.toLowerCase()||
       !validPR(selected)||laneOf(selected)!=='repair')
      throw Error('OWNER_TARGET_NOT_REPAIR_ELIGIBLE');
    prs=[selected];
   }else if(inventorySnapshot!==null){
   // Only the in-memory Watchdog runner passes this full-PR snapshot.
   // Untrusted PR events cannot reuse the scheduled inventory.
   if(!['schedule','workflow_dispatch','push'].includes(context.eventName)||
      !Array.isArray(inventorySnapshot)||inventorySnapshot.length>3000||
      inventorySnapshot.some(x=>!Number.isSafeInteger(x?.number)||x.number<1||
        typeof x.state!=='string')||
      new Set(inventorySnapshot.map(x=>x.number)).size!==inventorySnapshot.length)
    throw Error('WATCHDOG_SNAPSHOT_UNVERIFIED');
   prs=inventorySnapshot;
  }else if(focusPrNumber!==null){
   // The same trusted Core callback first diagnoses this PR in Watchdog.
   // Reuse its exact-HEAD snapshot; never list 150+ open PRs a second time.
   const event=conflictEvent?context.payload?.pull_request:context.payload?.workflow_run;
   const eventBranch=conflictEvent?event?.head?.ref:event?.head_branch;
   if(!Number.isSafeInteger(focusPrNumber)||focusPrNumber<1||!eventBranch||
      (conflictEvent?event?.number!==focusPrNumber:
       context.eventName!=='workflow_run'))
    throw Error('EVENT_FOCUS_UNVERIFIED');
   if(focusPrSnapshot){
    if(focusPrSnapshot.number!==focusPrNumber||
       focusPrSnapshot.head?.ref!==eventBranch||
       focusPrSnapshot.base?.ref!==PROD||
       focusPrSnapshot.head?.repo?.full_name!==REPO)
     throw Error('EVENT_SNAPSHOT_MISMATCH');
    if(conflictEvent&&(
      focusPrSnapshot.head?.sha!==event.head?.sha||
      focusPrSnapshot.mergeable!==false||
      focusPrSnapshot.mergeable_state!=='dirty'))
     throw Error('CONFLICT_SNAPSHOT_NOT_VERIFIED');
    prs=[focusPrSnapshot];
   }else{
    // Older producer: bounded branch-scoped query, never global pagination.
    const res=await limited('event-exact-branch',()=>github.rest.pulls.list({
      owner,repo,state:'open',head:owner+':'+eventBranch,per_page:2
    }));
    if(!Array.isArray(res?.data)||res.data.length!==1||
       res.data[0].number!==focusPrNumber)throw Error('EVENT_BRANCH_AMBIGUOUS');
    prs=res.data;
   }
  }else{
   for(let page=1;page<=6;page++){
    const res=await limited('list-pulls',()=>github.rest.pulls.list({owner,repo,state:'open',per_page:100,page}));
    if(!Array.isArray(res?.data))throw Error('INCOMPLETE_PR_INVENTORY');
    prs.push(...res.data);
    if(res.data.length<100)break;
    if(page===6)throw Error('PR_PAGINATION_LIMIT');
   }
  }
 }catch(err){summary.reason=quota.state.paused?'API_PAUSED_INVENTORY':'INVENTORY_UNVERIFIED: '+err.message;return finish();}
 if(quota.state.paused){summary.reason='API_PAUSED_INVENTORY';return finish();}
 summary.discovered=prs.length;
 const production=prs.filter(pr=>pr.base?.ref===PROD);
 summary.production=production.length;
 summary.backlogLabelHints=backlogLabelHints(production);
 if(watchdogEvidence!==null){
  summary.watchdogSample=inventorySnapshot!==null?
   trustedWatchdogSample(watchdogEvidence,summary.production):null;
  summary.watchdogSampleStatus=summary.watchdogSample?
   'VERIFIED_BOUNDED_SAMPLE':'UNVERIFIED';
 }
 // Reconcile a *proven* old terminal denial only after the new no-commit
 // Worker is on trusted default. This cannot silently free a source owner:
 // the helper validates bot-signed receipts, completed run, current HEAD,
 // worker idle state and records a signed no-claim result before clearing
 // one failed-attempt label.
 // An event is allowed to dispatch ONLY the PR whose current branch and
 // linked event association were checked by Watchdog in this same job.
 // A synthetic workflow_run.head_sha need not equal the PR HEAD; the
 // Watchdog verifies the corresponding merge commit's second parent.
 let focusedPR=null;
 if(focusPrNumber!==null){
  const selected=production.filter(pr=>pr.number===focusPrNumber && validPR(pr));
  if(conflictEvent){
   const event=context.payload?.pull_request;
   if(selected.length!==1||selected[0].head?.sha!==event?.head?.sha||
      selected[0].head?.ref!==event?.head?.ref||
      selected[0].mergeable!==false||
      selected[0].mergeable_state!=='dirty'||
      laneOf(selected[0])!=='conflict'){
    summary.reason='CONFLICT_EVENT_FOCUS_UNVERIFIED';return finish();
   }
  }else{
   const event=context.payload?.workflow_run,associated=event?.pull_requests;
   const coreEvent=context.eventName==='workflow_run'&&
      event?.name==='HH PR core release gate'&&
      event?.status==='completed'&&event?.event==='pull_request'&&
      ['failure','timed_out','startup_failure'].includes(event?.conclusion)&&
      event?.repository?.full_name===REPO&&event?.head_repository?.full_name===REPO;
   const qualityEvent=selected.length===1&&qualityEventMatchesPR(event,selected[0]);
   if(!Number.isSafeInteger(focusPrNumber)||focusPrNumber<1||
      context.eventName!=='workflow_run'||(!coreEvent&&!qualityEvent)||
      selected.length!==1||event.head_branch!==selected[0].head?.ref||
      (coreEvent&&Array.isArray(associated)&&associated.length>0&&
       !associated.some(link=>link.number===focusPrNumber&&
        (!link.head?.sha||link.head.sha===selected[0].head?.sha)))){
    summary.reason='EVENT_FOCUS_UNVERIFIED';return finish();
   }
  }
  focusedPR=selected[0];
  summary.legacyCiRecovery={status:'SKIPPED_FOCUSED_EVENT'};
 }else if(manualTarget!==null){
  // Owner-selected Repair must never also run unrelated legacy CI recovery.
  summary.legacyCiRecovery={status:'SKIPPED_OWNER_TARGET'};
 }else{
  try{
   summary.legacyCiRecovery=await reconcileLegacyCiDenial({
    github,context,prs:production,now,dryRun,limited
   });
  }catch(e){
   summary.legacyCiRecovery={status:'UNAVAILABLE',
    reason:'RECOVERY_UNVERIFIED',detail:String(e.message||e).slice(0,120)};
  }
 }
 const candidates=manualTarget!==null
   ? [taskFor(production[0],priorityFor(production[0],now))]
   : focusedPR
     ? (laneOf(focusedPR)?[taskFor(focusedPR,priorityFor(focusedPR,now))]:[])
     : planCandidates(production,now);
 // Source-write eligibility must remain separate from safe legacy preparation.
 // Legacy preparation is routable but NEVER authorizes source mutation.
 // Report both populations so the monitor does not reject a safe prep task.
 summary.nonmanualRouted=production.filter(pr=>validPR(pr)&&laneOf(pr)).length;
 summary.legacyPrepEligible=production.filter(pr=>validLegacyPrep(pr)).length;
 summary.actionable=summary.nonmanualRouted+summary.legacyPrepEligible;
 for(const pr of production){
  const lane=laneOf(pr);if(lane)summary.actionableByLane[lane]++;
 }
 summary.candidates=candidates.length;
 if(!candidates.length){
  const sample=summary.watchdogSample;
  // A deep sample with zero inspected PRs proves no absence of blockers.
  // Historical labels describe unresolved work, not source-write permission.
  const noInspection=sample?.inspected===0&&summary.production>0;
  const sampleExceptions=!!sample&&[
   'mergeConflicts','coreFailures','specialistFailures',
   'specialistPolicyHolds','coreFailureUnverified','specialistEvidenceUnverified'
  ].some(field=>sample[field]>0);
  const labeledExceptions=(summary.backlogLabelHints?.labeled_unique||0)>0;
  summary.reason=noInspection?'SCAN_INCOMPLETE':
   (sampleExceptions||labeledExceptions)?
    'NO_AUTO_SOURCE_ELIGIBLE_WITH_BLOCKED_WORK':'NO_ACTIONABLE_PR';
  return finish();
 }
 // Metadata-only handoffs survive runner saturation or unknown inventory.
 let capacity=null,capacityReason=null;
 try{capacity=await capacityFn(github,owner,repo);}
 catch(e){capacityReason='CAPACITY_UNVERIFIED: '+String(e.message||e).slice(0,120);}
 // A transitional partial inventory must never admit CI. Re-read once so a
 // settled GitHub snapshot can unblock this sweep without waiting for cron.
 // If the recheck fails, retain the conservative partial snapshot.
 if(capacity?.inventoryConfidence==='BOUNDED_PARTIAL'&&candidates.some(t=>t?.lane==='ci')){
  try{capacity=await capacityFn(github,owner,repo);}
  catch(e){log('CI capacity recheck unavailable: '+String(e.message||e).slice(0,120));}
 }
 // Only trusted same-run jobless-409 proof may unlock ONE existing source
 // Repair or manual legacy preflight; no new runner, CI or hold removal.
 if(!capacity?.known&&capacity?.reason==='RUN_CAPACITY_SATURATED'&&
    candidates.some(t=>['repair','legacy'].includes(t?.lane))&&
    watchdogEvidence?.jobless409?.code==='QUEUED_WITH_ZERO_JOBS_CANCEL_409'){
  const narrow=await verifiedGhostRepairCapacity(github,owner,repo,
   watchdogEvidence.jobless409,now);
  if(narrow.known){capacity=narrow;capacityReason=null;
   log('GHOST_409_ONE_WORKER_SLOT_VERIFIED');}
  else log('GHOST_409_HOLD '+narrow.reason);
 }
 // A direct event handoff has no same-run cancellation-409 receipt. Reuse
 // only bounded, READ-ONLY hints from this capacity census; verify again
 // against live run, uniquely merged PR, source ancestry, all active jobs,
 // and zero Repair Worker runs. Never retry cancellation or wake Core.
 if(!capacity?.known&&capacity?.reason==='RUN_CAPACITY_SATURATED'&&
    capacity.saturatedBy==='QUEUED'&&
    Array.isArray(capacity.ghostQueueCandidates)&&
    capacity.ghostQueueCandidates.length>0&&
    candidates.some(t=>['repair','legacy'].includes(t?.lane))){
  const narrow=await verifiedStaleMergedRepairCapacity(github,owner,repo,
    capacity.ghostQueueCandidates,now);
  if(narrow.known){capacity=narrow;capacityReason=null;
   log('GHOST_STALE_MERGED_ONE_WORKER_SLOT_VERIFIED run='+narrow.ghostProofRunId);}
  else log('GHOST_STALE_MERGED_HOLD '+narrow.reason);
 }
 if(quota.state.paused){summary.reason='API_PAUSED_CAPACITY';return finish();}
 if(!capacity?.known)capacityReason||='CAPACITY_UNVERIFIED: '+(capacity?.reason||'unknown');
 summary.capacityReason=capacityReason;
 if(capacity?.known)summary.capacity={activeRuns:capacity.activeRuns,queuedRuns:capacity.queuedRuns,
  runningJobs:capacity.runningJobs,queuedJobs:capacity.queuedJobs,
  inventoryConfidence:capacity.inventoryConfidence||'VERIFIED',
  unknownActiveRuns:capacity.unknownActiveRuns||0,
  unknownQueuedRuns:capacity.unknownQueuedRuns||0,
  conservativeJobPressure:capacity.conservativeJobPressure??null};
 else if(capacity?.reason==='RUN_CAPACITY_SATURATED'){
  // Preserve exact GitHub counts for the current Monitor snapshot. An
  // over-100 count is a blocked queue, not an invalid API or worker success.
  summary.capacity={known:false,activeRuns:capacity.activeRuns??null,
   queuedRuns:capacity.queuedRuns??null,
   inventoryConfidence:capacity.inventoryConfidence||'SATURATED_UNVERIFIED',
   saturatedBy:capacity.saturatedBy||'CAPACITY_LIMIT',
   safeToDispatch:false};
 }
 // A terminally handled or DIRTY legacy candidate must not strand the
 // entire UTC-hour window. Inspect up to four OTHER existing PRs without
 // creating any extra runner quota or changing labels/HEAD.
 const ordered=[...candidates];
 const candidateIds=new Set(ordered.map(t=>t?.pr_number).filter(Number.isSafeInteger));
 const fallbackPool=manualTarget===null&&focusPrNumber===null?
  production.filter(pr=>validLegacyPrep(pr)&&laneOf(pr)==='legacy')
   .sort((a,b)=>{
    // A historical conflict hint is more likely already handed off. Prefer
    // safely readable non-hinted legacy PRs without inferring mergeability.
    const hint=x=>(x.labels||[]).some(l=>l.name==='hh:conflict-repair-needed')?1:0;
    const av=hint(a),bv=hint(b);
    return av-bv||
     (priorityFor(a,now).mergeRank||10)-(priorityFor(b,now).mergeRank||10)||
     a.number-b.number;
   }):[];
 let fallbackCursor=0,fallbacksAdded=0,legacyDispatchAttempted=false;
 let hourlyLegacyProof=null;
 const queueLegacyFallback=()=>{
  if(fallbacksAdded>=MAX_LEGACY_BACKUPS||legacyDispatchAttempted||
     summary.legacyDispatchAccepted>0||quota.state.paused)return false;
  while(fallbackCursor<fallbackPool.length){
   const pr=fallbackPool[fallbackCursor++];
   if(candidateIds.has(pr.number))continue;
   const task=taskFor(pr,priorityFor(pr,now));
   if(!task||task.lane!=='legacy')continue;
   candidateIds.add(pr.number);
   ordered.push(task);
   summary.candidates=ordered.length;
   fallbacksAdded++;
   log('LEGACY_TERMINAL_FALLBACK_QUEUED #'+pr.number+
    ' HEAD='+pr.head.sha.slice(0,12));
   return true;
  }
  return false;
 };
 // Both types of addressed Worker are per PR. Project the next queued run
 // immediately because the global Actions capacity snapshot is delayed.
 const occupyWorkerSlot=worker=>{
  if(capacity?.known){
   capacity.activeWorker[worker]=(capacity.activeWorker[worker]||0)+1;
   capacity.queuedRuns++;
   capacity.queuedJobs++;
  }
 };
 // Preserve the source/CI-first plan. Conflict receipts are not code writes.
 for(let task of ordered){
  if(summary.dispatchAccepted>=MAX_DISPATCH||quota.state.paused)break;
  if(task?.lane==='legacy'&&
     (summary.legacyDispatchAccepted>=1||legacyDispatchAttempted))continue;
  currentTask=task;
  if(!task){blocked('UNCLASSIFIED');continue;}
  summary.inspected++;
  // Legacy is allowed only for a read-only fresh PR proof here.
  // After that proof, a conflict event MUST be in the real conflict lane.
  if(conflictEvent&&task.lane!=='conflict'&&task.lane!=='legacy'){
   blocked('CONFLICT_EVENT_LANE_MISMATCH');continue;
  }
  let worker=WORKFLOWS[task.lane];
  // A child based on this branch must not strand its parent. The trusted
  // executor receives this link, but never mutates or retargets the child.
  let children=prs,heads=prs;
  if(focusPrNumber!==null||manualTarget!==null){
    // A single PR cannot prove whether its source branch is shared or
   // children depend on it: scoped reads preserve the existing safety gates.
   try{
    const byBase=await limited('event-children-by-base',()=>github.rest.pulls.list({
     owner,repo,state:'open',base:task.head_ref,per_page:100
    }));
    const byHead=await limited('event-shared-head',()=>github.rest.pulls.list({
     owner,repo,state:'open',head:owner+':'+task.head_ref,per_page:100
    }));
    if(!Array.isArray(byBase.data)||byBase.data.length>=100||
       !Array.isArray(byHead.data)||byHead.data.length>=100)
     throw Error('RELATED_PR_INVENTORY_INCOMPLETE');
    children=byBase.data;heads=byHead.data;
   }catch(error){blocked('RELATED_PR_INVENTORY_UNVERIFIED');continue;}
  }
  const dependentPrs=children.filter(pr=>pr.number!==task.pr_number&&
    pr.state==='open'&&pr.base?.ref===task.head_ref&&
    pr.head?.repo?.full_name===REPO&&Number.isSafeInteger(pr.number)&&
    SHA.test(pr.head?.sha||'')).map(pr=>({
      number:pr.number,head_sha:pr.head.sha
    }));
  // Two PRs must never reserve separate writers for the same source ref.
  if(heads.some(pr=>pr.number!==task.pr_number&&pr.state==='open'&&
     pr.head?.repo?.full_name===REPO&&pr.head?.ref===task.head_ref)){
   blocked('SHARED_HEAD_BRANCH');continue;
  }
  let fresh;
  try{fresh=(await limited('live-pr',()=>github.rest.pulls.get({owner,repo,pull_number:task.pr_number}))).data;}
  catch(err){blocked('LIVE_PR_UNAVAILABLE');log('PR #'+task.pr_number+' unavailable '+err.message);continue;}
  // A list snapshot may omit mergeability: a dual-labelled DIRTY PR then
  // looks like a source repair. Only a fresh exact-HEAD and owner-scoped
  // read can upgrade source OR legacy into an owner-only conflict handoff.
  // This route never grants a source-write worker or merge permission.
  const wasLegacy=task.lane==='legacy',wasSource=task.lane==='repair';
  const verifiedDirtyConflict=(wasLegacy||wasSource)&&
   fresh?.head?.sha===task.head_sha&&fresh.head?.ref===task.head_ref&&
   fresh.base?.ref===PROD&&
   (wasLegacy?validLegacyPrep(fresh):validPR(fresh))&&
   fresh.mergeable===false&&fresh.mergeable_state==='dirty'&&
   (fresh.labels||[]).some(label=>label.name==='hh:conflict-repair-needed')&&
   laneOf(fresh)==='conflict';
  if(verifiedDirtyConflict){
   // The chosen legacy candidate is a real DIRTY owner handoff, not the
   // hourly read-only candidate. Continue to another independent PR.
   if(wasLegacy&&!task.manual_conflict_probe)queueLegacyFallback();
   const converted=taskFor(fresh,priorityFor(fresh,now));
   if(converted?.lane!=='conflict'||converted.head_sha!==task.head_sha){
    blocked('DIRTY_CONFLICT_TASK_UNVERIFIED');continue;
   }
   task=converted;currentTask=task;worker=WORKFLOWS.conflict;
   if(wasLegacy)summary.verifiedManualConflictReroutes++;
   else summary.verifiedSourceConflictReroutes++;
   log((wasLegacy?'VERIFIED_MANUAL':'VERIFIED_SOURCE')+
    '_DIRTY_CONFLICT_REROUTE #'+task.pr_number+' '+task.head_sha.slice(0,12));
  }
  if(task.manual_conflict_probe&&!verifiedDirtyConflict){
   // A manual probe never authorizes source repair, only DIRTY owner handoff.
   blocked('MANUAL_CONFLICT_PROBE_NOT_DIRTY');continue;
  }
  if(!fresh||fresh.head?.sha!==task.head_sha||fresh.base?.ref!==PROD||
     !(wasLegacy?validLegacyPrep(fresh):validPR(fresh))||
      laneOf(fresh)!==task.lane){blocked('STALE_SHA_OR_STATE');continue;}
  if(conflictEvent&&task.lane!=='conflict'){
   blocked('CONFLICT_EVENT_LANE_MISMATCH');continue;
  }
  let comments;
  try{
   comments=await readCompleteIssueComments(github,owner,repo,task.pr_number,limited);
   if(!comments){blocked('OWNER_HISTORY_INCOMPLETE');continue;}
  }catch(err){blocked('OWNER_HISTORY_UNAVAILABLE');continue;}
  if(task.lane==='ci'){
   const sample=signedCiWakeTiming(task,comments,now);
   if(sample)summary.ciWakeTelemetry.push(sample);
  }
  const realRunner=verifiedRunnerReceipt(comments,task);
  // Historical execution receipts remain meaningful task history, but must
  // not inflate the current dashboard's recently started Worker count.
  if(realRunner&&recentlyStartedRunner(realRunner,now)){
   summary.runnerStartedConfirmed++;
   summary.runnerEvidence.push({pr_number:task.pr_number,task_key:task.task_key,
    run_id:realRunner.runner.run_id,job_id:realRunner.runner.job_id,
    runner_id:realRunner.runner.runner_id});
  }
  const status=reservationStatus(task,comments,now);
  if(task.lane==='ci'&&fresh.labels?.some(l=>l.name==='hh:ci-wake-unverified')){
   // Signed "wake undelivered" describes the former attempt, not necessarily
   // the current PR HEAD. Only a genuine, completed exact-HEAD Core runner
   // may retire the two stale queue labels. Never use this to mark a failed
   // Specialist/merge gate green or to emit another CI bootstrap.
   if(['FREE','CI_WAKE_OUTCOME_RECORDED'].includes(status)){
    const outcome=await recoverVerifiedCiManualHold({
     task,comments,now,dryRun,github,owner,repo,limited
    });
    const key=outcome.state||'CI_HOLD_RECOVERY_UNAVAILABLE';
    summary.ciWakeOutcomes[key]=(summary.ciWakeOutcomes[key]||0)+1;
    if(outcome.cleared){
     summary.ciHoldRecovered++;
     log('CI_HOLD_RECOVERED #'+task.pr_number+
       ' coreRun='+String(outcome.coreRunId||'none')+
       ' exactHEAD='+task.head_sha.slice(0,12));
     continue;
    }
    if(status==='FREE'){
     blocked('CI_WAKE_MANUAL_HOLD_UNVERIFIED');continue;
    }
   }
  }
  if(status!=='FREE'){
   if(task.lane==='ci'&&['CI_WAKE_AWAITING_CORE','CI_WAKE_OUTCOME_RECORDED'].includes(status)){
    // A historical metadata wake cannot claim a successful Core check.
    // Verify a genuine PR-associated exact-HEAD run before retiring a label;
    // otherwise record a bounded, visible manual hold without re-waking.
    let observed;
    try{observed=await reconcileCiWake({task,comments,now,dryRun,
      github,owner,repo,limited});}
    catch(error){observed={state:'CI_WAKE_RECONCILE_UNAVAILABLE'};}
    const key=observed.state||'CI_WAKE_RECONCILE_UNVERIFIED';
    summary.ciWakeOutcomes[key]=(summary.ciWakeOutcomes[key]||0)+1;
    if(key==='CI_CORE_CONFIRMED')summary.ciCoreConfirmed++;
    else if(key==='CI_CORE_QUEUED')summary.ciCoreQueued++;
    else if(key==='CI_CORE_RUNNING')summary.ciCoreRunning++;
    else if(key==='CI_CORE_WAITING_RUNNER')summary.ciCoreWaitingRunner++;
    else if(key==='CI_WAKE_UNDELIVERED')summary.ciWakeEscalated++;
    else summary.ciWakePending++;
    blocked(key);
    log('CI_WAKE_OUTCOME #'+task.pr_number+' '+key+
      ' coreRun='+String(observed.coreRunId||'none')+
      ' hintCleared='+Boolean(observed.hintCleared));
    continue;
   }
   blocked(status);
   // Skip an exact-HEAD terminally processed legacy PR, not the next free
   // independent backlog candidate. Never follow active/uncertain leases.
   if(wasLegacy&&!task.manual_conflict_probe&&status==='ALREADY_HANDLED')
    queueLegacyFallback();
   // A reserved/claimed HEAD with no terminal result must not be reported
   // as repaired. After a bounded grace, verify the worker is no longer
   // active and append one diagnostic receipt rather than redispatching
   // an ambiguous source-writing task.
   if(task.lane==='repair'&&
      ['RESERVED_REQUIRES_REVIEW','CLAIMED_AWAITING_OUTCOME'].includes(status)&&
      summary.unconfirmedHandoffs<2){
    const pending=comments.flatMap(comment=>{
     const records=parseRecords([comment]);
     return (records||[]).filter(r=>r.task_key===task.task_key&&
      r.head_sha===task.head_sha&&['RESERVED','CLAIMED'].includes(r.state))
      .map(r=>Date.parse(comment.created_at||r.created_at||''));
    }).filter(Number.isFinite);
    const newest=pending.length?Math.max(...pending):NaN;
    if(Number.isFinite(newest)&&now-newest>60*60_000){
     const marker='<!-- HH_CONTROL_HANDOFF_UNCONFIRMED_V1 '+task.task_key+' -->';
     if(comments.some(x=>String(x.body||'').includes(marker))){
      blocked('HANDOFF_UNCONFIRMED_ALREADY_RECORDED');continue;
     }
     let runs;
     try{
      runs=(await limited('orphan-repair-worker-history',()=>github.request(
       'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
        owner,repo,workflow_id:WORKER_PATH.repair,per_page:20}))).data?.workflow_runs;
     }catch(error){blocked('ORPHAN_WORKER_HISTORY_UNAVAILABLE');continue;}
     if(!Array.isArray(runs)||runs.some(r=>r.status!=='completed')){
      blocked('ORPHAN_WORKER_STILL_ACTIVE_OR_UNVERIFIED');continue;
     }
     if(dryRun){summary.wouldUnconfirmedHandoffs=(summary.wouldUnconfirmedHandoffs||0)+1;continue;}
     try{
      const latest=await readCompleteIssueComments(github,owner,repo,task.pr_number,limited);
      if(!latest||reservationStatus(task,latest,now)!==status){
       blocked('ORPHAN_OUTCOME_CHANGED');continue;
      }
      const live=(await limited('orphan-head-recheck',()=>github.rest.pulls.get({
       owner,repo,pull_number:task.pr_number}))).data;
      if(live?.head?.sha!==task.head_sha||live?.state!=='open'){
       blocked('ORPHAN_HEAD_MOVED');continue;
      }
      await limited('orphan-diagnostic',()=>github.rest.issues.createComment({
       owner,repo,issue_number:task.pr_number,
       body:marker+'\n'+commentBody({...task,state:'UNCONFIRMED',
        reason_code:'NO_VERIFIED_WORKER_OUTCOME_AFTER_60_MINUTES',
        source_published:false,owner_run_id:String(context.runId||'unknown'),
        observed_at:new Date(now).toISOString()})
      }));
      summary.unconfirmedHandoffs++;
      log('UNCONFIRMED_SOURCE_HANDOFF #'+task.pr_number+' '+task.head_sha.slice(0,12));
      // Preserve the source HEAD; park automatic retries for source-level
      // triage, rather than letting a missing worker outcome loop forever.
      await limited('orphan-manual-label',()=>github.rest.issues.addLabels({
       owner,repo,issue_number:task.pr_number,labels:['hh:repair-manual']
      }));
      try{await limited('orphan-retire-source-label',()=>github.rest.issues.removeLabel({
       owner,repo,issue_number:task.pr_number,name:'hh:repair-needed'
      }));}catch(error){if(error?.status!==404)throw error;}
     }catch(error){
      blocked('ORPHAN_DIAGNOSTIC_WRITE_FAILED');
      log('Orphaned handoff #'+task.pr_number+': '+error.message);
     }
    }
   }
   continue;
  }
  if(task.lane==='conflict'&&!(fresh.mergeable===false&&fresh.mergeable_state==='dirty')){
   // A resolved conflict label is only a stale work-queue hint. The legacy
   // Repair Worker could clear it, but Control Tower never dispatches it to
   // Repair unless it is DIRTY. Release it here after two authoritative
   // exact-head/base reads and after verifying no other owner has the task.
   const knownClean=fresh.mergeable===true &&
     ['clean','blocked','behind'].includes(fresh.mergeable_state) &&
     SHA.test(fresh.base?.sha||'') &&
     fresh.labels?.some(l=>l.name==='hh:conflict-repair-needed') &&
     !fresh.labels?.some(l=>l.name==='hh:repair-needed');
   if(!knownClean){blocked('CONFLICT_NOT_VERIFIED');continue;}
   let verified;
   try{verified=(await limited('recheck-stale-conflict',()=>github.rest.pulls.get({
    owner,repo,pull_number:task.pr_number}))).data;}
   catch(err){blocked('STALE_CONFLICT_RECHECK_UNAVAILABLE');continue;}
   if(!verified||!validPR(verified)||verified.head?.sha!==task.head_sha||
      verified.base?.ref!==PROD||verified.base?.sha!==fresh.base.sha||
      verified.mergeable!==true||
      !['clean','blocked','behind'].includes(verified.mergeable_state)||
      !verified.labels?.some(l=>l.name==='hh:conflict-repair-needed')||
      verified.labels?.some(l=>l.name==='hh:repair-needed')){
    blocked('STALE_CONFLICT_CHANGED');continue;
   }
   if(dryRun){summary.wouldClearStaleConflict++;continue;}
   try{
    await limited('clear-stale-conflict',()=>github.rest.issues.removeLabel({
     owner,repo,issue_number:task.pr_number,name:'hh:conflict-repair-needed'
    }));
    summary.staleConflictCleared++;
    log('CLEARED_STALE_CONFLICT #'+task.pr_number+' '+task.head_sha.slice(0,12));
   }catch(err){
    blocked(err?.status===404?'STALE_CONFLICT_ALREADY_CLEARED':
      'STALE_CONFLICT_CLEAR_DENIED');
    log('Stale conflict label cleanup #'+task.pr_number+': '+err.message);
   }
   continue;
  }
  // A verified DIRTY conflict is an owner handoff ONLY in the conflict
  // lane. Manual legacy PRs have their own signed, READ-ONLY preflight lane;
  // do not let an old conflict handoff prevent a no-token cloud comparison.
  // This never authorizes source writes or removes hh:repair-manual.
  const isVerifiedDirty=fresh.mergeable===false&&fresh.mergeable_state==='dirty';
  if(task.lane!=='legacy'&&isVerifiedDirty){
   // Conflicts cannot be repaired by the ESLint worker. Hand off once per
   // exact HEAD, then retire the queue labels under a manual owner blocker.
   // A retry may finish cleanup, but MUST NOT repost the handoff.
   const marker='<!-- HH_CONTROL_CONFLICT_HANDOFF_V1 '+task.head_sha+' -->';
   const releaseManualQueue=async()=>{
    if(dryRun)return false;
    try{
     const before=(await limited('conflict-release-precheck',()=>
      github.rest.pulls.get({owner,repo,pull_number:task.pr_number}))).data;
     if(before?.head?.sha!==task.head_sha||before?.state!=='open'||
        before.mergeable!==false||before.mergeable_state!=='dirty'||
        before.head?.repo?.full_name!==REPO||before.base?.ref!==PROD){
      blocked('CONFLICT_RELEASE_RECHECK_CHANGED');return false;
     }
     await limited('conflict-manual-owner-label',()=>github.rest.issues.addLabels({
      owner,repo,issue_number:task.pr_number,labels:['hh:repair-manual']
     }));
     // Revalidate after the label mutation; do not delete newer-HEAD work.
     const after=(await limited('conflict-release-postcheck',()=>
      github.rest.pulls.get({owner,repo,pull_number:task.pr_number}))).data;
     if(after?.head?.sha!==task.head_sha||after?.state!=='open'||
        after.head?.repo?.full_name!==REPO||after.base?.ref!==PROD){
      blocked('CONFLICT_RELEASE_HEAD_MOVED');return false;
     }
     for(const name of ['hh:repair-needed','hh:conflict-repair-needed']){
      if(!after.labels?.some(l=>l.name===name))continue;
      try{await limited('retire-conflict-queue-label',()=>
       github.rest.issues.removeLabel({owner,repo,issue_number:task.pr_number,name}));}
      catch(error){
       if(error?.status!==404)throw error;
      }
     }
     summary.conflictQueueReleased++;
     log('CONFLICT_MANUAL_QUEUE_RELEASED #'+task.pr_number+' '+task.head_sha.slice(0,12));
     return true;
    }catch(error){
     blocked('CONFLICT_RELEASE_FAILED');
     log('Conflict queue release #'+task.pr_number+': '+error.message);
     return false;
    }
   };
   if(comments.some(c=>trustedControlComment(c)&&String(c.body||'').includes(marker))){
    blocked('CONFLICT_ALREADY_HANDED_OFF');
    await releaseManualQueue();
    continue;
   }
   if(summary.manualConflictHandoffs+summary.wouldManualConflictHandoffs>=MAX_MANUAL_CONFLICT_HANDOFFS){
    blocked('CONFLICT_HANDOFF_LIMIT');continue;
   }
   if(dryRun){summary.wouldManualConflictHandoffs++;continue;}
   try{
    await limited('conflict-owner-handoff',()=>github.rest.issues.createComment({
     owner,repo,issue_number:task.pr_number,
     body:marker+'\nConflict repair task for the existing Chat/Codex Conflict Repair lane. '+
      'Verified DIRTY against '+PROD+' at exact HEAD '+task.head_sha+'. '+
      'Resolve source conflicts in the same PR branch and rerun required CI. '+
      (dependentPrs.length?'Dependent open PRs: '+
       dependentPrs.map(child=>'#'+child.number+' HEAD '+child.head_sha.slice(0,12)).join('; ')+
       '. Preserve branches and ancestry; reconcile every child only after parent repair/merge and new CI. ':'')+
      'Handoff is NOT a source commit, a completed repair or approval to merge.'
    }));
    const released=await releaseManualQueue();
    if(released){
     summary.manualConflictHandoffs++;
     summary.dependentPrsLinked+=dependentPrs.length;
     log('CONFLICT_TO_CODEX_QUEUE #'+task.pr_number+' '+task.head_sha.slice(0,12)+
       ' dependents='+dependentPrs.map(child=>'#'+child.number).join(','));
    }else blocked('CONFLICT_HANDOFF_RECEIPT_ONLY');
   }catch(error){
    blocked('CONFLICT_HANDOFF_UNAVAILABLE');
    log('Conflict handoff #'+task.pr_number+': '+error.message);
   }
   continue;
  }
  // Capacity is a source-writing gate, not a metadata-only conflict handoff
  // gate. The manual owner queue must progress during runner saturation.
  if(!capacity?.known){blocked('CAPACITY_UNVERIFIED');continue;}
  const permission=admission(task.lane,capacity);
  if(permission!=='ADMIT'){blocked(permission);continue;}
  if([GHOST_REPAIR_MODE,STALE_MERGED_REPAIR_MODE]
      .includes(capacity?.inventoryConfidence)&&summary.dispatchAccepted>=1){
   blocked('GHOST_ONLY_ONE_WORKER_PER_SWEEP');continue;
  }
  // Source must have an exact-HEAD trusted Watchdog diagnosis; labels alone
  // are stale hints and must not give privileged source write permission.
  if(task.lane==='repair'&&(!hasVerifiedSourceHandoff(comments,task.head_sha)||
      !verifiedCoreCodeFailure(comments,task.head_sha))){
   // A stale hh:repair-needed hint must not launch privileged source Repair.
   // When independent current-HEAD specialist tests are genuinely red, send
   // the owner to Product Repair rather than leaving an impossible ESLint
   // worker candidate at the front of every scan.
   let checks;
   try{
    checks=(await limited('source-without-proof-checks',()=>github.rest.checks.listForRef({
     owner,repo,ref:task.head_sha,per_page:100,filter:'latest'
    }))).data;
   }catch(err){blocked('SOURCE_PROOF_UNVERIFIED');continue;}
   const product=verifiedSpecialistProductFailure(checks);
   const policy=verifiedAggregatePolicyHold(checks);
   if((!product&&!policy)||fresh.mergeable!==true||
      !['clean','behind','blocked'].includes(fresh.mergeable_state)){
    blocked('SOURCE_PROOF_MISSING');continue;
   }
   if(dryRun){
    if(product)summary.wouldSpecialistReclassify++;
    else summary.wouldPolicyReclassify++;
    continue;
   }
   const replacement=product?'hh:specialist-repair-needed':'hh:release-gate-review';
   try{
    if(!fresh.labels.some(l=>l.name===replacement)){
     await limited('label-verified-non-source',()=>github.rest.issues.addLabels({
      owner,repo,issue_number:task.pr_number,labels:[replacement]
     }));
    }
    const current=(await limited('verify-non-source-relabel',()=>github.rest.pulls.get({
     owner,repo,pull_number:task.pr_number
    }))).data;
    if(current?.state!=='open'||current.draft||
       current.head?.sha!==task.head_sha||current.base?.ref!==PROD||
       current.head?.repo?.full_name!==REPO||
       !current.labels?.some(l=>l.name==='hh:repair-needed')||
       !current.labels?.some(l=>l.name===replacement)){
     blocked('NON_SOURCE_RELABEL_RECHECK_FAILED');continue;
    }
    await limited('retire-false-source-label',()=>github.rest.issues.removeLabel({
     owner,repo,issue_number:task.pr_number,name:'hh:repair-needed'
    }));
    if(product)summary.specialistReclassified++;
    else summary.policyReclassified++;
    log((product?'INDEPENDENT_SPECIALIST_RECLASSIFIED #':'BASE_OR_POLICY_GATE_RECLASSIFIED #')+
      task.pr_number+' '+task.head_sha.slice(0,12));
   }catch(err){
    blocked('NON_SOURCE_RELABEL_UNAVAILABLE');
    log('Non-source classification #'+task.pr_number+': '+err.message);
   }
   continue;
  }
  if(task.lane==='repair'){
   if(repairMode(fresh)!=='lint'){blocked('SOURCE_MERGEABILITY_UNVERIFIED');continue;}
   let files;
   try{files=(await limited('repair-files',()=>github.rest.pulls.listFiles({
    owner,repo,pull_number:task.pr_number,per_page:100,page:1}))).data;}
   catch(e){blocked('SOURCE_FILES_UNAVAILABLE');continue;}
   // Do not let the eight-path worker shortlist hide any later sensitive
   // path, configuration change or colocated test from the pre-dispatch gate.
   const inventory=assessCompleteFreeRepairScope(files);
   const safe=safeFiles(files);
   const freeScopeSafe=inventory.allowed&&Array.isArray(safe)&&
     safe.length===inventory.files.length&&
     safe.every(safeFreeSourcePath)&&
     safe.every((path,i)=>path===inventory.files[i]);
   if(!freeScopeSafe){
    const scopeReason=inventory.allowed?'SOURCE_SCOPE_UNSAFE_FOR_FREE_AI':inventory.reason;
    blocked(scopeReason);
    // Verified source CI can affect files outside the source-writing sandbox.
    // Escalate once to the PR owner instead of repeatedly re-enqueueing an
    // unauthorized code-write attempt. NEVER auto-publish these files.
    if(dryRun){summary.wouldManualSourceEscalations++;continue;}
    const marker='<!-- HH_CONTROL_SCOPE_OWNER_V1 '+task.head_sha+' -->';
    try{
     const ownerPr=(await limited('scope-owner-exact-head',()=>
      github.rest.pulls.get({owner,repo,pull_number:task.pr_number}))).data;
     if(!validPR(ownerPr)||ownerPr.head?.sha!==task.head_sha||
        laneOf(ownerPr)!=='repair'){blocked('SCOPE_OWNER_HEAD_CHANGED');continue;}
     const history=await readCompleteIssueComments(github,owner,repo,task.pr_number,limited);
     if(!history||reservationStatus(task,history,now)!=='FREE'||
        (!hasVerifiedSourceHandoff(history,task.head_sha)||
         !verifiedCoreCodeFailure(history,task.head_sha))){
      blocked('SCOPE_OWNER_LEASE_UNVERIFIED');continue;
     }
     if(history.some(c=>trustedControlComment(c)&&String(c.body||'').includes(marker))){
      blocked('SCOPE_OWNER_ALREADY_HANDED_OFF');continue;
     }
     // The signed MANUAL receipt is terminal for this task key, even when
     // subsequent label updates are denied. No automatic retry can race it.
     await limited('scope-owner-terminal-receipt',()=>github.rest.issues.createComment({
      owner,repo,issue_number:task.pr_number,
      body:marker+'\n@'+ownerPr.user.login+
       ' — Core failed at this exact HEAD, but the changed source scope is '+
       'unsupported or sensitive for the existing free automatic repair. '+
       'Authorized human/Code Repair review is required. '+
       'No source write or required CI bypass occurred.\n'+commentBody({
        ...task,state:'MANUAL',reason_code:scopeReason,
        source_published:false,owner_run_id:String(context.runId||'unknown'),
        created_at:new Date(now).toISOString()
       })
     }));
     const live=(await limited('scope-owner-post-receipt-head',()=>
      github.rest.pulls.get({owner,repo,pull_number:task.pr_number}))).data;
     if(live?.head?.sha!==task.head_sha||live?.state!=='open'||
        live.base?.ref!==PROD||live.head?.repo?.full_name!==REPO){
      blocked('SCOPE_OWNER_HEAD_MOVED');continue;
     }
     await limited('scope-owner-manual-label',()=>github.rest.issues.addLabels({
      owner,repo,issue_number:task.pr_number,labels:['hh:repair-manual']
     }));
     const confirmed=(await limited('scope-owner-label-head',()=>
      github.rest.pulls.get({owner,repo,pull_number:task.pr_number}))).data;
     if(confirmed?.head?.sha!==task.head_sha||confirmed?.state!=='open'||
        confirmed.base?.ref!==PROD||confirmed.head?.repo?.full_name!==REPO){
      blocked('SCOPE_OWNER_LABEL_HEAD_MOVED');continue;
     }
     try{await limited('scope-owner-retire-source',()=>github.rest.issues.removeLabel({
      owner,repo,issue_number:task.pr_number,name:'hh:repair-needed'
     }));}catch(e){if(e?.status!==404)throw e;}
     try{await limited('scope-owner-assignee',()=>github.rest.issues.addAssignees({
      owner,repo,issue_number:task.pr_number,assignees:[ownerPr.user.login]
     }));}catch(e){log('SCOPE_OWNER_ASSIGNMENT_UNAVAILABLE #'+task.pr_number+' '+e.message);}
     summary.manualSourceEscalations++;
     log('SOURCE_SCOPE_MANUAL_OWNER #'+task.pr_number+' '+task.head_sha.slice(0,12));
    }catch(e){
     blocked('SCOPE_OWNER_ESCALATION_UNAVAILABLE');
     log('Scope owner handoff #'+task.pr_number+': '+e.message);
    }
    continue;
   }
  }
  // Respect one existing cloud preflight opportunity per UTC hour across
  // multiple Watchdog sweeps. An HTTP dispatch may be accepted before a
  // runner starts; even a prior failed/completed worker reserves this hour.
  // This is deliberately more conservative than an extra paid CI wave.
  if(task.lane==='legacy'&&!dryRun){
   if(hourlyLegacyProof===null){
    try{
     const response=await limited('legacy-hourly-worker-history',()=>
      github.rest.actions.listWorkflowRuns({owner,repo,
       workflow_id:WORKER_PATH.legacy,event:'workflow_dispatch',
       per_page:MAX_LEGACY_HOURLY_HISTORY,page:1}));
     hourlyLegacyProof=legacyHourlyWorkerSlot(response?.data,now);
    }catch(error){hourlyLegacyProof='HISTORY_UNVERIFIED';}
   }
   if(hourlyLegacyProof!=='FREE'){
    blocked(hourlyLegacyProof==='HOURLY_SLOT_USED'?
     'LEGACY_HOURLY_WORKER_ALREADY_DISPATCHED':
     'LEGACY_HOURLY_HISTORY_UNVERIFIED');
    continue;
   }
  }
  // Global busy/cooldown history belongs to OTHER PRs. Only signed exact-HEAD
  // reservation history and per-PR workflow concurrency authorize execution.
  if(dryRun){summary.wouldDispatch++;summary.workerRuns.push({task_key:task.task_key,
   pr_number:task.pr_number,lane:task.lane,outcome:'WOULD_DISPATCH'});
   occupyWorkerSlot(worker);continue;}
  // The trusted single writer reserves the exact task before dispatch.
  // On interrupted dispatch this reservation fails closed pending a human
  // inspection of worker history: never duplicate a possible source write.
  const errorTaskId=task.lane==='repair'?
    latestErrorTaskId(comments,task.pr_number,task.head_sha):null;
  const claim={...reservation(task,now,context.runId||'unspecified'),
    assigned_executor_id:task.lane==='ci'?CI_EXECUTOR:REPAIR_EXECUTOR,
    executor_kind:'github_actions',assignment_status:'SELECTED_RESERVED_NOT_STARTED',
    ...(errorTaskId?{error_task_id:errorTaskId}:{})};
  const reservedBody=commentBody(claim);
  let reservationCommentId=null;
  try{
   const stored=await limited('reserve-task',()=>github.rest.issues.createComment({
    owner,repo,issue_number:task.pr_number,body:reservedBody}));
   reservationCommentId=stored?.data?.id||null;
  }catch(err){blocked('RESERVATION_FAILED');log('Reserve #'+task.pr_number+' '+err.message);continue;}
  const inputs={pr_number:String(task.pr_number),expected_sha:task.head_sha,
    task_key:task.task_key,reservation_run_id:String(context.runId||''),
    dry_run:'false'};
  try{
   // Even an ambiguous provider response counts as the single attempt
   // in this sweep. The next sweep rechecks authenticated run history.
   if(task.lane==='legacy')legacyDispatchAttempted=true;
   const delivered=await limited('dispatch-worker',()=>github.rest.actions.createWorkflowDispatch({
    owner,repo,workflow_id:WORKER_PATH[task.lane],ref:DEFAULT,inputs}));
   // A successful HTTP 204 proves GitHub accepted the dispatch request;
   // it does not prove a worker run exists or that it claimed this HEAD.
   if(delivered?.status!==204)throw Error('DISPATCH_HTTP_204_UNVERIFIED');
   summary.dispatchAccepted++;
   if(task.lane==='repair')summary.repairDispatchAccepted++;
   if(task.lane==='legacy')summary.legacyDispatchAccepted++;
   const workerRun={task_key:task.task_key,pr_number:task.pr_number,
    head_sha:task.head_sha,lane:task.lane,error_task_id:errorTaskId,
    executor_id:claim.assigned_executor_id,outcome:'DISPATCH_ACCEPTED',
    acceptanceReceiptPersisted:false,sourceCommitConfirmed:false};
   // Patch the SAME reservation comment, keeping its first signed
   // HH_PR_TASK_V1 JSON and RESERVED state exactly intact. The worker still
   // requires the original reservation and records CLAIMED independently.
   try{
    if(!Number.isSafeInteger(reservationCommentId)||reservationCommentId<1)
      throw Error('RESERVATION_COMMENT_ID_UNVERIFIED');
    const ack=dispatchAcceptance(claim,now);
    const body=reservedBody+'\n'+dispatchAcceptanceBody(ack);
    const updated=await limited('persist-dispatch-acceptance',()=>github.rest.issues.updateComment({
      owner,repo,comment_id:reservationCommentId,body}));
    if(updated?.data?.body!==body)throw Error('DISPATCH_RECEIPT_WRITE_READBACK_UNVERIFIED');
    workerRun.acceptanceReceiptPersisted=true;
    summary.dispatchReceiptsConfirmed++;
   }catch(error){
    summary.dispatchReceiptsUnverified++;
    blocked('DISPATCH_ACCEPTANCE_RECEIPT_UNVERIFIED');
    log('Dispatch accepted but receipt not verified #'+task.pr_number+' '+String(error.message||error).slice(0,120));
   }
   summary.workerRuns.push(workerRun);
   occupyWorkerSlot(worker);
   log('DISPATCH_ACCEPTED '+task.lane+' #'+task.pr_number+' '+task.head_sha.slice(0,12)+
     ' executor='+claim.assigned_executor_id+' ack='+workerRun.acceptanceReceiptPersisted);
  }catch(err){
   blocked(classify(err)?'DISPATCH_RATE_LIMIT':'DISPATCH_DENIED');log('Dispatch #'+task.pr_number+' '+err.message);
   // Never release an ambiguous reservation. A definite non-accepted HTTP
   // response can be requeued after an authenticated ten-minute backoff.
   const code=Number(err?.status||err?.response?.status||0);
   if(DEFINITIVE_DISPATCH_DENIAL.has(code)&&!classify(err)){
    const rejected={...claim,state:'DISPATCH_REJECTED',
     created_at:new Date(now+1000).toISOString(),
     outcome:'DEFINITIVELY_NOT_ACCEPTED',http_status:code,
     retry_after:new Date(now+10*60_000).toISOString()};
    try{
     await limited('record-definitive-dispatch-denial',()=>github.rest.issues.createComment({
      owner,repo,issue_number:task.pr_number,body:commentBody(rejected)
     }));
     summary.definitiveDispatchRejections++;
    }catch(error){
     blocked('DISPATCH_REJECTION_RECEIPT_FAILED');
     log('Denial receipt missing #'+task.pr_number+' '+error.message);
    }
   }
  }
 }
 summary.reason||=quota.state.paused?'API_PAUSED':summary.dispatchAccepted?'DISPATCH_ACCEPTED':
   summary.manualConflictHandoffs?'CONFLICT_HANDOFF_ACCEPTED':
   summary.ciHoldRecovered?'CI_HOLD_RECOVERED_VERIFIED_CORE':
   summary.wouldDispatch?'DRY_RUN_CANDIDATES':
   summary.wouldManualConflictHandoffs?'DRY_RUN_CONFLICT_HANDOFF':
   capacityReason||(summary.actionableByLane.repair===0&&summary.actionableByLane.ci===0
    ?'AWAITING_SEMANTIC_CONFLICT_REPAIR':'NO_SAFE_DISPATCH');
 return finish();
}
/**
 * Zero-cost, event-driven liveness fallback for Direction Watcher. Existing
 * Control Tower gets worker/Watchdog completion events; its single-writer
 * concurrency lease ensures two callbacks cannot race the same wake decision.
 * Do not claim cron is fixed: this is opportunistic during real event traffic.
 * GITHUB_TOKEN workflow_dispatch is GitHub's documented recursion exception.
 */
const DIRECTION_WORKFLOW='hh-pr-direction-watcher.yml';
const DIRECTION_IDLE_MS=11*60*1000;
const DIRECTION_ACTIVE=new Set(['queued','in_progress','pending','requested','waiting']);
async function wakeDirectionWatcher({github,core,context,now=Date.now(),dryRun=false}){
 const state={decision:'NOT_ELIGIBLE',ageMinutes:null,dispatchAccepted:false};
 const log=()=>core.info('HH_DIRECTION_EVENT_WAKE: '+JSON.stringify(state));
 if(dryRun||!trustedContext(context)||context.eventName!=='workflow_run'){
  log();return state;
 }
 if(!Number.isFinite(now)){state.decision='INVALID_CLOCK';log();return state;}
 const {owner,repo}=context.repo;
 let runs,history;
 try{
  history=(await github.rest.actions.listWorkflowRuns({
   owner,repo,workflow_id:DIRECTION_WORKFLOW,per_page:20,page:1
  })).data;
  runs=history?.workflow_runs;
 }catch(error){
  state.decision='HISTORY_UNAVAILABLE';state.error=String(error.message||error).slice(0,140);
  log();return state;
 }
 if(!Array.isArray(runs)||!Number.isSafeInteger(history?.total_count)||
    history.total_count<runs.length||(history.total_count>0&&!runs.length)){
  state.decision='INCOMPLETE_HISTORY';log();return state;
 }
 if(runs.some(x=>DIRECTION_ACTIVE.has(x.status))){
  state.decision='WATCHER_ALREADY_RUNNING';log();return state;
 }
 if(runs.some(x=>x.status!=='completed'||!Number.isFinite(Date.parse(x.created_at||'')))){
  state.decision='UNKNOWN_RUN_STATE';log();return state;
 }
 const newest=runs.length?Math.max(...runs.map(x=>Date.parse(x.created_at))):null;
 if(newest!==null){
  const age=now-newest;
  state.ageMinutes=Math.floor(age/60000);
  if(age<0&&age>=-60000){state.decision='RECENT_RUN';log();return state;}
  if(age<0){state.decision='INCONSISTENT_CLOCK';log();return state;}
  if(age<DIRECTION_IDLE_MS){state.decision='RECENT_RUN';log();return state;}
 }
 // An older in-progress/queued run may be hidden beyond the first history
 // page during an Actions event storm: check these statuses independently.
 try{
  for(const status of ['in_progress','queued']){
   const active=(await github.rest.actions.listWorkflowRuns({
    owner,repo,workflow_id:DIRECTION_WORKFLOW,status,per_page:1
   })).data;
   if(!Number.isSafeInteger(active?.total_count)||
      !Array.isArray(active?.workflow_runs)){
    state.decision='ACTIVE_HISTORY_UNVERIFIED';log();return state;
   }
   if(active.total_count>0){
    state.decision='WATCHER_ALREADY_RUNNING';log();return state;
   }
  }
 }catch(error){
  state.decision='ACTIVE_HISTORY_UNAVAILABLE';
  state.error=String(error.message||error).slice(0,140);
  log();return state;
 }
 try{
  await github.rest.actions.createWorkflowDispatch({
   owner,repo,workflow_id:DIRECTION_WORKFLOW,ref:DEFAULT,
   inputs:{dry_run:'false',batch:'0'}
  });
  state.decision='EVENT_WAKE_ACCEPTED';
  state.dispatchAccepted=true;
 }catch(error){
  state.decision='DISPATCH_UNAVAILABLE';
  state.error=String(error.message||error).slice(0,140);
 }
 log();return state;
}
module.exports={trustedContext,validOwnerRepairTarget,planCandidates,legacyHourlyWorkerSlot,run,wakeDirectionWatcher,workerBusyOrCooling,
 DIRECTION_IDLE_MS,DIRECTION_WORKFLOW,verifiedSpecialistProductFailure,backlogLabelHints,
 signedCiWakeTiming};