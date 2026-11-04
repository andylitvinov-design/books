'use strict';
// The already-running Core completion handler writes timestamps to a persistent
// GitHub issue. No new runners, schedules, databases, or paid APIs.
const ISSUE=3419,OWNER='andylitvinov-design',REPO='books';
const SCHEMA='HH_CORE_CI_JOURNEY_SHARD_V1',PREFIX='<!-- HH_CORE_CI_JOURNEY_SHARD_V1:';
const BASE='codex/public-book-library';
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/i.test(x);
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const number=x=>Number.isSafeInteger(x)&&x>0;
const isoBucket=at=>{const d=new Date(at);d.setUTCHours(Math.floor(d.getUTCHours()/2)*2,0,0,0);return d.toISOString().slice(0,13);};
function parseShard(body,bucket){
 const prefix=PREFIX+bucket+' -->';
 if(typeof body!=='string'||!body.startsWith(prefix+'\n'))return null;
 const data=JSON.parse(body.slice(prefix.length+1));
 if(data?.schema!==SCHEMA||data.bucket!==bucket||!Array.isArray(data.runs)||data.runs.length>160)
  throw Error('BAD_ARCHIVE_SHARD');
 return data;
}
function formatShard(bucket,runs){
 const body=PREFIX+bucket+' -->\n'+JSON.stringify({schema:SCHEMA,bucket,runs});
 if(body.length>58000)throw Error('ARCHIVE_SHARD_SIZE_LIMIT');
 return body;
}
function fromEvent(event){
 if(!event||event.name!=='HH PR core release gate'||event.event!=='pull_request'||
   event.status!=='completed'||!number(event.id)||!number(event.run_attempt)||
   !iso(event.created_at)||!iso(event.updated_at)||
   event.repository?.full_name!==OWNER+'/'+REPO||
   event.head_repository?.full_name!==OWNER+'/'+REPO)return null;
 const refs=(event.pull_requests||[]).filter(x=>number(x.number)&&x.base?.ref===BASE&&
    sha(x.head?.sha)&&typeof x.head?.ref==='string'&&x.head.ref===event.head_branch);
 const unique=[...new Map(refs.map(x=>[x.number,x])).values()];
 if(unique.length!==1)return null;
 return {pr:unique[0].number,source_head:unique[0].head.sha,head_ref:unique[0].head.ref,
   base:BASE,run_id:event.id,attempt:event.run_attempt,queued_at:iso(event.created_at),
   workflow_url:'https://github.com/'+OWNER+'/'+REPO+'/actions/runs/'+event.id,
   conclusion:String(event.conclusion||'unknown').slice(0,24)};
}
function getJobs(response,run){
 const data=response?.data;
 if(!Array.isArray(data?.jobs)||!Number.isSafeInteger(data.total_count)||
   data.total_count!==data.jobs.length||data.total_count>100)throw Error('INCOMPLETE_RUN_JOBS');
 const rows=[];let incomplete=false;
 for(const j of data.jobs){
   if(j.status==='skipped')continue;
   const created=iso(j.created_at),started=iso(j.started_at),done=iso(j.completed_at);
   if(!number(j.id)||!created||!started||!done||Date.parse(created)>Date.parse(started)||
     Date.parse(started)>Date.parse(done)){incomplete=true;continue;}
   rows.push({id:j.id,name:String(j.name||'job').slice(0,70),queued_at:created,started_at:started,
     completed_at:done,conclusion:String(j.conclusion||'unknown').slice(0,24),
     url:'https://github.com/'+OWNER+'/'+REPO+'/actions/runs/'+run.run_id+'/job/'+j.id});
 }
 if(!rows.length)throw Error('NO_CONFIRMED_JOBS');
 if(rows.length>30)throw Error('TOO_MANY_JOBS');
 const completed_at=rows.map(x=>x.completed_at).sort().at(-1);
 if(Date.parse(completed_at)<Date.parse(run.queued_at))throw Error('JOB_BEFORE_RUN');
 return {jobs:rows,completed_at,partial_jobs:incomplete};
}
async function archive({github,context,minRemaining=80}){
 if(!github?.rest?.issues||!context||context.repo?.owner!==OWNER||context.repo?.repo!==REPO||
    context.eventName!=='workflow_run'||context.ref!=='refs/heads/codex/bootstrap-books')
    return {status:'UNTRUSTED_CONTEXT'};
 let row=fromEvent(context.payload?.workflow_run);
 if(!row)return {status:'UNVERIFIED_PR_ASSOCIATION'};
 if(!['success','failure','timed_out','startup_failure'].includes(row.conclusion))
    return {status:'NON_TERMINAL_CONCLUSION'};
 const {owner,repo}=context.repo;
 // At most 3 GETs and 1 comment write; never touch a PR or its CI status.
 const response=await github.rest.actions.listJobsForWorkflowRun({owner,repo,
    run_id:row.run_id,per_page:100,filter:'latest'});
 row={...row,...getJobs(response,row)};
 const {data:pull}=await github.rest.pulls.get({owner,repo,pull_number:row.pr});
 const created=iso(pull?.created_at);
 if(!created||pull?.base?.ref!==BASE||pull?.head?.repo?.full_name!==OWNER+'/'+REPO||
    pull.head.ref!==row.head_ref||Date.parse(created)>Date.parse(row.queued_at))
    return {status:'PR_IDENTITY_MISMATCH'};
 row.pr_created_at=created;row.merged_at=iso(pull?.merged_at);
 row.current_head=(pull.head.sha===row.source_head);
 const bucket=isoBucket(row.queued_at);
 const since=new Date(Date.now()-96*3600000).toISOString();
 const comments=await github.rest.issues.listComments({
   owner,repo,issue_number:ISSUE,per_page:100,page:1,since
 });
 const remaining=Number(comments.headers?.['x-ratelimit-remaining']);
 if(!Number.isFinite(remaining)||remaining<minRemaining)return {status:'RATE_RESERVE',remaining};
 if(!Array.isArray(comments.data)||comments.data.length>=100)
    return {status:'ARCHIVE_PAGINATION_UNVERIFIED'};
 const hits=comments.data.filter(x=>typeof x.body==='string'&&
    x.body.startsWith(PREFIX+bucket+' -->\n'));
 if(hits.length>1)return {status:'DUPLICATE_SHARDS'};
 const shard=hits.length?parseShard(hits[0].body,bucket):{schema:SCHEMA,bucket,runs:[]};
 if(!shard)return {status:'SHARD_INVALID'};
 const next=[...shard.runs.filter(x=>x.run_id!==row.run_id||x.attempt!==row.attempt),row]
   .sort((a,b)=>Date.parse(a.queued_at)-Date.parse(b.queued_at)||a.run_id-b.run_id);
 const body=formatShard(bucket,next);
 if(hits.length)await github.rest.issues.updateComment({
   owner,repo,comment_id:hits[0].id,body
 });
 else await github.rest.issues.createComment({owner,repo,issue_number:ISSUE,body});
 return {status:'ARCHIVED',pr:row.pr,run_id:row.run_id,attempt:row.attempt,
   shard:bucket,partial_jobs:row.partial_jobs,rows:next.length};
}
module.exports={archive,fromEvent,getJobs,parseShard,formatShard,isoBucket,ISSUE,SCHEMA};
