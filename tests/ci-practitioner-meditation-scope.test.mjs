import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isPrivateMeditationRelease,MEDITATION_RELEASE_ALLOWED_FILES,MEDITATION_RELEASE_REQUIRED_FILES} from '../scripts/ci-practitioner-meditation-scope.mjs';
const yaml=readFileSync(new URL('../.github/workflows/ia-v2.yml',import.meta.url),'utf8');
test('Private meditation scope is exact, complete and excludes any foreign auth/SQL change',()=>{
  const allowed=[...MEDITATION_RELEASE_ALLOWED_FILES];
  assert.equal(new Set(allowed).size,allowed.length);
  assert.equal(isPrivateMeditationRelease(allowed),true);
  assert.equal(isPrivateMeditationRelease(MEDITATION_RELEASE_REQUIRED_FILES),true);
  for(const path of [
    'app/api/auth/callback/route.js','app/api/app/practice/patients/route.js',
    'lib/security/auth.js','supabase/migrations/20261028143327_private_bypass.sql',
    'middleware.ts','package.json','tests/other-feature.test.mjs',
    '.github/workflows/hh-pr-core-release.yml',
  ])assert.equal(isPrivateMeditationRelease([...allowed,path]),false,path);
  for(const missing of MEDITATION_RELEASE_REQUIRED_FILES)
    assert.equal(isPrivateMeditationRelease(allowed.filter(x=>x!==missing)),false,missing);
  assert.equal(isPrivateMeditationRelease([]),false);
  assert.equal(isPrivateMeditationRelease(null),false);
  assert.equal(isPrivateMeditationRelease([...allowed,allowed[0]]),false);
});
test('IA private meditation fast lane retains exact-merge check, owner/RLS and full browser gate',()=>{
  assert.match(yaml,/HEAD\^1/);
  assert.match(yaml,/HEAD\^2/);
  assert.match(yaml,/HH_EXPECTED_HEAD/);
  assert.match(yaml,/HH_EXPECTED_BASE/);
  assert.match(yaml,/isPrivateMeditationRelease\(files\)/);
  assert.match(yaml,/practitioner_meditation_only=/);
  assert.match(yaml,/node --test tests\/practitioner-meditation-studio\.test\.mjs/);
  assert.match(yaml,/tests\/practitioner-preview-auth\.test\.mjs/);
  assert.match(yaml,/tests\/admin-login-security\.test\.mjs/);
  assert.match(yaml,/npm run verify:ia-v2/);
  assert.match(yaml,/npm run native:check && npm run pwa:check/);
  assert.match(yaml,/run: npm run build/);
  assert.match(yaml,/practitioner_meditation_only == 'true'/);
  assert.match(yaml,/IA security, ownership and navigation contracts/);
  assert.match(yaml,/Application, CRM and billing functional contracts/);
  assert.match(yaml,/Guest test access and privacy contracts/);
  assert.match(yaml,/Full unit inventory outside production PR/);
  assert.doesNotMatch(yaml,/Full historical IA suite/);
});
