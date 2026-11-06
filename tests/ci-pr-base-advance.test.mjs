import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyBaseAdvance} from '../lib/ci/pr-base-advance.mjs';
const old='1'.repeat(40), now='2'.repeat(40);
const pr={state:'open',number:3706,base:{ref:'codex/public-book-library',
  sha:old,repo:{full_name:'andylitvinov-design/books'}}};
const production={name:'codex/public-book-library',protected:true,commit:{sha:now}};
const comparison={status:'ahead',ahead_by:1,behind_by:0,
  base_commit:{sha:old},merge_base_commit:{sha:old},commits:[{sha:now}]};
test('base advanced is independently verified and never called a failing CI',()=>{
  const r=classifyBaseAdvance(pr,production,comparison);
  assert.equal(r.signal,'BASE_ADVANCED');
  assert.equal(r.state,'VERIFIED');
  assert.equal(r.commits_ahead,1);
  assert.equal(r.is_pr_failure,false);
  assert.equal(r.requires_new_ci,null);
  assert.match(r.evidence_url, /compare\/1{40}\.\.\.2{40}$/);
});
test('current base means aligned snapshot, not a historical no-advance assertion',()=>{
  const r=classifyBaseAdvance({...pr,base:{...pr.base,sha:now}},production);
  assert.equal(r.state,'ALIGNED_AT_SNAPSHOT');
  assert.equal(r.signal,null);
  assert.equal(r.commits_ahead,0);
});
test('no compare, divergent histories, missing final commit and truncation stay unknown',()=>{
  for(const compare of [null,{...comparison,status:'diverged'},
    {...comparison,merge_base_commit:{sha:now}},
    {...comparison,commits:[{sha:old}]},
    {...comparison,ahead_by:101},
    {...comparison,ahead_by:2}]){
    const r=classifyBaseAdvance(pr,production,compare);
    assert.equal(r.signal,null);
    assert.equal(r.state,'UNKNOWN');
    assert.equal(r.is_pr_failure,false);
  }
});
test('unprotected or wrong repository cannot emit a base advance',()=>{
  for(const [candidate,base] of [
    [pr,{...production,protected:false}],
    [{...pr,base:{...pr.base,repo:{full_name:'foreign/books'}}},production],
    [{...pr,base:{...pr.base,ref:'codex/bootstrap-books'}},production],
    [{...pr,base:{...pr.base,sha:'bad'}},production]]){
    assert.equal(classifyBaseAdvance(candidate,base,comparison).signal,null);
  }
});
test('closed or merged PR is not an active base-advance alert',()=>{
  for(const candidate of [{...pr,state:'closed'},
    {...pr,merged_at:'2026-11-06T23:00:00Z'}]){
    assert.equal(classifyBaseAdvance(candidate,production,comparison).state,'NOT_APPLICABLE');
  }
});
