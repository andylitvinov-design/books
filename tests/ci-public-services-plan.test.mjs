import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchesGlob } from 'node:path';
import test from 'node:test';
import { PUBLIC_BROWSER_CASES, PUBLIC_SOURCE_TESTS, planPublicServicesChangedPaths, planPublicServicesEvent } from '../scripts/ci-public-services-plan.mjs';

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

test('isolated Alchemy CSS keeps real paired-browser acceptance, not 12 unrelated scripts', () => {
  const file = 'components/alchemy-soul-landing.module.css';
  const plan = planPublicServicesChangedPaths([file]);
  assert.equal(plan.mode, 'focused');
  assert.equal(plan.build, true);
  assert.equal(plan.browser, true);
  assert.equal(plan.metrics, false);
  assert.deepEqual(plan.cases.split(',').sort(),
    ['verify-alchemy-one-screen.mjs', 'verify-public-services-production.mjs']);
  assert.equal(planPublicServicesChangedPaths([file, 'components/alchemy-soul-lead-form.tsx']).mode, 'full');
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
    if (file !== 'components/alchemy-soul-landing.module.css')
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
