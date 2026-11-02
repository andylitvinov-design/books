'use strict';
const {REPO,PROD,DEFAULT,taskFor}=require('./ci-pr-task-state.cjs');
const SHA=/^[a-f0-9]{40}$/i,KEY=/^[a-f0-9]{32}$/i;
const labels={repair:'hh:repair-needed',conflict:'hh:conflict-repair-needed',ci:'hh:ci-needed'};
function parseDispatcherLog(run,text){
 const fail=reason=>({events:[],blocked:{},complete:false,reason});
 if(!run||!Number.isSafeInteger(run.id)||run.name!=='HH PR Control Tower queue dispatcher'||
    !['workflow_dispatch','workflow_run','schedule','push'].includes(run.event)||run.head_branch!==DEFAULT||
    run.repository?.full_name!==REPO||run.status!=='completed'||run.conclusion!=='success'||
    typeof text!=='string'||text.length>2*1024*1024)return fail('UNTRUSTED_RUN_OR_LOG');
 const created=Date.parse(run.created_at||''),updated=Date.parse(run.updated_at||'');
 if(!Number.isFinite(created)||!Number.isFinite(updated)||updated<created)return fail('RUN_TIME_UNVERIFIED');
 const matches=[];
 for(const line of text.split(/\r?\n/)){
  const m=line.match(/HH_CONTROL_TOWER:\s*(\{.*\})\s*$/);if(!m)continue;
  try{const x=JSON.parse(m[1]);if(x?.schema==='HH_CONTROL_DISPATCH_V1')matches.push(x);}catch{return fail('MALFORMED_SUMMARY');}
 }
 if(matches.length!==1)return fail('SUMMARY_MISSING_OR_AMBIGUOUS');
 const summary=matches[0],at=Date.parse(summary.checkedAt||'');
 if(!Number.isFinite(at)||at<created-60000||at>updated+60000||typeof summary.dryRun!=='boolean'||
    !Number.isSafeInteger(summary.dispatchAccepted)||summary.dispatchAccepted<0||
    !Array.isArray(summary.workerRuns)||!summary.blocked||typeof summary.blocked!=='object'||Array.isArray(summary.blocked))
  return fail('SUMMARY_UNVERIFIED');
 const blocked={};
 for(const [name,n] of Object.entries(summary.blocked)){
  if(!/^[A-Z][A-Z0-9_]{0,79}$/.test(name)||!Number.isSafeInteger(n)||n<0)return fail('BLOCKERS_UNVERIFIED');
  blocked[name]=n;
 }
 const accepted=summary.workerRuns.filter(x=>x?.outcome==='DISPATCH_ACCEPTED');
 if(accepted.length!==summary.dispatchAccepted||(summary.dryRun&&accepted.length))return fail('DISPATCH_COUNT_MISMATCH');
 const events=[],seen=new Set();
 for(const item of accepted){
  if(!Number.isSafeInteger(item.pr_number)||item.pr_number<1||!SHA.test(item.head_sha||'')||
     !KEY.test(item.task_key||'')||!labels[item.lane]||seen.has(item.task_key))return fail('TASK_IDENTITY_UNVERIFIED');
  const pr={number:item.pr_number,state:'open',draft:false,user:{login:REPO.split('/')[0]},base:{ref:PROD},
   head:{sha:item.head_sha,ref:'telemetry',repo:{full_name:REPO}},labels:[{name:labels[item.lane]}]};
  if(taskFor(pr,{tier:'P5',direction:'other'})?.task_key!==item.task_key)return fail('TASK_IDENTITY_UNVERIFIED');
  seen.add(item.task_key);events.push({kind:'dispatched',at:summary.checkedAt,pr:item.pr_number,
   head:item.head_sha,task:item.task_key,lane:item.lane});
 }
 return {events,blocked,at:summary.checkedAt,complete:true,reason:summary.dryRun?'DRY_RUN':'COMPLETE'};
}
module.exports={parseDispatcherLog};
