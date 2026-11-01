'use strict';
const {REPO,DEFAULT}=require('./ci-pr-task-state.cjs');
const {parseDispatcherLog}=require('./ci-pr-kpi-dispatch.cjs');
async function collectDispatcherEvents({github,owner,repo,runs,jobs,runsComplete=false,jobsComplete=false,maxRequests=40,minRemaining=100}){
 const out={events:[],blocked:{},blockerEvents:[],complete:false,reads:0,reason:null};
 if(owner+'/'+repo!==REPO||!Array.isArray(runs)||!Array.isArray(jobs)||
    !Number.isSafeInteger(maxRequests)||maxRequests<1||maxRequests>100||
    !Number.isSafeInteger(minRemaining)||minRemaining<100){out.reason='INVALID_INPUT';return out;}
 let sound=runsComplete===true&&jobsComplete===true;const seenRuns=new Set(),seenJobs=new Set();
 try{
  for(const run of runs){
   if(run?.name!=='HH PR Control Tower queue dispatcher'||run.event==='pull_request')continue;
   if(!Number.isSafeInteger(run?.id)||seenRuns.has(run.id)||run.repository?.full_name!==REPO||
      run.head_branch!==DEFAULT||!Number.isSafeInteger(run.run_attempt)||run.run_attempt<1){sound=false;continue;}
   seenRuns.add(run.id);
   if(run.status!=='completed'||!['success','skipped'].includes(run.conclusion)){sound=false;continue;}
   const selected=jobs.filter(j=>j.run_id===run.id&&j.name==='dispatch');
   if(!selected.length&&run.conclusion==='skipped')continue;
   const attempts=new Set();
   for(const job of selected){
    if(!Number.isSafeInteger(job.id)||seenJobs.has(job.id)||!Number.isSafeInteger(job.run_attempt)||
       job.run_attempt<1||job.run_attempt>run.run_attempt||attempts.has(job.run_attempt)){
     sound=false;continue;
    }
    seenJobs.add(job.id);attempts.add(job.run_attempt);
    if(job.status!=='completed'){sound=false;continue;}
    if(job.conclusion==='skipped')continue;
    if(job.conclusion!=='success'){sound=false;continue;}
    if(out.reads+2>maxRequests)throw Error('API_BUDGET');
    out.reads++;
    const rate=(await github.rest.rateLimit.get()).data?.rate?.remaining;
    if(!Number.isSafeInteger(rate)||rate<minRemaining)throw Error('RATE_RESERVE_UNVERIFIED');
    out.reads++;
    const response=await github.request('GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs',{owner,repo,job_id:job.id});
    let text=response?.data;
    if(Buffer.isBuffer(text)||text instanceof Uint8Array)text=Buffer.from(text).toString('utf8');
    const parsed=parseDispatcherLog(run,text);
    if(!parsed.complete){sound=false;continue;}
    out.events.push(...parsed.events);
    out.blockerEvents.push({at:parsed.at,blocked:parsed.blocked});
    for(const [name,n] of Object.entries(parsed.blocked)){
     const count=(out.blocked[name]||0)+n;
     if(!Number.isSafeInteger(count)){sound=false;continue;}
     out.blocked[name]=count;
    }
   }
   for(let attempt=1;attempt<=run.run_attempt;attempt++)if(!attempts.has(attempt))sound=false;
  }
  out.complete=sound;out.reason=sound?'COMPLETE':'PARTIAL_EVIDENCE';
 }catch(error){out.reason=String(error?.message||error).slice(0,120);}
 return out;
}
module.exports={collectDispatcherEvents};
