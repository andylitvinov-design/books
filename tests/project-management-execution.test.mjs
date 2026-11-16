import test from 'node:test';
import assert from 'node:assert/strict';
import {executionAdmission,buildChatgptHandoff,dispatchPayload} from '../lib/project-management/execution.mjs';
const sha='a'.repeat(40),task={id:'task',title:'Repair example',acceptance:'Verified result',
 kind:'code_change',state:'planned',option_state:'selected'};
const pr={number:123,state:'open',draft:false,mergeable:true,mergeable_state:'clean',
 user:{login:'andylitvinov-design'},base:{ref:'codex/public-book-library'},
 head:{sha,ref:'feat/safe-fix',repo:{full_name:'andylitvinov-design/books'}},
 labels:[{name:'hh:repair-needed'}]};
const checks={total_count:1,check_runs:[{id:1234,name:'core-lint-types-build',
 head_sha:sha,app:{id:15368},status:'completed',conclusion:'failure',
 completed_at:'2026-11-07T16:00:00Z',html_url:'https://github.com/andylitvinov-design/books/runs/1234'}]};
const admit=(change={})=>executionAdmission({task,pr,checks,expectedSha:sha,
 executor:'auto_free_repair',...change});
test('exact failed Core source is necessary, never just a label',()=>{
 assert.equal(admit().ok,true);
 assert.equal(admit({checks:{total_count:0,check_runs:[]}}).ok,false);
 assert.equal(admit({checks:{...checks,check_runs:[{...checks.check_runs[0],conclusion:'success'}]}}).ok,false);
 assert.equal(admit({expectedSha:'b'.repeat(40)}).reason,'PR_HEAD_OR_IDENTITY_UNVERIFIED');
});
test('manual, sensitive, stale and wrong executor all fail closed',()=>{
 for(const label of ['hh:hold','hh:blocked','hh:repair-manual',
  'hh:worker-claimed','hh:specialist-repair-needed']){
  assert.equal(admit({pr:{...pr,labels:[...pr.labels,{name:label}]}}).ok,false,label);
 }
 assert.equal(admit({executor:'codex_host'}).ok,false);
 assert.equal(admit({pr:{...pr,draft:true}}).ok,false);
 assert.equal(admit({task:{...task,option_state:'proposed'}}).ok,false);
 assert.equal(admit({pr:{...pr,mergeable:false}}).ok,false);
});
test('dispatch payload includes exact PR, SHA, idempotency UUID and no worker secrets',()=>{
 const id='9d3948d6-1648-46be-bce2-7c2854ed9ed5';
 assert.deepEqual(dispatchPayload({prNumber:123,headSha:sha,requestId:id}),{
  dry_run:'false',pm_pr_number:'123',pm_expected_sha:sha,pm_request_id:id
 });
 assert.throws(()=>dispatchPayload({prNumber:0,headSha:sha,requestId:id}));
 assert.throws(()=>dispatchPayload({prNumber:123,headSha:'wrong',requestId:id}));
});
test('ChatGPT Work handoff is copyable but not evidence of execution',()=>{
 const text=buildChatgptHandoff({task,pr,admission:admit()});
 assert.match(text,/NOT AN AUTOMATIC AGENT LAUNCH/);
 assert.match(text,/pull\/123/);
 assert.match(text,/No new paid services/);
 assert.doesNotMatch(text,/Bearer |HH_AUTOMERGE_TOKEN/);
});

test('selected awaiting-evidence code tasks can re-enter only a verified RED repair',()=>{
 assert.equal(admit({task:{...task,state:'awaiting_evidence'}}).ok,true);
 for(const state of ['blocked_external','completed_verified','completed_live'])
  assert.equal(admit({task:{...task,state}}).ok,false,state);
 assert.equal(admit({task:{...task,state:'awaiting_evidence',option_state:'proposed'}}).ok,false);
 assert.equal(admit({task:{...task,state:'awaiting_evidence'},
  pr:{...pr,labels:[...pr.labels,{name:'hh:repair-manual'}]}}).ok,false);
});
test('newer GREEN or PENDING exact-HEAD Core blocks an old failed attempt',()=>{
 const red={...checks.check_runs[0],created_at:'2026-11-07T16:00:00Z',
  started_at:'2026-11-07T16:00:01Z',completed_at:'2026-11-07T16:02:00Z'};
 const green={...red,id:1235,conclusion:'success',
  created_at:'2026-11-07T16:03:00Z',started_at:'2026-11-07T16:03:05Z',
  completed_at:'2026-11-07T16:04:00Z'};
 const pending={...green,id:1236,status:'in_progress',conclusion:null,
  created_at:'2026-11-07T16:05:00Z',started_at:'2026-11-07T16:05:10Z',completed_at:null};
 const result=arr=>admit({checks:{total_count:arr.length,check_runs:arr}});
 assert.equal(result([red,green]).reason,'NO_VERIFIED_FAILED_EXACT_HEAD_CORE');
 assert.equal(result([green,red]).reason,'NO_VERIFIED_FAILED_EXACT_HEAD_CORE');
 assert.equal(result([red,pending]).reason,'CURRENT_EXACT_HEAD_CORE_PENDING');
 assert.equal(result([red]).ok,true);
 assert.equal(result([red,{...green,head_sha:'b'.repeat(40)}]).ok,true);
});
