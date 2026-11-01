'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {collectBacklog}=require('../scripts/ci-pr-kpi-backlog.cjs');
const SHA='a'.repeat(40),headers={'x-ratelimit-remaining':'4000'};
const pr=(number,labels=[],extra={})=>({number,state:'open',draft:false,user:{login:'andylitvinov-design'},base:{ref:'codex/public-book-library'},head:{sha:SHA,ref:'fix/'+number,repo:{full_name:'andylitvinov-design/books'}},labels:labels.map(name=>({name})),...extra});
function fixture(items,{moving=false}={}){let reads=0;return {github:{rest:{pulls:{list:async()=>({headers,data:(++reads===2&&moving)?items.slice(1):items})}}}};}
test('stable complete open inventory reports labels but does not claim actionable proof',async()=>{
 const f=fixture([pr(1,['hh:repair-needed']),pr(2,['hh:conflict-repair-needed']),pr(3,['hh:repair-manual']),pr(4,[],{draft:true})]);
 const r=await collectBacklog({github:f.github,owner:'andylitvinov-design',repo:'books'});
 assert.equal(r.complete,true);assert.equal(r.counts.open,4);assert.equal(r.counts.source_queued,1);
 assert.equal(r.counts.conflict_queued,1);assert.equal(r.counts.manual,1);assert.equal(r.counts.draft,1);
 assert.equal(r.counts.actionable,null);assert.equal(r.counts.candidates,2);
});
test('moving or unverified inventory never produces authoritative counts',async()=>{
 const f=fixture([pr(1),pr(2)],{moving:true});const r=await collectBacklog({github:f.github,owner:'andylitvinov-design',repo:'books'});
 assert.equal(r.complete,false);assert.equal(r.counts,null);
 const wrong=await collectBacklog({github:f.github,owner:'other',repo:'books'});assert.equal(wrong.complete,false);
});
