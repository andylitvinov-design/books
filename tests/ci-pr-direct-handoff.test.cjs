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


test('public Watchdog KPI never counts dispatch HTTP as runner execution',()=>{
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const monitor=fs.readFileSync('scripts/ci-pr-monitor-feed.cjs','utf8');
 assert.match(watchdog,/publishMonitorSnapshot/);
 assert.match(watchdog,/HH_DIRECT_HANDOFF_MONITOR_/);
 assert.match(monitor,/dispatch_requests_accepted:validCount\(report\.dispatchAccepted/);
 assert.match(monitor,/worker_dispatches:validCount\(report\.runnerStartedConfirmed/);
 assert.match(monitor,/RUNNER_STARTED/);
 assert.doesNotMatch(monitor,/worker_dispatches:validCount\(report\.dispatchAccepted/);
 assert.match(monitor,/OLDER_OR_DUPLICATE_DROPPED/);
});
