'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readback,run,ENDPOINT}=require('../scripts/ci-pr-commander-pr-completion.cjs');
const REPO='andylitvinov-design/books',SHA='a'.repeat(40),MERGE='b'.repeat(40);
const base={number:4770,state:'open',draft:false,
 head:{sha:SHA,repo:{full_name:REPO}},
 base:{ref:'codex/public-book-library',repo:{full_name:REPO}},
 mergeable:true,mergeable_state:'blocked',labels:[]};
const context={repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/bootstrap-books',eventName:'schedule',runId:444};
function mock(task,pr=base){
 const calls=[],warn=[],info=[];
 const fetcher=async(url,req)=>{
  assert.equal(url,ENDPOINT);
  assert.ok(req.headers.Authorization.startsWith('Bearer '+'.'.repeat(120)));
  const payload=JSON.parse(req.body);calls.push(payload);
  if(payload.action==='next')return {status:200,text:async()=>JSON.stringify({
   schema:'HH_COMMANDER_PR_COMPLETION_V1',item:task})};
  if(payload.action==='arm_dispatch')return {status:200,text:async()=>JSON.stringify({
   schema:'HH_COMMANDER_PR_COMPLETION_V1',armed:true})};
  if(payload.action==='finish')return {status:200,text:async()=>JSON.stringify({
   schema:'HH_COMMANDER_PR_COMPLETION_V1',accepted:true,
   item:{prNumber:task.prNumber,status:payload.status,reasonCode:payload.reasonCode,
    mergeSha:payload.status==='MERGED'?MERGE:null}})};
  throw Error('UNKNOWN_ACTION');
 };
 const core={getIDToken:async()=>'.'.repeat(121),warning:s=>warn.push(s),info:s=>info.push(s)};
 const github={rest:{
  pulls:{get:async()=>({data:pr})},
  issues:{listComments:async({page})=>({data:page===1&&
   pr?.labels?.some(l=>l.name==='hh:repair-needed')?[{
    user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
    performed_via_github_app:{id:15368,slug:'github-actions'},
    body:['<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+SHA+' -->',
     'Failed jobs: core-lint-types-build'].join(String.fromCharCode(10))
   }]:[]})}
 }};
 return {fetcher,core,github,calls,warn,info};
}
const task={requestId:'123e4567-e89b-42d3-a456-426614174000',
 leaseToken:'123e4567-e89b-42d3-a456-426614174001',
 prNumber:4770,requestedHeadSha:SHA,dispatchEligibleOnce:true};
test('held and unverified PR never qualify for source repair or merge',()=>{
 assert.equal(readback({...base,draft:true},4770).status,'BLOCKED');
 assert.equal(readback({...base,labels:[{name:'hh:hold'}]},4770).status,'BLOCKED');
 assert.equal(readback({...base,mergeable:false,mergeable_state:'dirty'},4770).status,'BLOCKED');
 assert.equal(readback({...base,base:{...base.base,ref:'other'}},4770).reasonCode,'PR_IDENTITY_UNVERIFIED');
 assert.equal(readback(base,4770).status,'WATCHING');
});
test('signed owner PR with green or pending CI remains read-only, no extra dispatch',async()=>{
 const f=mock(task),calls=[];
 const result=await run({...f,context,dispatch:async()=>{calls.push('DISPATCH');throw Error('UNEXPECTED_DISPATCH')}});
 assert.equal(result.status,'WATCHING');
 assert.equal(result.reasonCode,'AWAIT_EXISTING_CORE_AND_AUTO_MERGE');
 assert.equal(result.liveVerified,false);
 assert.deepEqual(calls,[]);
 assert.equal(f.calls.filter(x=>x.action==='arm_dispatch').length,0);
 assert.equal(f.calls.filter(x=>x.action==='finish').length,1);
});
test('exact-head first eligible source task dispatches once, but never claims model or commit',async()=>{
 const p={...base,labels:[{name:'hh:repair-needed'}]};
 const f=mock(task,p);let attempts=0;
 const result=await run({...f,context,dispatch:async(_github,cmd)=>{
  attempts++;assert.equal(cmd.pr,4770);
  return {watching:true,dispatched:true,reason:'OWNER_DISPATCH_ACCEPTED_NOT_WORKER_STARTED'};
 }});
 assert.equal(result.status,'WATCHING');
 assert.equal(result.dispatchAccepted,true);assert.equal(result.sourceWriteVerified,false);
 assert.equal(attempts,1);
 assert.equal(f.calls.filter(x=>x.action==='arm_dispatch').length,1);
 const later=mock({...task,dispatchEligibleOnce:false},p);
 const second=await run({...later,context,dispatch:async()=>{throw Error('DUPLICATE')}});
 assert.equal(second.dispatchAccepted,false);
});
test('unsigned source hint does not consume one-shot owner repair dispatch',async()=>{
 const pr={...base,labels:[{name:'hh:repair-needed'}]};
 const fx=mock(task,pr);
 fx.github.rest.issues.listComments=async()=>({data:[]});
 let calls=0;
 const out=await run({...fx,context,dispatch:async()=>{calls++;return {dispatched:true};}});
 assert.equal(out.status,'WATCHING');
 assert.equal(out.reasonCode,'SIGNED_FAILED_CORE_PROOF_MISSING');
 assert.equal(out.dispatchAccepted,false);
 assert.equal(calls,0);
 assert.equal(fx.calls.filter(x=>x.action==='arm_dispatch').length,0);
 assert.equal(fx.calls.filter(x=>x.action==='finish').length,1);
});
test('GitHub history outage retains owner grant for the next Watchdog sweep',async()=>{
 const pr={...base,labels:[{name:'hh:repair-needed'}]};
 const fx=mock(task,pr);
 fx.github.rest.issues.listComments=async()=>{throw Error('GITHUB_UNAVAILABLE');};
 const out=await run({...fx,context,dispatch:async()=>{throw Error('UNSAFE_DISPATCH');}});
 assert.equal(out.status,'WATCHING');
 assert.equal(out.reasonCode,'SIGNED_SOURCE_PROOF_UNAVAILABLE');
 assert.equal(fx.calls.filter(x=>x.action==='arm_dispatch').length,0);
});
test('signed private OIDC owner intent is carried only after atomic arm, without PAT redispatch',async()=>{
 const p={...base,labels:[{name:'hh:repair-needed'}]};
 const fx=mock(task,p);let invoked=0;
 const result=await run({...fx,context,dispatch:async(_github,cmd,options)=>{
  invoked++;
  assert.equal(cmd.pr,task.prNumber);
  assert.deepEqual(options.ownerProof,{
   source:'OIDC_SIGNED_QUEUE',prNumber:task.prNumber,
   expectedSha:task.requestedHeadSha,requestId:task.requestId,
   leaseToken:task.leaseToken});
  assert.equal(fx.calls.filter(x=>x.action==='arm_dispatch').length,1,
   'the signed intent must be consumed before dispatching');
  return {watching:true,dispatched:true,reason:'OWNER_DIRECT_QUEUE_DISPATCH_ACCEPTED'};
 }});
 assert.equal(result.status,'WATCHING');
 assert.equal(result.dispatchAccepted,true);
 assert.equal(result.sourceWriteVerified,false);
 assert.equal(invoked,1);
});
test('verified ghost queue capacity delay is WATCHING, never a false terminal fix or merge',async()=>{
 const p={...base,labels:[{name:'hh:repair-needed'}]};
 const fx=mock(task,p);
 const result=await run({...fx,context,dispatch:async()=>({
  watching:true,dispatched:false,reason:'OWNER_REPAIR_DIRECT_GHOST_WORKER_BUSY'})});
 assert.equal(result.status,'WATCHING');
 assert.equal(result.reasonCode,'OWNER_REPAIR_DIRECT_GHOST_WORKER_BUSY');
 assert.equal(result.dispatchAccepted,false);
 assert.equal(result.liveVerified,false);
 assert.equal(fx.calls.find(x=>x.action==='finish').status,'WATCHING');
});
test('saturated global queue preserves private owner PR intent as WATCHING rather than consuming false failure',async()=>{
 const p={...base,labels:[{name:'hh:repair-needed'}]};
 for(const code of ['OWNER_REPAIR_DIRECT_CAPACITY_UNVERIFIED',
  'OWNER_REPAIR_DIRECT_CORE_PRIORITY_PENDING']){
  const fx=mock(task,p);
  const outcome=await run({...fx,context,dispatch:async()=>({
   watching:true,dispatched:false,reason:code})});
  assert.equal(outcome.status,'WATCHING',code);
  assert.equal(outcome.reasonCode,code);
  assert.equal(outcome.dispatchAccepted,false);
  assert.equal(outcome.sourceWriteVerified,false);
  assert.equal(fx.calls.find(x=>x.action==='finish').status,'WATCHING');
 }
 const denied=mock(task,p);
 const error=await run({...denied,context,dispatch:async()=>({
  dispatched:false,reason:'SOURCE_SCOPE_UNSAFE_FOR_FREE_AI'})});
 assert.equal(error.status,'BLOCKED','no unsafe source is implicitly admitted');
 assert.equal(error.dispatchAccepted,false);
});
test('confirmed merge only after GitHub readback; never reports LIVE from merge',async()=>{
 const p={...base,state:'closed',merged:true,merged_at:'2026-11-16T22:00:00Z',
  merge_commit_sha:MERGE};
 const f=mock(task,p),x=await run({...f,context});
 assert.equal(x.status,'MERGED');assert.equal(x.merged,true);assert.equal(x.liveVerified,false);
 assert.equal(x.mergeSha,MERGE);
 assert.equal(f.calls.some(q=>q.action==='finish'&&q.status==='MERGED'),true);
 const bad=readback({...p,merge_commit_sha:null},4770);
 assert.equal(bad.status,'CLOSED_UNMERGED');
});
test('wrong trusted GitHub context never reaches private queue',async()=>{
 const f=mock(task);
 const x=await run({...f,context:{...context,ref:'refs/heads/feature'}});
 assert.equal(x.status,'SKIPPED_UNTRUSTED');
 assert.equal(f.calls.length,0);
});

test('owner PR queue executes before heavy inventory in the same trusted Watchdog runner',()=>{
 const {readFileSync}=require('node:fs');
 const {resolve}=require('node:path');
 const src=readFileSync(resolve(__dirname,'../.github/workflows/hh-pr-ten-minute-watchdog.yml'),'utf8');
 const checkout=src.indexOf('Read trusted watchdog from default branch');
 const owner=src.indexOf('Owner PR-number completion via private signed queue');
 const inventory=src.indexOf('Reconcile complete PR inventory;');
 assert.ok(checkout>=0&&owner>checkout&&inventory>owner,
  'Owner PR commands must not wait for heavy all-PR Watchdog inventory');
 assert.match(src,/id-token: write/);
 assert.match(src,/ci-pr-commander-pr-completion\.cjs/);
 const worker=readFileSync(resolve(__dirname,'../scripts/ci-pr-commander-pr-completion.cjs'),'utf8');
 assert.match(worker,/core\.getIDToken\('hh-commander-pr'\)/);
});

test('unknown remote dispatch acknowledgment cannot be repeated after atomic arm',async()=>{
 const source={...base,labels:[{name:'hh:repair-needed'}]};
 const f=mock(task,source);let invoked=0;
 const original=f.fetcher;
 f.fetcher=async(url,req)=>{
  const action=JSON.parse(req.body).action;
  if(action==='arm_dispatch')return {status:200,text:async()=>JSON.stringify({
    schema:'HH_COMMANDER_PR_COMPLETION_V1',armed:false})};
  return original(url,req);
 };
 const out=await run({...f,context,dispatch:async()=>{invoked++;return {dispatched:true}}});
 assert.equal(invoked,0);
 assert.equal(out.status,'WATCHING');
 assert.equal(out.reasonCode,'PR_REPAIR_DISPATCH_ALREADY_RESERVED');
 assert.equal(out.dispatchAccepted,false);
});

test('owner PR Watchdog checks out only necessary trusted control directories before queue claim',()=>{
 const fs=require('node:fs');
 const workflow=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const begin=workflow.indexOf('- name: Read trusted watchdog from default branch');
 const owner=workflow.indexOf('- name: Owner PR-number completion via private signed queue');
 const scan=workflow.indexOf('- name: Reconcile complete PR inventory');
 assert.ok(begin>0&&begin<owner&&owner<scan,'owner queue must precede heavy full inventory');
 const checkout=workflow.slice(begin,owner);
 assert.match(checkout,/filter:\s*blob:none/);
 assert.match(checkout,/sparse-checkout:\s*\|[\s\S]*scripts[\s\S]*\.github/);
 assert.match(checkout,/ops\/pr-monitor/);
 assert.doesNotMatch(checkout,/persist-credentials:\s*true/);
});

test('wrong-base PR produces terminal BLOCKED receipt, not a stranded owner lease',async()=>{
 const wrong={...base,base:{...base.base,ref:'codex/bootstrap-books'}};
 const f=mock(task,wrong);
 let dispatched=0;
 const result=await run({...f,context,dispatch:async()=>{dispatched++;throw Error('SHOULD_NOT_DISPATCH')}});
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.reasonCode,'PR_IDENTITY_UNVERIFIED');
 assert.equal(dispatched,0);
 const finish=f.calls.filter(x=>x.action==='finish');
 assert.equal(finish.length,1);
 assert.equal(finish[0].status,'BLOCKED');
 assert.equal(finish[0].headSha,SHA);
});
test('unknown foreign PR identity retains original owner HEAD and always finishes BLOCKED',async()=>{
 const f=mock(task,null);
 const result=await run({...f,context});
 assert.equal(result.status,'BLOCKED');
 const finish=f.calls.find(x=>x.action==='finish');
 assert.equal(finish.status,'BLOCKED');
 assert.equal(finish.headSha,SHA);
});


test('numeric dispatch HTTP denials survive trusted Worker finish without UNKNOWN',async()=>{
 const p={...base,labels:[{name:'hh:repair-needed'}]};
 for(const reason of ['OWNER_REPAIR_DISPATCH_HTTP_403','OWNER_REPAIR_DISPATCH_HTTP_422']){
  const f=mock(task,p);
  const result=await run({...f,context,dispatch:async()=>({dispatched:false,reason})});
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reasonCode,reason);
  assert.equal(result.dispatchAccepted,false);
  assert.equal(f.calls.filter(x=>x.action==='finish').length,1);
  assert.equal(f.calls.find(x=>x.action==='finish').reasonCode,reason);
 }
});

test('fresh signed owner PR number can requeue a conclusive free-model truncation only once',async()=>{
 const manual={...base,user:{login:'andylitvinov-design'},labels:[{name:'hh:repair-manual'}]};
 const resultRecord={
  schema:'HH_PR_TASK_V1',lane:'repair',pr_number:task.prNumber,
  head_sha:SHA,task_key:'1'.repeat(32),state:'MANUAL',source_published:false,new_sha:null,
  detail_code:'FREE_AI_OPENROUTER_PATCH_RESPONSE_TRUNCATED',
  ai_execution:{model_response_confirmed:true,patch_received:false,source_published_sha:null},
  model_run:{model_call_started_at:'2026-11-16T00:05:00Z',
   response_shape:{finish_reason:'length'},patch_present:false}
 };
 const comment={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  body:'<!-- HH_PR_TASK_V1 -->\n'+String.fromCharCode(96).repeat(3)+'json\n'+
   JSON.stringify(resultRecord)+'\n'+String.fromCharCode(96).repeat(3)};
 const fx=mock(task,manual);
 fx.github.rest.issues={listComments:async()=>({data:[comment]})};
 let calls=0;
 const outcome=await run({...fx,context,dispatch:async(_g,cmd,options)=>{
  calls++;
  assert.equal(cmd.pr,task.prNumber);
  assert.deepEqual(options.ownerProof,{
   source:'OIDC_SIGNED_QUEUE',prNumber:task.prNumber,
   expectedSha:SHA,requestId:task.requestId,leaseToken:task.leaseToken
  });
  return {dispatched:true,reason:'OWNER_DIRECT_MACHINE_RETRY_DISPATCH_ACCEPTED'};
 }});
 assert.equal(outcome.status,'WATCHING');
 assert.equal(outcome.reasonCode,'OWNER_DISPATCH_ACCEPTED_NOT_MODEL_OR_COMMIT');
 assert.equal(outcome.sourceWriteVerified,false);
 assert.equal(outcome.dispatchAccepted,true);
 assert.equal(calls,1);
 assert.equal(fx.calls.filter(x=>x.action==='arm_dispatch').length,1);
 const second=mock({...task,dispatchEligibleOnce:false},manual);
 second.github.rest.issues=fx.github.rest.issues;
 const repeat=await run({...second,context,dispatch:async()=>{throw Error('REPEAT_UNSAFE');}});
 assert.equal(repeat.dispatchAccepted,false);
 assert.equal(second.calls.filter(x=>x.action==='arm_dispatch').length,0);
});
test('manual owner/security hold still blocks even with former machine failure receipt',async()=>{
 const held={...base,user:{login:'andylitvinov-design'},
  labels:[{name:'hh:repair-manual'},{name:'hh:hold'}]};
 const fx=mock(task,held);
 fx.github.rest.issues={listComments:async()=>({data:[]})};
 const outcome=await run({...fx,context,dispatch:async()=>{throw Error('BYPASS')}}); 
 assert.equal(outcome.status,'BLOCKED');
 assert.equal(outcome.reasonCode,'EXISTING_HOLD_NO_OVERRIDE');
 assert.equal(fx.calls.filter(x=>x.action==='arm_dispatch').length,0);
});

test('one existing trusted worker-completion run also claims private owner PR',async()=>{
 const worker={...context,eventName:'workflow_run',payload:{workflow_run:{
  status:'completed',conclusion:'success',name:'HH PR source Repair Worker',
  event:'workflow_dispatch',head_branch:'codex/bootstrap-books',
  repository:{full_name:REPO},head_repository:{full_name:REPO}
 }}};
 const {trustedWorkerWake}=require('../scripts/ci-pr-commander-pr-completion.cjs');
 assert.equal(trustedWorkerWake(worker),true);
 const f=mock(task);
 const result=await run({...f,context:worker,dispatch:async()=>{throw Error('UNEXPECTED_DISPATCH')}});
 assert.equal(result.status,'WATCHING');
 assert.equal(f.calls.filter(c=>c.action==='next').length,1);
 assert.equal(f.calls.filter(c=>c.action==='finish').length,1);
 assert.equal(f.calls.filter(c=>c.action==='arm_dispatch').length,0);
 const workflow=require('node:fs').readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const body=workflow.slice(workflow.indexOf('  direct-handoff:'));
 assert.match(body,/id-token: write/);
 assert.match(body,/Owner PR completion wake on verified finished worker/);
 assert.ok(body.indexOf('Owner PR completion wake')<body.indexOf('Start workers from Watchdog'));
});
test('untrusted worker completions never claim signed owner queue',async()=>{
 const {trustedWorkerWake}=require('../scripts/ci-pr-commander-pr-completion.cjs');
 const e={...context,eventName:'workflow_run',payload:{workflow_run:{
  status:'completed',conclusion:'success',name:'HH PR source Repair Worker',
  event:'workflow_dispatch',head_branch:'codex/bootstrap-books',
  repository:{full_name:REPO},head_repository:{full_name:REPO}
 }}};
 const variants=[
  {...e,payload:{workflow_run:{...e.payload.workflow_run,repository:{full_name:'someone/other'}}}},
  {...e,payload:{workflow_run:{...e.payload.workflow_run,head_branch:'untrusted'}}},
  {...e,payload:{workflow_run:{...e.payload.workflow_run,name:'Holistic House IA v2 checks'}}},
  {...e,payload:{workflow_run:{...e.payload.workflow_run,status:'in_progress'}}},
  {...e,payload:{workflow_run:{...e.payload.workflow_run,event:'pull_request'}}},
  {...e,payload:{workflow_run:{...e.payload.workflow_run,conclusion:'cancelled'}}},
  {...e,ref:'refs/heads/feature'},
 ];
 for(const item of variants){
  assert.equal(trustedWorkerWake(item),false);
  const f=mock(task);
  const result=await run({...f,context:item});
  assert.equal(result.status,'SKIPPED_UNTRUSTED');
  assert.equal(f.calls.length,0);
 }
});


test('trusted protected push claims one private owner PR on existing Watchdog runner',async()=>{
 const {trustedControlPush}=require('../scripts/ci-pr-commander-pr-completion.cjs');
 const control={...context,eventName:'push',sha:SHA,
  payload:{repository:{full_name:REPO},after:SHA,deleted:false}};
 assert.equal(trustedControlPush(control),true);
 const f=mock(task);
 const result=await run({...f,context:control,dispatch:async()=>{throw Error('UNEXPECTED_DISPATCH')}});
 assert.equal(result.status,'WATCHING');
 assert.equal(f.calls.filter(c=>c.action==='next').length,1);
 assert.equal(f.calls.filter(c=>c.action==='arm_dispatch').length,0);
 const workflow=require('node:fs').readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const section=workflow.slice(workflow.indexOf('- name: Owner PR-number completion via private signed queue'),
  workflow.indexOf('- name: HH PM inbox using verified Github free secret'));
 assert.match(section,/github.event_name == 'push'/);
 const denied=[
  {...control,sha:'b'.repeat(40)},
  {...control,payload:{...control.payload,after:'b'.repeat(40)}},
  {...control,payload:{...control.payload,deleted:true}},
  {...control,ref:'refs/heads/untrusted'},
  {...control,payload:{...control.payload,repository:{full_name:'stranger/other'}}}
 ];
 for(const bad of denied){
  assert.equal(trustedControlPush(bad),false);
  const fx=mock(task);
  const res=await run({...fx,context:bad});
  assert.equal(res.status,'SKIPPED_UNTRUSTED');
  assert.equal(fx.calls.length,0);
 }
});

test('one signed runner drains several distinct owner requests, with hard cap',async()=>{
 const {drain}=require('../scripts/ci-pr-commander-pr-completion.cjs');
 const items=[4770,4771,4772].map((n,i)=>({...task,prNumber:n,
  requestId:'123e4567-e89b-42d3-a456-42661417400'+i}));
 const actions=[];let current=null;
 const response=value=>({status:200,text:async()=>JSON.stringify({schema:'HH_COMMANDER_PR_COMPLETION_V1',...value})});
 const fetcher=async(url,request)=>{
  assert.equal(url,ENDPOINT);
  const value=JSON.parse(request.body);actions.push(value.action);
  if(value.action==='next'){
   current=items.shift()||null;
   return response({item:current});
  }
  if(value.action==='finish')return response({accepted:true,item:{
   prNumber:current.prNumber,status:value.status,reasonCode:value.reasonCode}});
  throw Error('UNEXPECTED_OWNER_QUEUE_ACTION_'+value.action);
 };
 const core={getIDToken:async()=>'.'.repeat(121),info(){},warning(){}};
 const github={rest:{pulls:{get:async({pull_number})=>({
  data:{...base,number:pull_number}})}}};
 const report=await drain({github,core,context,fetcher,dispatch:async()=>{throw Error('NO_REPAIR')}});
 assert.equal(report.processed,3);
 assert.deepEqual(report.items.map(x=>x.prNumber),[4770,4771,4772,null]);
 assert.equal(actions.filter(x=>x==='next').length,4);
 assert.equal(actions.filter(x=>x==='finish').length,3);
 await assert.rejects(()=>drain({github,core,context,fetcher},5),/DRAIN_LIMIT/);
});
test('native Core event remains the only Core subscriber; owner queue shares worker wakes',()=>{
 const fs=require('node:fs');
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const native=fs.readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
 assert.equal(watchdog.includes("      - 'HH PR core release gate'"),false);
 assert.equal(native.includes("      - 'HH PR core release gate'"),true);
 assert.equal(watchdog.split("const {drain}=require(process.env.GITHUB_WORKSPACE").length-1,2);
 assert.equal(watchdog.split("const outcome=await drain(").length-1,2);
 const direct=watchdog.split('  direct-handoff:')[1]?.split('  reactivate-schedules:')[0];
 assert.match(direct,/filter: blob:none/);
 assert.match(direct,/sparse-checkout: \|[\s\S]*scripts[\s\S]*\.github/);
});

test('only proven pre-dispatch capacity may re-arm; unknown remote results never repeat',async()=>{
 const p={...base,labels:[{name:'hh:repair-needed'}]};
 for(const reason of ['OWNER_REPAIR_DIRECT_WORKER_BUSY',
  'OWNER_REPAIR_DIRECT_CORE_PRIORITY_PENDING',
  'OWNER_REPAIR_DIRECT_CAPACITY_UNVERIFIED']){
  const f=mock(task,p);
  const outcome=await run({...f,context,dispatch:async()=>({dispatched:false,reason})});
  assert.equal(outcome.status,'WATCHING');
  assert.equal(f.calls.find(x=>x.action==='finish').noDispatchVerified,true,reason);
 }
 for(const reason of ['OWNER_REPAIR_DIRECT_CLAIMED_AWAITING_OUTCOME',
  'OWNER_REPAIR_DIRECT_RESERVED_REQUIRES_REVIEW',
  'OWNER_REPAIR_DISPATCH_AMBIGUOUS_NO_RETRY']){
  const f=mock(task,p);
  await run({...f,context,dispatch:async()=>({dispatched:false,reason})});
  assert.equal(f.calls.find(x=>x.action==='finish').noDispatchVerified,false,reason);
 }
 const ack=mock(task,p);
 await run({...ack,context,dispatch:async()=>({dispatched:true,reason:'OWNER_DIRECT_QUEUE_DISPATCH_ACCEPTED'})});
 assert.equal(ack.calls.find(x=>x.action==='finish').noDispatchVerified,false);
});

// The private owner queue can revisit historical BLOCKED rows, but they must
// never turn into a fresh dispatch authorization merely because GitHub moved.
test('historical control-branch BLOCKED request reconciles only after verified terminal GitHub readback',async()=>{
 const control={...base,base:{...base.base,ref:'codex/bootstrap-books'},
  state:'closed',merged:true,merged_at:'2026-11-17T20:00:00Z',merge_commit_sha:MERGE};
 assert.equal(readback(control,4770).status,'BLOCKED');
 assert.equal(readback(control,4770,{terminalReadbackOnly:true}).status,'MERGED');
 assert.equal(readback({...control,state:'open'},4770,{terminalReadbackOnly:true}).status,'BLOCKED');
 const signed={...task,blockedRecheckOnly:true,previousReasonCode:'PR_IDENTITY_UNVERIFIED',
  dispatchEligibleOnce:false};
 const f=mock(signed,control);let dispatched=0;
 const result=await run({...f,context,dispatch:async()=>{dispatched++;}});
 assert.equal(result.status,'MERGED');assert.equal(dispatched,0);
 assert.equal(f.calls.filter(c=>c.action==='arm_dispatch').length,0);
 assert.equal(f.calls.find(c=>c.action==='finish').blockedRecheckOnly,true);
});
test('historical BLOCKED owner task cannot dispatch on a newly repair-labelled PR',async()=>{
 const signed={...task,blockedRecheckOnly:true,previousReasonCode:'OWNER_REPAIR_DISPATCH_HTTP_403',
  dispatchEligibleOnce:false};
 const f=mock(signed,{...base,labels:[{name:'hh:repair-needed'}]});
 const result=await run({...f,context,dispatch:async()=>{throw Error('UNSAFE_REPAIR');}});
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.reasonCode,'OWNER_REPAIR_DISPATCH_HTTP_403');
 assert.equal(f.calls.some(c=>c.action==='arm_dispatch'),false);
});
test('historical BLOCKED task remains blocked on GitHub read failure',async()=>{
 const signed={...task,blockedRecheckOnly:true,previousReasonCode:'PR_IDENTITY_UNVERIFIED',
  dispatchEligibleOnce:false};
 const f=mock(signed);
 f.github.rest.pulls.get=async()=>{throw Error('GitHub unavailable')};
 const result=await run({...f,context});
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.reasonCode,'PR_IDENTITY_UNVERIFIED');
 assert.equal(f.calls.some(c=>c.action==='arm_dispatch'),false);
});

test('protected Commander gateway source updates wake the existing Watchdog without a new cron',()=>{
 const {readFileSync}=require('node:fs');
 const workflow=readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const push=workflow.split('  push:\n')[1]?.split('  workflow_dispatch:\n')[0];
 assert.ok(push&&push.includes("      - 'scripts/ci-pr-commander-pr-completion.cjs'"));
 assert.match(workflow,/branches: \['codex\/bootstrap-books'\]/);
 assert.match(workflow,/github\.event_name == 'push'/);
 assert.match(workflow,/id-token: write/);
 assert.equal((workflow.match(/cron:/g)||[]).length,1,'do not add a second schedule');
});


test('a resolved historical DIRTY conflict resumes READ-ONLY WATCHING after two exact GitHub reads',async()=>{
 const stale='c'.repeat(40),liveSha='d'.repeat(40),baseSha='e'.repeat(40);
 const taskOld={...task,requestedHeadSha:stale,dispatchEligibleOnce:false,
  blockedRecheckOnly:true,previousReasonCode:'MERGE_CONFLICT_REQUIRES_SEMANTIC_REPAIR'};
 const clean={...base,head:{...base.head,sha:liveSha,ref:'fix/pr'},base:{...base.base,sha:baseSha},
  mergeable:true,mergeable_state:'clean',labels:[{name:'hh:repair-needed'}]};
 const f=mock(taskOld,clean);let calls=0;
 f.github.rest.pulls.get=async()=>{calls++;return {data:clean}};
 const r=await run({...f,context,dispatch:async()=>{throw Error('UNSAFE_SOURCE_WRITER')}}); 
 assert.equal(calls,2);
 assert.equal(r.status,'WATCHING');
 assert.equal(r.reasonCode,'MERGE_CONFLICT_RESOLVED_WATCH_ONLY');
 assert.equal(r.dispatchAccepted,false);
 assert.equal(f.calls.some(x=>x.action==='arm_dispatch'),false);
 const receipt=f.calls.find(x=>x.action==='finish');
 assert.equal(receipt.headSha,liveSha);
 assert.equal(receipt.blockedRecheckOnly,true);
});
test('historically recovered conflict stays WATCHING on same HEAD without regaining source rights',async()=>{
 const sha='f'.repeat(40),baseSha='e'.repeat(40);
 const old={...task,requestedHeadSha:sha,blockedRecheckOnly:true,
  dispatchEligibleOnce:false,previousReasonCode:'MERGE_CONFLICT_RESOLVED_WATCH_ONLY'};
 const p={...base,head:{...base.head,ref:'fix/pr',sha},base:{...base.base,sha:baseSha},
  mergeable:true,mergeable_state:'behind',labels:[]};
 const m=mock(old,p);let calls=0;
 m.github.rest.pulls.get=async()=>{calls++;return {data:p}};
 const out=await run({...m,context,dispatch:async()=>{throw Error('SHOULD_NOT_DISPATCH')}});
 assert.equal(out.status,'WATCHING');
 assert.equal(calls,2);
 assert.equal(m.calls.filter(x=>x.action==='arm_dispatch').length,0);
});
test('only verified conflict history can reopen; stale second read, security hold and other blockers fail closed',async()=>{
 const sha='f'.repeat(40),old='d'.repeat(40);
 const taskOld={...task,requestedHeadSha:old,blockedRecheckOnly:true,
  dispatchEligibleOnce:false,previousReasonCode:'MERGE_CONFLICT_REQUIRES_SEMANTIC_REPAIR'};
 const clean={...base,head:{...base.head,ref:'fix/pr',sha},base:{...base.base,sha:'e'.repeat(40)},
  mergeable:true,mergeable_state:'clean',labels:[]};
 const cases=[
  {first:clean,second:{...clean,head:{...clean.head,sha:'b'.repeat(40)}},reason:'HEAD_MOVED'},
  {first:clean,second:{...clean,base:{...clean.base,sha:'b'.repeat(40)}},reason:'BASE_MOVED'},
  {first:clean,second:{...clean,labels:[{name:'hh:hold'}]},reason:'HOLD_ADDED'},
  {first:{...clean,mergeable:false,mergeable_state:'dirty'},second:clean,reason:'STILL_DIRTY'},
  {first:clean,second:null,reason:'READ_FAILED'}
 ];
 for(const c of cases){
  const m=mock(taskOld,c.first);let calls=0;
  m.github.rest.pulls.get=async()=>{calls++;if(calls===2&&!c.second)throw Error('GH_UNAVAILABLE');
   return {data:calls===1?c.first:c.second};};
  const out=await run({...m,context,dispatch:async()=>{throw Error('UNSAFE_WRITE')}});
  assert.equal(out.status,'BLOCKED',c.reason);
  assert.equal(m.calls.filter(x=>x.action==='arm_dispatch').length,0,c.reason);
  assert.equal(m.calls.find(x=>x.action==='finish').headSha,old,c.reason);
 }
 const unrelated=mock({...taskOld,previousReasonCode:'OWNER_REPAIR_DISPATCH_HTTP_403'},clean);
 let read=0;unrelated.github.rest.pulls.get=async()=>{read++;return {data:clean}};
 const blocked=await run({...unrelated,context,dispatch:async()=>{throw Error('UNSAFE_WRITE')}});
 assert.equal(blocked.status,'BLOCKED');assert.equal(read,1);
});
