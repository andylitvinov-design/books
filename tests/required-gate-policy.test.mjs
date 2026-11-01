import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRequiredGatePolicy, assessRequiredGates } from '../lib/ci/required-gate-policy.mjs';

const H = 'a'.repeat(40), APP = 15368;
const rule = (...items) => ({type: 'required_status_checks', parameters: { required_status_checks: items.map(name => ({context:name,integration_id:APP})) }});
const check = (name, overrides={}) => ({id:17,name,app:{id:APP},status:'completed',conclusion:'success',head_sha:H,started_at:'2026-11-01T12:00:00Z',...overrides});
const observe = (...items) => items.map(([context, result]) => ({context, total_count:result.length, check_runs:result}));
const run = (rules, observations) => assessRequiredGates({head:H,policy:resolveRequiredGatePolicy(rules),observations});

test('legacy, staged and migrated effective requirements are explicitly known', () => {
  assert.deepEqual(resolveRequiredGatePolicy([rule('release-ready')]),{mode:'legacy',contexts:['release-ready'],appId:APP});
  assert.deepEqual(resolveRequiredGatePolicy([rule('release-ready'),rule('hh-core-verified','hh-specialist')]),{
    mode:'dual',contexts:['hh-core-verified','hh-specialist','release-ready'],appId:APP});
  assert.deepEqual(resolveRequiredGatePolicy([rule('hh-specialist','hh-core-verified')]),{
    mode:'migrated',contexts:['hh-core-verified','hh-specialist'],appId:APP});
});

test('no required statuses, partial migration or unknown context never passes', () => {
  assert.throws(()=>resolveRequiredGatePolicy([]),/REQUIRED_GATE/);
  assert.throws(()=>resolveRequiredGatePolicy([rule('hh-core-verified')]),/PARTIAL_MIGRATION/);
  assert.throws(()=>resolveRequiredGatePolicy([rule('release-ready','unknown')]),/UNKNOWN_CONTEXT/);
  assert.throws(()=>resolveRequiredGatePolicy([{type:'required_status_checks',parameters:{}}]),/RULES_INVALID/);
  assert.throws(()=>resolveRequiredGatePolicy([rule('hh-core-verified'),rule('release-ready')]),/PARTIAL_MIGRATION/);
  assert.throws(()=>resolveRequiredGatePolicy([rule('release-ready'),{type:'required_status_checks',parameters:{required_status_checks:[{context:'release-ready',integration_id:3}]}}]),/CONFLICTING_APPS/);
});

test('legacy latest matching check on exact HEAD must succeed', () => {
  const r=[rule('release-ready')];
  assert.equal(run(r,observe(['release-ready',[check('release-ready')]])).state,'SUCCESS');
  assert.equal(run(r,observe(['release-ready',[check('release-ready',{conclusion:'failure'})]])).state,'FAILED');
  assert.equal(run(r,observe(['release-ready',[check('release-ready',{status:'queued',conclusion:null})]])).state,'WAITING');
  assert.equal(run(r,observe(['release-ready',[check('release-ready',{head_sha:'b'.repeat(40)})]])).state,'UNKNOWN');
});

test('only latest actual run for one context decides, no stale green', () => {
  const r=[rule('release-ready')];
  const old=check('release-ready',{id:17,started_at:'2026-11-01T12:00:00Z'});
  const newer=check('release-ready',{id:18,conclusion:'failure',started_at:'2026-11-01T12:05:00Z'});
  const x=run(r,observe(['release-ready',[old,newer]]));
  assert.equal(x.state,'FAILED');
  assert.equal(x.check_run_id,18);
});

test('migrated Core success cannot hide missing or red Specialist', () => {
  const rules=[rule('hh-core-verified','hh-specialist')];
  assert.equal(run(rules,observe(['hh-core-verified',[check('hh-core-verified')]], ['hh-specialist',[check('hh-specialist')]])).state,'SUCCESS');
  const red=run(rules,observe(['hh-core-verified',[check('hh-core-verified')]],['hh-specialist',[check('hh-specialist',{id:18,conclusion:'failure'})]]));
  assert.equal(red.state,'FAILED');
  assert.deepEqual(red.failed_contexts,['hh-specialist']);
  assert.equal(run(rules,observe(['hh-core-verified',[check('hh-core-verified')]],['hh-specialist',[]])).state,'UNKNOWN');
  assert.equal(run(rules,observe(['hh-core-verified',[check('hh-core-verified')]],['hh-specialist',[check('hh-specialist',{status:'in_progress',conclusion:null})]])).state,'WAITING');
});

test('dual transition requires legacy, core, specialist on the same HEAD', () => {
  const rules=[rule('release-ready'),rule('hh-core-verified','hh-specialist')];
  const observations=observe(
    ['release-ready',[check('release-ready')]],
    ['hh-core-verified',[check('hh-core-verified')]],
    ['hh-specialist',[check('hh-specialist',{id:19,conclusion:'failure'})]]
  );
  assert.equal(run(rules, observations).state,'FAILED');
  observations[2].check_runs[0].conclusion='success';
  assert.equal(run(rules, observations).state,'SUCCESS');
});

test('incomplete pagination, different GitHub App, or wrong context is unknown', () => {
  const policy=resolveRequiredGatePolicy([rule('release-ready')]);
  for (const observations of [
    [{context:'release-ready',total_count:101,check_runs:[check('release-ready')]}],
    observe(['release-ready',[check('release-ready',{app:{id:42}})]]),
    observe(['release-ready',[check('hh-specialist')]]),
  ]) assert.equal(assessRequiredGates({head:H,policy,observations}).state,'UNKNOWN');
});
