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
  owner_run_id:String(WORKER),state,reason_code:options.reason||
    (state==='PUBLISHED'?'FIXED':'MANUAL'),
  detail_code:options.detail||null,follow_up_task:options.followUp||null,
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

test('monitor splits diagnostic assignment from source Worker without inventing missing commits',()=>{
 const e=event(),signed=m.taskEvidence(records({state:'MANUAL',
   detail:'FREE_AI_NO_BOUNDED_TEST_COVERAGE'}),e);
 const s=m.summarize([e],{[INBOX]:signed},24,NOW,true);
 assert.equal(s.counts.assigned,1);
 assert.equal(s.counts.source_assigned,1);
 assert.equal(s.counts.responded,1);
 assert.equal(s.counts.committed,0);
 assert.equal(s.breakdown.assigned_diagnostic_not_source,0);
 assert.equal(s.breakdown.worker_replies_without_commit,1);
 assert.equal(s.blockers.find(x=>x.key==='why_coverage').pr_count,1);
 assert.equal(s.blockers.find(x=>x.key==='worker_without_commit').pr_count,1);
});
test('each historical signed no-commit outcome has a distinct fixed-vocabulary failure reason',()=>{
 const table=[
  ['SOURCE_PUBLISH_JOB_FAILURE','VERIFIED_SOURCE_PATCH','publish'],
  ['MANUAL','FREE_AI_NO_BOUNDED_TEST_COVERAGE','coverage'],
  ['MANUAL','FREE_AI_NO_REPRODUCED_BOUNDED_FAILURE','coverage'],
  ['MANUAL','FREE_AI_FREE_TIER_QUOTA_EXHAUSTED','provider'],
  ['MANUAL','FREE_AI_OPENROUTER_HTTP_400','provider'],
  ['MANUAL','FREE_AI_PATCH_APPLY_CHECK_FAILED','patch'],
  ['MANUAL','FREE_AI_OPENROUTER_PATCH_RESPONSE_TRUNCATED','patch'],
  ['MANUAL','FREE_AI_UNSAFE_SOURCE_SCOPE','scope'],
  ['MANUAL','NOT_YET_CLASSIFIED','other']
 ];
 for(const [reason,detail,key] of table){
  const e=event(),p=m.taskEvidence(records({state:'MANUAL',reason,detail}),e);
  assert.equal(p.failure_reason,key,reason+' / '+detail);
  const summary=m.summarize([e],{[INBOX]:p},24,NOW,true);
  assert.equal(summary.blockers.find(x=>x.key==='why_'+key).pr_count,1);
  assert.equal(summary.counts.committed,0);
 }
});
test('source dispatch gap is counted only without an accepted signed route',()=>{
 const e=event({route_receipt:null});
 const s=m.summarize([e],{},24,NOW,true);
 assert.equal(s.blockers.find(x=>x.key==='source_not_dispatched').pr_count,1);
 assert.equal(s.counts.source_assigned,0);
 const restored=m.summarize([e],{[INBOX]:{verified_route:event().route_receipt}},24,NOW,true);
 assert.equal(restored.blockers.find(x=>x.key==='source_not_dispatched').pr_count,0);
 assert.equal(restored.blockers.find(x=>x.key==='unrouted').pr_count,0,
  'the signed GitHub route supersedes a stale database snapshot');
});
test('diagnostic review is explicitly not a software Repair Worker assignment',()=>{
 const e=event({category:'BASE_OR_CI_ROUTING',
  route_receipt:{state:'TASK_ROUTED_TO_REVIEW'},assignment_receipt:{
   schema:'HH_CI_EXECUTOR_ASSIGNMENT_V1',ciEventId:INBOX,prNumber:42,headSha:SHA,
   category:'BASE_OR_CI_ROUTING',executor:'openrouter',
   executorId:'agent-commander-openrouter-worker',strategy:'CI_ROUTING_DIAGNOSIS',
   runId:'12345678-1234-4234-8234-123412341234'},
  classification:{schema:'HH_CI_ERROR_CLASSIFICATION_V1',
    status:'DIAGNOSTIC_ONLY',category:'BASE_OR_CI_ROUTING',
    reason_code:'SPECIALIST_REQUIRED_PROOF_MISSING_OR_STALE',
    responsible_role:'ci-routing-owner'}});
 const s=m.summarize([e],{},24,NOW,true);
 assert.equal(s.counts.assigned,1);
 assert.equal(s.counts.source_assigned,0);
 assert.equal(s.breakdown.assigned_diagnostic_not_source,1);
 assert.equal(s.blockers.find(x=>x.key==='diagnostic_only').pr_count,1);
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

test('blocker counts preserve distinct PR/event identity and review vs code writer',()=>{
 const unknown=event({pr_number:57,ci_event_id:'4d471ad5-40b3-4200-9d55-7c41f5db301a',
   category:'UNKNOWN',route_receipt:null,classification:{
     schema:'HH_CI_ERROR_CLASSIFICATION_V1',status:'DIAGNOSTIC_ONLY',
     category:'UNKNOWN',reason_code:'UNCLASSIFIED_FAILURE',responsible_role:'ci-diagnostic-triage'}});
 const review=event({pr_number:58,ci_event_id:'5d471ad5-40b3-4200-9d55-7c41f5db301a',
   category:'BASE_OR_CI_ROUTING',route_receipt:{state:'TASK_ROUTED_TO_REVIEW',reason:'NO_SAFE_AUTOMATIC_WRITER_FOR_CATEGORY'},
   classification:{schema:'HH_CI_ERROR_CLASSIFICATION_V1',status:'DIAGNOSTIC_ONLY',
     category:'BASE_OR_CI_ROUTING',reason_code:'SPECIALIST_REQUIRED_PROOF_MISSING_OR_STALE',responsible_role:'ci-routing-owner'}});
 const worker=m.taskEvidence(records({state:'MANUAL'}),event());
 const summary=m.summarize([unknown,review,event()],
   {[INBOX]:worker},1,NOW,true);
 const pick=id=>summary.blockers.find(b=>b.key===id);
 assert.equal(pick('unclassified').pr_count,1);
 assert.equal(pick('unrouted').pr_count,1);
 assert.equal(pick('needs_review').pr_count,1);
 assert.equal(pick('worker_without_commit').pr_count,1);
 assert.deepEqual(pick('unrouted').prs,[57]);
 assert.equal(summary.counts.committed,0);
});
test('duplicate incidents on one PR retain event count but avoid double-counting bottleneck PR',()=>{
 const one=event({pr_number:59,category:'UNKNOWN',route_receipt:null,
   classification:{schema:'HH_CI_ERROR_CLASSIFICATION_V1',status:'DIAGNOSTIC_ONLY',
   category:'UNKNOWN',reason_code:'UNCLASSIFIED_FAILURE',responsible_role:'ci-diagnostic-triage'}});
 const two={...one,workflow_run_id:CORE+1};
 const summary=m.summarize([one,two],{},1,NOW,true);
 const unknown=summary.blockers.find(x=>x.key==='unclassified');
 assert.equal(unknown.pr_count,1);
 assert.equal(unknown.event_count,2);
 assert.equal(summary.unique_prs,1);
});

test('verified Commander diagnostic assignment counts without claiming source repair',()=>{
 const e=event({route_receipt:{state:'TASK_ROUTED_TO_REVIEW',reason:'NO_SAFE_AUTOMATIC_WRITER_FOR_CATEGORY'},
  assignment_receipt:{schema:'HH_CI_EXECUTOR_ASSIGNMENT_V1',
   ciEventId:INBOX,prNumber:42,headSha:SHA,category:'TYPESCRIPT',
   executor:'openrouter',executorId:'agent-commander-openrouter-worker',
   strategy:'GUARDED_SOURCE_REPAIR_DIAGNOSIS',
   runId:'12345678-1234-4234-8234-123412341234'}});
 assert.equal(m.diagnosticAssignment(e),true);
 const summary=m.summarize([e],{},24,NOW,true);
 assert.equal(summary.counts.assigned,1);
 assert.equal(summary.counts.source_assigned,0);
 assert.equal(summary.counts.dispatched,0);
 assert.equal(summary.counts.committed,0);
 for(const key of ['ciEventId','headSha','executorId']){
  const bad={...e,assignment_receipt:{...e.assignment_receipt,[key]:'untrusted'}};
  assert.equal(m.diagnosticAssignment(bad),false);
  assert.equal(m.summarize([bad],{},24,NOW,true).counts.assigned,0);
 }
});
function signedErrorTask(){
 const item={schema:'HH_CI_ERROR_TASK_V1',task_id:ERROR,
  pr_number:42,head_sha:SHA,run_id:CORE,category:'TYPESCRIPT',
  executor_id:'github-actions:hh-pr-repair-worker.yml',
  strategy_code:'GUARDED_SOURCE_REPAIR',
  source_write_authorized:false,execution_authorized:false};
 return bot(91,'<!-- HH_CI_ERROR_TASK_V1 '+ERROR+' -->\n'+
  'CI error task, diagnostic only.\n'+
  String.fromCharCode(96).repeat(3)+'json\n'+JSON.stringify(item)+'\n'+
  String.fromCharCode(96).repeat(3));
}
function withClaimIdentity(rows){
 const claim=rows[1],f=String.fromCharCode(96).repeat(3);
 const value=claim.body.split('json\n')[1].split('\n'+f)[0];
 const next={...JSON.parse(value),head_ref:'test/pr-repair-proof',base_ref:'codex/public-book-library'};
 claim.body=claim.body.replace(value,JSON.stringify(next));
 return rows;
}
test('verified GitHub claim recovers historical source commit when database kept a backstop',()=>{
 const stored={...event().route_receipt,state:'TASK_WAITING_FOR_DISPATCH',
  dispatchAccepted:0,dispatchAcknowledged:false,
  executorId:null,workerTaskKey:null,errorTaskId:null};
 const e=event({route_receipt:stored});
 assert.equal(m.routeFor(e),null);
 const arr=withClaimIdentity([signedErrorTask(),...records()]);
 const route=m.signedClaimRoute(arr,e);
 assert.equal(route?.workerTaskKey,TASK);
 assert.equal(route?.errorTaskId,ERROR);
 assert.equal(route?.evidenceSource,'GITHUB_SIGNED_EXACT_HEAD_WORKER_CLAIM');
 const proof=m.taskEvidence(arr,e);
 assert.equal(proof.verified_route?.dispatchAccepted,1);
 assert.equal(proof.claimed,true);
 assert.equal(proof.runner,true);
 assert.equal(proof.responded,true);
 assert.equal(proof.candidate_sha,NEXT);
 const noApi=m.summarize([e],{[INBOX]:proof},24,NOW,true);
 assert.equal(noApi.counts.committed,0,'signed outcome alone cannot prove GitHub parent');
 const confirmed=m.summarize([e],{[INBOX]:{...proof,commit_verified:true}},24,NOW,true);
 for(const key of ['assigned','source_assigned','dispatched','claimed','runner','responded','committed'])
  assert.equal(confirmed.counts[key],1,key);
 assert.equal(confirmed.links.committed[0].url,
  'https://github.com/andylitvinov-design/books/commit/'+NEXT);
});
test('forged, edited or mismatched historical receipts cannot restore dispatch',()=>{
 const stored={...event().route_receipt,state:'TASK_WAITING_FOR_DISPATCH',
  dispatchAccepted:0,dispatchAcknowledged:false,
  executorId:null,workerTaskKey:null,errorTaskId:null};
 const e=event({route_receipt:stored});
 const arr=withClaimIdentity([signedErrorTask(),...records()]);
 assert.ok(m.signedClaimRoute(arr,e));
 const forged=arr.slice();forged[0]={...arr[0],user:{login:'attacker',id:9,type:'User'}};
 assert.equal(m.signedClaimRoute(forged,e),null);
 const edited=arr.slice();edited[1]={...arr[1],updated_at:'2026-11-10T19:00:00Z'};
 assert.equal(m.signedClaimRoute(edited,e),null);
 const otherRun=arr.slice();otherRun[0]={...arr[0],body:arr[0].body.replace('"run_id":12345','"run_id":12346')};
 assert.equal(m.signedClaimRoute(otherRun,e),null);
 const unrelated=arr.slice();unrelated[1]={...arr[1],body:arr[1].body.replace(ERROR,'d'.repeat(32))};
 assert.equal(m.signedClaimRoute(unrelated,e),null);
});
