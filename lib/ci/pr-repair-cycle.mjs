// Read-only, evidence-graded CI failure -> repair -> new HEAD -> runner chronology.
// A GitHub lease is ownership, not proof the agent received/read a task;
// a repair-start receipt is a declaration, not measured local editing time.
import {lifecycleConnected, readRepairMarkers} from './pr-loss-metrics.mjs';
import {parseLease, LEASE_MARKER} from './pr-sweep-guard.mjs';

const SHA=/^[a-f0-9]{40}$/i;
const TERMINAL=new Set(['failure','timed_out','action_required','startup_failure']);
const ms=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?Date.parse(value):null;
const iso=value=>ms(value)===null?null:new Date(ms(value)).toISOString();
const pos=value=>Number.isSafeInteger(value)&&value>0;
const ordered=(a,b)=>ms(a)!==null&&ms(b)!==null&&ms(a)<=ms(b);
const minutes=(a,b)=>ordered(a,b)?Math.round((ms(b)-ms(a))/600)/100:null;
const byDate=(a,b)=>ms(a.created_at)-ms(b.created_at)||a.id-b.id;
function completeJobs(records,id){
  const row=records instanceof Map?records.get(id):records?.[id];
  return row&&Number.isSafeInteger(row.total_count)&&row.total_count>0&&
    row.total_count<=100&&Array.isArray(row.jobs)&&row.jobs.length===row.total_count?
    row.jobs:null;
}
function verifiedClaim(comments,head,after,before){
  return (Array.isArray(comments)?comments:[]).flatMap(comment=>{
    if(!pos(comment?.id)||typeof comment.body!=='string'||
       !comment.body.startsWith(LEASE_MARKER+'\n')||
       !ordered(after,comment.created_at)||!ordered(comment.created_at,before)||
       (comment.updated_at&&ms(comment.updated_at)!==ms(comment.created_at)))return [];
    const state=parseLease(comment.body);
    if(!state||state.head_sha!==head||state.last_action!=='claimed')return [];
    return [{at:iso(comment.created_at),owner:state.owner,comment_id:comment.id}];
  }).sort((a,b)=>ms(a.at)-ms(b.at)||a.comment_id-b.comment_id)[0]||null;
}
function observedCommit(timeline,head,after,before){
  // PR timeline is a GitHub commit-event observation, NOT a remote push timestamp.
  if(!Array.isArray(timeline)||timeline.length>=100)return null;
  const events=timeline.filter(e=>e?.event==='committed'&&e.sha===head&&
    ordered(after,e.created_at)&&ordered(e.created_at,before));
  events.sort((a,b)=>ms(a.created_at)-ms(b.created_at));
  return iso(events[0]?.created_at);
}

export function analyzeRepairCycles(pr,runs,jobsByRun,comments=[],timeline=null,
  {runHistoryComplete=false,commentsComplete=false}={}){
  if(!pos(pr?.number)||!SHA.test(pr.head?.sha||'')||
     pr.base?.ref!=='codex/public-book-library'||ms(pr.created_at)===null)
    throw Error('REPAIR_CYCLE_PR_UNVERIFIED');
  const linked=(Array.isArray(runs)?runs:[]).filter(r=>
    r.name==='HH PR core release gate'&&r.event==='pull_request'&&
    (!r.path||String(r.path).split('@')[0]==='.github/workflows/hh-pr-core-release.yml')&&
    lifecycleConnected(r,pr,timeline)&&ordered(pr.created_at,r.created_at)&&
    (!pr.merged_at||ordered(r.created_at,pr.merged_at))).sort(byDate);
  const receipts=readRepairMarkers(comments);
  const cycles=[],seenHead=new Set();
  for(let index=0;index<linked.length;index++){
    const failedRun=linked[index];
    if(!TERMINAL.has(failedRun.conclusion)||failedRun.status!=='completed'||
       seenHead.has(failedRun.head_sha))continue;
    const failJobs=completeJobs(jobsByRun,failedRun.id);
    if(!failJobs)continue;
    const bad=failJobs.filter(j=>pos(j.id)&&TERMINAL.has(j.conclusion)&&
      j.status==='completed'&&iso(j.completed_at)&&ordered(failedRun.created_at,j.completed_at))
      .sort((a,b)=>ms(a.completed_at)-ms(b.completed_at)||a.id-b.id);
    if(!bad.length)continue;
    const first=bad[0],failedAt=iso(first.completed_at);
    seenHead.add(failedRun.head_sha);
    const next=linked.slice(index+1).find(r=>r.head_sha!==failedRun.head_sha&&
      ordered(failedAt,r.created_at))||null;
    const nextAt=iso(next?.created_at);
    const windowEnd=nextAt||iso(pr.merged_at)||iso(new Date().toISOString());
    const receipt=receipts.filter(r=>r.failed_run_id===failedRun.id&&
      r.failed_head_sha===failedRun.head_sha&&ordered(failedAt,r.at)&&
      ordered(r.at,windowEnd)).sort((a,b)=>ms(a.at)-ms(b.at))[0]||null;
    const claim=verifiedClaim(comments,failedRun.head_sha,failedAt,
      receipt?.at||windowEnd);
    // A subsequently edited/released lease cannot prove the first claim's body.
    const repairAt=iso(receipt?.at);
    const commitAt=next?observedCommit(timeline,next.head_sha,failedAt,nextAt):null;
    const nextJobs=next?completeJobs(jobsByRun,next.id):null;
    const jobCreated=nextJobs?.filter(j=>pos(j.id)&&ordered(nextAt,j.created_at))
      .sort((a,b)=>ms(a.created_at)-ms(b.created_at)||a.id-b.id)[0]||null;
    const runnerJob=nextJobs?.filter(j=>pos(j.id)&&ordered(nextAt,j.created_at)&&
      ordered(j.created_at,j.started_at)).sort((a,b)=>ms(a.started_at)-ms(b.started_at)||a.id-b.id)[0]||null;
    const step=Array.isArray(first.steps)?first.steps.find(s=>
      TERMINAL.has(s?.conclusion)&&typeof s.name==='string'):null;
    const times={ci_failed_at:failedAt,lease_claimed_at:claim?.at||null,
      repair_declared_at:repairAt,actual_edit_started_at:null,
      new_head_commit_event_at:commitAt,new_ci_created_at:nextAt,
      first_job_created_at:iso(jobCreated?.created_at),
      first_runner_started_at:iso(runnerJob?.started_at)};
    const spans={failure_to_claim:minutes(times.ci_failed_at,times.lease_claimed_at),
      claim_to_repair_declaration:minutes(times.lease_claimed_at,times.repair_declared_at),
      repair_declaration_to_commit_event:minutes(times.repair_declared_at,times.new_head_commit_event_at),
      commit_event_to_new_ci:minutes(times.new_head_commit_event_at,times.new_ci_created_at),
      workflow_to_first_job:minutes(times.new_ci_created_at,times.first_job_created_at),
      first_runner_job_queue:minutes(runnerJob?.created_at,runnerJob?.started_at),
      actual_edit_work:null};
    cycles.push({failed_head:failedRun.head_sha,new_head:next?.head_sha||null,
      failed_run_id:failedRun.id,next_run_id:next?.id||null,
      failure:{job_id:first.id,job_name:first.name,conclusion:first.conclusion,
        observed_failed_step:step?.name||null,root_cause_verified:false,
        job_url:'https://github.com/andylitvinov-design/books/actions/runs/'+failedRun.id+'/job/'+first.id},
      owner:claim?.owner||null,declared_owner:receipt?.owner||null,
      timestamps:times,durations_minutes:spans,
      evidence:{workflow_and_jobs_linked:true,run_history_complete:runHistoryComplete===true,
        comments_complete:commentsComplete===true&&Array.isArray(comments)&&comments.length<100,
        timeline_complete:Array.isArray(timeline)&&timeline.length<100,
        immutable_lease_claim_id:claim?.comment_id||null,
        repair_declaration_id:receipt?.comment_id||null,
        new_head_event_verified:Boolean(commitAt),
        new_runner_jobs_complete:Boolean(nextJobs),
        agent_received_task_verified:false,actual_edit_start_verified:false,
        new_head_push_at_verified:false},
      note:'Lease = GitHub owner claim, not task receipt. Repair marker = declared start, not observed work. Committed event != push time. Queue delay != proven runner shortage; failed step != confirmed root cause.'});
  }
  return {schema:'HH_PR_REPAIR_CYCLE_V1',pr:pr.number,head:pr.head.sha,
    observed_failed_heads:cycles.length,cycles:cycles.slice(0,12),
    note:'Null means no verified evidence; no lease or repair receipt is never counted as agent idle or as zero work.'};
}