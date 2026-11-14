import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { applyPrBrowserBudget, decideHeavyImpact, readTestedCandidateChanges } from '../scripts/ci-heavy-impact.mjs';
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
  assert.ok(yaml.includes("browser: ${{ fromJSON(needs.impact.outputs.banner == 'true' && '[\"chromium\",\"webkit\"]' || '[\"none\"]') }}"), 'Both browser engines remain when applicable');
});

test('Mandala PR retains units and runs full media browser only manually or for dedicated voice release branches', () => {
  const yaml = read('holistic-support-mandala.yml');
  assert.match(yaml, /node scripts\/ci-heavy-impact\.mjs mandala/);
  assert.match(yaml, /^  workflow_dispatch:/m);
  assert.match(yaml, /startsWith\(github\.head_ref, 'codex\/voice-studio-'\)/);
  assert.match(yaml, /startsWith\(github\.head_ref, 'codex\/voice-mix-'\)/);
  assert.match(yaml, /node scripts\/verify-affirmation-voice-browser\.mjs/);
  assert.match(yaml, /run: node --test [^\n]*tests\/first-video-director\.test\.mjs/, 'first-video director must remain in the executable test command');
  assert.match(yaml, /- name: Build\n        if: steps\.impact\.outputs\.browser == 'true'.*\n        run: npm run build/);
  assert.match(yaml, /- name: Public mandala photo, PNG and video browser flow[^\n]*\n        if: steps\.impact\.outputs\.browser == 'true'.*/);
});

test('Video Studio and Hypnocorrection release branches run real browser and macOS WebKit gates', () => {
  const yaml = read('holistic-support-mandala.yml');
  const browser = yaml.match(/- name: Public mandala photo, PNG and video browser flow[^\n]*\n\s*if: ([^\n]+)/)?.[1] || '';
  const mac = yaml.match(/voice-webkit-macos:\n\s*if: ([^\n]+)/)?.[1] || '';
  for (const branch of ['fix/video-', 'codex/perf-video-studio-', 'codex/hypno-third-workspace-']) {
    assert.ok(browser.includes(`startsWith(github.head_ref, '${branch}')`), `browser gate: ${branch}`);
    assert.ok(mac.includes(`startsWith(github.head_ref, '${branch}')`), `macOS gate: ${branch}`);
  }
  assert.match(yaml, /node scripts\/verify-holistic-mandala-browser\.mjs/);
  assert.match(yaml, /ffprobe -version/);
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
  assert.match(read('hh-pr-core-release.yml'),/^  hh-merge-check:/m);
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

test('scenario source bindings PR requires the real Linux browser acceptance', () => {
  const branch='feat/video-120-scenario-media-bindings-20261102';
  assert.deepEqual(applyPrBrowserBudget('mandala','pull_request',{browser:false},branch),{browser:true});
  assert.deepEqual(applyPrBrowserBudget('mandala','pull_request',{browser:true},'other-branch'),{browser:false});
});

test('Mandala PRs skip redundant Linux browsers but keep required source contracts and macOS media QA', () => {
  const changed = [{filename:'app/api/holistic-support/voice/route.js',status:'modified'}];
  const full = decideHeavyImpact('mandala', changed);
  assert.deepEqual(full,{browser:true},'risk classifier remains fail-closed');
  assert.deepEqual(applyPrBrowserBudget('mandala','pull_request',full),{browser:false},
    'Core and macOS WebKit own the PR build and encoded-media gate');
  assert.deepEqual(applyPrBrowserBudget('mandala','workflow_dispatch',full),{browser:true},
    'manual full media QA remains available');
  assert.deepEqual(applyPrBrowserBudget('mandala','push',full),{browser:true});
  assert.deepEqual(applyPrBrowserBudget('free-review','pull_request',{browser:true}),{browser:true});
  assert.deepEqual(applyPrBrowserBudget('app-r1','pull_request',{full_app:true}),{full_app:true});
  const yaml = read('holistic-support-mandala.yml');
  assert.match(yaml,/voice-webkit-macos:\n/);
  assert.match(yaml,/HH_LIVE_VIDEO_ENGINE=webkit HH_LIVE_VIDEO_HEADED=1/);
  assert.match(yaml,/Mandala and mobile support contracts/);
  assert.match(yaml,/node --test tests\/video-chat-ai\.test\.mjs/);
});

test('cheap CI routing jobs allow bounded checkout time without weakening specialist gates', () => {
  const guard = read('hh-pr-sweep-guard.yml');
  const app = read('hh-app-r1.yml');
  assert.match(guard, /guard-unit:\n    runs-on: ubuntu-slim\n    timeout-minutes: 8/);
  assert.match(app, /impact:\n    name: route-expensive-app-suites\n    if: [^\n]+\n(?:    #[^\n]+\n)*    runs-on: ubuntu-slim\n    timeout-minutes: 8/);
  for (const yaml of [guard,app]) assert.doesNotMatch(yaml,/continue-on-error:\s*true/);
});

test('owner video review runs real browser and physical source checks',()=>{
  assert.deepEqual(applyPrBrowserBudget('mandala','pull_request',{browser:false},'feat/video-owner-review-20261102'),{browser:true});
  const yaml=read('holistic-support-mandala.yml');
  for(const name of ['Install isolated Chromium and WebKit','Ensure ffprobe and ffmpeg','Verify all 44 first-party MP4','Audit 120 scenario','Verify private owner scenario review snapshot','Public mandala photo']){
    const step=yaml.slice(yaml.indexOf('- name: '+name));
    assert.ok(step.startsWith('- name: '+name),name);
    assert.match(step.slice(0,step.indexOf('\n      - name:',1)>0?step.indexOf('\n      - name:',1):step.length),/feat\/video-owner-review-/,name);
  }
});

test('App R1 impact uses sparse checkout and one strictly routed no-op browser', () => {
  const yaml = read('hh-app-r1.yml');
  assert.ok(yaml.includes('sparse-checkout: |\n            scripts'),
    'The exact synthetic-merge diff must avoid pulling full media blobs');
  assert.ok(yaml.includes('fetch-depth: 2'), 'Verified diff requires both merge parents');
  assert.ok(yaml.includes("browser: ${{ fromJSON(needs.impact.outputs.banner == 'true' && '[\"chromium\",\"webkit\"]' || '[\"none\"]') }}"),
    'Both browser engines run on actual scope; one no-op job otherwise');
  assert.ok(yaml.includes('run: test "$HH_ROUTED_SCOPE" = false'),
    'Missing routing results must fail closed, never claim a passing browser run');
  assert.ok(yaml.includes('needs: impact') && yaml.includes("needs.impact.result == 'success'"),
    'Use the single immutable HEAD classification for all dependent jobs');
});

// Exact-owner regression table: cover the product/security/dependency categories,
// not only one or two convenient paths. Core is path-independent and mandatory.
// Cheap Guard owns this test; editing it must never start unrelated media runners.
test('cross-domain critical change matrix preserves owned suites and avoids CI-only fan-out', () => {
  const cases = [
    { risk: 'login callback', path: 'app/api/auth/callback/route.js',
      owners: ['ia-v2.yml'] },
    { risk: 'private direct messages', path: 'app/api/app/direct-messages/route.js',
      owners: ['hh-app-r1.yml', 'hh-app-browser.yml', 'ia-v2.yml',
        'hh-crm-source-check.yml', 'hh-messenger-mobile-release.yml'], strictApp: true },
    { risk: 'private client UI', path: 'components/app/owner-cabinet.tsx',
      owners: ['hh-app-r1.yml', 'hh-app-browser.yml', 'ia-v2.yml'], strictApp: true },
    { risk: 'auth and security library', path: 'lib/security/session.ts',
      owners: ['hh-app-r1.yml', 'hh-app-browser.yml', 'ia-v2.yml'], strictApp: true },
    { risk: 'assessment API', path: 'app/api/assessments/scoring/route.ts',
      owners: ['hh-app-r1.yml'], strictApp: true },
    { risk: 'assessment evidence', path: 'data/assessments/checkin.json',
      owners: ['hh-app-r1.yml'], strictApp: true },
    { risk: 'SQL and row-level security', path: 'supabase/migrations/20261104_owner_rls.sql',
      owners: ['hh-app-r1.yml', 'hh-app-browser.yml', 'ia-v2.yml',
        'hh-billing-isolated.yml'], strictApp: true },
    { risk: 'commerce payment API', path: 'app/api/payments/checkout/route.js',
      owners: ['hh-billing-isolated.yml', 'hh-public-services-production.yml'],
      excluded: ['hh-app-r1.yml'] },
    { risk: 'billing library', path: 'lib/billing/paypal.js',
      owners: ['hh-billing-isolated.yml'] },
    { risk: 'CRM private contact data', path: 'lib/crm/consent.js',
      owners: ['hh-crm-source-check.yml'] },
    { risk: 'private practitioner relay', path: 'lib/practitioners/direct-message.js',
      owners: ['hh-crm-source-check.yml', 'ia-v2.yml'] },
    { risk: 'customer consent capture', path: 'components/consultation-choice-capture.tsx',
      owners: ['hh-public-services-production.yml', 'hh-free-review-live-mobile.yml',
        'hh-crm-source-check.yml'] },
    { risk: 'video voice provider', path: 'app/api/holistic-support/voice/route.js',
      owners: ['holistic-support-mandala.yml'] },
    { risk: 'video director logic', path: 'lib/mandala/video-chat-understanding.mjs',
      owners: ['holistic-support-mandala.yml'] },
    { risk: 'licensed audio media', path: 'public/audio/mandala/original.wav',
      owners: ['holistic-support-mandala.yml'] },
    { risk: 'live-audio API', path: 'app/api/live-audio/session/route.ts',
      owners: ['hh-live-audio-ci.yml'] },
    { risk: 'shared literal Next API route', path: 'app/api/app/[...path]/route.js',
      owners: ['hh-app-r1.yml', 'hh-app-browser.yml', 'ia-v2.yml',
        'hh-messenger-mobile-release.yml', 'hh-energywork-ai.yml',
        'hh-public-services-production.yml'], strictApp: true },
    { risk: 'nested optional-slug route', path: 'app/[locale]/academy/[[...slug]]/page.tsx',
      owners: ['hh-energywork-ai.yml'] },
    { risk: 'Energywork owner private review', path: 'tests/reiki-review-owner-lifetime.test.mjs',
      owners: ['hh-energywork-ai.yml'] },
    { risk: 'Energywork YAML only', path: '.github/workflows/hh-energywork-ai.yml',
      owners: ['hh-actionlint.yml'],
      excluded: ['hh-energywork-ai.yml'] },
    { risk: 'private mobile messages', path: 'app/[locale]/app/messages/page.tsx',
      owners: ['hh-app-r1.yml', 'hh-app-browser.yml', 'ia-v2.yml',
        'hh-messenger-mobile-release.yml'], strictApp: true },
    { risk: 'shared runtime middleware', path: 'middleware.ts',
      owners: ['hh-app-r1.yml', 'hh-app-browser.yml', 'ia-v2.yml',
        'hh-billing-isolated.yml'], strictApp: true },
    { risk: 'root dependency lockfile', path: 'package-lock.json',
      owners: ['hh-app-r1.yml', 'hh-app-browser.yml', 'ia-v2.yml',
        'hh-billing-isolated.yml', 'hh-live-audio-ci.yml'], strictApp: true },
    { risk: 'Next runtime config', path: 'next.config.ts',
      owners: ['hh-app-r1.yml', 'hh-app-browser.yml', 'ia-v2.yml',
        'hh-billing-isolated.yml', 'hh-live-audio-ci.yml'], strictApp: true },
    { risk: 'CI router source', path: 'scripts/ci-heavy-impact.mjs',
      owners: ['hh-app-r1.yml', 'hh-pr-sweep-guard.yml',
        'holistic-support-mandala.yml', 'hh-free-review-live-mobile.yml'] },
    { risk: 'CI workflow owner', path: '.github/workflows/hh-app-r1.yml',
      owners: ['hh-app-r1.yml', 'hh-pr-sweep-guard.yml', 'hh-actionlint.yml'] },
    { risk: 'CI policy test only', path: 'tests/ci-heavy-impact.test.mjs',
      owners: ['hh-pr-sweep-guard.yml'],
      excluded: ['hh-app-r1.yml', 'holistic-support-mandala.yml',
        'hh-free-review-live-mobile.yml'] },
    { risk: 'profile-only presentation', path: 'components/profile-compact-design.tsx',
      owners: ['hh-app-r1.yml'],
      excluded: ['hh-billing-isolated.yml', 'holistic-support-mandala.yml'] },
  ];
  assert.ok(cases.length >= 28, 'protect the full risk-category regression inventory');
  const workflow = new Map();
  const matches = (name, path) => {
    if (!workflow.has(name)) workflow.set(name, parsePrTrigger(read(name), name));
    return matchesTrigger(workflow.get(name), [path], 'codex/public-book-library');
  };
  const strict = { full_app: true, database: true, banner: true, profile: true };
  for (const { risk, path, owners, excluded = [], strictApp = false } of cases) {
    assert.equal(matches('hh-pr-core-release.yml', path), true,
      risk + ': mandatory Core must never be filtered by file path');
    for (const name of owners) assert.equal(matches(name, path), true,
      risk + ': lost domain owner ' + name + ' for ' + path);
    for (const name of excluded) assert.equal(matches(name, path), false,
      risk + ': unnecessary specialist fan-out ' + name + ' for ' + path);
    if (strictApp) assert.deepEqual(decideHeavyImpact('app-r1', one(path)), strict,
      risk + ': security, database and browser must fail closed');
  }
  // Cosmetic-only presentation can delegate unrelated database and full-App
  // runs, but adding, removing, renaming or mixing in sensitive source cannot.
  const cosmetic = 'components/profile-compact-design.tsx';
  assert.deepEqual(decideHeavyImpact('app-r1', one(cosmetic)),
    { full_app: false, database: false, banner: false, profile: true });
  for (const status of ['added', 'removed', 'renamed'])
    assert.deepEqual(decideHeavyImpact('app-r1', one(cosmetic, status)), strict);
  for (const risk of ['lib/security/session.ts', 'app/api/app/direct-messages/route.js',
    'supabase/migrations/20261104_owner_rls.sql', 'package-lock.json'])
    assert.deepEqual(decideHeavyImpact('app-r1', [...one(cosmetic), ...one(risk)]), strict);
  // Unknown new source still hits Core; never assume an unrecognized feature
  // belongs to an optional suite or that no check is needed.
  assert.equal(matches('hh-pr-core-release.yml', 'scripts/new-unknown-runtime.mjs'), true);
});

test('App R1 trigger covers all critical routes and preserves mandatory sensitive checks', () => {
  const trigger = parsePrTrigger(read('hh-app-r1.yml'), 'hh-app-r1.yml');
  const strict = { full_app: true, database: true, banner: true, profile: true };
  for (const path of [
    'app/ru/app/account/page.tsx', 'app/en/client/report/page.tsx',
    'app/api/app/profile/route.ts', 'app/api/client/report/route.ts',
    'app/api/assessments/scoring/route.ts', 'components/app/owner-cabinet.tsx',
    'lib/app/owner.ts', 'lib/profile/secure-profile.ts',
    'lib/assessments/calculate.ts', 'lib/security/authorization.ts',
    'data/assessments/checkin.json', 'supabase/migrations/20261104_security.sql',
    'middleware.ts', 'next.config.ts', 'package.json', 'package-lock.json'
  ]) {
    assert.equal(matchesTrigger(trigger, [path]), true, path + ' must schedule App R1');
    assert.deepEqual(decideHeavyImpact('app-r1', one(path)), strict, path + ' requires full checks');
  }
  for (const path of ['components/profile-compact-design.tsx', 'components/my-course-dashboard.tsx'])
    assert.equal(matchesTrigger(trigger, [path]), true, path + ' must still run the owned scope');
  for (const path of ['docs/unrelated-changelog.md', 'components/telegram-message-list.tsx'])
    assert.equal(matchesTrigger(trigger, [path]), false, path + ' should not wake App R1');
});

test('App R1 routing-unit edits execute Guard and Core without five-job App R1 fanout', () => {
  const changed = ['tests/ci-heavy-impact.test.mjs'];
  const triggers = name => matchesTrigger(
    parsePrTrigger(read(name), name),
    changed, 'codex/public-book-library'
  );
  assert.equal(triggers('hh-app-r1.yml'), false, 'Guard-owned test-only diff must not allocate App R1');
  assert.equal(triggers('hh-pr-sweep-guard.yml'), true, 'Guard still checks the actual test source');
  assert.equal(triggers('hh-pr-core-release.yml'), true, 'Protected Core remains required');
  for (const changedProductionSource of [
    'scripts/ci-heavy-impact.mjs', 'lib/security/auth.ts',
    'app/api/app/messages/route.ts', 'supabase/migrations/20261104_secure.sql'
  ]) {
    assert.equal(matchesTrigger(parsePrTrigger(read('hh-app-r1.yml'), 'hh-app-r1.yml'),
      [changedProductionSource], 'codex/public-book-library'), true,
      changedProductionSource + ' must retain real specialist acceptance');
  }
});

test('Mandala policy-only impact tests route to fast Guard, while video, voice and media still run Mandala', () => {
  const mandalaSource = read('holistic-support-mandala.yml');
  const guardSource = read('hh-pr-sweep-guard.yml');
  const mandala = parsePrTrigger(mandalaSource, 'holistic-support-mandala.yml');
  const guard = parsePrTrigger(guardSource, 'hh-pr-sweep-guard.yml');
  const ciContract = 'tests/ci-heavy-impact.test.mjs';
  assert.equal(matchesTrigger(guard, [ciContract]), true,
    'Policy-only impact test must execute the fast Guard regression suite');
  assert.ok(guardSource.includes('node --test tests/pr-sweep-guard.test.mjs') &&
    guardSource.includes(ciContract), 'Guard must actually execute its owned impact test');
  assert.equal(matchesTrigger(mandala, [ciContract]), false,
    'Policy test alone must not start the long Mandala music/media job');
  for (const file of [
    '.github/workflows/holistic-support-mandala.yml',
    'scripts/ci-heavy-impact.mjs',
    'components/mandala-free-video-studio.tsx',
    'lib/mandala/voice-studio.mjs',
    'app/api/holistic-support/voice/route.js',
    'tests/mandala-free-video.test.mjs',
    'tests/video-chat-understanding.test.mjs',
    'scripts/generate-scenario-melodies.mjs',
    'public/audio/mandala/example.mp3'
  ]) {
    assert.equal(matchesTrigger(mandala, [file]), true,
      file + ' still needs the full independent video and audio source gate');
  }
  assert.ok(mandalaSource.includes("  focused-unit-types-build:\n    if: "),
    'Mandala Ready source gate must still exist');
  assert.match(mandalaSource, /- name: Generate dedicated scenario music and four classic performances/);
  assert.match(mandalaSource, /- name: Mandala and mobile support contracts/);
});

test('App R1 no-op lanes use only slim runners and skip PostgreSQL', () => {
  const yaml = read('hh-app-r1.yml');
  const job = (id, next) => {
    const first = yaml.indexOf('  ' + id + ':\n');
    assert.ok(first >= 0, id + ' exists');
    const last = next ? yaml.indexOf('  ' + next + ':\n', first + 1) : yaml.length;
    assert.ok(last > first, id + ' has stable boundaries');
    return yaml.slice(first, last);
  };
  const unit = job('unit-build', 'course-banner-browser');
  const browser = job('course-banner-browser', 'database');
  const db = job('database');
  const route = (source, expression) =>
    assert.ok(source.includes('runs-on: ' + '$' + '{{ ' + expression + ' }}'),
      'runner selection must be exactly guarded by trusted impact');
  route(unit, "needs.impact.outputs.profile == 'true' && 'ubuntu-latest' || 'ubuntu-slim'");
  route(browser, "matrix.browser != 'none' && 'ubuntu-24.04' || 'ubuntu-slim'");
  route(db, "needs.impact.outputs.database == 'true' && 'ubuntu-latest' || 'ubuntu-slim'");
  assert.ok(db.includes('image: ' + '$' + "{{ needs.impact.outputs.database == 'true' && 'postgres:17-alpine' || '' }}"),
    'PostgreSQL starts only when the verified impact includes database');
  for (const [name, body, flag] of [
    ['unit-build', unit, 'profile'], ['course-banner-browser', browser, 'banner'], ['database', db, 'database'],
  ]) {
    assert.ok(body.includes("needs.impact.result == 'success'"), name + ' requires successful classifier');
    assert.ok(body.includes("if: needs.impact.outputs." + flag + " != 'true'"),
      name + ' retains the exact negative assertion');
    assert.ok(body.includes("if: needs.impact.outputs." + flag + " == 'true'"),
      name + ' retains real positive checks');
  }
  assert.match(db, /run: npm run test:app:db/);
  assert.match(db, /node scripts\/ci-client-memory-rls\.mjs/);
  assert.match(db, /node scripts\/ci-coaching-rls\.mjs/);
  assert.ok(browser.includes('chromium') && browser.includes('webkit'));
  assert.match(unit, /node --conditions=react-server --test tests\/app-auth-pkce\.integration\.mjs/);
  assert.doesNotMatch(yaml, /continue-on-error:\s*true/);
});
