import test from 'node:test';
import assert from 'node:assert/strict';
import { maySkipBuild, inspectGithubCompare, changedFilesViaGithub, changedFilesBetween } from '../scripts/vercel-ignore-build.mjs';

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

test('GitHub compare confirms a bounded CI-only diff for Vercel skip', async () => {
  const prev = 'a'.repeat(40), cur = 'b'.repeat(40);
  let calls = 0;
  const fetcher = async url => {
    calls++;
    assert.match(url, /compare\//);
    return {ok:true,status:200,json:async()=>({
      base_commit:{sha:prev},head_commit:{sha:cur},status:'ahead',ahead_by:2,
      files:[{filename:'.github/workflows/hh-pr-core-release.yml',status:'modified'},
        {filename:'scripts/ci-source-preflight.mjs',status:'modified'}]
    })};
  };
  const diagnostic = await inspectGithubCompare(prev,cur,fetcher);
  assert.equal(diagnostic.reason,'github-verified');
  assert.equal(maySkipBuild(diagnostic.paths),true);
  assert.equal((await changedFilesViaGithub(prev,cur,fetcher)).length,2);
  assert.equal(calls,2);
});
test('GitHub compare is fail-closed on missing hashes, rate limits, divergence and truncation',async()=>{
  const prev='a'.repeat(40),cur='b'.repeat(40);
  assert.equal((await inspectGithubCompare('',cur)).reason,'invalid-sha');
  assert.equal((await inspectGithubCompare(prev,cur,async()=>({ok:false,status:403}))).reason,'github-http-403');
  const fetcher = (overrides={}) => async()=>({ok:true,json:async()=>({
    base_commit:{sha:prev},head_commit:{sha:cur},status:'ahead',ahead_by:2,
    files:[{filename:'.github/workflows/work.yml',status:'modified'}],...overrides
  })});
  assert.equal((await inspectGithubCompare(prev,cur,fetcher({status:'diverged'}))).paths,null);
  assert.equal((await inspectGithubCompare(prev,cur,fetcher({files:new Array(300).fill({filename:'README.md',status:'modified'})}))).paths,null);
  assert.equal((await inspectGithubCompare(prev,cur,fetcher({files:[{filename:'README.md',status:'renamed'}]}))).paths,null);
  assert.equal((await inspectGithubCompare(prev,cur,async()=>{throw Error('network');})).reason,'github-request-failed');
});
