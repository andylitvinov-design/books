'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const full=fs.readFileSync(path.join(__dirname,'../.github/workflows/hh-pr-direct-core-failure.yml'),'utf8');
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
 assert.match(intake,/receipt\.association!=='MATCHED_CHAT_EVENT_RECORDED'/);
 assert.match(intake,/COMMANDER_CI_TASK_INGEST_NOT_VERIFIED/);
});
test('repair stage still serializes every source write, only after verified task intake',()=>{
 assert.match(worker,/needs: ci_event_intake/);
 assert.match(worker,/needs\.ci_event_intake\.result == 'success'/);
 assert.match(worker,/group: hh-control-tower-single-writer/);
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
