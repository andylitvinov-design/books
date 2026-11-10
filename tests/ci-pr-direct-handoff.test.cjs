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
 assert.match(direct,/  workflow_run:/);
 assert.match(direct,/types: \[completed\]/);
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

test('independent required PR workflow failures wake the same serialized Watchdog immediately',()=>{
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const trigger=watchdog.split('  workflow_run:\n')[1]?.split('  push:\n')[0];
 assert.ok(trigger,'workflow_run trigger exists');
 for(const name of [
  'HH PR Sweep Guard tests',
  'HH workflow syntax — actionlint',
  'HH PR watchdog contract',
  'Holistic Support mandala release checks',
  'Holistic House public services production acceptance',
  'Holistic House CRM source checks',
  'Website video browser verification',
  'Practitioner visual service editor',
  'HH First Video LIVE · encoded file acceptance',
  'Video publication safety and legacy private preflight',
  'Holistic House nightly public URL / media crawl',
  'Native CI'
 ]) assert.ok(trigger.includes("'"+name+"'"),'missing event wake for '+name);
 const reconcile=watchdog.split('  reconcile:\n')[1]?.split('    runs-on:')[0];
 assert.ok(reconcile.includes("github.event.workflow_run.conclusion == 'failure'"));
 assert.ok(reconcile.includes("github.event.workflow_run.conclusion == 'timed_out'"));
 assert.ok(reconcile.includes("github.event.workflow_run.conclusion == 'startup_failure'"));
 assert.ok(reconcile.includes("contains(fromJSON("));
 assert.ok(reconcile.includes("github.event.workflow_run.event == 'pull_request'"));
 assert.ok(reconcile.includes("group: hh-control-tower-single-writer"));
});

test('failed independent PR workflow runs dispatch the durable queue after Watchdog reconcile',()=>{
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const job=watchdog.split('  direct-handoff:\n')[1]?.split('\n  reactivate-schedules-and-dispatch:\n')[0];
 assert.ok(job,'direct-handoff job exists');
 assert.ok(job.includes("github.event.workflow_run.event == 'pull_request'"));
 assert.ok(job.includes("github.event.workflow_run.head_repository.full_name == 'andylitvinov-design/books'"));
 for(const conclusion of ['failure','timed_out','startup_failure'])
   assert.ok(job.includes("github.event.workflow_run.conclusion == '"+conclusion+"'"));
 assert.ok(job.includes("!contains(fromJSON("));
 assert.ok(job.includes('"HH PR core release gate"'));
 assert.ok(job.includes('"HH PR source Repair Worker"'));
 assert.ok(job.includes('"HH zero-cost PR CI worker"'));
 assert.ok(job.includes('needs: reconcile'));
 assert.ok(job.includes('group: hh-control-tower-single-writer'));
});

test('workflow_run wake allowlist covers production PR workflows within GitHub subscription cap',()=>{
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const trigger=watchdog.split('  workflow_run:\n')[1]?.split('  push:\n')[0];
 assert.ok(trigger,'workflow_run trigger exists');
 const names=[...trigger.matchAll(/^      - '(.+)'$/gm)].map(m=>m[1]);
 assert.ok(names.includes('HH Growth Studio editorial checks'));
 assert.ok(names.includes('HH one-shot PR backlog recovery'));
 assert.ok(names.includes('HH PR Control Tower queue dispatcher'));
 assert.ok(names.includes('HH PR three-cohort evidence backfill'));
 assert.ok(names.length<=20,'GitHub workflow_run workflow subscription limit exceeded: '+names.length);
 assert.ok(names.includes('HH PR source Repair Worker'));
 assert.ok(names.includes('HH zero-cost PR CI worker'));
 assert.ok(!names.includes('HH PR core release gate'),'Core keeps its dedicated handoff owner');
});
