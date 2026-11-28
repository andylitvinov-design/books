'use strict';
// Trusted default-branch policy used by BOTH event-driven and hourly native
// Green -> Merge coordinators. It never executes candidate PR code, writes
// source files, bypasses reviews/protection, or directly merges.
const {externalOwnerLeaseStatus,readCompleteIssueComments} =
  require('./ci-pr-task-state.cjs');
const PROD='codex/public-book-library';
const SHA=/^[0-9a-f]{40}$/i;
const RULESET=26269892;
const HOLDS=new Set([
  // A successful preflight is not a source commit or a manual hold release.
  'hh:hold','hh:blocked','hh:repair-manual','hh:worker-claimed',
  'hh:direction-override:invalid'
]);
const REVIEW_QUERY=`
query HHNativeMergeReview($owner:String!,$repo:String!,$number:Int!,$after:String){
  repository(owner:$owner,name:$repo){
    pullRequest(number:$number){
      headRefOid
      baseRefName
      reviewDecision
      reviewThreads(first:100,after:$after){
        pageInfo{hasNextPage endCursor}
        nodes{isResolved}
      }
    }
  }
}`;
function repairCanary(pr){
 return !!(pr&&(typeof pr.head?.ref==='string'&&
   /^test\/pr-repair-/.test(pr.head.ref)||
   typeof pr.title==='string'&&/^test\(repair\):/i.test(pr.title)));
}
function sameHead(pr,{owner,repo,number,expectedHead,expectedBase,allowVerifiedBaseAdvance=false}){
 // A PR's base.sha may lag the protected ref after Core passed. The
 // event-driven caller may reuse its exact-HEAD results ONLY when the trusted
 // freshness gate just proved the current protected SHA independently.
 // The legacy/hourly callers retain strict base-snapshot matching.
 return pr?.number===number&&pr.state==='open'&&pr.draft===false&&
  pr.base?.ref===PROD&&SHA.test(pr.base?.sha||'')&&
  (allowVerifiedBaseAdvance===true||pr.base.sha===expectedBase)&&
  pr.head?.sha===expectedHead&&
  pr.head.repo?.full_name===owner+'/'+repo;
}
function mergeable(pr){
 // "blocked" is a GitHub protection/review/required-check state, NOT a
 // merge conflict. Both callers already demand successful mandatory CI;
 // the shared preflight separately verifies review/lease/HEAD. Native --auto
 // remains subject to all hosted rules. Null/dirty/conflicting stay denied.
 return pr?.mergeable===true&&
  ['clean','behind','unstable','blocked'].includes(pr.mergeable_state);
}
function held(pr){
 const labels=(pr?.labels||[]).map(l=>typeof l==='string'?l:l?.name);
 return labels.find(name=>HOLDS.has(name))||null;
}
async function inspectReviews({github,owner,repo,number,expectedHead,minimumApprovals}){
 let after=null,seen=new Set(),decision=null;
 for(let page=0;page<5;page++){
  const payload=await github.graphql(REVIEW_QUERY,{owner,repo,number,after});
  const pr=payload?.repository?.pullRequest;
  const threads=pr?.reviewThreads;
  if(!pr||pr.headRefOid!==expectedHead||pr.baseRefName!==PROD||
     !threads||!Array.isArray(threads.nodes)||
     threads.nodes.length>100||!threads.pageInfo||
     typeof threads.pageInfo.hasNextPage!=='boolean')
   return {ok:false,reason:'REVIEW_EVIDENCE_INCOMPLETE'};
  if(page&&pr.reviewDecision!==decision)
   return {ok:false,reason:'REVIEW_CHANGED_DURING_CHECK'};
  decision=pr.reviewDecision;
  if(![null,'APPROVED','CHANGES_REQUESTED','REVIEW_REQUIRED'].includes(decision))
   return {ok:false,reason:'UNKNOWN_REVIEW_DECISION'};
  if(decision==='CHANGES_REQUESTED'||decision==='REVIEW_REQUIRED')
   return {ok:false,reason:'REVIEW_NOT_APPROVED'};
  if(minimumApprovals>0&&decision!=='APPROVED')
   return {ok:false,reason:'MANDATORY_APPROVAL_MISSING'};
  if(threads.nodes.some(t=>t?.isResolved!==true))
   return {ok:false,reason:'UNRESOLVED_REVIEW_THREAD'};
  if(!threads.pageInfo.hasNextPage)
   return {ok:true,reason:'REVIEW_POLICY_SATISFIED'};
  const cursor=threads.pageInfo.endCursor;
  if(typeof cursor!=='string'||!cursor||seen.has(cursor))
   return {ok:false,reason:'REVIEW_PAGINATION_UNVERIFIED'};
  seen.add(cursor);after=cursor;
 }
 return {ok:false,reason:'REVIEW_THREAD_HISTORY_TOO_LARGE'};
}
// Independent critical domain checks can finish RED while Core is GREEN.
// Block native ARM on those REAL current-HEAD results (incident #3577/#3580).
// Missing optional check runs are not invented, but known RED/PENDING is fatal.
const CRITICAL_DOMAIN_CHECKS=new Set([
 'focused-unit-types-build','read-only-mobile','webkit_preflight','voice-webkit-macos'
]);

const CORE_PATH='.github/workflows/hh-pr-core-release.yml';
const QUEUED=new Set(['queued','requested','waiting','pending']);
// Only a genuine current unified gate can authorize skipping a queued
// duplicate. Recheck the actual prior job; running/red/missing proof stays HOLD.

// Verify the protected Specialist's equivalent-merge-tree receipt, not
// merely the SHA or message of a source synchronization commit.
async function verifyPriorTreeEquivalence({row,currentCommit,oldCommit,expectedHead,expectedBase,lines,readCommit}){
 if(currentCommit?.sha!==expectedHead||oldCommit?.sha!==row.prior_head||
    !SHA.test(currentCommit.tree?.sha||'')||!SHA.test(oldCommit.tree?.sha||''))return false;
 if(currentCommit.tree.sha===oldCommit.tree.sha)return true;
 if(row.proof_mode!=='equivalent_merge_tree'||row.tested_base!==expectedBase||
    ![row.prior_merge,row.tested_merge].every(x=>SHA.test(x||''))||
    row.prior_merge===row.tested_merge||currentCommit.parents?.length!==2||
    currentCommit.parents[0]?.sha!==row.prior_head||currentCommit.parents[1]?.sha!==expectedBase||
    typeof readCommit!=='function')return false;
 const checkout=lines.flatMap((line,i)=>line==='[command]/usr/bin/git log -1 --format=%H'?[i]:[]);
 if(checkout.length!==1||lines[checkout[0]+1]!==row.tested_merge)return false;
 try{
  const [before,after]=await Promise.all([readCommit(row.prior_merge),readCommit(row.tested_merge)]);
  return before?.sha===row.prior_merge&&after?.sha===row.tested_merge&&
   before.parents?.length===2&&before.parents[0]?.sha===expectedBase&&before.parents[1]?.sha===row.prior_head&&
   after.parents?.length===2&&after.parents[0]?.sha===expectedBase&&after.parents[1]?.sha===expectedHead&&
   SHA.test(before.tree?.sha||'')&&before.tree.sha===after.tree?.sha&&after.tree.sha===currentCommit.tree.sha;
 }catch{return false;}
}

async function verifiedQueuedDuplicateChecks({github,owner,repo,pr,expectedHead,expectedBase,checks,pending}){
 const approved=new Set(),full=owner+'/'+repo;
 if(!pr?.head?.ref||!SHA.test(expectedBase||'')||!Array.isArray(pending)||!pending.length||
    !pending.every(c=>QUEUED.has(c.status)))return approved;
 try{
  const gates=checks.filter(c=>c.name==='hh-merge-check'&&c.head_sha===expectedHead&&
   c.app?.id===15368&&c.app?.slug==='github-actions'&&c.status==='completed'&&c.conclusion==='success');
  if(gates.length!==1)return approved;
  const load=async check=>{
   const prefix='https://github.com/'+full+'/actions/runs/';
   const url=check.details_url||'';
   const ids=url.startsWith(prefix)&&/^([1-9]\d*)\/job\/([1-9]\d*)\/?$/.exec(url.slice(prefix.length));
   if(!ids)throw Error('CHECK_JOB_UNVERIFIED');
   const runId=Number(ids[1]),jobId=Number(ids[2]);
   if(!Number.isSafeInteger(runId)||!Number.isSafeInteger(jobId)||!Number.isSafeInteger(check.id))throw Error('CHECK_JOB_UNVERIFIED');
   const job=(await github.rest.actions.getJobForWorkflowRun({owner,repo,job_id:jobId})).data;
   const run=(await github.rest.actions.getWorkflowRun({owner,repo,run_id:runId})).data;
   if(job?.id!==jobId||job.run_id!==runId||job.name!==check.name||
      job.check_run_url!=='https://api.github.com/repos/'+full+'/check-runs/'+check.id||
      run?.id!==runId||run.event!=='pull_request'||run.head_sha!==expectedHead||
      run.head_branch!==pr.head.ref||run.head_repository?.full_name!==full||
      !run.pull_requests?.some(p=>p.number===pr.number&&p.base?.ref===PROD))throw Error('CHECK_JOB_UNVERIFIED');
   return {job,run};
  };
  const gate=await load(gates[0]);
  if(gate.job.status!=='completed'||gate.job.conclusion!=='success'||
     gate.run.status!=='completed'||gate.run.conclusion!=='success'||
     String(gate.run.path||'').split('@')[0]!==CORE_PATH||
     !gate.job.steps?.some(x=>x.name==='Validate exact-head risk and required specialist workflows'&&x.status==='completed'&&x.conclusion==='success'))return approved;
  const policy=async ref=>(await github.rest.repos.getContent({owner,repo,path:CORE_PATH,ref})).data;
  const [trusted,candidate]=await Promise.all([policy(expectedBase),policy(expectedHead)]);
  if(trusted?.type!=='file'||candidate?.type!=='file'||!SHA.test(trusted.sha||'')||
     trusted.sha!==candidate.sha)return approved;
  const reply=(await github.request('GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs',{owner,repo,job_id:gate.job.id})).data;
  const log=typeof reply==='string'?reply:
   (Buffer.isBuffer(reply)||reply instanceof ArrayBuffer)?Buffer.from(reply).toString('utf8'):'';
  if(!log||log.length>24*1024*1024)return approved;
  const lines=log.split(/\r?\n/).map(x=>x.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z[ \t]+/,'').trim());
  const marker='CI_PRIOR_HEAD_SPECIALIST_REUSED:';
  const receipts=lines.filter(x=>x.startsWith(marker));
  const headers=lines.filter(x=>x.startsWith('Specialist CI aggregate for PR #'));
  if(receipts.length!==1||headers.length!==1||
     !headers[0].startsWith('Specialist CI aggregate for PR #'+pr.number+' head='+expectedHead+' event_base=')||
     !headers[0].endsWith(' tested_base='+expectedBase))return approved;
  const rows=JSON.parse(receipts[0].slice(marker.length));
  if(!Array.isArray(rows)||!rows.length||rows.length>100||
     new Set(rows.map(x=>x?.name)).size!==rows.length)return approved;
  const byPath=new Map(rows.map(x=>[x.name,x]));
  for(const check of pending){
   const current=await load(check);
   if(!QUEUED.has(current.job.status))continue;
   const row=byPath.get(String(current.run.path||'').split('@')[0]);
   if(!row||!SHA.test(row.prior_head||'')||row.prior_head===expectedHead||
      !Number.isSafeInteger(row.run_id)||row.run_id<1||
      !Number.isSafeInteger(row.prior_gate_run)||row.prior_gate_run<1||
      !Number.isSafeInteger(row.prior_run_attempt)||row.prior_run_attempt<1)continue;
   const [prior,currentCommit,oldCommit]=await Promise.all([
    github.rest.actions.getWorkflowRun({owner,repo,run_id:row.run_id}).then(x=>x.data),
    github.rest.git.getCommit({owner,repo,commit_sha:expectedHead}).then(x=>x.data),
    github.rest.git.getCommit({owner,repo,commit_sha:row.prior_head}).then(x=>x.data)]);
   if(prior?.id!==row.run_id||prior.head_sha!==row.prior_head||
      prior.event!=='pull_request'||prior.head_repository?.full_name!==full||
      prior.head_branch!==pr.head.ref||prior.status!=='completed'||prior.conclusion!=='success'||
      String(prior.path||'').split('@')[0]!==row.name||
      !prior.pull_requests?.some(p=>p.number===pr.number&&p.base?.ref===PROD)||
      prior.run_attempt!==row.prior_run_attempt)continue;
   if(!await verifyPriorTreeEquivalence({row,currentCommit,oldCommit,expectedHead,expectedBase,lines,
     readCommit:async sha=>(await github.rest.git.getCommit({owner,repo,commit_sha:sha})).data}))continue;
   const jobs=(await github.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs',
    {owner,repo,run_id:prior.id,attempt_number:prior.run_attempt,per_page:100})).data;
   if(!Array.isArray(jobs?.jobs)||jobs.total_count!==jobs.jobs.length||jobs.jobs.length>100)continue;
   const matching=jobs.jobs.filter(j=>j.name===check.name);
   if(matching.length===1&&matching[0].run_id===prior.id&&matching[0].status==='completed'&&
      matching[0].conclusion==='success')approved.add(check.id);
  }
 }catch{/* Unavailable or ambiguous proof preserves the existing wait. */}
 return approved;
}

// Shared by the hourly fallback as well as the event-driven native guard.
// A verified receipt covers only its exact queued job, not every check name.
async function verifyQueuedQualityDuplicates({github,owner,repo,pr,expectedHead,expectedBase,checks,pending}){
 if(!Array.isArray(pending))return false;
 if(!pending.length)return true;
 if(!pending.every(c=>QUEUED.has(c.status)&&Number.isSafeInteger(c.id)&&
   c.head_sha===expectedHead&&c.app?.id===15368&&c.app?.slug==='github-actions'))return false;
 const approved=await verifiedQueuedDuplicateChecks({github,owner,repo,pr,expectedHead,expectedBase,checks,pending});
 return pending.every(c=>approved.has(c.id));
}

async function auditIndependentDomainChecks({github,owner,repo,expectedHead,expectedBase,pr}){
 if(typeof github?.rest?.checks?.listForRef!=='function')
  return {ok:false,reason:'CRITICAL_CHECK_API_UNAVAILABLE'};
 // GitHub may report >100 checks for one source SHA. Do not classify a
 // normal first-page truncation as a product failure. Require complete,
 // consistent pagination; real critical RED/PENDING on any page stays fatal.
 const checks=[];
 let total=null;
 for(let page=1;page<=5;page++){
  const data=(await github.rest.checks.listForRef({
   owner,repo,ref:expectedHead,per_page:100,page,filter:'latest'
  })).data;
  if(!Number.isSafeInteger(data?.total_count)||data.total_count<0||
     data.total_count>500||!Array.isArray(data.check_runs)||
     data.check_runs.length>100||(total!==null&&total!==data.total_count))
   return {ok:false,reason:'CRITICAL_CHECK_INVENTORY_INCOMPLETE'};
  total=data.total_count;
  if(checks.length+data.check_runs.length>total)
   return {ok:false,reason:'CRITICAL_CHECK_INVENTORY_INCOMPLETE'};
  checks.push(...data.check_runs);
  if(checks.length===total)break;
  if(data.check_runs.length!==100||page===5)
   return {ok:false,reason:'CRITICAL_CHECK_INVENTORY_INCOMPLETE'};
 }
 const pending=checks.filter(c=>CRITICAL_DOMAIN_CHECKS.has(c?.name)&&c.status!=='completed');
 const reused=pending.length&&pending.every(c=>QUEUED.has(c.status))?
  await verifiedQueuedDuplicateChecks({github,owner,repo,pr,expectedHead,expectedBase,checks,pending}):new Set();
 for(const name of CRITICAL_DOMAIN_CHECKS){
  const matches=checks.filter(c=>c?.name===name);
  if(matches.some(c=>c.head_sha!==expectedHead||
     c.app?.slug!=='github-actions'))
   return {ok:false,reason:'CRITICAL_CHECK_PROOF_UNVERIFIED:'+name};
  if(matches.some(c=>c.status!=='completed'&&!reused.has(c.id)))
   return {ok:false,reason:'CRITICAL_CHECK_PENDING:'+name};
  if(matches.some(c=>c.status==='completed'&&!['success','skipped'].includes(c.conclusion)))
   return {ok:false,reason:'CRITICAL_CHECK_FAILED:'+name};
 }
 return {ok:true,reason:'CRITICAL_DOMAIN_CHECKS_NOT_RED'};
}
async function auditNativeMerge({github,owner,repo,number,expectedHead,expectedBase,
  allowVerifiedBaseAdvance=false}){
 const deny=reason=>({ok:false,reason});
 if(!github?.rest?.pulls?.get||!github?.rest?.issues?.listComments||
    !github?.request||!github?.graphql||
    !Number.isSafeInteger(number)||number<1||
    !SHA.test(expectedHead||'')||!SHA.test(expectedBase||''))
  return deny('INVALID_MERGE_PREFLIGHT');
 try{
  const identity={owner,repo,number,expectedHead,expectedBase,allowVerifiedBaseAdvance};
  const checkVerifiedProtectedBase=async()=>{
   // A PR's base.sha is GitHub's mutable snapshot, NOT the authoritative
   // protected ref. In opt-in native release mode, independently verify the
   // exact protected SHA passed by the already successful freshness check.
   // A second read at the end closes this event race before native ARM.
   if(!allowVerifiedBaseAdvance)return true;
   if(typeof github.rest.repos?.getBranch!=='function')return false;
   const current=(await github.rest.repos.getBranch({
    owner,repo,branch:PROD
   })).data;
   return current?.protected===true&&current?.commit?.sha===expectedBase;
  };
  const first=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;
  if(repairCanary(first))return deny('REPAIR_CANARY_NEVER_MERGE');
  if(!sameHead(first,identity))return deny('PR_HEAD_BASE_OR_STATE_CHANGED');
  if(!(await checkVerifiedProtectedBase()))return deny('VERIFIED_PRODUCTION_BASE_MOVED');
  if(held(first))return deny(held(first)==='hh:repair-manual'?
    'LEGACY_MANUAL_SOURCE_NOT_RELEASED':'MANUAL_OR_OWNER_HOLD');
  if(!mergeable(first))return deny(first?.mergeable===false||first?.mergeable_state==='dirty'
    ?'MERGE_CONFLICT':'MERGEABILITY_NOT_READY');
  // Rules are read, not modified. GitHub is still the final merge authority.
  const ruleset=(await github.request('GET /repos/{owner}/{repo}/rulesets/{ruleset_id}',{
    owner,repo,ruleset_id:RULESET
  })).data;
  const pullRule=ruleset?.rules?.find(rule=>rule.type==='pull_request');
  const settings=pullRule?.parameters;
  const minimumApprovals=settings?.required_approving_review_count;
  if(ruleset?.enforcement!=='active'||!settings||
     settings.required_review_thread_resolution!==true||
     !Number.isSafeInteger(minimumApprovals)||minimumApprovals<0||
     !Array.isArray(settings.allowed_merge_methods)||
     !settings.allowed_merge_methods.includes('squash')||
     !settings.allowed_merge_methods.includes('merge'))
   return deny('PRODUCTION_REVIEW_RULESET_UNVERIFIED');
  // A single missing page or ambiguous modern lease blocks. Do not expire
  // modern source ownership merely because a timestamp elapsed.
  let pages=0;
  const comments=await readCompleteIssueComments(github,owner,repo,number,
    async (_name,request)=>{
      if(++pages>10)throw Error('LEASE_HISTORY_PAGE_LIMIT');
      return request();
    });
  if(!Array.isArray(comments))return deny('LEASE_HISTORY_INCOMPLETE');
  const lease=externalOwnerLeaseStatus(comments,expectedHead,Date.now());
  if(lease!=='FREE')return deny(lease);
  const review=await inspectReviews({github,owner,repo,number,
    expectedHead,minimumApprovals});
  if(!review.ok)return review;
  // This same read-only guard is shared by hourly and event-driven merge lanes.
  const critical=await auditIndependentDomainChecks({github,owner,repo,expectedHead,expectedBase,pr:first});
  if(!critical.ok)return critical;
  // Last fresh read before GitHub's --match-head-commit atomic enforcement.
  const final=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;
  if(repairCanary(final))return deny('REPAIR_CANARY_NEVER_MERGE');
  if(!sameHead(final,identity))return deny('PR_CHANGED_BEFORE_ARM');
  if(!(await checkVerifiedProtectedBase()))return deny('VERIFIED_PRODUCTION_BASE_MOVED');
  if(held(final))return deny(held(final)==='hh:repair-manual'?
    'LEGACY_MANUAL_SOURCE_NOT_RELEASED':'HOLD_ADDED_BEFORE_ARM');
  if(!mergeable(final))return deny('MERGEABILITY_CHANGED_BEFORE_ARM');
  return {ok:true,reason:'REVIEW_LEASE_CONFLICT_HEAD_VERIFIED'};
 }catch(error){
  // Rate-limits, unavailable APIs, malformed evidence and permission denials
  // never become a green signal or trigger a manual/unsafe direct merge.
  const status=Number(error?.status||0);
  return deny(status===403||status===429?'API_RATE_LIMIT_OR_FORBIDDEN':
   'MERGE_PREFLIGHT_EVIDENCE_UNAVAILABLE');
 }
}
module.exports={PROD,HOLDS,REVIEW_QUERY,sameHead,repairCanary,mergeable,held,inspectReviews,auditNativeMerge,auditIndependentDomainChecks,verifiedQueuedDuplicateChecks,verifyQueuedQualityDuplicates,CRITICAL_DOMAIN_CHECKS};
