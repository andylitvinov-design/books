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
  assert.match(source,/git',\['push','origin','HEAD:refs\/heads\/'/);
  assert.doesNotMatch(source,/git',\['push'[^;\n]*--force/);
  assert.doesNotMatch(source,/\b(?:npm run|npx |opencode|openrouter|codex)\b|API[_-]?KEY/i);
});
