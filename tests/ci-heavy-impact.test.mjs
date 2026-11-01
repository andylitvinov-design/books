import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { decideHeavyImpact, readTestedCandidateChanges } from '../scripts/ci-heavy-impact.mjs';
import { parsePrTrigger, matchesTrigger } from '../lib/ci/specialist-aggregate.mjs';

const one = (filename, status = 'modified') => [{ filename, status }];
const read = name => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');


test('App R1 uses only the verified GitHub synthetic merge delta, not a stale REST PR base', () => {
  const eventHead = 'a'.repeat(40), eventMerge = 'b'.repeat(40), testedBase = 'c'.repeat(40);
  const statusRows = ['M','.github/workflows/hh-app-r1.yml',
    'A','tests/ci-heavy-impact.test.mjs',
    'M','tests/ci-specialist-aggregate.test.mjs'];
  const z = String.fromCharCode(0), calls = [];
  const git = (_binary,args) => {
    calls.push(args);
    if (args[0] === 'rev-parse') {
      const values = { HEAD: eventMerge, 'HEAD^1': testedBase, 'HEAD^2': eventHead };
      return values[args[1]] + '\n';
    }
    if (args[0] === 'diff') return statusRows.join(z) + z;
    throw Error('unexpected git command');
  };
  const changes = readTestedCandidateChanges(eventHead, eventMerge, git);
  assert.deepEqual(changes, [
    {filename:'.github/workflows/hh-app-r1.yml',status:'modified'},
    {filename:'tests/ci-heavy-impact.test.mjs',status:'added'},
    {filename:'tests/ci-specialist-aggregate.test.mjs',status:'modified'},
  ]);
  assert.deepEqual(decideHeavyImpact('app-r1',changes),
    {full_app:false,database:false,banner:false,profile:false});
  assert.deepEqual(calls.find(args => args[0] === 'diff'),
    ['diff','--no-renames','--name-status','-z',testedBase,'HEAD']);
  assert.throws(() => readTestedCandidateChanges(eventHead,'d'.repeat(40),git),
    /NOT_EVENT_TESTED_CHECKOUT/);
  assert.throws(() => readTestedCandidateChanges(eventHead,eventMerge,(_b,args) => {
    if (args[0] === 'rev-parse') return ({
      HEAD:eventMerge,'HEAD^1':testedBase,'HEAD^2':'f'.repeat(40)
    })[args[1]]+'\n';
    throw Error('unverified merge must not read changed files');
  }),/UNVERIFIED_EVENT_MERGE_PARENTS/);
  assert.throws(() => readTestedCandidateChanges(eventHead,eventMerge,(_b,args) => {
    if (args[0] === 'rev-parse') return ({
      HEAD:eventMerge,'HEAD^1':testedBase,'HEAD^2':eventHead
    })[args[1]]+'\n';
    if (args[0] === 'diff') return 'R100'+z+'old'+z+'new'+z;
    throw Error('unexpected');
  }),/(?:UNSAFE_TESTED_FILE_STATUS|INVALID_OR_EMPTY_TESTED_DIFF)/);
});

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
    one('.github/workflows/hh-alchemy-mobile-acceptance.yml'),
    one('tests/ci-alchemy-impact.test.mjs'),
    one('scripts/ci-heavy-impact.mjs'),
    one('tests/ci-heavy-impact.test.mjs', 'added'),
    one('tests/ci-specialist-aggregate.test.mjs'),
    [ { filename: '.github/workflows/ia-v2.yml', status: 'modified' },
      { filename: 'tests/pr-fast-lane.test.mjs', status: 'modified' } ],
  ]) assert.deepEqual(decideHeavyImpact('app-r1', source), routed);
  // Exact workflow/guard CI-only PR: immutable BASE guard runs separately;
  // no App runtime, SQL, auth, payment, or user data changed.
  const ciOnlyProduction = [
    '.github/workflows/hh-app-browser.yml',
    '.github/workflows/hh-app-r1.yml',
    '.github/workflows/hh-free-review-live-mobile.yml',
    '.github/workflows/hh-pr-sweep-guard.yml',
    '.github/workflows/holistic-support-mandala.yml',
    '.github/workflows/ia-v2.yml',
    '.github/workflows/opora-module-ci.yml',
    '.github/workflows/site-video-browser.yml',
    'scripts/ci-heavy-impact.mjs',
    'tests/ci-heavy-draft-policy.test.mjs',
    'tests/ci-heavy-impact.test.mjs',
    'tests/ci-specialist-aggregate.test.mjs',
    'tests/pr-fast-lane.test.mjs',
  ].map(name=>({filename:name,status:name.endsWith('ci-heavy-impact.test.mjs')||name==='scripts/ci-heavy-impact.mjs'?'added':'modified'}));
  assert.deepEqual(decideHeavyImpact('app-r1',ciOnlyProduction),routed,
    'Current CI-only cleanup must not launch unrelated App PostgreSQL/OPORA; guard-unit & Core still mandatory');
  assert.deepEqual(decideHeavyImpact('app-r1',[
    ...ciOnlyProduction,{filename:'app/api/app/secure/route.ts',status:'modified'},
  ]),{full_app:true,database:true,banner:true,profile:true},
    'Mixed private API changes must keep full RLS/database checks');
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
  assert.match(yaml, /- run: npm ci --no-audit --no-fund\n\s+if: github.event_name != 'pull_request'/,
    'source-only PR must not repeat Core npm install; full browser QA retains it');
});

test('CI-only policy edits skip unrelated App, Mandala and Free Review browser matrices', () => {
  const safe = [
    one('scripts/ci-heavy-impact.mjs')[0],
    one('.github/workflows/opora-module-ci.yml')[0],
    one('.github/workflows/hh-pr-sweep-guard.yml')[0],
    one('tests/ci-heavy-impact.test.mjs','added')[0],
  ];
  assert.deepEqual(decideHeavyImpact('app-r1',safe),
    {full_app:false,database:false,banner:false,profile:false});
  for(const mode of ['mandala','free-review']) {
    assert.deepEqual(decideHeavyImpact(mode,safe),{browser:false});
    assert.deepEqual(decideHeavyImpact(mode,[
      ...safe,{filename:'components/mandala-free-video-studio.tsx',status:'modified'}
    ]),{browser:true});
    assert.deepEqual(decideHeavyImpact(mode,[
      one('scripts/ci-heavy-impact.mjs','removed')[0]
    ]),{browser:true});
    assert.deepEqual(decideHeavyImpact(mode,null),{browser:true});
  }
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

test('Mandala PR retains units and runs full media browser only manually or for dedicated voice release branches', () => {
  const yaml = read('holistic-support-mandala.yml');
  assert.match(yaml, /node scripts\/ci-heavy-impact\.mjs mandala/);
  assert.match(yaml, /^  workflow_dispatch:/m);
  assert.match(yaml, /startsWith\(github\.head_ref, 'codex\/voice-studio-'\)/);
  assert.match(yaml, /startsWith\(github\.head_ref, 'codex\/voice-mix-'\)/);
  assert.match(yaml, /node scripts\/verify-affirmation-voice-browser\.mjs/);
  assert.match(yaml, /node --test tests\/first-video-director\.test\.mjs/);
  assert.match(yaml, /- name: Build\n        if: steps\.impact\.outputs\.browser == 'true'.*\n        run: npm run build/);
  assert.match(yaml, /- name: Public mandala photo, PNG and video browser flow[^\n]*\n        if: steps\.impact\.outputs\.browser == 'true'.*/);
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


test('App R1 short delegated jobs must complete successfully for verified non-applicable changes', () => {
  const yaml=read('hh-app-r1.yml');
  for (const [job,scope] of [
    ['unit-build','profile'],
    ['course-banner-browser','banner'],
    ['database','database'],
  ]) {
    const section=yaml.split('  '+job+':\n')[1]?.split(/\n  [a-z][a-z0-9-]*:\n/)[0];
    assert.ok(section,'missing App R1 specialist job: '+job);
    assert.ok(section.includes("needs.impact.result == 'success'"),
      job+' cannot pass before verified impact classification');
    assert.ok(section.includes("if: needs.impact.outputs."+scope+" != 'true'"),
      job+' missing safe no-work scope');
    assert.ok(section.includes("HH_ROUTED_SCOPE: ${{ needs.impact.outputs."+scope+" }}"),
      job+' must read exact routed output');
    assert.ok(section.includes('run: test "$HH_ROUTED_SCOPE" = false'),
      job+' unrecognized output must fail, not silently claim success');
    assert.ok(section.includes("if: needs.impact.outputs."+scope+" == 'true'"),
      job+' must retain actual tests when required');
  }
  assert.match(read('hh-pr-core-release.yml'),/^  release-ready:/m);
  assert.doesNotMatch(yaml,/continue-on-error:\s*true/);
});


test('temporary backlog fast lane keeps App R1 PR source contracts and manual browser integrity', () => {
  const yaml = read('hh-app-browser.yml');
  assert.ok(yaml.includes('Fast App R1 browser-source contracts on PR'));
  for (const name of ['Isolated test tools','Initialize empty synthetic database',
    'Browser journey with protocol double, never Google or production']) {
    const actual=yaml.split('      - name: '+name+'\n')[1]?.split('\n')[0]?.trim();
    assert.equal(actual,"if: github.event_name != 'pull_request'",name+' is manual-only');
  }
  assert.ok(yaml.includes('node --test tests/ci-heavy-impact.test.mjs'));
  assert.match(yaml, /workflow_dispatch:/);
  assert.ok(yaml.includes('"browser":"webkit","suite":"extended"'));
  assert.match(yaml, /browser-journey-complete/);
  assert.doesNotMatch(yaml, /continue-on-error:\s*true/);
});


test('only audited CI-policy paths skip unrelated heavy browser matrices', () => {
  const ciPaths = [
    '.github/workflows/hh-app-browser.yml',
    '.github/workflows/hh-app-r1.yml',
    '.github/workflows/holistic-support-mandala.yml',
    '.github/workflows/ia-v2.yml',
    '.github/workflows/site-video-browser.yml',
    'tests/ci-head-cancellation.test.mjs',
    'tests/ci-heavy-impact.test.mjs',
    'tests/ci-stale-run-deduplication.test.mjs',
  ].map(filename => ({filename,status:'modified'}));
  assert.deepEqual(decideHeavyImpact('free-review',ciPaths),{browser:false});
  assert.deepEqual(decideHeavyImpact('mandala',ciPaths),{browser:false});
  assert.deepEqual(decideHeavyImpact('app-r1',ciPaths),
    {full_app:false,database:false,banner:false,profile:false});
  for (const protectedPath of [
    '.github/workflows/hh-pr-core-release.yml',
    '.github/workflows/hh-public-services-production.yml',
    'app/api/app/direct-messages/route.js',
  ]) {
    const risky = [...ciPaths,{filename:protectedPath,status:'modified'}];
    assert.deepEqual(decideHeavyImpact('free-review',risky),{browser:true});
    assert.deepEqual(decideHeavyImpact('mandala',risky),{browser:true});
    assert.deepEqual(decideHeavyImpact('app-r1',risky),
      {full_app:true,database:true,banner:true,profile:true});
  }
  assert.deepEqual(decideHeavyImpact('free-review',
    [...ciPaths,{filename:'tests/unknown.test.mjs',status:'added'}]),{browser:true});
});
