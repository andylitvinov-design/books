import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parsePrTrigger, matchesTrigger, TARGET } from '../lib/ci/specialist-aggregate.mjs';

// Deliberate one-time migration proof: changing this exact contract file
// dispatches every affected specialist under both old and new BASE/HEAD manifests.
// Later edits to an unrelated optional workflow YAML run Core/actionlint/Guard,
// not that workflow's expensive product browser suite.
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
  "hh-personal-coaching-session.yml",
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
const highRiskSelfChecks = ["opora-module-ci.yml","hh-public-test-collections.yml","hh-kling-video.yml","practitioner-presentations.yml","pro-reiki-master-paths.yml","hh-reports-development-program.yml","hh-support-mobile-mock-browser.yml","hh-public-journey-wave1.yml"];
const contractFile = 'tests/ci-pr-selective-workflows.test.mjs';
const source = name => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');
const trigger = name => parsePrTrigger(source(name), name);

test('optional workflow edits are owned by actionlint; shared contract migration remains independently verified', () => {
  assert.equal(new Set(ownerWorkflows).size, ownerWorkflows.length);
  for (const name of ownerWorkflows) {
    const routes = trigger(name);
    assert.ok(routes?.paths?.includes(contractFile), name + ': shared migration contract absent');
    assert.equal(routes.paths.includes('.github/workflows/' + name), false,
      name + ': self-edit must not launch expensive product checks');
    assert.equal(matchesTrigger(routes, [contractFile], TARGET), true,
      name + ': initial migration must still dispatch genuine exact-HEAD QA');
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
  assert.equal(matchesTrigger(trigger('hh-pr-sweep-guard.yml'), [contractFile], TARGET), true,
    'Guard must execute contract on every scope-policy update');
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
