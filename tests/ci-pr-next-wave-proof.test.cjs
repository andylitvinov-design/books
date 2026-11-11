'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {isExactHeadCoreRun,findExactHeadCoreRun}=require('../scripts/ci-pr-next-wave-proof.cjs');

const sha='a'.repeat(40),prNumber=4242,branch='fix/verified-next-wave';
const identity={prNumber,branch,sha,baseRef:'codex/public-book-library',
 publishedAt:Date.parse('2026-11-09T14:00:00Z')};
function run(overrides={}) {
 return {id:123,name:'HH PR core release gate',
  path:'.github/workflows/hh-pr-core-release.yml@refs/pull/4242/merge',
  event:'pull_request',status:'queued',created_at:'2026-11-09T14:00:01Z',
  head_branch:branch,head_sha:'b'.repeat(40),
  repository:{full_name:'andylitvinov-design/books'},
  head_repository:{full_name:'andylitvinov-design/books'},
  pull_requests:[{number:prNumber,head:{sha},base:{ref:'codex/public-book-library'}}],
  ...overrides};
}

test('accepts a newly created exact PR Core run even when Actions uses a synthetic merge SHA',()=>{
 assert.equal(isExactHeadCoreRun(run(),identity),true);
 assert.equal(findExactHeadCoreRun([run()],identity).id,123);
});
test('GitHub action_required with zero jobs is not a verified new-HEAD Core wave',()=>{
 const blocked=run({status:'completed',conclusion:'action_required',actor:{login:'github-actions[bot]'}});
 assert.equal(isExactHeadCoreRun(blocked,identity),false);
 assert.equal(findExactHeadCoreRun([blocked],identity),null);
 const started=run({id:124,status:'in_progress',conclusion:null});
 assert.equal(findExactHeadCoreRun([blocked,started],identity)?.id,124,
   'a pending/real Core outranks an approval-only placeholder');
 for(const denied of ['action_required','cancelled','skipped','stale','startup_failure','neutral',null])
   assert.equal(isExactHeadCoreRun(run({status:'completed',conclusion:denied}),identity),false);
 for(const executed of ['success','failure','timed_out'])
   assert.equal(isExactHeadCoreRun(run({status:'completed',conclusion:executed}),identity),true);
});
test('rejects stale, wrong-PR, wrong-HEAD, wrong-branch and foreign workflow runs',()=>{
 const cases=[
  {pull_requests:[{number:prNumber,head:{sha:'c'.repeat(40)},base:{ref:identity.baseRef}}]},
  {pull_requests:[{number:99,head:{sha},base:{ref:identity.baseRef}}]},
  {pull_requests:[{number:prNumber,head:{sha},base:{ref:'main'}}]},
  {head_branch:'fix/another'},
  {name:'Other workflow'},
  {path:'.github/workflows/untrusted.yml@refs/pull/1/merge'},
  {event:'push'},
  {status:'skipped'},
  {repository:{full_name:'foreign/books'}},
  {head_repository:{full_name:'foreign/books'}},
  {created_at:'2026-11-09T13:59:00Z'},
  {pull_requests:[]}
 ];
 for(const override of cases)assert.equal(isExactHeadCoreRun(run(override),identity),false,JSON.stringify(override));
});
test('requires complete trusted PR association and a valid source identity',()=>{
 assert.equal(isExactHeadCoreRun(run({pull_requests:null}),identity),false);
 assert.equal(isExactHeadCoreRun(run(),{...identity,sha:'bad'}),false);
 assert.equal(isExactHeadCoreRun(run(),{...identity,prNumber:0}),false);
 assert.equal(findExactHeadCoreRun({},identity),null);
});
