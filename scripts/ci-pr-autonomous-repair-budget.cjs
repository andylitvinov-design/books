'use strict';
// Bounded, signed per-PR source-patch count. Never a source-write grant.
const {SHA,parseRecords,trustedControlComment}=require('./ci-pr-task-state.cjs');
const MAX_SOURCE_PATCHES=3,KEY=/^[a-f0-9]{32}$/i;
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
     r.outcome!=='VERIFIED_SOURCE_COMMIT')
   return {status:'UNVERIFIED_PUBLISHED_RECEIPT',count:0,nextAttempt:null};
  // PUBLISHED was written only after remote ref+parent verification.
  published.set(r.new_sha,r.head_sha);
 }
 const count=published.size;
 return {status:count>=max?'EXHAUSTED':'ELIGIBLE',
  count,nextAttempt:count>=max?null:count+1,
  publishedShas:[...published.keys()].slice(-max)};
}
module.exports={sourceRepairBudget,MAX_SOURCE_PATCHES};
