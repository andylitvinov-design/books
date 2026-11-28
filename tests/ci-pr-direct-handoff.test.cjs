'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');

test('Watchdog retains guarded writer while direct Core handoff isolates pending PR branches',()=>{
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const observer=fs.readFileSync('.github/workflows/hh-pr-queue-dispatcher.yml','utf8');
 assert.match(watchdog,/  direct-handoff:/);
 assert.match(watchdog,/needs: reconcile/);
 assert.match(watchdog,/HH_WATCHDOG_DIRECT_HANDOFF/);
 assert.match(watchdog,/group: hh-control-tower-single-writer/);
 assert.match(watchdog,/const report=await run\(\{github,core,context,dryRun\}\)/);
 assert.match(watchdog,/HH_DIRECT_HANDOFF_ENABLED: 'true'/);
 const direct=fs.readFileSync('.github/workflows/hh-pr-direct-core-failure.yml','utf8');
 const reconcile=watchdog.split('  reconcile:\n')[1]?.split('\n  completion-wait:\n')[0];
 assert.ok(reconcile,'reconcile job exists');
 assert.doesNotMatch(reconcile,/HH PR core release gate/);
 const directJob=watchdog.split('  direct-handoff:\n')[1]?.split('\n  reactivate-schedules-and-dispatch:\n')[0];
 assert.ok(directJob,'direct-handoff job exists');
 assert.ok(directJob.includes('"HH PR core release gate"'),'Core is explicitly excluded from generic handoff');
 assert.match(direct,/HH PR core release gate/);
 assert.match(direct,/^  workflow_call:$/m);
 assert.doesNotMatch(direct,/^  workflow_run:/m);
 assert.match(fs.readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8'),/types: \[completed\]/);
 assert.match(direct,/group: hh-direct-core-pr-\$\{\{ github\.event\.workflow_run\.head_branch/);
 assert.doesNotMatch(direct,/group: hh-control-tower-single-writer/);
 assert.ok(direct.includes('ci-pr-event-handoff.cjs'));
 assert.match(direct,/HH_DIRECT_CORE_HANDOFF/);
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

test('watchdog direct-handoff condition must be balanced',()=>{
 const text=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const job=text.split('  direct-handoff:\n')[1]?.split('\n    runs-on:')[0];
 assert.ok(job,'direct-handoff job exists');
 const condition=job.split('if: >-')[1];
 assert.ok(condition,'direct-handoff guard exists');
 let depth=0;
 for(const ch of condition.replace(/'[^']*'/g,'')){
   if(ch==='(')depth++;
   else if(ch===')')depth--;
   assert.ok(depth>=0,'unmatched closing parenthesis');
 }
 assert.equal(depth,0,'GitHub Actions if expression has no unclosed parentheses');
});

test('watchdog has only two worker-completion listeners; Core owns quality-failure aggregation',()=>{
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const trigger=watchdog.split('  workflow_run:\n')[1]?.split('  push:\n')[0];
 assert.ok(trigger,'workflow_run completion listener exists');
 const names=[...trigger.matchAll(/^      - '(.+)'$/gm)].map(m=>m[1]);
 assert.deepEqual(names,[
  'HH PR source Repair Worker',
  'HH zero-cost PR CI worker'
 ],'no redundant per-specialist or queue-observer completion callbacks');
 assert.match(trigger,/types: \[completed\]/);
 assert.match(watchdog,/group: hh-control-tower-single-writer/);
 // PR conflict handoff remains immediate; owner PM comments are scanned
 // on the existing schedule (or explicit trusted workflow_dispatch).
 const native=fs.readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
 assert.match(native,/pull_request_target:\n    # One existing PR-target event[\s\S]*?types: \[opened, reopened, synchronize, ready_for_review\]/);
 assert.doesNotMatch(watchdog,/^  pull_request_target:/m);
 assert.doesNotMatch(watchdog,/^  issue_comment:/m);
 assert.ok(watchdog.includes("cron: '13,33,53 * * * *'"));
 assert.ok(watchdog.includes('  workflow_dispatch:'));
 assert.ok(watchdog.includes('HH PM inbox using verified Github free secret'));
});

test('failed Core still has a separately authenticated repair bridge and exact-HEAD handoff',()=>{
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const bridge=fs.readFileSync('.github/workflows/hh-pr-direct-core-failure.yml','utf8');
 const native=fs.readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
 assert.match(bridge,/^  workflow_call:$/m);
 assert.doesNotMatch(bridge,/^  workflow_run:/m);
 assert.match(native,/  workflow_run:/);
 assert.match(native,/      - 'HH PR core release gate'/);
 assert.match(native,/types: \[completed\]/);
 assert.match(bridge,/persistReadOnlyRoute/);
 assert.match(bridge,/group: hh-direct-core-pr-/);
 const direct=watchdog.split('  direct-handoff:\n')[1]?.split('\n  reactivate-schedules:\n')[0];
 assert.ok(direct,'worker completion direct handoff remains');
 assert.match(direct,/github\.event\.workflow_run\.status == 'completed'/);
 assert.match(direct,/HH PR source Repair Worker/);
 assert.match(direct,/HH zero-cost PR CI worker/);
 assert.match(direct,/needs: reconcile/);
});
test('watchdog-only exact diff retains CI/repair checks but skips unrelated dashboard suites',()=>{
 const contract=fs.readFileSync('.github/workflows/hh-pr-watchdog-contract-ci.yml','utf8');
 assert.ok(contract.includes('id: control_scope'));
 assert.ok(contract.includes('git rev-parse HEAD^2'));
 assert.ok(contract.includes('git diff --no-renames --name-status HEAD^1 HEAD'));
 assert.ok(contract.includes('route=FULL'));
 assert.ok(contract.includes('route=CONTROL_ONLY'));
 for(const path of [
  'M:.github/workflows/hh-pr-ten-minute-watchdog.yml',
  'M:.github/workflows/hh-pr-watchdog-contract-ci.yml',
  'M:tests/ci-pr-direct-handoff.test.cjs',
  'M:tests/ci-pr-control-tower.test.cjs',
  'M:tests/ci-pr-orchestration-triggers.test.cjs'
 ])assert.ok(contract.includes(path));
 assert.equal(contract.split("if: ${{ steps.control_scope.outputs.route != 'CONTROL_ONLY' }}").length-1,13);
 assert.ok(contract.includes('      - name: Watchdog decision contracts\n        run:'));
 assert.ok(contract.includes('      - name: Hermes CI event bridge and private inbox contracts\n        run:'));
 assert.ok(contract.includes('      - name: Syntax-check trusted watchdog and tests\n        run:'));
});

test('control-only failed-Core intake uses slim runner without moving OIDC receipt into lossy writer concurrency', () => {
 const direct=fs.readFileSync('.github/workflows/hh-pr-direct-core-failure.yml','utf8');
 const intake=direct.split('  ci_event_intake:\n')[1]?.split('  direct-core-failure:\n')[0];
 const writer=direct.split('  direct-core-failure:\n')[1];
 assert.doesNotMatch(direct,/^  core-slot-wakeup:/m,'success completion must be owned by the unified subscriber');
 assert.ok(intake && writer, 'two independent phases remain present');
 assert.match(intake,/runs-on: ubuntu-slim/);
 assert.match(writer,/runs-on: ubuntu-slim/);
 assert.match(intake,/timeout-minutes: 4/);
 assert.match(intake,/sendWorkflowFailure/);
 assert.match(intake,/persistReadOnlyRoute/);
 assert.match(intake,/core\.getIDToken\('hh-commander-ci'\)/);
 assert.doesNotMatch(intake,/concurrency:|npm ci|npm run build|npx playwright/,
  'durable OIDC receipt must not be suppressed by a single-pending writer slot');
 assert.match(writer,/needs: ci_event_intake/);
 assert.match(writer,/needs\.ci_event_intake\.outputs\.stale_event != 'true'/);
 assert.match(writer,/group: hh-direct-core-pr-/);
 assert.match(writer,/ci-pr-base-advanced-recovery\.cjs/);
 assert.match(writer,/HH_DIRECT_CORE_HANDOFF/);
});

test('single Core-completion workflow preserves successful slot wakeup, failed OIDC intake, and least-privilege jobs',()=>{
 const native=fs.readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
 const child=fs.readFileSync('.github/workflows/hh-pr-direct-core-failure.yml','utf8');
 const top=native.split('jobs:\n')[0];
 const enabled=native.split('  enable:\n')[1]?.split('\n  failed-core-handoff:\n')[0];
 const delegated=native.split('  failed-core-handoff:\n')[1]?.split('\n  core-slot-wakeup:\n')[0];
 const success=native.split('  core-slot-wakeup:\n')[1]?.split('\n  recover-interrupted-core:\n')[0];
 assert.ok(enabled&&delegated&&success,'all three signed response lanes remain');
 assert.equal((top.match(/  workflow_run:/g)||[]).length,1,'only one completed-Core listener');
 assert.match(top,/      - 'HH PR core release gate'/);
 assert.match(top,/types: \[completed\]/);
 assert.match(child,/^  workflow_call:$/m);
 assert.doesNotMatch(child,/^  workflow_run:/m);
 assert.match(delegated,/uses: \.\/\.github\/workflows\/hh-pr-direct-core-failure\.yml/);
 assert.match(delegated,/github\.event\.workflow_run\.status == 'completed'/);
 assert.match(delegated,/contains\(fromJSON\('\["failure","timed_out","startup_failure"\]'\)/);
 assert.match(delegated,/id-token: write/);
 assert.match(delegated,/secrets: inherit/,'preserve existing owner token when routing genuine failed Core');
 assert.match(delegated,/actions: write/);
 assert.match(enabled,/actions: read/,'green auto-merge should not gain error-intake write scopes');
 assert.match(success,/github\.event\.workflow_run\.conclusion == 'success'/);
 assert.match(success,/group: hh-control-tower-single-writer/);
 assert.match(success,/ci-pr-slot-wakeup\.cjs/);
 assert.match(success,/ci-pr-repair-verified-finalizer\.cjs/);
 assert.match(success,/ci-pr-core-journey-archive\.cjs/);
 assert.match(child,/ci_event_intake:\n/);
 assert.match(child,/needs: ci_event_intake/);
 assert.match(child,/HH_DIRECT_CORE_HANDOFF/);
 assert.match(native,/  recover-interrupted-core:/);
 assert.match(native,/  prune-head:/);
});
