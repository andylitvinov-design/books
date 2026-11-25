import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPrCompletionJourney} from '../lib/agent-director/pr-completion-journey.mjs';

const SHA='a'.repeat(40),REPO='andylitvinov-design/books';
const check=(name,status,conclusion)=>({name,status,conclusion,head_sha:SHA,
 completed_at:'2026-11-17T23:12:00Z',
 html_url:'https://github.com/andylitvinov-design/books/actions/runs/123456'});
const item={prNumber:4925,requestedHeadSha:SHA,status:'WATCHING',
 createdAt:'2026-11-17T23:39:00Z',firstAttemptAt:'2026-11-17T23:41:00Z',
 checkedCount:1,dispatchAccepted:false};
const pr={number:4925,state:'open',merged:false,head:{sha:SHA,repo:{full_name:REPO}},
 base:{ref:'codex/public-book-library',repo:{full_name:REPO}},labels:[]};
const source={pr,checksComplete:true,commentsComplete:true,comments:[]};
const build=check('core-lint-types-build','completed','success');
const gate=check('hh-merge-check','completed','success');
const journey=(checks,events=[])=>buildPrCompletionJourney({
 item,github:{...source,checks},ciEvents:events,observedAt:'2026-11-17T23:44:00Z'});
const stage=(j,id)=>j.stages.find(s=>s.id===id);

test('Core build success and failed required merge gate never display green Core',()=>{
 const j=journey([build,{...gate,conclusion:'failure'}]);
 assert.equal(j.coreStatus.name,'hh-merge-check');
 assert.equal(j.coreStatus.buildConclusion,'success');
 assert.equal(j.coreStatus.requiredGateConclusion,'failure');
 assert.equal(stage(j,'diagnostics').state,'attention');
 assert.equal(stage(j,'recheck').state,'attention');
 assert.match(stage(j,'diagnostics').detail,/hh-merge-check.*failure/);
 assert.equal(j.currentStage,'handoff');
});
test('green build with missing or running gate is never full Core success',()=>{
 for(const checks of [[build],[build,check('hh-merge-check','in_progress',null)]]){
  const j=journey(checks);
  assert.notEqual(stage(j,'diagnostics').state,'done');
  assert.notEqual(stage(j,'recheck').state,'done');
  assert.match(stage(j,'diagnostics').detail,/hh-merge-check/);
 }
});
test('only exact-head successful build and gate confirm Core release',()=>{
 const j=journey([build,gate]);
 assert.equal(stage(j,'diagnostics').state,'done');
 assert.equal(stage(j,'recheck').state,'done');
 assert.equal(j.coreStatus.conclusion,'success');
 assert.equal(j.currentStage,'merge');
 const oldGate={...gate,head_sha:'b'.repeat(40)};
 assert.notEqual(stage(journey([build,oldGate]),'diagnostics').state,'done');
});
test('failed Core with signed triage but no safe writer shows real blocker',()=>{
 const j=journey([build,{...gate,conclusion:'failure'}],[{
  headSha:SHA,routeReason:'NO_SAFE_AUTOMATIC_WRITER_FOR_CATEGORY',
  category:'TEST_FAILURE',dispatchAccepted:false,workerStarted:false
 }]);
 assert.equal(stage(j,'handoff').state,'attention');
 assert.match(stage(j,'handoff').detail,/TEST_FAILURE/);
 assert.match(stage(j,'handoff').detail,/NO_SAFE_AUTOMATIC_WRITER_FOR_CATEGORY/);
 assert.equal(j.stalled,true);
});
test('untrusted or outdated triage does not claim current-HEAD handoff',()=>{
 const j=journey([build,{...gate,conclusion:'failure'}],[{
  headSha:'b'.repeat(40),routeReason:'NO_SAFE_AUTOMATIC_WRITER_FOR_CATEGORY',
  category:'TEST_FAILURE'
 }]);
 assert.equal(stage(j,'handoff').state,'waiting');
 assert.equal(j.stalled,false);
});
