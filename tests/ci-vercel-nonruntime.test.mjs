import test from 'node:test';
import assert from 'node:assert/strict';
import { maySkipBuild } from '../scripts/vercel-ignore-build.mjs';

test('verified non-runtime GitHub CI changes do not create redundant Vercel builds', () => {
  assert.equal(maySkipBuild([
    '.github/workflows/hh-pr-core-release.yml',
    'scripts/ci-quick-route.mjs',
    'lib/ci/specialist-aggregate.mjs',
    'tests/ci-workflow-globs.test.mjs',
    'tests/pr-fast-lane.test.mjs',
    'docs/operations/CI_RELEASE_POLICY.md',
  ]), true);
  assert.equal(maySkipBuild(['.github/workflows/hh-pr-sweep-guard.yml', 'tests/ci-vercel-nonruntime.test.mjs']), true);
  assert.equal(maySkipBuild(['README.md']), true);
});

test('site code, configuration, secrets, dependency and test fixtures always build', () => {
  const runtime = [
    'app/page.tsx', 'components/home.tsx', 'public/images/image.webp', 'app/globals.css',
    'app/api/auth/route.js', 'lib/app/session.js', 'supabase/migrations/20260101000000_test.sql',
    'package.json', 'package-lock.json', 'next.config.ts', 'vercel.json',
    'scripts/vercel-ignore-build.mjs', 'tests/fixtures/sample.data.mjs',
    'tests/checkout-security.test.mjs', 'lib/ci/../app/auth.mjs',
    'docs/myspace/../../app/page.md', 'scripts/ci-../build.mjs',
  ];
  for (const path of runtime) {
    assert.equal(maySkipBuild(['.github/workflows/hh-pr-core-release.yml', path]), false, path);
  }
  assert.equal(maySkipBuild([]), false);
  assert.equal(maySkipBuild(null), false);
  assert.equal(maySkipBuild(['../README.md']), false);
});
