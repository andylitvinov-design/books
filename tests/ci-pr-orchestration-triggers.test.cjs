'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const read=name=>readFileSync('.github/workflows/'+name+'.yml','utf8');
test('watchdog has independent cron; failed Core is a direct event workflow',()=>{
  const s=read('hh-pr-ten-minute-watchdog');
  const direct=read('hh-pr-direct-core-failure');
  assert.ok(s.includes("cron: '7,17,27,37,47,57 * * * *'"));
  for(const tag of ['HH watchdog / dry run','HH watchdog / completion wake',
    'HH watchdog / direct handoff','HH watchdog / reconcile'])
    assert.ok(s.includes(tag),'Watchdog must distinguish real reconcile from no-op dispatch '+tag);
  assert.ok(!s.includes("      - 'HH PR core release gate'"));
  assert.ok(!s.includes("  failed-core-event-handoff:"));
  assert.ok(s.includes("      - 'HH PR source Repair Worker'"));
  assert.ok(s.includes("      - 'HH zero-cost PR CI worker'"));
  assert.ok(direct.includes("      - 'HH PR core release gate'"));
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
 assert.ok(s.includes("cron: '3,33 * * * *'"));
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
  assert.ok(read('hh-pr-full-inventory').includes("cron: '27 * * * *'"));
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
  assert.ok(s.includes('  reconcile:\n    # Watchdog and its dispatcher'));
  assert.ok(s.includes('    concurrency:\n      group: hh-control-tower-single-writer'));
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
  const direct=read('hh-pr-direct-core-failure');
  // This dead copy had no matching Core subscription and created skipped job
  // records on every unrelated Watchdog run.
  assert.ok(!watchdog.includes('  core-slot-wakeup:\n'));
  assert.ok(!watchdog.includes("      - 'HH PR core release gate'"));
  assert.ok(direct.includes("      - 'HH PR core release gate'"));
  assert.ok(direct.includes('  core-slot-wakeup:\n'));
  assert.ok(direct.includes('name: core-ci-freed-slot-wakeup'));
  assert.ok(direct.includes('group: hh-pr-core-slot-wakeup'));
  assert.ok(direct.includes('cancel-in-progress: false'));
  assert.ok(direct.includes("github.event.workflow_run.conclusion == 'success'"));
  assert.ok(direct.includes('scripts/ci-pr-slot-wakeup.cjs'));
  assert.ok(direct.includes('actions: write'));
});

test('separate Direction Watcher classifies all open PRs with a ten-minute fallback',()=>{
  const s=read('hh-pr-direction-watcher');
  assert.ok(s.includes("cron: '1,11,21,31,41,51 * * * *'"));
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

test('staged single-release-check policy preserves legacy until proven administrative cutover',()=>{
  const auto=read('hh-native-auto-merge');
  assert.ok(auto.includes('const allowedRequiredSets = new Map(['));
  assert.ok(auto.includes('["release-ready", ["hh-core-verified", "hh-specialist", "release-ready"]]'));
  assert.ok(auto.includes('["hh-merge-check", ["hh-merge-check"]]'));
  assert.ok(auto.includes('["hh-merge-check,release-ready", ["hh-merge-check", "release-ready"]]'));
  assert.ok(auto.includes('const notPassed = need.filter(name => !passed(name))'));
  assert.ok(auto.includes('jobPage.total_count !== jobs.length'));
  assert.ok(auto.includes('required.length !== new Set(required).size || !need'));
  assert.ok(!auto.includes("oldRequired === coreRequired"));
  const m=read('hh-migrate-legacy-core-check');
  assert.ok(m.includes('HH_BRANCH_ADMIN_TOKEN'));
  assert.ok(m.includes('head_sha=$head'));
  assert.ok(m.includes('evidence_pr_number:'));
  assert.ok(m.includes('required: true'));
  assert.ok(!m.includes("default: '3054'"),'closed unmerged proof PR must not be silently preselected');
  assert.ok(m.includes('Actually merged production PR with successful hh-merge-check'));
  assert.ok(m.includes('["hh-core-verified","hh-specialist","release-ready","hh-merge-check"]'));
  assert.ok(m.includes('.parameters.required_status_checks = ['));
  assert.ok(m.includes('"context":"hh-merge-check","integration_id":15368'));
  assert.ok(m.includes('"context":"hh-merge-check","app_id":15368'));
  assert.ok(m.includes('gh api --method PUT'));
  assert.ok(m.includes('gh api --method PATCH'));
  assert.ok(m.includes("Already migrated, both protections verified"));
  assert.ok(m.includes('strict: false'));
});

test('live workers avoid duplicate unit suites while changes retain the full contract gate',()=>{
  const contract=read('hh-pr-watchdog-contract-ci');
  for(const file of [
    'ci-pr-slot-wakeup','ci-pr-priority','ci-pr-ci-worker',
    'ci-pr-repair-worker','ci-pr-repair-test-scope','ci-pr-orchestration-triggers'
  ])assert.ok(contract.includes('tests/'+file+'.test.cjs'),file+' contract coverage');

  const slot=read('hh-pr-direct-core-failure').split('\n  core-slot-wakeup:\n')[1];
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
  assert.ok(native.includes('types: [opened, ready_for_review, synchronize]'));
  assert.ok(!native.includes('types: [opened, reopened, ready_for_review, synchronize]'));
  assert.ok(enable.includes("github.event.action != 'synchronize'"), 'new HEAD must not arm before Core success');
  assert.ok(enable.includes("github.event.workflow_run.conclusion == 'success'"), 'post-Core ARM retained');
  assert.ok(prune.includes("github.event.action == 'synchronize'"));
  assert.ok(prune.includes("github.event.pull_request.base.ref == 'codex/public-book-library'"));
  assert.ok(prune.includes('github.event.pull_request.head.repo.full_name == github.repository'));
  assert.ok(prune.includes('ref: codex/public-book-library'));
  assert.ok(prune.includes('persist-credentials: false'));
  assert.ok(prune.includes('actions: write'));
  assert.ok(prune.includes('HH_CI_PRUNE_LIMIT: ' + "'60'"));
  assert.ok(prune.includes('node --test tests/ci-prune-stale-runs.test.mjs'));
  assert.ok(prune.includes('node scripts/ci-prune-stale-runs.mjs'));
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

test('successful Core CI refills capacity through the direct event runner without waiting for Watchdog',()=>{
 const direct=read('hh-pr-direct-core-failure');
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


test('opened and promoted-to-Ready PRs record readiness but defer heavyweight merge checks until Core succeeds',()=>{
  const s=read('hh-native-auto-merge');
  const ready=s.indexOf('source:opened?"pr_opened_ready":"ready_event_observed"');
  const defer=s.indexOf('DEFER_READY_EVENT_UNTIL_EXACT_HEAD_CORE_SUCCESS');
  const wait=s.indexOf('for (const delayMs of [1500, 3000, 5000, 8000])');
  const core=s.indexOf('const currentRuns = [];');
  assert.ok(ready>0 && defer>ready && wait>defer && core>wait,
    'authenticated opened Ready receipt must precede early return before expensive merge polling');
  assert.ok(s.includes("if: ${{ github.event_name != 'pull_request_target' || (github.event.action != 'opened' && github.event.action != 'ready_for_review') }}"),
    'opened/Ready events do not consume a second production checkout');
  assert.ok(s.includes('["opened","ready_for_review"].includes(context.payload.action)'),
    'new Ready events defer to freshly completed Core rather than reusing an old green run');
  assert.ok(s.includes("github.event.workflow_run.conclusion == 'success'"));
  assert.ok(s.includes("steps.safety.outputs.eligible == 'true'"),
    'mandatory protected merge guard must remain');
});
test('watchdog contracts execute the immutable-base freshness suite once per CI wave',()=>{
  const source=read('hh-pr-watchdog-contract-ci');
  const command=source.split('      - name: Watchdog decision contracts\n')[1]?.split('\n      - name:')[0]||'';
  assert.ok(command.includes('node --test tests/ci-pr-core-tested-base-logs.test.cjs'));
  assert.equal((command.match(/tests\/ci-pr-base-freshness\.test\.cjs/g)||[]).length,1,
    'repeated test path wastes a runner without adding coverage');
});

test('all five bounded Watchdog event/schedule control jobs use the existing 1-vCPU slim runner',()=>{
  const w=read('hh-pr-ten-minute-watchdog');
  const jobs=[['reconcile',8],['conflict-event-handoff',5],['completion-wait',3],
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
  assert.match(w,/^  issue_comment:\n    types: \[created\]$/m);
  assert.match(w,/group: hh-control-tower-single-writer/);
  assert.match(w,/^  workflow_run:$/m);
  assert.match(w,/^  pull_request_target:$/m);
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
  assert.match(prune,/^    runs-on: ubuntu-24\.04$/m,'prune janitor stays on full Ubuntu');
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

// Trusted control jobs, not the Code Fix/Verify/Publisher or OIDC inbox,
// may use the same existing one-vCPU runner as the deployed CI Worker.
test('Four short failure/repair control jobs use slim with every safety gate retained',()=>{
  const cases=[
    ['hh-pr-direct-core-failure',[['direct-core-failure',10],['core-slot-wakeup',3]]],
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
  assert.match(intake,/^    runs-on: ubuntu-24\.04$/m,'OIDC intake stays on original runner');
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
 assert.match(source,/cron: '27 \* \* \* \*'/);
 assert.doesNotMatch(source,/continue-on-error:\s*true/);
});
