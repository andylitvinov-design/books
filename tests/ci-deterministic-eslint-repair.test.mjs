import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isSafeEslintFixPath, hasExactLintFailure, isEligiblePullRequest,
} from '../scripts/ci-deterministic-eslint-repair.mjs';

const repo='andylitvinov-design/books';
const head='a'.repeat(40), base='b'.repeat(40);
const expected={number:42,baseSha:base,headSha:head,headRef:'feat/public-page',repository:repo};
const pr=()=>({
  number:42,state:'open',draft:false,
  head:{sha:head,ref:'feat/public-page',repo:{full_name:repo}},
  base:{sha:base,ref:'codex/public-book-library',repo:{full_name:repo}},
});
const lintName='Lint changed JS/TS sources on PR; full lint for manual/merge queue';

test('deterministic autofix accepts only ordinary, non-sensitive application source paths',()=>{
  for(const file of [
    'app/[locale]/about/page.tsx',
    'components/public-card.jsx',
    'lib/public-content.mjs',
    'scripts/verify-public-route.mjs',
    'tests/public-route.test.mjs',
  ]) assert.equal(isSafeEslintFixPath(file),true,file);
  for(const file of [
    '.github/workflows/hh-pr-core-release.yml','package.json','package-lock.json',
    'eslint.config.mjs','app/api/payment/route.ts',
    'app/[locale]/app/messages/page.tsx','components/app/private-profile.jsx',
    'lib/practitioners/consent-policy.mjs','supabase/migrations/001_private.sql',
    '../outside.mjs','app/[locale]/admin/page.tsx','scripts/auth-bootstrap.mjs',
    'components/widget.css','tests/private-session.test.mjs','/tmp/outside.mjs',
    'lib/ci/specialist-aggregate.mjs','scripts/ci-prune-stale-runs.mjs',
    'scripts/pr-sweep-guard.mjs','tests/ci-prune-stale-runs.test.mjs',
  ]) assert.equal(isSafeEslintFixPath(file),false,file);
});

test('only the exact changed-file ESLint Core step failure activates repair',()=>{
  assert.equal(hasExactLintFailure([{name:'core-lint-types-build',steps:[
    {name:lintName,conclusion:'failure'},
  ]}]),true);
  for(const jobs of [
    [{name:'core-lint-types-build',steps:[{name:lintName,conclusion:'success'}]}],
    [{name:'core-lint-types-build',steps:[{name:'Exact proposed release production build and TypeScript check',conclusion:'failure'}]}],
    [{name:'hh-specialist',steps:[{name:lintName,conclusion:'failure'}]}],
    [],
  ]) assert.equal(hasExactLintFailure(jobs),false);
});

test('repair is bound to one exact open, non-draft, same-repository production PR HEAD/base',()=>{
  assert.equal(isEligiblePullRequest(pr(),expected),true);
  assert.equal(isEligiblePullRequest({...pr(),draft:true},expected),false);
  assert.equal(isEligiblePullRequest({...pr(),state:'closed'},expected),false);
  assert.equal(isEligiblePullRequest({...pr(),head:{...pr().head,sha:'c'.repeat(40)}},expected),false);
  assert.equal(isEligiblePullRequest({...pr(),base:{...pr().base,sha:'c'.repeat(40)}},expected),false);
  assert.equal(isEligiblePullRequest({...pr(),base:{...pr().base,ref:'codex/bootstrap-books'}},expected),false);
  assert.equal(isEligiblePullRequest({...pr(),head:{...pr().head,repo:{full_name:'fork/books'}}},expected),false);
  assert.equal(isEligiblePullRequest({...pr(),head:{...pr().head,ref:'codex/public-book-library'}},expected),false);
});

test('worker uses trusted BASE dependencies, exclusive lease and a normal non-force push',()=>{
  const source=readFileSync(new URL('../scripts/ci-deterministic-eslint-repair.mjs',import.meta.url),'utf8');
  assert.match(source,/npm',\['ci','--ignore-scripts'/);
  assert.match(source,/pr-sweep-guard\.mjs/);
  assert.match(source,/\[leaseTool,'claim'/);
  assert.match(source,/\[leaseTool,'heartbeat'/);
  assert.match(source,/\[leaseTool,'release'/);
  assert.match(source,/HH_REPAIR_PUSH_TOKEN/);
  assert.match(source,/PATCH_READY_MANUAL_PUSH_REQUIRED/);
  assert.match(source,/hh-deterministic-eslint-autofix\.patch/);
  assert.match(source,/if\(!pushToken\)/);
  assert.match(source,/writeFileSync\(join\(need\('RUNNER_TEMP'\),'hh-deterministic-eslint-autofix\.patch'\)/);
  assert.match(source,/git',\['push','origin','HEAD:refs\/heads\/'/);
  assert.doesNotMatch(source,/git',\['push'[^;\n]*--force/);
  assert.doesNotMatch(source,/\b(?:npm run|npx |opencode|openrouter)\b|API[_-]?KEY|\bcodex\s+(?:exec|run)\b/i);
});


test('the repair lane is optional, BASE-owned and cannot satisfy the required merge aggregator',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/hh-pr-core-release.yml',import.meta.url),'utf8');
  const start=workflow.indexOf('  hh-eslint-repair:');
  const end=workflow.indexOf('  # Both GitHub production protection sources',start);
  assert.ok(start>=0&&end>start,'the optional repair job must exist');
  const job=workflow.slice(start,end);
  assert.match(job,/needs: \[scope\]/);
  assert.match(job,/needs\.scope\.result == 'failure'/);
  assert.match(job,/needs\.scope\.outputs\.lint_failed == 'true'/);
  assert.match(job,/failure\(\)/);
  assert.match(job,/contents: write/);
  assert.match(job,/pull-requests: write/);
  assert.match(job,/issues: write/);
  assert.ok(job.includes('token: ${{ secrets.HH_REPAIR_PUSH_TOKEN || secrets.HH_AUTOMERGE_TOKEN || github.token }}'));
  assert.ok(job.includes('HH_REPAIR_PUSH_TOKEN: ${{ secrets.HH_REPAIR_PUSH_TOKEN || secrets.HH_AUTOMERGE_TOKEN }}'));
  assert.ok(job.includes('Upload verified ESLint autofix patch'));
  assert.match(job,/git cat-file -e "\$HH_BASE_SHA:scripts\/ci-deterministic-eslint-repair\.mjs"/);
  assert.match(job,/git show "\$HH_BASE_SHA:scripts\/ci-deterministic-eslint-repair\.mjs"/);
  const mergeStart=workflow.indexOf('  hh-merge-check:');
  const merge=workflow.slice(mergeStart);
  assert.match(merge,/needs: \[scope, hh-specialist\]/);
  assert.doesNotMatch(merge,/hh-eslint-repair/);
});

test('fast ubuntu-slim preflight checks deterministic repair contract before slow Core queue',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/hh-actionlint.yml',import.meta.url),'utf8');
  assert.match(workflow,/runs-on: ubuntu-slim/);
  assert.ok(workflow.includes("      - 'scripts/ci-deterministic-eslint-repair.mjs'"));
  assert.ok(workflow.includes("      - 'tests/ci-deterministic-eslint-repair.test.mjs'"));
  const fast=workflow.indexOf('      - name: Fast zero-install CI policy contracts');
  const install=workflow.indexOf('      - name: Install checksum-verified actionlint');
  assert.ok(fast>=0&&fast<install,'the cheap contract test must run on the faster runner before actionlint install and Core scheduling');
  assert.match(workflow,/node --test tests\/ci-deterministic-eslint-repair\.test\.mjs/);
});


test('only a confirmed failing Core changed-file ESLint step can start source Repair',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/hh-pr-core-release.yml',import.meta.url),'utf8');
  assert.match(workflow,/^      lint_failed: \$\{\{ steps\.changed_lint\.outcome == 'failure' \}\}$/m);
  assert.match(workflow,/^      - name: Lint changed JS\/TS sources on PR; full lint for manual\/merge queue\n        id: changed_lint$/m);
  const job=workflow.split(/^  hh-eslint-repair:/m)[1]?.split(/^  # Both GitHub production protection sources/m)[0];
  assert.ok(job);
  assert.match(job,/needs\.scope\.outputs\.lint_failed == 'true'/);
  assert.doesNotMatch(job,/continue-on-error:\s*true/);
  const autoMerge=readFileSync(new URL('../.github/workflows/hh-native-auto-merge.yml',import.meta.url),'utf8');
  assert.ok(autoMerge.includes('GH_TOKEN: ${{ secrets.HH_AUTOMERGE_TOKEN || github.token }}'),
    'fallback reuses the existing authorized repository token, not a new external service');
});
