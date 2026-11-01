'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const read=name=>readFileSync('.github/workflows/'+name+'.yml','utf8');
test('watchdog has independent ten-minute cron and failed Core wakeup',()=>{
  const s=read('hh-pr-ten-minute-watchdog');
  assert.ok(s.includes("cron: '6,16,26,36,46,56 * * * *'"));
  assert.ok(s.includes("workflows: ['HH PR core release gate']"));
  assert.ok(s.includes("github.event.workflow_run.conclusion == 'failure'"));
  assert.ok(s.includes("github.event.workflow_run.conclusion == 'timed_out'"));
  assert.ok(s.includes("github.event.workflow_run.conclusion == 'startup_failure'"));
  assert.ok(s.includes("github.event.workflow_run.event == 'pull_request'"));
  assert.ok(s.includes("context.eventName === 'push'"));
  assert.ok(s.includes('default: false'));
});
for(const [file,cron] of [
  ['hh-pr-ci-worker','4,14,24,34,44,54'],
  ['hh-pr-repair-worker','5,15,25,35,45,55']
]){
  test(file+' uses cron and explicit queue dispatch, never workflow_run fanout',()=>{
    const s=read(file);
    assert.ok(s.includes("cron: '"+cron+" * * * *'"));
    assert.ok(s.includes('workflow_dispatch:'));
    assert.ok(!s.includes('  workflow_run:'));
    assert.ok(s.includes('cancel-in-progress: false'));
    assert.ok(s.includes('default: false'));
  });
}
test('full inventory retains independent hourly recovery',()=>{
  assert.ok(read('hh-pr-full-inventory').includes("cron: '25 * * * *'"));
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
});

test('skipped successful Core events never replace a pending failed-Core watchdog',()=>{
  const s=read('hh-pr-ten-minute-watchdog');
  assert.ok(s.includes('  reconcile:\n    # Skipped successful Core callbacks'));
  assert.ok(s.includes('    concurrency:\n      group: hh-pr-ten-minute-watchdog'));
  assert.ok(!s.includes('concurrency:\n  group: hh-pr-ten-minute-watchdog'));
  const reconcile=s.split('\n  core-slot-wakeup:\n')[0];
  assert.ok(!reconcile.includes("github.event.workflow_run.status == 'completed'"));
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
  assert.ok(s.includes("inputs:{pr_number:'0',dry_run:'false'}"));
});

test('successful Core event has a separate rate-bounded free-slot wakeup',()=>{
  const s=read('hh-pr-ten-minute-watchdog');
  assert.ok(s.includes('  core-slot-wakeup:\n'));
  assert.ok(s.includes('name: core-ci-freed-slot-wakeup'));
  assert.ok(s.includes('group: hh-pr-core-slot-wakeup'));
  assert.ok(s.includes('cancel-in-progress: false'));
  assert.ok(s.includes('github.event.workflow_run.conclusion == \'success\''));
  assert.ok(s.includes('scripts/ci-pr-slot-wakeup.cjs'));
  assert.ok(s.includes('actions: write'));
});
