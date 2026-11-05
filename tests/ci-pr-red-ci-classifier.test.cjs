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
