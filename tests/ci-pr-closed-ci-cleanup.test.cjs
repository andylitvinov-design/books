'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {trustedClose,sameClosedPR,eligible,cleanup}=require('../scripts/ci-pr-closed-ci-cleanup.cjs');
const REPO='andylitvinov-design/books',SHA='a'.repeat(40);
const pr={number:42,state:'closed',merged:false,base:{ref:'codex/public-book-library',repo:{full_name:REPO}},
  head:{ref:'fix/case',sha:SHA,repo:{full_name:REPO}}};
const ctx={eventName:'pull_request_target',repo:{owner:'andylitvinov-design',repo:'books'},
  payload:{action:'closed',pull_request:pr}};
const run=(id,status='queued')=>({id,event:'pull_request',run_attempt:1,status,
  head_sha:'b'.repeat(40),head_branch:pr.head.ref,repository:{full_name:REPO},
  head_repository:{full_name:REPO},pull_requests:[{number:42,base:{ref:'codex/public-book-library'}}]});
function mock({runs=[],current=pr,after={},throwCancel=false}={}){
 const calls=[];
 const actions={
  listWorkflowRunsForRepo:async({status,page})=>({data:{total_count:runs.filter(r=>r.status===status).length,
    workflow_runs:page===1?runs.filter(r=>r.status===status):[]}}),
  getWorkflowRun:async({run_id})=>({data:after[run_id]||runs.find(r=>r.id===run_id)}),
  cancelWorkflowRun:async({run_id})=>{calls.push(run_id);if(throwCancel)throw Error('denied');}
 };
 return {github:{rest:{pulls:{get:async()=>({data:current})},actions}},calls};
}
test('only authenticated same-repository production close qualifies',()=>{
 assert.equal(trustedClose(ctx),true);
 assert.equal(trustedClose({...ctx,eventName:'pull_request'}),false);
 assert.equal(trustedClose({...ctx,payload:{...ctx.payload,action:'synchronize'}}),false);
 assert.equal(trustedClose({...ctx,payload:{...ctx.payload,pull_request:{...pr,merged:true}}}),false);
 assert.equal(trustedClose({...ctx,payload:{...ctx.payload,pull_request:{...pr,head:{...pr.head,repo:{full_name:'foreign/repo'}}}}}),false);
 assert.equal(trustedClose({...ctx,repo:{owner:'other',repo:'books'}}),false);
 assert.equal(sameClosedPR({...pr,state:'open'},pr),false);
 assert.equal(sameClosedPR({...pr,head:{...pr.head,sha:'c'.repeat(40)}},pr),false);
});
test('cancel only active first attempt with explicit PR provenance',()=>{
 for(const status of ['queued','in_progress','waiting','pending','requested'])
  assert.equal(eligible(run(1,status),pr),true);
 for(const status of ['completed','cancelled','unknown'])
  assert.equal(eligible(run(1,status),pr),false);
 assert.equal(eligible({...run(1),run_attempt:2},pr),false);
 assert.equal(eligible({...run(1),event:'workflow_dispatch'},pr),false);
 assert.equal(eligible({...run(1),pull_requests:[]},pr),false);
 assert.equal(eligible({...run(1),pull_requests:[{number:99,base:{ref:'codex/public-book-library'}}]},pr),false);
 assert.equal(eligible({...run(1),head_repository:{full_name:'foreign/repo'}},pr),false);
});
test('close cleanup requests only proven PR runs; other, manual and completed untouched',async()=>{
 const foreign={...run(4),pull_requests:[]},manual={...run(5),run_attempt:2};
 const f=mock({runs:[run(1),run(2,'in_progress'),foreign,manual,run(6,'completed')]});
 const result=await cleanup({github:f.github,context:ctx});
 assert.deepEqual(f.calls,[1,2]);
 assert.deepEqual(result.cancelRequested,[1,2]);
 assert.equal(result.confirmed.length,0,'accepted POST is not cancellation proof');
 assert.equal(result.skippedNoProof,2);
});
test('reopen or HEAD change before write leaves all runs untouched',async()=>{
 const f=mock({runs:[run(1)],current:{...pr,state:'open'}});
 assert.equal((await cleanup({github:f.github,context:ctx})).reason,'CLOSE_STATE_CHANGED');
 assert.deepEqual(f.calls,[]);
});
test('run finishing or changing SHA between list and cancel is preserved',async()=>{
 const f=mock({runs:[run(1)],after:{1:{...run(1),status:'completed',conclusion:'success'}}});
 assert.deepEqual((await cleanup({github:f.github,context:ctx})).cancelRequested,[]);
 assert.deepEqual(f.calls,[]);
});
test('a denied cancellation is never reported as completed',async()=>{
 const f=mock({runs:[run(1)],throwCancel:true});
 const result=await cleanup({github:f.github,context:ctx});
 assert.equal(result.errors.length,1);
 assert.equal(result.confirmed.length,0);
});
test('closed cleanup lives on default-trusted workflow; no PR-code execution with write token',()=>{
 const w=readFileSync('.github/workflows/hh-pr-queue-dispatcher.yml','utf8');
 assert.match(w,/pull_request_target:\s*\n\s*types:\s*\[closed\]/);
 assert.match(w,/close-pr-ci-cleanup:/);
 assert.match(w,/event_name == 'pull_request_target'/);
 assert.match(w,/ref: codex\/bootstrap-books/);
 assert.match(w,/actions: write/);
 assert.match(w,/cancel-in-progress: false/);
});
