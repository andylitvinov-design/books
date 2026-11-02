import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../.github/workflows/opora-module-ci.yml', import.meta.url), 'utf8');
const pr = source.match(/^  pull_request:\s*\n([\s\S]*?)(?=^  workflow_dispatch:|^permissions:)/m)?.[1];
const paths = [...(pr || '').matchAll(/^      - ['"]([^'"]+)['"]$/gm)].map(match => match[1]);

test('OPORA owns only its actually executed course tests, not every course editor test', () => {
  assert.ok(pr, 'production PR trigger must exist');
  assert.ok(!paths.includes('tests/course-*.mjs'), 'broad course glob launches OPORA for unrelated course PRs');
  const actual = [...new Set([...source.matchAll(/\btests\/course-[\w.-]+\.mjs/g)].map(match => match[0]))].sort();
  assert.deepEqual(actual, ["tests/course-baseline-explainer.test.mjs","tests/course-compact-owner-ui.test.mjs","tests/course-entry-selector.test.mjs","tests/course-test-sequence.test.mjs"], 'OPORA course contracts changed: review the explicit trigger owners');
  for (const target of actual) {
    assert.ok(paths.includes(target), 'OPORA regression missing a trigger: ' + target);
  }
  assert.ok(paths.includes('tests/opora-pr-path-filter.test.mjs'));
  assert.ok(paths.includes('.github/workflows/opora-module-ci.yml'));
  assert.ok(source.includes('node --test tests/opora-pr-path-filter.test.mjs'));
  assert.ok(source.includes("branches:\n      - codex/public-book-library"), 'keep production target');
  assert.match(source, /^  workflow_dispatch:/m, 'manual full QA must remain');
  assert.doesNotMatch(source, /continue-on-error:\s*true/, 'do not hide failing real checks');
});
