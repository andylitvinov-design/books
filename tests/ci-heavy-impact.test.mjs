import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { decideHeavyImpact } from '../scripts/ci-heavy-impact.mjs';
import { parsePrTrigger, matchesTrigger } from '../lib/ci/specialist-aggregate.mjs';

const one = (filename, status = 'modified') => [{ filename, status }];
const read = name => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');

test('App R1: only modified client presentation permits avoiding duplicated full App, DB and banner matrix', () => {
  assert.deepEqual(decideHeavyImpact('app-r1', one('components/profile-compact-design.tsx')),
    { full_app: false, database: false, banner: false, profile: true });
  assert.deepEqual(decideHeavyImpact('app-r1', one('components/my-course-dashboard.tsx')),
    { full_app: false, database: false, banner: true, profile: true });
  assert.deepEqual(decideHeavyImpact('app-r1', one('tests/free-course-banner.test.mjs')),
    { full_app: false, database: false, banner: true, profile: true });
  assert.deepEqual(decideHeavyImpact('app-r1', one('tests/profile-compact-design.test.mjs')),
    { full_app: false, database: false, banner: false, profile: true });
});

test('App R1: cross-feature, API, dependency, security, migrations, mixed and nonmodified changes keep ALL jobs', () => {
  const strict = { full_app: true, database: true, banner: true, profile: true };
  for (const changes of [
    null, [], one('app/api/app/login/route.ts'), one('lib/security/rls.ts'),
    one('supabase/migrations/20261031_more.sql'), one('package-lock.json'),
    one('components/app/owner-cabinet.jsx'), one('tests/app-database.integration.mjs'),
    one('tests/my-course-quest.test.mjs'), one('tests/checkin-scoring-analysis-quality.test.mjs'),
    one('tests/historical-interpretation-coverage.test.mjs'),
    one('components/profile-compact-design.tsx', 'added'),
    one('components/my-course-dashboard.tsx', 'removed'),
    [{ filename: 'components/profile-compact-design.tsx', status: 'modified' },
     { filename: 'lib/app/sessions.js', status: 'modified' }],
  ]) assert.deepEqual(decideHeavyImpact('app-r1', changes), strict);
  assert.throws(() => decideHeavyImpact('unknown', []), /UNKNOWN_SUITE/);
});

test('CI-only App R1 policy and new routing tests skip obsolete unrelated app and database matrices', () => {
  const routed = { full_app: false, database: false, banner: false, profile: false };
  for (const source of [
    one('.github/workflows/hh-app-r1.yml'),
    one('.github/workflows/hh-app-browser.yml'),
    one('scripts/ci-heavy-impact.mjs'),
    one('tests/ci-heavy-impact.test.mjs', 'added'),
    [ { filename: '.github/workflows/ia-v2.yml', status: 'modified' },
      { filename: 'tests/pr-fast-lane.test.mjs', status: 'modified' } ],
  ]) assert.deepEqual(decideHeavyImpact('app-r1', source), routed);
  const strict = { full_app: true, database: true, banner: true, profile: true };
  for (const source of [
    one('.github/workflows/hh-pr-core-release.yml'),
    one('tests/app-database.integration.mjs'),
    [ { filename: 'tests/ci-heavy-impact.test.mjs', status: 'added' },
      { filename: 'app/api/app/owner/route.ts', status: 'modified' } ],
    null,
  ]) assert.deepEqual(decideHeavyImpact('app-r1', source), strict);
});

test('App Browser keeps one core Chromium PR job and makes full old matrix manual', () => {
  const yaml = read('hh-app-browser.yml');
  assert.match(yaml, /workflow_dispatch:/);
  assert.match(yaml, /matrix: \$\{\{ fromJSON\(github\.event_name == 'workflow_dispatch'/);
  assert.match(yaml, /"browser":"chromium","suite":"core"/);
  assert.match(yaml, /"browser":"webkit","suite":"extended"/);
  assert.match(yaml, /browser-journey-complete/);
  assert.match(yaml, /verify-app-r1/);
  assert.match(yaml, /Initialize empty synthetic database/);
});

test('Mandala: test-only changes keep contracts but avoid rebuilding the same site and installing two browsers', () => {
  assert.deepEqual(decideHeavyImpact('mandala', one('tests/mandala-free-video.test.mjs')),
    { browser: false });
  assert.deepEqual(decideHeavyImpact('mandala', one('tests/first-video-director.test.mjs')),
    { browser: false });
  for (const files of [
    null, [], one('tests/mandala-unknown-contract.test.mjs'), one('components/mandala-free-video-studio.tsx'),
    one('lib/mandala/first-video-director.mjs'), one('app/api/holistic-support/voice/route.js'),
    one('tests/mandala-export.test.mjs', 'added'),
    one('data/video-catalog/free-stock-scenes.json'),
    [{ filename: 'tests/mandala-export.test.mjs', status: 'modified' },
     { filename: 'components/mandala-hypno-compact.tsx', status: 'modified' }],
  ]) assert.deepEqual(decideHeavyImpact('mandala', files), { browser: true });
});

test('Free Review: existing modified unit tests skip duplicate build/browser, runtime and unknown edits never do', () => {
  assert.deepEqual(decideHeavyImpact('free-review', one('tests/free-diagnosis-three-offers.test.mjs')), { browser: false });
  assert.deepEqual(decideHeavyImpact('free-review', one('tests/personal-testimonials-prefetch.test.mjs')), { browser: false });
  assert.deepEqual(decideHeavyImpact('free-review', one('tests/private-material-handoff.test.mjs')), { browser: false });
  for (const files of [null, [], one('components/compact-lead-capture.tsx'),
    one('tests/free-diagnosis-three-offers.test.mjs', 'added'),
    [{ filename: 'tests/free-diagnosis-three-offers.test.mjs', status: 'modified' },
     { filename: 'components/personal-testimonials.tsx', status: 'modified' }]]) {
    assert.deepEqual(decideHeavyImpact('free-review', files), { browser: true });
  }
});

test('Free Review workflow preserves post-merge real browser, functional build and focused unit tests', () => {
  const yaml = read('hh-free-review-live-mobile.yml');
  assert.match(yaml, /node scripts\/ci-heavy-impact\.mjs free-review/);
  assert.match(yaml, /node scripts\/ci-pr-readiness\.mjs/);
  assert.match(yaml, /node --test tests\/retired-situation-promo-sitewide\.test\.mjs/);
  assert.match(yaml, /if: github\.event_name == 'pull_request' && steps\.impact\.outputs\.browser == 'true'/);
  assert.match(yaml, /if: github\.event_name != 'pull_request' \|\| steps\.impact\.outputs\.browser == 'true'/);
  assert.match(yaml, /if: github\.event_name == 'push'/);
  assert.match(yaml, /npm run build/);
  assert.doesNotMatch(yaml, /npx tsc --noEmit/);
});
test('App R1 workflow: sensitive changes retain unit + DB + browser, scope is fail-closed and marked as a dependency', () => {
  const yaml = read('hh-app-r1.yml');
  assert.match(yaml, /^  impact:\n/m);
  assert.match(yaml, /node scripts\/ci-heavy-impact\.mjs app-r1/);
  assert.match(yaml, /^  unit-build:\n    needs: impact\n/m);
  assert.match(yaml, /needs\.impact\.outputs\.profile == 'true'/);
  assert.match(yaml, /^  course-banner-browser:\n    needs: impact\n/m);
  assert.match(yaml, /^  database:\n    needs: impact\n/m);
  assert.match(yaml, /needs\.impact\.outputs\.full_app == 'true'/);
  assert.match(yaml, /needs\.impact\.outputs\.database == 'true'/);
  assert.match(yaml, /needs\.impact\.outputs\.banner == 'true'/);
  assert.doesNotMatch(yaml, /run: npm run test:app$/m, 'Do not add an 8k-test run to every strict PR');
  assert.match(yaml, /if: needs\.impact\.outputs\.full_app == 'true'/);
  assert.match(yaml, /Independent native\/PWA contracts/);
  assert.match(yaml, /run: npm run test:app:db/);
  assert.match(yaml, /matrix:\n        browser: \[chromium, webkit\]/);
});

test('Mandala: unit tests always run while real browser + build remain required for runtime edits', () => {
  const yaml = read('holistic-support-mandala.yml');
  assert.match(yaml, /node scripts\/ci-heavy-impact\.mjs mandala/);
  assert.match(yaml, /node --test tests\/first-video-director\.test\.mjs/);
  assert.match(yaml, /- name: Build\n        if: steps\.impact\.outputs\.browser == 'true'\n        run: npm run build/);
  assert.match(yaml, /- name: Public mandala photo, PNG and video browser flow[^\n]*\n        if: steps\.impact\.outputs\.browser == 'true'/);
});

test('Video browser: avoid all unrelated route edits while retaining actual video, services and public About routes', () => {
  const yaml = read('site-video-browser.yml');
  const trigger = parsePrTrigger(yaml, 'site-video-browser.yml');
  assert.equal(trigger.branches.includes('codex/public-book-library'), true);
  assert.equal(matchesTrigger(trigger, ['app/[locale]/app/page.tsx']), false);
  assert.equal(matchesTrigger(trigger, ['app/[locale]/services/alchemy-of-soul/page.tsx']), true);
  assert.equal(matchesTrigger(trigger, ['app/[locale]/about/page.tsx']), true);
  assert.equal(matchesTrigger(trigger, ['components/site-video-player.tsx']), true);
  assert.equal(matchesTrigger(trigger, ['app/page.tsx']), true);
});

test('IA v2: public master directory edits use dedicated Public Services rather than unrelated encrypted-client browser', () => {
  const ia = parsePrTrigger(read('ia-v2.yml'), 'ia-v2.yml');
  const services = parsePrTrigger(read('hh-public-services-production.yml'), 'hh-public-services-production.yml');
  const file = 'lib/practitioners/public-remote-support-masters.ts';
  assert.equal(matchesTrigger(ia, [file]), false);
  assert.equal(matchesTrigger(services, [file]), true);
  assert.equal(matchesTrigger(ia, ['lib/practitioners/private-records.js']), true);
});
