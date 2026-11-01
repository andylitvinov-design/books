'use strict';
const {PROD,REPO}=require('./ci-pr-task-state.cjs');
const SHA=/^[a-f0-9]{40}$/i,CORE='.github/workflows/hh-pr-core-release.yml';
function normalizeCoreEvidence(runs,jobs,syntheticParents={}){
 if(!Array.isArray(runs)||!Array.isArray(jobs))return {events:[],complete:false};
 let complete=true;const groups=new Map(),events=[];
 for(const run of runs){
  if(run?.name!=='HH PR core release gate'||run.event!=='pull_request')continue;
  const refs=run.pull_requests;
  if(!Number.isSafeInteger(run.id)||!Number.isSafeInteger(run.run_attempt)||run.run_attempt<1||
     String(run.path||'').split('@')[0]!==CORE||run.repository?.full_name!==REPO||
     run.head_repository?.full_name!==REPO||!Array.isArray(refs)||refs.length!==1){complete=false;continue;}
  const ref=refs[0];
  if(ref?.base?.ref!==PROD)continue;
  if(!Number.isSafeInteger(ref.number)||ref.number<1||!SHA.test(ref.head?.sha||'')||
     !SHA.test(ref.base?.sha||'')||ref.head?.ref!==run.head_branch||!SHA.test(run.head_sha||'')||
     !Number.isFinite(Date.parse(run.created_at||''))){complete=false;continue;}
  if(run.head_sha!==ref.head.sha){
   const p=syntheticParents[run.id];
   if(!Array.isArray(p)||p.length!==2||p[0]!==ref.base.sha||p[1]!==ref.head.sha){complete=false;continue;}
  }
  const key=ref.number+':'+ref.head.sha;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push({run,ref});
 }
 function outcome(entry,attempt){
  const forRun=jobs.filter(j=>j.run_id===entry.run.id);
  if(forRun.some(j=>!Number.isSafeInteger(j.run_attempt)||j.run_attempt<1))return null;
  const all=forRun.filter(j=>j.run_attempt===attempt);
  if(!all.length||all.some(j=>j.status!=='completed'||!Number.isFinite(Date.parse(j.completed_at||''))))return null;
  const names=['hh-core-verified','hh-specialist','release-ready'];
  const selected=names.map(name=>all.filter(j=>j.name===name));
  if(selected.some(list=>list.length!==1))return null;
  const gates=selected.map(x=>x[0]);
  if(all.some(j=>['failure','timed_out','startup_failure','cancelled','action_required'].includes(j.conclusion)))return {kind:'failure',jobs:all};
  if(gates.every(j=>j.conclusion==='success')&&all.every(j=>['success','skipped','neutral'].includes(j.conclusion)))return {kind:'pass',jobs:all};
  return null;
 }
 for(const entries of groups.values()){
  entries.sort((a,b)=>Date.parse(a.run.created_at)-Date.parse(b.run.created_at)||a.run.id-b.run.id);
  const first=entries[0],one=outcome(first,1);
  if(!one)complete=false;
  else events.push({kind:one.kind==='pass'?'ci_first_pass':'ci_first_failure',
    at:new Date(Math.max(...one.jobs.map(j=>Date.parse(j.completed_at)))).toISOString(),pr:first.ref.number,head:first.ref.head.sha});
  const last=entries.at(-1);
  if(last.run.status!=='completed'){complete=false;continue;}
  const final=outcome(last,last.run.run_attempt);
  if(!final){complete=false;continue;}
  if(last.run.conclusion==='success'&&final.kind==='pass')events.push({kind:'ci_green',
    at:new Date(Math.max(...final.jobs.map(j=>Date.parse(j.completed_at)))).toISOString(),pr:last.ref.number,head:last.ref.head.sha});
 }
 return {events,complete};
}
module.exports={normalizeCoreEvidence};
