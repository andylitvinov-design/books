import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {
  PUBLIC_BROWSER_CASES, PUBLIC_SOURCE_TESTS,
  planPublicServicesChangedPaths, planPublicServicesEvent
} from '../scripts/ci-public-services-plan.mjs';

const workflow=readFileSync(new URL('../.github/workflows/hh-public-services-production.yml',import.meta.url),'utf8');
const filePath=path=>workflow.includes("      - '"+path+"'");

test('all fourteen actual public service browsers remain wired to one routed owner',()=>{
  assert.equal(PUBLIC_BROWSER_CASES.length,14);
  assert.equal(new Set(PUBLIC_BROWSER_CASES).size,14);
  for(const filename of PUBLIC_BROWSER_CASES)
    assert.ok(workflow.includes('run_case "'+filename+'" node scripts/'+filename),
      'lost real browser acceptance '+filename);
  assert.ok(PUBLIC_SOURCE_TESTS.length>=20,'Source tests must not be dropped');
  assert.match(workflow,/node --test tests\/ci-public-services-plan\.test\.mjs/);
  assert.match(workflow,/playwright install --with-deps chromium webkit/);
  assert.match(workflow,/npm run build > artifacts\/public-services-production\/build\.log/);
  assert.match(workflow,/timeout-minutes: 20/);
  assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
});

test('unit-only and trusted CI-only diffs skip duplicate browser install and Next build',()=>{
  const unit=planPublicServicesChangedPaths(['tests/temple-support-hub.test.mjs','tests/talisman-google-checkout.test.mjs']);
  assert.equal(unit.mode,'contracts');
  assert.equal(unit.browser,false);
  assert.equal(unit.build,false);
  const config=planPublicServicesChangedPaths([
    '.github/workflows/hh-public-services-production.yml',
    'scripts/ci-public-services-plan.mjs','tests/ci-public-services-plan.test.mjs',
  ]);
  assert.equal(config.mode,'contracts');
  assert.equal(config.browser,false);
  assert.equal(config.build,false);
  assert.ok(filePath('scripts/ci-public-services-plan.mjs'));
  assert.ok(filePath('tests/ci-public-services-plan.test.mjs'));
  assert.equal(filePath('.github/workflows/hh-public-services-production.yml'),false,
    'YAML-only changes are validated by Core/actionlint without launching Public Services');
});

test('browser-harness and isolated Alchemy presentation edits run focused REAL cases',()=>{
  const script=planPublicServicesChangedPaths(['scripts/verify-contact-channel-chooser-browser.mjs']);
  assert.equal(script.mode,'focused');
  assert.equal(script.browser,true);
  assert.equal(script.cases,'verify-contact-channel-chooser-browser.mjs');
  const alchemy=planPublicServicesChangedPaths(['components/alchemy-soul-landing.module.css']);
  assert.equal(alchemy.mode,'focused');
  assert.deepEqual(alchemy.cases.split(',').sort(),[
    'verify-alchemy-one-screen.mjs','verify-public-services-production.mjs']);
  assert.equal(alchemy.build,true);
  assert.equal(alchemy.metrics,false);
  const metric=planPublicServicesChangedPaths(['scripts/measure-hh-public-ttfb.mjs']);
  assert.equal(metric.mode,'metrics');
  assert.equal(metric.build,true);
  assert.equal(metric.browser,false);
});

test('sensitive, shared, unclassified and mixed diffs remain full browser acceptance',()=>{
  for(const file of [
    'components/holistic-support-mobile.tsx',
    'components/contact-channel-chooser.tsx',
    'app/api/payments/talismans/checkout/route.js',
    'app/api/app/private/report/route.js',
    'lib/commerce/talisman-checkout.js',
    'middleware.ts','next.config.ts','package-lock.json',
    'app/ru/services/page.tsx',
  ]) assert.equal(planPublicServicesChangedPaths([file]).mode,'full','unsafe skip '+file);
  assert.equal(planPublicServicesChangedPaths([
    'scripts/ci-public-services-plan.mjs','components/contact-channel-chooser.tsx']).mode,'full');
  for(const invalid of [[],null,[''],['../escape'],['/absolute/path']])
    assert.equal(planPublicServicesChangedPaths(invalid).mode,'full');
  assert.equal(planPublicServicesEvent({GITHUB_EVENT_NAME:'workflow_dispatch'}).mode,'full');
});

test('sensitive consent and checkout paths still trigger the real specialist',()=>{
  for(const filename of [
    'components/contact-channel-chooser*',
    'components/consultation-choice-capture*',
    'components/business-website-enquiry*',
    'components/phone-country-input*',
    'components/commerce/**',
    'app/api/service-enquiries/**',
    'scripts/helpers/contact-channel-verifier.mjs',
  ]) assert.ok(filePath(filename),'Missing protected source trigger '+filename);
  assert.match(workflow,/HH_PUBLIC_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.match(workflow,/HH_PUBLIC_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow,/fetch-depth: 0/);
  assert.match(workflow,/^  public-services:/m);
  assert.match(workflow,/if: \$\{\{ steps\.scope\.outputs\.build == 'true' \}\}/);
});

test('synthetic merge must be validated before narrowing, unknown ancestry runs full',()=>{
  const base='a'.repeat(40),head='b'.repeat(40),first='c'.repeat(40),merge='d'.repeat(40);
  const calls=[];
  const git=(_cmd,args)=>{
    calls.push(args);
    if(args[0]==='rev-parse')return Buffer.from(({HEAD:merge,'HEAD^1':first,'HEAD^2':head})[args[1]]+'\n');
    if(args[0]==='merge-base')return Buffer.alloc(0);
    if(args[0]==='diff')return Buffer.from('M\0scripts/verify-ideas-mobile-browser.mjs\0');
    throw Error('unexpected git operation');
  };
  const plan=planPublicServicesEvent({
    GITHUB_EVENT_NAME:'pull_request',HH_PUBLIC_BASE_SHA:base,HH_PUBLIC_HEAD_SHA:head
  },git);
  assert.equal(plan.mode,'focused');
  assert.equal(plan.cases,'verify-ideas-mobile-browser.mjs');
  assert.deepEqual(calls.find(x=>x[0]==='diff'),['diff','--no-renames','--name-status','-z',first,'HEAD']);
  const wrong=(_cmd,args)=>{
    if(args[0]==='rev-parse')
      return Buffer.from(({HEAD:merge,'HEAD^1':first,'HEAD^2':'e'.repeat(40)})[args[1]]+'\n');
    throw Error('unsafe');
  };
  assert.equal(planPublicServicesEvent({
    GITHUB_EVENT_NAME:'pull_request',HH_PUBLIC_BASE_SHA:base,HH_PUBLIC_HEAD_SHA:head
  },wrong).mode,'full');
});
