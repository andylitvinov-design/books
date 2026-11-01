import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldSkipPreviewBuild} from '../scripts/vercel-ignore-build.mjs';
const lab='prj_bjwATbHF61gzEhfsrNe54lEnvJZw';
test('ordinary preview remains skipped',()=>assert.equal(shouldSkipPreviewBuild({VERCEL_ENV:'preview',VERCEL_PROJECT_ID:'other'}),true));
test('isolated Lab preview may build',()=>assert.equal(shouldSkipPreviewBuild({VERCEL_ENV:'preview',VERCEL_PROJECT_ID:lab,HH_LAB_MODE:'true',HH_DISABLE_EXTERNAL_SIDE_EFFECTS:'true'}),false));
test('missing side effect guard blocks Lab preview',()=>assert.equal(shouldSkipPreviewBuild({VERCEL_ENV:'preview',VERCEL_PROJECT_ID:lab,HH_LAB_MODE:'true'}),true));
test('production never skipped by preview rule',()=>assert.equal(shouldSkipPreviewBuild({VERCEL_ENV:'production'}),false));
