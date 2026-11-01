'use strict';
const crypto=require('node:crypto');
const REPO='andylitvinov-design/books';
const PROD='codex/public-book-library';
const DEFAULT='codex/bootstrap-books';
const SHA=/^[0-9a-f]{40}$/i;
const MARKER='<!-- HH_PR_TASK_V1 -->';
const BLOCKED=new Set(['hh:hold','hh:repair-manual','hh:blocked','hh:worker-claimed']);
function labels(pr){return new Set((pr?.labels||[]).map(x=>x.name||x).filter(x=>typeof x==='string'));}
function validPR(pr){
 const ls=labels(pr);
 return Boolean(pr&&Number.isSafeInteger(pr.number)&&pr.number>0&&
  pr.state==='open'&&!pr.draft&&pr.base?.ref===PROD&&
  pr.head?.repo?.full_name===REPO&&SHA.test(pr.head?.sha||'')&&
  pr.user?.login===REPO.split('/')[0]&&
  ![...BLOCKED].some(n=>ls.has(n))&&
  !ls.has('hh:direction-override:invalid'));
}
function laneOf(pr){
 if(!validPR(pr))return null;
 const l=labels(pr);
 if(l.has('hh:repair-needed'))return 'repair';
 if(l.has('hh:ci-needed')&&!l.has('hh:ci-bootstrap-attempted'))return 'ci';
 if(l.has('hh:conflict-repair-needed'))return 'conflict';
 return null;
}
function taskFor(pr,priority){
 const lane=laneOf(pr);if(!lane||priority?.conflicted)return null;
 const cause=lane==='repair'?'verified-source':lane==='ci'?'missing-core':'merge-conflict';
 const key=crypto.createHash('sha256').update([REPO,pr.number,pr.head.sha,lane,cause].join(':')).digest('hex').slice(0,32);
 return {schema:'HH_PR_TASK_V1',task_key:key,pr_number:pr.number,
  head_sha:pr.head.sha,head_ref:pr.head.ref,base_ref:PROD,lane,
  reason_code:cause,priority:priority?.tier||'P5',direction:priority?.direction||'other',
  next_action:lane==='ci'?'CI_BOOTSTRAP':lane==='conflict'?'CONFLICT_TRIAGE':'SOURCE_REPAIR'};
}
function reservation(task,now,ownerRun){
 return {...task,state:'RESERVED',owner_run_id:String(ownerRun),
  created_at:new Date(now).toISOString(),expires_at:new Date(now+30*60_000).toISOString()};
}
function commentBody(item){return MARKER+'\n```json\n'+JSON.stringify(item)+'\n```';}
function parseRecords(comments){
 if(!Array.isArray(comments))return null;
 const out=[];
 for(const comment of comments){
  const body=String(comment?.body||'');if(!body.includes(MARKER))continue;
  const m=body.match(/```json\s*([\s\S]*?)```/);
  if(!m)return null;
  let record;try{record=JSON.parse(m[1]);}catch{return null;}
  if(record?.schema!=='HH_PR_TASK_V1'||typeof record.task_key!=='string'||!SHA.test(record.head_sha||''))return null;
  out.push(record);
 }
 return out;
}
function reservationStatus(task,comments,now){
 const items=parseRecords(comments);if(!items)return 'UNVERIFIED_HISTORY';
 const matches=items.filter(x=>x.task_key===task.task_key&&x.head_sha===task.head_sha);
 if(matches.some(x=>['CLAIMED','PUBLISHED','MANUAL','REPAIRED','DISPATCH_ACCEPTED','DONE'].includes(x.state)))return 'ALREADY_HANDLED';
 if(matches.some(x=>x.state==='RESERVED'))return 'RESERVED_REQUIRES_REVIEW';
 if(matches.length)return 'UNRECOGNIZED_STATE';
 // Never claim a source HEAD that a legacy Repair Worker already claimed.
 if((comments||[]).some(c=>String(c.body||'').includes('HH_PR_REPAIR_WORKER_V1 '+task.head_sha)))return 'ALREADY_HANDLED';
 // An active/ambiguous external owner lease must not be stolen by this dispatcher.
 if((comments||[]).some(c=>{
  const body=String(c.body||'');if(!body.includes('HH_PR_SWEEP_LEASE_V1'))return false;
  const m=body.match(/\{[\s\S]*?\}/);if(!m)return true;
  try{const l=JSON.parse(m[0]);if(l.head_sha!==task.head_sha)return false;
   const expiry=Date.parse(l.expires_at||l.lease_expires||'');return !Number.isFinite(expiry)||expiry>now;
  }catch{return true;}
 }))return 'OWNER_LEASE_ACTIVE';
 return 'FREE';
}
module.exports={REPO,PROD,DEFAULT,SHA,MARKER,labels,validPR,laneOf,taskFor,
 reservation,commentBody,parseRecords,reservationStatus};