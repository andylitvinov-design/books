'use strict';
// Hourly inventory adapter for the existing protected V3 verifier. A receipt
// is not a merge permission. Review/lease/conflicts/required status and the
// final protected-ref pin remain owned by the existing native merge guard.
const SHA=/^[a-f0-9]{40}$/;
const positive=n=>Number.isSafeInteger(n)&&n>0;
const CORE='HH PR core release gate';
const PATH='.github/workflows/hh-pr-core-release.yml';
const PROD='codex/public-book-library';
function checkIdentity(check,pr,full){
 if(!positive(check?.id)||check.name!=='hh-merge-check'||check.app?.id!==15368||
    check.app?.slug!=='github-actions'||check.head_sha!==pr?.head?.sha||
    check.status!=='completed'||check.conclusion!=='success'||
    !positive(check.check_suite?.id))return null;
 const prefix='https://github.com/'+full+'/actions/runs/';
 const m=typeof check.details_url==='string'&&check.details_url.startsWith(prefix)&&
   /^([1-9]\d*)\/job\/([1-9]\d*)\/?$/.exec(check.details_url.slice(prefix.length));
 if(!m)return null;
 const runId=Number(m[1]),jobId=Number(m[2]);
 return positive(runId)&&positive(jobId)?{runId,jobId,suiteId:check.check_suite.id}:null;
}
function currentRun(run,identity,pr,full){
 if(run?.id!==identity.runId||run.check_suite_id!==identity.suiteId||
    !positive(run.run_attempt)||run.event!=='pull_request'||run.status!=='completed'||
    run.conclusion!=='success'||run.name!==CORE||String(run.path||'').split('@')[0]!==PATH||
    run.head_branch!==pr.head.ref||run.repository?.full_name!==full||
    run.head_repository?.full_name!==full||!SHA.test(run.head_sha||'')||
    !Array.isArray(run.pull_requests))return false;
 if(!run.pull_requests.length)return run.head_sha===pr.head.sha;
 return run.pull_requests.length===1&&run.pull_requests[0]?.number===pr.number&&
   run.pull_requests[0]?.head?.sha===pr.head.sha&&run.pull_requests[0]?.head?.ref===pr.head.ref&&
   run.pull_requests[0]?.base?.ref===PROD;
}
function createSweepReadyReader({github,owner,repo,verify}){
 const full=owner+'/'+repo,cache=new Map();
 return async function read({pr,check,target}){
  if(full!=='andylitvinov-design/books'||typeof verify!=='function'||
     !positive(pr?.number)||pr.state!=='open'||pr.draft!==false||
     pr.mergeable!==true||pr.mergeable_state==='dirty'||pr.base?.ref!==PROD||
     pr.head?.repo?.full_name!==full||!SHA.test(pr.head?.sha||'')||!SHA.test(target||''))return null;
  const identity=checkIdentity(check,pr,full);
  if(!identity)return null;
  const getRun=async()=>(await github.rest.actions.getWorkflowRun({
    owner,repo,run_id:identity.runId})).data;
  try{
   const run=await getRun();
   if(!currentRun(run,identity,pr,full))return null;
   const key=[pr.number,pr.head.sha,target,check.id,identity.runId,
     identity.jobId,identity.suiteId,run.run_attempt,run.head_sha].join(':');
   // This cache lives only inside one trusted inventory run, never in PR
   // comments or durable storage. Every hit has just re-read the same
   // successful attempt. assessBaseFreshness brackets the protected ref.
   if(cache.has(key))return cache.get(key);
   const page=(await github.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs',
     {owner,repo,run_id:run.id,attempt_number:run.run_attempt,per_page:100})).data;
   if(!Array.isArray(page?.jobs)||!positive(page.total_count)||
      page.total_count!==page.jobs.length||page.jobs.length>100)return null;
   const jobs=page.jobs.filter(j=>['core-lint-types-build','hh-merge-check'].includes(j?.name));
   if(jobs.length!==2||new Set(jobs.map(j=>j.name)).size!==2||
      jobs.some(j=>!positive(j.id)||j.run_id!==run.id||j.status!=='completed'||
        j.conclusion!=='success'||(j.run_attempt!==undefined&&j.run_attempt!==run.run_attempt)))return null;
   const gate=jobs.find(j=>j.name==='hh-merge-check');
   if(gate.id!==identity.jobId||
      gate.check_run_url!=='https://api.github.com/repos/'+full+'/check-runs/'+check.id)return null;
   const proof=await verify({github,owner,repo,pr,run,jobs,target});
   if(!proof||proof.schema!=='HH_MERGE_READY_V3'||proof.repo!==full||
      proof.pr!==pr.number||proof.head!==pr.head.sha||proof.accepted_base!==target||
      proof.policy_base!==target||proof.run_id!==run.id||proof.run_attempt!==run.run_attempt||
      ![proof.head,proof.tested_merge].includes(run.head_sha))return null;
   const last=await getRun();
   if(!currentRun(last,identity,pr,full)||last.run_attempt!==run.run_attempt||
      last.head_sha!==run.head_sha)return null;
   if(cache.size>=64)cache.delete(cache.keys().next().value);
   cache.set(key,proof);
   return proof;
  }catch{return null;}
 };
}
module.exports={createSweepReadyReader,checkIdentity,currentRun};
