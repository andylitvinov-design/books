import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const workflow = (name) =>
  readFileSync(join(root, '.github', 'workflows', name), 'utf8');

const scoped = [
  'hh-app-browser.yml',
  'hh-app-r1.yml',
  'hh-billing-isolated.yml',
  'hh-interpretation-database.yml',
  'hh-public-services-production.yml',
  'ia-v2.yml',
  'opora-module-ci.yml',
];

test('seven formerly unconditional PR workflows run only on relevant paths', () => {
  for (const filename of scoped) {
    const source = workflow(filename);
    const trigger = source.split(/^permissions:/m)[0];
    const start = trigger.indexOf('  pull_request:');
    assert.notEqual(start, -1, filename + ' lost PR trigger');
    const remainder = trigger.slice(start + '  pull_request:'.length);
    const block = remainder.split(/^  [a-z_]+:/m)[0];
    assert.match(block, /^    branches:/m, filename + ' lost target branch');
    assert.match(block, /codex\/public-book-library/, filename + ' points to wrong base');
    assert.match(block, /^    paths:/m, filename + ' will run for every PR again');
    assert.match(block, /^      - /m, filename + ' has no scoped path patterns');
  }
});

test('one unconditional fail-closed release-ready gate protects core code validation', () => {
  const source = workflow('hh-pr-core-release.yml');
  assert.match(source, /^  pull_request:/m);
  assert.match(source, /^  merge_group:/m);
  assert.match(source, /^  release-ready:/m);
  assert.match(source, /^    needs: \[scope, code\]/m);
  assert.match(source, /^    if: always\(\)/m);
  assert.match(source, /git diff --name-only -z/);
  assert.match(source, /docs\/\*\.md\|README\.md/);
  assert.match(source, /npm ci --no-audit --no-fund/);
  assert.match(source, /eslint/);
  assert.match(source, /tsc --noEmit/);
  assert.match(source, /npm run build/);
  assert.match(source, /\[\[ "\$SCOPE_RESULT" == success \]\]/);
  assert.match(source, /\[\[ "\$CODE_RESULT" == success \]\]/);
  assert.doesNotMatch(source, /continue-on-error:\s*true/);
});

test('PR automation policy and agent entry point require specialist safety gates', () => {
  const docs = readFileSync(join(root, 'docs', 'operations', 'PR_FAST_LANE_20261029.md'), 'utf8');
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  assert.match(docs, /necessary but not sufficient/);
  assert.match(docs, /RLS\/auth\/privacy\/payment/);
  assert.match(docs, /GitHub administrator setup|administrator setup/i);
  assert.match(agents, /PR_FAST_LANE_20261029\.md/);
  assert.match(agents, /release-ready/);
});
