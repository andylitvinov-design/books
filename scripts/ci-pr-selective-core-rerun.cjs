'use strict';
/** Only retry one proven infrastructure-interrupted mandatory Core job. */
const MANDATORY=new Set(['core-lint-types-build','hh-specialist','hh-merge-check']);
const AGGREGATES=new Set(['hh-merge-check','hh-core-verified','release-ready']);
function classifyJob(job){
 if(!job||typeof job.name!=='string')return 'unknown';
 if(['queued','waiting','pending','requested'].includes(job.status))return 'queued';
 if(job.status==='in_progress')return 'running';
 if(job.status!=='completed')return 'unknown';
 switch(job.conclusion){
  case 'success':return 'passed';
  case 'failure':return 'failed';
  case 'cancelled':return 'cancelled';
  case 'timed_out':case 'startup_failure':return 'interrupted';
  case 'skipped':return 'skipped';
  default:return 'unknown';
 }
}
function selectInterruptedMandatoryJob(data){
 const jobs=data?.jobs;
 if(!Number.isSafeInteger(data?.total_count)||data.total_count<1||
    data.total_count>100||!Array.isArray(jobs)||jobs.length!==data.total_count)
  return {action:'hold',reason:'JOB_HISTORY_INCOMPLETE'};
 const states=jobs.map(job=>({job,state:classifyJob(job)}));
 if(states.some(x=>x.state==='unknown'))return {action:'hold',reason:'JOB_STATE_UNKNOWN'};
 if(states.some(x=>x.state==='queued'||x.state==='running'))
  return {action:'wait',reason:'JOB_QUEUED_OR_RUNNING'};
 if(states.some(x=>x.state==='cancelled'))
  return {action:'hold',reason:'CANCELLED_NOT_RETRYABLE'};
 const independent=states.filter(x=>x.state==='failed'&&!AGGREGATES.has(x.job.name));
 if(independent.length)return {action:'repair',reason:'INDEPENDENT_JOB_FAILED'};
 const interrupted=states.filter(x=>x.state==='interrupted');
 if(interrupted.length!==1||!MANDATORY.has(interrupted[0]?.job?.name))
  return {action:interrupted.length?'hold':'repair',
   reason:interrupted.length?'NOT_ONE_MANDATORY_INTERRUPTION':'NO_TRANSIENT_MANDATORY_JOB'};
 const job=interrupted[0].job;
 if(!Number.isSafeInteger(job.id)||job.id<1||job.status!=='completed')
  return {action:'hold',reason:'INTERRUPTED_JOB_ID_UNVERIFIED'};
 if(states.filter(x=>x.job.name===job.name).length!==1)
  return {action:'hold',reason:'DUPLICATE_MANDATORY_JOB'};
 return {action:'rerun_job',reason:'SINGLE_MANDATORY_INFRA_INTERRUPTION',jobId:job.id,jobName:job.name};
}
module.exports={classifyJob,selectInterruptedMandatoryJob};
