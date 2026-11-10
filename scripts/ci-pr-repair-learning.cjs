'use strict';
/*
 * HH_REPAIR_CASE_V1 — read-only, evidence-bound lessons from the existing
 * trusted PR Repair Worker. No new runner, cron, provider or source writer.
 * A source publication is NOT green CI, merge, deployed code or functional LIVE.
 */
const crypto=require('node:crypto');
const SHA=/^[a-f0-9]{40}$/i;
const TASK=/^[a-f0-9]{32}$/i;
const FREE_MODEL_ID=/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*:free$/;
const POLICY='HH_PR_AUTOMATION_CANONICAL_V1';
const REPO='andylitvinov-design/books';
const SKILLS=Object.freeze({
 'lint-autofix':Object.freeze({version:'1.0.0',strategy:'lint',repair_kind:'lint',
  mode:'review_only',source:'existing-eslint-and-independent-tests'}),
 'bounded-free-ai':Object.freeze({version:'1.0.0',strategy:'code',repair_kind:'free_ai',
  mode:'review_only',source:'existing-free-model-and-independent-tests'}),
 'typescript-deterministic':Object.freeze({version:'1.0.0',strategy:'code',repair_kind:'lint',
  mode:'review_only',source:'existing-type-only-codemod-and-independent-tests'})
});
const isSha=x=>typeof x==='string'&&SHA.test(x);
const isTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&
 /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x);
const bot=c=>c?.user?.id===41898282&&c.user.login==='github-actions[bot]'&&
 c.user.type==='Bot'&&c.performed_via_github_app?.id===15368&&
 c.performed_via_github_app?.slug==='github-actions';
const safeKey=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9_.:-]{5,110}$/.test(x);
const digest=x=>crypto.createHash('sha256').update(x,'utf8').digest('hex');

/** Called only after finalize independently confirms commit parent and live PR source ref. */
function buildPublishedCase(record){
 if(!record||record.schema!=='HH_PR_TASK_V1'||record.state!=='PUBLISHED'||
   record.source_published!==true||record.verified_source_fix!==true||
   record.reason_code!=='SOURCE_COMMIT_VERIFIED_ON_PR_HEAD'||
   !Number.isSafeInteger(record.pr_number)||record.pr_number<1||record.pr_number>99999999||
   !isSha(record.head_sha)||!isSha(record.new_sha)||record.head_sha===record.new_sha||
   !TASK.test(record.task_key||'')||!/^\d{1,19}$/.test(String(record.owner_run_id||''))||
   !isTime(record.created_at)||!['lint','code'].includes(record.strategy)||
   !['lint','free_ai'].includes(record.repair_kind)||
   (record.repair_kind==='free_ai'&&!(record.code_model_verified===true&&
     ['openrouter','opencode'].includes(record.code_backend)&&
     typeof record.code_model==='string'&&FREE_MODEL_ID.test(record.code_model)))||
   !/^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/[1-9]\d*$/.test(record.run_url||''))
   return null;
 // No diagnostic signature is fabricated from a successful source commit.
 // A broad strategy is never enough to auto-apply another source patch.
 const skill=record.strategy==='lint'&&record.repair_kind==='lint'?'lint-autofix':
   record.strategy==='code'&&record.repair_kind==='free_ai'?'bounded-free-ai':
   record.strategy==='code'&&record.repair_kind==='lint'?'typescript-deterministic':null;
 if(!skill)return null;
 const caseId=digest([REPO,record.pr_number,record.head_sha,record.new_sha,
  record.owner_run_id].join('|')).slice(0,32);
 return Object.freeze({schema:'HH_REPAIR_CASE_V1',case_id:caseId,repo:REPO,
  pr_number:record.pr_number,previous_head:record.head_sha,
  published_head:record.new_sha,owner_run_id:String(record.owner_run_id),
  task_key:record.task_key,skill_id:skill,skill_version:SKILLS[skill].version,
  first_observed_at:record.created_at,policy_version:POLICY,
  source_proof:'VERIFIED_COMMIT_PARENT_AND_REMOTE_PR_REF',
  ci_proof:'NOT_VERIFIED',merge_proof:'NOT_VERIFIED',live_proof:'NOT_VERIFIED',
  diagnostic_signature:null,auto_reuse:false,
  code_backend:record.repair_kind==='free_ai'?record.code_backend:null,
  code_model:record.repair_kind==='free_ai'?record.code_model:null,
  code_model_verified:record.repair_kind==='free_ai',
  run_url:record.run_url,pr_url:`https://github.com/${REPO}/pull/${record.pr_number}`});
}
function validCase(c){
 const modelProofValid=c?.skill_id==='bounded-free-ai'?
  (c.code_model_verified===true&&['openrouter','opencode'].includes(c.code_backend)&&
   typeof c.code_model==='string'&&FREE_MODEL_ID.test(c.code_model)):
  c?.code_model_verified===false&&c?.code_backend===null&&c?.code_model===null;
 return !!c&&modelProofValid&&c.schema==='HH_REPAIR_CASE_V1'&&
  typeof c.case_id==='string'&&/^[a-f0-9]{32}$/.test(c.case_id)&&
  c.repo===REPO&&Number.isSafeInteger(c.pr_number)&&c.pr_number>0&&c.pr_number<=99999999&&
  isSha(c.previous_head)&&isSha(c.published_head)&&c.previous_head!==c.published_head&&
  TASK.test(c.task_key||'')&&/^\d{1,19}$/.test(String(c.owner_run_id||''))&&
  isTime(c.first_observed_at)&&c.policy_version===POLICY&&
  c.source_proof==='VERIFIED_COMMIT_PARENT_AND_REMOTE_PR_REF'&&
  c.ci_proof==='NOT_VERIFIED'&&c.merge_proof==='NOT_VERIFIED'&&
  c.live_proof==='NOT_VERIFIED'&&c.auto_reuse===false&&
  c.diagnostic_signature===null&&Object.hasOwn(SKILLS,c.skill_id)&&
  c.skill_version===SKILLS[c.skill_id].version&&
  c.run_url===`https://github.com/${REPO}/actions/runs/${c.owner_run_id}`&&
  c.pr_url===`https://github.com/${REPO}/pull/${c.pr_number}`&&
  c.case_id===digest([REPO,c.pr_number,c.previous_head,c.published_head,
   c.owner_run_id].join('|')).slice(0,32);
}
function trustedCases(comments,{maxComments=100}={}){
 if(!Array.isArray(comments)||comments.length>maxComments||maxComments>300)return [];
 const out=[],seen=new Set();
 for(const comment of comments){
  if(!bot(comment)||!isTime(comment.created_at)||
    typeof comment.body!=='string'||comment.body.length>150000||
    !comment.body.startsWith('<!-- HH_PR_REPAIR_OUTCOME_V1 '))continue;
  const marker='<!-- HH_PR_TASK_V1 -->\n```json\n';
  const attested=/^<!-- HH_PR_REPAIR_OUTCOME_V1 ([a-f0-9]{40}) ([1-9][0-9]{0,18}) -->\n/.exec(comment.body);
  if(!attested)continue;
  const start=comment.body.indexOf(marker);
  if(start<0)continue;
  const end=comment.body.indexOf('\n```',start+marker.length);
  if(end<0||end-start>13000)continue;
  let record;try{record=JSON.parse(comment.body.slice(start+marker.length,end));}
  catch{continue;}
  // Cannot use an arbitrary JSON case: must re-derive it from the signed
  // published source receipt on the same authenticated Actions bot comment.
  const c=buildPublishedCase(record);
  if(!c||!validCase(c)||attested[1]!==c.previous_head||
    attested[2]!==c.owner_run_id||
    Math.abs(Date.parse(comment.created_at)-Date.parse(c.first_observed_at))>86400000||
    seen.has(c.case_id))continue;
  seen.add(c.case_id);out.push(c);
 }
 return out;
}
/** Reuse requires independent fresh CI evidence; no automatic source write. */
function verifyCaseCi(c,{headSha,checks,policyVersion=POLICY}={}){
 if(!validCase(c)||policyVersion!==c.policy_version||headSha!==c.published_head||
    !Array.isArray(checks)||checks.length>100)return {verified:false,reason:'EVIDENCE_UNVERIFIED'};
 const names=['core-lint-types-build','hh-specialist','hh-merge-check'];
 for(const name of names){
  const items=checks.filter(x=>x?.name===name&&x.head_sha===headSha&&
    x.app?.id===15368&&x.status==='completed'&&x.conclusion==='success');
  if(items.length<1)return {verified:false,reason:'REQUIRED_EXACT_HEAD_CHECK_MISSING'};
 }
 return {verified:true,reason:'EXACT_HEAD_CI_VERIFIED',case_id:c.case_id,
  reuse_mode:'SUGGEST_ONLY_NEVER_AUTO_EXECUTE'};
}
/** Search can use verified cases from ANY explicitly supplied trusted PR histories. */
function suggestVerifiedCases({family,policyVersion=POLICY,verifiedCases=[]}={}){
 if(!safeKey(family)||policyVersion!==POLICY||!Array.isArray(verifiedCases))return [];
 const out=[];const seen=new Set();
 for(const item of verifiedCases){
  const c=item?.case;
  if(!validCase(c)||item?.ci?.verified!==true||
     item.ci.case_id!==c.case_id||c.skill_id!==family||seen.has(c.case_id))continue;
  seen.add(c.case_id);
  out.push({case_id:c.case_id,skill_id:c.skill_id,version:c.skill_version,
   pr_url:c.pr_url,run_url:c.run_url,source_head:c.published_head,
   state:'OWNER_REVIEW_REQUIRED',auto_execute:false});
  if(out.length===3)break;
 }
 return out;
}
/** Comparisons are advisory; a new TS/ESLint diagnostic never passes automatically. */
function diagnosticDelta(before,after){
 const normalize=list=>{
  if(!Array.isArray(list)||list.length>500)throw Error('DIAGNOSTICS_SCOPE_UNVERIFIED');
  const out=new Set();
  for(const x of list){
   if(!x||!['tsc','eslint'].includes(x.tool)||!safeKey(x.code)||
      typeof x.path!=='string'||x.path.length>230||
      !/^(?:app|components|lib|scripts)\/[\w./()\[\]-]+$/.test(x.path)||
      x.path.includes('..')||!Number.isSafeInteger(x.line)||x.line<1)
     throw Error('DIAGNOSTICS_RECORD_UNSAFE');
   out.add(`${x.tool}|${x.code}|${x.path}|${x.line}`);
  }
  return out;
 };
 const b=normalize(before),a=normalize(after);
 const introduced=[...a].filter(x=>!b.has(x)),resolved=[...b].filter(x=>!a.has(x));
 return {introduced:introduced.length,resolved:resolved.length,unchanged:a.size-introduced.length,
  publish_allowed:introduced.length===0,reason:introduced.length===0?'NO_INTRODUCED_DIAGNOSTICS':'REJECTED_INTRODUCED_SEMANTIC_ERRORS'};
}
function curateSkill({skillId,version,policyVersion=POLICY,verifiedSuccess=0,verifiedFailure=0,ownerLocked=false}={}){
 if(!Object.hasOwn(SKILLS,skillId)||version!==SKILLS[skillId].version)
  return {state:'unknown',execute:false,reason:'SKILL_NOT_RECOGNIZED'};
 if(policyVersion!==POLICY)return {state:'stale',execute:false,reason:'POLICY_CHANGED'};
 if(!Number.isSafeInteger(verifiedSuccess)||verifiedSuccess<0||
   !Number.isSafeInteger(verifiedFailure)||verifiedFailure<0)
  return {state:'unknown',execute:false,reason:'UNVERIFIED_METRICS'};
 if(verifiedFailure>0)return {state:'owner_review',execute:false,reason:'VERIFIED_REGRESSION'};
 return {state:ownerLocked?'owner_locked':'candidate',execute:false,
  reason:'REQUIRES_EXPLICIT_OWNER_APPROVAL',verifiedSuccess};
}
module.exports={POLICY,REPO,SKILLS,buildPublishedCase,validCase,trustedCases,
 verifyCaseCi,suggestVerifiedCases,diagnosticDelta,curateSkill};
