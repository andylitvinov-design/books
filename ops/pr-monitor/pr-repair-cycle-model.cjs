'use strict';
// Read-only drilldown. Uses ONLY the GitHub records already read by /api/pr-attribution.
// A lease is not task delivery; a declaration is not local editing; a commit
// timeline event is not an independently verified remote push timestamp.
const SHA=/^[0-9a-f]{40}$/i;
const FAIL=new Set(['failure','timed_out','startup_failure','action_required']);
const REPO='andylitvinov-design/books';
const CORE='.github/workflows/hh-pr-core-release.yml';
const clock=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))?Date.parse(s):null;
const time=s=>clock(s)===null?null:new Date(clock(s)).toISOString();
const inside=(a,x,b)=>clock(a)!==null&&clock(x)!==null&&clock(b)!==null&&clock(a)<=clock(x)&&clock(x)<=clock(b);
const mins=(a,b)=>clock(a)!==null&&clock(b)!==null&&clock(a)<=clock(b)?Math.round((clock(b)-clock(a))/600)/100:null;
const positive=n=>Number.isSafeInteger(n)&&n>0;
// GitHub job listing can include EVERY attempt of the same workflow run.
// Never attribute an earlier failed attempt to the last run conclusion/HEAD.
const sameAttempt=(run,job)=>positive(run?.run_attempt)&&
  positive(job?.run_attempt)&&run.run_attempt===job.run_attempt;
function validRun(r,pr,end){
 const l=Array.isArray(r?.pull_requests)&&r.pull_requests.length===1?r.pull_requests[0]:null;
 return positive(r?.id)&&positive(r.run_attempt)&&r.event==='pull_request'&&r.name==='HH PR core release gate'&&
   String(r.path||'').split('@')[0]===CORE&&
   r.repository?.full_name===REPO&&r.head_repository?.full_name===REPO&&
   l?.number===pr.number&&l.base?.ref==='codex/public-book-library'&&
   l.head?.ref===pr.head?.ref&&SHA.test(l.head?.sha||'')&&
   (r.head_sha===l.head.sha||Array.isArray(r.verified_merge_parents)&&
    r.verified_merge_parents.length===2&&r.verified_merge_parents[1]===l.head.sha)&&
   inside(pr.created_at,r.created_at,end);
}
function marker(comments,prefix,after,before,complete,predicate){
 if(!complete)return null;
 const found=[];
 for(const c of comments){
   if(!positive(c?.id)||!inside(after,c.created_at,before)||
      c.updated_at!==c.created_at||typeof c.body!=='string'||
      !c.body.startsWith(prefix+'\n'))continue;
   let value;try{value=JSON.parse(c.body.slice(prefix.length+1));}catch{continue;}
   if(!predicate(value))continue;
   found.push({at:time(c.created_at),id:c.id,owner:value.owner||null,
    url:typeof c.html_url==='string'?c.html_url:null});
 }
 found.sort((a,b)=>clock(a.at)-clock(b.at)||a.id-b.id);
 return found[0]||null;
}
function analyzeRepairCycles({pr,runs=[],jobs=[],comments=[],timeline=null,
 commentsComplete=false,runHistoryComplete=false}={}){
 if(!positive(pr?.number)||pr.base?.ref!=='codex/public-book-library'||
    !SHA.test(pr.head?.sha||'')||clock(pr.created_at)===null)
   throw Error('REPAIR_CYCLE_PR_UNVERIFIED');
 const end=pr.merged_at||pr.closed_at||new Date().toISOString();
 const linked=(Array.isArray(runs)?runs:[]).filter(r=>validRun(r,pr,end))
   .sort((a,b)=>clock(a.created_at)-clock(b.created_at)||a.id-b.id);
 const seen=new Set(),out=[],completeComments=commentsComplete&&
   Array.isArray(comments)&&comments.length<100;
 const completeTimeline=Array.isArray(timeline)&&timeline.length<100;
 for(let i=0;i<linked.length;i++){
   const r=linked[i],failedHead=r.pull_requests[0].head.sha;
   if(seen.has(failedHead)||r.status!=='completed'||!FAIL.has(r.conclusion))continue;
   const failedJobs=(Array.isArray(jobs)?jobs:[]).filter(j=>j?.run_id===r.id&&
     positive(j.id)&&sameAttempt(r,j)&&j.status==='completed'&&FAIL.has(j.conclusion)&&
     inside(r.created_at,j.completed_at,end))
     .sort((a,b)=>clock(a.completed_at)-clock(b.completed_at)||a.id-b.id);
   if(!failedJobs.length)continue;
   seen.add(failedHead);
   const job=failedJobs[0],failedAt=time(job.completed_at);
   const next=linked.slice(i+1).find(x=>x.pull_requests[0].head.sha!==failedHead&&
     clock(x.created_at)>=clock(failedAt))||null;
   const nextHead=next?.pull_requests[0]?.head?.sha||null,newCi=time(next?.created_at);
   const claim=marker(comments,'<!-- HH_PR_SWEEP_LEASE_V1 -->',failedAt,newCi||end,completeComments,
     v=>v?.schema==='HH_PR_SWEEP_LEASE_V1'&&v.head_sha===failedHead&&
       v.last_action==='claimed'&&SHA.test(v.base_sha||'')&&
       /^[A-Za-z0-9_.-]{2,80}$/.test(v.owner||'')&&clock(v.expires_at)!==null);
   const receipt=marker(comments,'<!-- HH_PR_REPAIR_STARTED_V1 -->',failedAt,newCi||end,completeComments,
     v=>v?.schema==='HH_PR_REPAIR_STARTED_V1'&&v.action==='repair_started'&&
       v.failed_run_id===r.id&&v.failed_head_sha===failedHead);
   const event=nextHead&&completeTimeline?timeline.filter(e=>e?.event==='committed'&&
     e.sha===nextHead&&inside(failedAt,e.created_at,newCi))
     .sort((a,b)=>clock(a.created_at)-clock(b.created_at))[0]:null;
   const committed=time(event?.created_at);
   const afterJobs=next?(Array.isArray(jobs)?jobs:[]).filter(j=>j?.run_id===next.id&&
     positive(j.id)&&sameAttempt(next,j)&&inside(next.created_at,j.created_at,end)):[];
   const firstJob=afterJobs.filter(j=>time(j.created_at))
     .sort((a,b)=>clock(a.created_at)-clock(b.created_at)||a.id-b.id)[0]||null;
   const runner=afterJobs.filter(j=>inside(j.created_at,j.started_at,end))
     .sort((a,b)=>clock(a.started_at)-clock(b.started_at)||a.id-b.id)[0]||null;
   const step=Array.isArray(job.steps)?job.steps.find(s=>FAIL.has(s?.conclusion)&&
     typeof s.name==='string'):null;
   out.push({failed_head:failedHead,next_head:nextHead,failed_run_id:r.id,
     next_run_id:next?.id||null,
     failed_job:{id:job.id,name:String(job.name||'').slice(0,120),
       step:step?.name?.slice(0,120)||null,conclusion:job.conclusion,
       url:'https://github.com/'+REPO+'/actions/runs/'+r.id+'/job/'+job.id,
       root_cause_verified:false},
     owner_claimed:claim?.owner||null,owner_declared:receipt?.owner||null,
     timestamps:{ci_failed_at:failedAt,owner_claimed_at:claim?.at||null,
       repair_declared_at:receipt?.at||null,local_edit_started_at:null,
       new_head_commit_event_at:committed,new_head_push_at:null,
       new_ci_created_at:newCi,first_job_created_at:time(firstJob?.created_at),
       runner_started_at:time(runner?.started_at)},
     durations_minutes:{failure_to_claim:mins(failedAt,claim?.at),
       claim_to_repair:mins(claim?.at,receipt?.at),
       repair_to_commit_event:mins(receipt?.at,committed),
       commit_event_to_ci:mins(committed,newCi),
       ci_to_job_created:mins(newCi,firstJob?.created_at),
       job_created_to_runner:mins(runner?.created_at,runner?.started_at),local_edit_work:null},
     links:{claim:claim?.url||null,repair:receipt?.url||null,
       next_ci:next?'https://github.com/'+REPO+'/actions/runs/'+next.id:null,
       next_head:nextHead?'https://github.com/'+REPO+'/commit/'+nextHead:null},
     evidence:{claim_immutable:Boolean(claim),repair_declaration_immutable:Boolean(receipt),
       commit_event_verified:Boolean(committed),comments_complete:completeComments,
       timeline_complete:completeTimeline,run_history_complete:runHistoryComplete===true,
       agent_received_task_verified:false,actual_edit_started_verified:false,
       new_head_push_time_verified:false}});
 }
 return {schema:'HH_PR_REPAIR_CYCLE_V1',pr:pr.number,observed_failed_heads:out.length,
   cycles:out.slice(0,8),source:'EXISTING_GITHUB_READS_NO_NEW_CALLS',
   note:'Owner lease is not task delivery. Repair marker is declaration, not edit work. GitHub committed event is not push time. Missing is not zero.'};
}
module.exports={analyzeRepairCycles};