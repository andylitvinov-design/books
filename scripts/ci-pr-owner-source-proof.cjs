'use strict';
/**
 * Verify a current-HEAD source Core failure before consuming a one-shot
 * Commander repair grant. Labels, model prose and HTTP dispatch acknowledgments
 * are NOT source-write authority. A truncated comment history fails closed.
 */
const {readCompleteIssueComments}=require('./ci-pr-task-state.cjs');
const {verifiedCoreCodeFailure}=require('./ci-pr-repair-worker.cjs');
const SHA=/^[a-f0-9]{40}$/i;
const MAX_PAGES=8;
async function signedCoreSourceProof(github,number,sha){
 if(!Number.isSafeInteger(number)||number<1||!SHA.test(sha||''))
  return {verified:false,reasonCode:'SOURCE_PROOF_TARGET_INVALID'};
 let pages=0;
 try{
  const comments=await readCompleteIssueComments(
   github,'andylitvinov-design','books',number,async(_label,fn)=>{
    if(++pages>MAX_PAGES)throw Error('SOURCE_PROOF_HISTORY_PAGE_LIMIT');
    return fn();
   });
  if(!Array.isArray(comments))
   return {verified:false,reasonCode:'SOURCE_PROOF_INCOMPLETE'};
  if(!verifiedCoreCodeFailure(comments,sha))
   return {verified:false,reasonCode:'SIGNED_FAILED_CORE_PROOF_MISSING'};
  return {verified:true,reasonCode:'SIGNED_CURRENT_HEAD_CORE_SOURCE_FAILURE'};
 }catch(_){
  return {verified:false,reasonCode:pages>MAX_PAGES?
   'SOURCE_PROOF_INCOMPLETE':'SIGNED_SOURCE_PROOF_UNAVAILABLE'};
 }
}
module.exports={signedCoreSourceProof};
