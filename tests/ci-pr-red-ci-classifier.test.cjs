'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {classifyRedCiError}=require('../scripts/ci-pr-red-ci-classifier.cjs');
const fs=require('node:fs');
const PR={head:{sha:'a'.repeat(40)},mergeable:true,mergeable_state:'clean'};
const job=(name,step,conclusion='failure')=>({name,conclusion,steps:step?[{name:step,conclusion:'failure'}]:[]});
const check=(jobs,pr=PR,coreRoot='SOURCE_OR_PREFLIGHT')=>classifyRedCiError({pr,jobs,coreRoot});
test('trusted red-CI taxonomy: TypeScript is diagnostic, not source-write permission',()=>{
 const r=check([job('core-lint-types-build','TypeScript check')]);
 assert.equal(r.category,'TYPESCRIPT'); assert.equal(r.source_write_authorized,false);
 assert.equal(r.failed_step,'TypeScript check');
});
test('release build is TypeScript, not a lease/automation failure',()=>{
 const r=check([job('core-lint-types-build','Exact proposed release production build and TypeScript check'),
   job('hh-merge-check','Require real Core and specialist results from this workflow')]);
 assert.equal(r.category,'TYPESCRIPT');
 assert.equal(r.reason_code,'FAILED_TYPESCRIPT_STEP');
 assert.equal(r.failed_step,'Exact proposed release production build and TypeScript check');
 assert.equal(r.responsible_role,'free-code-repair-worker');
 assert.equal(r.source_write_authorized,false);
 assert.equal(r.execution_authorized,false);
 assert.equal(r.status,'DIAGNOSTIC_ONLY');
});
test('actual lease failure still routes to automation owner, never source writer',()=>{
 const r=check([job('owner-dispatcher','Repair worker lease expired')]);
 assert.equal(r.category,'AUTOMATION_PROCESS');
 assert.equal(r.responsible_role,'agents-director-maintainer');
 assert.equal(r.source_write_authorized,false);
 assert.equal(r.execution_authorized,false);
});
test('trusted red-CI taxonomy: test failures are separate from TypeScript',()=>{
 assert.equal(check([job('core-lint-types-build','Mobile Dock Core geometry and iPhone keyboard contracts')]).category,'TEST_FAILURE');
 assert.equal(check([job('focused-unit-types-build','Run unit tests')]).category,'TEST_FAILURE');
});
test('trusted red-CI taxonomy: real dirty differs from a stale conflict label',()=>{
 assert.equal(check([job('core-lint-types-build','TypeScript check')],{...PR,mergeable:false,mergeable_state:'dirty'}).category,'MERGE_CONFLICT');
 assert.equal(check([job('core-lint-types-build','TypeScript check')],{...PR,labels:[{name:'hh:conflict-repair-needed'}]}).category,'TYPESCRIPT');
});
test('trusted red-CI taxonomy: security gate overrides source and conflict',()=>{
 const r=check([job('core-lint-types-build','TypeScript check'),job('guard-unit','Security and secret scan')],{...PR,mergeable:false,mergeable_state:'dirty'});
 assert.equal(r.category,'SECURITY');assert.equal(r.source_write_authorized,false);
});
test('trusted red-CI taxonomy: infrastructure is not a product source error',()=>{
 assert.equal(check([job('core-lint-types-build','Checkout sources')]).category,'INFRASTRUCTURE');
 assert.equal(check([{name:'core-lint-types-build',conclusion:'startup_failure',steps:[]}]).category,'INFRASTRUCTURE');
});
test('trusted red-CI taxonomy: CI policy ownership/isolation contract failures route to CI owner, never source repair',()=>{
 const r=check([job('core-lint-types-build','Verify specialist ownership and Messenger isolation on CI-policy changes')]);
 assert.equal(r.category,'BASE_OR_CI_ROUTING');
 assert.equal(r.reason_code,'CI_WORKFLOW_BUDGET_GUARD');
 assert.equal(r.responsible_role,'ci-routing-owner');
 assert.equal(r.source_write_authorized,false);
 assert.equal(r.execution_authorized,false);
});
test('specialist exact-head/required-workflow gate is CI routing evidence, never source repair',()=>{
 const step='Validate exact-head risk and required specialist workflows';
 const results=[
  check([job('hh-specialist',step)]),
  check([job('hh-specialist',step),job('hh-merge-check','Require real Core and specialist results from this workflow')])
 ];
 for(const r of results){
  assert.equal(r.category,'BASE_OR_CI_ROUTING');
  assert.equal(r.reason_code,'SPECIALIST_REQUIRED_PROOF_MISSING_OR_STALE');
  assert.equal(r.evidence_code,'SPECIALIST_PROOF_UNAVAILABLE');
  assert.equal(r.responsible_role,'ci-routing-owner');
  assert.equal(r.retry.allowed,true);
  assert.equal(r.retry.max_attempts,1);
  assert.equal(r.source_write_authorized,false);
  assert.equal(r.execution_authorized,false);
  assert.equal(r.status,'DIAGNOSTIC_ONLY');
 }
 // A similar-looking unrelated failure must not be promoted to this route.
 const near=check([job('hh-specialist','Run Specialist functional tests')]);
 assert.notEqual(near.reason_code,'SPECIALIST_REQUIRED_PROOF_MISSING_OR_STALE');
 assert.equal(near.source_write_authorized,false);
 assert.equal(near.execution_authorized,false);
});

test('trusted red-CI taxonomy: base advanced requires explicit evidence',()=>{
 assert.equal(check([job('classify-change','production-base advanced')]).category,'BASE_ADVANCED');
 assert.equal(check([job('classify-change','Check routing')],PR,'CI_PREFLIGHT_OR_ROUTING').category,'BASE_OR_CI_ROUTING');
});
test('trusted red-CI taxonomy: mixed, pending and invalid-head jobs remain UNKNOWN',()=>{
 assert.equal(check([job('core-lint-types-build','TypeScript check'),job('unit','Unit tests')]).category,'UNKNOWN');
 assert.equal(check([{name:'core-lint-types-build',conclusion:null,steps:[]}]).category,'UNKNOWN');
 assert.equal(check([job('core-lint-types-build','TypeScript check')],{head:{sha:'BAD'}}).category,'UNKNOWN');
 assert.equal(check([job('hh-merge-check','')]).category,'UNKNOWN');
});
test('existing watchdog records a diagnostic only, without new dispatch or gate override',()=>{
 const src=fs.readFileSync('scripts/ci-pr-ten-minute-watchdog.cjs','utf8');
 assert.match(src,/classifyRedCiError\(\{pr:live,jobs,coreRoot:root\}\)/);
 assert.match(src,/ciErrorByCategory/);
 assert.match(src,/noteConfirmedBlocker/);
});


test('Watchdog contract path-filters, syntax-checks and executes this exact classifier suite',()=>{
 const workflow=fs.readFileSync('.github/workflows/hh-pr-watchdog-contract-ci.yml','utf8');
 assert.ok(workflow.includes("'tests/ci-pr-red-ci-classifier.test.cjs'"),
  'classifier test file must trigger Watchdog contract');
 assert.match(workflow,/node --check tests\/ci-pr-red-ci-classifier\.test\.cjs/);
 const decision=workflow.slice(workflow.indexOf('Watchdog decision contracts'),
  workflow.indexOf('Hermes CI event bridge and private inbox contracts'));
 assert.ok(decision.includes('tests/ci-pr-red-ci-classifier.test.cjs'),
  'classifier test file must actually execute in the decision suite');
});

test('exact failed Core source-preflight step becomes safe reproduction-only source candidate',()=>{
 const step='Source Preflight — syntax and TypeScript before costly Next build';
 const result=check([job('core-lint-types-build',step),
   job('hh-merge-check','Require real Core and specialist results from this workflow')]);
 assert.equal(result.category,'SOURCE_CODE');
 assert.equal(result.reason_code,'CORE_SOURCE_PREFLIGHT_REPRODUCTION_REQUIRED');
 assert.equal(result.evidence_code,'EXACT_FAILED_CORE_SOURCE_PREFLIGHT_STEP');
 assert.equal(result.confidence,0.82);
 assert.equal(result.source_write_authorized,false);
 assert.equal(result.execution_authorized,false);
 assert.equal(result.retry.allowed,true);
 assert.notEqual(result.status,'EXECUTION_AUTHORIZED');
});
test('source preflight cannot be inferred from near-match, mixed failures or security events',()=>{
 const step='Source Preflight — syntax and TypeScript before costly Next build';
 assert.equal(check([job('core-lint-types-build','Source Preflight summary')]).category,'UNKNOWN');
 assert.equal(check([job('unit-tests',step)]).category,'TEST_FAILURE');
 assert.equal(check([job('core-lint-types-build',step),job('Unit tests','Run unit tests')]).category,'UNKNOWN');
 assert.equal(check([job('core-lint-types-build',step),job('guard','Security / dependency scan')]).category,'SECURITY');
});
