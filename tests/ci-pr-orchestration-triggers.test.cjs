'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const read=name=>readFileSync('.github/workflows/'+name+'.yml','utf8');
test('watchdog has independent cron; failed Core is delegated by one trusted event subscriber',()=>{
  const s=read('hh-pr-ten-minute-watchdog');
  const direct=read('hh-pr-direct-core-failure');
  const native=read('hh-native-auto-merge');
  assert.ok(s.includes("cron: '13,33,53 * * * *'"));
  for(const tag of ['HH watchdog / dry run','HH watchdog / completion wake',
    'HH watchdog / direct handoff','HH watchdog / reconcile'])
    assert.ok(s.includes(tag),'Watchdog must distinguish real reconcile from no-op dispatch '+tag);
  assert.ok(!s.includes("      - 'HH PR core release gate'"));
  assert.ok(!s.includes("  failed-core-event-handoff:"));
  assert.ok(s.includes("      - 'HH PR source Repair Worker'"));
  assert.ok(s.includes("      - 'HH zero-cost PR CI worker'"));
  assert.ok(native.includes("      - 'HH PR core release gate'"));
  assert.ok(native.includes('  failed-core-handoff:'));
  assert.ok(native.includes('secrets: inherit'));
  assert.ok(direct.includes('  workflow_call:'));
  assert.ok(!direct.includes('  workflow_run:'));
  assert.ok(direct.includes("github.event.workflow_run.conclusion == 'failure'"));
  assert.ok(direct.includes("github.event.workflow_run.conclusion == 'timed_out'"));
  assert.ok(direct.includes("github.event.workflow_run.conclusion == 'startup_failure'"));
  assert.ok(direct.includes("github.event.workflow_run.event == 'pull_request'"));
  assert.ok(direct.includes("group: hh-direct-core-pr-"));
  assert.ok(direct.includes("github.event.workflow_run.head_branch"));
  assert.ok(!direct.includes("group: hh-control-tower-single-writer"));
  assert.ok(s.includes("context.eventName==='push'"));
  assert.ok(s.includes('default: false'));
});

test('allowlisted failed quality workflows use exact-PR event fast path, not another inventory scheduler',()=>{
 const watchdog=read('hh-pr-ten-minute-watchdog');
 const dispatcher=readFileSync('scripts/ci-pr-queue-dispatcher.cjs','utf8');
 const contract=read('hh-pr-watchdog-contract-ci');
 assert.ok(watchdog.includes('isTrustedQualityFailureEvent(context)'));
 assert.ok(watchdog.includes("directHandoffLocal:true,eventFastPath});"));
 assert.ok(watchdog.includes("'scripts/ci-pr-quality-event.cjs'"));
 assert.ok(dispatcher.includes('...Object.keys(QUALITY_EVENT_PATHS)'));
 assert.ok(dispatcher.includes('verifiedQualityFailure'));
 assert.ok(contract.includes("'scripts/ci-pr-quality-event.cjs'"));
 assert.ok(contract.includes('node --check scripts/ci-pr-quality-event.cjs'));
});

test('source Repair Worker is addressed only; no empty cron consumes its publish lease',()=>{
 const s=read('hh-pr-repair-worker');
 assert.ok(s.includes('workflow_dispatch:'));
 assert.ok(!s.includes('  schedule:'));
 assert.ok(!s.includes('  push:'));
 assert.ok(!s.includes('  workflow_run:'));
 assert.ok(s.includes('cancel-in-progress: false'));
 assert.ok(s.includes('reservation_run_id:'));
 assert.ok(s.includes('expected_sha:'));
 assert.ok(s.includes('task_key:'));
});
test('CI scheduled recovery retains cron but cannot reserve addressed worker lease',()=>{
 const s=read('hh-pr-ci-worker');
 assert.ok(s.includes("cron: '3 * * * *'"));
 assert.ok(!s.includes("cron: '3,13,23,33,43,53 * * * *'"));
 assert.ok(s.includes('workflow_dispatch:'));
 assert.ok(s.includes('cancel-in-progress: false'));
 assert.ok(s.includes("github.event_name == 'workflow_dispatch' && inputs.pr_number != '0'"));
 assert.ok(s.includes("format('pr-{0}', inputs.pr_number)"));
 assert.ok(s.includes("github.event_name == 'workflow_dispatch' && 'unaddressed' || 'background'"));
 assert.ok(s.includes('reservation_run_id:'));
 assert.ok(s.includes('HH_CI_SCHEDULE_FALLBACK'));
});
test('full inventory retains independent hourly recovery',()=>{
  assert.ok(read('hh-pr-full-inventory').includes("cron: '17 * * * *'"));
});

test('trusted default push re-enables schedules and dispatches one live watchdog',()=>{
  const s=read('hh-pr-ten-minute-watchdog');
  assert.ok(s.includes('reactivate-schedules-and-dispatch'));
  assert.ok(s.includes('github.rest.actions.getWorkflow'));
  assert.ok(s.includes('github.rest.actions.enableWorkflow'));
  assert.ok(s.includes('github.rest.actions.createWorkflowDispatch'));
  assert.ok(s.includes("inputs:{dry_run:'false'}"));
  assert.ok(s.includes("github.event_name == 'push'"));
});

test('trusted workflows have PR mutation scope for their PR issue labels and handoffs',()=>{
  for(const name of ['hh-pr-ten-minute-watchdog','hh-pr-ci-worker','hh-pr-repair-worker']){
    const s=read(name);
    assert.ok(s.includes('pull-requests: write'),name+' must permit PR label/comment claims');
  }
});

test('guarded inventory validates but expires historical exact-head sweep ownership',()=>{
  const s=read('hh-pr-full-inventory');
  assert.ok(s.includes('lease.lease_expires'));
  assert.ok(s.includes('lease.state="active"'));
  assert.ok(s.includes('Unbounded active lease'));
  // An elapsed timeout cannot release a modern actively-editing owner.
  assert.ok(s.includes('lease.historical_expiry_allowed=true'));
  assert.ok(s.includes('l.historical_expiry_allowed!==true'));
  assert.ok(s.includes('l.head_sha===c.head'));
  assert.ok(!s.includes('l.head_sha===c.head&&Date.parse(l.expires_at||"")>Date.now()'));
});

test('single scheduled Watchdog shares a writer lease with targeted Core and conflict callbacks',()=>{
  const s=read('hh-pr-ten-minute-watchdog');
  assert.ok(s.includes('  reconcile:\n    # Protect real owner/scheduled PR work'));
  assert.ok(s.includes('hh-watchdog-inspection-only'));
  assert.ok(s.includes('hh-control-tower-single-writer'));
  assert.ok(s.includes("github.event_name == 'push'"));
  assert.ok(s.includes('inputs.dry_run == true'));
  assert.ok(s.includes('      cancel-in-progress: false'));
  assert.ok(!s.includes('concurrency:\n  group: hh-control-tower-single-writer'));
  const reconcile=s.split('\n  completion-wait:\n')[0];
  assert.ok(reconcile.includes("github.event.workflow_run.status == 'completed'"));
  assert.ok(reconcile.includes("github.event.workflow_run.conclusion == 'failure'"));
  assert.ok(reconcile.includes("github.event.workflow_run.event == 'pull_request'"));
  assert.ok(reconcile.includes("contains(fromJSON("));
  const direct=s.split('  direct-handoff:\n')[1]?.split('\n  reactivate-schedules-and-dispatch:\n')[0];
  assert.ok(direct.includes("github.event.workflow_run.event == 'pull_request'"));
  assert.ok(direct.includes("github.event.workflow_run.conclusion == 'failure'"));
  assert.ok(direct.includes("!contains(fromJSON("));
  assert.ok(read('hh-native-auto-merge').includes("github.event.workflow_run.conclusion == 'success'"));
});

test('Watchdog dispatches from durable CI and repair queue only when a slot exists',()=>{
  const {readFileSync}=require('node:fs');
  const s=readFileSync('scripts/ci-pr-ten-minute-watchdog.cjs','utf8');
  assert.ok(s.includes('const ciQueueBacklog=review.filter'));
  assert.ok(s.includes('const repairQueueBacklog=review.filter'));
  assert.ok(s.includes('(summary.ciBootstrapQueued || ciQueueBacklog) && ciRoom'));
  assert.ok(s.includes('summary.conflictLabelsQueued || repairQueueBacklog'));
  assert.ok(s.includes("inputs:{dry_run:'false'}"));
  assert.ok(s.includes("inputs:{pr_number:String(availableRepair?.number || 0)"));
  assert.ok(s.includes("expected_sha:availableRepair?.head?.sha || ''"));
});

test('successful Core event has exactly one live rate-bounded slot wakeup owner',()=>{
  const watchdog=read('hh-pr-ten-minute-watchdog');
  const native=read('hh-native-auto-merge');
  // This dead copy had no matching Core subscription and created skipped job
  // records on every unrelated Watchdog run.
  assert.ok(!watchdog.includes('  core-slot-wakeup:\n'));
  assert.ok(!watchdog.includes("      - 'HH PR core release gate'"));
  assert.ok(native.includes("      - 'HH PR core release gate'"));
  assert.ok(native.includes('  core-slot-wakeup:\n'));
  assert.ok(native.includes('name: core-ci-freed-slot-wakeup'));
  assert.ok(native.includes('group: hh-pr-core-slot-wakeup'));
  assert.ok(native.includes('cancel-in-progress: false'));
  assert.ok(native.includes("github.event.workflow_run.conclusion == 'success'"));
  assert.ok(native.includes('scripts/ci-pr-slot-wakeup.cjs'));
  assert.ok(native.includes('actions: write'));
});

test('separate Direction Watcher classifies all open PRs with a twenty-minute fallback',()=>{
  const s=read('hh-pr-direction-watcher');
  assert.ok(s.includes("cron: '1,21,41 * * * *'"));
  assert.ok(s.includes("branches: ['codex/bootstrap-books']"));
  assert.ok(s.includes("node --test tests/ci-pr-priority.test.cjs tests/ci-pr-direction-watcher.test.cjs"));
  // Several trusted rollouts use read or write PR permission; both are
  // compatible with issue-label writes. The required scope is issues: write.
  assert.ok(s.includes('pull-requests: read') ||
    s.includes('pull-requests: write'));
  assert.ok(s.includes('issues: write'));
  assert.ok(s.includes('persist-credentials: false'));
  assert.ok(s.includes("const dryRun=String(context.payload.inputs?.dry_run"));
});
test('Watchdog activates separate direction schedule and never creates legacy P0 labels',()=>{
  const s=read('hh-pr-ten-minute-watchdog');
  assert.ok(s.includes("'hh-pr-direction-watcher.yml'"));
  assert.ok(!s.includes("'hh:priority:'+tier"));
});

test('owner cron repair uses one safe lease and never equates reenable with schedule',()=>{
  const s=read('hh-pr-cron-owner-repair');
  assert.ok(s.includes('HH_CRON_OWNER_REPAIR_20261101'));
  assert.ok(s.includes("event:'schedule',per_page:1"));
  assert.ok(s.includes('history.total_count'));
  assert.ok(s.includes('HH_AUTOMERGE_TOKEN'));
  assert.ok(s.includes('ownerGithub.rest.actions.disableWorkflow'));
  assert.ok(s.includes('ownerGithub.rest.actions.enableWorkflow'));
  assert.ok(s.includes('github.rest.actions.enableWorkflow'));
  assert.ok(s.includes("after.state!=='active'"));
  assert.ok(s.includes("issue.state!=='open'"));
  assert.ok(s.includes("context.eventName==='workflow_dispatch'"));
  assert.ok(s.includes("default: true"));
  assert.ok(s.includes('Cron only recovers after a real event=schedule run'));
  assert.ok(!s.includes('pull_request:'));
  assert.ok(!s.includes('schedule:'));
});

test('one-time cron retry uses injected v9 getOctokit after verified pre-toggle failure',()=>{
  const s=read('hh-pr-cron-owner-repair');
  assert.ok(s.includes('uses: actions/github-script@v9'));
  assert.ok(s.includes('const ownerGithub=getOctokit(token);'));
  assert.ok(!s.includes("require('@actions/github')"));
  assert.ok(s.includes('HH_CRON_OWNER_REPAIR_RETRY_20261101'));
  assert.ok(s.includes('HH_CRON_OWNER_REPAIR_20261101'));
  assert.ok(s.includes("initial.length!==1"));
  assert.ok(s.includes('run_id:41347536058'));
  assert.ok(s.includes('c9e4ce27562ec4b2b58434903a00aeb5647afb25'));
  assert.ok(s.includes("failed.conclusion!=='failure'"));
  assert.ok(s.includes('getWorkflowRun'));
});

test('hourly coordinator verifies GitHub + Vercel LIVE independently of native merge',()=>{
 const s=read('hh-pr-full-inventory');
 assert.ok(s.includes('  verify-live:\n'));
 assert.ok(s.includes('name: independent production LIVE evidence + durable PR receipt'));
 assert.ok(s.includes('statuses: read'));
 assert.ok(s.includes('issues: write'));
 assert.ok(s.includes('hh-pr-live-receipt-single-writer'));
 assert.ok(s.includes('HH_PR_METRICS_PATH'));
 assert.ok(s.includes('ci-pr-release-kpi.cjs'));
 assert.ok(s.includes('node --test tests/ci-pr-live-verifier.test.cjs tests/ci-pr-release-kpi.test.cjs'));
 assert.ok(s.includes("scripts/ci-pr-live-verifier.cjs"));
 assert.ok(s.includes("secrets.VERCEL_TOKEN"));
 assert.ok(!s.includes('pull_request_target:'));
 const script=readFileSync('scripts/ci-pr-live-verifier.cjs','utf8');
 assert.ok(script.includes("deployment.target!=='production'"));
 assert.ok(script.includes("deployment.readyState!=='READY'"));
 assert.ok(script.includes("meta.githubCommitSha!==sha"));
 assert.ok(script.includes('aliasId!==deployId'));
 assert.ok(script.includes("reason:'LIVE_VERIFIED'"));
});

test('Vercel dispatch only starts LIVE evidence, never the PR merge scan',()=>{
 const s=read('hh-pr-full-inventory');
 assert.ok(s.includes("types: ['vercel.deployment.success', 'vercel.deployment.promoted']"));
 assert.ok(s.includes("if: github.event_name != 'repository_dispatch'"));
 assert.ok(s.includes("github.event.client_payload.environment == 'production'"));
 assert.ok(s.includes("hh-pr-full-inventory-" + '$' + "{{ github.event_name == 'repository_dispatch'"));
 assert.ok(s.includes("format('vercel-sha-{0}', github.event.client_payload.git.sha || github.run_id)"));
 assert.ok(s.includes("|| 'periodic'"));
 assert.ok(s.includes("cancel-in-progress: ${{ github.event_name == 'repository_dispatch' }}"));
 // Same-SHA Vercel events can supersede, but different SHA values must retain
 // independent leases. Unknown SHA must not cancel another deployment.
 assert.doesNotMatch(s, /'vercel-event' \|\| 'periodic'/);
});

test('Worker completion refills Watchdog directly; Control Tower remains read-only',()=>{
  const repair=read('hh-pr-repair-worker'),ci=read('hh-pr-ci-worker');
  const observer=read('hh-pr-queue-dispatcher'),watchdog=read('hh-pr-ten-minute-watchdog');
  assert.ok(repair.includes("kind:'repair',status:result.status"));
  assert.match(ci, /kind:'ci',\s*status:result\.metadataEditAccepted\?'requested':'skipped'/);
  assert.ok(watchdog.includes('completion_wake:'));
  assert.ok(watchdog.includes('relayCompletionWake'));
  assert.ok(watchdog.includes('worker_run_id:'));
  assert.ok(watchdog.includes('group: hh-control-tower-single-writer'));
  assert.ok(watchdog.includes('const report=await run({github,core,context,dryRun})'));
  assert.ok(observer.includes('dryRun:true'));
  assert.ok(!observer.includes('createWorkflowDispatch('));
});
test('hourly native merge requires explicit verified release for modern active ownership',()=>{
 const yml=read('hh-pr-full-inventory');
 assert.ok(yml.includes('leases.delete(key)'));
 assert.ok(yml.includes('lease.previous_head_sha!==c.head'));
 assert.ok(yml.includes('const key=actor+":"+owner+":"+leaseId'));
 assert.ok(yml.includes('Untrusted release author'));
 assert.ok(yml.includes('lease.historical_expiry_allowed=true'));
 assert.ok(yml.includes('l.historical_expiry_allowed!==true'));
 assert.ok(!yml.includes('force:true'));
});

test('auto-merge pins production SHA for revalidated isolated CI policy, not only strict sensitive PRs',()=>{
  const native=read('hh-native-auto-merge');
  assert.ok(native.includes('freshness.reason==="SENSITIVE_BASE_VERIFIED" ||'));
  assert.ok(native.includes('freshness.reason==="ISOLATED_CI_PUBLIC_MEDIA_REVALIDATED"'),
    'independent policy/media proof must be checked again before ARM');
  assert.ok(native.includes('core.setOutput("verified_base",freshness.base)'));
  assert.ok(native.includes('PR_REQUIRES_CURRENT_BASE: ${{ steps.freshness.outputs.requires_current_base }}'));
  assert.ok(native.includes('if [[ "$PR_REQUIRES_CURRENT_BASE" == true ]]; then'));
  assert.ok(native.includes('if [[ "$current_base" != "$PR_VERIFIED_BASE" ]]; then'));
  assert.ok(native.includes('--match-head-commit "$PR_HEAD"'),
    'exact source HEAD remains mandatory on both routes');
});

test('current singleton merge gate keeps legacy read compatibility without admin migration',()=>{
  const auto=read('hh-native-auto-merge');
  assert.ok(auto.includes('const allowedRequiredSets = new Map(['));
  assert.ok(auto.includes('["release-ready", ["hh-core-verified", "hh-specialist", "release-ready"]]'));
  assert.ok(auto.includes('["hh-merge-check", ["hh-merge-check"]]'));
  assert.ok(auto.includes('["hh-merge-check,release-ready", ["hh-merge-check", "release-ready"]]'));
  assert.ok(auto.includes('const notPassed = need.filter(name => !passed(name))'));
  assert.ok(auto.includes('jobPage.total_count !== jobs.length'));
  assert.ok(auto.includes('required.length !== new Set(required).size || !need'));
  assert.ok(!auto.includes("oldRequired === coreRequired"));
  assert.equal(require('node:fs').existsSync('.github/workflows/hh-migrate-legacy-core-check.yml'),false,
    'retired privileged ruleset migration must no longer be dispatchable');
});

test('live workers avoid duplicate unit suites while changes retain the full contract gate',()=>{
  const contract=read('hh-pr-watchdog-contract-ci');
  for(const file of [
    'ci-pr-slot-wakeup','ci-pr-priority','ci-pr-ci-worker',
    'ci-pr-repair-worker','ci-pr-repair-test-scope','ci-pr-orchestration-triggers'
  ])assert.ok(contract.includes('tests/'+file+'.test.cjs'),file+' contract coverage');

  const slot=read('hh-native-auto-merge').split('\n  core-slot-wakeup:\n')[1]?.split('\n  recover-interrupted-core:\n')[0];
  assert.ok(slot && !slot.includes('node --test'),'slot wake remains lightweight');
  assert.ok(slot.includes('scripts/ci-pr-slot-wakeup.cjs'));

  const ci=read('hh-pr-ci-worker');
  assert.ok(!ci.includes('node --test'),'CI worker live job does not rerun unit tests');
  assert.ok(ci.includes('node --check scripts/ci-pr-ci-worker.cjs'));
  const repairClaim=read('hh-pr-repair-worker').split('\n  fix:\n')[0];
  assert.ok(!repairClaim.includes('node --test'),'repair claim does not rerun unit tests');
  assert.ok(repairClaim.includes('node --check scripts/ci-pr-repair-worker.cjs'));
  assert.ok(repairClaim.includes('node --check scripts/ci-pr-repair-test-scope.cjs'));
});

test('inventory reports both valid merge destinations without false main-branch warnings',()=>{
 const source=read('hh-pr-full-inventory');
 assert.ok(source.includes('CONTROL="codex/bootstrap-books"'));
 assert.ok(source.includes('production-base: '));
 assert.ok(source.includes('control-base: '));
 assert.ok(source.includes('other/stacked-base: '));
 assert.ok(source.includes('MERGED_PRODUCTION'));
 assert.ok(source.includes('LIVE requires served deployment proof'));
 assert.ok(!source.includes('other-base: "+(all.length-production.length)'));
});

test('trusted PR synchronize cancels only ancestor-proven stale HEADs, never arms early AutoMerge',()=>{
  const native=read('hh-native-auto-merge');
  const enable=native.split('  enable:\n')[1]?.split('  recover-interrupted-core:\n')[0];
  const prune=native.split(/^  prune-head:\s*$/m)[1];
  assert.ok(enable && prune, 'both isolated jobs must remain');
  assert.ok(native.includes('types: [opened, reopened, synchronize, ready_for_review]'), 'native event coalesces PR conflict and stale janitor');
  assert.ok(!read('hh-pr-ten-minute-watchdog').includes('  pull_request_target:'),'watchdog must not create second PR event wrapper');
  assert.ok(!enable.includes("github.event_name == 'pull_request_target'"),
    'Native AutoMerge must not arm or run on opened/Ready before exact-HEAD Core');
  assert.ok(enable.includes("github.event.workflow_run.conclusion == 'success'"), 'post-Core ARM retained');
  assert.ok(prune.includes("github.event.action == 'synchronize'"));
  assert.ok(prune.includes("github.event.pull_request.base.ref == 'codex/public-book-library'"));
  assert.ok(prune.includes('github.event.pull_request.head.repo.full_name == github.repository'));
  assert.ok(prune.includes('ref: codex/public-book-library'));
  assert.ok(prune.includes('persist-credentials: false'));
  assert.ok(prune.includes('actions: write'));
  assert.ok(prune.includes('HH_CI_PRUNE_LIMIT: ' + "'60'"));
  assert.ok(prune.includes('node --check scripts/ci-prune-stale-runs.mjs'));
  assert.ok(prune.includes('node scripts/ci-prune-stale-runs.mjs'));
  assert.match(prune,/^    runs-on: ubuntu-slim$/m,
    'API-only janitor avoids full Ubuntu on every PR synchronize');
  assert.match(prune,/^    timeout-minutes: 12$/m,
    'existing bounded cleanup timeout remains');
  assert.match(prune,/sparse-checkout-cone-mode: false/);
  assert.match(prune,/^            scripts\/ci-prune-stale-runs\.mjs$/m);
  assert.doesNotMatch(prune,/actions\/setup-node|node --test|npm ci|npm run build/,
    'per-sync CI must not rerun tests already owned by production CI');
  assert.match(prune,/^      actions: write$/m,
    'janitor retains scoped cancellation permission');
  assert.match(prune,/^          GITHUB_TOKEN: \$\{\{ github\.token \}\}$/m,
    'unchanged protected Actions token required');
  assert.ok(prune.includes('cancel-in-progress: true'));
  assert.ok(!prune.includes('ref: ' + '$' + '{{ github.event.pull_request.head.sha'));
  assert.ok(!prune.includes('--force') && !prune.includes('gh pr merge'));
});

test('interrupted Core recovery never resubmits intentional cancellation or a stale HEAD',()=>{
  const native=read('hh-native-auto-merge');
  const recover=native.split('  recover-interrupted-core:\n')[1]?.split('  prune-head:\n')[0];
  assert.ok(recover, 'trusted infra-only recovery must remain');
  assert.ok(recover.includes('new Set(["timed_out","startup_failure"])'));
  assert.ok(recover.includes('reRunJobForWorkflowRun'), 'only interrupted job is retried');
  // The ONLY whole-run exception is a jobless first-attempt startup failure:
  // no successful job exists to repeat. All ordinary interruptions stay targeted.
  assert.ok(recover.includes('reRunWorkflow('), 'jobless startup needs a full retry');
  assert.ok(recover.includes('event.conclusion==="startup_failure" && jobs.total_count===0'));
  assert.ok(recover.includes('selectJoblessStartupRerun'));
  assert.ok(recover.includes('joblessStartupReference'));
  assert.ok(recover.includes('decision.action==="rerun_workflow"'));
  assert.ok(recover.includes('!runs.some(r=>r.id===event.id)'));
  assert.ok(!recover.includes('new Set(["cancelled"'), 'superseded HEAD cancellations cannot be retried');
  assert.ok(recover.includes('parents[1]?.sha !== live.head.sha'));
  assert.ok(recover.includes('parents[0]?.sha !== live.base.sha'));
});

test('successful Core CI refills capacity through the unified event runner without waiting for Watchdog',()=>{
 const direct=read('hh-native-auto-merge');
 const watchdog=read('hh-pr-ten-minute-watchdog');
 assert.ok(direct.includes('  core-slot-wakeup:'));
 assert.ok(direct.includes('group: hh-pr-core-slot-wakeup'));
 assert.ok(direct.includes("github.event.workflow_run.conclusion == 'success'"));
 assert.ok(direct.includes('scripts/ci-pr-slot-wakeup.cjs'));
 assert.ok(direct.includes("HH PR core release gate"));
 assert.ok(watchdog.includes('  direct-handoff:'));
 assert.ok(watchdog.includes('  reconcile:'));
 assert.ok(!watchdog.includes("      - 'HH PR core release gate'"));
});


test('opened/Ready telemetry shares native PR-target wrapper; native merge still waits for exact Core',()=>{
  const native=read('hh-native-auto-merge');
  const watchdog=read('hh-pr-ten-minute-watchdog');
  const helper=readFileSync('scripts/ci-pr-conflict-event-handoff.cjs','utf8');
  const enable=native.split('  enable:\n')[1]?.split('  recover-interrupted-core:\n')[0];
  assert.ok(enable,'trusted native enable gate must remain');
  assert.ok(native.includes('types: [opened, reopened, synchronize, ready_for_review]'),
    'native PR-target reuses one wrapper for Ready/conflict + obsolete HEAD cancellation');
  assert.ok(!enable.includes("github.event_name == 'pull_request_target'"),
    'opened/Ready never arms native merge without new Core');
  assert.ok(native.includes('publishReadyStage({github,context})'),
    'already running native PR event must preserve Ready evidence');
  assert.ok(!watchdog.includes('  pull_request_target:'),
    'watchdog must not dispatch a second per-PR event');
  assert.ok(helper.includes("['opened','ready_for_review']"),
    'only actual opened/Ready can be recorded');
  assert.ok(helper.includes("source:opened?'pr_opened_ready':'ready_event_observed'"),
    'original authentic source types preserved');
  assert.ok(helper.includes('live.head?.sha!==eventPr.head.sha'),
    'Ready receipt requires exact same source HEAD');
  assert.ok(helper.includes("require('./ci-pr-stage-receipts.cjs')"),
    'use authenticated timestamp format, never a fake check');
  assert.ok(helper.includes('createComment'),
    'Ready evidence remains a metadata-only comment');
  assert.ok(native.includes("github.event.workflow_run.conclusion == 'success'"),
    'Native AutoMerge remains event-driven on completed successful Core');
  assert.ok(native.includes("steps.safety.outputs.eligible == 'true'"),
    'mandatory protected lease/reviewer/Guard still checked');
  assert.ok(native.includes('const currentRuns = [];'),
    'exact-head Core history pagination retained');
  assert.ok(!native.includes('DEFER_READY_EVENT_UNTIL_EXACT_HEAD_CORE_SUCCESS'),
    'removed standalone Ready-only runner');
});
test('watchdog contracts execute the immutable-base freshness suite once per CI wave',()=>{
  const source=read('hh-pr-watchdog-contract-ci');
  const command=source.split('      - name: Watchdog decision contracts\n')[1]?.split('\n      - name:')[0]||'';
  assert.ok(command.includes('node --test tests/ci-pr-core-tested-base-logs.test.cjs'));
  assert.equal((command.match(/tests\/ci-pr-base-freshness\.test\.cjs/g)||[]).length,1,
    'repeated test path wastes a runner without adding coverage');
});

test('four bounded Watchdog control jobs retain slim; conflict uses native PR-target wrapper',()=>{
  const w=read('hh-pr-ten-minute-watchdog');
  const native=read('hh-native-auto-merge');
  const jobs=[['reconcile',8],['completion-wait',3],
    ['direct-handoff',8],['reactivate-schedules',5]];
  for(const [name,timeout] of jobs){
    const marker='  '+name+':\n';
    assert.equal(w.split(marker).length,2,'exactly one control job: '+name);
    const source=w.split(marker)[1].split(/\n  [a-z][a-z0-9-]*:\n/)[0];
    assert.match(source,/^    runs-on: ubuntu-slim$/m,name+' remains lightweight');
    assert.ok(timeout<=15,'must respect the 15-minute slim hard cap');
    assert.match(source,new RegExp('^    timeout-minutes: '+timeout+'$','m'),name+' timeout preserved');
    assert.doesNotMatch(source,/npm ci|npm run build|docker|apt-get|sudo|playwright|ffmpeg/i,
      name+' must not perform heavy compilation or privileged container operations');
  }
  assert.equal((w.match(/    runs-on: ubuntu-slim/g)||[]).length,jobs.length);
  assert.doesNotMatch(w,/^  issue_comment:/m,
    'unrelated PR discussion must not start a new Watchdog Action');
  assert.match(w,/^  schedule:\n    - cron: '13,33,53 \* \* \* \*'$/m);
  assert.match(w,/^  workflow_dispatch:/m);
  assert.match(w,/group: hh-control-tower-single-writer/);
  assert.match(w,/^  workflow_run:$/m);
  assert.doesNotMatch(w,/^  pull_request_target:$/m);
  const conflict=native.split('  conflict-event-handoff:\n')[1]?.split('\n  prune-head:\n')[0];
  assert.ok(conflict);
  assert.match(conflict,/^    runs-on: ubuntu-slim$/m);
  assert.match(conflict,/^    timeout-minutes: 5$/m);
  assert.match(conflict,/group: hh-conflict-event-pr-/);
  assert.doesNotMatch(conflict,/group: hh-control-tower-single-writer/,
    'PR-local conflict hints cannot reserve the shared Watchdog writer');
  assert.match(conflict,/queueOnly:true/);
  assert.match(w,/HH PR 10-minute watchdog/);
  assert.doesNotMatch(w,/continue-on-error:\s*true/);
});

test('bounded AutoMerge/Dispatcher/API workers use slim without changing their full-runner safeguards',()=>{
  const cases=[
    ['hh-native-auto-merge',[['enable',5],['recover-interrupted-core',4]]],
    ['hh-pr-queue-dispatcher',[['observe',8]]],
    ['hh-pr-ci-worker',[['bootstrap',6]]],
    ['hh-pr-direction-watcher',[['classify',8]]],
  ];
  for(const [workflowName,jobs] of cases){
    const workflow=read(workflowName);
    for(const [job,timeout] of jobs){
      const section=workflow.split('  '+job+':\n')[1]?.split(/\n  [a-z][a-z0-9-]*:\n/)[0];
      assert.ok(section,workflowName+'/'+job+' must exist');
      assert.match(section,/^    runs-on: ubuntu-slim$/m,job+' API runner must be slim');
      assert.match(section,new RegExp('^    timeout-minutes: '+timeout+'$','m'));
      assert.ok(timeout<15,'slim hard cap respected');
      assert.match(section,/actions\/github-script@v7/,'must be a bounded API script');
      assert.doesNotMatch(section,/npm ci|npm run build|docker|apt-get|sudo|playwright|ffmpeg|denoland\/setup-deno/i,
        'no heavyweight suites on slim');
    }
  }
  const native=read('hh-native-auto-merge');
  const prune=native.split('  prune-head:\n')[1];
  assert.match(prune,/^    runs-on: ubuntu-slim$/m,
    'trusted API-only janitor may use slim; source/CI required gates remain unchanged');
  assert.match(native,/^  workflow_run:\n    workflows:\n      - 'HH PR core release gate'/m);
  assert.match(native,/hh-merge-check/);
  assert.match(native,/hh-specialist/);
  const dispatch=read('hh-pr-queue-dispatcher');
  const contract=dispatch.split('  contract:\n')[1]?.split(/\n  [a-z][a-z0-9-]*:\n/)[0];
  assert.match(contract,/^    runs-on: ubuntu-24\.04$/m,'dedicated contract tests keep full runner');
  const ci=read('hh-pr-ci-worker');
  assert.match(ci,/reservation_run_id/,'signed per-PR reservation retained');
  const repair=read('hh-pr-repair-worker');
  assert.match(repair,/^    runs-on: ubuntu-24\.04$/m,'source repair remains full Ubuntu');
  assert.doesNotMatch(native,/continue-on-error:\s*true/);
});

// Trusted short API/receipt control jobs, including the isolated OIDC inbox,
// may use the existing slim runner; Code Fix/Verify/Publisher stay full Ubuntu.
test('Four short failure/repair control jobs use slim with every safety gate retained',()=>{
  const cases=[
    ['hh-pr-direct-core-failure',[['direct-core-failure',10]]],
    ['hh-native-auto-merge',[['core-slot-wakeup',3]]],
    ['hh-pr-repair-worker',[['claim',5],['finalize',7]]],
  ];
  for(const [workflow,jobs] of cases){
    const source=read(workflow);
    for(const [job,minutes] of jobs){
      const section=source.split('  '+job+':\n')[1]?.split(/\n  [a-z_][a-z0-9_-]*:\n/)[0];
      assert.ok(section,workflow+'/'+job+' job is present');
      assert.match(section,/^    runs-on: ubuntu-slim$/m,'runner regression '+workflow+'/'+job);
      assert.match(section,new RegExp('^    timeout-minutes: '+minutes+'$','m'));
      assert.ok(minutes<15,'slim maximum is respected');
      assert.match(section,/actions\/github-script@v7/);
      assert.doesNotMatch(section,/npm ci|npm run build|playwright|ffmpeg|docker|apt-get|sudo/i);
    }
  }
  const repair=read('hh-pr-repair-worker');
  for(const job of ['fix','code_fix','code_verify','publish']){
    const section=repair.split('  '+job+':\n')[1]?.split(/\n  [a-z_][a-z0-9_-]*:\n/)[0];
    assert.ok(section,job+' source jobs are still present');
    assert.match(section,/^    runs-on: ubuntu-24\.04$/m,
      'source writing, build verification and publishing stay on full Ubuntu');
  }
  const direct=read('hh-pr-direct-core-failure');
  const intake=direct.split('  ci_event_intake:\n')[1]?.split(/\n  [a-z_][a-z0-9_-]*:\n/)[0];
  assert.match(intake,/^    runs-on: ubuntu-slim$/m,'OIDC-only inbox does not occupy Core runner');
  assert.match(intake,/id-token: write/,'signed OIDC receipt remains authorized');
  assert.match(intake,/persistReadOnlyRoute/,'durable routing receipt remains present');
  assert.match(direct,/github.event.workflow_run.conclusion == 'failure'/);
  assert.match(direct,/recoverBaseAdvanced/,'exact-HEAD BASE recovery remains guarded');
  assert.match(repair,/HH_AUTOMERGE_TOKEN/);
  assert.doesNotMatch(direct,/continue-on-error:\s*true/);
});

test('failed-Core BASE recovery separates read-only workflow token from guarded owner branch update',()=>{
 const workflow=read('hh-pr-direct-core-failure');
 const span=workflow.split('      - name: Refresh exactly the proven BASE_ADVANCED PR\n')[1]
   ?.split('      - name: Recover one infrastructure-only job inside existing failed-Core handoff\n')[0];
 assert.ok(span,'BASE_ADVANCED recovery step must remain present');
 assert.match(span,/github-token: \$\{\{ github\.token \}\}/,
  'GITHUB_TOKEN must read Core, Specialist logs and source leases');
 assert.match(span,/HH_AUTOMERGE_TOKEN: \$\{\{ secrets\.HH_AUTOMERGE_TOKEN \}\}/,
  'owner credential is scoped only to the guarded mutation step');
 assert.match(span,/hasOwnerToken:Boolean\(token\),ownerToken:token,fetcher:fetch/,
  'the recovered PR HEAD needs an authenticated single owner writer');
 assert.doesNotMatch(span,/github-token: \$\{\{ secrets\.HH_AUTOMERGE_TOKEN/,
  'owner PAT must not inspect restricted Actions logs or consume its rate budget');
 const code=require('node:fs').readFileSync('scripts/ci-pr-base-advanced-recovery.cjs','utf8');
 assert.match(code,/expected_head_sha:head/);
 assert.match(code,/OWNER_TOKEN_IDENTITY_MISMATCH/);
 assert.match(code,/OWNER_BRANCH_UPDATE_HTTP_/);
 assert.match(code,/externalOwnerLeaseStatus\(comments,sourceSha,now\)/);
 assert.match(code,/validatedJobEvidence\(jobData\)/);
 assert.match(code,/isActualBaseAdvancedLog\(logs\)/);
 assert.doesNotMatch(code,/force:true|createCheckRun|check-runs\/.+POST/);
});

test('two hourly full-inventory API and LIVE receipt jobs reuse slim without weakening protected gates',()=>{
 const source=read('hh-pr-full-inventory');
 for(const [name,minutes] of [['reconcile',10],['verify-live',8]]){
  const section=source.split('  '+name+':\n')[1]?.split(/\n  [a-z][a-z0-9-]*:\n/)[0];
  assert.ok(section,name+' must retain the same job');
  assert.match(section,/^    runs-on: ubuntu-slim$/m);
  assert.match(section,new RegExp('^    timeout-minutes: '+minutes+'$','m'));
  assert.ok(minutes<15,'slim execution must be bounded');
  assert.match(section,/actions\/github-script@v7/);
  assert.doesNotMatch(section,/npm ci|npm run build|npm install|playwright|docker|ffmpeg|sudo/i);
 }
 const reconcile=source.split('  reconcile:\n')[1]?.split('\n  verify-live:\n')[0];
 const live=source.split('  verify-live:\n')[1];
 assert.match(reconcile,/^\s+if: github\.event_name != 'repository_dispatch'$/m);
 assert.match(reconcile,/required_status_checks/);
 assert.match(reconcile,/hh-merge-check/);
 assert.match(live,/group: hh-pr-live-receipt-single-writer/);
 assert.match(live,/scripts\/ci-pr-live-verifier\.cjs/);
 assert.match(live,/scripts\/ci-pr-release-kpi\.cjs/);
 assert.match(live,/actions\/upload-artifact@v4/);
 assert.match(source,/cron: '17 \* \* \* \*'/);
 assert.doesNotMatch(source,/continue-on-error:\s*true/);
});


test('background control schedules halve native runner ticks without weakening event-driven PR gates',()=>{
 const watchdog=read('hh-pr-ten-minute-watchdog');
 const direction=read('hh-pr-direction-watcher');
 const ci=read('hh-pr-ci-worker');
 const cronTicks=source=>{
   const match=source.match(/^    - cron: '([^']+)'$/m);
   assert.ok(match,'existing schedule absent');
   const parts=match[1].trim().split(/\s+/);
   assert.equal(parts.length,5);
   return parts[0].split(',').length;
 };
 assert.equal(cronTicks(watchdog),3);
 assert.equal(cronTicks(direction),3);
 assert.equal(cronTicks(ci),1);
 assert.equal([watchdog,direction,ci].reduce((sum,s)=>sum+cronTicks(s),0),7,
   'these three native backup schedules must use 7, not 14, ticks/hour');
 assert.match(read('hh-native-auto-merge'),/^  pull_request_target:\n(?:    #[^\n]*\n)*    types: \[opened, reopened, synchronize, ready_for_review\]/m);
 assert.doesNotMatch(watchdog,/^  pull_request_target:/m);
 assert.match(watchdog,/^  workflow_run:\n/m);
 assert.match(watchdog,/^  workflow_dispatch:\n/m);
 assert.match(watchdog,/group: hh-control-tower-single-writer/);
 assert.match(direction,/^  workflow_dispatch:\n/m);
 assert.match(ci,/^  workflow_dispatch:\n/m);
 assert.match(ci,/reservation_run_id:/);
 assert.match(ci,/HH_CI_SCHEDULE_FALLBACK/);
});


test('hourly Vercel dedupes exact SHA across v6 readyState and state',()=>{
 const workflow=read('hh-hourly-vercel-production');
 const {spawnSync}=require('node:child_process');
 const match=workflow.match(/jq -e --arg sha "\$head_sha" '([^']+)'/);
 assert.ok(match,'SHA-scoped Vercel duplicate filter missing');
 const filter=match[1];
 assert.match(filter,/\(\.readyState \/\/ \.state\) as \$status/);
 const sha='a'.repeat(40),different='b'.repeat(40);
 const sample=(commit,status)=>({meta:{githubCommitSha:commit},...status});
 const check=(records,expected)=>{
   const out=spawnSync('jq',['-e','--arg','sha',sha,filter],{
     input:JSON.stringify({deployments:records}),encoding:'utf8',timeout:5000,
   });
   assert.equal(out.error,undefined,'jq must be available in existing hosted runner');
   assert.equal(out.status,expected?0:1,out.stderr);
   assert.equal(out.stdout.trim(),expected?'true':'false');
 };
 check([sample(sha,{readyState:'READY'})],true);
 check([sample(sha,{state:'READY'})],true);
 check([sample(sha,{state:'BUILDING'})],true);
 check([sample(sha,{readyState:'QUEUED'})],true);
 check([sample(sha,{state:'INITIALIZING'})],true);
 check([sample(different,{state:'READY'})],false);
 check([sample(sha,{state:'ERROR'})],false);
 check([sample(sha,{state:'CANCELED'})],false);
 check([{meta:{},state:'READY'}],false);
 check([],false);
 assert.match(workflow,/target=production&limit=100/,
   'a single bounded GET covers recent production deployments');
 assert.match(workflow,/cron: '13,43 \* \* \* \*'/);
  assert.ok(workflow.includes("github.event.schedule == '13,43 * * * *'"),
    'publisher schedule predicate must match its only routine cron');
  assert.match(workflow,/cutoff_ms=.*5400000/,
    'rolling 90-minute budget cap remains enforceable for both cron chances');
 assert.match(workflow,/if \[\[ "\$EMERGENCY" != "true" && "\$PREBUILT_TEST" != "true" \]\]; then/);
 assert.match(workflow,/\[\[ "\$latest" == "\$EXPECTED_SHA" \]\]/,
   'protect latest source HEAD before Vercel release');
 assert.match(workflow,/cancel-in-progress: false/);
});


test('normal Vercel production batch allows at most one requested deployment per UTC hour',()=>{
 const workflow=read('hh-hourly-vercel-production');
 const {spawnSync}=require('node:child_process');
 const marker='jq -e --argjson hour_start_ms "$hour_start_ms" \'';
 const start=workflow.indexOf(marker);
 assert.ok(start>=0,'UTC-hour deployment guard must be present');
 const filter=workflow.slice(start+marker.length).split("'")[0];
 const hour=1794765600000;
 const check=(records,expected)=>{
  const result=spawnSync('jq',['-e','--argjson','hour_start_ms',String(hour),filter],{
    input:JSON.stringify({deployments:records}),encoding:'utf8',timeout:5000,
  });
  assert.equal(result.error,undefined,'jq available on trusted runner');
  assert.equal(result.status,expected?0:1,result.stderr);
  assert.equal(result.stdout.trim(),expected?'true':'false');
 };
 check([],false);
 check([{target:'preview',created:hour+1,state:'READY'}],false);
 check([{target:'production',created:hour-1,state:'READY'}],false);
 check([{target:'production',created:hour+1,state:'READY'}],true);
 check([{target:'production',createdAt:hour+1,state:'BUILDING'}],true);
 check([{target:'production',created:hour+1,state:'ERROR'}],true);
 assert.ok(workflow.includes('type == "number"'),'unknown API timestamps must fail closed');
 // The previously accepted GitSource API request is intentionally minimal.
 // GitHub Actions provides the scheduled run / UTC-hour audit provenance.
 assert.doesNotMatch(workflow,/meta:\{hhReleaseController/,
   'do not reintroduce optional POST metadata that preceded the HTTP 400 regression');
 assert.match(workflow,/payload=.*gitSource:/,
   'release still targets the exact GitHub source SHA');
 assert.match(workflow,/http_status=.*curl -sS --max-time 30/,
   'record Vercel response status without logging request or response bodies');
 assert.match(workflow,/code=\$error_code/,
   'capture bounded vendor error codes for diagnosis');
 assert.match(workflow,/No automatic retry/,
   'do not duplicate a possibly accepted production POST');
 assert.match(workflow,/if \[\[ "\$EMERGENCY" != "true" && "\$PREBUILT_TEST" != "true" \]\]; then/);
});

test('PR-target event consolidation keeps protected conflict, Ready stage, source prune and Core-only merge',()=>{
 const native=read('hh-native-auto-merge'),watchdog=read('hh-pr-ten-minute-watchdog');
 const target=native.split('  pull_request_target:\n')[1]?.split('\n  pull_request_review:\n')[0];
 assert.ok(target);
 assert.match(target,/types: \[opened, reopened, synchronize, ready_for_review\]/);
 assert.equal((native.match(/^  pull_request_target:$/gm)||[]).length,1);
 assert.doesNotMatch(watchdog,/^  pull_request_target:$/m);
 const conflict=native.split('  conflict-event-handoff:\n')[1]?.split('\n  prune-head:\n')[0];
 const prune=native.split('  prune-head:\n')[1];
 assert.ok(conflict&&prune);
 assert.match(conflict,/group: hh-conflict-event-pr-/);
 assert.doesNotMatch(conflict,/group: hh-control-tower-single-writer/,
   'PR-local conflict hints cannot reserve the shared Watchdog writer');
 assert.match(conflict,/queueOnly:true/);
 assert.match(conflict,/ref: codex\/bootstrap-books/);
 assert.match(conflict,/persist-credentials: false/);
 assert.match(conflict,/publishReadyStage/);
 assert.match(conflict,/HH_CONFLICT_EVENT_HINT/);
 assert.match(conflict,/HH_PR_DIRECTION_EVENT_SEED/);
 assert.match(conflict,/HH_PR_EVENT_WATCHDOG_LIVENESS/);
 assert.match(conflict,/result\.labelAdded===true/);
 assert.doesNotMatch(conflict,/HH_PR_EVENT_CI_DAYTIME_SIGNAL/,
   'shared monitor writes remain in the scheduled Watchdog');
 assert.match(prune,/github.event.action == 'synchronize'/);
 assert.match(prune,/node scripts\/ci-prune-stale-runs\.mjs/);
 const enable=native.split('  enable:\n')[1]?.split('\n  failed-core-handoff:\n')[0];
 assert.ok(enable);
 assert.doesNotMatch(enable,/github.event_name == 'pull_request_target'/);
 assert.match(enable,/github.event.workflow_run.conclusion == 'success'/);
 assert.match(native,/  workflow_run:/);
 assert.doesNotMatch(native,/continue-on-error:\s*true/);
});


test('hourly Vercel skips only fully proven CI-only delta including existing CI contract tests',()=>{
 const workflow=read('hh-hourly-vercel-production');
 const {spawnSync}=require('node:child_process');
 const marker='jq -e --arg live "$live_sha" --arg head "$head_sha" '+String.fromCharCode(39);
 const start=workflow.indexOf(marker);
 assert.ok(start>=0,'existing full LIVE-to-HEAD Compare proof is required');
 const filter=workflow.slice(start+marker.length).split(String.fromCharCode(39))[0];
 const live='a'.repeat(40),head='b'.repeat(40);
 const base={status:'ahead',behind_by:0,base_commit:{sha:live},merge_base_commit:{sha:live},
  ahead_by:1,total_commits:1,commits:[{sha:head}]};
 const f=(filename,status='modified',extra={})=>({filename,status,...extra});
 const y=f('.github/workflows/ia-v2.yml'),a=f('tests/ci-workflow-globs.test.mjs'),
   b=f('tests/ci-heavy-impact.test.mjs'),c=f('tests/pr-fast-lane.test.mjs');
 const check=(files,expected,extra={})=>{
  const result=spawnSync('jq',['-e','--arg','live',live,'--arg','head',head,filter],
   {input:JSON.stringify({...base,files,...extra}),encoding:'utf8',timeout:5000});
  assert.equal(result.error,undefined);
  assert.equal(result.status,expected?0:1,result.stderr);
  assert.equal(result.stdout.trim(),expected?'true':'false');
 };
 check([y],true); check([y,a,b,c],true); check([a],true);
 // #5609 modifies only the existing CI CLI validator and its test; neither
 // is a Next build/prebuild entry. Never generalize to arbitrary scripts.
 const validator=f('scripts/ci-specialist-aggregate.mjs');
 const validatorTest=f('tests/ci-specialist-wait.test.mjs');
 check([validator,validatorTest],true);
 check([validator],true);check([validatorTest],true);
 check([y,a,validator,validatorTest],true);
 check([validator,f('app/page.tsx')],false);
 check([validator,f('package.json')],false);
 check([validator,f('middleware.ts')],false);
 check([f(validator.filename,'added')],false);
 check([f(validatorTest.filename,'removed')],false);
 check([f(validator.filename,'modified',{previous_filename:'app/page.tsx'})],false);
 check([f('scripts/build-public-card-artwork.mjs')],false);
 check([f('lib/ci/other.mjs')],false);
 check([y,f('tests/coaching.test.mjs')],false);
 check([a,f('app/page.tsx')],false);
 check([y,f(a.filename,'added')],false);
 check([f(a.filename,'removed')],false);
 check([f(a.filename,'modified',{previous_filename:'app/page.tsx'})],false);
 check([a],false,{behind_by:1});
 check([a],false,{commits:[{sha:'c'.repeat(40)}]});
 check(Array.from({length:300},()=>y),false);
 check([a],false,{ahead_by:2,total_commits:2});
 check([],false); check([a],false,{status:'diverged'});
 assert.match(workflow,/cutoff_ms=.*5400000/);
 assert.match(workflow,/\[\[ "\$latest" == "\$EXPECTED_SHA" \]\]/);
});
