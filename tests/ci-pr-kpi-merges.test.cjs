'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {collectMergeEvents}=require('../scripts/ci-pr-kpi-merges.cjs');
const SHA='a'.repeat(40),MERGE='b'.repeat(40),NOW=Date.parse('2026-11-01T23:00:00Z'),AT='2026-11-01T22:30:00Z';
const headers={'x-ratelimit-remaining':'4000'};
const pr=(number,base='codex/public-book-library')=>({number,state:'closed',updated_at:AT,closed_at:AT,merged_at:AT,merge_commit_sha:MERGE,head:{sha:SHA},base:{ref:base}});
function fixture(items,{moving=false}={}){
 let scans=0;
 const issue=x=>({number:x.number,state:'closed',updated_at:x.updated_at,closed_at:x.closed_at,pull_request:{}});
 return {github:{rest:{issues:{listForRepo:async()=>({headers,data:((++scans===2&&moving)?items.slice(1):items).map(issue)})},
  pulls:{get:async({pull_number})=>({headers,data:items.find(x=>x.number===pull_number)})}}}};
}
test('reads stable production and default merges separately',async()=>{
 const r=await collectMergeEvents({github:fixture([pr(1),pr(2,'codex/bootstrap-books')]).github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000});
 assert.equal(r.complete,true);assert.deepEqual(r.events.map(e=>e.production),[true,false]);
});
test('moving, missing sha and incomplete rate evidence remain partial',async()=>{
 const moved=fixture([pr(1),pr(2)],{moving:true});assert.equal((await collectMergeEvents({github:moved.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000})).complete,false);
 const bad=fixture([{...pr(1),merge_commit_sha:null}]);assert.equal((await collectMergeEvents({github:bad.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000})).complete,false);
 const missing=fixture([pr(1)]);missing.github.rest.issues.listForRepo=async()=>({data:[{number:1,state:'closed',updated_at:AT,closed_at:AT,pull_request:{}}]});assert.equal((await collectMergeEvents({github:missing.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000})).complete,false);
});
test('closed issue inventory uses since filter and tolerates update-order inversions',async()=>{
 const rows=[{number:1,state:'closed',updated_at:'2026-11-01T22:10:00Z',closed_at:AT,pull_request:{}},
  {number:2,state:'closed',updated_at:AT,closed_at:AT,pull_request:{}}];
 let seenSince;const gh={rest:{issues:{listForRepo:async args=>(seenSince=args.since,{headers,data:rows})},
  pulls:{get:async({pull_number})=>({headers,data:pr(pull_number)})}}};
 const r=await collectMergeEvents({github:gh,owner:'andylitvinov-design',repo:'books',since:NOW-3600000});
 assert.equal(seenSince,new Date(NOW-3600000).toISOString());assert.equal(r.complete,true);assert.equal(r.events.length,2);
});
test('a bounded detail scan preserves observed merges as a partial sample',async()=>{
 const r=await collectMergeEvents({github:fixture([pr(1),pr(2)]).github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000,maxRequests:2});
 assert.equal(r.complete,false);assert.equal(r.reason,'API_BUDGET');assert.equal(r.events.length,1);
});
