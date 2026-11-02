'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {normalizeReceipts}=require('../scripts/ci-pr-kpi-receipts.cjs');
const {taskFor,commentBody}=require('../scripts/ci-pr-task-state.cjs');
const SHA='a'.repeat(40),NEW='b'.repeat(40),AT='2026-11-01T22:29:00Z';
const pr={number:2342,state:'open',draft:false,user:{login:'andylitvinov-design'},base:{ref:'codex/public-book-library'},head:{sha:SHA,ref:'fix/example',repo:{full_name:'andylitvinov-design/books'}},labels:[{name:'hh:repair-needed'}]};
const task=taskFor(pr,{tier:'P1',direction:'other'});
const comment=record=>({created_at:AT,user:{id:41898282,login:'github-actions[bot]',type:'Bot'},performed_via_github_app:{id:15368,slug:'github-actions'},body:commentBody(record)});
test('normalizes trusted exact-task receipts with server timestamps',()=>{
 const comments=[comment({...task,state:'RESERVED'}),comment({...task,state:'CLAIMED'}),comment({...task,state:'PUBLISHED',new_sha:NEW})];
 const result=normalizeReceipts(2342,comments);
 assert.equal(result.complete,true);assert.deepEqual(result.events.map(e=>e.kind),['reserved','claimed','source_committed']);
 assert.equal(result.events[2].newHead,NEW);assert.equal(result.events[0].at,AT);
});
test('ignores outsider markers and fails closed on malformed or mismatched bot receipts',()=>{
 const good=comment({...task,state:'CLAIMED'}),outsider={...good,user:{id:7,login:'outsider',type:'User'}};
 assert.deepEqual(normalizeReceipts(2342,[outsider]),{events:[],complete:true});
 for(const bad of [{...good,body:good.body.replace(task.task_key,'f'.repeat(32))},
  {...good,created_at:'invalid'}, {...good,performed_via_github_app:null}, {...good,user:null}, comment({...task,pr_number:99,state:'CLAIMED'}),
  comment({...task,state:'PUBLISHED',new_sha:'not-a-sha'})])
  assert.equal(normalizeReceipts(2342,[bad]).complete,false);
});
