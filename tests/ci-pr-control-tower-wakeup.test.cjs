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
 for(const [kind,status] of [['repair','manual_conflict'],['repair','manual_required'],['repair','committed'],['ci','started'],['ci','requested']]){
  const calls=[];const github={rest:{actions:{createWorkflowDispatch:async x=>{calls.push(x)}}}};
  assert.equal(await wakeAfterWorker({github,context,kind,status,dryRun:false}), 'DISPATCH_ACCEPTED');
  assert.equal(calls.length,1);assert.equal(calls[0].workflow_id,'hh-pr-ten-minute-watchdog.yml');
  assert.deepEqual(calls[0].inputs,{dry_run:'false',completion_wake:'true',worker_run_id:'42'});
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
test('completion relay only starts the writer after verified worker completion',async()=>{
 const {relayCompletionWake}=require('../scripts/ci-pr-control-tower-wakeup.cjs');
 const context={repo:{owner:'andylitvinov-design',repo:'books'},ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_dispatch',payload:{inputs:{completion_wake:'true',worker_run_id:'42',dry_run:'false'}}};
 const calls=[];const github={rest:{actions:{createWorkflowDispatch:async x=>calls.push(x)}}};
 assert.equal(await relayCompletionWake({github,context,wait:async()=>false}),'WORKER_UNVERIFIED');assert.equal(calls.length,0);
 assert.equal(await relayCompletionWake({github,context,wait:async()=>true}),'DISPATCH_ACCEPTED');
 assert.equal(calls[0].workflow_id,'hh-pr-ten-minute-watchdog.yml');
 assert.deepEqual(calls[0].inputs,{dry_run:'false',direct_dispatch:'true'});
 assert.equal(await relayCompletionWake({github,context:{...context,payload:{inputs:{...context.payload.inputs,dry_run:'true'}}},wait:async()=>true}),'NOT_ACTIONABLE');
 assert.equal(calls.length,1);
});
test('completion waits in Watchdog cannot occupy the direct writer lease',()=>{
 const fs=require('node:fs');
 const s=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const observer=fs.readFileSync('.github/workflows/hh-pr-queue-dispatcher.yml','utf8');
 assert.match(s,/completion-wait:/);assert.match(s,/hh-direct-worker-completion-/);
 assert.match(s,/hh-control-tower-single-writer/);assert.match(s,/relayCompletionWake/);
 assert.doesNotMatch(observer,/completion-wait:/);
 assert.doesNotMatch(s,/^concurrency:\s*$/m);
});
test('completion relay rejects forged inputs and handles dispatch denial',async()=>{
 const {relayCompletionWake}=require('../scripts/ci-pr-control-tower-wakeup.cjs');
 const context={repo:{owner:'andylitvinov-design',repo:'books'},ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_dispatch',payload:{inputs:{completion_wake:'true',worker_run_id:'42',dry_run:'false'}}};
 let calls=0;const github={rest:{actions:{createWorkflowDispatch:async()=>{calls++;throw Error('denied')}}}};
 for(const bad of [{...context,repo:{owner:'other',repo:'books'}},{...context,eventName:'push'},
  {...context,payload:{inputs:{...context.payload.inputs,worker_run_id:'x'}}}])
  assert.equal(await relayCompletionWake({github,context:bad,wait:async()=>true}),'NOT_ACTIONABLE');
 assert.equal(calls,0);assert.equal(await relayCompletionWake({github,context,wait:async()=>true}),'HANDOFF_UNAVAILABLE');assert.equal(calls,1);
});


test('PR contract and push audit noise cannot suppress an actionable watchdog handoff',async()=>{
 const noise=[
  {id:1,event:'pull_request',status:'in_progress',
   created_at:new Date(NOW-1000).toISOString()},
  {id:2,event:'push',status:'completed',
   created_at:new Date(NOW-3000).toISOString()}
 ];
 assert.equal(readyHistory(noise,NOW),true);
 const x=fixture(noise);
 assert.equal(await wake({...base,github:x.github}),'DISPATCH_ACCEPTED');
 assert.equal(x.calls.length,2);
 const busy={id:3,event:'workflow_dispatch',status:'queued',
   created_at:new Date(NOW-60000).toISOString()};
 assert.equal(readyHistory([...noise,busy],NOW),false);
});
test('a completed real dispatch cools down from exit, not creation',()=>{
 const run={id:1,event:'schedule',status:'completed',
  created_at:new Date(NOW-900000).toISOString(),
  updated_at:new Date(NOW-30000).toISOString()};
 assert.equal(readyHistory([run],NOW),false);
 assert.equal(readyHistory([{...run,updated_at:new Date(NOW-180000).toISOString()}],NOW),true);
});



test('audit and PR contract runs cannot suppress an actionable dispatcher wake',()=>{
 const recent=new Date(NOW-10000).toISOString();
 assert.equal(readyHistory([{id:1,event:'pull_request',status:'in_progress',created_at:recent}],NOW),true);
 assert.equal(readyHistory([{id:2,event:'push',status:'completed',created_at:recent}],NOW),true);
 assert.equal(readyHistory([{id:3,event:'schedule',status:'in_progress',created_at:recent}],NOW),false);
 assert.equal(readyHistory([{id:4,event:'workflow_dispatch',status:'completed',
  created_at:new Date(NOW-30*60_000).toISOString(),updated_at:recent}],NOW),false);
});
test('stale watchdog cron backstop verifies queue state and dispatches at most one real tick',async()=>{
 const {watchdogCronDecision,wakeStaleWatchdog}=require('../scripts/ci-pr-control-tower-wakeup.cjs');
 const old=new Date(NOW-40*60_000).toISOString();
 const recent=new Date(NOW-5*60_000).toISOString();
 const historical={id:21,status:'completed',created_at:old,updated_at:old};
 assert.equal(watchdogCronDecision([historical],[],NOW),'WAKE_STALE_WATCHDOG');
 assert.equal(watchdogCronDecision([{...historical,status:'queued'}],[],NOW),
  'WATCHDOG_ALREADY_RUNNING');
 assert.equal(watchdogCronDecision([{...historical,created_at:recent}],[],NOW),
  'WATCHDOG_CRON_HEALTHY');
 assert.equal(watchdogCronDecision([historical],[{...historical,id:22,created_at:recent,updated_at:recent}],NOW),
  'WATCHDOG_MANUAL_RECENT');
 assert.equal(watchdogCronDecision(null,[],NOW),'WATCHDOG_HISTORY_UNVERIFIED');
 const context={repo:{owner:'andylitvinov-design',repo:'books'},
  ref:'refs/heads/codex/bootstrap-books',eventName:'schedule'};
 const calls=[];
 const github={rest:{actions:{
  listWorkflowRuns:async({event})=>{
   calls.push(event);
   return {data:{total_count:1,workflow_runs:[historical]}};
  },
  createWorkflowDispatch:async x=>{calls.push(x);return {status:204};}
 }}};
 const outcome=await wakeStaleWatchdog({github,context,summary:{production:42},now:NOW});
 assert.equal(outcome.decision,'EVENT_WATCHDOG_WAKE_ACCEPTED');
 assert.equal(outcome.dispatchAccepted,true);
 assert.deepEqual(calls.slice(0,2),['schedule','workflow_dispatch']);
 assert.equal(calls[2].workflow_id,'hh-pr-ten-minute-watchdog.yml');
 assert.equal(calls[2].inputs.dry_run,'false');
 const before=calls.length;
 const dry=await wakeStaleWatchdog({github,context,summary:{production:42},now:NOW,dryRun:true});
 assert.equal(dry.decision,'NOT_ELIGIBLE');
 assert.equal(calls.length,before);
});
test('existing queued Watchdog or malformed schedule inventory blocks fallback',async()=>{
 const {wakeStaleWatchdog}=require('../scripts/ci-pr-control-tower-wakeup.cjs');
 const context={repo:{owner:'andylitvinov-design',repo:'books'},
  ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_run'};
 let dispatches=0;
 const github={rest:{actions:{
  listWorkflowRuns:async({event})=>({data:{total_count:event==='schedule'?0:1,
   workflow_runs:event==='schedule'?[]:[{id:3,status:'queued',
    created_at:new Date(NOW-60*60_000).toISOString()}]}}),
  createWorkflowDispatch:async()=>{dispatches++;}
 }}};
 const o=await wakeStaleWatchdog({github,context,summary:{production:7},now:NOW});
 assert.equal(o.decision,'WATCHDOG_ALREADY_RUNNING');
 assert.equal(dispatches,0);
 const malformed={rest:{actions:{
  listWorkflowRuns:async()=>({data:{total_count:1,workflow_runs:[]}}),
  createWorkflowDispatch:async()=>{dispatches++;}
 }}};
 const m=await wakeStaleWatchdog({github:malformed,context,summary:{production:7},now:NOW});
 assert.equal(m.decision,'WATCHDOG_WAKE_UNAVAILABLE');
 assert.equal(dispatches,0);
});
