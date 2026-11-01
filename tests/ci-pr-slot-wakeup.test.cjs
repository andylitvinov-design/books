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
test('slot admission is independently bounded by active and queued pools',()=>{
  assert.equal(admission(0,0,[],NOW),'DISPATCH');
  assert.equal(admission(11,5,[],NOW),'DISPATCH');
  assert.equal(admission(12,0,[],NOW),'CI_BUSY');
  assert.equal(admission(0,6,[],NOW),'CI_BUSY');
  assert.equal(admission(0,null,[],NOW),'CAPACITY_UNKNOWN');
});
test('queued, running or just-completed watchdog prevents duplicate dispatch',()=>{
  assert.equal(admission(0,0,[{status:'queued',created_at:new Date(NOW-50000).toISOString()}],NOW),'WATCHDOG_ALREADY_ACTIVE');
  assert.equal(admission(0,0,[{status:'completed',created_at:new Date(NOW-100000).toISOString()}],NOW),'WATCHDOG_RECENT');
  assert.equal(admission(0,0,[{status:'completed',created_at:new Date(NOW-200000).toISOString()}],NOW),'DISPATCH');
  assert.equal(admission(0,0,[{status:'completed'}],NOW),'WATCHDOG_HISTORY_UNVERIFIED');
});
test('trusted empty slot dispatches exactly once with real dry_run=false',async()=>{
  let calls=0;
  const github={rest:{actions:{
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
  }},request:async()=>({data:{workflow_runs:[]}})};
  const core={info:()=>{},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}};
  const r=await run({github,core,context:event,now:NOW});
  assert.equal(r.decision,'CI_BUSY');assert.equal(calls,0);
});
