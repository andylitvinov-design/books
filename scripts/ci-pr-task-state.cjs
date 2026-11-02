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

/**
 * Check the LATEST authenticated ownership transition, never just an old
 * active marker or its nominal expiry. Only an explicit same-actor,
 * same-owner, same-lease release can free modern ownership of this HEAD.
 * Unknown/malformed history fails closed. Legacy records retain TTL.
 */
function externalOwnerLeaseStatus(comments,headSha,now){
 if(!Array.isArray(comments)||!SHA.test(headSha||'')||!Number.isFinite(now))
   return 'OWNER_LEASE_UNVERIFIED';
 const holders=new Map();
 const sorted=comments.map((entry,index)=>({entry,index})).sort((a,b)=>
  Number.isSafeInteger(a.entry?.id)&&Number.isSafeInteger(b.entry?.id)?
   a.entry.id-b.entry.id:a.index-b.index);
 const activeStates=new Set(['active','claim','heartbeat']);
 for(const {entry,index} of sorted){
  const body=String(entry?.body||'');
  if(!body.includes('HH_PR_SWEEP_LEASE_V1'))continue;
  let doc;
  try{
   const fence=String.fromCharCode(96).repeat(3);
   const open=body.indexOf(fence+'json');
   let source;
   if(open>=0){
    const start=open+fence.length+4,end=body.indexOf(fence,start);
    if(end<0)throw Error('Unclosed lease JSON');
    source=body.slice(start,end);
   }else{
    const start=body.indexOf('{'),end=body.lastIndexOf('}');
    if(start<0||end<=start)throw Error('Missing lease JSON');
    source=body.slice(start,end+1);
   }
   doc=JSON.parse(source);
  }catch{return 'OWNER_LEASE_UNVERIFIED';}
  if(!doc||typeof doc!=='object'||Array.isArray(doc))
   return 'OWNER_LEASE_UNVERIFIED';
  const related=doc.head_sha===headSha||doc.previous_head_sha===headSha;
  if(!related){
   if(!SHA.test(doc.head_sha||'')&&!SHA.test(doc.previous_head_sha||''))
    return 'OWNER_LEASE_UNVERIFIED';
   continue;
  }
  if(!doc.schema){
   // Historic Codex sweeps had only run_id + lease_expires. Unlike
   // modern exact-head source edits, these expire with a proven clock.
   const expiry=Date.parse(doc.lease_expires||'');
   if(typeof doc.owner!=='string'||!doc.owner.trim()||
      typeof doc.run_id!=='string'||!doc.run_id.trim()||
      !SHA.test(doc.head_sha||'')||!Number.isFinite(expiry))
    return 'OWNER_LEASE_UNVERIFIED';
   if(doc.head_sha===headSha&&expiry>now)
    holders.set('historical:'+doc.owner+':'+doc.run_id,{
     legacy:true,expires:expiry});
   continue;
  }
  if(doc.schema!=='HH_PR_SWEEP_LEASE_V1')
   return 'OWNER_LEASE_UNVERIFIED';
  const actor=typeof entry.user?.login==='string'?entry.user.login:'';
  const owner=typeof doc.owner==='string'?doc.owner.trim():'';
  const leaseId=typeof doc.lease_id==='string'&&doc.lease_id.trim()?
    'id:'+doc.lease_id.trim():
    (typeof doc.run_id==='string'&&doc.run_id.trim()?
      'run:'+doc.run_id.trim():'head:'+headSha);
  const key=actor+':'+owner+':'+leaseId;
  const state=String(doc.state||doc.last_action||'');
  if(activeStates.has(state)){
   if(doc.head_sha!==headSha)continue;
   // An unidentifiable active writer must NOT be unlocked by a stranger.
   if(!actor||!owner){
    holders.set('unknown-active:'+index,{legacy:false});
   }else{
    holders.set(key,{legacy:false});
   }
  }else if(/^released(?:_|$)/.test(state)||
      /^release(?:_|$)/.test(String(doc.last_action||''))){
   // An unverified release (missing author/owner/id or from another
   // account) cannot cancel another active writer's protection.
   if(!actor||!owner)continue;
   holders.delete(key);
  }else{
   return 'OWNER_LEASE_UNVERIFIED';
  }
 }
 return holders.size?'OWNER_LEASE_ACTIVE':'FREE';
}

// Only a definitive non-accepted HTTP 4xx and an authenticated GitHub Actions
// receipt may release a failed dispatch reservation. Ambiguous network/5xx
// errors stay reserved, so a delayed worker can never race a retry.
const DEFINITIVE_DISPATCH_DENIAL=new Set([400,401,403,404,422]);
function trustedControlComment(comment){
 return comment?.user?.id===41898282 &&
   comment.user.login==='github-actions[bot]' && comment.user.type==='Bot' &&
   comment.performed_via_github_app?.id===15368 &&
   comment.performed_via_github_app.slug==='github-actions';
}
function reservationStatus(task,comments,now){
 const items=parseRecords(comments);if(!items)return 'UNVERIFIED_HISTORY';
 const matches=items.filter(x=>x.task_key===task.task_key&&x.head_sha===task.head_sha);
 if(matches.some(x=>['CLAIMED','PUBLISHED','MANUAL','REPAIRED','DISPATCH_ACCEPTED','DONE'].includes(x.state)))return 'ALREADY_HANDLED';
 const trusted=parseRecords(comments.filter(trustedControlComment));
 if(!trusted)return 'UNVERIFIED_HISTORY';
 const rejections=trusted.filter(x=>x.task_key===task.task_key &&
   x.head_sha===task.head_sha && x.state==='DISPATCH_REJECTED' &&
   x.outcome==='DEFINITIVELY_NOT_ACCEPTED' &&
   DEFINITIVE_DISPATCH_DENIAL.has(x.http_status));
 let released=false;
 for(const item of matches){
  if(item.state==='RESERVED'){
   const at=Date.parse(item.created_at||'');
   const rejection=rejections.find(x=>x.owner_run_id===item.owner_run_id &&
     Number.isFinite(at) && Date.parse(x.created_at||'')>=at &&
     Number.isFinite(Date.parse(x.retry_after||'')));
   if(!rejection)return 'RESERVED_REQUIRES_REVIEW';
   if(now<Date.parse(rejection.retry_after))return 'DISPATCH_RETRY_BACKOFF';
   released=true;
  }else if(item.state==='DISPATCH_REJECTED'){
   if(!rejections.some(x=>x.owner_run_id===item.owner_run_id &&
      x.created_at===item.created_at))return 'UNVERIFIED_HISTORY';
  }else return 'UNRECOGNIZED_STATE';
 }
 if(matches.length&&!released)return 'UNVERIFIED_HISTORY';
 // Never claim a source HEAD that a legacy Repair Worker already claimed.
 if((comments||[]).some(c=>String(c.body||'').includes('HH_PR_REPAIR_WORKER_V1 '+task.head_sha)))return 'ALREADY_HANDLED';
 const leaseStatus=externalOwnerLeaseStatus(comments,task.head_sha,now);
 if(leaseStatus!=='FREE')return leaseStatus;
 return 'FREE';
}
// A single 100-comment page is not proof of complete ownership history.
// Follow every page until a short page proves completeness. The caller
// enforces its API request budget and rate reserve; exhaustion fails closed.
async function readCompleteIssueComments(github,owner,repo,issueNumber,limited){
 if(!Number.isSafeInteger(issueNumber)||issueNumber<1)return null;
 const comments=[];
 for(let page=1;Number.isSafeInteger(page);page++){
  const result=await limited('owner-comments-page-'+page,()=>
   github.rest.issues.listComments({owner,repo,issue_number:issueNumber,
    per_page:100,page}));
  if(!Array.isArray(result?.data)||result.data.length>100)return null;
  comments.push(...result.data);
  if(result.data.length<100)return comments;
 }
 return null;
}
module.exports={REPO,PROD,DEFAULT,SHA,MARKER,labels,validPR,laneOf,taskFor,
 reservation,commentBody,parseRecords,reservationStatus,externalOwnerLeaseStatus,readCompleteIssueComments,
 DEFINITIVE_DISPATCH_DENIAL,trustedControlComment};