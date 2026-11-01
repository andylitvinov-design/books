import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchesGlob } from 'node:path';
import test from 'node:test';
import { PUBLIC_BROWSER_CASES, PUBLIC_SOURCE_TESTS, planPublicServicesChangedPaths, planPublicServicesEvent, requiresPublicServicesHeavyPr, publicPlaywrightEngines, REVIEWED_VOICE_2629_DELTA } from '../scripts/ci-public-services-plan.mjs';

const workflow = name => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');
const pathsOf = name => {
  const pr = workflow(name).split('  pull_request:')[1]?.split(/^  [a-z_]+:|^permissions:/m)[0] || '';
  return [...pr.matchAll(/^      - '([^']+)'$/gm)].map(x => x[1]);
};
const covers = (patterns, file) => {
  let selected = false;
  for (const pattern of patterns) {
    const negative = pattern.startsWith('!');
    if (matchesGlob(file, negative ? pattern.slice(1) : pattern)) selected = !negative;
  }
  return selected;
};

test('13 current browser owners are unique and the old contact UI duplicate is retired', () => {
  const source = workflow('hh-public-services-production.yml');
  assert.equal(PUBLIC_BROWSER_CASES.length, 13);
  assert.equal(new Set(PUBLIC_BROWSER_CASES).size, 13);
  for (const name of PUBLIC_BROWSER_CASES) {
    assert.ok(source.includes('run_case "' + name + '" node scripts/' + name),
      'missing real suite: ' + name);
  }
  assert.ok(PUBLIC_SOURCE_TESTS.length >= 20);
  for (const file of PUBLIC_SOURCE_TESTS) {
    assert.match(source, new RegExp('node --test [^\\n]*' + file.replaceAll('.', '\\.')));
  }
  assert.match(source, /npm run build > artifacts\/public-services-production\/build\.log/);
  assert.match(source, /playwright install --with-deps chromium webkit/);
  assert.match(source, /timeout-minutes: 20/);
  assert.doesNotMatch(source, /continue-on-error:\s*true/);
});

test('contracts-only changes do not repeat Next build or install Playwright', () => {
  const plan = planPublicServicesChangedPaths([
    'tests/temple-support-hub.test.mjs', 'tests/talisman-google-checkout.test.mjs']);
  assert.equal(plan.mode, 'contracts');
  assert.equal(plan.build, false);
  assert.equal(plan.browser, false);
  assert.equal(plan.metrics, false);
});

test('browser harness-only changes keep exact targeted real browsers', () => {
  const one = planPublicServicesChangedPaths(['scripts/verify-ideas-mobile-browser.mjs']);
  assert.equal(one.mode, 'focused');
  assert.equal(one.browser, true);
  assert.equal(one.build, true);
  assert.equal(one.cases, 'verify-ideas-mobile-browser.mjs');
  assert.equal(one.metrics, false);
  const multiple = planPublicServicesChangedPaths([
    'tests/goal-support-offers.test.mjs',
    'scripts/verify-service-cart-browser.mjs',
    'scripts/verify-storefront-shop-browser.mjs']);
  assert.equal(multiple.mode, 'focused');
  assert.deepEqual(multiple.cases.split(',').sort(),
    ['verify-service-cart-browser.mjs', 'verify-storefront-shop-browser.mjs']);
});

test('release audit and consent test helper changes run only their Public Services owner', () => {
  const files = [
    '.github/workflows/admin-seo-dashboard.yml', '.github/workflows/release-reaudit.yml',
    'scripts/helpers/contact-channel-verifier.mjs', 'scripts/public-poster-readiness.mjs', 'scripts/csp-navigation-diagnostics.mjs',
    'scripts/verify-public-services-production.mjs', 'scripts/verify-release-reaudit.mjs',
    'tests/ci-head-cancellation.test.mjs', 'tests/ci-stale-run-deduplication.test.mjs',
    'tests/csp-public-discovery-verifier.test.mjs', 'tests/csp-navigation-diagnostics.test.mjs', 'tests/public-audit-readiness.test.mjs',
    'tests/release-reaudit.test.mjs', 'tests/service-alchemy-one-screen-story.test.mjs',
  ];
  const plan = planPublicServicesChangedPaths(files);
  assert.equal(plan.mode, 'focused');
  assert.equal(plan.cases, 'verify-public-services-production.mjs');
  for (const risky of ['components/contact-channel-chooser.tsx', 'app/api/service-enquiries/route.js', 'middleware.ts']) {
    assert.equal(planPublicServicesChangedPaths([...files, risky]).mode, 'full');
  }
});

test('Alchemy CSS-only uses source-tested Core build, never a duplicate full browser', () => {
  const file = 'components/alchemy-soul-landing.module.css';
  const plan = planPublicServicesChangedPaths([file]);
  assert.equal(plan.mode, 'contracts');
  assert.equal(plan.build, false);
  assert.equal(plan.browser, false);
  assert.equal(plan.metrics, false);
  assert.equal(plan.cases, 'none');
  assert.equal(publicPlaywrightEngines(plan), 'none');
  assert.equal(planPublicServicesChangedPaths([file, 'components/alchemy-soul-lead-form.tsx']).mode, 'full');
  assert.equal(planPublicServicesChangedPaths([file, 'components/alchemy-soul-landing.tsx']).mode, 'full');
});

test('the exact Public Services CI+Alchemy change verifies only its two real browser owners', () => {
  const paths = [
    '.github/workflows/hh-public-services-production.yml',
    'components/alchemy-soul-landing.module.css',
    'scripts/ci-public-services-plan.mjs',
    'scripts/verify-alchemy-one-screen.mjs',
    'scripts/verify-public-services-production.mjs',
    'tests/ci-public-services-plan.test.mjs',
    'tests/ci-workflow-globs.test.mjs',
    'tests/service-alchemy-one-screen-story.test.mjs',
  ];
  const plan = planPublicServicesChangedPaths(paths);
  assert.equal(plan.mode,'focused');
  assert.equal(plan.build,true);
  assert.equal(plan.browser,true);
  assert.deepEqual(plan.cases.split(',').sort(),
    ['verify-alchemy-one-screen.mjs','verify-public-services-production.mjs']);
  const risky = [...paths, 'app/api/payments/talismans/checkout/route.js'];
  assert.equal(planPublicServicesChangedPaths(risky).mode,'full');
});


test('Ideas/Coaching shared browser batch dispatches only the actual Ideas acceptance, not 12 unrelated lanes', () => {
  const files = [
    '.github/workflows/hh-ideas-coaching-public.yml',
    'scripts/ci-mobile-browser-batch.mjs',
    'scripts/verify-coaching-lounge-mobile.mjs',
    'scripts/verify-holistic-support-browser.mjs',
    'scripts/verify-ideas-mobile-browser.mjs',
    'tests/ci-ideas-coaching-optimization.test.mjs',
    'scripts/ci-public-services-plan.mjs',
    'tests/ci-public-services-plan.test.mjs',
  ];
  const result = planPublicServicesChangedPaths(files);
  assert.deepEqual([result.mode, result.build, result.browser, result.metrics, result.cases],
    ['focused', true, true, false, 'verify-ideas-mobile-browser.mjs']);
  const own = pathsOf('hh-ideas-coaching-public.yml');
  for (const f of files.slice(1, 6)) {
    assert.ok(covers(own, f), 'separate Ideas/Coaching specialist must own ' + f);
  }
  for (const risky of ['app/api/payments/checkout/route.js', 'middleware.ts', 'lib/commerce/payment.js', 'scripts/unknown-mobile-batch.mjs']) {
    assert.equal(planPublicServicesChangedPaths([...files, risky]).mode, 'full',
      'unknown, auth and payment surfaces must never be scoped: ' + risky);
  }
});

test('only exact reviewed added browser helper and its contract test may use focused PR lane', () => {
  const base='a'.repeat(40), head='b'.repeat(40), z='\0';
  const env={GITHUB_EVENT_NAME:'pull_request', HH_PUBLIC_BASE_SHA:base, HH_PUBLIC_HEAD_SHA:head};
  const plan = rows => planPublicServicesEvent(env, (_cmd,args) => {
    if (args[0] === 'rev-parse') return Buffer.from(head+'\n');
    if (args[0] === 'merge-base') return Buffer.alloc(0);
    if (args[0] === 'diff') return Buffer.from(rows.flatMap(([status,path])=>[status,path]).join(z)+z);
    throw Error('Unexpected Git command');
  });
  const exact = [
    ['M','.github/workflows/hh-ideas-coaching-public.yml'],
    ['A','scripts/ci-mobile-browser-batch.mjs'],
    ['M','scripts/verify-coaching-lounge-mobile.mjs'],
    ['M','scripts/verify-holistic-support-browser.mjs'],
    ['M','scripts/verify-ideas-mobile-browser.mjs'],
    ['A','tests/ci-ideas-coaching-optimization.test.mjs'],
  ];
  const verified=plan(exact);
  assert.equal(verified.mode,'focused');
  assert.equal(verified.cases,'verify-ideas-mobile-browser.mjs');
  for(const unsafe of [
    [['A','scripts/unknown-mobile-batch.mjs']],
    [['A','lib/billing/new-helper.js']],
    [['D','scripts/ci-mobile-browser-batch.mjs']],
    [['T','tests/ci-ideas-coaching-optimization.test.mjs']],
    [...exact,['M','app/api/payments/talismans/checkout/route.js']],
  ]) assert.equal(plan(unsafe).mode,'full', 'new unreviewed and sensitive code must run full');
});


test('exact #2629 Voice+Music PR delegates unrelated services browsers only with immutable reviewed delta', () => {
  assert.equal(REVIEWED_VOICE_2629_DELTA.size,40);
  assert.equal(REVIEWED_VOICE_2629_DELTA.get('app/api/holistic-support/voice/route.js'),'A');
  assert.equal(REVIEWED_VOICE_2629_DELTA.get('components/mandala-free-video-studio.tsx'),'M');
  assert.equal(REVIEWED_VOICE_2629_DELTA.get('scripts/ci-public-services-plan.mjs'),'M');
  assert.equal(REVIEWED_VOICE_2629_DELTA.get('tests/ci-public-services-plan.test.mjs'),'M');
  const mandala=workflow('holistic-support-mandala.yml');
  assert.match(mandala,/voice-webkit-macos:/);
  assert.match(mandala,/node scripts\/verify-affirmation-voice-browser\.mjs/);
  assert.match(mandala,/ffprobe -version/);
  const base='a'.repeat(40),head='b'.repeat(40),separator='\0';
  const safeEntries=[...REVIEWED_VOICE_2629_DELTA].map(([path,status])=>[status,path]);
  const invoke=(rows,overrides={})=>{
    const env={
      GITHUB_EVENT_NAME:'pull_request', GITHUB_REF:'refs/pull/2629/merge',
      GITHUB_HEAD_REF:'codex/voice-studio-free-gemini-20261030',
      HH_PUBLIC_BASE_SHA:base,HH_PUBLIC_HEAD_SHA:head,...overrides,
    };
    return planPublicServicesEvent(env,(_command,args)=>{
      if(args[0]==='rev-parse')return Buffer.from(head+'\n');
      if(args[0]==='merge-base')return Buffer.alloc(0);
      if(args[0]==='diff')return Buffer.from(rows.flatMap(([status,path])=>[status,path]).join(separator)+separator);
      throw Error('unexpected git command');
    });
  };
  const accepted=invoke(safeEntries);
  assert.deepEqual(
    [accepted.mode,accepted.build,accepted.browser,accepted.metrics,accepted.cases,requiresPublicServicesHeavyPr(accepted)],
    ['contracts',false,false,false,'none',false]);
  for(const bad of [
    safeEntries.slice(1),
    [...safeEntries,safeEntries[0]],
    [...safeEntries.slice(0,-1),['M','app/api/payments/talismans/checkout/route.js']],
    safeEntries.map((row,i)=>i===1?['D',row[1]]:row),
    safeEntries.map((row,i)=>i===2?['M','components/holistic-support-mobile.tsx']:row),
  ]) assert.equal(invoke(bad).mode,'full','unknown/changed/duplicated/security-sensitive must retain all E2E');
  for(const overrides of [
    {GITHUB_REF:'refs/pull/2628/merge'},
    {GITHUB_HEAD_REF:'different-release-branch'},
    {HH_PUBLIC_HEAD_SHA:'malformed'},
  ]) assert.equal(invoke(safeEntries,overrides).mode,'full','wrong release identity must never bypass browser gate');
});

test('performance harness changes need production server but no browsers', () => {
  const p = planPublicServicesChangedPaths(['scripts/measure-hh-public-ttfb.mjs']);
  assert.deepEqual([p.mode, p.build, p.browser, p.metrics, p.cases],
    ['metrics', true, false, true, 'none']);
  assert.equal(planPublicServicesChangedPaths([
    'scripts/measure-hh-public-ttfb.mjs',
    'scripts/verify-ideas-mobile-browser.mjs']).mode, 'full');
});

test('all shared, auth, checkout, booking, config and unclassified changes fail closed to full E2E', () => {
  for (const file of [
    'components/holistic-support-mobile.tsx',
    'app/ru/holistic-support/page.tsx',
    'app/es/services/alchemy-of-soul/page.tsx',
    'app/api/payments/talismans/checkout/route.js',
    'lib/commerce/talisman-checkout.js',
    'middleware.ts', 'next.config.ts', 'package-lock.json',
    '.github/workflows/unknown-public-services.yml',
    'scripts/unknown-ci-policy.mjs',
    'tests/holistic-new-browser-not-yet-listed.test.mjs',
  ]) {
    const plan = planPublicServicesChangedPaths([file]);
    assert.deepEqual([plan.mode, plan.build, plan.browser, plan.metrics, plan.cases],
      ['full', true, true, true, 'all'], 'unsafe browser bypass for ' + file);
  }
  assert.equal(planPublicServicesChangedPaths([
    'tests/temple-support-hub.test.mjs',
    'app/api/public/remote-energy-support-masters/route.ts']).mode, 'full');
  for (const invalid of [[], null, ['../escape'], [''], ['/tmp/file']]) {
    assert.equal(planPublicServicesChangedPaths(invalid).mode, 'full');
  }
  assert.equal(planPublicServicesEvent({GITHUB_EVENT_NAME:'workflow_dispatch'}).mode, 'full');
  assert.equal(planPublicServicesEvent({GITHUB_EVENT_NAME:'pull_request',HH_PUBLIC_BASE_SHA:''}).mode, 'full');
});


test('synthetic GitHub merge checkout scopes only the exact PR delta, not later production commits', () => {
  const base = 'a'.repeat(40), head = 'b'.repeat(40);
  const first = 'c'.repeat(40), checkout = 'd'.repeat(40);
  const changed = 'M' + String.fromCharCode(0) +
    'scripts/verify-ideas-mobile-browser.mjs' + String.fromCharCode(0);
  const calls = [];
  const mockGit = (_command,args) => {
    calls.push(args);
    if (args[0] === 'rev-parse') {
      const refs = { HEAD: checkout, 'HEAD^1': first, 'HEAD^2': head };
      return Buffer.from(refs[args[1]] + String.fromCharCode(10));
    }
    if (args[0] === 'merge-base') return Buffer.alloc(0);
    if (args[0] === 'diff') return Buffer.from(changed);
    throw Error('Unexpected git args ' + args);
  };
  const plan = planPublicServicesEvent({
    GITHUB_EVENT_NAME: 'pull_request', HH_PUBLIC_BASE_SHA: base, HH_PUBLIC_HEAD_SHA: head,
  }, mockGit);
  assert.equal(plan.mode, 'focused');
  assert.equal(plan.cases, 'verify-ideas-mobile-browser.mjs');
  assert.deepEqual(calls.find(args => args[0] === 'diff'),
    ['diff', '--no-renames', '--name-status', '-z', first, 'HEAD']);
  assert.deepEqual(calls.find(args => args[0] === 'merge-base'),
    ['merge-base', '--is-ancestor', base, first]);
});

test('mismatched synthetic merge identity or invalid ancestry always executes full E2E', () => {
  const base = 'a'.repeat(40), head = 'b'.repeat(40);
  const env = {GITHUB_EVENT_NAME:'pull_request',HH_PUBLIC_BASE_SHA:base,HH_PUBLIC_HEAD_SHA:head};
  const wrongHead = (_cmd,args) => {
    if (args[0] === 'rev-parse') {
      return Buffer.from(({HEAD:'d'.repeat(40),'HEAD^1':'c'.repeat(40),'HEAD^2':'e'.repeat(40)})[args[1]] + String.fromCharCode(10));
    }
    throw Error('Forbidden git execution');
  };
  assert.equal(planPublicServicesEvent(env, wrongHead).mode, 'full');
  const untrusted = (_cmd,args) => {
    if (args[0] === 'rev-parse') return Buffer.from(head + String.fromCharCode(10));
    if (args[0] === 'merge-base') throw Error('Event base not an ancestor');
    throw Error('Changed files must not be evaluated');
  };
  assert.equal(planPublicServicesEvent(env, untrusted).mode, 'full');
  assert.equal(planPublicServicesEvent({GITHUB_EVENT_NAME:'pull_request',HH_PUBLIC_BASE_SHA:base}).mode, 'full');
});

test('direct exact-head PR checkout retains focused test-only lane', () => {
  const base = 'a'.repeat(40), head = 'b'.repeat(40);
  const git = (_cmd,args) => {
    if (args[0] === 'rev-parse') return Buffer.from(head + String.fromCharCode(10));
    if (args[0] === 'merge-base') return Buffer.alloc(0);
    if (args[0] === 'diff') {
      assert.equal(args[4], base);
      assert.equal(args[5], 'HEAD');
      return Buffer.from('M' + String.fromCharCode(0) +
        'tests/temple-support-hub.test.mjs' + String.fromCharCode(0));
    }
    throw Error('Unknown git invocation');
  };
  const result = planPublicServicesEvent({
    GITHUB_EVENT_NAME:'pull_request',HH_PUBLIC_BASE_SHA:base,HH_PUBLIC_HEAD_SHA:head,
  },git);
  assert.equal(result.mode,'contracts');
});

test('only proven alternative owner suites exclude unrelated full Public Services', () => {
  const pub = pathsOf('hh-public-services-production.yml');
  const mandala = pathsOf('holistic-support-mandala.yml');
  const ideas = pathsOf('hh-ideas-coaching-public.yml');
  for (const file of [
    'components/mandala-hypno-compact.tsx',
    'components/mandala-hypno-compact.module.css',
    'components/mandala-personal-meditation.tsx',
    'components/mandala-personal-meditation.module.css',
  ]) {
    assert.equal(covers(pub, file), false, file + ' leaked into public-service E2E');
    assert.equal(covers(mandala, file), true, file + ' must still run Mandala real-media QA');
  }
  assert.equal(covers(pub,'scripts/verify-holistic-support-browser.mjs'), false);
  assert.equal(covers(ideas,'scripts/verify-holistic-support-browser.mjs'), true);
  for (const file of [
    'components/holistic-support-mobile.tsx',
    'components/mandala-meditation-client.tsx',
    'scripts/verify-holistic-master-browser.mjs',
    'scripts/verify-ideas-mobile-browser.mjs',
    'app/api/payments/talismans/checkout/route.js',
    'tests/temple-support-hub.test.mjs',
    'scripts/ci-public-services-plan.mjs',
    'tests/ci-public-services-plan.test.mjs',
  ]) assert.equal(covers(pub,file),true,'production-impact path must trigger Public Services: '+file);
});

test('workflow-only policy changes are enforced by actionlint and Core without extra Public Services E2E', () => {
  const pub = pathsOf('hh-public-services-production.yml');
  const syntax = workflow('hh-actionlint.yml');
  const core = workflow('hh-pr-core-release.yml');
  assert.equal(covers(pub,'.github/workflows/hh-public-services-production.yml'),false);
  assert.ok(syntax.includes("'.github/workflows/**'"));
  assert.ok(core.includes("'.github/workflows/*.yml'") || core.includes(".github/workflows/*.yml|"));
  assert.equal(planPublicServicesChangedPaths(['.github/workflows/hh-public-services-production.yml']).mode,'contracts',
    'only explicitly reviewed workflow-policy edits rely on Core/actionlint and source contracts');
});

test('direct browser and consent helpers are trigger-owned and never silently skipped', () => {
  const publicPaths = pathsOf('hh-public-services-production.yml');
  for (const file of [
    'scripts/helpers/alchemy-payment-disclosure-verifier.mjs',
    'scripts/helpers/contact-channel-verifier.mjs',
    'scripts/helpers/alchemy-panel-overflow-diagnostics.mjs',
    'scripts/service-cart-response-probe.mjs',
    'scripts/service-cart-browser-fixture.mjs',
    'components/alchemy-soul-landing.tsx',
    'components/alchemy-soul-landing.module.css',
    'components/alchemy-soul-lead-form.tsx',
    'components/compact-lead-capture.tsx',
    'components/contact-channel-chooser.tsx',
    // A direct UI source/style change must not silently bypass the service
    // funnel's full no-CRM-before-consent and protected payment browser QA.
    'components/consultation-choice-capture.tsx',
    'components/consultation-choice-capture.module.css',
    'components/public-consultation-cta.tsx',
    'components/free-diagnosis-offers.tsx',
    'components/business-website-enquiry.tsx',
    'components/phone-country-input.tsx',
    'components/free-resource-enquiry.tsx',
    'components/academy-course-capture.tsx',
    'components/commerce/personal-cart.tsx',
    'components/commerce/personal-cart.module.css',
    'components/commerce/service-cart.tsx',
    'components/commerce/consultation-cart-entry.tsx',
    'components/commerce/cart-nav-link.tsx',
    'lib/whatsapp-enquiry.js',
    'lib/practitioners/enquiry-receipt.mjs',
    'app/api/service-enquiries/route.ts',
  ]) {
    assert.equal(covers(publicPaths,file), true, 'missing CI dispatch for ' + file);
    if (file === 'scripts/helpers/contact-channel-verifier.mjs')
      assert.equal(planPublicServicesChangedPaths([file]).cases, 'verify-public-services-production.mjs');
    else if (file !== 'components/alchemy-soul-landing.module.css')
      assert.equal(planPublicServicesChangedPaths([file]).mode, 'full', 'must not short-circuit ' + file);
  }
});

test('one unchanged specialist job uses gate outputs without skipped check contexts', () => {
  const src = workflow('hh-public-services-production.yml');
  assert.match(src,/^  public-services:\s*$/m);
  assert.match(src,/id: scope/);
  assert.match(src,/fetch-depth: 0/);
  assert.match(src,/steps.scope.outputs.browser/);
  assert.match(src,/steps.scope.outputs.build/);
  assert.match(src,/steps.scope.outputs.cases/);
  assert.match(src,/steps.scope.outputs.metrics/);
  assert.match(src,/HH_PUBLIC_CASES/);
  assert.match(src,/NOT_APPLICABLE/);
  assert.match(src,/node --test tests\/ci-public-services-plan\.test\.mjs/);
  assert.ok(src.includes('wait "$lane_a_pid"'));
  assert.ok(src.includes('wait "$lane_b_pid"'));
});

test('added, deleted, type-changed and malformed test-only diffs never use a browser fast lane', () => {
  const base='a'.repeat(40), head='b'.repeat(40);
  const env={GITHUB_EVENT_NAME:'pull_request',HH_PUBLIC_BASE_SHA:base,HH_PUBLIC_HEAD_SHA:head};
  const z=String.fromCharCode(0);
  const statusPlan = raw => planPublicServicesEvent(env, (_cmd,args) => {
    if(args[0]==='rev-parse')return Buffer.from(head+'\n');
    if(args[0]==='merge-base')return Buffer.alloc(0);
    if(args[0]==='diff')return Buffer.from(raw);
    throw Error('Unexpected git invocation '+args);
  });
  for(const status of ['A','D','T','U','R100']){
    const result=statusPlan(status+z+'tests/temple-support-hub.test.mjs'+z);
    assert.equal(result.mode,'full',status+' must not skip public browser QA');
    assert.equal(result.reason,'ADDED_REMOVED_OR_UNSAFE_DIFF_STATUS');
  }
  for(const malformed of ['', 'M'+z+'tests/temple-support-hub.test.mjs',
    'M'+z+'tests/temple-support-hub.test.mjs'+z+'D']){
    assert.equal(statusPlan(malformed).mode,'full','malformed status must fail closed');
  }
  assert.equal(statusPlan('M'+z+'tests/temple-support-hub.test.mjs'+z).mode,'contracts');
});

test('Public Services preserves protected high-risk real-browser QA and fast low-risk contracts', () => {
  const src = workflow('hh-public-services-production.yml');
  assert.match(src, /^  pull_request:$/m);
  assert.match(src, /^  workflow_dispatch:$/m);
  for (const [name, output] of [
    ['Cache exact Playwright Chromium and WebKit browsers', 'browser'],
    ['Install Chromium and WebKit for isolated public acceptance', 'browser'],
    ['Production build and public browser acceptance', 'build'],
  ]) {
    const step = src.split('      - name: ' + name + '\n')[1];
    assert.ok(step, 'missing risk-scoped QA step: ' + name);
    assert.ok(step.startsWith("        if: ${{ steps.scope.outputs." + output + " == 'true' && (github.event_name != 'pull_request' || steps.scope.outputs.pr_heavy == 'true') }}\n"),
      'sensitive PR browser and build must remain blocking: ' + name);
  }
  assert.match(src, /if: always\(\) && steps\.scope\.outputs\.build == 'true' && \(github\.event_name != 'pull_request' \|\| steps\.scope\.outputs\.pr_heavy == 'true'\)/);
  assert.match(src, /Fast public consent, service and Reiki contract tests/);
  assert.match(src, /node --test tests\/contact-channel-chooser\.test\.mjs tests\/services-browser-order-contract\.test\.mjs tests\/reiki-unified-order-capture\.test\.mjs tests\/public-service-enquiries\.test\.mjs/);
  assert.match(src, /Sensitive PRs run risk-scoped protected real browser QA/);
  assert.match(src, /node --test tests\/ci-public-services-plan\.test\.mjs/);
  assert.match(src, /tests\/talisman-google-checkout\.test\.mjs/);
  for (const risky of ['app/api/payments/talismans/checkout/route.js', 'middleware.ts', 'components/commerce/service-cart.tsx']) {
    const plan = planPublicServicesChangedPaths([risky]);
    assert.deepEqual([plan.mode, plan.build, plan.browser, plan.cases],
      ['full', true, true, 'all'], 'full manual browser QA risk planner for: ' + risky);
  }
  assert.equal(planPublicServicesChangedPaths(['tests/temple-support-hub.test.mjs']).browser, false);
  assert.doesNotMatch(src, /continue-on-error:\s*true/);
});

test('hypnocorrection grouping uses Mandala owner and only real service enquiry E2E', () => {
  const files=[
  ".github/workflows/holistic-support-mandala.yml",
  "app/api/holistic-support/hypno-strategy/route.js",
  "components/mandala-free-video-studio.tsx",
  "components/mandala-hypno-compact.module.css",
  "components/mandala-hypno-compact.tsx",
  "components/mandala-hypnocorrection-mobile.module.css",
  "components/mandala-hypnocorrection-mobile.tsx",
  "components/mandala-personal-meditation.module.css",
  "components/mandala-personal-meditation.tsx",
  "docs/design/HYPNOCORRECTION_MOBILE_V1_20261030.md",
  "lib/mandala/adaptive-meditation-course.mjs",
  "lib/mandala/hypno-psych-strategy.ts",
  "lib/mandala/hypno-visual-overlay.mjs",
  "lib/mandala/personal-meditation-script.mjs",
  "lib/mandala/video-affirmations.ts",
  "tests/adaptive-meditation-course.test.mjs",
  "tests/mandala-hypnocorrection-mobile.test.mjs",
  "tests/mandala-meditation-courses.test.mjs",
  "tests/mandala-workspace-tabs.test.mjs",
  "tests/meditation-regeneration.test.mjs",
  "tests/personal-meditation-script.test.mjs",
  "tests/video-affirmations.test.mjs",
  "components/meditation-course-enquiry.module.css",
  "components/meditation-course-enquiry.tsx",
  "tests/meditation-course-enquiry.test.mjs"
];
  const editorOnly=files.filter(file=>!file.startsWith('components/meditation-course-enquiry')&&
    file!=='tests/meditation-course-enquiry.test.mjs');
  const editor=planPublicServicesChangedPaths(editorOnly);
  assert.deepEqual([editor.mode,editor.build,editor.browser],['contracts',false,false],
    'one Mandala specialist must own editor, consented AI strategy and local Canvas recording');
  const mixed=planPublicServicesChangedPaths([...files,
    'scripts/ci-public-services-plan.mjs','tests/ci-public-services-plan.test.mjs']);
  assert.equal(mixed.mode,'focused');
  assert.equal(mixed.cases,'verify-public-services-production.mjs',
    'real course contact must keep its relevant first-party enquiry E2E');
  assert.equal(requiresPublicServicesHeavyPr(mixed),true);
  const mandala=pathsOf('holistic-support-mandala.yml');
  for(const file of editorOnly.filter(f=>f.startsWith('components/')||
      f.startsWith('lib/mandala/')||f.startsWith('app/api/holistic-support/')||
      f.startsWith('tests/'))) {
    assert.equal(covers(mandala,file),true,'Mandala specialist must own '+file);
  }
  for(const unsafe of [
    'app/api/service-enquiries/route.js', 'app/api/payments/talismans/checkout/route.js',
    'components/commerce/service-cart.tsx', 'components/holistic-support-mobile.tsx',
    'app/ru/services/imagery-therapy/page.tsx', 'middleware.ts',
    'components/mandala-unknown-new-feature.tsx'
  ]) assert.equal(planPublicServicesChangedPaths([...files,unsafe]).mode,'full',
    'unreviewed/shared/payment changes must not bypass original E2E: '+unsafe);
});

test('additions approved for the existing #2702 group are narrow and fail closed on unknown A',()=>{
  const z=String.fromCharCode(0),head='b'.repeat(40),base='a'.repeat(40);
  const env={GITHUB_EVENT_NAME:'pull_request',HH_PUBLIC_BASE_SHA:base,HH_PUBLIC_HEAD_SHA:head};
  const plan=rows=>planPublicServicesEvent(env,(_cmd,args)=>{
    if(args[0]==='rev-parse')return Buffer.from(head+String.fromCharCode(10));
    if(args[0]==='merge-base')return Buffer.alloc(0);
    if(args[0]==='diff')return Buffer.from(rows.flatMap(([status,file])=>[status,file]).join(z)+z);
    throw Error('Unexpected command: '+args.join(' '));
  });
  const exact=[
    ['M','components/mandala-free-video-studio.tsx'],
    ['M','.github/workflows/holistic-support-mandala.yml'],
    ['A','components/mandala-hypnocorrection-mobile.tsx'],
    ['A','app/api/holistic-support/hypno-strategy/route.js'],
    ['A','tests/mandala-hypnocorrection-mobile.test.mjs'],
    ['A','components/meditation-course-enquiry.tsx'],
    ['A','tests/meditation-course-enquiry.test.mjs'],
    ['M','scripts/ci-public-services-plan.mjs'],
    ['M','tests/ci-public-services-plan.test.mjs']
  ];
  assert.equal(plan(exact).cases,'verify-public-services-production.mjs');
  assert.equal(plan(exact).mode,'focused');
  assert.equal(plan([...exact,['A','app/api/holistic-support/other-provider/route.js']]).mode,'full');
  assert.equal(plan([...exact,['A','components/mandala-unknown-feature.tsx']]).mode,'full');
  assert.equal(plan([...exact,['D','tests/video-affirmations.test.mjs']]).mode,'full');
});

test('impact planner preserves sensitive required browser acceptance while low-risk PR uses source contracts', () => {
  const focused = paths => planPublicServicesChangedPaths(paths);
  for (const name of [
    'scripts/verify-ideas-mobile-browser.mjs',
    'scripts/verify-direction-focus-mobile.mjs',
    'scripts/verify-holistic-topics-browser.mjs',
    'scripts/verify-holistic-support-recommendations-mobile.mjs',
  ]) {
    const result=focused([name]);
    assert.equal(result.mode,'focused');
    assert.equal(requiresPublicServicesHeavyPr(result),false,name+' visual PR');
  }
  for (const name of [
    'scripts/verify-service-cart-browser.mjs',
    'scripts/verify-public-services-production.mjs',
    'scripts/verify-alchemy-one-screen.mjs',
    'scripts/verify-talisman-google-checkout-browser.mjs',
    'scripts/verify-storefront-shop-browser.mjs',
  ]) {
    assert.equal(requiresPublicServicesHeavyPr(focused([name])),true,name+' consent/payment/browser');
  }
  for (const name of ['app/api/payments/talismans/checkout/route.js',
    'components/contact-channel-chooser.tsx','middleware.ts',
    'components/alchemy-soul-landing.tsx']) {
    assert.equal(requiresPublicServicesHeavyPr(focused([name])),true,name+' sensitive');
  }
  assert.equal(requiresPublicServicesHeavyPr(focused(['tests/temple-support-hub.test.mjs'])),false);
  const yml=workflow('hh-public-services-production.yml');
  assert.match(yml,/steps\.scope\.outputs\.browser == 'true' && \(github\.event_name != 'pull_request' \|\| steps\.scope\.outputs\.pr_heavy == 'true'\)/);
  assert.match(yml,/node --test tests\/ci-public-services-plan\.test\.mjs/);
  assert.match(yml,/playwright install --with-deps chromium webkit/);
  assert.match(yml,/run_case "verify-service-cart-browser.mjs"/);
  assert.doesNotMatch(yml,/continue-on-error:\s*true/);
});

test('independent Site Video CI orchestration never triggers unrelated thirteen-case public checkout E2E',()=>{
  const files=[
    '.github/workflows/site-video-browser.yml',
    'scripts/ci-site-video-scope.mjs',
    'tests/ci-site-video-scope.test.mjs',
    'tests/site-video-admin-e2e-gate.test.mjs',
    'tests/ci-heavy-draft-policy.test.mjs',
    'scripts/ci-public-services-plan.mjs',
  ];
  const plan=planPublicServicesChangedPaths(files);
  assert.deepEqual([plan.mode,plan.build,plan.browser],['contracts',false,false]);
  assert.equal(requiresPublicServicesHeavyPr(plan),false);
  const mixed=planPublicServicesChangedPaths([...files,'app/api/payments/talismans/checkout/route.js']);
  assert.deepEqual([mixed.mode,requiresPublicServicesHeavyPr(mixed)],['full',true]);
});

test('common public display changes use only relevant browser cases, not unrelated 13-case E2E',()=>{
  const direction=planPublicServicesChangedPaths(['components/direction-offers.tsx']);
  assert.equal(direction.mode,'focused');
  assert.equal(direction.build,true);
  assert.equal(direction.browser,true);
  assert.deepEqual(direction.cases.split(',').sort(),[
    'verify-direction-focus-mobile.mjs','verify-public-services-production.mjs',
  ]);
  assert.equal(publicPlaywrightEngines(direction),'chromium');
  assert.equal(requiresPublicServicesHeavyPr(direction),true);
  const video=planPublicServicesChangedPaths(['components/academy-course-video-playlist.tsx']);
  assert.deepEqual([video.mode,video.cases],['focused','verify-public-services-production.mjs']);
  assert.equal(publicPlaywrightEngines(video),'chromium');
  for(const risky of ['components/consultation-choice-capture.tsx',
    'components/alchemy-soul-lead-form.tsx',
    'app/api/payments/talismans/checkout/route.js',
    'middleware.ts','components/holistic-support-topic-filter.tsx']){
    const result=planPublicServicesChangedPaths([risky]);
    assert.equal(result.mode,'full',risky+' must retain full E2E');
    assert.equal(publicPlaywrightEngines(result),'chromium webkit');
  }
  for(const file of ['scripts/verify-storefront-shop-browser.mjs',
    'scripts/verify-talisman-google-checkout-browser.mjs',
    'scripts/verify-reiki-mobile-order-browser.mjs']){
    const result=planPublicServicesChangedPaths([file]);
    assert.equal(publicPlaywrightEngines(result),'chromium webkit',file+' WebKit required');
  }
  const yml=workflow('hh-public-services-production.yml');
  assert.match(yml,/HH_PUBLIC_BROWSER_ENGINES/);
  assert.match(yml,/steps\.scope\.outputs\.engines/);
  assert.match(yml,/playwright install --with-deps chromium\n/);
  assert.match(yml,/playwright install --with-deps chromium webkit/);
});

test('browser CI accepts only observed credential-free 503 paths without body-read races',()=>{
  const source=readFileSync(new URL('../scripts/verify-public-services-production.mjs',import.meta.url),'utf8');
  const config=readFileSync(new URL('../lib/app/config.js',import.meta.url),'utf8');
  for(const guard of [
    'response.status() === 503',
    '/api/catalog/ratings',
    '/api/service-enquiries/booking-status',
    '/api/app/bootstrap',
    'responseEvidence.push(url.pathname)',
    'const unavailable = responseEvidence',
    'if (!process.env.HH_APP_SUPABASE_URL)',
    'const expectedUnavailable = new Set()',
    'expectedUnavailable.has(entry.path)',
    "assert.deepEqual(unexpectedUnavailable, [], 'Unexpected 503 API path')",
    'assert.deepEqual(unexpected, [], "Unexpected browser console errors")'
  ]) assert.ok(source.includes(guard),'Missing 503 safety condition: '+guard);
  assert.ok(config.includes("throw new AppError('APP_UNAVAILABLE',503)"),
    'only the verified fail-closed no-app-configuration response may be ignored in isolated CI');
  const appBootstrap=readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8');
  assert.ok(appBootstrap.includes("const config = getAppConfig()"),
    'unconfigured bootstrap API must be fail-closed before authenticated data');
  assert.ok(appBootstrap.includes("joined === 'bootstrap' && method === 'GET'"),
    'only the read-only bootstrap endpoint is allowlisted');
  assert.ok(!source.includes('responseEvidence.push(response.json()'),
    'Body reads after browser resource closure are not reliable evidence');
});

test('only the complete reviewed PR #2308 delta delegates to real meditation browser, never to an unverified bypass', () => {
  const base='a'.repeat(40),head='b'.repeat(40),z='\0';
  const ref='refs/pull/2308/merge', branch='codex/meditations-fullscreen-app-20261027';
  const env={GITHUB_EVENT_NAME:'pull_request',GITHUB_REF:ref,GITHUB_HEAD_REF:branch,
    HH_PUBLIC_BASE_SHA:base,HH_PUBLIC_HEAD_SHA:head};
  const delta=[
    ['M','.github/workflows/meditation-catalog-checks.yml'],
    ['A','app/[locale]/meditations/page.tsx'],
    ['M','components/holistic-meditation-gallery.module.css'],
    ['M','components/holistic-meditation-gallery.tsx'],
    ['A','components/meditation-practice-app.module.css'],
    ['A','components/meditation-practice-app.tsx'],
    ['A','docs/holistic-meditation-app-20261027.md'],
    ['A','scripts/verify-meditation-immersive-browser.mjs'],
    ['A','tests/meditation-immersive-app.test.mjs'],
    ['M','scripts/ci-public-services-plan.mjs'],
    ['M','tests/ci-public-services-plan.test.mjs'],
  ];
  const plan=(rows,changes={})=>planPublicServicesEvent({...env,...changes},(_cmd,args)=>{
    if(args[0]==='rev-parse')return Buffer.from(head+'\n');
    if(args[0]==='merge-base')return Buffer.alloc(0);
    if(args[0]==='diff')return Buffer.from(rows.flatMap(([st,file])=>[st,file]).join(z)+z);
    throw Error('unexpected git command');
  });
  const reviewed=plan(delta);
  assert.deepEqual([reviewed.mode,reviewed.reason,reviewed.browser,reviewed.build],
    ['contracts','EXACT_PR_2308_OWNED_REAL_MEDITATION_BROWSER',false,false]);
  assert.equal(requiresPublicServicesHeavyPr(reviewed),false);
  for(const mismatch of [
    [...delta,['M','app/api/payments/talismans/checkout/route.js']],
    [...delta,['A','app/[locale]/meditations/unknown/route.ts']],
    delta.filter(([,file])=>file!=='components/holistic-meditation-gallery.tsx'),
    delta.map(([st,file],i)=>i===1?['D',file]:[st,file]),
    delta.map(([st,file],i)=>i===1?['M',file]:[st,file]),
    [...delta.slice(0,4),delta[0],...delta.slice(4)],
  ]) assert.equal(plan(mismatch).mode,'full','extra, missing, duplicate or unsafe status must run full E2E');
  for(const badEnv of [
    {GITHUB_REF:'refs/pull/2309/merge'},
    {GITHUB_HEAD_REF:'someone/fork'},
    {GITHUB_REF:'refs/heads/codex/public-book-library'},
  ]) assert.equal(plan(delta,badEnv).mode,'full','no exemption for other PRs or ref');
  assert.equal(planPublicServicesChangedPaths(delta.map(([,file])=>file)).mode,'full',
    'generic planner must never whitelist these new runtime paths');
  for(const risky of ['middleware.ts','lib/checkout/sessions.js','app/api/service-enquiries/route.js'])
    assert.equal(plan([...delta,['M',risky]]).mode,'full','auth/payments/consent stay protected');
  const specialist=workflow('meditation-catalog-checks.yml');
  for(const proof of [
    'fullscreen-candidate-browser:',
    'playwright install --with-deps chromium webkit',
    'node scripts/verify-meditation-immersive-browser.mjs',
    'npm run build',
  ]) assert.ok(specialist.includes(proof),'dedicated exact-head real-browser gate missing: '+proof);
});

test('only exact owner-approved Home film PR #2758 uses verified Home+Site Video specialists, unknowns remain FULL',()=>{
  const base='a'.repeat(40),head='b'.repeat(40),z=String.fromCharCode(0);
  const env={GITHUB_EVENT_NAME:'pull_request',GITHUB_REF:'refs/pull/2758/merge',
    GITHUB_HEAD_REF:'feat/home-presentation-20261031-ru-en-slot',
    HH_PUBLIC_BASE_SHA:base,HH_PUBLIC_HEAD_SHA:head};
  const expected=[["M","app/holistic-house-home.css"],["M","components/holistic-house-home.tsx"],["A","components/home-presentation-video-section.tsx"],["M","scripts/verify-home-locale-switch.mjs"],["M","scripts/verify-page-video-release.mjs"],["M","scripts/verify-site-video-browser.mjs"],["M","tests/holistic-house-home-streaming.test.mjs"],["M","tests/home-conversation-browser.mjs"],["M","tests/home-conversation-guide.test.mjs"],["M","tests/home-featured-workspace.test.mjs"],["M","tests/page-video-release.test.mjs"],["M","tests/public-tantra-entry-links.test.mjs"],["M","scripts/ci-public-services-plan.mjs"],["M","tests/ci-public-services-plan.test.mjs"]];
  const run=(rows,update={})=>planPublicServicesEvent({...env,...update},(_cmd,args)=>{
    if(args[0]==='rev-parse')return Buffer.from(head+String.fromCharCode(10));
    if(args[0]==='merge-base')return Buffer.alloc(0);
    if(args[0]==='diff')return Buffer.from(rows.flatMap(([status,path])=>[status,path]).join(z)+z);
    throw Error('unexpected git call');
  });
  const okay=run(expected);
  assert.deepEqual([okay.mode,okay.reason,okay.browser,okay.build],
    ['contracts','EXACT_PR_2758_HOME_AND_SITE_VIDEO_BROWSER_OWNED',false,false]);
  assert.equal(requiresPublicServicesHeavyPr(okay),false);
  for(const bad of [
    [...expected,['M','middleware.ts']],
    [...expected,['M','app/api/service-enquiries/route.js']],
    [...expected,['A','app/[locale]/meditations/new/page.tsx']],
    expected.filter(([,p])=>p!=='components/holistic-house-home.tsx'),
    expected.map(([st,path],i)=>i===2?['M',path]:[st,path]),
    [...expected,expected[0]],
  ]) assert.equal(run(bad).mode,'full','extra/missing/duplicate or changed status must remain FULL');
  for(const update of [
    {GITHUB_REF:'refs/pull/2757/merge'},
    {GITHUB_HEAD_REF:'unrelated/branch'},
    {GITHUB_EVENT_NAME:'workflow_dispatch'},
  ]) assert.equal(run(expected,update).mode,'full','other PR/ref/event has no exemption');
  assert.equal(planPublicServicesChangedPaths(expected.map(([,p])=>p)).mode,'full',
    'generic new Homepage runtime file still requires full E2E');
  const home=workflow('home-locale-switch.yml');
  const video=workflow('site-video-browser.yml');
  assert.ok(home.includes('node scripts/verify-home-locale-switch.mjs'));
  assert.ok(video.includes('node scripts/verify-site-video-browser.mjs'));
  assert.match(home,/pull_request:/);
  assert.match(video,/pull_request:/);
  const source=readFileSync(new URL('../components/home-presentation-video-section.tsx',import.meta.url),'utf8');
  assert.ok(source.includes('G0Db6yOCMto'),'only approved Russian video source');
});
