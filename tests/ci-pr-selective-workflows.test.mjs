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
  "dao-iching-library.yml",
  "hh-benchmark-program.yml",
  "hh-benchmark-public-browser.yml",
  "hh-energywork-ai.yml",
  "hh-event-referral-contract.yml",
  "hh-growth-studio.yml",
  "hh-home-conversation.yml",
  "hh-ideas-coaching-public.yml",
  "hh-live-seo-audit.yml",
  "hh-live-audio-ci.yml",
  "hh-public-performance-audit.yml",
  "hh-support-guided-recommendations.yml",
  "holistic-house-native.yml",
  "hh-sitemap-runtime-assets.yml",
  "hh-video-feature-lab.yml",
  "holistic-house-ocean-audio.yml",
  "mentor-community-acceptance.yml",
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
    ['dao-iching-library.yml','components/dao-hexagram-card.tsx'],
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


test('Messages wellness specialists start on Ready after a stacked Draft is retargeted to production', () => {
  for (const name of ['hh-messages-wellness-browser.yml', 'hh-messages-wellness-v2.yml']) {
    const source = readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');
    assert.match(source, /^  pull_request:\n    types: \[opened, reopened, synchronize, ready_for_review\]\n    branches: \[codex\/public-book-library\]/m,
      name + ': Ready must trigger the real independent PR specialist after base retargeting');
    assert.match(source, /^      - 'components\/app\/messages-simple-inbox\.\*'$/m,
      name + ': preserve changed Messages layout admission, not synthetic or bypassed checks');
    assert.doesNotMatch(source, /continue-on-error:\s*true/,
      name + ': Specialist must still fail closed on a true product regression');
  }
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
test('cosmetic Profile CSS does not invoke heavy private IA; real private source remains gated',()=>{
  const ia=trigger('ia-v2.yml');
  const app=trigger('hh-app-r1.yml');
  const cosmetic='components/app/profile-space-dashboard.module.css';
  const homeProfileFiles=[
    cosmetic,
    'components/home-dialogue-entry.module.css',
    'components/sitewide-ihelp.module.css',
    'tests/home-profile-iphone-viewport.test.mjs',
  ];
  assert.equal(matchesTrigger(ia,[cosmetic],TARGET),false,
    'prevent thousand-test encrypted IA/Postgres/Redis pipeline from cosmetic CSS');
  assert.equal(matchesTrigger(ia,homeProfileFiles,TARGET),false,
    'visual-only PR #5000 should not need unrelated encrypted IA');
  assert.equal(matchesTrigger(app,[cosmetic],TARGET),true,
    'profile App R1 must remain the actual regression owner');
  for(const owned of [
    'components/app/profile-space-dashboard.jsx',
    'components/app/profile-space-dashboard.tsx',
    'components/app/account-summary.module.css',
    'app/api/app/client/profile/route.js',
    'lib/app/owner-session.js',
    'supabase/migrations/20261119050000_private_users.sql'
  ]) assert.equal(matchesTrigger(ia,[owned],TARGET),true,
    'real source, private CSS, auth or migration still requires full IA: '+owned);
  assert.equal(matchesTrigger(ia,[cosmetic,'components/app/profile-space-dashboard.jsx'],TARGET),
    true,'a mixed CSS + runtime PR must still execute full IA');
});
