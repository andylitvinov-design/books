'use strict';
// Bounded, signed per-PR source-patch count. Never a source-write grant.
const {SHA,parseRecords,trustedControlComment}=require('./ci-pr-task-state.cjs');
const {validateTaskOutcome}=require('./ci-pr-task-outcome.cjs');
const MAX_SOURCE_PATCHES=3,KEY=/^[a-f0-9]{32}$/i;
// The publisher writes a legacy string outcome after remote ref/parent proof.
// The terminal worker also writes a PUBLISHED receipt with a structured
// HH_TASK_OUTCOME_V1 object. Both are signed by the official Actions App.
// Validate all structured identity and actual-publication fields before
// counting; do not reject a legitimate finalizer duplicate or grant writes.
function verifiedPublished(r){
 if(r.outcome==='VERIFIED_SOURCE_COMMIT')return true;
 const o=r.outcome;
 return r.source_published===true&&r.verified_source_fix===true&&
  r.reason_code==='SOURCE_COMMIT_VERIFIED_ON_PR_HEAD'&&
  validateTaskOutcome(o)&&o.status==='FIXED'&&o.source_published===true&&
  o.verified_source===true&&o.task_key===r.task_key&&o.pr_number===r.pr_number&&
  o.head_sha===r.head_sha&&o.new_sha===r.new_sha&&
  o.owner_run_id===String(r.owner_run_id)&&o.reason_code===r.reason_code;
}
function sourceRepairBudget(comments,{prNumber,max=MAX_SOURCE_PATCHES}={}){
 if(!Array.isArray(comments)||!Number.isSafeInteger(prNumber)||prNumber<1||
    !Number.isSafeInteger(max)||max<1||max>3)
  return {status:'UNVERIFIED_HISTORY',count:0,nextAttempt:null};
 const records=parseRecords(comments.filter(trustedControlComment));
 if(!records)return {status:'UNVERIFIED_HISTORY',count:0,nextAttempt:null};
 const published=new Map();
 for(const r of records){
  if(r.pr_number!==prNumber||r.state!=='PUBLISHED')continue;
  if(!SHA.test(r.head_sha||'')||!SHA.test(r.new_sha||'')||
     r.head_sha===r.new_sha||!KEY.test(r.task_key||'')||
     !verifiedPublished(r))
   return {status:'UNVERIFIED_PUBLISHED_RECEIPT',count:0,nextAttempt:null};
  // PUBLISHED was written only after remote ref+parent verification.
  if(published.has(r.new_sha)&&published.get(r.new_sha)!==r.head_sha)
   return {status:'UNVERIFIED_PUBLISHED_RECEIPT',count:0,nextAttempt:null};
  published.set(r.new_sha,r.head_sha);
 }
 const count=published.size;
 return {status:count>=max?'EXHAUSTED':'ELIGIBLE',
  count,nextAttempt:count>=max?null:count+1,
  publishedShas:[...published.keys()].slice(-max)};
}
module.exports={sourceRepairBudget,MAX_SOURCE_PATCHES};
