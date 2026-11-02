'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {collectMergeEvents}=require('../scripts/ci-pr-kpi-merges.cjs');
const SHA='a'.repeat(40),MERGE='b'.repeat(40),NOW=Date.parse('2026-11-01T23:00:00Z'),AT='2026-11-01T22:30:00Z';
const headers={'x-ratelimit-remaining':'4000'};
const pr=(number,base='codex/public-book-library')=>({number,state:'closed',updated_at:AT,closed_at:AT,merged_at:AT,merge_commit_sha:MERGE,head:{sha:SHA},base:{ref:base}});
function fixture(items,{moving=false}={}){
 let scans=0;
 const issue=x=>({number:x.number,state:'closed',updated_at:x.updated_at,closed_at:x.closed_at,pull_request:{}});
 const node=x=>({number:x.number,state:x.merged_at?'MERGED':'CLOSED',closedAt:x.closed_at,mergedAt:x.merged_at,headRefOid:x.head.sha,baseRefName:x.base.ref,mergeCommit:x.merge_commit_sha?{oid:x.merge_commit_sha}:null});
 return {github:{graphql:async()=>({rateLimit:{remaining:4000},repository:Object.fromEntries(items.map(x=>['p'+x.number,node(x)]))}),rest:{issues:{listForRepo:async()=>({headers,data:((++scans===2&&moving)?items.slice(1):items).map(issue)})}}}};
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
 let seenSince;const gh=fixture([pr(1),pr(2)]).github;gh.rest.issues.listForRepo=async args=>(seenSince=args.since,{headers,data:rows});
 const r=await collectMergeEvents({github:gh,owner:'andylitvinov-design',repo:'books',since:NOW-3600000});
 assert.equal(seenSince,new Date(NOW-3600000).toISOString());assert.equal(r.complete,true);assert.equal(r.events.length,2);
});
test('a bounded detail scan preserves observed merges as a partial sample',async()=>{
 const r=await collectMergeEvents({github:fixture([pr(1),pr(2)]).github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000,maxRequests:2});
 assert.equal(r.complete,false);assert.equal(r.reason,'API_BUDGET');assert.equal(r.events.length,2);
});
test('reads multiple PR details in one bounded GraphQL batch',async()=>{
 const items=[pr(1),pr(2)];let batches=0;
 const f=fixture(items);f.github.graphql=async(query)=>{batches++;assert.match(query,/p1:pullRequest\(number:1\)/);assert.match(query,/p2:pullRequest\(number:2\)/);
  const node=x=>({number:x.number,state:'MERGED',closedAt:x.closed_at,mergedAt:x.merged_at,headRefOid:x.head.sha,baseRefName:x.base.ref,mergeCommit:{oid:x.merge_commit_sha}});
  return {rateLimit:{remaining:3000},repository:{p1:node(items[0]),p2:node(items[1])}};};
 const r=await collectMergeEvents({github:f.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000});
 assert.equal(r.complete,true);assert.equal(r.events.length,2);assert.equal(batches,1);
});
test('missing GraphQL rate evidence or malformed detail never establishes coverage',async()=>{
 for(const result of [{repository:{}},{rateLimit:{remaining:4000},repository:{p1:null}}]){
  const f=fixture([pr(1)]);f.github.graphql=async()=>result;
  const r=await collectMergeEvents({github:f.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000});
  assert.equal(r.complete,false);assert.equal(r.events.length,0);
 }
});
