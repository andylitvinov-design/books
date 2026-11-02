'use strict';
/**
 * A genuine CI Worker schedule tick is a chance to wake the existing trusted
 * Control Tower, not permission to bootstrap an unaddressed PR. GitHub cron
 * can be delayed or dropped; this is only an extra event-driven backstop.
 */
const {wake}=require('./ci-pr-control-tower-wakeup.cjs');
const REPO='andylitvinov-design/books';
const REF='refs/heads/codex/bootstrap-books';
const LABELS=['hh:ci-needed','hh:repair-needed'];
const HELD=new Set(['hh:hold','hh:blocked','hh:repair-manual']);
function queuedPR(item,label){
  if(!item||item.state!=='open'||!item.pull_request||
     !Array.isArray(item.labels))return false;
  const names=new Set(item.labels.map(x=>x?.name).filter(Boolean));
  if(!names.has(label)||[...HELD].some(x=>names.has(x)))return false;
  if(label==='hh:ci-needed'&&names.has('hh:ci-bootstrap-attempted'))return false;
  return true;
}
async function run({github,context,hasToken=false,now=Date.now(),
  log=()=>{},wakeFn=wake}={}){
  const result={schema:'HH_CI_SCHEDULE_BACKSTOP_V1',
    status:'SKIPPED',labelsChecked:0,queueObserved:false,sourceChanged:false};
  if(context?.eventName!=='schedule'||
     context?.ref!==REF||
     context?.repo?.owner+'/'+context?.repo?.repo!==REPO){
    result.status='UNTRUSTED_EVENT';return result;
  }
  if(!hasToken){result.status='OWNER_TOKEN_MISSING';return result;}
  const {owner,repo}=context.repo;
  // Two bounded metadata reads; never checkout or execute untrusted PR code.
  for(const label of LABELS){
    let rows;
    try{
      const response=await github.rest.issues.listForRepo({
        owner,repo,state:'open',labels:label,per_page:5});
      rows=response?.data;
    }catch(error){
      log('CI schedule queue read failed: '+String(error?.message||error).slice(0,120));
      result.status='QUEUE_UNAVAILABLE';return result;
    }
    if(!Array.isArray(rows)||rows.length>5){
      result.status='QUEUE_UNVERIFIED';return result;
    }
    result.labelsChecked++;
    if(rows.some(item=>queuedPR(item,label))){
      result.queueObserved=true;break;
    }
  }
  if(!result.queueObserved){
    result.status='NO_ACTIONABLE_LABELS';return result;
  }
  // Existing single-writer cooldown and exact-HEAD reservations stay in force.
  result.status=await wakeFn({
    github,owner,repo,summary:{ciQueueBacklog:1},
    enabled:true,hasToken:true,dryRun:false,
    limited:async(_name,fn)=>fn(),log,now
  });
  return result;
}
module.exports={queuedPR,run,LABELS};
