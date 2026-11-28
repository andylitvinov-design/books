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

async function readHourlyReadyReceipt({github,owner,repo,pr,checks,target,verify}){
 // Compatible with both sides of the #5932 / #5934 rollout.
 if(typeof verify!=='function'||!checks||typeof checks.get!=='function')return null;
 const full=owner+'/'+repo;
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
  const run=(await github.rest.actions.getWorkflowRun({owner,repo,run_id:g[0]})).data;
  if(run?.id!==g[0]||run.check_suite_id!==gate.check_suite.id||
     !Number.isSafeInteger(run.run_attempt)||run.run_attempt<1)return null;
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
  return await verify({github,owner,repo,pr,run,jobs,target});
 }catch{return null;}
}
module.exports={completeLatestChecks,readHourlyReadyReceipt};
