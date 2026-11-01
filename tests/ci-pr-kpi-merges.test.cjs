'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {collectMergeEvents}=require('../scripts/ci-pr-kpi-merges.cjs');
const SHA='a'.repeat(40),MERGE='b'.repeat(40),NOW=Date.parse('2026-11-01T23:00:00Z'),AT='2026-11-01T22:30:00Z';
const headers={'x-ratelimit-remaining':'4000'};
const pr=(number,base='codex/public-book-library')=>({number,state:'closed',updated_at:AT,closed_at:AT,merged_at:AT,merge_commit_sha:MERGE,head:{sha:SHA},base:{ref:base}});
function fixture(items,{moving=false}={}){let scans=0;return {github:{rest:{pulls:{list:async()=>({headers,data:(++scans===2&&moving)?items.slice(1):items})}}}};}
test('reads stable production and default merges separately',async()=>{
 const r=await collectMergeEvents({github:fixture([pr(1),pr(2,'codex/bootstrap-books')]).github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000});
 assert.equal(r.complete,true);assert.deepEqual(r.events.map(e=>e.production),[true,false]);
});
test('moving, missing sha and incomplete rate evidence remain partial',async()=>{
 const moved=fixture([pr(1),pr(2)],{moving:true});assert.equal((await collectMergeEvents({github:moved.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000})).complete,false);
 const bad=fixture([{...pr(1),merge_commit_sha:null}]);assert.equal((await collectMergeEvents({github:bad.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000})).complete,false);
 const missing=fixture([pr(1)]);missing.github.rest.pulls.list=async()=>({data:[pr(1)]});assert.equal((await collectMergeEvents({github:missing.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000})).complete,false);
});
