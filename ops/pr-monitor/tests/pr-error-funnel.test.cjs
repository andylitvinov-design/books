'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const m=require('../pr-error-funnel.js');
const SHA='a'.repeat(40),NEXT='b'.repeat(40),TASK='e'.repeat(32),
  ERROR='f'.repeat(32),INBOX='3d471ad5-40b3-4200-9d55-7c41f5db301a',
  TIME='2026-11-10T18:31:00Z',NOW=Date.parse('2026-11-10T19:01:00Z');
const WORKER=98765,CORE=12345;
function event(overrides={}){
 return {ci_event_id:INBOX,repository:'andylitvinov-design/books',
  pr_number:42,head_sha:SHA,workflow_run_id:CORE,run_attempt:1,
  conclusion:'failure',category:'TYPESCRIPT',created_at:TIME,
  run_url:'https://github.com/andylitvinov-design/books/actions/runs/'+CORE,
  classification:{schema:'HH_CI_ERROR_CLASSIFICATION_V1',status:'DIAGNOSTIC_ONLY',
    category:'TYPESCRIPT',reason_code:'SOURCE_FAILED',responsible_role:'source-repair'},
  association_status:'MATCHED_CHAT_EVENT_RECORDED',
  route_receipt:{schema:'HH_COMMANDER_CI_ROUTE_RECEIPT_V1',
    prNumber:42,headSha:SHA,runId:CORE,category:'TYPESCRIPT',inboxId:INBOX,
    executorId:'github-actions:hh-pr-repair-worker.yml',workerTaskKey:TASK,
    errorTaskId:ERROR,dispatchAccepted:1,dispatchAcknowledged:true,
    state:'DISPATCH_ACCEPTED_NOT_WORKER_STARTED'},
  ...overrides};
}
function bot(id,body){
 return {id,user:{login:'github-actions[bot]',id:41898282,type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  created_at:TIME,updated_at:TIME,body,
  html_url:'https://github.com/andylitvinov-design/books/pull/42#issuecomment-'+id};
}
function json(item){var f=String.fromCharCode(96).repeat(3);return '<!-- HH_PR_TASK_V1 -->\n'+f+'json\n'+JSON.stringify(item)+'\n'+f;}
function records(options={}){
 const claim=bot(100,'<!-- HH_PR_REPAIR_WORKER_V1 '+SHA+' -->\n'+json({
  schema:'HH_PR_TASK_V1',pr_number:42,head_sha:SHA,task_key:TASK,
  state:'CLAIMED',worker_started:true,assignment_status:'WORKER_CLAIMED',
  assigned_executor_id:'github-actions:hh-pr-repair-worker.yml',
  error_task_id:ERROR,owner_run_id:String(WORKER)}));
 const runner=bot(101,'<!-- HH_EXECUTION_RUNNER_V1 '+SHA+' -->\n'+json({
  schema:'HH_PR_TASK_V1',pr_number:42,head_sha:SHA,task_key:TASK,
  state:'RUNNER_STARTED',owner_run_id:String(WORKER),
  runner:{run_id:WORKER,job_id:123,runner_id:456,started_at:TIME}}));
 const state=options.state||'PUBLISHED';
 const reply=bot(102,'<!-- HH_PR_REPAIR_OUTCOME_V1 '+SHA+' '+WORKER+' -->\n'+json({
  schema:'HH_PR_TASK_V1',pr_number:42,head_sha:SHA,task_key:TASK,
  owner_run_id:String(WORKER),state,reason_code:state==='PUBLISHED'?'FIXED':'MANUAL',
  source_published:state==='PUBLISHED',verified_source_fix:state==='PUBLISHED',
  new_sha:state==='PUBLISHED'?NEXT:null,
  outcome:{schema:'HH_TASK_OUTCOME_V1',task_key:TASK,
    new_sha:state==='PUBLISHED'?NEXT:null,verified_source:state==='PUBLISHED'},
  model_run:{schema:'HH_FREE_AI_MODEL_RUN_V1',pr_number:42,
    source_head:SHA,run_id:String(WORKER),prompt_delivery_status:'RESPONSE_OBSERVED',
    response_received_at:TIME}}));
 const published=bot(103,'<!-- HH_PR_STAGE_V1 '+JSON.stringify({
  stage:'source_published',source:'verified_git_ref',pr_number:42,
  head_sha:SHA,task_key:TASK,run_id:WORKER,new_sha:NEXT})+' -->');
 return [claim,runner,reply,published];
}
test('classifies failure even with absent optional strategy_code',()=>{
 const e=event();assert.equal(m.validEvent(e),true);
 assert.equal(m.classified(e),true);assert.equal(m.taskLinked(e),true);
});
test('exact-HEAD actor assignment cannot be inferred from responsible_role',()=>{
 const e=event({route_receipt:null});
 assert.equal(m.classified(e),true);assert.equal(m.taskLinked(e),true);
 assert.equal(m.routeFor(e),null);
 const s=m.summarize([e],{},24,NOW,true);
 assert.deepEqual([s.counts.failed,s.counts.classified,s.counts.task,
  s.counts.assigned,s.counts.dispatched,s.counts.committed],[1,1,1,0,0,0]);
});
test('dispatch accepted does not prove claim or worker answer',()=>{
 const e=event(),s=m.summarize([e],{},24,NOW,true);
 assert.equal(s.counts.dispatched,1);assert.equal(s.counts.claimed,0);
 assert.equal(s.counts.runner,0);assert.equal(s.counts.responded,0);
 assert.equal(s.counts.committed,0);
});
test('signed worker runner reply and verified Git ref are independent stages',()=>{
 const e=event(),proof=m.taskEvidence(records(),e);
 assert.equal(proof.claimed,true);assert.equal(proof.runner,true);
 assert.equal(proof.responded,true);assert.equal(proof.ai_response,true);
 assert.equal(proof.candidate_sha,NEXT);
 let s=m.summarize([e],{[INBOX]:proof},24,NOW,true);
 assert.equal(s.counts.claimed,1);assert.equal(s.counts.responded,1);
 assert.equal(s.counts.committed,0);
 s=m.summarize([e],{[INBOX]:{...proof,commit_verified:true}},24,NOW,true);
 assert.equal(s.counts.committed,1);
});
test('manual outcome counts signed reply but never commit',()=>{
 const e=event(),p=m.taskEvidence(records({state:'MANUAL'}),e);
 assert.equal(p.responded,true);assert.equal(p.candidate_sha,null);
 assert.equal(m.summarize([e],{[INBOX]:p},24,NOW,true).counts.committed,0);
});
test('unauthenticated, forged, or edited comment is not proof',()=>{
 const e=event(),arr=records();
 arr[0].user={login:'andylitvinov-design',id:99,type:'User'};
 assert.equal(m.taskEvidence(arr,e).claimed,false);
 arr[0]=records()[0];arr[0].updated_at='2026-11-10T19:00:00Z';
 assert.equal(m.taskEvidence(arr,e).claimed,false);
});
test('runner and outcome must link to the same worker task',()=>{
 const e=event(),arr=records();
 arr[1].body=arr[1].body.replace(TASK,'d'.repeat(32));
 assert.equal(m.taskEvidence(arr,e).claimed,true);
 assert.equal(m.taskEvidence(arr,e).runner,false);
 assert.equal(m.taskEvidence(arr,e).responded,false);
});
test('unrelated publication receipt is not a GitHub commit candidate',()=>{
 const e=event(),arr=records();
 arr[3].body=arr[3].body.replace('"new_sha":"'+NEXT+'"','"new_sha":"'+SHA+'"');
 assert.equal(m.taskEvidence(arr,e).responded,true);
 assert.equal(m.taskEvidence(arr,e).candidate_sha,null);
});
test('counts unique PR rather than conflating independent failed CI attempts',()=>{
 const e=event(),other=event({ci_event_id:'18eed3c1-27c2-4196-a783-e92ff8171437',
  workflow_run_id:1111,route_receipt:null}),s=m.summarize([e,other],
  {[INBOX]:m.taskEvidence(records(),e)},24,NOW,true);
 assert.equal(s.unique_prs,1);assert.equal(s.unique_events,2);
 assert.equal(s.counts.failed,1);assert.equal(s.counts.assigned,1);
});
test('one-hour cohort includes only failures recorded within the last hour',()=>{
 const recent=event({created_at:'2026-11-10T18:31:00Z'});
 const older=event({pr_number:63,created_at:'2026-11-10T17:59:00Z'});
 const current=m.summarize([older,recent],{},1,NOW,true);
 assert.equal(current.period_hours,1);
 assert.equal(current.unique_prs,1);
 assert.equal(current.unique_events,1);
 assert.equal(m.summarize([older,recent],{},24,NOW,true).unique_prs,2);
});
test('window and incomplete source never claim exact totals',()=>{
 const e=event(),early=event({pr_number:99,created_at:'2026-11-01T00:00:00Z'});
 const s=m.summarize([early,e],{},24,NOW,false);
 assert.equal(s.unique_prs,1);assert.equal(s.complete,false);
 assert.equal(m.summarize([early,e],{},720,NOW,true).unique_prs,2);
});

test('no inline-width CSP violations in the funnel and stages remain visible when signed out',()=>{
 const fs=require('node:fs');
 const src=fs.readFileSync(require.resolve('../pr-error-funnel.js'),'utf8');
 assert.equal(src.includes('fill.style.width='),false);
 assert.equal(src.includes("el('progress','hh-error-progress')"),true);
 assert.equal(src.includes('renderSkeleton();'),true);
});
