'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {signedWake,runAssociation,inspectCore,reconcile,GRACE_MS}=
 require('../scripts/ci-pr-ci-wake-audit.cjs');
const {taskFor,commentBody,reservationStatus}=require('../scripts/ci-pr-task-state.cjs');
const SHA='a'.repeat(40),OTHER='b'.repeat(40);
const NOW=Date.parse('2026-11-03T03:40:00Z');
const task={...taskFor({number:2169,state:'open',draft:false,
  user:{login:'andylitvinov-design'},base:{ref:'codex/public-book-library'},
  head:{ref:'fix/ci-wake-2169',sha:SHA,repo:{full_name:'andylitvinov-design/books'}},
  labels:[{name:'hh:ci-needed'}]},{}),pr_number:2169};
const pr={number:2169,state:'open',draft:false,user:{login:'andylitvinov-design'},
 base:{ref:'codex/public-book-library'},
 head:{ref:task.head_ref,sha:SHA,repo:{full_name:'andylitvinov-design/books'}},
 labels:[{name:'hh:ci-needed'}]};
const bot={id:41898282,login:'github-actions[bot]',type:'Bot'};
const app={id:15368,slug:'github-actions'};
const wake=(minutes=30)=>({schema:'HH_PR_TASK_V1',...task,
 state:'CI_WAKE_REQUESTED',source_published:false,
 created_at:new Date(NOW-minutes*60000).toISOString()});
const comment=(record)=>({id:123,user:bot,performed_via_github_app:app,
 body:commentBody(record)});
const coreRun=(more={})=>({id:222,created_at:new Date(NOW-2*60000).toISOString(),
 event:'pull_request',head_branch:task.head_ref,head_sha:SHA,
 pull_requests:[{number:2169,head:{sha:SHA}}],
 status:'completed',conclusion:'success',...more});
function fixture({records=[comment(wake())],runs=[],live=pr,badHistory=false}={}){
 const calls={request:[],created:[],labeled:[],removed:[]};
 const github={request:async(route,args)=>{
  calls.request.push({route,args});
  if(route.includes('/git/commits/'))return {data:{parents:[
   {sha:OTHER},{sha:SHA}]}};
  if(badHistory)return {data:{total_count:120,workflow_runs:runs}};
  return {data:{total_count:runs.length,workflow_runs:runs}};
 },rest:{
  pulls:{get:async()=>({data:live})},
  issues:{
   listComments:async()=>({data:records}),
   createComment:async x=>{calls.created.push(x);return {data:{id:456}};},
   addLabels:async x=>{calls.labeled.push(x);return {data:{}};},
   removeLabel:async x=>{calls.removed.push(x);return {data:{}};},
   createLabel:async()=>({data:{}})
  }
 }};
 return {github,calls,limited:async(_,fn)=>fn()};
}
test('metadata-only wake is pending, not already handled or executed',()=>{
 const records=[comment(wake())];
 assert.equal(reservationStatus(task,records,NOW),'CI_WAKE_PENDING');
 assert.equal(signedWake(task,records).state,'CI_WAKE_REQUESTED');
 assert.equal(reservationStatus(task,[comment({...wake(),state:'CI_CORE_CONFIRMED'})],NOW),
  'ALREADY_HANDLED');
});
test('only signed exact-HEAD CI handoff can be audited',()=>{
 assert.equal(signedWake(task,[{body:commentBody(wake())}]),null);
 assert.equal(signedWake(task,[comment({...wake(),head_sha:OTHER})]),null);
 assert.equal(signedWake(task,[comment({...wake(),lane:'repair'})]),null);
 assert.equal(signedWake(task,[comment(wake())]).pr_number,2169);
});
test('Core association requires the current branch, current SHA and correct PR',()=>{
 assert.equal(runAssociation(coreRun(),task),'EXACT');
 assert.equal(runAssociation(coreRun({head_branch:'foreign'}),task),'OTHER');
 assert.equal(runAssociation(coreRun({pull_requests:[{number:33,head:{sha:SHA}}]}),task),'OTHER');
 assert.equal(runAssociation(coreRun({pull_requests:[{number:2169,head:{sha:OTHER}}]}),task),'OTHER_HEAD');
 assert.equal(runAssociation(coreRun({head_sha:OTHER,pull_requests:[]}),task),'MERGE_PARENT_REQUIRED');
 assert.equal(runAssociation(coreRun({head_sha:OTHER}),task),'MERGE_PARENT_REQUIRED');
});
test('no registered Core run stays pending during 25-minute grace',async()=>{
 const f=fixture(),receipt=wake(10);
 const r=await inspectCore({github:f.github,limited:f.limited,
  owner:'andylitvinov-design',repo:'books',task,wake:receipt,now:NOW});
 assert.equal(r.state,'WAITING');
 assert.equal(r.reason,'CORE_REGISTRATION_GRACE');
});
test('a proven absence after grace is STALLED, never a fabricated Core pass',async()=>{
 const f=fixture();
 const r=await inspectCore({github:f.github,limited:f.limited,
  owner:'andylitvinov-design',repo:'books',task,wake:wake(),now:NOW});
 assert.equal(r.state,'STALLED');
 assert.equal(r.reason,'NO_CORE_RUN_AFTER_WAKE');
 assert.equal(GRACE_MS,25*60000);
});
test('real queued Core remains separate from started and completed Core',async()=>{
 for(const [run,status] of [
  [coreRun({status:'queued',conclusion:null}),'QUEUED'],
  [coreRun({status:'in_progress',conclusion:null}),'RUNNING'],
  [coreRun({status:'completed',conclusion:'failure'}),'CONFIRMED']
 ]){
  const f=fixture({runs:[run]});
  const r=await inspectCore({github:f.github,limited:f.limited,
   owner:'andylitvinov-design',repo:'books',task,wake:wake(),now:NOW});
  assert.equal(r.state,status);
 }
});
test('synthetic merge SHA requires verified exact second parent',async()=>{
 const f=fixture({runs:[coreRun({head_sha:OTHER,pull_requests:[]})]});
 const r=await inspectCore({github:f.github,limited:f.limited,
  owner:'andylitvinov-design',repo:'books',task,wake:wake(),now:NOW});
 assert.equal(r.state,'CONFIRMED');
 assert.ok(f.calls.request.some(x=>x.route.includes('/git/commits/')));
});
test('ambiguous or incomplete run inventory cannot trigger a manual hold',async()=>{
 const f=fixture({runs:[coreRun()],badHistory:true});
 const r=await inspectCore({github:f.github,limited:f.limited,
  owner:'andylitvinov-design',repo:'books',task,wake:wake(),now:NOW});
 assert.equal(r.state,'UNKNOWN');
 assert.equal(r.reason,'CORE_HISTORY_INCOMPLETE');
});
test('a cancelled Core is a visible stalled CI wake after grace',async()=>{
 const f=fixture({runs:[coreRun({conclusion:'cancelled'})]});
 const r=await inspectCore({github:f.github,limited:f.limited,
  owner:'andylitvinov-design',repo:'books',task,wake:wake(),now:NOW});
 assert.equal(r.state,'STALLED');
});
test('dry-run audit creates no labels, comments, PR edits or source writes',async()=>{
 const f=fixture({runs:[]});
 const r=await reconcile({github:f.github,limited:f.limited,
  owner:'andylitvinov-design',repo:'books',task,pr,
  comments:[comment(wake())],now:NOW,dryRun:true});
 assert.equal(r.state,'STALLED');
 assert.equal(f.calls.created.length+f.calls.labeled.length+f.calls.removed.length,0);
});
test('stale CI metadata wake gets one explicit manual label and terminal receipt',async()=>{
 const records=[comment(wake())],f=fixture({records});
 const r=await reconcile({github:f.github,limited:f.limited,
  owner:'andylitvinov-design',repo:'books',task,pr,comments:records,now:NOW});
 assert.equal(r.state,'STALLED');
 assert.equal(f.calls.labeled.length,1);
 assert.ok(f.calls.labeled[0].labels.includes('hh:ci-wake-unconfirmed'));
 assert.equal(f.calls.created.length,1);
 assert.match(f.calls.created[0].body,/"state":"CI_WAKE_UNCONFIRMED"/);
 assert.equal(f.calls.removed.length,1);
 assert.equal(f.calls.removed[0].name,'hh:ci-needed');
});
test('confirmed Core writes verified receipt and retires obsolete CI queue hint',async()=>{
 const records=[comment(wake())],f=fixture({records,runs:[coreRun()]});
 const r=await reconcile({github:f.github,limited:f.limited,
  owner:'andylitvinov-design',repo:'books',task,pr,comments:records,now:NOW});
 assert.equal(r.state,'CONFIRMED');
 assert.match(f.calls.created[0].body,/"state":"CI_CORE_CONFIRMED"/);
 assert.equal(f.calls.labeled.length,0);
 assert.equal(f.calls.removed.length,1);
});
test('changed PR HEAD cannot be labeled or reconciled as the old SHA',async()=>{
 const records=[comment(wake())],f=fixture({records,
  live:{...pr,head:{...pr.head,sha:OTHER}}});
 const r=await reconcile({github:f.github,limited:f.limited,
  owner:'andylitvinov-design',repo:'books',task,pr,comments:records,now:NOW});
 assert.equal(r.state,'UNKNOWN');
 assert.equal(f.calls.created.length+f.calls.labeled.length+f.calls.removed.length,0);
});
