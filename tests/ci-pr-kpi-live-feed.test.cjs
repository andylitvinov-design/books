'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {build,publish,ISSUE}=require('../scripts/ci-pr-kpi-live-feed.cjs');
const now=Date.parse('2026-11-04T15:45:00Z'),sha='a'.repeat(40),other='b'.repeat(40);
const merge={kind:'merged',production:true,pr:7,mergeSha:sha,head:other,
 created_at:'2026-11-03T13:00:00Z',at:'2026-11-04T15:00:00Z'};
const live={kind:'live_verified',pr:7,production:true,mergeSha:sha,head:sha,
 source:'authenticated_github_actions_live_receipt',aliasVerified:true,smokeVerified:true,
 deployment_id:'dpl_ABCDEFGHIJKLMNOPQRST',at:'2026-11-04T15:10:00Z'};
const source=()=>({receipts:{complete:false,remaining:3400,events:[live]},
 merges:{complete:true,remaining:3500,events:[merge]}});
test('exact matched production merged SHA yields verified historical LIVE sample',()=>{
 const x=build({now,...source()});
 assert.equal(x.coverage.observed_pairs,1);
 assert.equal(x.coverage.reads_added_for_aggregation,0);
 assert.equal(x.rows[0].pr,7);assert.equal(x.rows[0].live_at,live.at);
 assert.equal(x.coverage.label,'VERIFIED_OBSERVED_SAMPLE_NOT_ALL_PRS');
 assert.equal(x.coverage.no_receipt_meaning,'UNKNOWN_NOT_NO_DEPLOY');
});
test('cross-PR, SHA, premerge, untrusted or wrong production proof rejected',()=>{
 const bad=[{...live,pr:8},{...live,mergeSha:other},{...live,at:'2026-11-04T14:00:00Z'},
  {...live,source:'human'},{...live,aliasVerified:false},{...live,deployment_id:'bogus'}];
 const x=build({now,receipts:{...source().receipts,events:bad},merges:source().merges});
 assert.equal(x.rows.length,0);assert.equal(x.coverage.observed_pairs,0);
});
test('duplicate LIVE receipts keep first observed time and avoid overcount',()=>{
 const x=build({now,receipts:{...source().receipts,events:[live,{...live,at:'2026-11-04T15:20:00Z'}]},
  merges:source().merges});
 assert.equal(x.coverage.observed_pairs,1);assert.equal(x.rows[0].live_at,live.at);
});
test('existing scheduled writer only; at most one guarded issue update',async()=>{
 let reads=0,writes=0;
 const github={rest:{issues:{get:async()=>{reads++;return{data:{state:'open',
 body:'<!-- HH_PR_JOURNEY_LIVE_FEED_V1 -->',title:'HH PR Monitor · verified Created → Merge → LIVE cohort feed'}}},
 update:async({issue_number,body})=>{writes++;assert.equal(issue_number,ISSUE);
 assert.match(body,/"HH_PR_JOURNEY_LIVE_FEED_V1"/);}}}};
 const context={repo:{owner:'andylitvinov-design',repo:'books'},eventName:'schedule'};
 const a=await publish({github,context,core:{info(){}},now,...source()});
 assert.equal(a.state,'PUBLISHED');assert.equal(reads,1);assert.equal(writes,1);
 const b=await publish({github,context:{...context,eventName:'push'},now,...source()});
 assert.equal(b.state,'NOT_SCHEDULED_TRUSTED_WRITER');assert.equal(writes,1);
});
test('missing quota or low reserve skips write safely',async()=>{
 const x=await publish({github:{},context:{repo:{owner:'andylitvinov-design',repo:'books'},eventName:'schedule'},
 now,receipts:{...source().receipts,remaining:300},merges:source().merges});
 assert.equal(x.state,'API_RATE_RESERVE');
});