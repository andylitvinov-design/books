'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {verifyLiveEvidence,sweep}=require('../scripts/ci-pr-live-acceptance.cjs');
const REPO='andylitvinov-design/books',merge='a'.repeat(40),served='b'.repeat(40);
const id='dpl_12345678901234';
const pr={number:4916,state:'closed',merged:true,merged_at:'2026-11-17T20:18:00Z',
 merge_commit_sha:merge,changed_files:1,user:{login:'andylitvinov-design'},
 base:{ref:'codex/public-book-library',repo:{full_name:REPO}},
 head:{repo:{full_name:REPO}}};
const identity={schema:'HH_PUBLIC_RELEASE_EVIDENCE_V1',available:true,
 sha:served,deployment_id:id,project_id:'prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b',
 environment:'production',branch:'codex/public-book-library',repo:REPO};
const statuses={total_count:1,statuses:[{context:'Vercel',state:'success',
 target_url:'https://vercel.com/super10/codex-public-book-library/12345678901234'}]};
const comparison={status:'ahead',base_commit:{sha:merge},
 merge_base_commit:{sha:merge},behind_by:0};
const site={status:200,host:'holistichouse.vercel.app',contentType:'text/html',html:true};
const files=[{filename:'components/safe.jsx'}];
const verified=()=>verifyLiveEvidence({pr,identity,combined:statuses,comparison,site,files});
test('all independent GitHub/Vercel/site/ancestry evidence confirms production',()=>{
 assert.equal(verified().verified,true);
});
test('stale alias, incorrect ancestry or incomplete scope cannot claim LIVE',()=>{
 const inputs={pr,identity,combined:statuses,comparison,site,files};
 const changes=[
  {identity:{...identity,available:false}},
  {identity:{...identity,deployment_id:'dpl_different123'}},
  {site:{...site,host:'elsewhere.example'}},
  {combined:{...statuses,statuses:[{context:'Vercel',state:'pending',target_url:statuses.statuses[0].target_url}]}},
  {comparison:{...comparison,behind_by:1}},
  {pr:{...pr,merged:false}},
  {files:[{filename:'supabase/functions/private/index.ts'}]}
 ];
 for(const patch of changes){
  const result=verifyLiveEvidence({...inputs,...patch});
  assert.equal(result.verified,false,JSON.stringify(patch));
 }
});
test('sweep is read-only for non-scheduled events and never opens another CI wave',async()=>{
 assert.equal((await sweep({context:{repo:{owner:'andylitvinov-design',repo:'books'},
  ref:'refs/heads/codex/bootstrap-books',eventName:'push'}})).status,'SKIPPED_NOT_SCHEDULE');
 const workflow=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 assert.match(workflow,/ci-pr-live-acceptance\.cjs/);
 assert.match(workflow,/HH_PR_PRODUCTION_LIVE_SWEEP/);
});

test('one unverified LIVE does not starve another verified merged production PR',async()=>{
 const mergeA='c'.repeat(40),mergeB='d'.repeat(40),now=Date.parse('2026-11-18T01:20:00Z');
 const shape=n=>({...pr,number:n,merge_commit_sha:n===5001?mergeA:mergeB,
  merged_at:'2026-11-18T00:45:00Z'});
 const events=[];
 const github={rest:{
  pulls:{list:async()=>({data:[shape(5001),shape(5002)]}),
   get:async({pull_number})=>({data:shape(pull_number)})},
  issues:{listComments:async()=>({data:[]}),
   createComment:async x=>{events.push(x);return {data:{id:1}}}}
 }};
 const context={repo:{owner:'andylitvinov-design',repo:'books'},
  ref:'refs/heads/codex/bootstrap-books',eventName:'schedule'};
 const proofImpl=async({pr})=>pr.number===5001?{
  verified:false,reason:'NON_SITE_SCOPE'
 }:{verified:true,mergeSha:mergeB,productionSha:'e'.repeat(40),deploymentId:'dpl_12345678901234'};
 const out=await sweep({github,context,now,proofImpl});
 assert.equal(out.status,'LIVE_VERIFIED_NOTICE_SENT');
 assert.equal(events.length,1);
 assert.equal(events[0].issue_number,5002);
 assert.equal(out.proofAttempts,2);
});
test('bounded sweep fails closed and rotates even with always unreadable proof',async()=>{
 const now=Date.parse('2026-11-18T01:00:00Z');
 const p=Array.from({length:25},(_,i)=>({...pr,number:5100+i,merge_commit_sha:('a'.repeat(39)+(i%10)),
  merged_at:'2026-11-18T00:45:00Z'}));
 let reads=0,requests=0;
 const github={rest:{
  pulls:{list:async()=>({data:p}),get:async({pull_number})=>{reads++;return {data:p.find(x=>x.number===pull_number)}}},
  issues:{listComments:async()=>({data:[]}),createComment:async()=>{throw Error('DO_NOT_PUBLISH')}}
 }};
 const context={repo:{owner:'andylitvinov-design',repo:'books'},
  ref:'refs/heads/codex/bootstrap-books',eventName:'schedule'};
 const proof=async()=>{requests++;return {verified:false,reason:'NO_CANONICAL_STATUS'}};
 const a=await sweep({github,context,now,proofImpl:proof});
 const b=await sweep({github,context,now:now+1200000,proofImpl:proof});
 assert.equal(a.status,'LIVE_PENDING_RECHECK');
 assert.equal(a.proofAttempts,3);
 assert.equal(b.proofAttempts,3);
 assert.equal(requests,6);
 assert.ok(reads<=20,'max 10 PR reads each sweep');
 assert.notEqual(a.unresolved[0]?.pr,b.unresolved[0]?.pr,'fair rotation across ticks');
});

test('trusted non-dry workflow_dispatch can prove LIVE after native cron outage',async()=>{
 const comments=[];
 const context={repo:{owner:'andylitvinov-design',repo:'books'},
  ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_dispatch',
  payload:{inputs:{dry_run:'false'}}};
 const github={rest:{pulls:{list:async()=>({data:[pr]}),get:async()=>({data:pr})},
  issues:{listComments:async()=>({data:[]}),createComment:async row=>{comments.push(row);return {data:{id:1}}}}}};
 const outcome=await sweep({github,context,now:Date.parse('2026-11-18T03:00:00Z'),fetcher:()=>{},
  proofImpl:async()=>({verified:true,mergeSha:merge,productionSha:served,deploymentId:id})});
 assert.equal(outcome.status,'LIVE_VERIFIED_NOTICE_SENT');
 assert.equal(comments.length,1);
 assert.match(comments[0].body,/Production LIVE independently verified/);
});
test('dry-run, targeted wake, owner PR and foreign dispatch cannot claim LIVE',async()=>{
 const base={repo:{owner:'andylitvinov-design',repo:'books'},
  ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_dispatch'};
 let reads=0;
 const gh={rest:{pulls:{list:async()=>{reads++;return {data:[]}}}}};
 for(const inputs of [
  {dry_run:'true'}, {dry_run:'false',direct_dispatch:'true'},
  {dry_run:'false',completion_wake:'true'},
  {dry_run:'false',pm_pr_number:'4925'}]){
  const state=await sweep({github:gh,context:{...base,payload:{inputs}}});
  assert.equal(state.status,'SKIPPED_NOT_SCHEDULE');
 }
 assert.equal((await sweep({github:gh,context:{...base,repo:{owner:'other',repo:'books'},payload:{inputs:{dry_run:'false'}}}})).status,'SKIPPED_NOT_SCHEDULE');
 assert.equal(reads,0);
 const flow=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 assert.match(flow,/const liveEligible=context.eventName==='schedule'/);
 assert.match(flow,/if\(liveEligible\)/);
 assert.match(flow,/!inputs.pm_pr_number/);
});
