'use strict';
const WORKFLOWS={repair:'HH PR source Repair Worker',conflict:'HH PR source Repair Worker',
 ci:'HH zero-cost PR CI worker',merge:'HH native auto-merge'};
const LIMIT={maxActiveRuns:24,maxQueuedRuns:60,maxObservedJobs:38,maxWorkerRuns:1,
 maxJobReads:20,minRateReserve:100};
function computeCapacity(active,queued,jobs){
 if(!Array.isArray(active)||!Array.isArray(queued)||!Array.isArray(jobs))
  return {known:false,reason:'INCOMPLETE_CAPACITY'};
 const activeWorker={};for(const name of Object.values(WORKFLOWS))activeWorker[name]=0;
 for(const x of [...active,...queued])if(Object.prototype.hasOwnProperty.call(activeWorker,x.name))activeWorker[x.name]++;
 const runningJobs=jobs.filter(x=>x.status==='in_progress').length;
 const queuedJobs=jobs.filter(x=>['queued','waiting','pending'].includes(x.status)).length;
 return {known:true,activeRuns:active.length,queuedRuns:queued.length,
  runningJobs,queuedJobs,activeWorker};
}
function admission(lane,capacity){
 if(!capacity?.known)return 'CAPACITY_UNKNOWN';
 const worker=WORKFLOWS[lane];if(!worker)return 'LANE_UNKNOWN';
 if(capacity.activeWorker[worker]>=LIMIT.maxWorkerRuns)return 'WORKER_BUSY';
 if(capacity.activeRuns>=LIMIT.maxActiveRuns||capacity.queuedRuns>=LIMIT.maxQueuedRuns)return 'RUNNERS_SATURATED';
 if(capacity.runningJobs+capacity.queuedJobs>=LIMIT.maxObservedJobs)return 'JOBS_SATURATED';
 // CI bootstrap competes with Core and gets a stricter queue budget.
 if(lane==='ci'&&(capacity.activeRuns>=12||capacity.queuedRuns>=6))return 'CI_QUEUE_BUSY';
 // A single bounded Repair claim can operate during busy Core CI.
 if(['repair','conflict'].includes(lane)&&(capacity.activeRuns>=18||capacity.queuedRuns>=80))return 'REPAIR_QUEUE_BUSY';
 return 'ADMIT';
}
async function snapshot(github,owner,repo){
 const [a,q]=await Promise.all(['in_progress','queued'].map(status=>
  github.rest.actions.listWorkflowRunsForRepo({owner,repo,status,per_page:100})));
 const active=a?.data?.workflow_runs,queued=q?.data?.workflow_runs;
 const aCount=a?.data?.total_count,qCount=q?.data?.total_count;
 if(!Array.isArray(active)||!Array.isArray(queued)||
    !Number.isSafeInteger(aCount)||!Number.isSafeInteger(qCount)||
    aCount>LIMIT.maxJobReads||aCount!==active.length||qCount!==queued.length){
  return {known:false,reason:'INCOMPLETE_RUN_INVENTORY',activeRuns:aCount??null,queuedRuns:qCount??null};
 }
 const batches=await Promise.all(active.map(x=>github.rest.actions.listJobsForWorkflowRun({
  owner,repo,run_id:x.id,per_page:100})));
 const jobs=[];
 for(const result of batches){if(!Array.isArray(result?.data?.jobs)||
    result.data.total_count>100)return {known:false,reason:'INCOMPLETE_JOB_INVENTORY'};
  jobs.push(...result.data.jobs);
 }
 return computeCapacity(active,queued,jobs);
}
module.exports={WORKFLOWS,LIMIT,computeCapacity,admission,snapshot};