'use strict';

const REPO='andylitvinov-design/books';
const CORE_NAME='HH PR core release gate';
const CORE_PATH='.github/workflows/hh-pr-core-release.yml';
const SHA=/^[a-f0-9]{40}$/i;
const LIVE=new Set(['queued','in_progress','waiting','pending','requested','completed']);
// A GITHUB_TOKEN-created pull_request.synchronize may report a workflow
// run with conclusion=action_required and ZERO jobs, needing approval.
// It is NOT a Core runner or a checked source SHA. Fail closed, then let
// the existing signed CI-wake/Watchdog lane recover via owner-authored PR
// metadata rather than counting the appearance of a run as coverage.
const EXECUTED_CONCLUSIONS=new Set(['success','failure','timed_out']);

function isExactHeadCoreRun(run,{prNumber,branch,sha,baseRef='codex/public-book-library',publishedAt=null}={}) {
  if(!run||typeof run!=='object'||!Number.isSafeInteger(prNumber)||prNumber<1||
     typeof branch!=='string'||!branch||!SHA.test(sha||''))return false;
  if(run.name!==CORE_NAME||String(run.path||'').split('@')[0]!==CORE_PATH||
     run.event!=='pull_request'||!LIVE.has(run.status)||
     (run.status==='completed'&&!EXECUTED_CONCLUSIONS.has(run.conclusion))||
     run.repository?.full_name!==REPO||run.head_repository?.full_name!==REPO||
     run.head_branch!==branch||!Number.isSafeInteger(run.id)||run.id<1||
     !Array.isArray(run.pull_requests))return false;
  const created=Date.parse(run.created_at||'');
  if(!Number.isFinite(created))return false;
  if(Number.isFinite(publishedAt)&&created<publishedAt-10_000)return false;
  return run.pull_requests.some(pr=>pr?.number===prNumber&&
    pr.head?.sha===sha&&pr.base?.ref===baseRef);
}

function findExactHeadCoreRun(runs,identity) {
  if(!Array.isArray(runs))return null;
  return runs.find(run=>isExactHeadCoreRun(run,identity))||null;
}

// After a scoped GITHUB_TOKEN source commit, GitHub may emit an
// approval-only pull_request.synchronize workflow (0 jobs). An owner PAT
// can request a REAL pull_request.edited Core wave without touching source,
// reviews, check conclusions, Git refs, merge state or branch protection.
// Exactly one marker per PR×HEAD; this is a request, NEVER a CI success proof.
async function requestOwnerCoreWake({token,prNumber,sha,fetchImpl=global.fetch}={}){
 const status=(state)=>({status:state,sourceChanged:false,coreRunVerified:false});
 if(!Number.isSafeInteger(prNumber)||prNumber<1||!SHA.test(sha||'')||
   typeof token!=='string'||!token||typeof fetchImpl!=='function')
   return status('OWNER_WAKE_INVALID_ARGUMENTS');
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
   'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'};
 const api=async(method,url,body)=>{
   let response;
   try{response=await fetchImpl('https://api.github.com'+url,{
     method,headers,redirect:'error',signal:AbortSignal.timeout(15000),
     ...(body?{body:JSON.stringify(body)}:{})
   });}
   catch{return null;}
   if(!response?.ok)return null;
   try{return await response.json();}catch{return null;}
 };
 // PAT owner identity is a hard gate, not a username claimed in PR content.
 const who=await api('GET','/user');
 if(who?.login!=='andylitvinov-design')return status('OWNER_PAT_IDENTITY_UNVERIFIED');
 const endpoint='/repos/'+REPO+'/pulls/'+prNumber;
 const pr=await api('GET',endpoint);
 if(pr?.number!==prNumber||pr.state!=='open'||pr.draft!==false||
    pr.user?.login!=='andylitvinov-design'||
    pr.base?.ref!=='codex/public-book-library'||
    pr.head?.repo?.full_name!==REPO||pr.head?.sha!==sha||
    typeof pr.body!=='string'||pr.body.length>50000)
   return status('OWNER_WAKE_PR_HEAD_OR_SCOPE_CHANGED');
 const marker='<!-- HH_OWNER_POST_REPAIR_CORE_WAKE_V1 pr='+prNumber+' sha='+sha+' -->';
 if(pr.body.includes(marker))return status('OWNER_WAKE_ALREADY_REQUESTED');
 const nextBody=pr.body+'\n\n'+marker+'\n'+
  'Owner-authored metadata-only request for mandatory exact-head PR Core CI. '+
  'Source SHA unchanged; no permission, review, check or merge override.';
 if(nextBody.length>55000)return status('OWNER_WAKE_BODY_TOO_LARGE');
 const result=await api('PATCH',endpoint,{body:nextBody});
 if(result?.number!==prNumber||result.state!=='open'||result.draft!==false||
    result.head?.sha!==sha||result.base?.ref!=='codex/public-book-library'||
    result.body!==nextBody)
   return status('OWNER_WAKE_EDIT_NOT_VERIFIED');
 const readback=await api('GET',endpoint);
 if(readback?.number!==prNumber||readback.state!=='open'||
    readback.draft!==false||readback.head?.sha!==sha||
    readback.body!==nextBody)
   return status('OWNER_WAKE_POST_EDIT_HEAD_UNVERIFIED');
 return status('OWNER_METADATA_EDIT_ACCEPTED');
}

module.exports={REPO,CORE_NAME,CORE_PATH,isExactHeadCoreRun,findExactHeadCoreRun,requestOwnerCoreWake};
