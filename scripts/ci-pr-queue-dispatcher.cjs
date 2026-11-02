'use strict';
/** Trusted default-branch single-writer queue dispatcher: no source checkout, no merge. */
const {REPO,PROD,DEFAULT,SHA,laneOf,validPR,taskFor,reservation,commentBody,reservationStatus,parseRecords,readCompleteIssueComments,trustedControlComment,DEFINITIVE_DISPATCH_DENIAL}=require('./ci-pr-task-state.cjs');
const {priorityFor,rankedCandidates}=require('./ci-pr-priority.cjs');
const {run:reconcileLegacyCiDenial}=require('./ci-pr-ci-legacy-recovery.cjs');
const {WORKFLOWS,admission,snapshot}=require('./ci-pr-capacity.cjs');
const {repairMode,safeFiles,hasVerifiedSourceHandoff}=require('./ci-pr-repair-worker.cjs');
const {classifyIndependentSpecialistChecks}=require('./ci-pr-ten-minute-watchdog.cjs');
const WORKER_PATH={repair:'hh-pr-repair-worker.yml',conflict:'hh-pr-repair-worker.yml',ci:'hh-pr-ci-worker.yml'};
const MAX_DISPATCH=2, MAX_MANUAL_CONFLICT_HANDOFFS=2, MAX_INSPECT=16, MAX_CONFLICT_ONLY_INSPECT=6, MAX_API=55, MIN_RATE=250;
const RELEVANT=new Set(['HH PR 10-minute watchdog','HH PR source Repair Worker','HH zero-cost PR CI worker','HH PR core release gate']);
function verifiedSpecialistProductFailure(checks){
 if(classifyIndependentSpecialistChecks(checks)!=='PRODUCT_FAILURE')return false;
 const rows=[...checks.check_runs].sort((a,b)=>b.id-a.id);
 const latest=new Map();
 for(const check of rows)if(!latest.has(check.name))latest.set(check.name,check);
 const core=latest.get('hh-core-verified'),specialist=latest.get('hh-specialist');
 return core?.app?.id===15368&&core.status==='completed'&&core.conclusion==='success'&&
  specialist?.app?.id===15368&&specialist.status==='completed'&&
  specialist.conclusion==='failure';
}
function trustedContext(context){
 if(context.repo?.owner+'/'+context.repo?.repo!==REPO||
    context.ref!=='refs/heads/'+DEFAULT)return false;
 if(context.eventName==='workflow_run'){
  const w=context.payload?.workflow_run;
  const verifiedCoreFailure=w?.name==='HH PR core release gate' &&
    w.event==='pull_request' &&
    ['failure','timed_out','startup_failure'].includes(w.conclusion);
  const trustedWorker=w?.name!=='HH PR core release gate' &&
    ['workflow_dispatch','schedule'].includes(w?.event);
  return !!(w&&RELEVANT.has(w.name)&&w.status==='completed'&&
    (verifiedCoreFailure||trustedWorker)&&
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
 const available=prs.filter(pr=>validPR(pr)&&laneOf(pr));
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
 // During conflict-only backlogs, rotate a bounded window rather than reread
 // the same 16 already handed-off exact HEADs on each ten-minute cycle.
 if(!source.length&&!ci){
  const conflicts=ranked.filter(pr=>laneOf(pr)==='conflict');
  const room=Math.min(MAX_CONFLICT_ONLY_INSPECT,conflicts.length);
  // Always inspect the most important P1/R01 first; rotate the rest so
  // lower-priority conflicts are never permanently excluded. A handoff is
  // only a receipt: the code-writing Chat/Codex lane owns the actual repair.
  const fast=conflicts.slice(0,Math.min(2,room));
  const tail=conflicts.slice(fast.length),rotating=room-fast.length;
  const offset=tail.length?(Math.floor(now/600000)*Math.max(1,rotating))%tail.length:0;
  return [...fast,...Array.from({length:rotating},(_,i)=>tail[(offset+i)%tail.length])]
   .map(pr=>taskFor(pr,priorityFor(pr,now)));
 }
 const picked=[],chosen=new Set();
 const add=pr=>{if(pr&&!chosen.has(pr.number)&&picked.length<MAX_INSPECT){picked.push(pr);chosen.add(pr.number);}};
 if(fairnessTurn)add(conflict);
 add(source[0]);add(ci);
 // Keep priority among the first three sources and rotate the remainder.
 for(const pr of source.slice(1,3))if(picked.length<MAX_INSPECT-(conflict&&!chosen.has(conflict.number)?1:0))add(pr);
 const sourceRoom=Math.max(0,MAX_INSPECT-picked.length-(conflict&&!chosen.has(conflict.number)?1:0));
 const tail=source.filter(pr=>!chosen.has(pr.number));
 const offset=tail.length?(Math.floor(now/600000)*Math.max(1,sourceRoom))%tail.length:0;
 for(let i=0;i<tail.length&&picked.length<MAX_INSPECT-(conflict&&!chosen.has(conflict.number)?1:0);i++)add(tail[(offset+i)%tail.length]);
 add(conflict);
 const rest=ranked.filter(pr=>!chosen.has(pr.number)).sort((a,b)=>a.number-b.number);
 const room=Math.min(MAX_INSPECT-picked.length,rest.length);
 const start=rest.length?(Math.floor(now/600000)*Math.max(1,room))%rest.length:0;
 for(let i=0;i<room;i++)add(rest[(start+i)%rest.length]);
 return picked.map(pr=>taskFor(pr,priorityFor(pr,now)));
}
async function run({github,core,context,now=Date.now(),dryRun=false,capacityFn=snapshot,focusPrNumber=null}){
 const summary={schema:'HH_CONTROL_DISPATCH_V1',checkedAt:new Date(now).toISOString(),
  dryRun,discovered:0,production:0,actionable:0,candidates:0,
  inspected:0,dispatchAccepted:0,wouldDispatch:0,
  staleConflictCleared:0,wouldClearStaleConflict:0,
  manualConflictHandoffs:0,wouldManualConflictHandoffs:0,conflictQueueReleased:0,unconfirmedHandoffs:0,
  manualSourceEscalations:0,wouldManualSourceEscalations:0,
  specialistReclassified:0,wouldSpecialistReclassify:0,
  definitiveDispatchRejections:0,repairDispatchAccepted:0,
  actionableByLane:{repair:0,ci:0,conflict:0},
  capacityReason:null,blocked:{},legacyCiRecovery:null,
  workerRuns:[],blockerExamples:{},apiRequests:0,apiRemaining:null,cronState:'NOT_PROBED',
  eventFocused:focusPrNumber!==null,reason:null};
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
  for(let page=1;page<=6;page++){
   const res=await limited('list-pulls',()=>github.rest.pulls.list({owner,repo,state:'open',per_page:100,page}));
   if(!Array.isArray(res?.data))throw Error('INCOMPLETE_PR_INVENTORY');
   prs.push(...res.data);
   if(res.data.length<100)break;
   if(page===6)throw Error('PR_PAGINATION_LIMIT');
  }
 }catch(err){summary.reason=quota.state.paused?'API_PAUSED_INVENTORY':'INVENTORY_UNVERIFIED: '+err.message;return finish();}
 if(quota.state.paused){summary.reason='API_PAUSED_INVENTORY';return finish();}
 summary.discovered=prs.length;
 const production=prs.filter(pr=>pr.base?.ref===PROD);
 summary.production=production.length;
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
  const event=context.payload?.workflow_run;
  const selected=production.filter(pr=>pr.number===focusPrNumber && validPR(pr));
  const associated=event?.pull_requests;
  if(!Number.isSafeInteger(focusPrNumber)||focusPrNumber<1||
     context.eventName!=='workflow_run'||event?.name!=='HH PR core release gate'||
     event?.status!=='completed'||event?.event!=='pull_request'||
     !['failure','timed_out','startup_failure'].includes(event?.conclusion)||
     selected.length!==1||event.head_branch!==selected[0].head?.ref||
     (Array.isArray(associated)&&associated.length>0&&
      !associated.some(link=>link.number===focusPrNumber))){
   summary.reason='EVENT_FOCUS_UNVERIFIED';return finish();
  }
  focusedPR=selected[0];
  summary.legacyCiRecovery={status:'SKIPPED_FOCUSED_EVENT'};
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
 const candidates=focusedPR
  ? (laneOf(focusedPR)?[taskFor(focusedPR,priorityFor(focusedPR,now))]:[])
  : planCandidates(production,now);
 summary.actionable=production.filter(pr=>validPR(pr)&&laneOf(pr)).length;
 for(const pr of production){
  const lane=laneOf(pr);if(lane)summary.actionableByLane[lane]++;
 }
 summary.candidates=candidates.length;
 if(!candidates.length){summary.reason='NO_ACTIONABLE_PR';return finish();}
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
 if(quota.state.paused){summary.reason='API_PAUSED_CAPACITY';return finish();}
 if(!capacity?.known)capacityReason||='CAPACITY_UNVERIFIED: '+(capacity?.reason||'unknown');
 summary.capacityReason=capacityReason;
 if(capacity?.known)summary.capacity={activeRuns:capacity.activeRuns,queuedRuns:capacity.queuedRuns,
  runningJobs:capacity.runningJobs,queuedJobs:capacity.queuedJobs,
  inventoryConfidence:capacity.inventoryConfidence||'VERIFIED',
  unknownActiveRuns:capacity.unknownActiveRuns||0,
  unknownQueuedRuns:capacity.unknownQueuedRuns||0,
  conservativeJobPressure:capacity.conservativeJobPressure??null};
 // CI keeps a repository-wide one-worker slot. Source Repair capacity is
 // bounded globally, but ownership and writer serialization are per PR.
 const usedWorkers=new Set();
 const occupyRepairSlot=worker=>{
  if(capacity?.known){
   capacity.activeWorker[worker]=(capacity.activeWorker[worker]||0)+1;
   capacity.queuedRuns++;
  }
 };
 // Preserve the source/CI-first plan. Conflict receipts are not code writes.
 const ordered=candidates;
 for(const task of ordered){
  if(summary.dispatchAccepted>=MAX_DISPATCH||quota.state.paused)break;
  currentTask=task;
  if(!task){blocked('UNCLASSIFIED');continue;}
  summary.inspected++;
  const worker=WORKFLOWS[task.lane];
  const listed=production.find(pr=>pr.number===task.pr_number);
  const potentialConflict=task.lane==='conflict'||
    listed?.labels?.some(l=>l.name==='hh:conflict-repair-needed');
  if(!potentialConflict){
   if(!capacity?.known){blocked('CAPACITY_UNVERIFIED');continue;}
   const permission=admission(task.lane,capacity);
   if(permission!=='ADMIT'){blocked(permission);continue;}
   if(task.lane==='ci'&&usedWorkers.has(worker)){blocked('LANE_ALREADY_SELECTED');continue;}
  }
  // A parent PR with open stacked children cannot be rewritten safely.
  if(prs.some(pr=>pr.number!==task.pr_number&&pr.base?.ref===task.head_ref)){
   blocked('STACKED_PARENT');continue;
  }
  let fresh;
  try{fresh=(await limited('live-pr',()=>github.rest.pulls.get({owner,repo,pull_number:task.pr_number}))).data;}
  catch(err){blocked('LIVE_PR_UNAVAILABLE');log('PR #'+task.pr_number+' unavailable '+err.message);continue;}
  if(!fresh||fresh.head?.sha!==task.head_sha||fresh.base?.ref!==PROD||
     !validPR(fresh)||laneOf(fresh)!==task.lane){blocked('STALE_SHA_OR_STATE');continue;}
  let comments;
  try{
   comments=await readCompleteIssueComments(github,owner,repo,task.pr_number,limited);
   if(!comments){blocked('OWNER_HISTORY_INCOMPLETE');continue;}
  }catch(err){blocked('OWNER_HISTORY_UNAVAILABLE');continue;}
  const status=reservationStatus(task,comments,now);
  if(status!=='FREE'){
   blocked(status);
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
  const isVerifiedDirty=fresh.mergeable===false&&fresh.mergeable_state==='dirty'&&
    (task.lane==='conflict'||fresh.labels?.some(l=>l.name==='hh:conflict-repair-needed'));
  if(isVerifiedDirty){
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
   if(comments.some(c=>String(c.body||'').includes(marker))){
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
      'Handoff is NOT a source commit, a completed repair or approval to merge.'
    }));
    summary.manualConflictHandoffs++;
    log('CONFLICT_TO_CODEX_QUEUE #'+task.pr_number+' '+task.head_sha.slice(0,12));
    await releaseManualQueue();
   }catch(error){
    blocked('CONFLICT_HANDOFF_UNAVAILABLE');
    log('Conflict handoff #'+task.pr_number+': '+error.message);
   }
   continue;
  }
  if(potentialConflict){
   if(!capacity?.known){blocked('CAPACITY_UNVERIFIED');continue;}
   const permission=admission(task.lane,capacity);
   if(permission!=='ADMIT'){blocked(permission);continue;}
   if(task.lane==='ci'&&usedWorkers.has(worker)){blocked('LANE_ALREADY_SELECTED');continue;}
  }
  // Source must have an exact-HEAD trusted Watchdog diagnosis; labels alone
  // are stale hints and must not give privileged source write permission.
  if(task.lane==='repair'&&!hasVerifiedSourceHandoff(comments,task.head_sha)){
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
   if(!verifiedSpecialistProductFailure(checks)||
      fresh.mergeable!==true||
      !['clean','behind','blocked'].includes(fresh.mergeable_state)){
    blocked('SOURCE_PROOF_MISSING');continue;
   }
   if(dryRun){summary.wouldSpecialistReclassify++;continue;}
   try{
    if(!fresh.labels.some(l=>l.name==='hh:specialist-repair-needed')){
     await limited('label-verified-specialist-repair',()=>github.rest.issues.addLabels({
      owner,repo,issue_number:task.pr_number,labels:['hh:specialist-repair-needed']
     }));
    }
    // Recheck source HEAD and both labels before retiring the old queue hint.
    // The reservationStatus check above already rejected active/ambiguous
    // owners, exact-HEAD task claims and incomplete issue-comment history.
    const current=(await limited('verify-specialist-relabel',()=>github.rest.pulls.get({
     owner,repo,pull_number:task.pr_number
    }))).data;
    if(current?.state!=='open'||current.draft||
       current.head?.sha!==task.head_sha||current.base?.ref!==PROD||
       current.head?.repo?.full_name!==REPO||
       !current.labels?.some(l=>l.name==='hh:repair-needed')||
       !current.labels?.some(l=>l.name==='hh:specialist-repair-needed')){
     blocked('SPECIALIST_RELABEL_RECHECK_FAILED');continue;
    }
    await limited('retire-unproven-source-label',()=>github.rest.issues.removeLabel({
     owner,repo,issue_number:task.pr_number,name:'hh:repair-needed'
    }));
    summary.specialistReclassified++;
    log('INDEPENDENT_SPECIALIST_RECLASSIFIED #'+task.pr_number+' '+task.head_sha.slice(0,12));
   }catch(err){
    blocked('SPECIALIST_RELABEL_UNAVAILABLE');
    log('Specialist classification #'+task.pr_number+': '+err.message);
   }
   continue;
  }
  if(task.lane==='repair'){
   if(repairMode(fresh)!=='lint'){blocked('SOURCE_MERGEABILITY_UNVERIFIED');continue;}
   let files;
   try{files=(await limited('repair-files',()=>github.rest.pulls.listFiles({
    owner,repo,pull_number:task.pr_number,per_page:100,page:1}))).data;}
   catch(e){blocked('SOURCE_FILES_UNAVAILABLE');continue;}
   const safe=safeFiles(files);
   if(!safe||!safe.length){
    blocked('SOURCE_SCOPE_NOT_ACTIONABLE');
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
        !hasVerifiedSourceHandoff(history,task.head_sha)){
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
       ' — Core failed at this exact HEAD, but no file is within the permitted '+
       'automatic source-repair scope. Authorized human/Code Repair review needed. '+
       'No source write or required CI bypass occurred.\n'+commentBody({
        ...task,state:'MANUAL',reason_code:'SOURCE_SCOPE_NOT_ACTIONABLE',
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
  // Source workers on OTHER PRs must not impose a repository-wide cooldown.
  // Signed exact-HEAD reservations + per-PR workflow concurrency prevent
  // duplicate writes; bounded live capacity protects the runner pool.
  if(task.lane==='ci'){
   let recent;
   try{const r=(await limited('worker-history',()=>github.request(
     'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
      owner,repo,workflow_id:WORKER_PATH[task.lane],per_page:5}))).data;
    if(!Array.isArray(r?.workflow_runs)){blocked('WORKER_HISTORY_INCOMPLETE');continue;}
    recent=r.workflow_runs;
   }catch(err){blocked('WORKER_HISTORY_UNAVAILABLE');continue;}
   if(workerBusyOrCooling(recent,now,task.lane)){
    blocked('WORKER_BUSY_OR_COOLDOWN');continue;
   }
  }
  if(dryRun){summary.wouldDispatch++;summary.workerRuns.push({task_key:task.task_key,
   pr_number:task.pr_number,lane:task.lane,outcome:'WOULD_DISPATCH'});usedWorkers.add(worker);if(task.lane==='repair')occupyRepairSlot(worker);continue;}
  // The trusted single writer reserves the exact task before dispatch.
  // On interrupted dispatch this reservation fails closed pending a human
  // inspection of worker history: never duplicate a possible source write.
  const claim=reservation(task,now,context.runId||'unspecified');
  try{
   await limited('reserve-task',()=>github.rest.issues.createComment({
    owner,repo,issue_number:task.pr_number,body:commentBody(claim)}));
  }catch(err){blocked('RESERVATION_FAILED');log('Reserve #'+task.pr_number+' '+err.message);continue;}
  const inputs={pr_number:String(task.pr_number),expected_sha:task.head_sha,
    task_key:task.task_key,reservation_run_id:String(context.runId||''),
    dry_run:'false'};
  try{
   await limited('dispatch-worker',()=>github.rest.actions.createWorkflowDispatch({
    owner,repo,workflow_id:WORKER_PATH[task.lane],ref:DEFAULT,inputs}));
   summary.dispatchAccepted++;
   if(task.lane==='repair')summary.repairDispatchAccepted++;
   summary.workerRuns.push({task_key:task.task_key,pr_number:task.pr_number,
    head_sha:task.head_sha,lane:task.lane,outcome:'DISPATCH_ACCEPTED',
    sourceCommitConfirmed:false});
   usedWorkers.add(worker);
   if(task.lane==='repair')occupyRepairSlot(worker);
   log('DISPATCH_ACCEPTED '+task.lane+' #'+task.pr_number+' '+task.head_sha.slice(0,12));
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
module.exports={trustedContext,planCandidates,run,wakeDirectionWatcher,workerBusyOrCooling,
 DIRECTION_IDLE_MS,DIRECTION_WORKFLOW,verifiedSpecialistProductFailure};