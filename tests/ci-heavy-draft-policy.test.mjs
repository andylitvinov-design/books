import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflows = [
  'assessment-range-mobile-browser.yml',
  'hh-benchmark-public-browser.yml',
  'hh-home-conversation.yml',
  'site-video-browser.yml',
];

const read = name => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');

for (const name of workflows) {
  test(name + ': draft skips heavy job, but ready-for-review and later commits trigger it', () => {
    const source = read(name);
    const pr = source.match(/^  pull_request:\s*\n([\s\S]*?)(?=^  (?:push|workflow_dispatch|schedule|workflow_call):|^permissions:|^concurrency:|^jobs:)/m);
    assert.ok(pr, 'pull_request missing: ' + name);
    for (const event of ['opened', 'synchronize', 'reopened', 'ready_for_review', 'converted_to_draft']) {
      assert.match(pr[1], new RegExp('\\b' + event + '\\b'), 'missing event ' + event);
    }
    const jobBlock = source.split(/^jobs:\s*$/m)[1];
    assert.ok(jobBlock, 'jobs block missing');
    const jobNames = [...jobBlock.matchAll(/^  ([a-z][a-z0-9-]+):\s*$/gm)].map(match => match[1]);
    assert.equal(jobNames.length, 1, 'unexpected job count; update all jobs when expanding workflow');
    assert.match(jobBlock, /if: \${\{ github\.event_name != 'pull_request' \|\| github\.event\.pull_request\.draft == false \}\}/);
    assert.match(source, /^concurrency:/m);
    assert.match(source, /^  cancel-in-progress: true/m);
    assert.doesNotMatch(source, /continue-on-error:\s*true/);
  });
}

test('production post-merge push and explicit manual verification are not disabled', () => {
  for (const name of ['hh-home-conversation.yml', 'site-video-browser.yml']) {
    const s = read(name);
    assert.match(s, /^  push:/m, name + ' lost production push verification');
  }
  for (const name of ['assessment-range-mobile-browser.yml', 'hh-benchmark-public-browser.yml']) {
    const s = read(name);
    assert.match(s, /^  workflow_dispatch:/m, name + ' lost manual acceptance');
  }
});

test('short CI contract tests run even when expensive browser gates are draft-skipped', () => {
  const guard = read('hh-pr-sweep-guard.yml');
  assert.match(guard, /tests\/ci-heavy-draft-policy\.test\.mjs/);
  assert.match(guard, /node --test tests\/pr-sweep-guard\.test\.mjs tests\/ci-heavy-draft-policy\.test\.mjs/);
  assert.match(guard, /^  pull_request:/m);
});

const runGroupSuffix = "${{ github.event_name == 'pull_request' && github.event.pull_request.number || github.run_id }}";
const prOnlyCancellation = "${{ github.event_name == 'pull_request' }}";
const supersededRunWorkflows = [
  ['hh-crm-source-check.yml', 'hh-crm-source'],
  ['practice-google-browser.yml', 'hh-practice-google'],
  ['practitioner-presentations.yml', 'hh-practitioner-presentations'],
  ['hh-private-audio-e2e.yml', 'hh-private-audio'],
  ['practice-visual-browser.yml', 'hh-practice-visual'],
];

for (const [workflow, key] of supersededRunWorkflows) {
  test(workflow + ': superseded PR runs preserve push audit', () => {
    const source = read(workflow);
    assert.match(source, /^  pull_request:/m);
    assert.match(source, /^jobs:/m);
    assert.equal((source.match(/^concurrency:/gm) || []).length, 1);
    assert.ok(source.includes('group: ' + key + '-' + runGroupSuffix));
    assert.ok(source.includes('cancel-in-progress: ' + prOnlyCancellation));
    assert.doesNotMatch(source, /continue-on-error:\s*true/);
  });
}

test('non-PR push verification is still triggered for release-sensitive suites', () => {
  for (const name of ['practice-google-browser.yml', 'practitioner-presentations.yml', 'hh-private-audio-e2e.yml', 'practice-visual-browser.yml']) {
    assert.match(read(name), /^  push:/m);
  }
});

test('browser readiness polling preserves 120 Bash attempts without unused iterator', () => {
  for (const name of ['practice-google-browser.yml', 'practice-visual-browser.yml']) {
    assert.ok(read(name).includes('for ((i=1; i<=120; i++)); do'));
    assert.ok(!read(name).includes('for i in $(seq 1 120); do'));
  }
});

const draftStageWorkflows = [
  'hh-crm-source-check.yml',
  'hh-private-audio-e2e.yml',
  'practice-google-browser.yml',
  'practice-visual-browser.yml',
  'practitioner-presentations.yml',
];

for (const name of draftStageWorkflows) {
  test(name + ': Draft skips costly jobs but Ready and subsequent commits run them', () => {
    const source = read(name);
    assert.ok(source.includes('  pull_request:\n    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]'));
    assert.match(source, /^  pull_request:[\s\S]*?^    paths:/m);
    const jobs = source.split(/^jobs:\s*$/m)[1];
    assert.ok(jobs, 'jobs missing: ' + name);
    const jobNames = [...jobs.matchAll(/^  ([a-z][a-z0-9-]*):\s*$/gm)].map(item => item[1]);
    assert.ok(jobNames.length >= 1, 'no job names: ' + name);
    const stage = "    if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
    for (const job of jobNames) {
      assert.ok(jobs.includes('  ' + job + ':\n' + stage), 'Draft gate missing: ' + name + '/' + job);
    }
    assert.match(source, /^concurrency:\s*\n  group:/m);
    assert.ok(source.includes("  cancel-in-progress: ${{ github.event_name == 'pull_request' }}"));
    assert.doesNotMatch(source, /continue-on-error:\s*true/);
  });
}

test('Draft staging retains release and manual verification events', () => {
  for (const name of ['hh-private-audio-e2e.yml', 'practice-google-browser.yml', 'practice-visual-browser.yml', 'practitioner-presentations.yml']) {
    assert.match(read(name), /^  push:/m, 'push audit must remain: ' + name);
  }
  assert.match(read('hh-crm-source-check.yml'), /^  workflow_dispatch:/m);
});
