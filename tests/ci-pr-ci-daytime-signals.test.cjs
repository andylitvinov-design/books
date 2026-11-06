'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const A=require('../scripts/ci-pr-ci-daytime-signals.cjs');
const obs=(t,r,q,x=null)=>({schema:A.OBS_SCHEMA,observed_at:t,running:r,queued:q,other_pending:x});
const run=(p,t,r,q,x=null)=>A.evaluate(p,obs(t,r,q,x),Date.parse(t)+1000);
const H='2026-11-06T16:00:00Z',T='2026-11-06T16:10:00Z',
 F='2026-11-06T16:20:00Z',Z='2026-11-06T16:30:00Z';
test('21→10→4→0 gives one/two/three bells, exactly once per level',()=>{
 let p=run(null,H,21,4);assert.equal(p.state.armed,true);
 p=run(p.state,T,10,4);assert.equal(p.alert.level,1);
 assert.match(A.renderAlert(p.alert),/🔔/);
 assert.equal(run(p.state,'2026-11-06T16:11:00Z',10,4).alert,null);
 p=run(p.state,F,4,2);assert.equal(p.alert.level,2);
 p=run(p.state,Z,0,0,0);assert.equal(p.alert.level,3);
 assert.match(A.renderAlert(p.alert),/🔔🔔🔔/);
 assert.equal(run(p.state,'2026-11-06T16:40:00Z',0,0,0).alert,null);
});
test('direct jump 21→0 alerts only level 3; exactly five is level 1',()=>{
 const p=run(null,H,21,2).state;
 assert.equal(run(p,T,0,0,0).alert.level,3);
 assert.equal(run(p,T,5,1).alert.level,1);
});
test('queue or missing pending verification never means complete',()=>{
 const p=run(null,H,21,2).state;
 for(const [q,x] of [[2,0],[0,null],[0,2]])assert.equal(run(p,T,0,q,x).alert.level,2);
});
test('first low observation no guessed crossing and rearm only >10',()=>{
 let p=run(null,T,0,0,0);assert.equal(p.alert,null);
 p=run(null,H,25,3).state;p=run(p,F,4,1).state;
 assert.equal(run(p,Z,8,0).alert,null);
 p=run(p,'2026-11-06T16:31:00Z',13,0).state;
 assert.equal(run(p,'2026-11-06T16:32:00Z',8,0).alert.level,1);
});
test('night 23–08 Toronto suppresses and does not replay in morning',()=>{
 const p=run(null,'2026-11-07T03:40:00Z',24,0).state;
 const night=run(p,'2026-11-07T04:10:00Z',0,0,0);
 assert.equal(night.alert,null);assert.equal(night.state.highest_level,3);
 assert.equal(run(night.state,'2026-11-07T13:00:00Z',0,0,0).alert,null);
 assert.equal(A.daytime('2026-11-07T12:59:00Z'),false);
 assert.equal(A.daytime('2026-11-07T13:00:00Z'),true);
 assert.equal(A.daytime('2026-11-08T04:00:00Z'),false);
});
test('actual sending after 23 also suppressed despite earlier observation',()=>{
 const p=run(null,'2026-11-07T03:40:00Z',24,0).state;
 const late=A.evaluate(p,obs('2026-11-07T03:59:00Z',8,0),Date.parse('2026-11-07T04:00:30Z'));
 assert.equal(late.alert,null);assert.equal(late.state.highest_level,1);
});
test('stale, future and malformed counts fail closed, do not claim zero',()=>{
 const base=obs(H,21,4);
 for(const v of [null,-1,1.5,'0',NaN])assert.equal(A.evaluate(null,{...base,running:v},Date.parse(H)).alert,null);
 assert.equal(A.evaluate(null,base,Date.parse(H)+16*60000).status,'UNKNOWN_OR_STALE');
 assert.equal(A.evaluate(null,base,Date.parse(H)-3*60000).status,'UNKNOWN_OR_STALE');
 assert.equal(A.evaluate(null,{...base,schema:'fake'},Date.parse(H)).status,'UNKNOWN_OR_STALE');
});
test('exact trusted watchdog run only may be excluded from active',()=>{
 const self={id:123,status:'in_progress',name:'HH PR 10-minute watchdog',head_branch:'codex/bootstrap-books'};
 assert.deepEqual(A.withoutCurrentWatchdog(1,[self],123),{running:0,excluded:true});
 assert.deepEqual(A.withoutCurrentWatchdog(1,[self],111),{running:1,excluded:false});
 assert.deepEqual(A.withoutCurrentWatchdog(1,null,123),{running:1,excluded:false});
});
test('three supplemental statuses must all be known',async()=>{
 let seen=[];
 const gh={rest:{actions:{listWorkflowRunsForRepo:async({status})=>{
 seen.push(status);return {data:{total_count:status==='pending'?2:0}};
 }}}};
 assert.equal(await A.verifyExtraPending(gh),2);
 assert.deepEqual(seen,['pending','waiting','requested']);
 assert.equal(await A.verifyExtraPending({rest:{actions:{listWorkflowRunsForRepo:async()=>({data:{}})}}}),null);
});
test('idempotent GitHub issue mention and persisted state',async()=>{
 let comments=[],n=0;
 const gh={rest:{issues:{
 listComments:async()=>({data:comments}),
 createComment:async({body})=>{n++;comments.push({user:{login:'github-actions[bot]'},body});}
 }}};
 const p=run(null,H,21,4).state;
 let r=await A.deliver({github:gh,issue:{comments:0},prior:p,observation:obs(T,10,0),nowMs:Date.parse(T)+1000});
 assert.equal(r.status,'POSTED');assert.equal(n,1);
 assert.match(A.renderAlert(r.alert),/@andylitvinov-design/);
 r=await A.deliver({github:gh,issue:{comments:1},prior:p,observation:obs(T,10,0),nowMs:Date.parse(T)+1000});
 assert.equal(r.status,'ALREADY_POSTED');assert.equal(n,1);
});
test('failed GitHub notification preserves previous state for later retries',async()=>{
 const p=run(null,H,21,0).state;
 const gh={rest:{issues:{
 listComments:async()=>({data:[]}),createComment:async()=>{throw Error('403');}
 }}};
 const r=await A.deliver({github:gh,issue:{comments:0},prior:p,observation:obs(T,8,0),nowMs:Date.parse(T)+1000});
 assert.equal(r.status,'DELIVERY_UNVERIFIED_RETRYABLE');assert.deepEqual(r.state,p);
});
test('zero needs supplemental status check and rejects pending runs',async()=>{
 let calls=[];
 const gh={rest:{issues:{listComments:async()=>({data:[]}),createComment:async()=>({})},
 actions:{listWorkflowRunsForRepo:async({status})=>{
 calls.push(status);return {data:{total_count:status==='waiting'?1:0}};
 }}}};
 const p=run(null,H,25,0).state;
 const r=await A.deliver({github:gh,issue:{comments:0},prior:p,observation:obs(Z,0,0),nowMs:Date.parse(Z)+1000});
 assert.deepEqual(calls,['pending','waiting','requested']);assert.equal(r.alert.level,2);
});
