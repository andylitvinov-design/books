'use strict';
/**
 * HH_PR_DIRECTION_EVENT_SEED_V1
 * An exact-HEAD, metadata-only label primer inside the EXISTING production
 * pull_request_target Watchdog event job. No new runner, workflow or polling.
 *
 * Labels are a current queue index, NEVER the timestamp of CI/repair/merge.
 * GitHub workflow/job/timeline events provide the historical phase clocks.
 */
const {desiredLabels,managedLabels,SHA}=require('./ci-pr-priority.cjs');
const REPO='andylitvinov-design/books';
const PROD='codex/public-book-library';
const ACTIONS=new Set(['opened','reopened','synchronize','ready_for_review']);
const PREFIXES=['hh:direction:','hh:priority:','hh:merge-priority:','hh:merge-stage:'];

function trustedEvent(context){
 const pr=context?.payload?.pull_request;
 return context?.repo?.owner+'/'+context?.repo?.repo===REPO &&
  context.eventName==='pull_request_target' &&
  context.ref==='refs/heads/'+PROD &&
  ACTIONS.has(context.payload?.action) &&
  Number.isSafeInteger(pr?.number)&&pr.number>0 &&
  pr.state==='open'&&pr.base?.ref===PROD &&
  pr.head?.repo?.full_name===REPO&&
  typeof pr.head.ref==='string'&&pr.head.ref.length>0&&
  SHA.test(pr.head.sha||'');
}
function sameHead(pr, eventPr){
 return Boolean(pr&&pr.number===eventPr.number&&pr.state==='open'&&
  pr.base?.ref===PROD&&pr.head?.repo?.full_name===REPO&&
  pr.head?.sha===eventPr.head.sha&&pr.head?.ref===eventPr.head.ref);
}
async function run({github,context,dryRun=false}={}){
 const out={schema:'HH_PR_DIRECTION_EVENT_SEED_V1',
  status:'IGNORED',pr:null,head:null,added:[],reason:null};
 if(!trustedEvent(context))return out;
 const eventPr=context.payload.pull_request;
 const {owner,repo}=context.repo;
 out.pr=eventPr.number;out.head=eventPr.head.sha;
 // One current-HEAD read, bounded to this exact PR. Never scan the backlog.
 const response=await github.rest.pulls.get({owner,repo,pull_number:eventPr.number});
 const pr=response?.data;
 if(!sameHead(pr,eventPr)){
  out.status='STALE_OR_CLOSED';return out;
 }
 const classification=desiredLabels(pr);
 if(classification.conflicted){
  out.status='OWNER_OVERRIDE_CONFLICT';return out;
 }
 const present=new Set((pr.labels||[]).map(x=>x?.name).filter(Boolean));
 // Never add a second competing stage/direction/rank. The scheduled owner
 // is the only writer allowed to replace an existing classification.
 const managed=managedLabels(pr);
 for(const desired of classification.desired){
  const prefix=PREFIXES.find(p=>desired.startsWith(p));
  if(prefix && managed.some(name=>name.startsWith(prefix)&&name!==desired)){
   out.status='DEFER_TO_DIRECTION_WATCHER';
   out.reason='EXISTING_MANAGED_LABEL_MISMATCH';return out;
  }
 }
 const missing=classification.desired.filter(name=>!present.has(name));
 if(!missing.length){out.status='ALREADY_CLASSIFIED';return out;}
 out.added=missing;
 if(dryRun){out.status='WOULD_SEED';return out;}
 // At most four informational labels in ONE existing-event write. No CI wake,
 // branch update, comment or paid resource.
 await github.rest.issues.addLabels({
  owner,repo,issue_number:eventPr.number,labels:missing
 });
 out.status='SEEDED';return out;
}
module.exports={run,trustedEvent,sameHead};
