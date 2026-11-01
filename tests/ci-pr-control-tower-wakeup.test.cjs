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