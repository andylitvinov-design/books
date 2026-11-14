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
  "hh-course-presets.yml",
  "hh-energywork-ai.yml",
  "hh-event-referral-contract.yml",
  "hh-growth-journey.yml",
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
  "library-public-feed.yml",
  "mentor-community-acceptance.yml",
  "practice-material-previews.yml",
  "hh-first-video-live-export.yml",
  "hh-direct-video-notes.yml",
  "hh-static-image-cost-guard.yml",
  "hh-salesbot-remaster-feature.yml",
  "practice-visual-browser.yml",
  "practice-google-browser.yml"
];
// The private Coaching Brain workflow must self-trigger on changes to its own
// validation policy; Core, Guard and actionlint still verify that YAML.
// It is a required security/privacy owner, unlike the optional fan-out jobs.
const highRiskSelfChecks = ["hh-personal-coaching-session.yml","opora-module-ci.yml","hh-public-test-collections.yml","hh-kling-video.yml","practitioner-presentations.yml","pro-reiki-master-paths.yml","hh-reports-development-program.yml","hh-support-mobile-mock-browser.yml","hh-public-journey-wave1.yml"];
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
  assert.match(workflow, /^  hh-specialist:\s*$/m);
  assert.match(workflow, /^  hh-merge-check:\s*$/m);
  assert.match(workflow, /needs: \[scope, hh-specialist\]/);
  assert.match(workflow, /\(github\.event\.action == 'synchronize' \|\| github\.event\.action == 'converted_to_draft'\)/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});
