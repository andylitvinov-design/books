'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');

test('Control Tower cannot dispatch while Watchdog holds sole guarded writer',()=>{
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const observer=fs.readFileSync('.github/workflows/hh-pr-queue-dispatcher.yml','utf8');
 assert.match(watchdog,/  direct-handoff:/);
 assert.match(watchdog,/needs: reconcile/);
 assert.match(watchdog,/HH_WATCHDOG_DIRECT_HANDOFF/);
 assert.match(watchdog,/group: hh-control-tower-single-writer/);
 assert.match(watchdog,/const report=await run\(\{github,core,context,dryRun\}\)/);
 assert.match(watchdog,/HH_DIRECT_HANDOFF_ENABLED: 'true'/);
 assert.match(watchdog,/HH PR core release gate/);
 assert.match(watchdog,/HH PR source Repair Worker/);
 assert.match(watchdog,/HH zero-cost PR CI worker/);
 assert.match(observer,/group: hh-control-tower-observer/);
 assert.match(observer,/actions: read/);
 assert.match(observer,/const outcome=await run\(\{github,core,context,dryRun:true\}\)/);
 assert.doesNotMatch(observer,/actions: write/);
 assert.doesNotMatch(observer,/createWorkflowDispatch\(/);
});
test('Worker completion relay targets Watchdog and never skips verified exit',()=>{
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const wake=fs.readFileSync('scripts/ci-pr-control-tower-wakeup.cjs','utf8');
 assert.match(watchdog,/completion-wait:/);
 assert.match(watchdog,/direct_dispatch:/);
 assert.match(watchdog,/worker_run_id:/);
 assert.match(watchdog,/relayCompletionWake/);
 assert.match(watchdog,/github\.event\.inputs\.direct_dispatch == 'true'/);
 assert.match(wake,/workflow_id:WATCHDOG,ref:DEFAULT,inputs:\{dry_run:'false',completion_wake:'true'/);
 assert.match(wake,/workflow_id:WATCHDOG,ref:DEFAULT,inputs:\{dry_run:'false',direct_dispatch:'true'/);
 assert.match(wake,/waitForWorkerCompletion/);
});
test('legacy Watchdog fallback is disabled for direct handoff',()=>{
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const wake=fs.readFileSync('scripts/ci-pr-control-tower-wakeup.cjs','utf8');
 assert.match(watchdog,/HH_DIRECT_HANDOFF_ENABLED: 'true'/);
 assert.match(watchdog,/HH_CONTROL_TOWER_ENABLED: 'true'/);
 assert.match(wake,/process\.env\.HH_DIRECT_HANDOFF_ENABLED==='true'/);
 assert.match(wake,/return 'DIRECT_HANDOFF_ACTIVE'/);
});


test('public Watchdog KPI never calls HTTP dispatch a verified execution',()=>{
 const fs=require('node:fs');
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 assert.match(watchdog,/dispatch_requests_accepted:number\(report\.dispatchAccepted\)/);
 assert.match(watchdog,/worker_dispatches:number\(report\.runnerStartedConfirmed\)/);
 assert.match(watchdog,/RUNNER_STARTED/);
 assert.doesNotMatch(watchdog,/worker_dispatches:number\(report\.dispatchAccepted\)/);
});

test('scheduled CI Worker completion wakes guarded Watchdog direct handoff',()=>{
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const block=watchdog.split('  direct-handoff:\n')[1]?.split('\n    runs-on:')[0];
 assert.ok(block,'direct-handoff job exists');
 assert.match(block,/needs: reconcile/);
 assert.match(block,/always\(\)/);
 assert.match(block,/github\.event\.workflow_run\.status == 'completed'/);
 assert.match(block,/github\.event\.workflow_run\.head_branch == 'codex\/bootstrap-books'/);
 assert.match(block,/github\.event\.workflow_run\.repository\.full_name == 'andylitvinov-design\/books'/);
 assert.match(block,/github\.event\.workflow_run\.conclusion != 'cancelled'/);
 assert.match(block,/github\.event\.workflow_run\.conclusion != 'skipped'/);
 assert.match(block,/\(github\.event\.workflow_run\.event == 'workflow_dispatch' \|\|\s*\(github\.event\.workflow_run\.name == 'HH zero-cost PR CI worker' &&\s*github\.event\.workflow_run\.event == 'schedule'\)\)/);
 const dispatcher=fs.readFileSync('scripts/ci-pr-queue-dispatcher.cjs','utf8');
 assert.match(dispatcher,/\['workflow_dispatch','schedule'\]\.includes\(w\?\.event\)/);
 assert.match(watchdog,/group: hh-control-tower-single-writer/);
});
