'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {eligible,actualCore,classify,run}=require('../scripts/ci-pr-backlog-recovery.cjs');
const SHA='a'.repeat(40);
function pr(extra={}){
 return {number:4100,state:'open',draft:false,created_at:'2026-10-25T00:00:00Z',
  user:{login:'andylitvinov-design'},mergeable:true,mergeable_state:'clean',
  head:{sha:SHA,ref:'codex/test-backlog',repo:{full_name:'andylitvinov-design/books'}},
  base:{ref:'codex/public-book-library'},labels:[],...extra};
}
const context={repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/bootstrap-books',eventName:'push'};
function env(row=pr(),{checks=[],runs=[],total=0}={}){
 const labels=[],lookups=[];
 const data=x=>({data:x});
 const github={rest:{
  pulls:{list:async()=>data([row]),get:async()=>data(row)},
  checks:{listForRef:async args=>{lookups.push(args);return data({total_count:checks.length,check_runs:checks});}},
  actions:{listWorkflowRuns:async()=>data({total_count:total,workflow_runs:runs})},
  issues:{addLabels:async args=>{labels.push(args);return data([]);}}
 }};
 const core={info:()=>{},warning:()=>{},summary:{addHeading(){return this;},addCodeBlock(){return this;},async write(){}}};
 return {github,core,labels,lookups};
}
test('only owned, open production PR is allowed',()=>{
 assert.equal(eligible(pr()),true);
 assert.equal(eligible(pr({base:{ref:'codex/bootstrap-books'}})),false);
 assert.equal(eligible(pr({user:{login:'foreign'}})),false);
 assert.equal(eligible(pr({head:{sha:'wrong',ref:'bad',repo:{full_name:'andylitvinov-design/books'}}})),false);
});
test('Draft and explicit Hold are never promoted',()=>{
 assert.equal(classify(pr({draft:true})).kind,'DRAFT');
 assert.equal(classify(pr({labels:[{name:'hh:hold'}]})).kind,'HOLD');
 assert.equal(classify(pr({labels:[{name:'hh:ci-wake-unverified'}]})).kind,'HOLD');
});
test('only independently dirty merges enter conflict lane',()=>{
 assert.equal(classify(pr({mergeable:false,mergeable_state:'dirty'})).label,'hh:conflict-repair-needed');
 assert.equal(classify(pr({mergeable:null})).kind,'UNKNOWN');
});
test('aged PR without any verified Core run obtains CI-needed, not code Repair',()=>{
 assert.deepEqual(classify(pr(),{now:Date.parse('2026-11-04T13:00:00Z')}),{
  kind:'CI_MISSING',label:'hh:ci-needed'
 });
});
test('fresh PR waits for GitHub native event instead of duplicated bootstrap',()=>{
 assert.equal(classify(pr({created_at:'2026-11-04T12:59:00Z'}),{now:Date.parse('2026-11-04T13:00:00Z')}).kind,'NEW');
});
test('exact failing checks remain FAILED without source-edit authorization',()=>{
 assert.equal(classify(pr(),{checks:[{name:'core-lint-types-build',head_sha:SHA,status:'completed',conclusion:'failure'}]}).kind,'FAILED');
 assert.equal(classify(pr(),{checks:[{name:'hh-merge-check',head_sha:SHA,status:'completed',conclusion:'success'}]}).kind,'CI_PRESENT');
});
test('nonterminal exact CI evidence stays running, never CI_MISSING',()=>{
 assert.equal(classify(pr(),{checks:[{head_sha:SHA,name:'core-lint-types-build',status:'in_progress'}]}).kind,'RUNNING');
});
test('exact Core synthetic merge association is verified, not branch name alone',()=>{
 const rec={name:'HH PR core release gate',event:'pull_request',
  head_branch:'codex/test-backlog',head_sha:'b'.repeat(40),
  repository:{full_name:'andylitvinov-design/books'},head_repository:{full_name:'andylitvinov-design/books'},
  pull_requests:[{number:4100,head:{ref:'codex/test-backlog',sha:SHA},
   base:{ref:'codex/public-book-library'}}]};
 assert.equal(actualCore(rec,pr()),true);
 assert.equal(actualCore({...rec,pull_requests:[{...rec.pull_requests[0],number:111}]},pr()),false);
 assert.equal(actualCore({...rec,repository:{full_name:'foreign/books'}},pr()),false);
});
test('audit never mutates PR labels or launches workers',async()=>{
 const e=env();let dispatched=0;
 const result=await run({...e,context,apply:false,dispatcher:async()=>{dispatched++;return {dispatchAccepted:1};}});
 assert.equal(result.byKind.CI_MISSING,1);
 assert.equal(result.queuedLabels,0);assert.equal(dispatched,0);assert.equal(e.labels.length,0);
});
test('apply verifies exact HEAD and uses existing signed dispatcher once',async()=>{
 const e=env();let dispatched=0;
 const result=await run({...e,context,apply:true,dispatcher:async()=>{dispatched++;return {dispatchAccepted:1,reason:'DISPATCH_ACCEPTED'};}});
 assert.equal(result.queuedLabels,1);
 assert.equal(result.ciLabels,1);
 assert.equal(result.dispatchAccepted,1);
 assert.equal(dispatched,1);
 assert.deepEqual(e.labels[0].labels,['hh:ci-needed']);
});
test('already-labeled backlog PR cannot create another CI wave',async()=>{
 const e=env(pr({labels:[{name:'hh:ci-needed'}]}));let dispatched=0;
 const result=await run({...e,context,apply:true,dispatcher:async()=>{dispatched++;return {dispatchAccepted:1};}});
 assert.equal(result.queuedLabels,0);assert.equal(dispatched,0);
});
test('PR head changed on live recheck is never relabeled',async()=>{
 const e=env();const old=e.github.rest.pulls.get;
 e.github.rest.pulls.get=async()=>({data:pr({head:{sha:'b'.repeat(40),ref:'codex/test-backlog',repo:{full_name:'andylitvinov-design/books'}}})});
 const result=await run({...e,context,apply:true,dispatcher:async()=>{throw Error('unexpected dispatch');}});
 assert.equal(result.queuedLabels,0);
 assert.equal(result.byKind.CHANGED,1);
});
test('rate limit or inventory failure cannot turn into a partial label wave',async()=>{
 const e=env();e.github.rest.checks.listForRef=async()=>{throw Error('403 rate limit');};
 await assert.rejects(()=>run({...e,context,apply:true}),/403 rate limit/);
 assert.equal(e.labels.length,0);
});
test('wrong branch and invalid cap fail closed before any API requests',async()=>{
 const e=env();let called=0;e.github.rest.pulls.list=async()=>{called++;return {data:[]};};
 await assert.rejects(()=>run({...e,context:{...context,ref:'refs/heads/evil'},apply:true}),/UNTRUSTED/);
 await assert.rejects(()=>run({...e,context,apply:true,maxLabels:1000}),/LABEL_CAP_INVALID/);
 assert.equal(called,0);
});
