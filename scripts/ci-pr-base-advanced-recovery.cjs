'use strict';
// Recover only a proven, stale protected production base after real Core source
// tests passed. Native update-branch creates a new PR HEAD and triggers the
// normal exact-HEAD Core/Specialist suite. Never mark an old run green.
const {externalOwnerLeaseStatus,readCompleteIssueComments,trustedControlComment}=require('./ci-pr-task-state.cjs');
const {MARKER:READY_MARKER,verifiedLooseReleaseGate}=require('./ci-pr-sensitive-base-ci-wake.cjs');
const REPO='andylitvinov-design/books',PROD='codex/public-book-library';
const SHA=/^[0-9a-f]{40}$/i;
const CORE_PATH='.github/workflows/hh-pr-core-release.yml';
const ERROR='PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED';
// A stale repair-manual marker is informational for this narrow recovery:
// only an exact, trusted BASE_ADVANCED Core failure can enter this module, and
// the complete live source lease history is checked again before update-branch.
// Real owner activity remains protected by the lease check and hard holds below.
const HOLDS=new Set(['hh:hold','hh:blocked','hh:worker-claimed','hh:direction-override:invalid']);

function isTrustedFailure(context,now=Date.now()){
 const e=context?.payload?.workflow_run;
 const age=now-Date.parse(e?.created_at||'');
 return context?.eventName==='workflow_run' &&
  context.ref==='refs/heads/codex/bootstrap-books' &&
  context.repo?.owner+'/'+context.repo?.repo===REPO &&
  e?.name==='HH PR core release gate' &&
  String(e.path||'').split('@')[0]===CORE_PATH &&
  e.event==='pull_request' && e.status==='completed' && e.conclusion==='failure' &&
  e.repository?.full_name===REPO && e.head_repository?.full_name===REPO &&
  Number.isSafeInteger(e.id) && e.id>0 &&
  Number.isSafeInteger(e.run_attempt) && e.run_attempt>0 &&
  SHA.test(e.head_sha||'') &&
  Number.isFinite(age) && age>=0 && age<=6*60*60*1000;
}
function validatedJobEvidence(data){
 const jobs=data?.jobs;
 if(!Array.isArray(jobs)||!Number.isSafeInteger(data.total_count) ||
    data.total_count!==jobs.length||jobs.length<3||jobs.length>100)return null;
 const exact=name=>{
  const matches=jobs.filter(job=>job?.name===name);
  return matches.length===1?matches[0]:null;
 };
 const core=exact('core-lint-types-build'),specialist=exact('hh-specialist'),
  merge=exact('hh-merge-check');
 if(!core||!specialist||!merge||!Number.isSafeInteger(specialist.id)||
    core.status!=='completed'||core.conclusion!=='success'||
    specialist.status!=='completed'||specialist.conclusion!=='failure'||
    merge.status!=='completed'||merge.conclusion!=='failure'||
    jobs.some(job=>job.conclusion==='failure'&&job!==specialist&&job!==merge))return null;
 return specialist.id;
}
function isActualBaseAdvancedLog(raw){
 const log=typeof raw==='string'?raw:
  raw instanceof Uint8Array?Buffer.from(raw).toString('utf8'):null;
 if(!log||log.length>2_000_000)return false;
 // Both markers come from the trusted BASE-owned specialist validator.
 return log.split(/\r?\n/).some(line=>
   /(?:^|\s)(?:##\[error\])?BASE_ADVANCED: PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED\s*$/.test(line)) &&
   log.includes('CI_SPECIALIST_FAIL_CLOSED: '+ERROR);
}
function isVerifiedAdvance(diff,tested,live){
 return SHA.test(tested||'')&&SHA.test(live||'')&&tested!==live&&
  diff?.status==='ahead'&&diff.base_commit?.sha===tested&&
  diff.merge_base_commit?.sha===tested&&diff.behind_by===0&&
  Number.isInteger(diff.ahead_by)&&diff.ahead_by>0&&diff.ahead_by<=100&&
  diff.total_commits===diff.ahead_by&&
  Array.isArray(diff.commits)&&diff.commits.length===diff.ahead_by&&
  diff.commits.at(-1)?.sha===live;
}

// BASE_ADVANCED may reappear every time fast-moving production advances.
// Repeated BASE-only merges create new PR HEADs and restart mandatory CI
// without repairing a failed source test. This is a bounded cost/progress
// HOLD, never a passing CI result or protection/merge waiver.
// The existing :10 task owner must revisit a held PR after the quiet period.
const BASE_SYNC_LOOKBACK_MS=90*60*1000;
const BASE_SYNC_MAX_RECENT_MERGES=2;
const BASE_MERGE_SUBJECT=/^Merge (?:remote-tracking )?branch ['"](?:origin\/)?codex\/public-book-library['"] into \S+/;
function classifyRecentBaseSyncs(commits,sourceSha,now=Date.now()){
 const unknown=reason=>({verified:false,hold:true,reason,count:null,retryAt:null});
 if(!SHA.test(sourceSha||'')||!Number.isFinite(now)||
    !Array.isArray(commits)||!commits.length||commits.length>100)
   return unknown('BASE_SYNC_HISTORY_UNVERIFIED');
 if(commits.at(-1)?.sha!==sourceSha)
   return unknown('BASE_SYNC_HISTORY_HEAD_CHANGED');
 const recent=[];
 for(const c of commits){
  if(!SHA.test(c?.sha||'')||!Array.isArray(c.parents)||!c.commit||
     typeof c.commit.message!=='string')
   return unknown('BASE_SYNC_HISTORY_MALFORMED');
  const subject=c.commit.message.split('\n')[0];
  if(c.parents.length!==2||!BASE_MERGE_SUBJECT.test(subject))continue;
  const at=Date.parse(c.commit.committer?.date||'');
  if(!Number.isFinite(at)||at>now+2*60_000)
   return unknown('BASE_SYNC_HISTORY_TIME_UNVERIFIED');
  if(at>=now-BASE_SYNC_LOOKBACK_MS)recent.push(at);
 }
 const count=recent.length,hold=count>=BASE_SYNC_MAX_RECENT_MERGES;
 return {verified:true,hold,reason:hold?'BASE_SYNC_REPEAT_BURST_HOLD':'BELOW_SYNC_BURST_BUDGET',
  count,retryAt:hold?new Date(recent.sort((a,b)=>a-b)
   [recent.length-BASE_SYNC_MAX_RECENT_MERGES]+BASE_SYNC_LOOKBACK_MS+1).toISOString():null};
}

function sameSource(pr,source,head){
 return pr?.state==='open'&&!pr.draft&&pr.base?.ref===PROD&&
  pr.head?.repo?.full_name===REPO&&pr.head.ref===source&&pr.head.sha===head&&
  pr.mergeable===true&&pr.mergeable_state!=='dirty' &&
  !['conflicting','dirty'].includes(pr.mergeable_state) &&
  !(pr.labels||[]).some(l=>HOLDS.has(typeof l==='string'?l:l?.name));
}
// Split privileges: the workflow's GITHUB_TOKEN reads Core/leases/logs.
// The owner PAT is confined to an identity-verified, expected-HEAD native
// branch update. A partial/denied response never implies a new CI wave.
async function ownerProtectedUpdate({fetcher,ownerToken,number,head,source,body}={}){
 const fail=reason=>({ok:false,reason});
 if(typeof fetcher!=='function'||typeof ownerToken!=='string'||!ownerToken||
    !Number.isSafeInteger(number)||number<1||!SHA.test(head||'')||
    typeof source!=='string'||!source||typeof body!=='string')
   return fail('OWNER_UPDATE_ARGUMENTS_INVALID');
 const endpoint='/repos/'+REPO+'/pulls/'+number;
 const headers={Authorization:'Bearer '+ownerToken,Accept:'application/vnd.github+json',
   'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'};
 const query=async(method,path,payload)=>{
  const response=await fetcher('https://api.github.com'+path,{
   method,headers,redirect:'error',signal:AbortSignal.timeout(20000),
   ...(payload?{body:JSON.stringify(payload)}:{})
  });
  if(!response||!Number.isSafeInteger(response.status))
   return {ok:false,status:0};
  if(!response.ok)return {ok:false,status:response.status};
  let data;
  try{data=await response.json();}catch{return {ok:false,status:0};}
  return {ok:true,status:response.status,data};
 };
 try{
  const identity=await query('GET','/user');
  if(!identity.ok)return fail('OWNER_IDENTITY_HTTP_'+identity.status);
  if(identity.data?.login!=='andylitvinov-design')
   return fail('OWNER_TOKEN_IDENTITY_MISMATCH');
  const pr=await query('GET',endpoint);
  if(!pr.ok)return fail('OWNER_PR_READ_HTTP_'+pr.status);
  if(pr.data?.number!==number||pr.data.state!=='open'||pr.data.draft!==false||
     pr.data.base?.ref!==PROD||pr.data.head?.repo?.full_name!==REPO||
     pr.data.head?.sha!==head||pr.data.head?.ref!==source||pr.data.body!==body||
     pr.data.mergeable===false||pr.data.mergeable_state==='dirty')
   return fail('OWNER_PAT_PR_CHANGED');
  const updated=await query('PUT',endpoint+'/update-branch',{
   expected_head_sha:head
  });
  if(!updated.ok)return fail('OWNER_BRANCH_UPDATE_HTTP_'+updated.status);
  if(updated.status!==202)return fail('OWNER_BRANCH_UPDATE_NOT_ACCEPTED');
  return {ok:true,reason:'PROTECTED_BASE_SYNC_REQUESTED_NEW_HEAD_REQUIRES_REAL_CI'};
 }catch{return fail('OWNER_BRANCH_API_UNAVAILABLE');}
}

// A single real ready_for_review Core validates the current synthetic merge
// WITHOUT publishing a new source HEAD, when the protected ruleset is loose.
// The owner token must prove identity and an unchanged source before mutation.
async function ownerProtectedReadyRevalidation({
 fetcher,ownerToken,number,head,source,body,onBeforeMutation
}={}){
 const fail=reason=>({ok:false,reason});
 if(typeof fetcher!=='function'||typeof ownerToken!=='string'||!ownerToken||
    !Number.isSafeInteger(number)||number<1||!SHA.test(head||'')||
    typeof source!=='string'||!source||typeof body!=='string'||
    typeof onBeforeMutation!=='function')return fail('READY_ARGUMENTS_INVALID');
 const endpoint='/repos/'+REPO+'/pulls/'+number;
 const headers={Authorization:'Bearer '+ownerToken,Accept:'application/vnd.github+json',
  'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'};
 const query=async(method,path,payload)=>{
  const response=await fetcher('https://api.github.com'+path,{method,headers,
   redirect:'error',signal:AbortSignal.timeout(20000),
   ...(payload?{body:JSON.stringify(payload)}:{})});
  if(!response?.ok||!Number.isSafeInteger(response.status))
   throw Error('OWNER_HTTP_'+(response?.status||0));
  const data=await response.json();
  if(data==null||typeof data!=='object')throw Error('OWNER_RESPONSE_INVALID');
  return data;
 };
 const same=(p,draft,id=null)=>p?.number===number&&p.state==='open'&&
  p.draft===draft&&p.base?.ref===PROD&&
  p.head?.sha===head&&p.head?.ref===source&&
  p.head?.repo?.full_name===REPO&&p.body===body&&
  (id===null||p.node_id===id);
 try{
  if((await query('GET','/user'))?.login!=='andylitvinov-design')
   return fail('OWNER_TOKEN_IDENTITY_MISMATCH');
  const first=await query('GET',endpoint),id=first?.node_id;
  if(!same(first,false)||typeof id!=='string'||!/^PR_[A-Za-z0-9_-]+$/.test(id))
   return fail('OWNER_PR_CHANGED');
  // A source/base/lease recheck and signed one-shot intent MUST precede Draft.
  await onBeforeMutation(first);
  if(!same(await query('GET',endpoint),false,id))
   return fail('OWNER_PR_CHANGED_BEFORE_DRAFT');
  const mutate=async name=>{
   const response=await query('POST','/graphql',{query:'mutation($id:ID!){'+name+
    '(input:{pullRequestId:$id}){pullRequest{id isDraft}}}',variables:{id}});
   const node=response?.data?.[name]?.pullRequest;
   if(response?.errors?.length||node?.id!==id||
      node.isDraft!==(name==='convertPullRequestToDraft'))
    throw Error('DRAFT_READY_MUTATION_UNVERIFIED');
  };
  await mutate('convertPullRequestToDraft');
  if(!same(await query('GET',endpoint),true,id))
   return fail('DRAFT_READBACK_UNVERIFIED');
  for(let attempt=0;attempt<2;attempt++){
   try{await mutate('markPullRequestReadyForReview');}catch{/* readback decides */}
   const next=await query('GET',endpoint);
   if(same(next,false,id))
    return {ok:true,reason:'SAME_HEAD_CURRENT_BASE_CORE_RECHECK_REQUESTED'};
   if(!same(next,true,id))return fail('READY_HEAD_OR_BODY_CHANGED');
  }
  return fail('READY_RESTORE_REQUIRED');
 }catch(error){
  const message=String(error?.message||'');
  return fail(message.startsWith('OWNER_HTTP_')?message:'OWNER_READY_RECHECK_UNAVAILABLE');
 }
}

async function recoverBaseAdvanced({github,context,hasOwnerToken=false,
 ownerToken='',fetcher=globalThis.fetch,now=Date.now()}){
 const outcome=(status,reason,number=null)=>({status,reason,prNumber:number,mergeAuthorized:false});
 if(!isTrustedFailure(context,now))return outcome('SKIPPED','UNTRUSTED_OR_NON_BASE_FAILURE');
 // GitHub Actions' ephemeral GITHUB_TOKEN suppresses subsequent push CI.
 // Without the already configured owner token, changing HEAD would strand CI.
 if(!hasOwnerToken||typeof ownerToken!=='string'||!ownerToken)
  return outcome('SKIPPED','OWNER_TOKEN_REQUIRED_FOR_NEW_CI');
 const e=context.payload.workflow_run;
 const refs=(e.pull_requests||[]).filter(x=>Number.isSafeInteger(x?.number)&&x.number>0&&
  x.base?.ref===PROD&&SHA.test(x.base.sha||'')&&
  SHA.test(x.head?.sha||'')&&x.head?.ref===e.head_branch);
 if(refs.length!==1)return outcome('SKIPPED','AMBIGUOUS_IMMUTABLE_PR_ASSOCIATION');
 const ref=refs[0],number=ref.number,sourceSha=ref.head.sha;
 let testedBase=ref.base.sha;
 try{
  const {owner,repo}=context.repo;
  const run=(await github.rest.actions.getWorkflowRun({owner,repo,run_id:e.id})).data;
  if(run?.id!==e.id||run.run_attempt!==e.run_attempt||
     run.status!=='completed'||run.conclusion!=='failure'||
     run.head_sha!==e.head_sha||run.head_branch!==e.head_branch||
     run.path?.split('@')[0]!==CORE_PATH)return outcome('SKIPPED','RUN_CHANGED',number);
  // A pull_request run may use GitHub's synthetic merge SHA rather than
  // the source branch SHA. Its two immutable parents prove the exact
  // tested BASE and PR source; never equate a merge SHA with the source.
  if(e.head_sha!==sourceSha){
   const merge=(await github.rest.repos.getCommit({owner,repo,ref:e.head_sha})).data;
   if(merge?.sha!==e.head_sha||!Array.isArray(merge.parents)||
      merge.parents.length!==2||!SHA.test(merge.parents[0]?.sha||'')||
      merge.parents[1]?.sha!==sourceSha)
    return outcome('SKIPPED','RUN_MERGE_PARENTS_UNVERIFIED',number);
   testedBase=merge.parents[0].sha;
  }
  const jobData=(await github.rest.actions.listJobsForWorkflowRun({
   owner,repo,run_id:e.id,per_page:100,filter:'latest'
  })).data;
  const specialistJobId=validatedJobEvidence(jobData);
  if(!specialistJobId)return outcome('SKIPPED','CORE_OR_SPECIALIST_FAILURE_UNVERIFIED',number);
  const logs=(await github.request('GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs',{
   owner,repo,job_id:specialistJobId
  })).data;
  if(!isActualBaseAdvancedLog(logs))
   return outcome('SKIPPED','NO_TRUSTED_BASE_ADVANCED_MARKER',number);
  let pr=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;
  if(pr?.mergeable===null){
   await new Promise(resolve=>setTimeout(resolve,2000));
   pr=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;
  }
  if(!sameSource(pr,e.head_branch,sourceSha))
   return outcome('SKIPPED','PR_SOURCE_CHANGED_DRAFT_HELD_OR_CONFLICT',number);
  const liveBranch=(await github.rest.repos.getBranch({owner,repo,branch:PROD})).data;
  const live=liveBranch?.commit?.sha,old=testedBase;
  if(liveBranch?.protected!==true||!SHA.test(live||'')||old===live)
   return outcome('SKIPPED','NO_VERIFIED_PROTECTED_BASE_ADVANCE',number);
  const diff=(await github.rest.repos.compareCommits({
   owner,repo,base:old,head:live,per_page:100
  })).data;
  if(!isVerifiedAdvance(diff,old,live))
   return outcome('SKIPPED','BASE_ANCESTRY_UNVERIFIED',number);
  // Read bounded GitHub PR commit history, not labels. With two recent
  // production-to-PR merges, a third automatic source HEAD is a churn hazard.
  // Unknown/truncated history holds; the existing triage owner can retry after
  // the returned quiet deadline with a fresh, signed exact-HEAD check.
  const commitsTotal=pr.commits;
  if(!Number.isSafeInteger(commitsTotal)||commitsTotal<1||commitsTotal>1000)
   return outcome('SKIPPED','BASE_SYNC_HISTORY_COUNT_UNVERIFIED',number);
  if(commitsTotal>=3){
   const page=Math.ceil(commitsTotal/100);
   const listed=(await github.rest.pulls.listCommits({
    owner,repo,pull_number:number,per_page:100,page
   })).data;
   const expected=commitsTotal-100*(page-1);
   if(!Array.isArray(listed)||listed.length!==expected)
    return outcome('SKIPPED','BASE_SYNC_HISTORY_INCOMPLETE',number);
   const burst=classifyRecentBaseSyncs(listed,sourceSha,now);
   if(!burst.verified)return outcome('SKIPPED',burst.reason,number);
   if(burst.hold)return {...outcome('SKIPPED',burst.reason,number),
     recentSyncs:burst.count,retryAt:burst.retryAt};
  }
  // Native update-branch is non-force and rejects a conflict. Do not overwrite
  // another owner/Repair worker's concurrent head while it holds a lease.
  let pages=0;
  const comments=await readCompleteIssueComments(github,owner,repo,number,
   async (_kind,call)=>{if(++pages>10)throw Error('LEASE_HISTORY_PAGE_LIMIT');return call();});
  if(!Array.isArray(comments)||externalOwnerLeaseStatus(comments,sourceSha,now)!=='FREE')
   return outcome('SKIPPED','ACTIVE_OR_UNVERIFIED_SOURCE_LEASE',number);
  const [fresh,production]=await Promise.all([
   github.rest.pulls.get({owner,repo,pull_number:number}),
   github.rest.repos.getBranch({owner,repo,branch:PROD})
  ]);
  if(!sameSource(fresh.data,e.head_branch,sourceSha)||
     production.data?.protected!==true||production.data?.commit?.sha!==live)
   return outcome('SKIPPED','HEAD_OR_BASE_CHANGED_BEFORE_UPDATE',number);
  // A verified loose protected ruleset permits re-checking this immutable
  // source SHA against the new production merge through Ready. Manual Repair
  // ownership and unknown policies retain the existing native update path.
  const manual=(pr.labels||[]).some(l=>
    (typeof l==='string'?l:l?.name)==='hh:repair-manual');
  if(!manual&&await verifiedLooseReleaseGate(github,owner,repo)){
   const latest=(await github.rest.actions.listWorkflowRuns({
    owner,repo,workflow_id:'hh-pr-core-release.yml',branch:e.head_branch,
    event:'pull_request',per_page:1
   })).data?.workflow_runs;
   if(!Array.isArray(latest)||latest.length!==1||
      latest[0].id!==e.id||latest[0].head_sha!==e.head_sha||
      latest[0].status!=='completed'||latest[0].conclusion!=='failure')
    return outcome('SKIPPED','NEWER_OR_UNVERIFIED_CORE_WAVE',number);
   const existingIntent=rows=>rows.some(c=>trustedControlComment(c)&&
    String(c.body||'').includes('<!-- '+READY_MARKER+
      ' pr='+number+' head='+sourceSha+' '));
   if(existingIntent(comments))
    return outcome('SKIPPED','ONE_WAKE_ALREADY_RECORDED_FOR_HEAD',number);
   const ready=await ownerProtectedReadyRevalidation({
    fetcher,ownerToken,number,head:sourceSha,source:e.head_branch,body:pr.body,
    onBeforeMutation:async()=>{
     const [livePR,liveBranch]=await Promise.all([
      github.rest.pulls.get({owner,repo,pull_number:number}),
      github.rest.repos.getBranch({owner,repo,branch:PROD})
     ]);
     if(!sameSource(livePR.data,e.head_branch,sourceSha)||
        liveBranch.data?.protected!==true||liveBranch.data?.commit?.sha!==live)
      throw Error('SOURCE_OR_BASE_CHANGED_BEFORE_READY');
     let pages=0;
     const recent=await readCompleteIssueComments(github,owner,repo,number,
      async(_name,call)=>{if(++pages>10)throw Error('COMMENT_RECHECK_LIMIT');return call();});
     if(!Array.isArray(recent)||existingIntent(recent)||
        externalOwnerLeaseStatus(recent,sourceSha,now)!=='FREE')
      throw Error('LEASE_OR_INTENT_CHANGED');
     await github.rest.issues.createComment({owner,repo,issue_number:number,
      body:'<!-- '+READY_MARKER+' pr='+number+' head='+sourceSha+
       ' from='+old+' to='+live+' core='+e.id+' -->\n'+
       'One same-HEAD Ready event requested for real current-BASE Core and Specialist. '+
       'Not source changed, CI PASS, merged or LIVE.'});
    }
   });
   if(!ready.ok)return outcome('SKIPPED',ready.reason,number);
   return {...outcome('READY_RECHECK_REQUESTED',ready.reason,number),
    sourceHeadPreserved:true,ciVerified:false};
  }
  // A normal merge of protected production into the PR head. GitHub performs
  // the expected_head_sha lease atomically; synchronize triggers genuine CI.
  const updated=await ownerProtectedUpdate({fetcher,ownerToken,
   number,head:sourceSha,source:e.head_branch,body:pr.body});
  if(!updated.ok)return outcome('SKIPPED',updated.reason,number);
  return outcome('UPDATED',updated.reason,number);
 }catch(error){
  const code=Number(error?.status||0);
  return outcome('SKIPPED',code?'READ_GITHUB_API_'+code:'BASE_RECOVERY_EVIDENCE_UNAVAILABLE',number);
 }
}
module.exports={isTrustedFailure,validatedJobEvidence,isActualBaseAdvancedLog,
 isVerifiedAdvance,classifyRecentBaseSyncs,sameSource,ownerProtectedUpdate,ownerProtectedReadyRevalidation,recoverBaseAdvanced};
