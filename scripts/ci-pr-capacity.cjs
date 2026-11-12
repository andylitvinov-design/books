'use strict';
const CORE_WORKFLOW='HH PR core release gate';
const WORKFLOWS={repair:'HH PR source Repair Worker',legacy:'HH PR source Repair Worker',conflict:'HH PR source Repair Worker',
 ci:'HH zero-cost PR CI worker',merge:'HH native auto-merge'};
const LIMIT={maxActiveRuns:24,maxQueuedRuns:60,maxRepairQueuedRuns:72,maxObservedJobs:38,maxWorkerRuns:2,maxRepairWorkerRuns:2,
 maxJobReads:24,minRateReserve:100,maxOptionalCiActiveRuns:16};

const TERMINAL_OVERHANG_GRACE_MS=60*60*1000;
// An Actions run can remain in_progress hours after EVERY job finished.
// Never release capacity from workflow status alone: exact, complete and
// hour-old terminal job evidence is mandatory; unknown remains occupied.
function possibleTerminalOverhang(run,now){
 if(!Number.isFinite(now)||!run||run.status!=='in_progress'||
    run.conclusion!==null||run.run_attempt!==1||
    !Number.isSafeInteger(run.id)||run.id<=0)return false;
 const created=Date.parse(run.created_at||''),updated=Date.parse(run.updated_at||'');
 return Number.isFinite(created)&&Number.isFinite(updated)&&created<=updated&&
   updated<=now-TERMINAL_OVERHANG_GRACE_MS;
}
function verifiedTerminalOverhang(run,page,now){
 if(!possibleTerminalOverhang(run,now)||!page||
    !Number.isSafeInteger(page.total_count)||page.total_count<1||
    page.total_count>100||!Array.isArray(page.jobs)||
    page.jobs.length!==page.total_count)return false;
 const seen=new Set();
 return page.jobs.every(job=>{
   if(!job||!Number.isSafeInteger(job.id)||job.id<=0||seen.has(job.id)||
      job.status!=='completed'||typeof job.conclusion!=='string'||!job.conclusion)
     return false;
   seen.add(job.id);
   const completed=Date.parse(job.completed_at||'');
   return Number.isFinite(completed)&&completed<=now-TERMINAL_OVERHANG_GRACE_MS;
 });
}
function computeCapacity(active,queued,jobs){
 if(!Array.isArray(active)||!Array.isArray(queued)||!Array.isArray(jobs))
  return {known:false,reason:'INCOMPLETE_CAPACITY'};
 const activeWorker={};for(const name of Object.values(WORKFLOWS))activeWorker[name]=0;
 // A transitioning Actions snapshot can include a completed run in a queued
 // page. It is not an active worker lease; keep overall capacity conservative.
 const occupiesSlot=x=>(!x.status||['in_progress','queued','waiting','pending','requested'].includes(x.status))&&
  // Scheduled/push CI probes never edit PR metadata. They have an independent
  // workflow concurrency group and must not reserve the addressed CI lane.
  !(x.name===WORKFLOWS.ci&&['schedule','push'].includes(x.event));
 // GitHub's in_progress/queued pages may overlap while a run transitions.
 // Never count one authenticated run ID as two occupied Repair Worker slots.
 // Missing/invalid IDs remain conservatively counted as separate runs.
 const countedRunIds=new Set();
 for(const x of [...active,...queued]){
  if(!Object.prototype.hasOwnProperty.call(activeWorker,x?.name)||!occupiesSlot(x))continue;
  if(Number.isSafeInteger(x.id)&&x.id>0){
   if(countedRunIds.has(x.id))continue;
   countedRunIds.add(x.id);
  }
  activeWorker[x.name]++;
 }
 const runningJobs=jobs.filter(x=>x.status==='in_progress').length;
 const queuedJobs=jobs.filter(x=>['queued','waiting','pending'].includes(x.status)).length;
 // GitHub controls native runner scheduling. Reserve optional CI worker capacity
 // while a release-blocking Core workflow/job is actually waiting.
 const coreQueuedRuns=queued.filter(x=>x.name===CORE_WORKFLOW&&occupiesSlot(x)).length;
 const coreQueuedJobs=jobs.filter(x=>x.workflow_name===CORE_WORKFLOW&&
   ['queued','pending','waiting'].includes(x.status)).length;
 return {known:true,activeRuns:active.length,queuedRuns:queued.length,
  runningJobs,queuedJobs,activeWorker,coreQueuedRuns,coreQueuedJobs};
}
function admission(lane,capacity){
 if(!capacity?.known)return 'CAPACITY_UNKNOWN';
 const worker=WORKFLOWS[lane];if(!worker)return 'LANE_UNKNOWN';
 // An unobserved run is reserved pessimistically and cannot authorize CI.
 // Repair is a short, separately leased worker; its live run history is
 // independently checked again immediately before dispatch.
 if(lane==='ci'&&capacity.inventoryConfidence==='BOUNDED_PARTIAL')
   return 'PARTIAL_CAPACITY_CI_BLOCKED';
 // A legacy preflight is read-only and may occupy the SECOND EXISTING repair
 // runner alongside one normal source repair. The shared workflow budget is
 // still maxRepairWorkerRuns=2; this never adds a runner or bypasses Core.
 const workerLimit=['repair','legacy'].includes(lane)?
  LIMIT.maxRepairWorkerRuns:LIMIT.maxWorkerRuns;
 if(capacity.activeWorker[worker]>=workerLimit)return 'WORKER_BUSY';
 // Optional CI retains the strict 60-run global stop (and its own 6-run
 // limit). Admit at most TWO independently leased exact-head Repair Workers into a modest
 // overflow window when most queued runs are unrelated/no-op wrappers.
 // Never infer a free runner or bypass a current Core result from this.
 const queueLimit=['repair','legacy'].includes(lane)?
  LIMIT.maxRepairQueuedRuns:LIMIT.maxQueuedRuns;
 if(capacity.activeRuns>=LIMIT.maxActiveRuns||capacity.queuedRuns>=queueLimit)
   return 'RUNNERS_SATURATED';
 if(lane==='repair'&&capacity.queuedRuns>=LIMIT.maxQueuedRuns&&
    (capacity.coreQueuedRuns||0)>20)return 'CORE_PRIORITY_PENDING';
 const pressure=capacity.runningJobs+capacity.queuedJobs+
   (capacity.unknownActiveRuns||0)*8+(capacity.unknownQueuedRuns||0)*2;
 if(pressure>=LIMIT.maxObservedJobs)return 'JOBS_SATURATED';
 // Keep low-pressure slots productive, but stop optional CI bootstraps when
 // mandatory Core waits behind a genuinely busy runner queue.
 if(lane==='ci'&&(capacity.coreQueuedRuns>0||capacity.coreQueuedJobs>0)&&
    (capacity.activeRuns>=8||capacity.queuedRuns>=2||pressure>=12))
   return 'CORE_PRIORITY_PENDING';
 // CI bootstrap competes with Core and gets a stricter queue budget.
 if(lane==='ci'&&(capacity.activeRuns>=LIMIT.maxOptionalCiActiveRuns||capacity.queuedRuns>=6))return 'CI_QUEUE_BUSY';
 // Bounded Repair claims must not starve behind unrelated CI runs.
 // Hard runner/queue/job-pressure limits above and the two-active-Repair cap
 // still hold. The dispatcher independently checks the exact worker history,
 // task ownership and SHA before reserving and starting this lane.
 return 'ADMIT';
}
async function snapshot(github,owner,repo,now=Date.now()){
 // GitHub may update total_count while an Actions run moves between states.
 // A single disagreeing count must not permanently idle the dispatch queue.
 // Only when two reads severely disagree, retry twice more using idempotent
 // GETs. Missing run IDs NEVER count as free capacity.
 let active,queued,aCount,qCount,confidence='VERIFIED';
 for(let attempt=0;attempt<4;attempt++){
  const [a,q]=await Promise.all(['in_progress','queued'].map(status=>
   github.rest.actions.listWorkflowRunsForRepo({owner,repo,status,per_page:100})));
  active=a?.data?.workflow_runs;
  queued=q?.data?.workflow_runs;
  aCount=a?.data?.total_count;
  qCount=q?.data?.total_count;
  if(!Array.isArray(active)||!Array.isArray(queued)||
     !Number.isSafeInteger(aCount)||!Number.isSafeInteger(qCount)||
     aCount<0||qCount<0){
    return {known:false,reason:'INVALID_RUN_INVENTORY',activeRuns:aCount??null,queuedRuns:qCount??null};
  }
  // GitHub's total_count may exceed the 100-entry page limit. This is
  // verified queue saturation, NOT malformed inventory. The remaining runs
  // are uninspected: never infer idle runners or dispatch another worker.
  // A single count-only observation is sufficient; no costly pagination or
  // retries when the queue already exceeds the hard safety limits.
  if(aCount>100||qCount>100){
    return {known:false,reason:'RUN_CAPACITY_SATURATED',
      activeRuns:aCount,queuedRuns:qCount,
      inventoryConfidence:'COUNT_ONLY_OVER_PAGE_LIMIT',
      saturatedBy:aCount>100&&qCount>100?'BOTH':
        aCount>100?'ACTIVE':'QUEUED',
      safeToDispatch:false};
  }
  // When even the total count is saturated, do not waste API quota reading
  // runner jobs or accidentally treat an incomplete list as a free slot.
  if((Math.max(aCount,active.length)>=LIMIT.maxActiveRuns&&
     !(aCount===LIMIT.maxActiveRuns&&active.length===aCount&&
       qCount===queued.length&&active.some(run=>possibleTerminalOverhang(run,now))))||
     Math.max(qCount,queued.length)>=LIMIT.maxRepairQueuedRuns){
    return {known:false,reason:'RUN_CAPACITY_SATURATED',activeRuns:aCount,queuedRuns:qCount};
  }
  if(aCount===active.length&&qCount===queued.length)break;
  if(attempt>=1){
    // Preserve the original <=2 conservative partial behavior for Repair.
    // A worse drift may be transient GitHub Actions total_count lag.
    if(Math.abs(aCount-active.length)<=2&&Math.abs(qCount-queued.length)<=2){
      confidence='BOUNDED_PARTIAL';
      break;
    }
    if(attempt===3){
      return {known:false,reason:'INCONSISTENT_RUN_INVENTORY',activeRuns:aCount,
        queuedRuns:qCount,listedActive:active.length,listedQueued:queued.length};
    }
    // Keep the hard limits, no optimistic capacity, no new workflow or runner.
    await new Promise(resolve=>setTimeout(resolve,attempt===1?200:400));
  }
 }
 if(Math.max(aCount,active.length)>LIMIT.maxJobReads){
  return {known:false,reason:'RUN_JOB_INSPECTION_BUDGET',activeRuns:aCount,queuedRuns:qCount};
 }
 const batches=await Promise.all(active.map(x=>github.rest.actions.listJobsForWorkflowRun({
  owner,repo,run_id:x.id,per_page:100})));
 const jobs=[];
 for(let index=0;index<batches.length;index++){
  const result=batches[index];if(!Array.isArray(result?.data?.jobs)||
    result.data.total_count>100||result.data.total_count!==result.data.jobs.length)
      return {known:false,reason:'INCOMPLETE_JOB_INVENTORY',activeRuns:aCount,queuedRuns:qCount};
  jobs.push(...result.data.jobs.map(job=>({...job,workflow_name:active[index].name})));
 }
 // Release only authenticated, complete first-attempt job-terminal overhangs.
 // BOUNDED_PARTIAL and unknown IDs keep all original hard limits.
 const overhangIds=new Set();
 if(confidence==='VERIFIED'&&aCount===active.length&&qCount===queued.length)
   for(let i=0;i<active.length;i++)
     if(verifiedTerminalOverhang(active[i],batches[i]?.data,now))
       overhangIds.add(active[i].id);
 if(Math.max(aCount,active.length)>=LIMIT.maxActiveRuns&&!overhangIds.size)
   return {known:false,reason:'RUN_CAPACITY_SATURATED',activeRuns:aCount,queuedRuns:qCount};
 const capacity=computeCapacity(active.filter(run=>!overhangIds.has(run.id)),queued,jobs);
 capacity.activeRuns=Math.max(aCount,active.length)-overhangIds.size;
 capacity.verifiedTerminalOverhangRuns=overhangIds.size;
 capacity.queuedRuns=Math.max(qCount,queued.length);
 capacity.inventoryConfidence=confidence;
 capacity.unknownActiveRuns=Math.max(0,aCount-active.length);
 capacity.unknownQueuedRuns=Math.max(0,qCount-queued.length);
 capacity.conservativeJobPressure=capacity.runningJobs+capacity.queuedJobs+
   capacity.unknownActiveRuns*8+capacity.unknownQueuedRuns*2;
 return capacity;
}
module.exports={WORKFLOWS,LIMIT,computeCapacity,admission,snapshot,possibleTerminalOverhang,verifiedTerminalOverhang};