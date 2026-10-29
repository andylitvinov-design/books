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
