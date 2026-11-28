'use strict';
// Trusted hourly coordinator helpers. No writes or synthetic statuses.
async function completeLatestChecks({github,owner,repo,sha}){
 const checks=[];let total=null;
 for(let page=1;page<=5;page++){
  const data=(await github.rest.checks.listForRef({owner,repo,ref:sha,per_page:100,page,filter:'latest'})).data;
  if(!Array.isArray(data?.check_runs)||!Number.isSafeInteger(data.total_count)||
     data.total_count<0||data.total_count>500||data.check_runs.length>100||
     (total!==null&&total!==data.total_count))return null;
  total=data.total_count;checks.push(...data.check_runs);
  if(checks.length===total)break;
  if(checks.length>total||data.check_runs.length!==100||page===5)return null;
 }
 if(checks.length!==total||checks.some(c=>!Number.isSafeInteger(c?.id)||c.id<1)||
    new Set(checks.map(c=>c.id)).size!==checks.length)return null;
 const names=new Map();
 for(const check of [...checks].sort((a,b)=>b.id-a.id)){
  if(typeof check.name!=='string'||!check.name)return null;
  if(!names.has(check.name))names.set(check.name,check);
 }
 return names;
}

async function readHourlyReadyReceipt({github,owner,repo,pr,checks,target,verify,cache}){
 // Compatible with both sides of the #5932 / #5934 rollout.
 if(typeof verify!=='function'||!checks||typeof checks.get!=='function')return null;
 const full=owner+'/'+repo;
 if(full!=='andylitvinov-design/books'||pr?.state!=='open'||pr.draft!==false||
    pr.mergeable!==true||pr.mergeable_state==='dirty'||pr.base?.ref!=='codex/public-book-library'||
    pr.head?.repo?.full_name!==full||!Number.isSafeInteger(pr.number)||pr.number<1||
    !/^[a-f0-9]{40}$/.test(pr.head?.sha||'')||!/^[a-f0-9]{40}$/.test(target||''))return null;
 const gate=checks.get('hh-merge-check'),core=checks.get('core-lint-types-build');
 const identity=check=>check?.head_sha===pr?.head?.sha&&check?.app?.id===15368&&
  check?.app?.slug==='github-actions'&&check.status==='completed'&&
  check.conclusion==='success'&&Number.isSafeInteger(check.id)&&check.id>0&&
  Number.isSafeInteger(check.check_suite?.id)&&check.check_suite.id>0;
 if(!identity(gate)||!identity(core)||gate.check_suite.id!==core.check_suite.id)return null;
 const ids=check=>{
  const prefix='https://github.com/'+full+'/actions/runs/';
  const url=check.details_url||'';
  const x=url.startsWith(prefix)&&/^([1-9]\d*)\/job\/([1-9]\d*)\/?$/.exec(url.slice(prefix.length));
  const values=x&&[Number(x[1]),Number(x[2])];
  return values&&values.every(n=>Number.isSafeInteger(n)&&n>0)?values:null;
 };
 const g=ids(gate),c=ids(core);
 if(!g||!c||g[0]!==c[0]||g[1]===c[1])return null;
 try{
  const readRun=async()=>(await github.rest.actions.getWorkflowRun({owner,repo,run_id:g[0]})).data;
  const validRun=run=>run?.id===g[0]&&run.check_suite_id===gate.check_suite.id&&
    Number.isSafeInteger(run.run_attempt)&&run.run_attempt>0&&run.status==='completed'&&
    run.conclusion==='success'&&run.event==='pull_request'&&
    run.name==='HH PR core release gate'&&String(run.path||'').split('@')[0]==='.github/workflows/hh-pr-core-release.yml'&&
    run.head_branch===pr.head.ref&&run.repository?.full_name===full&&run.head_repository?.full_name===full&&
    /^[a-f0-9]{40}$/.test(run.head_sha||'')&&Array.isArray(run.pull_requests)&&
    ((run.pull_requests.length===0&&run.head_sha===pr.head.sha)||
     (run.pull_requests.length===1&&run.pull_requests[0]?.number===pr.number&&
      run.pull_requests[0]?.head?.sha===pr.head.sha&&run.pull_requests[0]?.head?.ref===pr.head.ref&&
      run.pull_requests[0]?.base?.ref==='codex/public-book-library'));
  const run=await readRun();
  if(!validRun(run))return null;
  const key=[full,pr.number,pr.head.sha,target,gate.id,core.id,g[0],g[1],c[1],gate.check_suite.id,run.run_attempt,run.head_sha].join(':');
  if(cache?.has(key))return cache.get(key);
  const page=(await github.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs',
    {owner,repo,run_id:run.id,attempt_number:run.run_attempt,per_page:100})).data;
  if(!Array.isArray(page?.jobs)||page.total_count!==page.jobs.length||page.jobs.length>100)return null;
  const jobs=page.jobs.filter(j=>['core-lint-types-build','hh-merge-check'].includes(j?.name));
  if(jobs.length!==2)return null;
  for(const [check,id] of [[gate,g[1]],[core,c[1]]]){
   const match=jobs.filter(j=>j.name===check.name&&j.id===id&&j.run_id===run.id&&
     j.status==='completed'&&j.conclusion==='success'&&
     j.check_run_url==='https://api.github.com/repos/'+full+'/check-runs/'+check.id);
   if(match.length!==1)return null;
  }
  // Pass the complete attempt to the protected verifier, including optional repair.
  if(new Set(page.jobs.map(j=>j?.id)).size!==page.jobs.length||
    page.jobs.some(j=>j.run_id!==run.id||(j.run_attempt!==undefined&&j.run_attempt!==run.run_attempt)))return null;
  const proof=await verify({github,owner,repo,pr,run,jobs:page.jobs,target});
  if(!proof||proof.schema!=='HH_MERGE_READY_V3'||proof.repo!==full||proof.pr!==pr.number||
    proof.head!==pr.head.sha||proof.accepted_base!==target||proof.policy_base!==target||
    proof.run_id!==run.id||proof.run_attempt!==run.run_attempt||
    ![proof.head,proof.tested_merge].includes(run.head_sha))return null;
  const latest=await readRun();
  if(!validRun(latest)||latest.run_attempt!==run.run_attempt||latest.head_sha!==run.head_sha)return null;
  if(cache instanceof Map){if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(key,proof);}
  return proof;
 }catch{return null;}
}
module.exports={completeLatestChecks,readHourlyReadyReceipt};
