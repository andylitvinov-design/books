'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {collectReceiptEvents}=require('../scripts/ci-pr-kpi-collector.cjs');
const {taskFor,commentBody}=require('../scripts/ci-pr-task-state.cjs');
const SHA='a'.repeat(40),NOW=Date.parse('2026-11-01T23:00:00Z'),AT='2026-11-01T22:30:00Z';
const pr={number:7,state:'open',draft:false,user:{login:'andylitvinov-design'},base:{ref:'codex/public-book-library'},head:{sha:SHA,ref:'fix/example',repo:{full_name:'andylitvinov-design/books'}},labels:[{name:'hh:repair-needed'}]};
const task=taskFor(pr,{tier:'P1',direction:'other'}),headers={'x-ratelimit-remaining':'4000'};
const comment={id:55,created_at:AT,updated_at:AT,issue_url:'https://api.github.com/repos/andylitvinov-design/books/issues/7',user:{id:41898282,login:'github-actions[bot]',type:'Bot'},performed_via_github_app:{id:15368,slug:'github-actions'},body:commentBody({...task,state:'CLAIMED'})};
const args={owner:'andylitvinov-design',repo:'books',since:NOW-3600000};
function fixture({rows=[comment],moving=false,missingHeaders=false,missingRate=false,notPR=false}={}){
 let scans=0,batches=0;
 const github={rest:{issues:{listCommentsForRepo:async({page})=>{
  if(page===1)scans++;let data=page===1?rows:[];
  if(moving&&scans>1&&page===1)data=data.map(c=>({...c,body:c.body+'changed'}));
  return {headers:missingHeaders?undefined:headers,data};
 }}},graphql:async()=>{batches++;return {rateLimit:missingRate?null:{remaining:4000},repository:{p7:notPR?null:{number:7}}};}};
 return {github,stats:()=>({scans,batches})};
}
test('repository comment inventory validates bot receipts and PR identity in a bounded batch',async()=>{
 const f=fixture();const r=await collectReceiptEvents({...args,github:f.github});
 assert.equal(r.complete,true);assert.deepEqual(r.events.map(x=>x.kind),['claimed']);assert.deepEqual(f.stats(),{scans:2,batches:1});
});
test('a changed comment snapshot remains partial even when its timestamp is unchanged',async()=>{
 const f=fixture({moving:true});const r=await collectReceiptEvents({...args,github:f.github});
 assert.equal(r.complete,false);assert.equal(r.reason,'COMMENTS_CHANGED');
});
test('full pages are terminated and inventoried twice without repeating verified PR checks',async()=>{
 const rows=Array.from({length:100},(_,i)=>({...comment,id:i+1,body:i===0?comment.body:'ordinary'}));
 const f=fixture({rows});const r=await collectReceiptEvents({...args,github:f.github});
 assert.equal(r.complete,true);assert.deepEqual(f.stats(),{scans:2,batches:1});assert.equal(r.events.length,1);
});
test('missing rate evidence, invalid PR identity and bounded API exhaustion remain partial',async()=>{
 for(const options of [{missingHeaders:true},{missingRate:true},{notPR:true}]){
  const f=fixture(options);const r=await collectReceiptEvents({...args,github:f.github});assert.equal(r.complete,false);assert.equal(r.events.length,0);
 }
 const r=await collectReceiptEvents({...args,github:fixture().github,maxRequests:1});assert.equal(r.complete,false);assert.equal(r.reason,'API_BUDGET');
});
test('a forged human receipt is ignored and wrong repository rejected',async()=>{
 const f=fixture({rows:[{...comment,user:{id:77,login:'person',type:'User'}}]});
 const r=await collectReceiptEvents({...args,github:f.github});assert.equal(r.complete,true);assert.equal(r.events.length,0);
 assert.equal((await collectReceiptEvents({...args,owner:'other',github:f.github})).reason,'INVALID_INPUT');
});
test('repository comment reads include since and newest-first ordering',async()=>{
 const f=fixture();const original=f.github.rest.issues.listCommentsForRepo;let observed;
 f.github.rest.issues.listCommentsForRepo=async x=>(observed=x,original(x));
 const r=await collectReceiptEvents({...args,github:f.github});assert.equal(r.complete,true);
 assert.equal(observed.since,new Date(args.since).toISOString());assert.equal(observed.sort,'updated');assert.equal(observed.direction,'desc');
});
test('comment URLs from another repository cannot supply evidence',async()=>{
 const f=fixture({rows:[{...comment,issue_url:'https://api.github.com/repos/other/books/issues/7'}]});
 const r=await collectReceiptEvents({...args,github:f.github});assert.equal(r.complete,false);assert.equal(r.events.length,0);
});
