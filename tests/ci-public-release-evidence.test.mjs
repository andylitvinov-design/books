import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPublicReleaseEvidence, SCHEMA } from '../lib/ci/public-release-evidence.mjs';
import { GET } from '../app/api/public/release-evidence/route.js';

const good = {
  VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40),
  VERCEL_DEPLOYMENT_ID: 'dpl_6fNgUY64EQdmMK9baHvgxc7K32oU',
  VERCEL_PROJECT_ID: 'prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b',
  VERCEL_GIT_COMMIT_REF: 'codex/public-book-library',
  VERCEL_GIT_REPO_OWNER: 'andylitvinov-design',
  VERCEL_GIT_REPO_SLUG: 'books',
  VERCEL_ENV: 'production',
  VERCEL_TOKEN: 'never-expose-this',
};

test('exact public deployment identity is complete and excludes all tokens', () => {
  const result = readPublicReleaseEvidence(good);
  assert.deepEqual(result, { schema: SCHEMA, available: true,
    sha: good.VERCEL_GIT_COMMIT_SHA,
    deployment_id: good.VERCEL_DEPLOYMENT_ID,
    project_id: good.VERCEL_PROJECT_ID,
    branch: good.VERCEL_GIT_COMMIT_REF,
    repo: 'andylitvinov-design/books', environment: 'production' });
  assert.ok(!JSON.stringify(result).includes(good.VERCEL_TOKEN));
});

test('preview, missing, malformed and mismatched identities never claim LIVE', () => {
  for (const patch of [
    { VERCEL_ENV: 'preview' },
    { VERCEL_GIT_COMMIT_SHA: 'short' },
    { VERCEL_DEPLOYMENT_ID: 'not-a-deployment' },
    { VERCEL_PROJECT_ID: 'prj_wrong' },
    { VERCEL_GIT_COMMIT_REF: 'feature-branch' },
    { VERCEL_GIT_REPO_OWNER: 'someone-else' },
    { VERCEL_GIT_REPO_SLUG: 'other' },
  ]) {
    assert.deepEqual(readPublicReleaseEvidence({ ...good, ...patch }),
      { schema: SCHEMA, available: false });
  }
  assert.deepEqual(readPublicReleaseEvidence({}), {schema: SCHEMA, available: false});
});

test('the public route bypasses cache and never returns private configuration', async () => {
  const response = GET();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const result = await response.json();
  assert.equal(result.schema, SCHEMA);
  assert.equal(typeof result.available, 'boolean');
  assert.ok(!('token' in result));
});

test('App browser source contracts do not wake up for unrelated course tests', () => {
  for (const path of ['.github/workflows/hh-app-browser.yml',
    '.github/workflows/hh-app-r1.yml']) {
    const yaml = readFileSync(path, 'utf8');
    assert.doesNotMatch(yaml, /- ['\"]tests\/course-\*\.mjs['\"]/);
  }
  const app = readFileSync('.github/workflows/hh-app-r1.yml', 'utf8');
  assert.match(app, /tests\/course-immersive-start-ui\.test\.mjs/);
});
