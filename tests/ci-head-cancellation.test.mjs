import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflows = [
  ['andrey-voice-free-contract.yml', 'hh-andrey-voice-free'],
  ['hh-agent-secrets-ci.yml', 'hh-agent-secrets'],
  ['hh-business-coaching.yml', 'hh-business-coaching'],
  ['hh-practice-telegram-digest.yml', 'hh-practice-telegram'],
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
    const expectedCancel = ['hh-app-r1.yml', 'hh-app-browser.yml'].includes(file)
      ? "github.event_name == 'pull_request' && github.run_attempt == 1 && (github.event.action == 'synchronize' || github.event.action == 'converted_to_draft')" : cancelCondition;
    assert.ok(source.includes('cancel-in-progress: ${{ ' + expectedCancel + ' }}'), file);
    assert.ok(!source.includes('github.event.before != github.event.after'), file+' must not use undefined synchronize fields');
  }
});

test('feature branch regression runs never cancel each other', () => {
  const source = readFileSync('.github/workflows/hh-app-regression.yml', 'utf8');
  assert.ok(source.includes('group: app-r1-full-regression-${{ github.run_id }}'));
  assert.ok(source.includes('cancel-in-progress: false'));
});

// Keep Profile Axis unchanged in this independent concurrency-only rollout.
// Current protected policy requires both real writer and Axis on every Ready PR;
// the retired writer-only branch exception is no longer part of production.
test('Profile Axis retains both genuine Ready checks and its BASE-trusted lease', () => {
  const source = readFileSync('.github/workflows/hh-profile-axis-matching.yml', 'utf8');
  const ready = "    if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
  assert.ok(source.includes('  writer-practical-focused:\n'+ready),
    'independent writer verification must run on Ready PR');
  assert.ok(source.includes('  axis-unit-types-build:\n'+ready),
    'independent Axis verification must run on Ready PR');
  assert.ok(source.includes('group: profile-axis-'));
  assert.ok(source.includes('github.event.before != github.event.after'),
    'do not alter separately protected Profile Axis concurrency in this migration');
});

test('four previously unscoped specialist workflows cancel obsolete PR attempts but retain independent real checks',()=>{
 const names=["andrey-voice-free-contract.yml","hh-agent-secrets-ci.yml","hh-business-coaching.yml","hh-practice-telegram-digest.yml"];
 for(const name of names){
  const source=readFileSync('.github/workflows/'+name,'utf8');
  const required=['pull_request:','jobs:','group:','cancel-in-progress:'];
  for(const needle of required)assert.ok(source.includes(needle),name+' lost '+needle);
  assert.match(source,/github\.run_attempt == 1/);
  assert.match(source,/format\('pr-\{0\}', github\.event\.pull_request\.number\)/);
  assert.match(source,/format\('run-\{0\}', github\.run_id\)/);
  assert.match(source,/github\.event\.action == 'synchronize'/);
  assert.doesNotMatch(source,/cancel-in-progress: true|github\.event\.before != github\.event\.after/,
    'manual, retry and other-PR work must not be cancelled');
 }
 const digest=readFileSync('.github/workflows/hh-practice-telegram-digest.yml','utf8');
 for(const job of ['enquiry-attribution-rls-postgres17','offline-contracts','production-build'])
  assert.ok(digest.includes('  '+job+':'),'real independent Telegram/SQL check lost '+job);
 assert.match(digest,/postgres:17-alpine/);
 assert.match(digest,/tests\/public-enquiry-attribution-rls\.integration\.mjs/);
 const voice=readFileSync('.github/workflows/andrey-voice-free-contract.yml','utf8');
 assert.match(voice,/redis-atomic:/);assert.match(voice,/node --test tests\/local-narration-redis-runtime\.test\.mjs/);
 const agent=readFileSync('.github/workflows/hh-agent-secrets-ci.yml','utf8');
 assert.match(agent,/Test protected secret transport without live credentials/);
 const business=readFileSync('.github/workflows/hh-business-coaching.yml','utf8');
 assert.match(business,/tests\/business-coaching-90-days\.test\.mjs/);
});
