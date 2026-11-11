'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const full=fs.readFileSync(path.join(__dirname,'../.github/workflows/hh-pr-direct-core-failure.yml'),'utf8');
// This contract runs with the same pull_request revision as the production workflow.
const intake=full.split('  ci_event_intake:\n')[1]?.split('  direct-core-failure:\n')[0];
const worker=full.split('  direct-core-failure:\n')[1]?.split('  core-slot-wakeup:\n')[0];
test('every eligible Core error gets its own independent OIDC ingestion without a shared pending slot',()=>{
 assert.ok(intake&&worker,'existing workflow has intake and writer jobs');
 assert.ok(full.includes('  workflow_run:\n'));
 assert.match(intake,/github\.event\.workflow_run\.name == 'HH PR core release gate'/);
 for(const outcome of ['failure','timed_out','startup_failure'])assert.ok(intake.includes("'"+outcome+"'"),outcome);
 assert.doesNotMatch(intake,/concurrency:|hh-control-tower-single-writer|createWorkflowDispatch/);
 assert.match(intake,/id-token: write/);
 assert.match(intake,/persist-credentials: false/);
 assert.match(intake,/ref: \$\{\{ github\.sha \}\}/);
 assert.match(intake,/core\.getIDToken\('hh-commander-ci'\)/);
 assert.match(intake,/sendWorkflowFailure\(\{github,context,core,oidcToken\}\)/);
 const {readFileSync}=require('node:fs');
 const workflow=readFileSync(require('node:path').join(__dirname,'../.github/workflows/hh-pr-direct-core-failure.yml'),'utf8');
 for(const accepted of ['MATCHED_CHAT_EVENT_RECORDED','TASK_ASSIGNED_CHAT_RECORDED_NOT_DISPATCHED','AUTO_TASK_CREATED_NOT_DISPATCHED'])
  assert.ok(intake.includes(accepted),'persisted receipt is accepted: '+accepted);
 assert.match(intake,/receipt\.accepted!==true/);
 assert.match(intake,/persistedAssociations\.has\(receipt\.association\)/);
 assert.match(intake,/COMMANDER_CI_TASK_INGEST_NOT_VERIFIED/);
 assert.ok(workflow.includes('AUTO_TASK_CREATED_NOT_DISPATCHED'));
});
test('unknown or unmatched association is never treated as successful task intake',()=>{
 const source=intake;
 assert.match(source,/persistedAssociations\.has\(receipt\.association\)/);
 assert.match(source,/receipt\.accepted!==true/);
 assert.match(source,/COMMANDER_CI_TASK_INGEST_NOT_VERIFIED/);
 assert.doesNotMatch(source,/association\s*===\s*['"]UNMATCHED/);
});

test('repair handoff is branch-scoped, preserving exact-HEAD writer protection without cross-PR pending replacement',()=>{
 assert.match(worker,/needs: ci_event_intake/);
 assert.match(worker,/needs\.ci_event_intake\.result == 'success'/);
 assert.match(worker,/group: hh-direct-core-pr-\$\{\{ github\.event\.workflow_run\.head_branch \|\| github\.event\.workflow_run\.id \}\}/);
 assert.doesNotMatch(worker,/group: hh-control-tower-single-writer/);
 assert.match(worker,/ci-pr-event-handoff\.cjs/);
 assert.match(worker,/cancel-in-progress: false/);
 assert.match(worker,/HH_COMMANDER_CI_RECEIPT: \$\{\{ needs\.ci_event_intake\.outputs\.receipt_json \}\}/);
 assert.match(worker,/ci-pr-commander-strategy-router\.cjs/);
 assert.match(worker,/ci-pr-event-handoff\.cjs/);
 assert.match(worker,/sendCommanderCiRoute/);
 assert.doesNotMatch(worker,/sendWorkflowFailure\(/);
 assert.ok(full.indexOf('  ci_event_intake:')<full.indexOf('  direct-core-failure:'));
});
test('existing success-side slot wakeup remains independent',()=>{
 assert.match(full,/  core-slot-wakeup:/);
 assert.match(full,/github\.event\.workflow_run\.conclusion == 'success'/);
});

test('GitHub pending concurrency slot cannot cross-cancel different source branches',()=>{
 const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/hh-pr-direct-core-failure.yml'),'utf8');
 const direct=workflow.split('  direct-core-failure:\n')[1]?.split('  core-slot-wakeup:\n')[0];
 assert.match(direct,/hh-direct-core-pr-/);
 assert.match(direct,/github\.event\.workflow_run\.head_branch/);
 assert.match(direct,/cancel-in-progress: false/);
 assert.doesNotMatch(direct,/group: hh-control-tower-single-writer/);
 assert.doesNotMatch(intake,/concurrency:/);
});
