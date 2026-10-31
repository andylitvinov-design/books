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
  ['hh-alchemy-mobile-acceptance.yml', 'hh-alchemy-mobile'],
  ['hh-app-browser.yml', 'app-r1-browser'],
  ['hh-app-r1.yml', 'app-r1'],
  ['hh-billing-isolated.yml', 'hh-billing-database'],
  ['hh-growth-journey.yml', 'hh-growth-journeys'],
  ['hh-home-conversation.yml', 'hh-home-conversation'],
  ['hh-my-progress-release.yml', 'hh-my-progress'],
  ['hh-profile-axis-matching.yml', 'profile-axis'],
  ['hh-public-services-production.yml', 'public-services-production'],
  ['hh-public-test-collections.yml', 'hh-public-test-collections'],
  ['hh-sitemap-runtime-assets.yml', 'sitemap-runtime-assets'],
  ['hh-tantra-photo-levels.yml', 'hh-tantra-photo'],
  ['ia-v2.yml', 'ia-v2'],
  ['mentor-community-acceptance.yml', 'mentor-community-acceptance'],
  ['pro-reiki-master-paths.yml', 'pro-reiki-master'],
  ['site-video-browser.yml', 'site-video-browser'],
];

test('specialist concurrency isolates unrelated events and only cancels an older PR head', () => {
  const condition = "github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after";
  for (const [file, prefix] of workflows) {
    const source = readFileSync(`.github/workflows/${file}`, 'utf8');
    assert.ok(source.includes(`group: ${prefix}-` + '${{ ' + condition + " && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"), file);
    assert.ok(source.includes('cancel-in-progress: ${{ ' + condition + ' }}'), file);
  }
});

test('feature branch regression runs never cancel each other', () => {
  const source = readFileSync('.github/workflows/hh-app-regression.yml', 'utf8');
  assert.ok(source.includes('group: app-r1-full-regression-${{ github.run_id }}'));
  assert.ok(source.includes('cancel-in-progress: false'));
});
