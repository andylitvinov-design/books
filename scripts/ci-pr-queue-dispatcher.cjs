'use strict';
/** Trusted default-branch single-writer queue dispatcher: no source checkout, no merge. */
const {REPO,PROD,DEFAULT,SHA,laneOf,validPR,taskFor,reservation,commentBody,reservationStatus}=require('./ci-pr-task-state.cjs');
const {priorityFor,rankedCandidates}=require('./ci-pr-priority.cjs');
const {WORKFLOWS,admission,snapshot}=require('./ci-pr-capacity.cjs');
const WORKER_PATH={repair:'hh-pr-repair-worker.yml',conflict:'hh-pr-repair-worker.yml',ci:'hh-pr-ci-worker.yml'};
const MAX_DISPATCH=2, MAX_INSPECT=16, MAX_API=85, MIN_RATE=100;
const RELEVANT=new Set(['HH PR 10-minute watchdog','HH PR source Repair Worker','HH zero-cost PR CI worker']);
function trustedContext(context){
 if(context.repo?.owner+'/'+context.repo?.repo!==REPO||
    context.ref!=='refs/heads/'+DEFAULT)return false;
 if(context.eventName==='workflow_run'){
  const w=context.payload?.workflow_run;
  return !!(w&&RELEVANT.has(w.name)&&w.status==='completed'&&
    w.repository?.full_name===REPO&&
    (!w.head_repository?.full_name||w.head_repository.full_name===REPO));
 }
 return ['schedule','push','workflow_dispatch'].includes(context.eventName);
}
function planCandidates(prs,now){
 const available=prs.filter(pr=>validPR(pr)&&laneOf(pr));
 const ranked=rankedCandidates(available,now);
 if(!ranked.length)return [];
 // Three high-impact entries plus rotating fairness candidates: low priority
 // cannot monopolize the queue, nor starve forever behind a long P1 backlog.
 const fast=ranked.slice(0,Math.min(3,ranked.length));
 const chosen=new Set(fast.map(x=>x.number));
 const rest=ranked.filter(x=>!chosen.has(x.number)).sort((a,b)=>a.number-b.number);
 const rotationSize=Math.min(MAX_INSPECT-fast.length,rest.length);
 const offset=rest.length?(Math.floor(now/600000)*Math.max(1,rotationSize))%rest.length:0;
 const rotating=Array.from({length:rotationSize},(_,i)=>rest[(offset+i)%rest.length]);
 return [...fast,...rotating].map(pr=>taskFor(pr,priorityFor(pr,now)));
}
async function run({github,core,context,now=Date.now(),dryRun=false,capacityFn=snapshot}){
 const summary={schema:'HH_CONTROL_DISPATCH_V1',checkedAt:new Date(now).toISOString(),
  dryRun,discovered:0,production:0,actionable:0,candidates:0,
  inspected:0,dispatchAccepted:0,wouldDispatch:0,blocked:{},
  workerRuns:[],apiRequests:0,apiRemaining:null,cronState:'NOT_PROBED',reason:null};
 const log=s=>core.info('HH_CONTROL_TOWER: '+s);
 const blocked=reason=>{summary.blocked[reason]=(summary.blocked[reason]||0)+1;};
 const finish=async()=>{log(JSON.stringify(summary));await core.summary
   .addHeading('HH Control Tower 2.0 — queue dispatch')
   .addCodeBlock(JSON.stringify(summary,null,2)).write();return summary;};
 if(!trustedContext(context)){summary.reason='UNTRUSTED_EVENT';return finish();}
 const {owner,repo}=context.repo;let exhausted=false;
 const limited=async(name,fn)=>{
  if(exhausted||summary.apiRequests>=MAX_API){exhausted=true;throw Error('HH_CONTROL_API_BUDGET:'+name);}
  summary.apiRequests++;
  const result=await fn();const rate=result?.headers?.['x-ratelimit-remaining'];
  if(rate!==undefined&&rate!==null&&Number.isFinite(Number(rate))){
   summary.apiRemaining=Number(rate);if(summary.apiRemaining<MIN_RATE)exhausted=true;
  }
  return result;
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
 }catch(err){summary.reason='INVENTORY_UNVERIFIED: '+err.message;return finish();}
 summary.discovered=prs.length;
 const production=prs.filter(pr=>pr.base?.ref===PROD);
 summary.production=production.length;
 const candidates=planCandidates(production,now);
 summary.actionable=production.filter(pr=>validPR(pr)&&laneOf(pr)).length;
 summary.candidates=candidates.length;
 if(!candidates.length){summary.reason='NO_ACTIONABLE_PR';return finish();}
 let capacity;
 try{capacity=await capacityFn(github,owner,repo);}catch(err){summary.reason='CAPACITY_UNVERIFIED: '+err.message;return finish();}
 if(!capacity?.known){summary.reason='CAPACITY_UNVERIFIED: '+(capacity?.reason||'unknown');return finish();}
 summary.capacity={activeRuns:capacity.activeRuns,queuedRuns:capacity.queuedRuns,
  runningJobs:capacity.runningJobs,queuedJobs:capacity.queuedJobs,
  inventoryConfidence:capacity.inventoryConfidence||'VERIFIED',
  unknownActiveRuns:capacity.unknownActiveRuns||0,
  unknownQueuedRuns:capacity.unknownQueuedRuns||0,
  conservativeJobPressure:capacity.conservativeJobPressure??null};
 const usedWorkers=new Set();
 for(const task of candidates){
  if(summary.dispatchAccepted>=MAX_DISPATCH||exhausted)break;
  if(!task){blocked('UNCLASSIFIED');continue;}
  summary.inspected++;
  const permission=admission(task.lane,capacity);
  if(permission!=='ADMIT'){blocked(permission);continue;}
  const worker=WORKFLOWS[task.lane];
  if(usedWorkers.has(worker)){blocked('LANE_ALREADY_SELECTED');continue;}
  const listed=production.find(pr=>pr.number===task.pr_number);
  // A parent PR with open stacked children cannot be rewritten safely.
  if(prs.some(pr=>pr.number!==task.pr_number&&pr.base?.ref===task.head_ref)){
   blocked('STACKED_PARENT');continue;
  }
  let fresh;
  try{fresh=(await limited('live-pr',()=>github.rest.pulls.get({owner,repo,pull_number:task.pr_number}))).data;}
  catch(err){blocked('LIVE_PR_UNAVAILABLE');log('PR #'+task.pr_number+' unavailable '+err.message);continue;}
  if(!fresh||fresh.head?.sha!==task.head_sha||fresh.base?.ref!==PROD||
     !validPR(fresh)||laneOf(fresh)!==task.lane){blocked('STALE_SHA_OR_STATE');continue;}
  if(task.lane==='conflict'&&!(fresh.mergeable===false&&fresh.mergeable_state==='dirty')){
   blocked('CONFLICT_NOT_VERIFIED');continue;
  }
  let comments;
  try{const data=(await limited('read-owner',()=>github.rest.issues.listComments({
    owner,repo,issue_number:task.pr_number,per_page:100,page:1}))).data;
   if(!Array.isArray(data)||data.length>=100){blocked('OWNER_HISTORY_INCOMPLETE');continue;}
   comments=data;
  }catch(err){blocked('OWNER_HISTORY_UNAVAILABLE');continue;}
  const status=reservationStatus(task,comments,now);
  if(status!=='FREE'){blocked(status);continue;}
  // Source must have an exact-HEAD trusted Watchdog diagnosis; labels alone
  // are stale hints and must not give privileged source write permission.
  if(task.lane==='repair'&&!comments.some(c=>String(c.body||'').includes(
    '<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+task.head_sha+' -->'))){
   blocked('SOURCE_PROOF_MISSING');continue;
  }
  let recent;
  try{const r=(await limited('worker-history',()=>github.request(
    'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
     owner,repo,workflow_id:WORKER_PATH[task.lane],per_page:5}))).data;
   if(!Array.isArray(r?.workflow_runs)){blocked('WORKER_HISTORY_INCOMPLETE');continue;}
   recent=r.workflow_runs;
  }catch(err){blocked('WORKER_HISTORY_UNAVAILABLE');continue;}
  if(recent.some(x=>['in_progress','queued','requested','waiting','pending'].includes(x.status)
     ||(Number.isFinite(Date.parse(x.created_at))&&now-Date.parse(x.created_at)<120000))){
   blocked('WORKER_BUSY_OR_COOLDOWN');continue;
  }
  if(dryRun){summary.wouldDispatch++;summary.workerRuns.push({task_key:task.task_key,
   pr_number:task.pr_number,lane:task.lane,outcome:'WOULD_DISPATCH'});usedWorkers.add(worker);continue;}
  // The trusted single writer reserves the exact task before dispatch.
  // On interrupted dispatch this reservation fails closed pending a human
  // inspection of worker history: never duplicate a possible source write.
  const claim=reservation(task,now,context.runId||'unspecified');
  try{
   await limited('reserve-task',()=>github.rest.issues.createComment({
    owner,repo,issue_number:task.pr_number,body:commentBody(claim)}));
  }catch(err){blocked('RESERVATION_FAILED');log('Reserve #'+task.pr_number+' '+err.message);continue;}
  const inputs={pr_number:String(task.pr_number),expected_sha:task.head_sha,
    task_key:task.task_key,dry_run:'false'};
  try{
   await limited('dispatch-worker',()=>github.rest.actions.createWorkflowDispatch({
    owner,repo,workflow_id:WORKER_PATH[task.lane],ref:DEFAULT,inputs}));
   summary.dispatchAccepted++;
   summary.workerRuns.push({task_key:task.task_key,pr_number:task.pr_number,
    head_sha:task.head_sha,lane:task.lane,outcome:'DISPATCH_ACCEPTED'});
   usedWorkers.add(worker);
   log('DISPATCH_ACCEPTED '+task.lane+' #'+task.pr_number+' '+task.head_sha.slice(0,12));
  }catch(err){blocked('DISPATCH_DENIED');log('Dispatch #'+task.pr_number+' '+err.message);}
 }
 summary.reason||=summary.dispatchAccepted?'DISPATCH_ACCEPTED':
   summary.wouldDispatch?'DRY_RUN_CANDIDATES':'NO_SAFE_DISPATCH';
 return finish();
}
module.exports={trustedContext,planCandidates,run};