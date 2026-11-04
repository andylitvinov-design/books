'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {stats,validSmoke,reconcileMergeLive,isFunctionalPath}=require('../scripts/ci-pr-merge-live-tracking.cjs');
const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40);
const pr={number:53,merge_commit_sha:a,merged_at:'2026-11-04T18:00:00Z'};
const second={number:54,merge_commit_sha:b,merged_at:'2026-11-04T18:10:00Z'};
const evidence={verified_live:true,reason:'SERVING_VERIFIED_REVISION',production_sha:c,
 deployment_id:'dpl_123456abcdef'};
const smoke={schema:'HH_FUNCTIONAL_SMOKE_V1',trusted_source:true,result:'PASS',
 repo:'andylitvinov-design/books',production_branch:'codex/public-book-library',
 alias:'holistichouse.vercel.app',production_sha:c,deployment_id:'dpl_123456abcdef',
 pr_number:53,pr_merge_sha:a,checked_at:'2026-11-04T18:28:00Z',
 checks:[{kind:'browser',origin:'https://holistichouse.vercel.app',
  path:'/en/holistic-support/mandala',passed:true,
  assertion:'Mandala player controls are interactive'}]};
const base={prs:[pr,second],confirmedPrNumbers:new Set([53,54]),productionEvidence:evidence,ancestryComplete:true,
 smokeReceipts:[smoke],mergedCoverage:'complete',observedAt:'2026-11-04T18:30:00Z'};
test('links original PR merge SHA to later deployed SHA and first real functional smoke',()=>{
 const r=reconcileMergeLive(base);
 assert.equal(r.served_ancestry_confirmed,2);
 assert.equal(r.functional_live_verified,1);
 assert.equal(r.awaiting_smoke,1);
 assert.equal(r.functional_coverage_pct,50);
 assert.equal(r.items[0].deployment_id,evidence.deployment_id);
 assert.equal(r.items[0].served_sha,c);
 assert.equal(r.items[0].state,'FUNCTIONAL_LIVE_VERIFIED');
 assert.equal(r.items[0].merge_to_live_observed_minutes,28);
 assert.equal(r.items[1].state,'DEPLOYED_AWAITING_FUNCTIONAL_SMOKE');
 assert.deepEqual(r.merge_to_functional_live_observation_minutes,{n:1,mean:28,p50:28,p95:28});
});
test('specific matching evidence required, unknown can never masquerade as delivered',()=>{
 for(const patch of [
  {trusted_source:false},{result:'FAIL'},{production_sha:b},{deployment_id:'dpl_different'},
  {pr_merge_sha:b},{alias:'preview.vercel.app'},{checked_at:'2026-11-04T17:59:00Z'},
  {checked_at:'2026-11-04T18:31:00Z'},
  {checks:[{...smoke.checks[0],path:'/en'}]},
  {checks:[{...smoke.checks[0],path:'/api/public/release-evidence'}]},
  {checks:[{...smoke.checks[0],origin:'https://preview.vercel.app'}]},
  {checks:[{...smoke.checks[0],passed:false}]}
 ]){
  assert.equal(validSmoke({...smoke,...patch},{pr,productionSha:c,deploymentId:evidence.deployment_id,
   observedAt:base.observedAt}),false,JSON.stringify(patch));
 }
 assert.equal(reconcileMergeLive({...base,confirmedPrNumbers:null}).functional_live_verified,null);
 assert.equal(reconcileMergeLive({...base,productionEvidence:{...evidence,verified_live:false}}).functional_live_verified,null);
 assert.equal(reconcileMergeLive({...base,smokeReceipts:[]}).functional_live_verified,0);
});
test('first successful smoke is used and durations never become negative',()=>{
 const r=reconcileMergeLive({...base,smokeReceipts:[{...smoke,checked_at:'2026-11-04T18:29:00Z'},smoke]});
 assert.equal(r.items[0].functional_smoke_at,smoke.checked_at);
 assert.equal(r.items[0].merge_to_live_observed_minutes,28);
 assert.deepEqual(stats([1,2,3,4,100]),{n:5,mean:22,p50:3,p95:100});
 assert.equal(isFunctionalPath('/en/mytube'),true);
 assert.equal(isFunctionalPath('/en'),false);
});
test('unserved PR is never accepted even with purported smoke receipt',()=>{
 const r=reconcileMergeLive({...base,confirmedPrNumbers:new Set([54])});
 assert.equal(r.items[0].state,'MERGED_NOT_IN_CURRENT_SERVED_REVISION');
 assert.equal(r.functional_live_verified,0);
 assert.equal(reconcileMergeLive({...base,confirmedPrNumbers:new Set([54]),ancestryComplete:false}).items[0].proof_status,'ANCESTRY_INCOMPLETE');
});
