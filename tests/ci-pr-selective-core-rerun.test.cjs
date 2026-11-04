'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {classifyJob,selectInterruptedMandatoryJob}=require('../scripts/ci-pr-selective-core-rerun.cjs');
const job=(name,conclusion,status='completed',id=100)=>({name,conclusion,status,id});
const list=(...jobs)=>({total_count:jobs.length,jobs});
test('queued, running, failed, cancelled and passed remain separate',()=>{
 assert.equal(classifyJob(job('core-lint-types-build',null,'queued')),'queued');
 assert.equal(classifyJob(job('core-lint-types-build',null,'in_progress')),'running');
 assert.equal(classifyJob(job('core-lint-types-build','failure')),'failed');
 assert.equal(classifyJob(job('core-lint-types-build','cancelled')),'cancelled');
 assert.equal(classifyJob(job('core-lint-types-build','success')),'passed');
});
test('one infra timeout retries only the mandatory job, never a passed sibling',()=>{
 const decision=selectInterruptedMandatoryJob(list(
  job('core-lint-types-build','success','completed',101),
  job('hh-specialist','timed_out','completed',102),
  job('hh-merge-check','failure','completed',103)));
 assert.deepEqual(decision,{action:'rerun_job',reason:'SINGLE_MANDATORY_INFRA_INTERRUPTION',
  jobId:102,jobName:'hh-specialist'});
});
test('legitimate source failures are repaired, not repeatedly retried',()=>{
 assert.equal(selectInterruptedMandatoryJob(list(job('core-lint-types-build','failure'))).action,'repair');
 assert.equal(selectInterruptedMandatoryJob(list(job('core-lint-types-build','failure'),
   job('hh-specialist','timed_out','completed',102))).action,'repair');
});
test('queued or running jobs are not rerun',()=>{
 for(const status of ['queued','waiting','in_progress']){
  assert.equal(selectInterruptedMandatoryJob(list(job('core-lint-types-build','timed_out','completed',101),
   job('hh-specialist',null,status,102))).action,'wait');
 }
});
test('cancelled and incomplete inventories never authorize a rerun',()=>{
 assert.equal(selectInterruptedMandatoryJob(list(job('core-lint-types-build','cancelled'))).action,'hold');
 assert.equal(selectInterruptedMandatoryJob({total_count:3,jobs:[job('core-lint-types-build','timed_out')]}).action,'hold');
 assert.equal(selectInterruptedMandatoryJob(list(job('core-lint-types-build',null))).action,'hold');
});
test('multiple timeouts or optional failures are not expanded into a full rerun',()=>{
 assert.equal(selectInterruptedMandatoryJob(list(job('core-lint-types-build','timed_out','completed',101),
  job('hh-specialist','timed_out','completed',102))).action,'hold');
 assert.equal(selectInterruptedMandatoryJob(list(job('some-unrelated-job','timed_out'))).action,'hold');
});
