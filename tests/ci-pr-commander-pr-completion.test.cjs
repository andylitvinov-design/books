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
 const github={rest:{pulls:{get:async()=>({data:pr})}}};
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
