import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planPublicJourneys, planFromGitDiff } from '../scripts/ci-public-journey-scope.mjs';

const full = {wave1:true, wave2:true};
const source = readFileSync(new URL('../.github/workflows/hh-public-journey-wave1.yml', import.meta.url), 'utf8');

test('exact change routing retains individual journeys and fails closed for shared or unknown files', () => {
  assert.deepEqual(planPublicJourneys(['app/[locale]/contact/page.tsx']), {wave1:true,wave2:false});
  assert.deepEqual(planPublicJourneys(['app/es/about/page.tsx']), {wave1:true,wave2:false});
  assert.deepEqual(planPublicJourneys(['app/[locale]/toronto/page.tsx']), {wave1:false,wave2:true});
  assert.deepEqual(planPublicJourneys(['scripts/verify-public-pathway-toronto-mobile.mjs']), {wave1:false,wave2:true});
  assert.deepEqual(planPublicJourneys(['components/public-pathway-strip.tsx']), full);
  assert.deepEqual(planPublicJourneys(['components/public-pathway-strip.module.css']), full);
  assert.deepEqual(planPublicJourneys(['tests/public-pathway-migration.test.mjs']), full);
  assert.deepEqual(planPublicJourneys(['app/[locale]/contact/page.tsx','app/[locale]/toronto/page.tsx']), full);
  assert.deepEqual(planPublicJourneys(['package.json']), full);
  assert.deepEqual(planPublicJourneys(['app/[locale]/toronto/page.tsx','lib/security/roles.ts']), full);
  assert.deepEqual(planPublicJourneys([]), full);
  assert.deepEqual(planPublicJourneys([null]), full);
});

test('missing or failed real git diff never skips browser checks', () => {
  assert.deepEqual(planFromGitDiff('', ''), full);
  assert.deepEqual(planFromGitDiff('a'.repeat(40),'b'.repeat(40),()=>{throw Error('fetch incomplete');}),full);
  assert.deepEqual(planFromGitDiff('a'.repeat(40),'b'.repeat(40),()=>''),full);
  assert.deepEqual(planFromGitDiff('a'.repeat(40),'b'.repeat(40),()=> 'app/[locale]/toronto/page.tsx\0'),
    {wave1:false,wave2:true});
});

test('successor preserves both original real browsers with one local build and one browser install', () => {
  for (const x of ['scripts/verify-public-pathway-mobile.mjs',
    'scripts/verify-public-pathway-toronto-mobile.mjs',
    'tests/public-pathway-migration.test.mjs',
    'tests/public-pathway-toronto.test.mjs',
    'app/\\[locale\\]/contact/**',
    'app/\\[locale\\]/toronto/**',
    '.github/workflows/hh-public-journey-wave1.yml']) {
    assert.ok(source.includes(x), 'Successor omits scope/coverage ' + x);
  }
  assert.equal((source.match(/run: npm run build/g)||[]).length, 1);
  assert.equal((source.match(/playwright install --with-deps chromium webkit/g)||[]).length, 1);
  assert.match(source, /HH_PUBLIC_QA_ORIGIN: http:\/\/127\.0\.0\.1:3103/);
  assert.match(source, /if \[\[ "\$HH_RUN_WAVE1" == true \]\]; then node scripts\/verify-public-pathway-mobile\.mjs; fi/);
  assert.match(source, /if \[\[ "\$HH_RUN_WAVE2" == true \]\]; then node scripts\/verify-public-pathway-toronto-mobile\.mjs; fi/);
  assert.match(source, /fetch-depth: 0/);
  assert.match(source, /draft == false/);
  assert.match(source, /workflow_dispatch:/);
  assert.doesNotMatch(source,/continue-on-error:\s*true/);
  assert.match(source, /^  push:/m, 'Post-merge audit runs full real-browser journeys');
  for(const name of ['Build exact candidate once for both real-browser suites', 'Install Chromium and WebKit once for both journeys', 'Read-only EN/RU/ES Chromium and WebKit journeys on a shared local server']) {
    assert.ok(source.includes('- name: '+name+"\n        if: github.event_name != 'pull_request'"),
      'ordinary PR defers expensive build/browser, but post-merge and manual keep: '+name);
  }
  assert.match(source, /workflow_dispatch:/, 'Manual full matrix remains available');
});


test('protected PRs use the reviewed dependency-free journey fixtures, never waive manual or push QA',()=>{
  const planner=source.slice(source.indexOf('name: Verify dependency-free journey inputs'),source.indexOf('name: Install full journey dependencies'));
  assert.ok(planner.includes("github.event.pull_request.base.ref == 'codex/public-book-library'"));
  assert.ok(planner.includes('git hash-object -- "$file"'));
  assert.ok(planner.includes('minimal=false'));
  for(const file of ['tests/public-pathway-migration.test.mjs','tests/public-pathway-toronto.test.mjs','tests/ci-public-journey-consolidation.test.mjs','scripts/ci-public-journey-scope.mjs','package.json','package-lock.json'])
    assert.ok(planner.includes(file),'reviewed closure: '+file);
  assert.ok(source.includes("name: Install full journey dependencies\n        if: steps.deps.outputs.minimal != 'true'\n        run: npm ci --no-audit --no-fund"));
  assert.equal((source.match(/if \[\[ "\$HH_JOURNEY_MINIMAL" != true \]\]; then npx --no-install eslint /g)||[]).length,2);
  assert.ok(source.includes("github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library'"));
  assert.match(source,/node --test tests\/public-pathway-migration\.test\.mjs/);
  assert.match(source,/node --test tests\/public-pathway-toronto\.test\.mjs/);
  assert.match(source,/playwright install --with-deps chromium webkit/);
  assert.doesNotMatch(source,/continue-on-error:\s*true/);
});
