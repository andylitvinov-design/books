'use strict';
/**
 * Exact-PR GitHub pull_request_target -> Conflict Repair handoff.
 * Run only trusted default-branch code; never checkout or execute PR head.
 * This is a one-PR event adapter for the EXISTING signed dispatcher lease,
 * not a second queue, full PR scan, source writer or CI rerun.
 */
const REPO='andylitvinov-design/books';
const PROD='codex/public-book-library';
const SHA=/^[0-9a-f]{40}$/i;
const ACTIONS=new Set(['opened','reopened','synchronize','ready_for_review']);
const HOLDS=new Set(['hh:hold','hh:repair-manual','hh:blocked','hh:worker-claimed']);
const CONFLICT='hh:conflict-repair-needed';
function trustedConflictEvent(context){
 const pr=context?.payload?.pull_request;
 return Boolean(context?.repo?.owner+'/'+context?.repo?.repo===REPO &&
  context.eventName==='pull_request_target' &&
  context.ref==='refs/heads/'+PROD &&
  ACTIONS.has(context.payload?.action) &&
  Number.isSafeInteger(pr?.number)&&pr.number>0 &&
  pr.state==='open'&&!pr.draft&&pr.base?.ref===PROD &&
  pr.head?.repo?.full_name===REPO&&SHA.test(pr.head?.sha||''));
}
function currentDirty(pr,eventPr){
 return Boolean(pr&&pr.number===eventPr.number&&pr.state==='open'&&!pr.draft&&
  pr.base?.ref===PROD&&pr.head?.repo?.full_name===REPO&&
  pr.user?.login===REPO.split('/')[0]&&pr.head?.sha===eventPr.head.sha&&
  pr.head?.ref===eventPr.head.ref&&
  pr.mergeable===false&&pr.mergeable_state==='dirty');
}
async function run({github,core,context,dryRun=false,dispatchRun=null,readPr=null}={}){
 const result={schema:'HH_CONFLICT_EVENT_HANDOFF_V1',outcome:'UNVERIFIED_EVENT',
  prNumber:null,headSha:null,labelAdded:false,dispatchAccepted:0,
  manualConflictHandoffs:0,reason:null};
 if(!trustedConflictEvent(context))return result;
 const eventPr=context.payload.pull_request;
 const {owner,repo}=context.repo;
 result.prNumber=eventPr.number;result.headSha=eventPr.head.sha;
 const read=readPr||(()=>github.rest.pulls.get({owner,repo,pull_number:eventPr.number}));
 let response;
 try{response=await read();}catch(error){
  result.outcome='PR_READ_UNAVAILABLE';result.reason=String(error.message||error).slice(0,180);
  return result;
 }
 let pr=response?.data;
 if(!currentDirty(pr,eventPr)){
  result.outcome=pr?.head?.sha!==eventPr.head.sha?'STALE_EVENT':
   pr?.mergeable===null?'MERGEABILITY_UNKNOWN_BACKSTOP':'NO_VERIFIED_DIRTY_CONFLICT';
  return result;
 }
 const labels=new Set((pr.labels||[]).map(x=>x.name));
 if([...HOLDS].some(name=>labels.has(name))){
  result.outcome='BLOCKED_EXISTING_OWNER_OR_POLICY';return result;
 }
 if(!labels.has(CONFLICT)){
  if(dryRun){result.outcome='WOULD_ROUTE_CONFLICT';return result;}
  try{
   await github.rest.issues.addLabels({owner,repo,issue_number:eventPr.number,labels:[CONFLICT]});
  }catch(error){
   result.outcome='CONFLICT_LABEL_WRITE_UNAVAILABLE';
   result.reason=String(error.message||error).slice(0,180);
   return result;
  }
  result.labelAdded=true;
  // Never dispatch based solely on label-write HTTP acceptance.
  // Re-read the exact HEAD and current label before obtaining a worker lease.
  try{response=await read();}catch(error){
   result.outcome='LABEL_READBACK_UNAVAILABLE';return result;
  }
  pr=response?.data;
  if(!currentDirty(pr,eventPr)||
     !(pr.labels||[]).some(label=>label.name===CONFLICT)){
   result.outcome='CONFLICT_LABEL_READBACK_UNVERIFIED';return result;
  }
 }
 const dispatch=dispatchRun||require('./ci-pr-queue-dispatcher.cjs').run;
 try{
  const routed=await dispatch({github,core,context,dryRun,
   focusPrNumber:eventPr.number,focusPrSnapshot:pr});
  result.dispatchAccepted=Number(routed?.dispatchAccepted||0);
  result.manualConflictHandoffs=Number(routed?.manualConflictHandoffs||0);
  result.outcome=result.manualConflictHandoffs>0?'MANUAL_CONFLICT_HANDOFF':
   result.dispatchAccepted>0?'DISPATCH_ACCEPTED':
   'CONFLICT_QUEUE_PENDING_OR_BLOCKED';
  result.reason=routed?.reason||null;
  result.blocked=routed?.blocked||{};
 }catch(error){
  result.outcome='DISPATCH_UNAVAILABLE';
  result.reason=String(error.message||error).slice(0,180);
 }
 return result;
}
module.exports={trustedConflictEvent,currentDirty,run};
