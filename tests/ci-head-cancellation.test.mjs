import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflows = [
  ['hh-assessment-quality.yml', 'hh-assessment-evidence'],
  ['hh-direct-video-notes.yml', 'hh-direct-media'],
  ['hh-gauntlet-loop.yml', 'hh-gauntlet'],
  ['hh-salesbot-remaster-feature.yml', 'hh-salesbot-remaster'],
  ['holistic-house-ocean-audio.yml', 'holistic-house-ocean'],
  ['hh-benchmark-public-browser.yml', 'hh-benchmark-mobile'],
  ['hh-cabinet-journey.yml', 'hh-cabinet-journey'],
  ['hh-messages-wellness-v2.yml', 'hh-messages-wellness'],
  ['reiki-enquiry-capture-ci.yml', 'reiki-enquiry-capture'],
  ['assessment-range-mobile-browser.yml', 'hh-report-mobile'],
  ['ga4-safety-hold.yml', 'ga4-safety-hold'],
  ['hh-reports-development-program.yml', 'hh-development-program'],
  ['hh-static-image-cost-guard.yml', 'hh-static-image'],
  ['admin-seo-dashboard.yml', 'admin-seo'],
  ['release-reaudit.yml', 'release-reaudit'],
  ['dao-iching-library.yml', 'dao-iching-library-verify'],
  ['hh-benchmark-program.yml', 'hh-benchmark-contract'],
  ['hh-course-presets.yml', 'hh-course-presets'],
  ['hh-crm-source-check.yml', 'hh-crm-source'],
  ['hh-energywork-ai.yml', 'hh-energywork'],
  ['hh-event-referral-contract.yml', 'hh-event-referrals'],
  ['hh-free-express-wizard-v2.yml', 'hh-free-express-v2'],
  ['hh-free-review-live-mobile.yml', 'hh-free-review-mobile'],
  ['hh-growth-studio.yml', 'growth-studio'],
  ['hh-ideas-coaching-public.yml', 'hh-ideas-coaching'],
  ['hh-interpretation-database.yml', 'hh-interpretation-database'],
  ['hh-kling-video.yml', 'hh-kling-video'],
  ['hh-live-audio-ci.yml', 'hh-live-audio'],
  ['hh-live-seo-audit.yml', 'hh-live-seo'],
  ['hh-messages-wellness-browser.yml', 'hh-messages-visual'],
  ['hh-messenger-mobile-release.yml', 'hh-messenger-mobile'],
  ['hh-messenger-notification-build.yml', 'hh-messenger-notifications'],
  ['hh-owner-telegram-video.yml', 'hh-owner-telegram-video'],
  ['hh-portrait-mobile-browser.yml', 'hh-portrait-mobile'],
  ['hh-private-audio-e2e.yml', 'hh-private-audio'],
  ['hh-public-journey-wave1.yml', 'hh-public-wave1'],
  ['hh-public-performance-audit.yml', 'hh-public-performance'],
  ['hh-support-mobile-mock-browser.yml', 'hh-support-mobile-mock'],
  ['hh-video-feature-lab.yml', 'hh-video-feature-lab'],
  ['holistic-house-mobile-install.yml', 'hh-mobile-install'],
  ['holistic-house-native.yml', 'hh-native'],
  ['holistic-support-mandala.yml', 'holistic-support-mandala'],
  ['library-public-feed.yml', 'hh-library-feed'],
  ['opora-module-ci.yml', 'opora-modules'],
  ['practice-google-browser.yml', 'hh-practice-google'],
  ['practice-visual-browser.yml', 'hh-practice-visual'],
  ['practice-visual-services.yml', 'practice-visual-services'],
  ['practitioner-presentations.yml', 'hh-practitioner-presentations'],
  ['youtube-phone-uploader.yml', 'hh-youtube-phone'],
  ['hh-personal-coaching-session.yml', 'personal-coaching'],
  ['practice-material-previews.yml', 'practice-material-previews'],
  ['hh-alchemy-mobile-acceptance.yml', 'hh-alchemy-mobile'],
  ['hh-app-browser.yml', 'app-r1-browser'],
  ['hh-app-r1.yml', 'app-r1'],
  ['hh-billing-isolated.yml', 'hh-billing-database'],
  ['hh-growth-journey.yml', 'hh-growth-journeys'],
  ['hh-home-conversation.yml', 'hh-home-conversation'],
  ['hh-my-progress-release.yml', 'hh-my-progress'],
  ['hh-public-services-production.yml', 'public-services-production'],
  ['hh-public-test-collections.yml', 'hh-public-test-collections'],
  ['hh-sitemap-runtime-assets.yml', 'sitemap-runtime-assets'],
  ['ia-v2.yml', 'ia-v2'],
  ['mentor-community-acceptance.yml', 'mentor-community-acceptance'],
  ['pro-reiki-master-paths.yml', 'pro-reiki-master'],
  ['site-video-browser.yml', 'site-video-browser'],
];

test('specialist concurrency isolates manual attempts and cancels only superseded PR HEAD runs', () => {
  const groupCondition = "github.event_name == 'pull_request' && github.run_attempt == 1";
  const cancelCondition = "github.event_name == 'pull_request' && github.run_attempt == 1 && github.event.action == 'synchronize'";
  for (const [file, prefix] of workflows) {
    const source = readFileSync(`.github/workflows/${file}`, 'utf8');
    const groupExpression = `${prefix}-` + '${{ ' + groupCondition + " && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}";
    assert.ok(source.includes('group: ' + groupExpression) || source.includes('group: >-\n    ' + groupExpression), file);
    assert.ok(source.includes('cancel-in-progress: ${{ ' + cancelCondition + ' }}'), file);
    assert.ok(!source.includes('github.event.before != github.event.after'), file+' must not use undefined synchronize fields');
  }
});

test('feature branch regression runs never cancel each other', () => {
  const source = readFileSync('.github/workflows/hh-app-regression.yml', 'utf8');
  assert.ok(source.includes('group: app-r1-full-regression-${{ github.run_id }}'));
  assert.ok(source.includes('cancel-in-progress: false'));
});

// The sole exception is exact-source Profile Axis. Its writer job is guarded
// to another branch, while the mandatory axis-unit-types-build still runs.
// Immutable BASE Specialist cannot approve a concurrency-only migration here.
test('Profile Axis writer-only skip remains BASE-trusted; mandatory Axis still runs', () => {
  const source = readFileSync('.github/workflows/hh-profile-axis-matching.yml', 'utf8');
  assert.ok(source.includes("github.head_ref == 'feat/meditation-writer-device-voice-v1-20261030'"));
  assert.ok(source.includes("  writer-practical-focused:\n    if:"));
  assert.ok(source.includes('  axis-unit-types-build:\n    if:'));
  assert.ok(source.includes('group: profile-axis-'));
  assert.ok(source.includes('github.event.before != github.event.after'));
});
