import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parsePrTrigger, matchesTrigger, TARGET } from '../lib/ci/specialist-aggregate.mjs';

// The one-time specialist-route migration (#3509) has completed.
// Neither the retired marker nor this shared test should launch optional owners.
// Owned product, security and dependency changes retain their specialist suites.
// Core, Guard and actionlint still verify CI routing and workflow changes.
const ownerWorkflows = [
  "admin-seo-dashboard.yml",
  "hh-energywork-ai.yml",
  "hh-event-referral-contract.yml",
  "hh-growth-studio.yml",
  "hh-home-conversation.yml",
  "hh-ideas-coaching-public.yml",
  "hh-live-audio-ci.yml",
  "hh-public-performance-audit.yml",
  "hh-support-guided-recommendations.yml",
  "holistic-house-native.yml",
  "practice-material-previews.yml",
  "hh-first-video-live-export.yml",
  "hh-direct-video-notes.yml",
  "hh-static-image-cost-guard.yml",
  "hh-salesbot-remaster-feature.yml",
  "practice-visual-browser.yml",
  "practice-google-browser.yml"
];
// Private Coaching, Course and Growth workflows explicitly self-trigger on
// changes to their own validation policy; all real domain QA remains required.
// #4820 preserved Course billing/private checks and Growth user-consent checks
// on owner-YAML changes while removing only duplicate CI-policy-test fanout.
const highRiskSelfChecks = ["hh-course-presets.yml","hh-growth-journey.yml","hh-personal-coaching-session.yml","opora-module-ci.yml","hh-public-test-collections.yml","hh-kling-video.yml","practitioner-presentations.yml","pro-reiki-master-paths.yml","hh-reports-development-program.yml","hh-support-mobile-mock-browser.yml","hh-public-journey-wave1.yml","library-public-feed.yml"];
const contractFile = 'docs/operations/CI_OWNER_ROUTE_MIGRATION_20261104.md';
const legacyTrigger = 'tests/ci-pr-selective-workflows.test.mjs';
const source = name => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');
const trigger = name => parsePrTrigger(source(name), name);

// Second wave of noncritical QA is explicit opt-in. Real protected Core,
// actionlint, private, billing and CRM checks remain mandatory.
const additionalOnDemandQa = ['hh-indexnow.yml','visual-to-code-skill.yml'];
test('second-wave optional QA never gates ordinary PRs while preserving true executions', () => {
  for (const name of additionalOnDemandQa) {
    const yaml = source(name), route = trigger(name);
    assert.deepEqual(route?.types,['labeled'],name+': source PRs must not auto-dispatch');
    assert.equal(matchesTrigger(route,['scripts/compare-ui-screenshots.mjs','scripts/submit-indexnow.mjs'],TARGET),
      false,name+': optional owner must not join required specialist aggregation');
    assert.match(yaml,/github\.event\.label\.name == 'qa-optional'/,name+': missing explicit opt-in job condition');
    assert.match(yaml,/^  workflow_dispatch:$/m,name+': missing manual workflow');
    assert.doesNotMatch(yaml,/continue-on-error:\s*true/,name+': real QA failures still block');
  }
  const index=source('hh-indexnow.yml');
  assert.match(index,/^  push:$/m,'keep published IndexNow push notification');
  assert.match(index,/node scripts\/submit-indexnow\.mjs --submit/);
  for (const name of ['hh-pr-core-release.yml','hh-actionlint.yml','hh-crm-source-check.yml',
    'hh-app-browser.yml','hh-billing-isolated.yml','hh-public-services-production.yml'])
    assert.ok(trigger(name),name+': lost mandatory security/product PR owner');
});

 
test('shared Site Video player has one canonical owner rather than unrelated Free Review and TTFB gates',()=>{
  const player='components/site-video-player.tsx';
  assert.equal(matchesTrigger(trigger('site-video-browser.yml'),[player],TARGET),true);
  for (const name of ['hh-free-review-live-mobile.yml','hh-public-performance-audit.yml'])
    assert.equal(matchesTrigger(trigger(name),[player],TARGET),false,
      name+': player-only edits must not trigger unrelated expensive acceptance');
  for(const [name,own] of [
    ['hh-free-review-live-mobile.yml','components/consultation-choice-capture.tsx'],
    ['hh-public-performance-audit.yml','components/holistic-house-home.tsx'],
    ['site-video-browser.yml','components/site-video-manager.tsx'],
    ['site-video-browser.yml','app/api/app/site-video/movie/route.js'],
    ['site-video-browser.yml','app/[locale]/about/page.tsx'],
    ['site-video-browser.yml','app/es/about/page.tsx'],
    ['site-video-browser.yml','app/page.tsx'],
  ]) assert.equal(matchesTrigger(trigger(name),[own],TARGET),true,
    name+': actual owner source must still receive full real QA '+own);
});

test('ten unrelated service/reader/API paths never launch redundant Site Video browser',()=>{
  const unrelated=[
    'app/[locale]/services/alchemy-of-soul/page.tsx',
    'app/[locale]/services/business/page.tsx',
    'app/es/services/page.tsx',
    'app/es/services/alchemy-of-soul/page.tsx',
    'app/[locale]/books/page.tsx',
    'app/[locale]/books/maya-tradition/page.tsx',
    'app/es/books/page.tsx',
    'app/es/courses/page.tsx',
    'app/[locale]/homeopathy/page.tsx',
    'app/api/app/unrelated/route.js',
  ];
  assert.equal(unrelated.length,10);
  const site=trigger('site-video-browser.yml');
  for(const path of unrelated)
    assert.equal(matchesTrigger(site,[path],TARGET),false,
      'unrelated change still triggers Site Video: '+path);
  assert.equal(matchesTrigger(trigger('hh-public-services-production.yml'),
    ['app/[locale]/services/alchemy-of-soul/page.tsx'],TARGET),true,
    'actual Public Services consent/order specialist must remain a gate');
  assert.equal(matchesTrigger(trigger('hh-pr-core-release.yml'),unrelated,TARGET),true,
    'required exact HEAD Core must remain active on every functional source PR');
});

test('CI scope noise: unrelated shared files do not launch visual/media/SEO specialists', () => {
  const ignored = [
    ['practice-visual-browser.yml','AGENTS.md'],
    ['practice-visual-browser.yml','app/api/app/unrelated/route.js'],
    ['tantra-testimonials.yml','middleware.ts'],
    ['tantra-testimonials.yml','components/csp-navigation-boundary.tsx'],
    ['tantra-testimonials.yml','lib/csp-prehydration.js'],
    ['maya-reader-bundle.yml','next.config.ts'],
    ['tantra-pdf-source-qa.yml','next.config.ts'],
    ['visual-to-code-skill.yml','AGENTS.md'],
    ['holistic-house-pdf-graphics.yml','package.json'],
    ['hh-profile-axis-matching.yml','app/api/app/practice/editor/route.js']
  ];
  for(const [name,file] of ignored)
    assert.equal(matchesTrigger(trigger(name),[file],TARGET),false,name+': unrelated '+file+' started a domain CI suite');
  const required = [
    ['practice-visual-browser.yml','app/api/app/practice/service/route.js'],
    ['practice-visual-browser.yml','app/api/app/[...path]/route.js'],
    ['tantra-pdf-source-qa.yml','lib/academy/reiki-guide-pdf.js'],
    ['holistic-house-pdf-graphics.yml','lib/prescriptions/pdf.js'],
    ['hh-profile-axis-matching.yml','lib/holistic-support/axis-offer-matcher.mjs'],
    ['hh-profile-axis-matching.yml','app/api/app/[...path]/route.js'],
    ['hh-public-services-production.yml','components/public-consultation-cta.tsx'],
    ['release-reaudit.yml','next.config.ts'],
    ['release-reaudit.yml','middleware.ts'],
    ['hh-public-performance-audit.yml','scripts/measure-hh-public-ttfb.mjs'],
    ['hh-public-services-production.yml','scripts/measure-hh-public-ttfb.mjs'],
    ['hh-pr-core-release.yml','package.json']
  ];
  for(const [name,file] of required)
    assert.equal(matchesTrigger(trigger(name),[file],TARGET),true,name+': lost real domain/security owner for '+file);
  for(const [name,own,unrelated] of [
    ['practice-visual-browser.yml','app/api/app/practice/service/route.js','app/api/app/unrelated/route.js'],
    ['hh-profile-axis-matching.yml','lib/holistic-support/axis-offer-matcher.mjs','app/api/app/practice/editor/route.js']
  ]) assert.equal(matchesTrigger(trigger(name),[unrelated,own],TARGET),true,name+': mixed PR must retain own real QA');
});

// Owner-approved PR budget: retain one low-cost public performance owner,
// defer nine noncritical/duplicative domain matrices to explicit dispatch or
// existing protected production pushes. Core, security, money, CRM and private
// data owners continue to run their real exact-HEAD checks on every matching PR.
const onDemandQa = [
  "dao-iching-library.yml",
  "hh-benchmark-program.yml",
  "hh-benchmark-public-browser.yml",
  "hh-live-seo-audit.yml",
  "hh-video-feature-lab.yml",
  "holistic-house-ocean-audio.yml",
  "hh-sitemap-runtime-assets.yml",
  "hh-visual-service-landings.yml",
  "mentor-community-acceptance.yml"
];
test('ten-to-one noncritical PR budget retains Core and source security', () => {
  assert.equal(onDemandQa.length, 9, 'nine noncritical PR workloads must be deferred');
  for (const name of onDemandQa) {
    const yaml=source(name);
    assert.deepEqual(trigger(name)?.types,['labeled'],name + ': opt-in event route changed');
    assert.equal(matchesTrigger(trigger(name), ['package.json','components/holistic-house-home.tsx'], TARGET), false,
      name + ': optional QA must not block ordinary PRs');
    assert.match(yaml,/github\.event\.label\.name == 'qa-optional'/,name + ': explicit opt-in guard missing');
    assert.match(yaml,/^  workflow_dispatch:\s*$/m,name + ': on-demand QA unavailable');
    assert.doesNotMatch(yaml,/continue-on-error:\s*true/,name + ': genuine failures must remain visible');
  }
  assert.ok(trigger('hh-public-performance-audit.yml')?.paths?.length,
    'one lightweight public-performance PR owner must remain');
  for (const name of [
    'hh-pr-core-release.yml','hh-crm-source-check.yml',
    'hh-billing-isolated.yml','hh-app-r1.yml',
    'hh-public-services-production.yml','hh-actionlint.yml',
  ]) assert.ok(trigger(name),name + ': critical PR owner is missing');
});

test('optional workflow routes exclude retired shared fan-out triggers and retain owned coverage', () => {
  assert.equal(new Set(ownerWorkflows).size, ownerWorkflows.length);
  for (const name of ownerWorkflows) {
    const routes = trigger(name);
    assert.ok(routes?.paths?.length, name + ': owner lost product routing');
    assert.equal(routes.paths.includes(contractFile), false,
      name + ': retired migration marker must not dispatch optional owners');
    assert.equal(routes.paths.includes('.github/workflows/' + name), false,
      name + ': self-edit must not launch expensive product checks');
    assert.equal(matchesTrigger(routes, [contractFile], TARGET), false,
      name + ': retired migration marker must never fan out product QA');
    assert.equal(matchesTrigger(routes, [legacyTrigger], TARGET), false,
      name + ': legacy policy-test edits must not start unrelated product QA');
    assert.equal(matchesTrigger(routes, ['.github/workflows/' + name], TARGET), false,
      name + ': config-only edit must be delegated to actionlint and Guard');
  }
  const actionlint = trigger('hh-actionlint.yml');
  const core = trigger('hh-pr-core-release.yml');
  for (const name of ownerWorkflows) {
    const file = '.github/workflows/' + name;
    assert.equal(matchesTrigger(actionlint, [file], TARGET), true, name + ': actionlint lost coverage');
    assert.equal(matchesTrigger(core, [file], TARGET), true, name + ': Core lost coverage');
  }
  for (const file of [contractFile, legacyTrigger]) {
    assert.equal(matchesTrigger(trigger('hh-pr-sweep-guard.yml'), [file], TARGET), true,
      'Guard must cover shared CI policy: ' + file);
  }
});

test('unrelated library and sitemap edits do not awaken Dao and growth browser owners', () => {
  for (const file of ['components/library-hub.tsx','lib/public-locales.ts']) {
    assert.equal(matchesTrigger(trigger('dao-iching-library.yml'),[file],TARGET),false,file + ': Dao scope too broad');
  }
  assert.equal(matchesTrigger(trigger('hh-growth-journey.yml'),['app/sitemap.ts'],TARGET),false);
  assert.equal(matchesTrigger(trigger('hh-growth-journey.yml'),['components/library-hub.tsx'],TARGET),false);
  assert.equal(matchesTrigger(trigger('hh-ideas-coaching-public.yml'),['lib/public-locales.ts'],TARGET),false);
  assert.equal(matchesTrigger(trigger('visual-to-code-skill.yml'),['app/layout.tsx'],TARGET),false);
  assert.equal(matchesTrigger(trigger('practice-google-browser.yml'),['components/practice-showcase.jsx'],TARGET),false);
  for (const [owner, changed] of [
    ['hh-growth-journey.yml','components/topic-growth-guide.tsx'],
    ['hh-ideas-coaching-public.yml','components/ideas-discovery.tsx'],
    ['hh-kling-video.yml','lib/kling-video.mjs'],
  ]) assert.equal(matchesTrigger(trigger(owner),[changed],TARGET),true,owner + ': lost owned code coverage');
});

test('mandatory security and messaging suites remain routed by actual sensitive source changes', () => {
  const sensitive = 'app/api/app/direct-messages/route.js';
  for (const name of ['hh-app-r1.yml','hh-app-browser.yml','ia-v2.yml','hh-crm-source-check.yml']) {
    assert.equal(matchesTrigger(trigger(name),[sensitive],TARGET),true,name + ': dropped private Messenger gate');
  }
  assert.equal(matchesTrigger(trigger('hh-pr-core-release.yml'),[sensitive],TARGET),true);
});

// Keep independently required domain test execution when an owner YAML changes.
test('high-impact workflows still run their own domain validation on YAML edits', () => {
  for (const name of highRiskSelfChecks) {
    const routes = trigger(name);
    assert.ok(routes?.paths?.includes('.github/workflows/' + name), name + ': required self-check missing');
    assert.equal(routes.paths.includes(contractFile), false, name + ': optional migration marker must not fan out mandatory suites');
    assert.equal(matchesTrigger(routes, ['.github/workflows/' + name], TARGET), true,
      name + ': editing domain policy must trigger its genuine QA');
  }
});


test('mandatory Messages checks start on Ready; source-only visual duplication is on demand', () => {
  for (const name of ['hh-messages-wellness-v2.yml']) {
    const source = readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');
    assert.match(source, /^  pull_request:\n    types: \[opened, reopened, synchronize, ready_for_review\]\n    branches: \[codex\/public-book-library\]/m,
      name + ': Ready must trigger the real independent PR specialist after base retargeting');
    assert.match(source, /^      - 'components\/app\/messages-simple-inbox\.\*'$/m,
      name + ': preserve changed Messages layout admission, not synthetic or bypassed checks');
    assert.doesNotMatch(source, /continue-on-error:\s*true/,
      name + ': Specialist must still fail closed on a true product regression');
  }
  const visual=source('hh-messages-wellness-browser.yml');
  const route=trigger('hh-messages-wellness-browser.yml');
  assert.deepEqual(route.types,['labeled']);
  assert.equal(matchesTrigger(route,['components/app/messages-simple-inbox.jsx'],TARGET),false);
  assert.match(visual,/github.event.label.name == 'qa-optional'/);
  assert.match(visual,/^  workflow_dispatch:/m);
  assert.match(visual,/node scripts\/verify-messages-wellness-browser\.mjs/);
});


test('Core suppresses metadata-only waves but keeps exact-HEAD and signed Ready recovery events', () => {
  const workflow = source('hh-pr-core-release.yml');
  const events = workflow.match(/^  pull_request:\n(?:(?: {4}[^\n]*\n)*)/m)?.[0] ?? '';
  const raw = events.match(/^    types: \[([^\]]+)\]$/m)?.[1];
  assert.ok(raw, 'Core must declare explicit pull_request event types');
  const types = raw.split(',').map(value => value.trim());
  assert.deepEqual(types, [
    'opened', 'synchronize', 'reopened', 'ready_for_review', 'converted_to_draft',
  ]);
  assert.ok(!types.includes('edited'), 'PR body/title edits must not restart Core');
  assert.match(workflow, /HH PR core release gate/);
  assert.doesNotMatch(workflow, /^  hh-specialist:\s*$/m);
  assert.match(workflow, /^  hh-merge-check:\s*$/m);
  assert.match(workflow, /needs: \[scope\]/);
  assert.match(workflow, /Fail closed if mandatory Core failed/);
  assert.match(workflow, /\(github\.event\.action == 'synchronize' \|\| github\.event\.action == 'converted_to_draft'\)/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});

// Release validation belongs to mandatory Core + BASE-trusted Specialist on
// an exact PR HEAD, not to fresh source jobs on each protected merge.
test('source-only postmerge repeats and stale-before-hour LIVE audits stay off', () => {
  for (const name of [
    'hh-owner-telegram-video.yml',
    'hh-public-performance-audit.yml','hh-free-review-live-mobile.yml',
  ]) {
    const yaml=source(name);
    assert.match(yaml,/^  pull_request:/m,name+': real PR validation retained');
    assert.doesNotMatch(yaml,/^  push:/m,name+': redundant merged-source wave forbidden');
  }
  for (const name of ['hh-lighthouse.yml','hh-public-performance-audit.yml','hh-free-review-live-mobile.yml']) {
    const yaml=source(name);
    assert.match(yaml,/^  workflow_dispatch:/m,name+': explicit post-hourly LIVE audit retained');
    assert.doesNotMatch(yaml,/^  push:/m,name+': do not audit old LIVE immediately after merge');
  }
  const migration=source('hh-event-referral-contract.yml');
  assert.match(migration,/^  push:/m,'legacy CRM event-channel migration still requires production push QA');
  for (const critical of ['hh-private-audio-e2e.yml','hh-my-progress-release.yml']) {
    const yaml=source(critical);
    assert.match(yaml,/^  pull_request:/m,critical+': real PR checks must remain');
    assert.match(yaml,/^  push:/m,critical+': postmerge confidential data and progress acceptance retained');
  }
  const cleanup=source('hh-ci-stale-run-prune.yml');
  assert.match(cleanup,/^  push:/m,'safe cleanup fallback kept for default startup failures');
  assert.match(cleanup,/  prune:\n[\s\S]*?    runs-on: ubuntu-slim/,'lightweight janitor');
  assert.match(cleanup,/node --test tests\/ci-prune-stale-runs\.test\.mjs/,'PR policy tests still mandatory');
  assert.match(cleanup,/node --check scripts\/ci-prune-stale-runs\.mjs/,'reviewed script syntax verified');
  assert.match(cleanup,/node scripts\/ci-pr-loss-report\.mjs/,'retain nonblocking P1 PR lifecycle telemetry');
  assert.match(cleanup,/Group unresolved PR merge-conflict candidates/,'retain nonblocking PR conflict diagnostics');
});

test('CRM provider webhook edits do not fan out unrelated Google/Axis/audio PR jobs',()=>{
  const ingress='app/api/app/crm/messenger/webhook/[provider]/route.js';
  // The shared authenticated catch-all and all truly owned paths stay live;
  // only the exact provider ingress subtree is excluded.
  for(const name of ['practice-google-browser.yml','hh-profile-axis-matching.yml','hh-private-audio-e2e.yml']){
    const route=trigger(name);
    assert.equal(matchesTrigger(route,[ingress],TARGET),false,
      name+': CRM-only webhook should not allocate an unrelated browser/media runner');
    assert.ok(route.paths.includes('!app/api/app/crm/messenger/webhook/**'),
      name+': signed CRM ingress exclusion must remain narrow and explicit');
    assert.equal(matchesTrigger(route,['app/api/app/[...path]/route.js'],TARGET),true,
      name+': shared app dispatcher must still receive independent domain QA');
  }
  // The genuine security owner and baseline Core are not advisory or skipped.
  for(const name of ['hh-crm-source-check.yml','hh-app-browser.yml','hh-pr-core-release.yml'])
    assert.equal(matchesTrigger(trigger(name),[ingress],TARGET),true,
      name+': real signed webhook/privacy/security owner must still execute');
  for(const [name,owned] of [
    ['practice-google-browser.yml','components/app/practice-inner-navigation.jsx'],
    ['hh-profile-axis-matching.yml','lib/holistic-support/axis-offer-matcher.mjs'],
    ['hh-private-audio-e2e.yml','lib/app/session.js'],
  ]){
    assert.equal(matchesTrigger(trigger(name),[owned],TARGET),true,
      name+': own feature/auth source still triggers');
    assert.equal(matchesTrigger(trigger(name),[ingress,owned],TARGET),true,
      name+': mixed CRM + own-feature PR must not bypass the specialist');
  }
  const audio=source('hh-private-audio-e2e.yml');
  const push=audio.split(/^  push:/m)[1]?.split(/^concurrency:|^permissions:|^jobs:/m)[0] || '';
  assert.match(push,/app\/api\/app\/\*\*/,'postmerge private media audit must remain broad');
  assert.doesNotMatch(push,/!app\/api\/app\/crm\/messenger\/webhook/);
});

test('shared Telegram provider transport has one canonical suite and independent source owners',()=>{
  const ingress='app/api/app/crm/messenger/webhook/[provider]/route.js';
  const transport='lib/app/client-telegram-transport.js';
  // Private client messages remain gated; only signed CRM ingress and
  // shared Telegram transport stop fan-out to unrelated heavy domains.
  for(const name of ['ia-v2.yml','hh-app-r1.yml','hh-owner-telegram-video.yml']){
    for(const file of [ingress,transport])
      assert.equal(matchesTrigger(trigger(name),[file],TARGET),false,
        name+': shared source must not trigger unrelated full browser/FFmpeg suites');
  }
  for(const name of ['hh-owner-ai-telegram.yml','hh-practice-telegram-digest.yml'])
    assert.equal(matchesTrigger(trigger(name),[transport],TARGET),false,
      name+': shared transport contracts now owned by notification workflow');
  for(const [name,file] of [
    ['hh-crm-source-check.yml',ingress],['hh-app-browser.yml',ingress],
    ['hh-pr-core-release.yml',ingress],['hh-messenger-notification-build.yml',transport],
    ['hh-ideas-coaching-public.yml','components/coaching-intake-form.tsx'],
    ['hh-free-review-live-mobile.yml','components/coaching-intake-form.tsx'],
  ]) assert.equal(matchesTrigger(trigger(name),[file],TARGET),true,
      name+': relevant independent specialist/CORE must stay active');
  const sample=[ingress,transport,'components/coaching-intake-form.tsx'];
  const owners=['ia-v2.yml','hh-app-r1.yml','hh-owner-ai-telegram.yml',
    'hh-owner-telegram-video.yml','hh-practice-telegram-digest.yml',
    'hh-crm-source-check.yml','hh-app-browser.yml',
    'hh-messenger-notification-build.yml','hh-ideas-coaching-public.yml',
    'hh-free-review-live-mobile.yml','hh-pr-core-release.yml'];
  const fired=owners.filter(name=>matchesTrigger(trigger(name),sample,TARGET));
  assert.deepEqual(fired.sort(),[
    'hh-crm-source-check.yml','hh-app-browser.yml','hh-messenger-notification-build.yml',
    'hh-ideas-coaching-public.yml','hh-free-review-live-mobile.yml',
    'hh-pr-core-release.yml',
  ].sort(),'11 separate checks on a shared Ali/Telegram PR must become six real owner checks');
  for(const [name,owned] of [
    ['ia-v2.yml','app/api/app/direct-messages/route.js'],
    ['hh-app-r1.yml','app/api/app/direct-messages/route.js'],
    ['hh-owner-telegram-video.yml','lib/practitioners/owner-telegram-video-crm-fallback.mjs'],
    ['hh-owner-ai-telegram.yml','lib/practitioners/owner-ai-telegram.mjs'],
    ['hh-practice-telegram-digest.yml','lib/practitioners/daily-telegram-transport.mjs'],
  ]){
    assert.equal(matchesTrigger(trigger(name),[owned],TARGET),true,
      name+': own protected source still triggers independent specialist');
    assert.equal(matchesTrigger(trigger(name),[ingress,transport,owned],TARGET),true,
      name+': mixed real changes cannot bypass required feature checks');
  }
  assert.match(source('hh-crm-source-check.yml'),
    /node --test tests\/owner-telegram-crm-ffmpeg-trace\.test\.mjs/,
    'CRM verifies the signed Dot video/FFmpeg isolation contract');
  const notification=source('hh-messenger-notification-build.yml');
  for(const test of ['practitioner-owner-ai-telegram','practitioner-daily-telegram',
    'owner-telegram-enquiry-pilot'])
    assert.ok(notification.includes('tests/'+test+'.test.mjs'),
      'shared canonical notification owner must preserve '+test);
  assert.match(source('hh-owner-telegram-video.yml'),/^  workflow_dispatch:/m,
    'the full media acceptance remains manually callable');
});

test('Commander signed PR completion avoids unrelated old heavy checks but retains exact owner and mixed-change coverage',()=>{
  const route='app/api/app/commander/pr-completion/route.js';
  const owned=[
    ['hh-app-r1.yml','app/api/app/direct-messages/route.js'],
    ['hh-app-browser.yml','app/api/app/direct-messages/route.js'],
    ['ia-v2.yml','app/api/app/direct-messages/route.js'],
    ['hh-profile-axis-matching.yml','lib/holistic-support/axis-offer-matcher.mjs'],
    ['hh-private-audio-e2e.yml','lib/app/session.js'],
    ['practice-google-browser.yml','components/app/practice-inner-navigation.jsx'],
  ];
  for(const [name,realSource] of owned){
    const entry=trigger(name);
    assert.ok(entry.paths.includes('!app/api/app/commander/**'),name+': missing scoped Commander exception');
    assert.equal(matchesTrigger(entry,[route],TARGET),false,name+': unrelated heavy domain started on Commander');
    assert.equal(matchesTrigger(entry,[realSource],TARGET),true,name+': owner source lost protection');
    assert.equal(matchesTrigger(entry,[route,realSource],TARGET),true,name+': mixed PR must still run owner');
  }
  for(const name of ['hh-pr-core-release.yml','hh-pr-sweep-guard.yml'])
    assert.equal(matchesTrigger(trigger(name),[route],TARGET),true,name+': Commander has no real gate');
  const guard=source('hh-pr-sweep-guard.yml');
  assert.ok(guard.includes('node --test tests/commander-pr-*.test.mjs'),
    'Commander signed source, exact HEAD, worker receipt and LIVE contract tests stay executable');
  for(const path of ['lib/agent-director/pr-head-history.mjs','tests/commander-pr-journey.test.mjs'])
    assert.equal(matchesTrigger(trigger('hh-pr-sweep-guard.yml'),[path],TARGET),true,
      path+': focused source changes must trigger independent guard');
});


test('Commander-only source changes do not trigger the unrelated postmerge Reports suite',()=>{
  const sourceText=source('hh-reports-development-program.yml');
  const push=sourceText.split(/^  pull_request:/m)[0];
  const owner=sourceText.split(/^  pull_request:/m)[1]||'';
  assert.match(push,/^      - 'app\/api\/app\/\*\*'$/m);
  assert.match(push,/^      - '!app\/api\/app\/commander\/\*\*'$/m);
  assert.ok(!owner.includes("'!app/api/app/commander/**'"),
    'only unrelated postmerge Reports fanout is retired, not the owned PR validation');
  assert.match(owner,/^      - 'lib\/profile\/development-program\.js'$/m);
});

test('public Ali support screens run one focused conversation owner, not three unrelated private App/IA suites',()=>{
  const ui=['components/app/messenger-ai-landing.tsx',
    'components/app/messenger-ai-landing.module.css',
    'components/app/messenger-support-quiz.tsx',
    'components/app/messenger-support-quiz.module.css'];
  const privateOwners=['hh-app-r1.yml','hh-app-browser.yml','ia-v2.yml'];
  for(const file of ui){
    for(const name of privateOwners){
      const t=trigger(name);
      assert.equal(matchesTrigger(t,[file],TARGET),false,name+': public-only Ali UI allocated private CI');
      assert.equal(matchesTrigger(t,[file,'app/api/app/direct-messages/route.js'],TARGET),true,
        name+': private Messenger route must always trigger owner on mixed PR');
    }
    assert.equal(matchesTrigger(trigger('hh-home-conversation.yml'),[file],TARGET),true,
      file+': focused public dialogue owner missing');
    assert.equal(matchesTrigger(trigger('hh-pr-core-release.yml'),[file],TARGET),true,
      file+': production Core lost coverage');
  }
  const owned=source('hh-home-conversation.yml');
  assert.ok(owned.includes('node --test')&&owned.includes('tests/messenger-support-quiz.test.mjs'),
    'public Ali consent/need selection unit test must run, not just trigger');
  assert.ok(owned.includes('npx eslint')&&owned.includes('components/app/messenger-support-quiz.tsx'),
    'public Ali component JSX must be linted by focused owner');
  const quiz='tests/messenger-support-quiz.test.mjs';
  assert.equal(matchesTrigger(trigger('hh-home-conversation.yml'),[quiz],TARGET),true);
  assert.equal(matchesTrigger(trigger('hh-pr-core-release.yml'),[quiz],TARGET),true);
});

test('signed CRM and Commander isolated postmerge changes cannot restart whole report suite',()=>{
  const workflow=source('hh-reports-development-program.yml');
  const push=workflow.match(/^  push:\n[\s\S]*?(?=^  pull_request:)/m)?.[0]||'';
  assert.ok(push.includes("'app/api/app/**'"),'real report APIs keep push acceptance');
  for(const excluded of ['!app/api/app/commander/**','!app/api/app/crm/messenger/webhook/**'])
    assert.ok(push.includes("'"+excluded+"'"),'postmerge report exclusion missing: '+excluded);
  assert.match(push,/'lib\/clients\/session-delivery-service\.js'/);
  assert.match(push,/'lib\/documents\/report-progress\.js'/);
  assert.match(workflow,/^  pull_request:/m,'real PR report validation retained');
});

test('cosmetic Profile-only CSS skips heavy private IA but preserves real Core/App R1 and private-code coverage',()=>{
 const ia=readFileSync(new URL('../.github/workflows/ia-v2.yml',import.meta.url),'utf8');
 const app=readFileSync(new URL('../.github/workflows/hh-app-r1.yml',import.meta.url),'utf8');
 const core=readFileSync(new URL('../.github/workflows/hh-pr-core-release.yml',import.meta.url),'utf8');
 const iaTrigger=parsePrTrigger(ia,'.github/workflows/ia-v2.yml');
 const appTrigger=parsePrTrigger(app,'.github/workflows/hh-app-r1.yml');
 const css='components/app/profile-space-dashboard.module.css';
 const cosmetic=[css,'components/home-dialogue-entry.module.css',
  'components/sitewide-ihelp.module.css','tests/home-profile-iphone-viewport.test.mjs'];
 assert.equal(matchesTrigger(iaTrigger,[css],TARGET),false,
  'pure visual Profile CSS must not launch private IA/Redis/Postgres/1000+ tests');
 assert.equal(matchesTrigger(iaTrigger,cosmetic,TARGET),false,
  'original #5000 Home/Profile-only visual scope remains under Core + App R1');
 assert.equal(matchesTrigger(appTrigger,[css],TARGET),true,
  'App R1 retains the actual profile source/visual regression gate');
 assert.match(core,/^  pull_request:\s*$/m);
 assert.match(core,/^    branches: \['codex\/public-book-library'\]$/m);
 for(const protectedPath of [
   'components/app/profile-space-dashboard.jsx',
   'components/app/profile-space-dashboard.tsx',
   'components/app/crm-manager.jsx',
   'app/api/app/client/report/route.js',
   'app/api/auth/callback/route.js',
   'lib/security/private-session.mjs',
   'supabase/migrations/20261119_policy.sql',
 ]) assert.equal(matchesTrigger(iaTrigger,[protectedPath],TARGET),true,
   'private code must still trigger IA: '+protectedPath);
 assert.equal(matchesTrigger(iaTrigger,[css,'components/app/crm-manager.jsx'],TARGET),true,
  'mixed styling and private code must not bypass IA');
 assert.equal(matchesTrigger(iaTrigger,['.github/workflows/ia-v2.yml'],TARGET),true,
  'changes to the IA workflow itself must still execute its real tests');
});

test('First Video automatic PR duplication is retired after mandatory Mandala ownership',()=>{
  const redundant=trigger('hh-first-video-live-export.yml'),video=source('hh-first-video-live-export.yml');
  assert.deepEqual(redundant.types,['labeled']);
  assert.match(video,/github\.event\.label\.name == 'qa-optional'/);
  assert.match(video,/node --test tests\/video-director-chat-live-acceptance\.test\.mjs/);
  assert.match(video,/github\.event_name == 'workflow_dispatch' && inputs\.probe_free_ai/);
  assert.match(video,/^  workflow_dispatch:/m);
  assert.equal(matchesTrigger(redundant,['scripts/benchmarking/first-video-live-export.mjs'],TARGET),false);
  assert.equal(matchesTrigger(redundant,['components/mandala-free-video-studio.tsx'],TARGET),false);
  assert.equal(matchesTrigger(redundant,['tests/video-director-chat-live-acceptance.test.mjs'],TARGET),false);
  const mandala=trigger('holistic-support-mandala.yml');
  for(const path of ['scripts/benchmarking/first-video-live-export.mjs','scripts/benchmarking/video-director-chat-live-acceptance.mjs','tests/video-director-chat-live-acceptance.test.mjs'])
    assert.equal(matchesTrigger(mandala,[path],TARGET),true,path+': no required Mandala source owner');
  const library=trigger('library-public-feed.yml');
  for(const path of ['components/app/messages-orders-clients.jsx','components/mandala-video-director-chat.tsx'])
    assert.equal(matchesTrigger(library,[path],TARGET),false,path+': unrelated library browser');
  assert.equal(matchesTrigger(library,['components/library-feed.tsx'],TARGET),true);
});


test('second-wave visual QA is opt-in or mock-harness-only while protected owners still run',()=>{
  const visual = [
    ['tantra-testimonials.yml','components/tantra-video-testimonials.tsx'],
    ['maya-reader-bundle.yml','app/books/maya-tradition/page.tsx'],
  ];
  for(const [name,owned] of visual){
    const yaml=source(name),policy=trigger(name);
    assert.deepEqual(policy.types,['labeled'],name+': optional QA must not auto-launch on ordinary PR source');
    assert.equal(matchesTrigger(policy,[owned],TARGET),false,name+': must not block every public content PR');
    assert.ok(policy.paths.includes(owned),name+': retain the opt-in source path');
    assert.match(yaml,/github\.event\.label\.name == 'qa-optional'/,name+': require explicit opt-in label');
    assert.match(yaml,/^  workflow_dispatch:/m,name+': retain manually requested QA');
    assert.match(yaml,/^  push:/m,name+': retain real post-merge production checks');
  }
  const mock=trigger('hh-support-mobile-mock-browser.yml');
  assert.equal(matchesTrigger(mock,['components/holistic-support-mobile.tsx'],TARGET),false,
    'public support source changes run protected Core and public-services QA, not redundant mock screenshot suite');
  for(const path of ['scripts/verify-holistic-support-mock-fidelity.mjs',
    'tests/holistic-support-mobile-mock-parity.test.mjs',
    '.github/workflows/hh-support-mobile-mock-browser.yml']){
    assert.equal(matchesTrigger(mock,[path],TARGET),true,'mock QA must remain mandatory when its own contract changes');
  }
  assert.equal(matchesTrigger(trigger('hh-public-services-production.yml'),
    ['components/holistic-support-mobile.tsx'],TARGET),true,
    'live public Support user journey must retain its real independent owner');
  assert.match(source('hh-support-mobile-mock-browser.yml'),/^  workflow_dispatch:/m,
    'manual screenshot QA remains available');
  assert.match(source('hh-support-mobile-mock-browser.yml'),/^  push:/m,
    'production-push original screenshot coverage remains unchanged');
  for(const name of ['hh-pr-core-release.yml','hh-crm-source-check.yml','hh-billing-isolated.yml',
    'hh-app-browser.yml','hh-public-services-production.yml']){
    assert.ok(trigger(name),name+': mandatory security, private, payment or Core gate missing');
  }
});
