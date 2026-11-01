'use strict';
const {taskFor,MARKER,PROD,REPO}=require('./ci-pr-task-state.cjs');
const SHA=/^[a-f0-9]{40}$/i;
const labels={repair:'hh:repair-needed',conflict:'hh:conflict-repair-needed',ci:'hh:ci-needed'};
const kinds={RESERVED:'reserved',DISPATCH_ACCEPTED:'dispatched',CLAIMED:'claimed',PUBLISHED:'source_committed',MANUAL:'manual',NO_ACTION:'no_action',STALE:'stale'};
function normalizeReceipts(number,comments){
 if(!Number.isSafeInteger(number)||number<1||!Array.isArray(comments))return {events:[],complete:false};
 const events=[];let complete=true;
 for(const c of comments){
  if(typeof c?.body!=='string'||!c.body.includes(MARKER))continue;
  // A known different author cannot establish provenance. Missing or
  // contradictory metadata for a potential bot receipt makes coverage partial.
  if(!Number.isSafeInteger(c.user?.id)){complete=false;continue;}
  if(c.user.id!==41898282)continue;
  if(c.user.login!=='github-actions[bot]'||c.user.type!=='Bot'||
     c.performed_via_github_app?.id!==15368||c.performed_via_github_app?.slug!=='github-actions'){
   complete=false;continue;
  }
  const at=Date.parse(c.created_at||''),offset=c.body.indexOf(MARKER),rest=c.body.slice(offset+MARKER.length);
  const match=rest.match(/^\s*```json\s*([\s\S]*?)```/);let r;
  try{r=match?JSON.parse(match[1]):null;}catch{r=null;}
  if(!Number.isFinite(at)||!r||r.schema!=='HH_PR_TASK_V1'||r.pr_number!==number||
     r.base_ref!==PROD||!SHA.test(r.head_sha||'')||typeof r.head_ref!=='string'||!labels[r.lane]||!kinds[r.state]){
   complete=false;continue;
  }
  const pr={number,state:'open',draft:false,user:{login:REPO.split('/')[0]},base:{ref:PROD},
    head:{sha:r.head_sha,ref:r.head_ref,repo:{full_name:REPO}},labels:[{name:labels[r.lane]}]};
  if(taskFor(pr,{tier:'P5',direction:'other'})?.task_key!==r.task_key||
     (r.state==='PUBLISHED'&&(r.lane!=='repair'||!SHA.test(r.new_sha||'')))){complete=false;continue;}
  const e={kind:kinds[r.state],at:c.created_at,pr:number,head:r.head_sha,task:r.task_key,lane:r.lane};
  if(r.state==='PUBLISHED')e.newHead=r.new_sha;
  events.push(e);
 }
 return {events,complete};
}
module.exports={normalizeReceipts};
