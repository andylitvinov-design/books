import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Keep this registry identical to the existing browser commands in the workflow.
// Unknown runtime paths, mixed scopes and unavailable git diffs always run ALL.
export const PUBLIC_BROWSER_CASES = Object.freeze([
  "verify-alchemy-one-screen.mjs",
  "verify-holistic-support-recommendations-mobile.mjs",
  "verify-public-services-production.mjs",
  "verify-service-cart-browser.mjs",
  "verify-holistic-master-browser.mjs",
  "verify-holistic-topics-browser.mjs",
  "verify-direction-focus-mobile.mjs",
  "verify-ideas-mobile-browser.mjs",
  "verify-contact-channel-chooser-browser.mjs",
  "verify-home-consultation-first-screen.mjs",
  "verify-business-quiz-mobile.mjs",
  "verify-reiki-mobile-order-browser.mjs",
  "verify-talisman-google-checkout-browser.mjs",
  "verify-storefront-shop-browser.mjs"
]);
export const PUBLIC_SOURCE_TESTS = Object.freeze([
  "tests/alchemy-panel-overflow-diagnostics.test.mjs",
  "tests/alchemy-soul-mobile-landing.test.mjs",
  "tests/alchemy-soul-spanish-parity.test.mjs",
  "tests/direction-extras.test.mjs",
  "tests/direction-offers.test.mjs",
  "tests/direction-three-sections.test.mjs",
  "tests/goal-support-offers.test.mjs",
  "tests/holistic-compact-search.test.mjs",
  "tests/holistic-inline-talisman-order.test.mjs",
  "tests/holistic-support-first-screen.test.mjs",
  "tests/holistic-support-meditations.test.mjs",
  "tests/holistic-support-mobile-alternative.test.mjs",
  "tests/holistic-support-recommendation-engine.test.mjs",
  "tests/holistic-support-topics.test.mjs",
  "tests/holistic-talisman-mobile-categories.test.mjs",
  "tests/practitioner-homeopathy-canonical-route.test.mjs",
  "tests/practitioner-remote-energy-support.test.mjs",
  "tests/remote-energy-support-booking.test.mjs",
  "tests/remote-energy-support-mobile-compact.test.mjs",
  "tests/service-alchemy-one-screen-story.test.mjs",
  "tests/talisman-google-checkout.test.mjs",
  "tests/temple-insights-compact-cta.test.mjs",
  "tests/temple-support-hub.test.mjs"
]);
const sourceTests = new Set(PUBLIC_SOURCE_TESTS);
const scriptCases = new Map(PUBLIC_BROWSER_CASES.map(name => ['scripts/' + name, name]));
const METRIC_SCRIPT = 'scripts/measure-hh-public-ttfb.mjs';

function full(reason) {
  return { mode: 'full', reason, build: true, browser: true, metrics: true, cases: 'all' };
}

export function planPublicServicesChangedPaths(files) {
  if (!Array.isArray(files) || files.length === 0 ||
      files.some(file => typeof file !== 'string' || !file || file.startsWith('/') ||
        file.includes('..') || file.includes('\0') || file.includes('\n'))) {
    return full('MISSING_OR_INVALID_CHANGE_SET');
  }
  const selected = new Set();
  let performance = false;
  for (const file of files) {
    if (sourceTests.has(file)) continue;
    const browserCase = scriptCases.get(file);
    if (browserCase) {
      selected.add(browserCase);
      continue;
    }
    if (file === METRIC_SCRIPT) {
      performance = true;
      continue;
    }
    return full('RUNTIME_SHARED_PAYMENT_OR_UNKNOWN_PATH');
  }
  // A mixed performance + browser-harness PR is rare: err on full coverage.
  if (performance && selected.size) return full('MIXED_BROWSER_AND_PERFORMANCE');
  if (performance) {
    return { mode: 'metrics', reason: 'PERFORMANCE_HARNESS_ONLY',
      build: true, browser: false, metrics: true, cases: 'none' };
  }
  if (selected.size) {
    return { mode: 'focused', reason: 'BROWSER_HARNESS_ONLY',
      build: true, browser: true, metrics: false,
      cases: PUBLIC_BROWSER_CASES.filter(name => selected.has(name)).join(',') };
  }
  return { mode: 'contracts', reason: 'EXISTING_NODE_SOURCE_TESTS_ONLY',
    build: false, browser: false, metrics: false, cases: 'none' };
}

export function planPublicServicesEvent(env = process.env) {
  if (env.GITHUB_EVENT_NAME !== 'pull_request') return full('MANUAL_OR_NON_PR_EVENT');
  const base = env.HH_PUBLIC_BASE_SHA;
  if (!/^[0-9a-f]{40}$/.test(base || '')) return full('BASE_SHA_UNAVAILABLE');
  try {
    // Merge-ref HEAD contains the PR delta against this exact event base.
    // No shallow history: checkout fetch-depth 0 is required by the workflow.
    const raw = execFileSync('git',
      ['diff', '--no-renames', '--name-only', '-z', base, 'HEAD'],
      { maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    return planPublicServicesChangedPaths(raw.toString('utf8').split('\0').filter(Boolean));
  } catch {
    return full('GIT_DIFF_FAILED_SAFE_FULL_FALLBACK');
  }
}

function main() {
  const plan = planPublicServicesEvent();
  const summary = 'Public Services impact: ' + plan.mode +
    ' (' + plan.reason + '); build=' + plan.build +
    ', browser=' + plan.browser + ', metrics=' + plan.metrics +
    ', cases=' + plan.cases;
  console.log(summary);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT,
      ['mode=' + plan.mode, 'build=' + plan.build,
        'browser=' + plan.browser, 'metrics=' + plan.metrics,
        'cases=' + plan.cases].join('\n') + '\n');
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Public Services exact-PR scope\n' +
      summary + '\n' +
      'Unclassified, payment, middleware, manifest and application changes always run full E2E.\n');
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
