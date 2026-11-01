'use strict';
// Never equate workflow wall time with runner minutes. Only actual job
// intervals are returned; a created-time slice cannot prove old runs did not
// finish in the window, so complete coverage requires full repository history.
async function collectCompletedJobs({github,owner,repo,since,until,maxRequests=80,minRemaining=100}){
 const result={jobs:[],workflowRuns:[],runs:0,complete:false,since,reads:0,remaining:null,reason:null,activeExcluded:0};
 if(owner!=='andylitvinov-design'||repo!=='books'||!Number.isFinite(since)||!Number.isFinite(until)||since>=until||
    !Number.isSafeInteger(maxRequests)||maxRequests<1||maxRequests>200||!Number.isSafeInteger(minRemaining)||minRemaining<100){
  result.reason='INVALID_INPUT';return result;
 }
 let halted=false;
 const read=async fn=>{
  if(halted||result.reads>=maxRequests)throw Error('API_BUDGET');
  result.reads++;const r=await fn();const left=r?.headers?.['x-ratelimit-remaining'];
  if(left===undefined||left===null||!Number.isFinite(Number(left)))throw Error('RATE_RESERVE_UNVERIFIED');
  result.remaining=Number(left);if(result.remaining<minRemaining)halted=true;return r;
 };
 try{
  const metadata=(await read(()=>github.rest.repos.get({owner,repo}))).data;
  const created=Date.parse(metadata?.created_at||'');
  if(metadata?.full_name!==owner+'/'+repo||!Number.isFinite(created))throw Error('REPOSITORY_UNVERIFIED');
  const runIds=new Set(),jobIds=new Set();
  // UTC one-day partitions avoid the 1,000-run search cap when possible.
  // Boundaries are disjoint at GitHub's second precision.
  const floorSince=Math.floor(since/1000)*1000;
  for(let end=Math.floor(until/1000)*1000;end>=floorSince;){
   const begin=Math.max(end-86400000+1000,floorSince);
   const range=new Date(begin).toISOString().replace('.000Z','Z')+'..'+new Date(end).toISOString().replace('.000Z','Z');
   let expected=null,seen=0;
   for(let page=1;page<=10;page++){
    const response=(await read(()=>github.rest.actions.listWorkflowRunsForRepo({owner,repo,created:range,per_page:100,page}))).data;
    if(!Array.isArray(response?.workflow_runs)||response.workflow_runs.length>100||!Number.isSafeInteger(response.total_count)||
       response.total_count<0||response.total_count>1000||(expected!==null&&expected!==response.total_count))throw Error('RUN_INVENTORY_INCOMPLETE');
    expected=response.total_count;seen+=response.workflow_runs.length;
    for(const run of response.workflow_runs){
     const runCreated=Date.parse(run?.created_at||'');
     if(!Number.isSafeInteger(run?.id)||runIds.has(run.id)||run.repository?.full_name!==owner+'/'+repo||
        !Number.isFinite(runCreated)||runCreated<begin||runCreated>end+999)throw Error('RUN_INVENTORY_AMBIGUOUS');
     runIds.add(run.id);result.runs++;result.workflowRuns.push(run);
     if(run.status!=='completed'){result.activeExcluded++;continue;}
     if(run.conclusion==='skipped')continue;
     let jobCount=null,readCount=0;
     for(let jobPage=1;jobPage<=3;jobPage++){
      const data=(await read(()=>github.rest.actions.listJobsForWorkflowRun({owner,repo,run_id:run.id,filter:'all',per_page:100,page:jobPage}))).data;
      if(!Array.isArray(data?.jobs)||data.jobs.length>100||!Number.isSafeInteger(data.total_count)||data.total_count>300||
         (jobCount!==null&&jobCount!==data.total_count))throw Error('JOB_INVENTORY_INCOMPLETE');
      jobCount=data.total_count;readCount+=data.jobs.length;
      for(const job of data.jobs){
       if(!Number.isSafeInteger(job?.id)||jobIds.has(job.id)||job.run_id!==run.id)throw Error('JOB_INVENTORY_AMBIGUOUS');
       jobIds.add(job.id);
       if(job.conclusion==='skipped')continue;
       const queued=Date.parse(job.created_at||''),started=Date.parse(job.started_at||''),ended=Date.parse(job.completed_at||'');
       if(job.status!=='completed'||typeof job.conclusion!=='string'||!job.conclusion||
          typeof job.name!=='string'||!job.name||![queued,started,ended].every(Number.isFinite)||
          queued>started||started>ended)throw Error('JOB_NOT_TERMINAL_OR_INVALID');
       result.jobs.push(job);
      }
      if(readCount===jobCount)break;
      if(data.jobs.length<100||jobPage===3)throw Error('JOB_INVENTORY_INCOMPLETE');
     }
    }
    if(seen===expected)break;
    if(response.workflow_runs.length<100||page===10)throw Error('RUN_INVENTORY_INCOMPLETE');
   }
   end=begin-1000;
  }
  if(result.activeExcluded){result.reason='ACTIVE_RUNS_EXCLUDED';return result;}
  if(since>created){result.reason='HISTORICAL_RUNS_UNVERIFIED';return result;}
  result.complete=true;result.reason='COMPLETE';
 }catch(error){result.reason=String(error?.message||error).slice(0,120);}
 return result;
}
module.exports={collectCompletedJobs};
