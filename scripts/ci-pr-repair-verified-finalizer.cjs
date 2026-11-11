'use strict';
// Independent exact-head CI finalization on the EXISTING Core completion job.
// Read-only proof first; one idempotent authenticated PR comment is the only write.
// No source checkout, token handoff, new workflow, runner or CI retry.
const {trustedCases,verifyCaseCi}=require('./ci-pr-repair-learning.cjs');
const {trustedControlComment,readCompleteIssueComments}=require('./ci-pr-task-state.cjs');
const REPO='andylitvinov-design/books';
const DEFAULT='codex/bootstrap-books',PROD='codex/public-book-library';
const CORE='HH PR core release gate',PATH='.github/workflows/hh-pr-core-release.yml';
const SHA=/^[a-f0-9]{40}$/i;
const REQUIRED=Object.freeze(['core-lint-types-build','hh-specialist','hh-merge-check']);
const RECEIPT='HH_PR_REPAIR_VERIFIED_V1';
function trustedCoreSuccess(context){
 const e=context?.payload?.workflow_run;
 return !!(context?.eventName==='workflow_run'&&
   context?.ref==='refs/heads/'+DEFAULT&&
   context?.repo?.owner+'/'+context?.repo?.repo===REPO&&
   e?.name===CORE&&String(e.path||'').split('@')[0]===PATH&&
   e.event==='pull_request'&&e.status==='completed'&&e.conclusion==='success'&&
   e.repository?.full_name===REPO&&e.head_repository?.full_name===REPO&&
   Number.isSafeInteger(e.id)&&e.id>0&&
   Number.isSafeInteger(e.run_attempt)&&e.run_attempt>0&&
   typeof e.head_branch==='string'&&e.head_branch.length>0&&e.head_branch.length<256&&
   SHA.test(e.head_sha||'')&&
   Number.isFinite(Date.parse(e.created_at||''))&&
   Array.isArray(e.pull_requests)&&e.pull_requests.length<=1);
}
function eligiblePR(pr,event){
 if(!pr||pr.state!=='open'||pr.draft===true||
   !Number.isSafeInteger(pr.number)||pr.number<1||
   pr.user?.login!=='andylitvinov-design'||pr.base?.ref!==PROD||
   !SHA.test(pr.base?.sha||'')||!SHA.test(pr.head?.sha||'')||
   pr.head?.repo?.full_name!==REPO||
   pr.head.ref!==event.head_branch)return false;
 const linked=event.pull_requests;
 if(linked.length===0)return true; // only after a unique live-branch lookup
 const l=linked[0];
 return l.number===pr.number&&l.head?.sha===pr.head.sha&&
   (!l.head.ref||l.head.ref===pr.head.ref)&&
   l.base?.ref===PROD&&(!l.base.sha||l.base.sha===pr.base.sha);
}
function latestGreenRequired(checks,head){
 if(!checks||!Number.isSafeInteger(checks.total_count)||
   checks.total_count>100||!Array.isArray(checks.check_runs)||
   checks.check_runs.length!==checks.total_count)return null;
 const result={};
 for(const name of REQUIRED){
   const all=checks.check_runs.filter(c=>c?.name===name&&
     c.head_sha===head&&c.app?.id===15368&&
     Number.isSafeInteger(c.id)&&c.id>0)
     .sort((a,b)=>b.id-a.id);
   if(!all.length||all[0].status!=='completed'||all[0].conclusion!=='success')return null;
   result[name]={check_id:all[0].id,completed_at:all[0].completed_at||null};
 }
 return result;
}
function verifiedReceipt(comments,number,taskKey,head){
 if(!Array.isArray(comments))return false;
 return comments.some(c=>{
  if(!trustedControlComment(c)||typeof c.body!=='string'||
     c.body.length>12000||c.updated_at!==c.created_at)return false;
  const m=/^<!-- HH_PR_REPAIR_VERIFIED_V1 -->\n```json\n([^\n]{1,10000})\n```/.exec(c.body);
  if(!m)return false;
  let data;try{data=JSON.parse(m[1]);}catch{return false;}
  return data?.schema===RECEIPT&&data.status==='VERIFIED'&&
    data.pr_number===number&&data.task_key===taskKey&&
    data.new_sha===head&&data.terminal===true;
 });
}
function receiptBody(data){
 return '<!-- '+RECEIPT+' -->\n```json\n'+JSON.stringify(data)+'\n```';
}
async function run({github,core,context,now=Date.now()}){
 const finish=(status,extras={})=>{
  const result={schema:'HH_PR_REPAIR_EXACT_HEAD_FINALIZER_V1',status,...extras};
  core?.info?.('HH_REPAIR_EXACT_HEAD_FINALIZER '+JSON.stringify(result));
  return result;
 };
 if(!trustedCoreSuccess(context))return finish('UNTRUSTED_OR_UNRELATED_EVENT');
 const {owner,repo}=context.repo,event=context.payload.workflow_run;
 const listed=(await github.rest.pulls.list({owner,repo,state:'open',
   head:owner+':'+event.head_branch,per_page:3})).data;
 if(!Array.isArray(listed)||listed.length!==1)return finish('PR_BRANCH_AMBIGUOUS_OR_NOT_OPEN');
 const pr=(await github.rest.pulls.get({owner,repo,pull_number:listed[0].number})).data;
 if(!eligiblePR(pr,event)||pr.number!==listed[0].number)
   return finish('EVENT_PR_EXACT_HEAD_UNVERIFIED');
 if(event.head_sha!==pr.head.sha){
  // GitHub pull_request workflow_run often reports the synthetic merge SHA.
  // Only the exact fresh base/source parent pair is a valid alternative.
  const merge=(await github.rest.git.getCommit({owner,repo,commit_sha:event.head_sha})).data;
  if(!Array.isArray(merge?.parents)||merge.parents.length!==2||
    merge.parents[0].sha!==pr.base.sha||merge.parents[1].sha!==pr.head.sha)
   return finish('CORE_EVENT_MERGE_ANCESTRY_UNVERIFIED');
 }
 let reads=0;
 const comments=await readCompleteIssueComments(github,owner,repo,pr.number,
  async(_label,fn)=>{if(++reads>5)throw Error('VERIFIER_COMMENT_HISTORY_BUDGET');return fn();});
 if(!comments||comments.length>300)return finish('SIGNED_REPAIR_HISTORY_UNAVAILABLE');
 const cases=trustedCases(comments.filter(x=>x?.updated_at===x?.created_at),
   {maxComments:300}).filter(c=>
   c.pr_number===pr.number&&c.published_head===pr.head.sha);
 if(cases.length!==1)return finish(cases.length?'PUBLISHED_CASE_AMBIGUOUS':'NO_SIGNED_PUBLISHED_SOURCE');
 const c=cases[0];
 if(verifiedReceipt(comments,pr.number,c.task_key,pr.head.sha))
   return finish('ALREADY_VERIFIED',{pr_number:pr.number,sha:pr.head.sha});
 const started=Date.parse(event.created_at);
 if(!Number.isFinite(started)||started+10*60_000<Date.parse(c.first_observed_at)||
   started>now+60_000)return finish('CI_EVENT_OUTSIDE_PUBLISH_WINDOW');
 const commit=(await github.rest.git.getCommit({owner,repo,commit_sha:c.published_head})).data;
 if(!Array.isArray(commit?.parents)||commit.parents.length!==1||
   commit.parents[0].sha!==c.previous_head)
   return finish('SOURCE_COMMIT_PARENT_UNVERIFIED');
 const checks=(await github.rest.checks.listForRef({owner,repo,ref:c.published_head,per_page:100})).data;
 const proof=latestGreenRequired(checks,c.published_head);
 if(!proof||!verifyCaseCi(c,{headSha:c.published_head,checks:checks.check_runs}).verified)
   return finish('REQUIRED_EXACT_HEAD_CHECKS_NOT_GREEN',{pr_number:pr.number,sha:c.published_head});
 // Guard against HEAD movement after the potentially slow independent reads.
 const fresh=(await github.rest.pulls.get({owner,repo,pull_number:pr.number})).data;
 if(!eligiblePR(fresh,event)||fresh.head.sha!==c.published_head||
   fresh.base.sha!==pr.base.sha)return finish('PR_HEAD_CHANGED_DURING_VERIFICATION');
 const result={schema:RECEIPT,status:'VERIFIED',terminal:true,
   reason_code:'EXACT_HEAD_SOURCE_PARENT_AND_REQUIRED_CI_SUCCESS',
   responsible_role:'exact-head-ci-verifier',
   next_action:'NO_FURTHER_REPAIR_REQUIRED',next_check_at:null,
   task_key:c.task_key,pr_number:pr.number,head_sha:c.previous_head,
   new_sha:c.published_head,owner_run_id:c.owner_run_id,
   core_run_id:event.id,core_run_attempt:event.run_attempt,
   required_checks:proof,verified_at:new Date(now).toISOString()};
 // No synthetic Core run, no green check inferred from mere workflow success.
 // The serialized Core callback is the sole signer; repeats see same receipt.
 await github.rest.issues.createComment({owner,repo,issue_number:pr.number,
   body:receiptBody(result)});
 return finish('VERIFIED',{pr_number:pr.number,task_key:c.task_key,sha:c.published_head,
   core_run_id:event.id});
}
module.exports={run,trustedCoreSuccess,eligiblePR,latestGreenRequired,
 verifiedReceipt,receiptBody,REQUIRED};
