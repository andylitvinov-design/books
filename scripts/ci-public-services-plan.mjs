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
// CI-only source policies are verified by actionlint, Core and these exact
// contract tests. They must not cause thirteen unrelated browser journeys.
// Runtime, privacy, auth, checkout and unknown files still fail closed.
const TRUSTED_CI_CONTRACT_FILES = new Set([
  '.github/workflows/hh-public-services-production.yml',
  'scripts/ci-public-services-plan.mjs',
  'tests/ci-public-services-plan.test.mjs',
  'tests/ci-workflow-globs.test.mjs',
  // Independent Site Video CI policy and source-only E2E contracts cannot
  // change public services runtime, consent or payment. Protected Core/actionlint
  // and its exact-head Site Video job still validate these files.
  '.github/workflows/site-video-browser.yml',
  'scripts/ci-site-video-scope.mjs',
  'tests/ci-site-video-scope.test.mjs',
  'tests/site-video-admin-e2e-gate.test.mjs',
  'tests/ci-heavy-draft-policy.test.mjs',
  // Other independent CI harnesses, with no application runtime dependency.
  '.github/workflows/admin-seo-dashboard.yml',
  '.github/workflows/release-reaudit.yml',
  'scripts/public-poster-readiness.mjs',
  'scripts/csp-navigation-diagnostics.mjs',
  'scripts/verify-release-reaudit.mjs',
  'tests/ci-head-cancellation.test.mjs',
  'tests/ci-stale-run-deduplication.test.mjs',
  'tests/csp-public-discovery-verifier.test.mjs',
  'tests/csp-navigation-diagnostics.test.mjs',
  'tests/public-audit-readiness.test.mjs',
  'tests/release-reaudit.test.mjs',
  // Another mandatory exact-HEAD specialist owns the Ideas/Coaching workflow.
  '.github/workflows/hh-ideas-coaching-public.yml',
]);
const sourceTests = new Set(PUBLIC_SOURCE_TESTS);
// Scoped PR #2702: these EXACT files are owned by the independent Mandala
// workflow (source, Node/TS, same-origin/consent tests and true encoded-media
// acceptance on manual release). No checkout, booking, public-service route,
// middleware or payment code is touched. New/unknown filenames remain FULL.
const MANDALA_OWNED_HYPNO_FILES = new Set([
  '.github/workflows/holistic-support-mandala.yml',
  'app/api/holistic-support/hypno-strategy/route.js',
  'components/mandala-free-video-studio.tsx',
  'components/mandala-hypno-compact.module.css',
  'components/mandala-hypno-compact.tsx',
  'components/mandala-hypnocorrection-mobile.module.css',
  'components/mandala-hypnocorrection-mobile.tsx',
  'components/mandala-personal-meditation.module.css',
  'components/mandala-personal-meditation.tsx',
  'docs/design/HYPNOCORRECTION_MOBILE_V1_20261030.md',
  'lib/mandala/adaptive-meditation-course.mjs',
  'lib/mandala/hypno-psych-strategy.ts',
  'lib/mandala/hypno-visual-overlay.mjs',
  'lib/mandala/personal-meditation-script.mjs',
  'lib/mandala/video-affirmations.ts',
  'tests/adaptive-meditation-course.test.mjs',
  'tests/mandala-hypnocorrection-mobile.test.mjs',
  'tests/mandala-meditation-courses.test.mjs',
  'tests/mandala-workspace-tabs.test.mjs',
  'tests/meditation-regeneration.test.mjs',
  'tests/personal-meditation-script.test.mjs',
  'tests/video-affirmations.test.mjs',
]);
// Unlike editor-only changes, the new course contact UI calls the EXISTING
// /api/service-enquiries endpoint. Keep its genuine Public Services enquiry
// browser owner, but do not run 12 unrelated Reiki, Storefront or Alchemy E2Es.
// These EXISTING, isolated files are directly owned by Holistic Support
// Mandala's source, consent, audio/video and Playwright tests. They contain no
// checkout, booking, client-account, payment, app-wide routing or auth code.
// Restrict this to explicitly reviewed files: all unknown/new paths remain FULL.
const MANDALA_OWNED_VIDEO_WORKSPACE_FILES = new Set([
  // Exactly reviewed, consent- and license-gated Director Chat + executable cut.
  // Dedicated Mandala CI owns source, schema, media provenance and real render.
  'app/api/holistic-support/video-director-chat/route.js',
  'app/api/holistic-support/video-director-plan/route.js',
  'components/mandala-video-director-chat.module.css',
  'components/mandala-video-director-chat.tsx',
  'docs/videos/EXECUTABLE_DIRECTOR_SCENARIO_V1_20261101.md',
  'lib/mandala/auto-video-director.mjs',
  'lib/mandala/video-chat-ai.mjs',
  'lib/mandala/video-chat-executable-ai.mjs',
  'lib/mandala/video-chat-intent.mjs',
  'lib/mandala/video-executable-director.mjs',
  'tests/video-chat-ai.test.mjs',
  'tests/video-chat-intent.test.mjs',
  'tests/video-executable-director.test.mjs',
  'app/[locale]/holistic-support/mandala/page.tsx',
  'components/mandala-cinematic-director.tsx',
  // The approved 4-goal / 6-topic Video Studio director and its page theme
  // belong to the *same* existing Mandala Node/TS/real-media browser owner.
  // This exact-list extension does not exclude any Services/checkout code.
  'components/mandala-auto-video-director.tsx',
  'components/mandala-auto-video-director.module.css',
  'components/mandala-meditation.module.css',
  'components/mandala-video-mobile.module.css',
  'scripts/verify-holistic-mandala-browser.mjs',
  'tests/cinematic-studio.test.mjs',
  'tests/mandala-approved-mobile-studio.test.mjs',
  'tests/mandala-audio-attach.test.mjs',
  'tests/mandala-auto-video-director-ui.test.mjs',
  'tests/mandala-mobile-video-design.test.mjs',
  'tests/mandala-stories-characters.test.mjs',
  'tests/mandala-therapy-video-intro.test.mjs',
]);
const MANDALA_COURSE_ENQUIRY_FILES = new Set([
  'components/meditation-course-enquiry.module.css',
  'components/meditation-course-enquiry.tsx',
  'tests/meditation-course-enquiry.test.mjs',
]);
// Only reviewed new files may enter the focused route as A. Everything else
// (including new routes and unreviewed tests) fails closed to all browsers.
const MANDALA_REVIEWED_ADDITIONS = new Set([
  // Exact additions from audited Video Director Chat. Unknown API/checkout
  // additions remain FULL; no broad route or lib/mandala wildcard here.
  'app/api/holistic-support/video-director-chat/route.js',
  'app/api/holistic-support/video-director-plan/route.js',
  'components/mandala-video-director-chat.module.css',
  'components/mandala-video-director-chat.tsx',
  'docs/videos/EXECUTABLE_DIRECTOR_SCENARIO_V1_20261101.md',
  'lib/mandala/video-chat-ai.mjs',
  'lib/mandala/video-chat-executable-ai.mjs',
  'lib/mandala/video-chat-intent.mjs',
  'lib/mandala/video-executable-director.mjs',
  'tests/video-chat-ai.test.mjs',
  'tests/video-chat-intent.test.mjs',
  'tests/video-executable-director.test.mjs',
  'app/api/holistic-support/hypno-strategy/route.js',
  'components/mandala-hypnocorrection-mobile.module.css',
  'components/mandala-hypnocorrection-mobile.tsx',
  'components/meditation-course-enquiry.module.css',
  'components/meditation-course-enquiry.tsx',
  'docs/design/HYPNOCORRECTION_MOBILE_V1_20261030.md',
  'lib/mandala/adaptive-meditation-course.mjs',
  'lib/mandala/hypno-psych-strategy.ts',
  'lib/mandala/hypno-visual-overlay.mjs',
  'tests/adaptive-meditation-course.test.mjs',
  'tests/mandala-hypnocorrection-mobile.test.mjs',
  'tests/mandala-meditation-courses.test.mjs',
  'tests/meditation-course-enquiry.test.mjs',
  'tests/meditation-regeneration.test.mjs',
]);
const scriptCases = new Map(PUBLIC_BROWSER_CASES.map(name => ['scripts/' + name, name]));
// The Ideas/Coaching source owner checks these exact files. Public Services
// must still run its real Ideas browser when the shared mobile QA harness
// changes, but must not launch unrelated payment, Reiki or Alchemy journeys.
const IDEAS_SCOPED_BROWSER_HARNESS = new Set([
  'scripts/ci-mobile-browser-batch.mjs',
  'scripts/verify-coaching-lounge-mobile.mjs',
  'scripts/verify-holistic-support-browser.mjs',
  'tests/ci-ideas-coaching-optimization.test.mjs',
]);
// These are the only pre-reviewed NEW helper/test filenames allowed to use the
// real Ideas focused browser gate; unknown additions still run all 13.
const IDEAS_SCOPED_ADDITIONS = new Set([
  'scripts/ci-mobile-browser-batch.mjs',
  'tests/ci-ideas-coaching-optimization.test.mjs',
]);
const METRIC_SCRIPT = 'scripts/measure-hh-public-ttfb.mjs';
// Narrow, source-test-covered styling files avoid a second Next build and
// browser install in Public Services. Core owns the same production candidate
// build; real browser journeys remain available by manual workflow_dispatch.
// Forms, consent, auth, payment, HTML/JSX and unknown CSS are never exempt.
const SOURCE_COVERED_VISUAL_ONLY = new Set([
  'components/alchemy-soul-landing.module.css',
]);
const PRESENTATION_CASES = new Map([
  // Actual public UX still gets the related real Chromium browser journeys,
  // not the unrelated 13-case checkout/Reiki/Alchemy matrix.
  ['components/direction-offers.tsx',
    ['verify-direction-focus-mobile.mjs', 'verify-public-services-production.mjs']],
  ['components/academy-course-video-playlist.tsx',
    ['verify-public-services-production.mjs']],
]);
// This is a test helper, not a contact implementation. Public Services has
// one importer; App R1 and release re-audit run in their own workflows.
const HARNESS_CASES = new Map([
  ['scripts/helpers/contact-channel-verifier.mjs', ['verify-public-services-production.mjs']],
]);

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
    if (TRUSTED_CI_CONTRACT_FILES.has(file)) continue;
    if (MANDALA_OWNED_HYPNO_FILES.has(file) || MANDALA_OWNED_VIDEO_WORKSPACE_FILES.has(file)) continue;
    if (MANDALA_COURSE_ENQUIRY_FILES.has(file)) {
      selected.add('verify-public-services-production.mjs');
      continue;
    }
    if (sourceTests.has(file)) continue;
    if (SOURCE_COVERED_VISUAL_ONLY.has(file)) continue;
    if (IDEAS_SCOPED_BROWSER_HARNESS.has(file)) {
      selected.add('verify-ideas-mobile-browser.mjs');
      continue;
    }
    const browserCase = scriptCases.get(file);
    if (browserCase) {
      selected.add(browserCase);
      continue;
    }
    if (PRESENTATION_CASES.has(file)) {
      for (const name of PRESENTATION_CASES.get(file)) selected.add(name);
      continue;
    }
    if (HARNESS_CASES.has(file)) {
      for (const name of HARNESS_CASES.get(file)) selected.add(name);
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
    return { mode: 'focused', reason: 'PROVEN_BROWSER_HARNESS_OR_PRESENTATION',
      build: true, browser: true, metrics: false,
      cases: PUBLIC_BROWSER_CASES.filter(name => selected.has(name)).join(',') };
  }
  return { mode: 'contracts', reason: 'EXISTING_NODE_SOURCE_TESTS_ONLY',
    build: false, browser: false, metrics: false, cases: 'none' };
}

// One-off, exact-delta specialist handoff for same-repo PR #2308 only.
// Six new public READ-ONLY meditation files and three existing gallery/catalog
// paths are covered by a real Chromium+WebKit candidate browser job in the
// Meditation catalogue specialist, plus Core build/typing and actionlint.
// Do NOT generalize this exemption to future PRs: checkout, accounts, consent,
// payment, deletion, rename, unknown additions and any changed path fail FULL.
const REVIEWED_MEDITATION_2308_DELTA = new Map([
  [
    "M",
    ".github/workflows/meditation-catalog-checks.yml"
  ],
  [
    "A",
    "app/[locale]/meditations/page.tsx"
  ],
  [
    "M",
    "components/holistic-meditation-gallery.module.css"
  ],
  [
    "M",
    "components/holistic-meditation-gallery.tsx"
  ],
  [
    "A",
    "components/meditation-practice-app.module.css"
  ],
  [
    "A",
    "components/meditation-practice-app.tsx"
  ],
  [
    "A",
    "docs/holistic-meditation-app-20261027.md"
  ],
  [
    "A",
    "scripts/verify-meditation-immersive-browser.mjs"
  ],
  [
    "A",
    "tests/meditation-immersive-app.test.mjs"
  ],
  [
    "M",
    "scripts/ci-public-services-plan.mjs"
  ],
  [
    "M",
    "tests/ci-public-services-plan.test.mjs"
  ]
] .map(([status,path])=>[path,status]));

// Narrow one-off routing for owner-approved, source-reviewed Home presentation
// PR #2758. The same exact 14-file delta is verified by Home first-click,
// Website video browser, protected Core, and EN/RU Home release contracts.
// Any unexpected file, status, duplicate path, ref or branch => FULL E2E.
const REVIEWED_HOME_PRESENTATION_2758 = new Map([
  ["app/holistic-house-home.css","M"],
  ["components/holistic-house-home.tsx","M"],
  ["components/home-presentation-video-section.tsx","A"],
  ["scripts/verify-home-locale-switch.mjs","M"],
  ["scripts/verify-page-video-release.mjs","M"],
  ["scripts/verify-site-video-browser.mjs","M"],
  ["tests/holistic-house-home-streaming.test.mjs","M"],
  ["tests/home-conversation-browser.mjs","M"],
  ["tests/home-conversation-guide.test.mjs","M"],
  ["tests/home-featured-workspace.test.mjs","M"],
  ["tests/page-video-release.test.mjs","M"],
  ["tests/public-tantra-entry-links.test.mjs","M"],
  ["scripts/ci-public-services-plan.mjs","M"],
  ["tests/ci-public-services-plan.test.mjs","M"]
]);
function reviewedHomePresentation2758(env,rows) {
  if (env.GITHUB_HEAD_REF !== 'feat/home-presentation-20261031-ru-en-slot' ||
      rows.length !== REVIEWED_HOME_PRESENTATION_2758.size*2) return false;
  const seen=new Set();
  for(let i=0;i<rows.length;i+=2){
    const status=rows[i],path=rows[i+1];
    if(seen.has(path)||REVIEWED_HOME_PRESENTATION_2758.get(path)!==status) return false;
    seen.add(path);
  }
  return seen.size===REVIEWED_HOME_PRESENTATION_2758.size;
}


// Exact PR #2483 ONLY: public source-backed meditation discovery UI.
// Real Chromium/WebKit on its owning Support Mobile PR specialist remains
// mandatory before release; unrelated payment/consent/browser routes are not
// re-run here. Any missing, extra, renamed or non-matching file/status is FULL.
const REVIEWED_MEDITATION_RAIL_2483 = new Map([["M",".github/workflows/hh-support-mobile-mock-browser.yml"],["M","app/[locale]/holistic-support/mobile/page.tsx"],["M","components/holistic-support-mobile.module.css"],["M","components/holistic-support-mobile.tsx"],["M","components/holistic-support-goal-filter.tsx"],["M","data/academy/holistic-support-meditations.ts"],["M","tests/greek-video-series.test.mjs"],["A","tests/holistic-meditation-mobile-categories.test.mjs"],["M","tests/holistic-support-goal-filter.test.mjs"],["M","tests/holistic-support-mobile-alternative.test.mjs"],["M","scripts/ci-public-services-plan.mjs"],["M","tests/ci-public-services-plan.test.mjs"],["M","scripts/verify-holistic-support-mock-fidelity.mjs"]].map(([status,path])=>[path,status]));
function reviewedMeditationRail2483(env,rows) {
  if (env.GITHUB_HEAD_REF !== 'codex/meditation-category-rail-20261028' ||
      rows.length !== REVIEWED_MEDITATION_RAIL_2483.size*2) return false;
  const seen=new Set();
  for(let i=0;i<rows.length;i+=2) {
    const status=rows[i],path=rows[i+1];
    if(seen.has(path)||REVIEWED_MEDITATION_RAIL_2483.get(path)!==status) return false;
    seen.add(path);
  }
  return seen.size===REVIEWED_MEDITATION_RAIL_2483.size;
}

export function planPublicServicesEvent(env = process.env, git = execFileSync) {
  if (env.GITHUB_EVENT_NAME !== 'pull_request') return full('MANUAL_OR_NON_PR_EVENT');
  const base = env.HH_PUBLIC_BASE_SHA;
  const head = env.HH_PUBLIC_HEAD_SHA;
  if (!/^[0-9a-f]{40}$/.test(base || '') || !/^[0-9a-f]{40}$/.test(head || ''))
    return full('BASE_OR_PR_HEAD_SHA_UNAVAILABLE');
  const options = { maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] };
  try {
    const read = args => String(git('git', args, options)).trim();
    const checkout = read(['rev-parse', 'HEAD']);
    let diffBase = base;
    if (checkout !== head) {
      // In pull_request CI, checkout is the synthetic target+PR merge.
      // Its first parent is the actual tested target; its second must be
      // EXACTLY the event PR head, otherwise no source-only fast lane.
      const first = read(['rev-parse', 'HEAD^1']);
      const second = read(['rev-parse', 'HEAD^2']);
      if (second !== head || !/^[0-9a-f]{40}$/.test(first))
        return full('UNVERIFIED_SYNTHETIC_MERGE');
      git('git', ['merge-base', '--is-ancestor', base, first], options);
      diffBase = first;
    } else {
      // A direct HEAD checkout still must contain the recorded event base.
      git('git', ['merge-base', '--is-ancestor', base, head], options);
    }
    // -z name-status makes additions/deletions/type changes explicit. The fast
    // lanes are approved ONLY for modifications of already-present sources.
    // An added/deleted test or script must never masquerade as a safe edit.
    const raw = git('git',
      ['diff', '--no-renames', '--name-status', '-z', diffBase, 'HEAD'], options);
    const rows = raw.toString('utf8').split('\0');
    if (rows.pop() !== '' || !rows.length || rows.length % 2 !== 0)
      return full('MALFORMED_GIT_NAME_STATUS');
    if (env.GITHUB_REF === 'refs/pull/2483/merge') {
      if (reviewedMeditationRail2483(env,rows))
        return {mode:'contracts',reason:'EXACT_PR_2483_OWNED_MOBILE_MEDITATION_BROWSER',
          build:false,browser:false,metrics:false,cases:'none'};
      return full('UNREVIEWED_MEDITATION_RAIL_DELTA');
    }
    if (env.GITHUB_REF==='refs/pull/2758/merge') {
      if (reviewedHomePresentation2758(env,rows))
        return { mode:'contracts',
          reason:'EXACT_PR_2758_HOME_AND_SITE_VIDEO_BROWSER_OWNED',
          build:false, browser:false, metrics:false, cases:'none' };
      return full('UNREVIEWED_HOME_PRESENTATION_DELTA');
    }
    // GitHub-provided PR ref + head name, and the *complete* expected
    // name-status set must match. No other branch or additional file is scoped.
    // The owning Meditation specialist runs real candidate Chromium/WebKit E2E.
    if (env.GITHUB_REF === 'refs/pull/2308/merge' &&
        env.GITHUB_HEAD_REF === 'codex/meditations-fullscreen-app-20261027' &&
        rows.length === REVIEWED_MEDITATION_2308_DELTA.size * 2) {
      const seen = new Set();
      let exact = true;
      for (let i = 0; i < rows.length; i += 2) {
        if (seen.has(rows[i + 1]) ||
            REVIEWED_MEDITATION_2308_DELTA.get(rows[i + 1]) !== rows[i]) {
          exact = false;
          break;
        }
        seen.add(rows[i + 1]);
      }
      if (exact && seen.size === REVIEWED_MEDITATION_2308_DELTA.size)
        return { mode: 'contracts',
          reason: 'EXACT_PR_2308_OWNED_REAL_MEDITATION_BROWSER',
          build: false, browser: false, metrics: false, cases: 'none' };
    }
    const changed = [];
    for (let i = 0; i < rows.length; i += 2) {
      const status = rows[i], file = rows[i + 1];
      // Only newly introduced, explicit CI policy/test contracts may be added.
      // No new runtime, browser, SQL, payment or unknown file can fast-track.
      if (status !== 'M' && !(status === 'A' &&
        (TRUSTED_CI_CONTRACT_FILES.has(file) || IDEAS_SCOPED_ADDITIONS.has(file) ||
         MANDALA_REVIEWED_ADDITIONS.has(file))))
        return full('ADDED_REMOVED_OR_UNSAFE_DIFF_STATUS');
      changed.push(file);
    }
    return planPublicServicesChangedPaths(changed);
  } catch {
    return full('GIT_HISTORY_OR_CHANGED_FILES_UNVERIFIED');
  }
}

// Temporary backlog optimization: keep full original Chromium/WebKit for
// unknown, auth, consent, payments, booking and cart paths. Only the reviewed
// presentation-only focused cases can defer their duplicate real browser to
// explicit manual QA while Core and source tests still run on PR.
const SAFE_FOCUSED_PR_CASES = new Set([
  'verify-ideas-mobile-browser.mjs',
  'verify-direction-focus-mobile.mjs',
  'verify-holistic-topics-browser.mjs',
  'verify-holistic-support-recommendations-mobile.mjs',
]);
export function requiresPublicServicesHeavyPr(plan) {
  if (!plan || plan.mode === 'full') return true;
  if (plan.mode === 'focused') {
    const cases = typeof plan.cases === 'string' ? plan.cases.split(',') : [];
    return !cases.length || cases.some(name => !SAFE_FOCUSED_PR_CASES.has(name));
  }
  return false;
}

// Install WebKit only for cases that actually execute WebKit. The full
// payment/consent matrix and unknowns always retain both engines.
const CHROMIUM_ONLY_CASES = new Set([
  'verify-alchemy-one-screen.mjs',
  'verify-public-services-production.mjs',
  'verify-service-cart-browser.mjs',
  'verify-direction-focus-mobile.mjs',
]);
export function publicPlaywrightEngines(plan) {
  if (!plan || !plan.browser) return 'none';
  const cases = typeof plan.cases === 'string' ? plan.cases.split(',') : [];
  return cases.length > 0 && cases.every(name => CHROMIUM_ONLY_CASES.has(name))
    ? 'chromium' : 'chromium webkit';
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
        'pr_heavy=' + requiresPublicServicesHeavyPr(plan),
        'engines=' + publicPlaywrightEngines(plan),
        'cases=' + plan.cases].join('\n') + '\n');
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Public Services exact-PR scope\n' +
      summary + '\n' +
      'Unclassified, payment, middleware, manifest and application changes always run full E2E.\n');
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
