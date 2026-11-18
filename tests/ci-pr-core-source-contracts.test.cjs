'use strict';
const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const {VERIFIED_CORE_SOURCE_CONTRACTS}=require('../scripts/ci-pr-core-source-contracts.cjs');
const {repairableCoreTestFailure}=require('../scripts/ci-pr-error-task.cjs');
const {classifyRedCiError}=require('../scripts/ci-pr-red-ci-classifier.cjs');
const SHA='a'.repeat(40);
test('signed Core source-step registry matches the current release step and both readers',()=>{
 a.ok(VERIFIED_CORE_SOURCE_CONTRACTS.has('Fast Mandala release contracts (HH_MANDALA_FAST_RELEASE_V1)'));
 const watcher=fs.readFileSync('scripts/ci-pr-ten-minute-watchdog.cjs','utf8');
 const router=fs.readFileSync('scripts/ci-pr-error-task.cjs','utf8');
 a.match(watcher,/\.\.\.VERIFIED_CORE_SOURCE_CONTRACTS/);
 a.match(router,/VERIFIED_CORE_SOURCE_CONTRACTS\.has\(c\.failed_step\)/);
 for(const step of VERIFIED_CORE_SOURCE_CONTRACTS){
  const c=classifyRedCiError({pr:{head:{sha:SHA}},jobs:[{
   name:'core-lint-types-build',conclusion:'failure',
   steps:[{name:step,conclusion:'failure'}]}]});
  a.equal(c.category,'TEST_FAILURE',step);
  a.equal(repairableCoreTestFailure(c),true,step);
 }
});
test('specialist, policy, unsafe Core steps and ambiguous jobs never become source writers',()=>{
 for(const [job,step] of [
  ['hh-merge-check','Fast Mandala release contracts (HH_MANDALA_FAST_RELEASE_V1)'],
  ['core-lint-types-build','Verify deterministic ESLint repair worker contract'],
  ['core-lint-types-build','Validate exact-head risk and required specialist workflows'],
  ['core-lint-types-build','Unrelated browser E2E tests']
 ]){
  const c=classifyRedCiError({pr:{head:{sha:SHA}},jobs:[{
   name:job,conclusion:'failure',steps:[{name:step,conclusion:'failure'}]}]});
  a.equal(repairableCoreTestFailure(c),false,job+':'+step);
 }
});
