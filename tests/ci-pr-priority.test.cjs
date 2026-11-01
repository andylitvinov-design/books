'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {priorityFor,rankedCandidates,pickQueueCandidates}=require('../scripts/ci-pr-priority.cjs');
const NOW=Date.parse('2026-11-01T18:00:00Z');
const label=name=>({name});
const pr=(number,title='feat(profile): normal product work',extra={})=>({
  number,title,created_at:'2026-10-01T00:00:00Z',
  updated_at:new Date(NOW-number*1000).toISOString(),labels:[],...extra
});
test('explicit P0 to P3 owner priority overrides title heuristic',()=>{
  assert.equal(priorityFor(pr(1,'fix(ci): watchdog broken'),NOW).tier,'P0');
  assert.equal(priorityFor(pr(2,'fix(ci): watchdog broken',{labels:[label('hh:priority:p2')]}),NOW).tier,'P2');
});
test('old CI regression-coverage PR does not displace active production P0',()=>{
  const coverage=pr(850,'fix(ci): restore regression coverage for current test, course and consultation UI');
  const outage=pr(2956,'fix(ci): prevent Watchdog callbacks cancelling repairs');
  const blocked=pr(2957,'fix(ci): unblock developer build');
  assert.equal(priorityFor(coverage,NOW).tier,'P2');
  assert.equal(priorityFor(outage,NOW).tier,'P0');
  assert.equal(priorityFor(blocked,NOW).tier,'P1');
  assert.equal(rankedCandidates([coverage,outage],NOW)[0].number,2956);
});
test('production regression precedes media feature, normal work and styling',()=>{
  for(const [title,tier] of [
    ['fix(video): unblock iPhone Create','P0'],
    ['feat(voice): RU/EN TTS audio','P1'],
    ['feat(courses): lessons','P2'],
    ['style(video): spacing','P3']])
    assert.equal(priorityFor(pr(1,title),NOW).tier,tier);
});
test('age and queue bonuses cannot jump priority tiers',()=>{
  const old=pr(1,'docs: grammar',{created_at:'2020-01-01T00:00:00Z'});
  const newItem=pr(2,'feat(video): editor',{created_at:'2026-11-01T17:59:00Z'});
  assert.ok(priorityFor(old,NOW).score<priorityFor(newItem,NOW).score);
});
test('conflicting manual labels do not silently escalate priority',()=>{
  const ambiguous=pr(1,'fix(ci): urgent',{labels:[label('hh:priority:p0'),label('hh:priority:p3')]});
  assert.equal(priorityFor(ambiguous,NOW).conflicted,true);
  assert.deepEqual(rankedCandidates([ambiguous,pr(2)],NOW).map(x=>x.number),[2]);
});
test('three fast and one rotating slots protect against starvation',()=>{
  const pool=Array.from({length:60},(_,i)=>pr(i+1));
  pool[45]={...pool[45],labels:[label('hh:priority:p0')]};
  pool[55]={...pool[55],labels:[label('hh:priority:p1')]};
  const first=pickQueueCandidates(pool,NOW,4,3);
  assert.equal(first.length,4);
  assert.equal(first[0].number,46);
  assert.ok(first.some(x=>x.number===56));
  const seen=new Set();
  for(let t=0;t<60;t++)seen.add(pickQueueCandidates(pool,NOW+t*600000,4,3)[3].number);
  assert.ok(seen.size>=45,'rotating slot reaches older P2 PRs');
});
test('latest update is tie-break only within priority, not across levels',()=>{
  const items=[pr(1,'feat(profile): normal',{updated_at:'2026-11-01T17:00:00Z'}),
    pr(2,'feat(profile): normal',{updated_at:'2026-11-01T17:30:00Z'})];
  assert.deepEqual(rankedCandidates(items,NOW).map(x=>x.number),[2,1]);
});
test('invalid capacity fails closed',()=>{
  assert.throws(()=>pickQueueCandidates([pr(1)],NOW,30,3),/Unsafe/);
  assert.throws(()=>pickQueueCandidates([pr(1)],NOW,4,5),/Unsafe/);
});
