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


test('an authenticated BASE_ADVANCED recovery receipt is a distinct handling route, not an executor',()=>{
 const e=event({category:'BASE_ADVANCED',route_receipt:null,
   classification:{schema:'HH_CI_ERROR_CLASSIFICATION_V1',status:'DIAGNOSTIC_ONLY',
     category:'BASE_ADVANCED',reason_code:'PRODUCTION_BASE_CHANGED',
     responsible_role:'base-synchronization-worker'}});
 e.route_receipt={schema:'HH_COMMANDER_CI_ROUTE_RECEIPT_V1',
   prNumber:e.pr_number,headSha:e.head_sha,runId:e.workflow_run_id,
   category:e.category,inboxId:e.ci_event_id,dispatchAccepted:0,
   state:'EXISTING_RECOVERY_ACCEPTED',reason:'BASE_SYNCHRONISATION_UPDATED',
   responsibleRole:'base-synchronization-worker'};
 assert.equal(m.routeDisposition(e),'base_recovery_accepted');
 const s=m.summarize([e],{},24,NOW,true);
 const pick=key=>s.route_outcomes.find(x=>x.key===key);
 assert.equal(pick('base_recovery_accepted').pr_count,1);
 assert.equal(pick('base_recovery_accepted').event_count,1);
 assert.equal(s.counts.assigned,0);
 assert.equal(s.counts.source_assigned,0);
 assert.equal(s.counts.committed,0);
 for(const change of [{headSha:NEXT},{runId:CORE+1},{inboxId:'wrong'},
   {prNumber:99},{dispatchAccepted:1},{state:'PUBLISHED'}])
  assert.equal(m.routeDisposition({...e,route_receipt:{...e.route_receipt,...change}}),null);
});

test('review and waiting recovery are separate routes, deduping PRs without false worker claims',()=>{
 const mk=(num,category,reason,state,role,runId,eventId)=>event({
   pr_number:num,ci_event_id:eventId,workflow_run_id:runId,category,
   classification:{schema:'HH_CI_ERROR_CLASSIFICATION_V1',status:'DIAGNOSTIC_ONLY',
     category,reason_code:reason,responsible_role:role},
   route_receipt:{schema:'HH_COMMANDER_CI_ROUTE_RECEIPT_V1',
     prNumber:num,headSha:SHA,runId,category,inboxId:eventId,
     dispatchAccepted:0,reason,state,responsibleRole:role}
 });
 const review=mk(71,'BASE_OR_CI_ROUTING','NO_SAFE_AUTOMATIC_WRITER_FOR_CATEGORY',
   'TASK_ROUTED_TO_REVIEW','ci-routing-owner',CORE,'11111111-1111-4111-8111-111111111111');
 const repeat=mk(71,'BASE_OR_CI_ROUTING','NO_SAFE_AUTOMATIC_WRITER_FOR_CATEGORY',
   'TASK_ROUTED_TO_REVIEW','ci-routing-owner',CORE+1,'22222222-2222-4222-8222-222222222222');
 const waiting=mk(72,'BASE_ADVANCED','BASE_RECOVERY_NOT_PROVEN',
   'TASK_AWAITING_EXISTING_RECOVERY','base-synchronization-worker',CORE+2,
   '33333333-3333-4333-8333-333333333333');
 const manual=mk(73,'MERGE_CONFLICT','HUMAN_REVIEW_REQUIRED',
   'TASK_REQUIRES_REVIEW','semantic-conflict-resolver',CORE+3,
   '44444444-4444-4444-8444-444444444444');
 const s=m.summarize([review,repeat,waiting,manual],{},24,NOW,true);
 const pick=key=>s.route_outcomes.find(x=>x.key===key);
 assert.equal(pick('owner_review_required').pr_count,2);
 assert.equal(pick('owner_review_required').event_count,3);
 assert.equal(pick('awaiting_recovery_proof').pr_count,1);
 assert.deepEqual(pick('base_recovery_accepted').prs,[]);
 assert.equal(s.counts.assigned,0);
 assert.equal(s.counts.runner,0);
 assert.equal(s.counts.committed,0);
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

test('blocker heading remains accurate when owner selects one hour instead of 24 hours',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync(require.resolve('../pr-error-funnel.js'),'utf8');
 assert.match(source,/Почему назначений и коммитов меньше/);
 assert.doesNotMatch(source,/Почему 41 → 15 → 3/);
});
test('incomplete evidence never invents a diagnostic-to-worker or reply-to-commit difference',()=>{
 const e=event(),proof=m.taskEvidence(records({state:'MANUAL',
  detail:'FREE_AI_PATCH_APPLY_CHECK_FAILED'}),e);
 const summary=m.summarize([e],{[INBOX]:proof},24,NOW,false);
 assert.equal(summary.complete,false);
 assert.equal(summary.breakdown.assigned_diagnostic_not_source,null);
 assert.equal(summary.breakdown.worker_replies_without_commit,null);
 assert.equal(summary.blockers.find(x=>x.key==='why_patch').pr_count,1,
  'a real signed failure remains visible even with other incomplete evidence');
});
test('all reason links are public GitHub PR ids and no private/source data rendered',()=>{
 const f=require('node:fs');
 const src=f.readFileSync(require.resolve('../pr-error-funnel.js'),'utf8');
 const style=f.readFileSync(require.resolve('../pr-error-funnel.css'),'utf8');
 assert.match(src,/hh-error-insight/);
 assert.match(style,/\.hh-error-insight/);
 assert.match(src,/Неполные данные/);
 assert.match(src,/FAILURE_REASONS/);
 assert.match(src,/if\(b\.pr_count===0\)continue/);
 assert.doesNotMatch(src,/localStorage|sessionStorage|document\.cookie|innerHTML\s*=/);
 assert.match(src,/link\.href='https:\/\/github\.com\/'\+REPO\+'\/pull\/'\+number/);
});

test('source-owned Core test repair has verified funnel proof; generic test failure does not',()=>{
 const base=event();
 const scoped=event({category:'TEST_FAILURE',route_receipt:{
  ...base.route_receipt,category:'TEST_FAILURE',state:'TASK_WAITING_FOR_DISPATCH',
  executorId:null,workerTaskKey:null,errorTaskId:null,
  dispatchAccepted:0,dispatchAcknowledged:false},
  classification:{...base.classification,category:'TEST_FAILURE',
   reason_code:'FAILED_TEST_STEP_REQUIRES_TRIAGE',
   evidence_code:'FAILED_TEST_STEP_REQUIRES_TRIAGE',
   failed_job:'core-lint-types-build',
   failed_step:'Mobile Dock Core geometry and iPhone keyboard contracts'}});
 assert.equal(m.sourceRepairCandidate(scoped),true);
 const persisted={...scoped,classification:{...scoped.classification,
   failed_job:undefined,failed_step:undefined},
   failed_jobs:['core-lint-types-build'],
   failed_steps:['core-lint-types-build / Mobile Dock Core geometry and iPhone keyboard contracts']};
 assert.equal(m.sourceRepairCandidate(persisted),true,
  'OIDC inbox retains bounded failed job/step lists after classifier sanitization');
 const signed=signedErrorTask();
 signed.body=signed.body.replace('"category":"TYPESCRIPT"','"category":"TEST_FAILURE"');
 const evidence=withClaimIdentity([signed,...records()]);
 assert.equal(m.signedClaimRoute(evidence,scoped)?.workerTaskKey,TASK);
 const proof=m.taskEvidence(evidence,scoped);
 assert.equal(proof.claimed,true);
 assert.equal(proof.candidate_sha,NEXT);
 assert.equal(m.summarize([scoped],{[INBOX]:{...proof,commit_verified:true}},24,NOW,true).counts.committed,1);
 const ordinary={...persisted,failed_steps:['hh-specialist / WebKit unrelated browser acceptance']};
 assert.equal(m.sourceRepairCandidate(ordinary),false);
 assert.equal(m.signedClaimRoute(evidence,ordinary),null);
 const wrongReason={...persisted,classification:{...persisted.classification,
  reason_code:'UNCLASSIFIED_FAILURE'}};
 assert.equal(m.sourceRepairCandidate(wrongReason),false);
 const forged=evidence.slice();forged[0]={...signed,
  body:signed.body.replace('"strategy_code":"GUARDED_SOURCE_REPAIR"','"strategy_code":"TEST_FAILURE_TRIAGE"')};
 assert.equal(m.signedClaimRoute(forged,scoped),null);
});


function pageEvent(index,minutes=1){
 const stamp=new Date(NOW-index*minutes*60_000).toISOString();
 const suffix=index.toString(16).padStart(12,'0');
 return {...event(),ci_event_id:'00000000-0000-4000-8000-'+suffix,
   pr_number:4000+index,created_at:stamp};
}
function fakePages(source){
 let calls=0;
 const query=async function(cursor){
   const begin=calls++*100;
   const events=source.slice(begin,begin+100);
   if(cursor&&begin>0)assert.equal(cursor.before,
     source[begin-1].created_at,'last exact page boundary must be forwarded');
   const more=begin+100<source.length,last=events.at(-1);
   return {schema:'HH_COMMANDER_CI_EVENT_INBOX_V1',events,
     has_more:more,next_cursor:more?{before:last.created_at,beforeId:last.ci_event_id}:null};
 };
 return {query,called:()=>calls};
}
test('24h error funnel reads all three authenticated keyset pages, not last 100 records',async()=>{
 const source=Array.from({length:230},(_,i)=>pageEvent(i,1));
 const batch=fakePages(source);
 const result=await m.readFailureWindow(batch.query,24,NOW);
 assert.equal(batch.called(),3);
 assert.equal(result.events.length,230);
 assert.equal(result.complete,true);
 assert.equal(result.pages,3);
 assert.equal(result.events[125].ci_event_id,source[125].ci_event_id);
 assert.equal(m.summarize(result.events,{},24,NOW,result.complete).counts.failed,230);
});
test('short selected window stops paging once authenticated events predate its cutoff',async()=>{
 const source=Array.from({length:230},(_,i)=>pageEvent(i,2));
 const batch=fakePages(source);
 const result=await m.readFailureWindow(batch.query,1,NOW);
 assert.equal(batch.called(),1);
 assert.equal(result.complete,true,'all events inside the 1h window were inspected');
 assert.equal(m.summarize(result.events,{},1,NOW,true).counts.failed,31);
});
test('six-page safety cap reports incomplete lower bound, never invented zero coverage',async()=>{
 const source=Array.from({length:700},(_,i)=>pageEvent(i,1));
 const batch=fakePages(source);
 const result=await m.readFailureWindow(batch.query,24,NOW);
 assert.equal(batch.called(),6);
 assert.equal(result.events.length,600);
 assert.equal(result.complete,false);
 assert.equal(m.summarize(result.events,{},24,NOW,result.complete).complete,false);
});
test('invalid or repeated pagination cursor fails closed instead of repeating a PR',async()=>{
 const single=pageEvent(0);
 const bad=await m.readFailureWindow(async()=>({
   schema:'HH_COMMANDER_CI_EVENT_INBOX_V1',events:[single],
   has_more:true,next_cursor:{before:'invalid',beforeId:single.ci_event_id}
 }),24,NOW);
 assert.equal(bad.complete,false,'invalid page cursor is incomplete, not an empty backlog');
 await assert.rejects(()=>m.readFailureWindow(async()=>({
   schema:'HH_COMMANDER_CI_EVENT_INBOX_V1',events:[single,single],
   has_more:false,next_cursor:null
 }),24,NOW),/DUPLICATE_OR_INVALID_CURSOR/);
});
test('signed exact-run dispatch targets are proof-checked before 24 random source PRs',()=>{
 const unrouted=Array.from({length:30},(_,i)=>pageEvent(i,1));
 for(const e of unrouted)e.route_receipt=null;
 const routed=pageEvent(40,2);
 routed.route_receipt={...event().route_receipt,
   prNumber:routed.pr_number,headSha:routed.head_sha,
   runId:routed.workflow_run_id,inboxId:routed.ci_event_id};
 const chosen=m.proofPrs([...unrouted,routed],24);
 assert.equal(chosen.length,24);
 assert.equal(chosen[0],routed.pr_number);
 assert.ok(!chosen.includes(unrouted.at(-1).pr_number));
});
test('owner-only CI pagination preserves stable ordering, bounded reads and no public secrets',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const edge=fs.readFileSync(path.resolve(__dirname,
   '../../../supabase/functions/agent-commander-private-store-v1/index.ts'),'utf8');
 const bridge=fs.readFileSync(require.resolve('../api/commander-chats.js'),'utf8');
 assert.match(edge,/order by created_at desc,ci_event_id desc limit \$2/);
 assert.match(edge,/where inbox_owner_id=\$3::uuid/);
 assert.match(edge,/created_at,ci_event_id\)<\(\$4::timestamptz,\$5::uuid\)/);
 assert.match(edge,/cursor_created_at/);
 assert.match(edge,/has_more:hasMore/);
 assert.match(edge,/limit\+1/);
 assert.match(bridge,/before_id/);
 assert.match(bridge,/INCOMPLETE_CI_EVENT_CURSOR/);
});

test('27 source PRs fit one exact 24h proof sweep and strict cap stays at 32',()=>{
 const source=Array.from({length:27},(_,i)=>pageEvent(i,1));
 const picks=m.proofPrs(source,32);
 assert.equal(picks.length,27,'every current source PR has a slot');
 assert.equal(new Set(picks).size,27);
 const many=Array.from({length:54},(_,i)=>pageEvent(i,1));
 assert.equal(m.proofPrs(many,32).length,32);
 assert.equal(m.proofPrs(many,999).length,32,'API read budget cannot be overridden');
});
test('GitHub proof reads stay at six concurrent requests and preserve failures',async()=>{
 const source=Array.from({length:32},(_,i)=>i);
 let live=0,max=0;
 const results=await m.boundedSettled(source,async function(index){
   live++;max=Math.max(max,live);
   await new Promise(resolve=>setImmediate(resolve));
   live--;
   if(index===13)throw Error('GITHUB_HTTP_403');
   return index*2;
 },6);
 assert.equal(max,6);
 assert.equal(results.length,source.length);
 assert.equal(results[13].status,'rejected');
 assert.match(String(results[13].reason),/GITHUB_HTTP_403/);
 assert.equal(results[31].status,'fulfilled');
 assert.equal(results[31].value,62);
 assert.equal(live,0);
});
test('mobile entry and funnel assets are uniquely versioned v6, not stale v5',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const home=path.resolve(__dirname,'..');
 const boot=fs.readFileSync(path.join(home,'pr-two-screen-boot.js'),'utf8');
 const html=fs.readFileSync(path.join(home,'pr-monitor.html'),'utf8');
 const source=fs.readFileSync(path.join(home,'pr-error-funnel.js'),'utf8');
 assert.match(html,/pr-two-screen-boot\.js\?v=20261111-paginated-v6/);
 assert.match(boot,/pr-error-funnel\.js\?v=20261111-paginated-v6/);
 assert.match(boot,/pr-error-funnel\.css\?v=20261111-paginated-v6/);
 assert.doesNotMatch(boot,/pr-error-funnel\.js\?v=20261111-reasons-v5/);
 assert.match(source,/var PUBLIC_PROOF_PR_LIMIT=32/);
 assert.match(source,/boundedSettled\(prs,commentsFor,6\)/);
});
