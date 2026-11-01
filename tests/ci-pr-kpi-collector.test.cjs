'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {collectReceiptEvents}=require('../scripts/ci-pr-kpi-collector.cjs');
const {taskFor,commentBody}=require('../scripts/ci-pr-task-state.cjs');
const SHA='a'.repeat(40),NOW=Date.parse('2026-11-01T23:00:00Z'),AT='2026-11-01T22:30:00Z';
const pr={number:7,state:'open',draft:false,user:{login:'andylitvinov-design'},base:{ref:'codex/public-book-library'},head:{sha:SHA,ref:'fix/example',repo:{full_name:'andylitvinov-design/books'}},labels:[{name:'hh:repair-needed'}]};
const task=taskFor(pr,{tier:'P1',direction:'other'});
const comment={id:55,created_at:AT,user:{id:41898282,login:'github-actions[bot]',type:'Bot'},performed_via_github_app:{id:15368,slug:'github-actions'},body:commentBody({...task,state:'CLAIMED'})};
const issue={number:7,updated_at:AT,comments:1,pull_request:{url:'https://api.github.com/repos/andylitvinov-design/books/pulls/7'}};
function fixture({change=false,fail=false,count=1}={}){
 let scans=0,reads=0;
 const github={rest:{issues:{listForRepo:async({page})=>{
   if(page===1)scans++;return {headers:{'x-ratelimit-remaining':'5000'},data:page===1?[{...issue,comments:count,updated_at:change&&scans>1?'2026-11-01T22:31:00Z':AT}]:[]};
  },listComments:async()=>{reads++;if(fail)throw Error('unavailable');return {headers:{'x-ratelimit-remaining':'5000'},data:[comment]}}}}};
 return {github,stats:()=>({scans,reads})};
}
test('collects verified receipts only after stable complete issue and comment reads',async()=>{
 const f=fixture();const r=await collectReceiptEvents({github:f.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000});
 assert.equal(r.complete,true);assert.deepEqual(r.events.map(x=>x.kind),['claimed']);
 assert.deepEqual(f.stats(),{scans:2,reads:1});
});
test('moving inventory, inconsistent comment count and API failure remain partial',async()=>{
 for(const opts of [{change:true},{count:2},{fail:true}]){
  const f=fixture(opts);const r=await collectReceiptEvents({github:f.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000});
  assert.equal(r.complete,false);
 }
});
test('budget exhaustion and wrong repository never invent complete coverage',async()=>{
 const f=fixture();assert.equal((await collectReceiptEvents({github:f.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000,maxRequests:1})).complete,false);
 assert.equal((await collectReceiptEvents({github:f.github,owner:'other',repo:'books',since:NOW-3600000})).complete,false);
});

test('reads a full comments page plus the terminating page and respects rate reserve',async()=>{
 const f=fixture({count:100});let pages=[];
 f.github.rest.issues.listComments=async({page})=>{
  pages.push(page);return {headers:{'x-ratelimit-remaining':'5000'},data:page===1?Array.from({length:100},(_,i)=>({...comment,id:i+1})):[]};
 };
 const r=await collectReceiptEvents({github:f.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000});
 assert.equal(r.complete,true);assert.deepEqual(pages,[1,2]);
 const low=fixture();low.github.rest.issues.listForRepo=async()=>({headers:{'x-ratelimit-remaining':'99'},data:[issue]});
 assert.equal((await collectReceiptEvents({github:low.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000})).complete,false);
});
test('missing rate-limit evidence fails closed',async()=>{
 const f=fixture();f.github.rest.issues.listForRepo=async()=>({data:[issue]});
 const r=await collectReceiptEvents({github:f.github,owner:'andylitvinov-design',repo:'books',since:NOW-3600000});
 assert.equal(r.complete,false);assert.equal(r.reason,'RATE_RESERVE_UNVERIFIED');
});
