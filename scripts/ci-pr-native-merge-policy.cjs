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
function sameHead(pr,{owner,repo,number,expectedHead,expectedBase}){
 return pr?.number===number&&pr.state==='open'&&pr.draft===false&&
  pr.base?.ref===PROD&&pr.base?.sha===expectedBase&&
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
async function auditIndependentDomainChecks({github,owner,repo,expectedHead}){
 if(typeof github?.rest?.checks?.listForRef!=='function')
  return {ok:false,reason:'CRITICAL_CHECK_API_UNAVAILABLE'};
 const data=(await github.rest.checks.listForRef({
  owner,repo,ref:expectedHead,per_page:100,filter:'latest'
 })).data;
 if(!Number.isSafeInteger(data?.total_count)||data.total_count<0||
    data.total_count>100||!Array.isArray(data.check_runs)||
    data.check_runs.length!==data.total_count)
  return {ok:false,reason:'CRITICAL_CHECK_INVENTORY_INCOMPLETE'};
 for(const name of CRITICAL_DOMAIN_CHECKS){
  const matches=data.check_runs.filter(c=>c?.name===name);
  if(matches.some(c=>c.head_sha!==expectedHead||
     c.app?.slug!=='github-actions'))
   return {ok:false,reason:'CRITICAL_CHECK_PROOF_UNVERIFIED:'+name};
  if(matches.some(c=>c.status!=='completed'))
   return {ok:false,reason:'CRITICAL_CHECK_PENDING:'+name};
  if(matches.some(c=>!['success','skipped'].includes(c.conclusion)))
   return {ok:false,reason:'CRITICAL_CHECK_FAILED:'+name};
 }
 return {ok:true,reason:'CRITICAL_DOMAIN_CHECKS_NOT_RED'};
}
async function auditNativeMerge({github,owner,repo,number,expectedHead,expectedBase}){
 const deny=reason=>({ok:false,reason});
 if(!github?.rest?.pulls?.get||!github?.rest?.issues?.listComments||
    !github?.request||!github?.graphql||
    !Number.isSafeInteger(number)||number<1||
    !SHA.test(expectedHead||'')||!SHA.test(expectedBase||''))
  return deny('INVALID_MERGE_PREFLIGHT');
 try{
  const identity={owner,repo,number,expectedHead,expectedBase};
  const first=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;
  if(repairCanary(first))return deny('REPAIR_CANARY_NEVER_MERGE');
  if(!sameHead(first,identity))return deny('PR_HEAD_BASE_OR_STATE_CHANGED');
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
  const critical=await auditIndependentDomainChecks({github,owner,repo,expectedHead});
  if(!critical.ok)return critical;
  // Last fresh read before GitHub's --match-head-commit atomic enforcement.
  const final=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;
  if(repairCanary(final))return deny('REPAIR_CANARY_NEVER_MERGE');
  if(!sameHead(final,identity))return deny('PR_CHANGED_BEFORE_ARM');
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
module.exports={PROD,HOLDS,REVIEW_QUERY,sameHead,repairCanary,mergeable,held,inspectReviews,auditNativeMerge,auditIndependentDomainChecks,CRITICAL_DOMAIN_CHECKS};
