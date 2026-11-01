'use strict';
const CORE_WORKFLOW='HH PR core release gate';
const WORKFLOWS={repair:'HH PR source Repair Worker',conflict:'HH PR source Repair Worker',
 ci:'HH zero-cost PR CI worker',merge:'HH native auto-merge'};
const LIMIT={maxActiveRuns:24,maxQueuedRuns:60,maxObservedJobs:38,maxWorkerRuns:1,
 maxJobReads:24,minRateReserve:100};
function computeCapacity(active,queued,jobs){
 if(!Array.isArray(active)||!Array.isArray(queued)||!Array.isArray(jobs))
  return {known:false,reason:'INCOMPLETE_CAPACITY'};
 const activeWorker={};for(const name of Object.values(WORKFLOWS))activeWorker[name]=0;
 for(const x of [...active,...queued])if(Object.prototype.hasOwnProperty.call(activeWorker,x.name))activeWorker[x.name]++;
 const runningJobs=jobs.filter(x=>x.status==='in_progress').length;
 const queuedJobs=jobs.filter(x=>['queued','waiting','pending'].includes(x.status)).length;
 // GitHub controls native runner scheduling. Reserve optional CI worker capacity
 // while a release-blocking Core workflow/job is actually waiting.
 const coreQueuedRuns=queued.filter(x=>x.name===CORE_WORKFLOW).length;
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
 if(capacity.activeWorker[worker]>=LIMIT.maxWorkerRuns)return 'WORKER_BUSY';
 if(capacity.activeRuns>=LIMIT.maxActiveRuns||capacity.queuedRuns>=LIMIT.maxQueuedRuns)return 'RUNNERS_SATURATED';
 const pressure=capacity.runningJobs+capacity.queuedJobs+
   (capacity.unknownActiveRuns||0)*8+(capacity.unknownQueuedRuns||0)*2;
 if(pressure>=LIMIT.maxObservedJobs)return 'JOBS_SATURATED';
 // Keep low-pressure slots productive, but stop optional CI bootstraps when
 // mandatory Core waits behind a genuinely busy runner queue.
 if(lane==='ci'&&(capacity.coreQueuedRuns>0||capacity.coreQueuedJobs>0)&&
    (capacity.activeRuns>=8||capacity.queuedRuns>=2||pressure>=12))
   return 'CORE_PRIORITY_PENDING';
 // CI bootstrap competes with Core and gets a stricter queue budget.
 if(lane==='ci'&&(capacity.activeRuns>=12||capacity.queuedRuns>=6))return 'CI_QUEUE_BUSY';
 // A single bounded Repair claim can operate during busy Core CI.
 if(['repair','conflict'].includes(lane)&&(capacity.activeRuns>=18||capacity.queuedRuns>=80))return 'REPAIR_QUEUE_BUSY';
 return 'ADMIT';
}
async function snapshot(github,owner,repo){
 // GitHub may update total_count while an Actions run moves between states.
 // A single disagreeing count must not permanently idle the dispatch queue.
 // Retry the read once, but never infer spare capacity from partial data.
 let active,queued,aCount,qCount,confidence='VERIFIED';
 for(let attempt=0;attempt<2;attempt++){
  const [a,q]=await Promise.all(['in_progress','queued'].map(status=>
   github.rest.actions.listWorkflowRunsForRepo({owner,repo,status,per_page:100})));
  active=a?.data?.workflow_runs;
  queued=q?.data?.workflow_runs;
  aCount=a?.data?.total_count;
  qCount=q?.data?.total_count;
  if(!Array.isArray(active)||!Array.isArray(queued)||
     !Number.isSafeInteger(aCount)||!Number.isSafeInteger(qCount)||
     aCount<0||qCount<0||aCount>100||qCount>100){
    return {known:false,reason:'INVALID_RUN_INVENTORY',activeRuns:aCount??null,queuedRuns:qCount??null};
  }
  // When even the total count is saturated, do not waste API quota reading
  // runner jobs or accidentally treat an incomplete list as a free slot.
  if(Math.max(aCount,active.length)>=LIMIT.maxActiveRuns||
     Math.max(qCount,queued.length)>=LIMIT.maxQueuedRuns){
    return {known:false,reason:'RUN_CAPACITY_SATURATED',activeRuns:aCount,queuedRuns:qCount};
  }
  if(aCount===active.length&&qCount===queued.length)break;
  if(attempt===1){
    // GitHub sometimes reports 17 active runs but returns 16 during active
    // status transitions. A discrepancy of at most two can be conservatively
    // admitted for *Repair only*, after checking every listed runner job and
    // independently verifying the target workflow has no active run.
    if(Math.abs(aCount-active.length)>2||Math.abs(qCount-queued.length)>2){
      return {known:false,reason:'INCONSISTENT_RUN_INVENTORY',activeRuns:aCount,
        queuedRuns:qCount,listedActive:active.length,listedQueued:queued.length};
    }
    confidence='BOUNDED_PARTIAL';
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
 const capacity=computeCapacity(active,queued,jobs);
 capacity.activeRuns=Math.max(aCount,active.length);
 capacity.queuedRuns=Math.max(qCount,queued.length);
 capacity.inventoryConfidence=confidence;
 capacity.unknownActiveRuns=Math.max(0,aCount-active.length);
 capacity.unknownQueuedRuns=Math.max(0,qCount-queued.length);
 capacity.conservativeJobPressure=capacity.runningJobs+capacity.queuedJobs+
   capacity.unknownActiveRuns*8+capacity.unknownQueuedRuns*2;
 return capacity;
}
module.exports={WORKFLOWS,LIMIT,computeCapacity,admission,snapshot};