'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {admission,trustedEvent,run}=require('../scripts/ci-pr-slot-wakeup.cjs');
const NOW=Date.parse('2026-11-01T18:30:00Z');
const event={eventName:'workflow_run',repo:{owner:'andylitvinov-design',repo:'books'},payload:{
  workflow_run:{name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml',
    event:'pull_request',status:'completed',conclusion:'success',
    repository:{full_name:'andylitvinov-design/books'}}}};
test('only authenticated same-repo successful Core PR completion can wake slots',()=>{
  assert.equal(trustedEvent(event),true);
  assert.equal(trustedEvent({...event,payload:{workflow_run:{...event.payload.workflow_run,conclusion:'failure'}}}),false);
  assert.equal(trustedEvent({...event,eventName:'pull_request_target'}),false);
  assert.equal(trustedEvent({...event,payload:{workflow_run:{...event.payload.workflow_run,path:'untrusted.yml'}}}),false);
  assert.equal(trustedEvent({...event,payload:{workflow_run:{...event.payload.workflow_run,repository:{full_name:'external/repo'}}}}),false);
});
test('normal capacity and safe emergency rescue under global CI overload',()=>{
  assert.equal(admission(0,0,[],NOW),'DISPATCH');
  assert.equal(admission(11,5,[],NOW),'DISPATCH');
  assert.equal(admission(12,0,[],NOW),'DISPATCH_STALE_CI');
  assert.equal(admission(0,6,[],NOW),'DISPATCH_STALE_CI');
  assert.equal(admission(19,133,[{event:'schedule',status:'completed',created_at:new Date(NOW-15*60_000).toISOString()}],NOW),'CI_BUSY');
  assert.equal(admission(19,133,[{event:'schedule',status:'completed',created_at:new Date(NOW-31*60_000).toISOString()}],NOW),'DISPATCH_STALE_CI');
  assert.equal(admission(0,null,[],NOW),'CAPACITY_UNKNOWN');
  assert.equal(admission(19,133,null,NOW),'WATCHDOG_HISTORY_UNVERIFIED');
  assert.equal(admission(19,133,[{event:'workflow_dispatch',status:'queued',created_at:new Date(NOW-90*60_000).toISOString()}],NOW),'WATCHDOG_ALREADY_ACTIVE');
});
test('queued, running or just-completed watchdog prevents duplicate dispatch',()=>{
  assert.equal(admission(0,0,[{status:'queued',created_at:new Date(NOW-50000).toISOString()}],NOW),'WATCHDOG_ALREADY_ACTIVE');
  assert.equal(admission(0,0,[{status:'completed',created_at:new Date(NOW-100000).toISOString()}],NOW),'WATCHDOG_RECENT');
  assert.equal(admission(0,0,[{status:'completed',created_at:new Date(NOW-11*60_000).toISOString()}],NOW),'DISPATCH');
  assert.equal(admission(0,0,[{event:'workflow_run',status:'in_progress',created_at:new Date(NOW).toISOString()}],NOW),'DISPATCH');
  assert.equal(admission(0,0,[{event:'schedule',status:'in_progress',created_at:new Date(NOW).toISOString()}],NOW),'WATCHDOG_ALREADY_ACTIVE');
  assert.equal(admission(0,0,[{event:'workflow_dispatch',status:'completed',created_at:new Date(NOW-4*60_000).toISOString()}],NOW),'WATCHDOG_RECENT');
  assert.equal(admission(0,0,[{status:'completed'}],NOW),'WATCHDOG_HISTORY_UNVERIFIED');
});
test('trusted empty slot dispatches exactly once with real dry_run=false',async()=>{
  let calls=0;
  const github={graphql:async()=>({ci:{nodes:[{number:42}]},repair:{nodes:[]},conflict:{nodes:[]}}),rest:{actions:{
    listWorkflowRunsForRepo:async({status})=>({data:{total_count:status==='queued'?0:1}}),
    createWorkflowDispatch:async p=>{calls++;assert.equal(p.inputs.dry_run,'false');}
  }},request:async()=>({data:{workflow_runs:[]}})};
  const core={info:()=>{},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}};
  const r=await run({github,core,context:event,now:NOW});
  assert.equal(r.decision,'DISPATCH');assert.equal(r.dispatched,1);assert.equal(calls,1);
});
test('busy CI does not dispatch even on trusted Core completion',async()=>{
  let calls=0;
  const github={rest:{actions:{
    listWorkflowRunsForRepo:async({status})=>({data:{total_count:status==='queued'?31:15}}),
    createWorkflowDispatch:async()=>{calls++;}
  }},request:async()=>({data:{workflow_runs:[{
    event:'workflow_dispatch',status:'completed',
    created_at:new Date(NOW-15*60_000).toISOString()
  }]}})};
  const core={info:()=>{},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}};
  const r=await run({github,core,context:event,now:NOW});
  assert.equal(r.decision,'CI_BUSY');assert.equal(calls,0);
});

// A Core success wrapper is not a real watchdog reconciliation run.
test('slot wakeup inspects only real schedule and workflow_dispatch runs',async()=>{
  const events=[];let calls=0;
  const github={graphql:async()=>({ci:{nodes:[{number:42}]},repair:{nodes:[]},conflict:{nodes:[]}}),rest:{actions:{
    listWorkflowRunsForRepo:async()=>({data:{total_count:0}}),
    createWorkflowDispatch:async arg=>{calls++;assert.equal(arg.inputs.dry_run,'false')}
  }},request:async(_route,args)=>{events.push(args.event);return {data:{workflow_runs:[]}}}};
  const core={info:()=>{},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}};
  const result=await run({github,core,context:event,now:NOW});
  assert.deepEqual(events,['schedule','workflow_dispatch']);
  assert.equal(result.decision,'DISPATCH');assert.equal(calls,1);
});

// The high-load incident had 19 running and 133 queued Actions, while native
// schedule events were several hours old. One bounded event-driven rescue must
// still be permitted, without editing a PR or bypassing exact-HEAD admission.
test('stale Watchdog executes one real rescue dispatch despite a saturated CI queue',async()=>{
  let calls=0;
  const github={rest:{actions:{
    listWorkflowRunsForRepo:async({status})=>({data:{total_count:status==='queued'?133:19}}),
    createWorkflowDispatch:async p=>{
      calls++;
      assert.equal(p.workflow_id,'hh-pr-ten-minute-watchdog.yml');
      assert.equal(p.ref,'codex/bootstrap-books');
      assert.equal(p.inputs.dry_run,'false');
    }
  }},request:async(_route,args)=>({data:{workflow_runs:[{
    event:args.event,status:'completed',
    created_at:new Date(NOW-95*60_000).toISOString()
  }]}})};
  const core={info:()=>{},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}};
  const result=await run({github,core,context:event,now:NOW});
  assert.equal(result.decision,'DISPATCH_STALE_CI');
  assert.equal(result.dispatched,1);
  assert.equal(calls,1);
});

test('green Core without an actionable queue does not allocate a second Watchdog',async()=>{
 const {hasDurableBacklog}=require('../scripts/ci-pr-slot-wakeup.cjs');
 const none={ci:{nodes:[]},repair:{nodes:[]},conflict:{nodes:[]}};
 let searches=0,dispatches=0;
 const github={graphql:async q=>{
  searches++;assert.match(q,/hh:ci-needed/);assert.match(q,/hh:repair-needed/);
  return none;
 },rest:{actions:{
  listWorkflowRunsForRepo:async()=>({data:{total_count:0}}),
  createWorkflowDispatch:async()=>{dispatches++;}
 }},request:async()=>({data:{workflow_runs:[]}})};
 assert.equal(await hasDurableBacklog(github,'andylitvinov-design','books'),false);
 const core={info:()=>{},warning:()=>{},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}};
 const result=await run({github,core,context:event,now:NOW});
 assert.equal(result.decision,'NO_ACTIONABLE_BACKLOG');
 assert.equal(result.backlog,false);
 assert.equal(dispatches,0);assert.equal(searches,2);
});
test('incomplete queue evidence does not create a speculative success-triggered Watchdog',async()=>{
 let dispatches=0;
 const github={graphql:async()=>({ci:{nodes:[]}}),
  rest:{actions:{
   listWorkflowRunsForRepo:async()=>({data:{total_count:0}}),
   createWorkflowDispatch:async()=>{dispatches++;}
  }},request:async()=>({data:{workflow_runs:[]}})};
 const core={info:()=>{},warning:()=>{},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}};
 const result=await run({github,core,context:event,now:NOW});
 assert.equal(result.decision,'BACKLOG_UNVERIFIED');
 assert.equal(dispatches,0);
});
