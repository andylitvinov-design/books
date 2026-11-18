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
