'use strict';
// The pull-request API's base SHA can reflect an older snapshot. A merge
// policy change needs evidence against the current production branch.
const SHA=/^[a-f0-9]{40}$/i;
const SENSITIVE=/(?:^\.github\/|^scripts\/ci[-_/]|^lib\/ci\/|^tests\/ci[-_/]|^docs\/operations\/CI_RELEASE_POLICY\.md$|(?:^|\/)(?:auth|authorization|security|privacy|payments?|billing|consent|rls)(?:[\/._-]|$))/i;
async function assessBaseFreshness({github,owner,repo,pr,verifiedRunBase}){
 const fail=reason=>({ok:false,reason});
 if(!Number.isSafeInteger(pr?.number)||pr.number<1||!SHA.test(pr.base?.sha||'')||
    !Number.isSafeInteger(pr.changed_files)||pr.changed_files<0||pr.changed_files>300)return fail('INVALID_PR_EVIDENCE');
 try{
  const branch=(await github.rest.repos.getBranch({owner,repo,branch:'codex/public-book-library'})).data;
  const actual=branch?.commit?.sha;if(!SHA.test(actual||''))return fail('CURRENT_BASE_UNAVAILABLE');
  const files=[];
  for(let page=1;page<=3;page++){
   const rows=(await github.rest.pulls.listFiles({owner,repo,pull_number:pr.number,per_page:100,page})).data;
   if(!Array.isArray(rows)||rows.length>100)return fail('FILES_INCOMPLETE');
   files.push(...rows);if(rows.length<100)break;
  }
  if(files.length!==pr.changed_files||new Set(files.map(f=>f?.filename)).size!==files.length)return fail('FILES_INCOMPLETE');
  let sensitive=false;
  for(const f of files){
   if(typeof f?.filename!=='string'||!f.filename||!['added','modified','removed','renamed','copied','changed','unchanged'].includes(f.status)||
      (f.status==='renamed'&&typeof f.previous_filename!=='string'))return fail('FILES_UNVERIFIED');
   if(SENSITIVE.test(f.filename)||(f.previous_filename&&SENSITIVE.test(f.previous_filename)))sensitive=true;
  }
  if(sensitive){
   if(actual!==pr.base.sha)return fail('SENSITIVE_BASE_STALE');
   if(typeof verifiedRunBase==='function')verifiedRunBase=await verifiedRunBase();
   if(!SHA.test(verifiedRunBase||''))return fail('SENSITIVE_CI_BASE_UNVERIFIED');
   if(verifiedRunBase!==actual)return fail('SENSITIVE_CI_BASE_STALE');
  }
  return {ok:true,reason:sensitive?'SENSITIVE_BASE_VERIFIED':'NON_SENSITIVE_BASE_ADVANCE',base:actual};
 }catch{return fail('BASE_OR_FILES_UNAVAILABLE');}
}
function coreRunBase(run,pr,fullRepo,suiteId){
 if(!Number.isSafeInteger(run?.id)||run.id<1||run.event!=='pull_request'||
    run.name!=='HH PR core release gate'||String(run.path||'').split('@')[0]!=='.github/workflows/hh-pr-core-release.yml'||
    run.status!=='completed'||run.conclusion!=='success'||run.repository?.full_name!==fullRepo||
    run.head_repository?.full_name!==fullRepo||run.head_branch!==pr.head?.ref||
    !Number.isSafeInteger(suiteId)||run.check_suite_id!==suiteId||!Array.isArray(run.pull_requests))return null;
 const refs=run.pull_requests.filter(x=>x.number===pr.number&&x.head?.sha===pr.head.sha&&x.head?.ref===pr.head.ref&&
  x.base?.ref==='codex/public-book-library'&&SHA.test(x.base?.sha||''));
 return refs.length===1?refs[0].base.sha:null;
}
async function coreRunBaseForCheck({github,owner,repo,pr,check}){
 try{
  const u=new URL(check?.details_url||'');
  const m=u.pathname.match(new RegExp('^/'+owner+'/'+repo+'/actions/runs/([0-9]+)/job/([0-9]+)/?$'));
  if(u.protocol!=='https:'||u.hostname!=='github.com'||u.search||u.hash||!m)return null;
  const runId=Number(m[1]),jobId=Number(m[2]);
  if(!Number.isSafeInteger(runId)||runId<1||!Number.isSafeInteger(jobId)||jobId<1||!Number.isSafeInteger(check.id))return null;
  const job=(await github.rest.actions.getJobForWorkflowRun({owner,repo,job_id:jobId})).data;
  if(job?.id!==jobId||job.run_id!==runId||job.name!=='hh-core-verified'||job.status!=='completed'||job.conclusion!=='success'||
     job.check_run_url!=='https://api.github.com/repos/'+owner+'/'+repo+'/check-runs/'+check.id)return null;
  const run=(await github.rest.actions.getWorkflowRun({owner,repo,run_id:runId})).data;
  if(run?.id!==runId)return null;
  return coreRunBase(run,pr,owner+'/'+repo,check.check_suite?.id);
 }catch{return null;}
}
module.exports={assessBaseFreshness,coreRunBase,coreRunBaseForCheck};
