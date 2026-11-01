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
  assert.ok(s.includes("context.eventName === 'push'"));
  assert.ok(s.includes('default: false'));
});
for(const [file,cron] of [
  ['hh-pr-ci-worker','4,14,24,34,44,54'],
  ['hh-pr-repair-worker','5,15,25,35,45,55']
]){
  test(file+' recovers scheduled and event-driven work',()=>{
    const s=read(file);
    assert.ok(s.includes("cron: '"+cron+" * * * *'"));
    assert.ok(s.includes("workflows: ['HH PR 10-minute watchdog']"));
    assert.ok(s.includes("github.event.workflow_run.event != 'push'"));
    assert.ok(s.includes("github.event.workflow_run.conclusion == 'success'"));
    assert.ok(s.includes('default: false'));
  });
}
test('full inventory retains independent hourly recovery',()=>{
  assert.ok(read('hh-pr-full-inventory').includes("cron: '25 * * * *'"));
});

for(const name of ['hh-pr-ten-minute-watchdog','hh-pr-ci-worker','hh-pr-repair-worker']){
  test(name+' can write PR issue queues with scoped permission fallback',()=>{
    const source=read(name);
    assert.match(source,/pull-requests: write/);
    assert.ok(source.includes('withOwnerIssueWrites'));
    assert.ok(source.includes('ci-pr-owner-issue-writes.cjs'));
  });
}
test('untrusted PR repair checkout has no owner token',()=>{
  const source=read('hh-pr-repair-worker');
  const fix=source.split(/^  fix:/m)[1]?.split(/^  publish:/m)[0];
  assert.ok(fix && !fix.includes('HH_AUTOMERGE_TOKEN'));
});
