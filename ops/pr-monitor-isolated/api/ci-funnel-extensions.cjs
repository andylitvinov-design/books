'use strict';
// Read-only signed CI incident details. Never authorize source writes or imply LIVE.
const SHA=/^[0-9a-f]{40}$/i,KEY=/^[0-9a-f]{32}$/i;
const REPO='https://github.com/andylitvinov-design/books';
const EXTRA=[
 ['model_requested','Вызов AI-модели'],
 ['model_responded','Ответ AI-модели'],
 ['patch_ready','Патч проверен'],
 ['ci_verified','Core + Merge Gate прошли'],
 ['merged','GitHub Merge'],
 ['live_verified','Production LIVE']
];
const ms=x=>{const n=Date.parse(x||'');return Number.isFinite(n)?n:null;};
function extra(e,comments,found,archive,trusted,jsonRecords){
 const rows=(comments||[]).filter(trusted).flatMap(c=>
   jsonRecords(c).map(r=>({r,c,url:REPO+'/pull/'+e.pr+'#issuecomment-'+c.id})));
 const errors=rows.filter(x=>x.r.schema==='HH_CI_ERROR_TASK_V1'&&
   x.c.body.includes('<!-- HH_CI_ERROR_TASK_V1 '+x.r.task_id+' -->')&&
   KEY.test(x.r.task_id||'')&&x.r.pr_number===e.pr&&
   x.r.head_sha===e.head&&Number(x.r.run_id)===e.run);
 const tasks=new Set(errors.map(x=>x.r.task_id));
 const revisions=rows.filter(x=>x.r.schema==='HH_CI_ERROR_RECLASSIFICATION_V1'&&
   x.c.body.includes('<!-- HH_CI_ERROR_RECLASSIFICATION_V1 '+x.r.task_id+' -->')&&
   tasks.has(x.r.task_id)&&x.r.pr_number===e.pr&&x.r.head_sha===e.head&&
   Number(x.r.run_id)===e.run&&x.r.previous_category==='UNKNOWN'&&
   x.r.source_write_authorized===false&&x.r.execution_authorized===false);
 const classified=[...revisions,...errors].find(x=>x.r.category!=='UNKNOWN'&&
   typeof x.r.category==='string'&&typeof x.r.reason_code==='string'&&
   x.r.reason_code!=='UNCLASSIFIED_FAILURE');
 const task=classified||errors.at(-1)||null;
 const claim=rows.find(x=>x.r.schema==='HH_PR_TASK_V1'&&
   x.c.body.includes('<!-- HH_PR_REPAIR_WORKER_V1 '+e.head+' -->')&&
   x.r.state==='CLAIMED'&&x.r.worker_started===true&&
   KEY.test(x.r.task_key||'')&&tasks.has(x.r.error_task_id)&&
   x.r.pr_number===e.pr&&x.r.head_sha===e.head&&
   /^\d{1,19}$/.test(String(x.r.owner_run_id||'')));
 const runner=Boolean(found?.runner);
 const outcome=claim&&runner?rows.find(x=>x.r.schema==='HH_PR_TASK_V1'&&
   x.c.body.includes('<!-- HH_PR_REPAIR_OUTCOME_V1 '+e.head+' '+claim.r.owner_run_id+' -->')&&
   x.r.pr_number===e.pr&&x.r.head_sha===e.head&&
   x.r.task_key===claim.r.task_key&&
   String(x.r.owner_run_id)===String(claim.r.owner_run_id)&&
   ['PUBLISHED','MANUAL','FAILED','PREPARED','REJECTED','SUPERSEDED',
    'VERIFY_REQUIRED','NO_CLAIM_RETRYABLE'].includes(x.r.state)):null;
 const ai=outcome?.r?.ai_execution;
 const mark=(at,url)=>ms(at)!==null&&typeof url==='string'?{at,url}:null;
 const stages=Object.fromEntries(EXTRA.map(([key])=>[key,null]));
 if(ai?.schema==='HH_PR_AI_EXECUTION_EVIDENCE_V1'&&
    ai.model_request_attempted===true&&ms(ai.executor_started_at)!==null&&
    ['openrouter','opencode'].includes(ai.configured_provider))
   stages.model_requested=mark(outcome.c.created_at,outcome.url);
 if(stages.model_requested&&ai.model_response_confirmed===true&&
    ms(ai.model_response_at)!==null&&
    ms(ai.model_response_at)>=ms(ai.executor_started_at)&&
    typeof ai.actual_provider==='string'&&ai.actual_provider.length>0&&
    typeof ai.actual_model==='string'&&ai.actual_model.length>0)
   stages.model_responded=mark(ai.model_response_at,outcome.url);
 if(stages.model_responded&&ai.patch_received===true&&ai.patch_verified===true)
   stages.patch_ready=mark(outcome.c.created_at,outcome.url);
 if(SHA.test(found?.committed?.sha||'')){
   const green=(archive||[]).filter(r=>r.pr===e.pr&&
     r.source_head?.toLowerCase()===found.committed.sha.toLowerCase()&&
     r.conclusion==='success'&&ms(r.completed_at)!==null&&
     Array.isArray(r.jobs)&&['core-lint-types-build','hh-merge-check'].every(name=>
       r.jobs.some(j=>j.name===name&&j.conclusion==='success')))
    .sort((a,b)=>ms(b.completed_at)-ms(a.completed_at))[0];
   if(green&&Number.isSafeInteger(green.run_id)&&green.run_id>0)
     stages.ci_verified=mark(green.completed_at,REPO+'/actions/runs/'+green.run_id);
 }
 // Merge must be checked separately using the live GitHub PR API.
 // LIVE requires external served-SHA evidence and stays unconfirmed here.
 const key=task?.r;
 const detail={
   task_id:key?.task_id||null,category:key?.category||null,
   reason_code:key?.reason_code||null,
   executor_id:key?.executor_id||null,next_action:key?.next_action||null,
   next_check_at:key?.next_check_at||null,
   state:outcome?.r.state||(runner?'RUNNER_STARTED':
     claim?'CLAIMED':found?.dispatched?'DISPATCH_ACCEPTED':
     found?.assigned?'EXECUTOR_SELECTED':found?.classified?'CLASSIFIED':'DIAGNOSTIC_PENDING'),
   blocked_reason:outcome?.r.source_published===false&&
     /^[A-Z0-9_]{3,120}$/.test(outcome?.r.reason_code||'')?
     outcome.r.reason_code:null,
   worker_run:runner&&claim?REPO+'/actions/runs/'+claim.r.owner_run_id:null,
   model_evidence:stages.model_responded?'RESPONSE_CONFIRMED':
     stages.model_requested?'CALL_ATTEMPTED':null,
   source_sha:found?.committed?.sha||null
 };
 return {stages,detail};
}
module.exports={EXTRA,extra};
