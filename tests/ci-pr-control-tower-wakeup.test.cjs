'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {needsWake,readyHistory,wake}=require('../scripts/ci-pr-control-tower-wakeup.cjs');
const NOW=Date.parse('2026-11-01T20:00:00Z');
const viable={repairQueueBacklog:2,ciQueueBacklog:0};
const base={owner:'andylitvinov-design',repo:'books',summary:viable,
  enabled:true,hasToken:true,dryRun:false,now:NOW,limited:async(_,fn)=>fn()};
function fixture(history=[]){
 const calls=[];
 const github={request:async(route,args)=>{
   calls.push({route,args});
   if(route.startsWith('GET '))return {data:{workflow_runs:history}};
   return {status:204};
 }};
 return {github,calls};
}
test('only a trusted non-dry durable queue can wake the dispatcher',()=>{
 assert.equal(needsWake(viable,true,true,false),true);
 assert.equal(needsWake({},true,true,false),false);
 assert.equal(needsWake(viable,false,true,false),false);
 assert.equal(needsWake(viable,true,false,false),false);
 assert.equal(needsWake(viable,true,true,true),false);
});
test('busy and recent runs suppress duplicate control dispatch',async()=>{
 for(const status of ['queued','in_progress','pending','requested','waiting']){
  const x=fixture([{id:1,status,created_at:new Date(NOW-600000).toISOString()}]);
  const result=await wake({...base,github:x.github});
  assert.equal(result,'BUSY_OR_COOLDOWN');assert.equal(x.calls.length,1);
 }
 const justRan=fixture([{id:1,status:'completed',created_at:new Date(NOW-30000).toISOString()}]);
 assert.equal(readyHistory([{id:1,status:'completed',created_at:new Date(NOW-30000).toISOString()}],NOW),false);
 assert.equal(await wake({...base,github:justRan.github}),'BUSY_OR_COOLDOWN');
 assert.equal(justRan.calls.length,1);
});
test('one exact trusted dispatcher wake when work exists and no recent run',async()=>{
 const x=fixture([{id:1,status:'completed',created_at:new Date(NOW-600000).toISOString()}]);
 const result=await wake({...base,github:x.github});
 assert.equal(result,'DISPATCH_ACCEPTED');assert.equal(x.calls.length,2);
 assert.equal(x.calls[1].args.workflow_id,'hh-pr-queue-dispatcher.yml');
 assert.deepEqual(x.calls[1].args.inputs,{dry_run:'false'});
 assert.equal(x.calls[1].args.ref,'codex/bootstrap-books');
});
test('unknown run status and API errors fail closed without source mutations',async()=>{
 const invalid=fixture([{status:'completed',created_at:new Date(NOW-400000).toISOString()}]);
 assert.equal(await wake({...base,github:invalid.github}),'BUSY_OR_COOLDOWN');
 const github={request:async()=>{throw Error('rate-limited')}};
 assert.equal(await wake({...base,github}),'HANDOFF_UNAVAILABLE');
 assert.equal(await wake({...base,github,dryRun:true}),'NOT_ACTIONABLE');
});
test('only durable worker outcomes trigger one deferred slot refill',async()=>{
 const {wakeAfterWorker}=require('../scripts/ci-pr-control-tower-wakeup.cjs');
 const context={repo:{owner:'andylitvinov-design',repo:'books'},ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_dispatch',runId:42};
 for(const [kind,status] of [['repair','manual_conflict'],['repair','manual_required'],['repair','committed'],['ci','started']]){
  const calls=[];const github={rest:{actions:{createWorkflowDispatch:async x=>{calls.push(x)}}}};
  assert.equal(await wakeAfterWorker({github,context,kind,status,dryRun:false}), 'DISPATCH_ACCEPTED');
  assert.equal(calls.length,1);assert.deepEqual(calls[0].inputs,{dry_run:'false',completion_wake:'true',worker_run_id:'42'});
 }
});
test('dry, untrusted, empty and failed worker outcomes cannot fan out',async()=>{
 const {wakeAfterWorker}=require('../scripts/ci-pr-control-tower-wakeup.cjs');
 const context={repo:{owner:'andylitvinov-design',repo:'books'},ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_dispatch',runId:42};
 let sent=0;const github={rest:{actions:{createWorkflowDispatch:async()=>{sent++}}}};
 for(const v of [{kind:'repair',status:'skipped'},{kind:'repair',status:'claimed'},{kind:'ci',status:'skipped'},
  {kind:'repair',status:'manual_required',dryRun:true}, {kind:'repair',status:'committed',context:{...context,ref:'refs/heads/evil'}}])
  assert.equal(await wakeAfterWorker({github,context,dryRun:false,...v}),'NOT_ACTIONABLE');
 assert.equal(sent,0);
});


test('completion wake waits for a trusted finished worker and its cooldown',async()=>{
 const {waitForWorkerCompletion}=require('../scripts/ci-pr-control-tower-wakeup.cjs');
 let now=NOW,calls=0;const sleeps=[];
 const github={rest:{actions:{getWorkflowRun:async()=>({data:{id:42,
   name:'HH PR source Repair Worker',head_branch:'codex/bootstrap-books',
   repository:{full_name:'andylitvinov-design/books'},
   status:++calls===1?'in_progress':'completed',conclusion:'success',updated_at:new Date(now).toISOString()}})}}};
 const result=await waitForWorkerCompletion({github,owner:'andylitvinov-design',repo:'books',runId:'42',
  clock:()=>now,sleep:async ms=>{sleeps.push(ms);now+=ms}});
 assert.equal(result,true);assert.deepEqual(sleeps,[5000,31000]);
});
test('completion wake never trusts a foreign, failed, or perpetually active run',async()=>{
 const {waitForWorkerCompletion}=require('../scripts/ci-pr-control-tower-wakeup.cjs');
 for(const change of [{name:'other'},{conclusion:'failure'},{status:'in_progress'}]){
  let now=NOW;const github={rest:{actions:{getWorkflowRun:async()=>({data:{id:42,
   name:'HH PR source Repair Worker',head_branch:'codex/bootstrap-books',
   repository:{full_name:'andylitvinov-design/books'},status:'completed',conclusion:'success',
   updated_at:new Date(NOW).toISOString(),...change}})}}};
  assert.equal(await waitForWorkerCompletion({github,owner:'andylitvinov-design',repo:'books',runId:'42',
   clock:()=>now,sleep:async ms=>{now+=ms}}),false);
 }
});
