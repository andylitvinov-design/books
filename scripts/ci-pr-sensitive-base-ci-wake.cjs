'use strict';
// One necessary, bounded revalidation of a changed *protected* production
// base. Uses the existing PAT-authored Ready event, never a source commit,
// direct merge, invented green check, new workflow, or cron.
const {readCompleteIssueComments,externalOwnerLeaseStatus,
 trustedControlComment}=require('./ci-pr-task-state.cjs');
const OWNER='andylitvinov-design',REPO='books',FULL=OWNER+'/'+REPO;
const PROD='codex/public-book-library';
const CORE='HH PR core release gate',MARKER='HH_SENSITIVE_BASE_CI_REVALIDATE_V1';
const SHA=/^[0-9a-f]{40}$/i;
const HELD=new Set(['hh:hold','hh:repair-manual','hh:blocked',
 'hh:worker-claimed','hh:direction-override:invalid','hh:repair-needed']);
function candidate(pr,expectedHead){
 if(!pr||pr.state!=='open'||pr.draft||pr.user?.login!==OWNER||
   !Number.isSafeInteger(pr.number)||pr.number<1||
   pr.base?.ref!==PROD||pr.head?.repo?.full_name!==FULL||
   pr.head?.sha!==expectedHead||!SHA.test(expectedHead||'')||
   pr.mergeable!==true||!['clean','blocked','unstable','behind'].includes(pr.mergeable_state)||
   pr.auto_merge!=null||!Array.isArray(pr.labels))return false;
 return !pr.labels.some(l=>HELD.has(l?.name));
}
async function run({github,context,token,number,head,oldBase,newBase,coreRunId,
 now=Date.now(),fetcher=globalThis.fetch}={}){
 const result={schema:MARKER,pr_number:number,status:'HOLD',reason:'UNVERIFIED',
  sourceChanged:false,ciVerified:false,metadataEventRequested:false};
 const hold=reason=>({...result,reason});
 if(context?.eventName!=='workflow_run'||
   context?.repo?.owner!==OWNER||context?.repo?.repo!==REPO||
   context?.payload?.workflow_run?.name!==CORE||
   context?.payload?.workflow_run?.event!=='pull_request'||
   context?.payload?.workflow_run?.conclusion!=='success'||
   context?.payload?.workflow_run?.id!==coreRunId||
   !Number.isSafeInteger(coreRunId)||coreRunId<1||
   !Number.isSafeInteger(number)||number<1||
   !SHA.test(head||'')||!SHA.test(oldBase||'')||!SHA.test(newBase||'')||
   oldBase===newBase||!Number.isFinite(now))
  return hold('UNTRUSTED_OR_NOT_STALE');
 if(typeof token!=='string'||!token||typeof fetcher!=='function')
  return hold('OWNER_TOKEN_NOT_CONFIGURED');
 const {owner,repo}=context.repo;
 let pr,branch,latest,comparison,children,comments;
 try{
  pr=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;
  if(!candidate(pr,head))return hold('PR_HOLD_OR_CHANGED_HEAD');
  branch=(await github.rest.repos.getBranch({owner,repo,branch:PROD})).data;
  if(branch?.protected!==true||branch.commit?.sha!==newBase)
   return hold('PROTECTED_BASE_MOVED');
  comparison=(await github.rest.repos.compareCommits({
   owner,repo,base:oldBase,head:newBase,per_page:100})).data;
  if(comparison?.status!=='ahead'||comparison.behind_by!==0||
     comparison.base_commit?.sha!==oldBase||
     comparison.merge_base_commit?.sha!==oldBase)
   return hold('BASE_ANCESTRY_NOT_PROVEN');
  latest=(await github.rest.actions.listWorkflowRuns({owner,repo,
   workflow_id:'hh-pr-core-release.yml',branch:pr.head.ref,
   event:'pull_request',per_page:20})).data;
  const first=latest?.workflow_runs?.[0];
  if(!Array.isArray(latest.workflow_runs)||
     latest.workflow_runs.length===0||latest.workflow_runs.length>20||
     first?.id!==coreRunId||first?.head_sha!==head||
     first?.conclusion!=='success'||first?.status!=='completed')
   return hold('NEWER_OR_INCOMPLETE_CORE_WAVE');
  children=(await github.rest.pulls.list({owner,repo,state:'open',
   base:pr.head.ref,per_page:1})).data;
  if(!Array.isArray(children)||children.length)return hold('STACKED_PARENT');
  let pages=0;
  comments=await readCompleteIssueComments(github,owner,repo,number,
   async (_name,call)=>{if(++pages>5)throw Error('COMMENT_LIMIT');return call();});
  if(!Array.isArray(comments))return hold('LEASE_HISTORY_INCOMPLETE');
  const seen=comments.some(c=>trustedControlComment(c)&&
   String(c.body||'').includes('<!-- '+MARKER+' pr='+number+' head='+head+' '));
  if(seen)return hold('ONE_WAKE_ALREADY_RECORDED_FOR_HEAD');
  if(externalOwnerLeaseStatus(comments,head,now)!=='FREE')
   return hold('SOURCE_OWNER_LEASE_NOT_FREE');
 }catch{return hold('PREFLIGHT_EVIDENCE_UNAVAILABLE');}
 const ownerCall=async(method,path,body)=>{
  const response=await fetcher('https://api.github.com'+path,{
   method,headers:{Authorization:'Bearer '+token,
    Accept:'application/vnd.github+json','Content-Type':'application/json',
    'X-GitHub-Api-Version':'2022-11-28'},
   ...(body?{body:JSON.stringify(body)}:{}),
   signal:AbortSignal.timeout(20000)
  });
  if(!response?.ok)throw Error('OWNER_API_DENIED_'+response?.status);
  return response.json();
 };
 let pat;
 try{
  const identity=await ownerCall('GET','/user');
  if(identity?.login!==OWNER)return hold('OWNER_TOKEN_IDENTITY_MISMATCH');
  pat=await ownerCall('GET','/repos/'+FULL+'/pulls/'+number);
  if(pat?.head?.sha!==head||pat?.state!=='open'||pat.draft!==false||
     pat?.base?.ref!==PROD||pat?.body!==pr.body||
     typeof pat.node_id!=='string'||!/^PR_[A-Za-z0-9_-]+$/.test(pat.node_id))
   return hold('PAT_PR_CHANGED');
  const current=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;
  const check=(await github.rest.repos.getBranch({owner,repo,branch:PROD})).data;
  if(!candidate(current,head)||check?.commit?.sha!==newBase||
     current.body!==pr.body)return hold('PR_OR_BASE_CHANGED_BEFORE_WAKE');
 }catch{return hold('OWNER_PREFLIGHT_UNAVAILABLE');}
 // A signed one-shot intent is written BEFORE any metadata mutation. Even if
 // the transition fails, do not storm a PR with duplicate CI or Draft cycles.
 try{
  await github.rest.issues.createComment({owner,repo,issue_number:number,
   body:'<!-- '+MARKER+' pr='+number+' head='+head+
    ' from='+oldBase+' to='+newBase+' core='+coreRunId+' -->\n'+
    'Necessary current-base CI revalidation requested by trusted coordinator. '+
    'One attempt for this exact HEAD; this is not CI PASS, merge or LIVE.'});
 }catch{return hold('SIGNED_WAKE_INTENT_NOT_WRITTEN');}
 const mutation=async(name)=>{
  const query='mutation($id:ID!){'+name+
   '(input:{pullRequestId:$id}){pullRequest{id isDraft}}}';
  const response=await ownerCall('POST','/graphql',
   {query,variables:{id:pat.node_id}});
  const observed=response?.data?.[name]?.pullRequest;
  if(response?.errors?.length||observed?.id!==pat.node_id||
     observed.isDraft!==(name==='convertPullRequestToDraft'))
   throw Error('PAT_TRANSITION_UNVERIFIED');
 };
 const same=(snapshot,draft)=>snapshot?.head?.sha===head&&
   snapshot?.base?.ref===PROD&&snapshot?.state==='open'&&
   snapshot?.body===pr.body&&snapshot?.draft===draft;
 try{
  await mutation('convertPullRequestToDraft');
  const draft=await ownerCall('GET','/repos/'+FULL+'/pulls/'+number);
  if(!same(draft,true))return hold('DRAFT_READBACK_UNVERIFIED');
 }catch{return hold('DRAFT_TRANSITION_NOT_VERIFIED');}
 let restored=false;
 for(let attempt=0;attempt<2;attempt++){
  try{await mutation('markPullRequestReadyForReview');}catch{/* readback decides */}
  let state;
  try{state=await ownerCall('GET','/repos/'+FULL+'/pulls/'+number);}catch{continue;}
  if(same(state,false)){restored=true;break;}
  if(!same(state,true))return hold('READY_HEAD_OR_BODY_CHANGED');
 }
 if(!restored)return hold('READY_RESTORE_REQUIRED');
 return {...result,status:'WAKE_REQUESTED',reason:'AWAITING_NEW_EXACT_HEAD_CORE',
  metadataEventRequested:true};
}
module.exports={run,candidate,MARKER};
