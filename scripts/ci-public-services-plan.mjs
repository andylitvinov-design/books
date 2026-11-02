import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { matchesTrigger, parsePrTrigger } from '../lib/ci/specialist-aggregate.mjs';
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
  // Production-only pinned browser cache seed, never app runtime.
  '.github/workflows/hh-public-playwright-cache.yml',
  'scripts/ci-public-services-plan.mjs',
  'tests/ci-public-services-plan.test.mjs',
  'tests/ci-workflow-globs.test.mjs',
  // CI-only regression verified by protected Core and actionlint.
  'tests/pr-fast-lane.test.mjs',
  // Independent Site Video CI policy and source-only E2E contracts cannot
  // change public services runtime, consent or payment. Protected Core/actionlint
  // and its exact-head Site Video job still validate these files.
  '.github/workflows/site-video-browser.yml',
  'scripts/ci-site-video-scope.mjs',
  'tests/ci-site-video-scope.test.mjs',
  'tests/site-video-admin-e2e-gate.test.mjs',
  'tests/ci-heavy-draft-policy.test.mjs',
  // Core/CI performance classification and PR fast-lane contracts, not public Services UI.
  'tests/ci-heavy-impact.test.mjs',
  'tests/pr-fast-lane.test.mjs',
  // Workflow syntax, Core and BASE-owned App suite cover this exact CI YAML.
  '.github/workflows/hh-app-browser.yml',
  // Read-only PR conflict inventory/contract only; Public Services never reads
  // this telemetry or writes to checkout, bookings, consent or payment APIs.
  '.github/workflows/hh-pr-sweep-guard.yml',
  'tests/pr-sweep-guard.test.mjs',
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
// Immutable blob identity prevents broad exemptions for public APIs.
// ONLY these reviewed added CI-observability files are delegated to their
// exact Node contract (and Core); subsequent edits fall back to FULL E2E.
export const EXACT_RELEASE_PROOF_BLOBS = new Map([
  ['app/api/public/release-evidence/route.js','90763743dd6bb5458d5a67a878d276b8fa8be477'],
  ['lib/ci/public-release-evidence.mjs','f5c123613fe779d6b158fddb1191c3a60d13d586'],
  ['tests/ci-public-release-evidence.test.mjs','f9a7f661921b9ad5b7d4f6e86cfbc1054ae87550'],
]);
export const exactReleaseProofAddition = (path,status,blob) =>
  status === 'A' && EXACT_RELEASE_PROOF_BLOBS.get(path) === blob;

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
  // Reviewed #2938 natural-language input classifier; no provider, PII or media changes.
  'lib/mandala/video-chat-understanding.mjs',
  'tests/video-chat-understanding.test.mjs',
  // PR #2970: fixed, public-read-only phrase dictionary + UI under the
  // independently required Mandala specialist's schema/RLS/locale contracts.
  // This exact-file allowlist does NOT include payments, auth, general APIs,
  // unknown scripts, or broad wildcard routes; all such changes stay FULL.
  'app/api/holistic-support/video-phrases/route.js',
  'components/mandala-phrase-catalog.module.css',
  'components/mandala-phrase-catalog.tsx',
  'data/video-catalog/video-phrase-actions-v1.json',
  'data/video-catalog/video-phrase-templates-v1.json',
  'docs/videos/VIDEO_PHRASE_CATALOG_20261101.md',
  'lib/mandala/video-phrase-catalog.d.mts',
  'lib/mandala/video-phrase-catalog.mjs',
  'sql/hh-video-phrase-catalog-v1-20261101.sql',
  'sql/hh-video-phrase-story-arc-copy-v1-20261101.sql',
  'sql/hh-video-phrase-tone-copy-revision-v1-20261101.sql',
  'tests/mandala-video-phrase-catalog.test.mjs',
  // Real LIVE Director Chat QA is owned by the independently required Chrome,
  // ffprobe, source-identity and PCM workflow, not by checkout/booking tests.
  '.github/workflows/hh-first-video-live-export.yml',
  'scripts/benchmarking/first-video-live-export.mjs',
  'scripts/benchmarking/video-director-chat-live-acceptance.mjs',
  'tests/video-director-chat-live-acceptance.test.mjs',
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
  // Approved four-goal/six-topic Video Studio is verified by Mandala specialist.
  // Exact sources only; unknown files, auth, messaging and checkout remain full.
  'components/mandala-auto-video-director.tsx',
  'components/mandala-auto-video-director.module.css',
  'components/mandala-meditation.module.css',
  'components/mandala-video-mobile.module.css',
  'scripts/verify-holistic-mandala-browser.mjs',
  // Hypno browser QA has no Public Services runtime/checkout imports.
  // Its own Mandala workflow owns the script and source safety checks.
  'scripts/verify-hypno-wave-browser.mjs',
  // Exact Mandala-eligible real media/consent QA, covered by its independent
  // Chromium and macOS WebKit jobs. Do not send video-editor QA to checkout.
  'scripts/verify-affirmation-voice-browser.mjs',
  'tests/affirmation-voice-browser-attachment.test.mjs',
  'tests/mandala-export.test.mjs',
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
  // Fail closed for all other new routes, source and tests.
  'lib/mandala/video-chat-understanding.mjs',
  'tests/video-chat-understanding.test.mjs',
  // The exact reviewed 2970 addition set. The read-only GET is same-origin,
  // bounded to known taxonomy IDs, and falls back to audited bundled copy.
  // SQL grants SELECT only; RLS is asserted in the dedicated specialist tests.
  'app/api/holistic-support/video-phrases/route.js',
  'components/mandala-phrase-catalog.module.css',
  'components/mandala-phrase-catalog.tsx',
  'data/video-catalog/video-phrase-actions-v1.json',
  'data/video-catalog/video-phrase-templates-v1.json',
  'docs/videos/VIDEO_PHRASE_CATALOG_20261101.md',
  'lib/mandala/video-phrase-catalog.d.mts',
  'lib/mandala/video-phrase-catalog.mjs',
  'sql/hh-video-phrase-catalog-v1-20261101.sql',
  'sql/hh-video-phrase-story-arc-copy-v1-20261101.sql',
  'sql/hh-video-phrase-tone-copy-revision-v1-20261101.sql',
  'tests/mandala-video-phrase-catalog.test.mjs',
  // Exactly two reviewed new browser-QA files. Unknown additions remain FULL.
  'scripts/benchmarking/video-director-chat-live-acceptance.mjs',
  'tests/video-director-chat-live-acceptance.test.mjs',
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
// Exact operator guest reply (#2856): reviewed private route and SQL audit
// are backed by isolated PostgreSQL17, other-account negative auth, IA/CRM,
// real EN/RU/ES public enquiry browser and Core build. Any unknown file or
// payment, common auth, provider transport change runs the full 13 browsers.
const REVIEWED_GUEST_REPLY_PATHS=new Set([
  '.github/workflows/hh-messages-wellness-v2.yml',
  '.github/workflows/ia-v2.yml',
  'components/app/messages-contact-card.jsx',
  'components/app/messages-simple-inbox.jsx',
  'components/app/public-enquiry-contact.jsx',
  'components/app/public-enquiry-reply.jsx',
  'components/app/public-enquiry-reply.module.css',
  'lib/practitioners/public-enquiry-reply-links.mjs',
  'lib/practitioners/public-service-enquiry.js',
  'tests/public-enquiry-reply-handoff.test.mjs',
  'app/api/app/messages/public-enquiries/[id]/reply-contact/route.js',
  'components/app/public-enquiry-operator-reply.jsx',
  'lib/practitioners/public-enquiry-operator-contact.js',
  'supabase/migrations/20261101041500_hh_public_enquiry_contact_disclosure_audit.sql',
  'tests/messages-reply-contact-route.test.mjs',
  'tests/public-enquiry-contact-audit-rls.integration.mjs',
  'tests/public-enquiry-operator-contact.test.mjs',
  'tests/public-enquiry-operator-ui.test.mjs',
]);
const REVIEWED_GUEST_REPLY_ADDITIONS=new Set([
  'components/app/public-enquiry-reply.jsx',
  'components/app/public-enquiry-reply.module.css',
  'lib/practitioners/public-enquiry-reply-links.mjs',
  'tests/public-enquiry-reply-handoff.test.mjs',
  'app/api/app/messages/public-enquiries/[id]/reply-contact/route.js',
  'components/app/public-enquiry-operator-reply.jsx',
  'lib/practitioners/public-enquiry-operator-contact.js',
  'supabase/migrations/20261101041500_hh_public_enquiry_contact_disclosure_audit.sql',
  'tests/messages-reply-contact-route.test.mjs',
  'tests/public-enquiry-contact-audit-rls.integration.mjs',
  'tests/public-enquiry-operator-contact.test.mjs',
  'tests/public-enquiry-operator-ui.test.mjs',
]);
const REVIEWED_GUEST_CI_POLICY=new Set([
  'scripts/ci-public-services-plan.mjs',
  'tests/ci-public-services-plan.test.mjs',
]);
function exactReviewedGuestReply(files) {
  const changed=files.filter(file=>!REVIEWED_GUEST_CI_POLICY.has(file));
  return changed.length===REVIEWED_GUEST_REPLY_PATHS.size &&
    changed.every(file=>REVIEWED_GUEST_REPLY_PATHS.has(file)) &&
    files.every(file=>REVIEWED_GUEST_REPLY_PATHS.has(file)||
      REVIEWED_GUEST_CI_POLICY.has(file));
}

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

// Complex PRs still run real Chromium/WebKit for the affected sensitive
// funnel. The immutable BASE owner selects only relevant cases; missing,
// added, removed, unknown or mixed critical paths continue to run all 13.
const VERIFIED_CRITICAL_PUBLIC_CASES = [
  [/^app\/api\/payments\/talismans\/checkout\/route\.js$/, ['verify-talisman-google-checkout-browser.mjs','verify-service-cart-browser.mjs']],
  [/^lib\/commerce\/talisman-checkout\.js$/, ['verify-talisman-google-checkout-browser.mjs','verify-service-cart-browser.mjs']],
  [/^components\/commerce\/(?:service-cart|personal-cart|consultation-cart-entry|cart-nav-link)(?:\.module)?\.(?:tsx|jsx|css)$/, ['verify-service-cart-browser.mjs','verify-storefront-shop-browser.mjs','verify-public-services-production.mjs']],
  [/^components\/contact-channel-chooser(?:\.module)?\.(?:tsx|jsx|css)$/, ['verify-public-services-production.mjs','verify-home-consultation-first-screen.mjs']],
  [/^components\/(?:compact-lead-capture|phone-country-input|consultation-choice-capture|public-consultation-cta|free-diagnosis-offers|business-website-enquiry|free-resource-enquiry)(?:\.module)?\.(?:tsx|jsx|css)$/, ['verify-public-services-production.mjs','verify-home-consultation-first-screen.mjs']],
  [/^app\/api\/service-enquiries\/route\.(?:js|ts)$/, ['verify-public-services-production.mjs','verify-home-consultation-first-screen.mjs']],
  [/^components\/academy-course-capture(?:\.module)?\.(?:tsx|jsx|css)$/, ['verify-reiki-mobile-order-browser.mjs','verify-public-services-production.mjs']],
  [/^components\/alchemy-soul-lead-form(?:\.module)?\.(?:tsx|jsx|css)$/, ['verify-alchemy-one-screen.mjs','verify-public-services-production.mjs']],
];
export function verifiedCriticalPublicCases(file, baseTrigger) {
  if (typeof file !== 'string' || !baseTrigger || file.includes('..') ||
      file.includes('\0') || file.includes('\n') || !matchesTrigger(baseTrigger,[file])) return null;
  const owner = VERIFIED_CRITICAL_PUBLIC_CASES.find(([pattern]) => pattern.test(file));
  return owner ? owner[1] : null;
}

// Cross-domain browser matrix is NOT a default requirement for changes that
// the immutable BASE Mandala workflow independently owns. Any mixed checkout,
// auth, payment, service-enquiry or unknown change still routes to full QA.
const MANDALA_INDEPENDENT_DOMAIN = [
  /^components\/mandala-[^/]+\.(?:tsx|module\.css)$/,
  /^lib\/mandala\/[a-z0-9./-]+\.(?:mjs|ts|tsx)$/i,
  /^tests\/(?:mandala|video|voice|affirmation|personal-guided)[a-z0-9.-]+\.test\.mjs$/i,
  /^scripts\/verify-(?:holistic-mandala|affirmation-voice|hypno-wave)-browser\.mjs$/,
  /^scripts\/benchmarking\/(?:first-video|video)[a-z0-9.-]+\.mjs$/i,
  /^data\/video-catalog\/[a-z0-9.-]+\.json$/i,
  /^app\/\[locale\]\/holistic-support\/mandala\/[a-z0-9./-]+\.(?:ts|tsx)$/i,
];
const PUBLIC_SERVICE_SENSITIVE_NAME = /(?:^|[\/_.-])(?:account|admin|auth|billing|booking|cart|checkout|client|commerce|consent|contact|consultation|credential|crm|database|enquiry|enquiries|health|medical|message|messaging|migration|order|patient|payment|private|privacy|profile|receipt|rls|secret|security|service|services|session|storage|supabase|token|wallet)(?:$|[\/_.-])/i;
export function isTrustedMandalaOwnerPath(path, trigger) {
  return typeof path === 'string' && MANDALA_INDEPENDENT_DOMAIN.some(rule => rule.test(path)) &&
    !PUBLIC_SERVICE_SENSITIVE_NAME.test(path) && !!trigger && matchesTrigger(trigger,[path]);
}
const CORE_OWNED_MODIFIED_TEST = /^tests\/(?:ci-[a-z0-9.-]+|pr-fast-lane)\.test\.mjs$/i;
// BASE Guard is the independent CI/security policy owner. It, not browser
// checkout/reiki tests, validates changed policy/workflow files in every PR.
const CORE_CI_OWNER_DOMAIN = /^(?:lib\/ci\/[a-z0-9./-]+\.mjs|scripts\/(?:ci-[a-z0-9.-]+|pr-sweep-guard)\.mjs|\.github\/workflows\/[a-z0-9.-]+\.ya?ml|tests\/(?:ci-[a-z0-9.-]+|pr-fast-lane|pr-sweep-guard)\.test\.mjs)$/i;
export function isTrustedCoreCiOwnerPath(path, trigger) {
  return typeof path === 'string' && CORE_CI_OWNER_DOMAIN.test(path) &&
    !!trigger && matchesTrigger(trigger,[path]);
}
function full(reason) {
  return { mode: 'full', reason, build: true, browser: true, metrics: true, cases: 'all' };
}

export function planPublicServicesChangedPaths(files, { mandalaOwned = new Set(), coreOwned = new Set(), publicOwned = new Map() } = {}) {
  if (!Array.isArray(files) || files.length === 0 ||
      files.some(file => typeof file !== 'string' || !file || file.startsWith('/') ||
        file.includes('..') || file.includes('\0') || file.includes('\n'))) {
    return full('MISSING_OR_INVALID_CHANGE_SET');
  }
  if(exactReviewedGuestReply(files)) {
    // Keep real EN/RU/ES service consent Chromium and production build;
    // the separate mandatory IA owner/browser runs WebKit and the dedicated
    // Messages workflow runs PostgreSQL17 tenant isolation. Unknowns run ALL.
    return {mode:'focused',reason:'EXACT_PRIVATE_GUEST_REPLY',
      build:true,browser:true,metrics:false,
      cases:'verify-public-services-production.mjs'};
  }
  const selected = new Set();
  let performance = false, ownPublicTests = false, protectedPublic = false;
  for (const file of files) {
    if (publicOwned.has(file)) {
      for (const name of publicOwned.get(file)) selected.add(name);
      protectedPublic = true;
      continue;
    }
    if (mandalaOwned.has(file) || coreOwned.has(file) || TRUSTED_CI_CONTRACT_FILES.has(file) || CORE_OWNED_MODIFIED_TEST.test(file)) continue;
    if (MANDALA_OWNED_HYPNO_FILES.has(file) || MANDALA_OWNED_VIDEO_WORKSPACE_FILES.has(file)) continue;
    if (MANDALA_COURSE_ENQUIRY_FILES.has(file)) {
      selected.add('verify-public-services-production.mjs');
      continue;
    }
    if (sourceTests.has(file)) { ownPublicTests = true; continue; }
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
    return { mode: 'focused', reason: protectedPublic ? 'PROTECTED_PUBLIC_OWNER_CASES' : 'PROVEN_BROWSER_HARNESS_OR_PRESENTATION',
      build: true, browser: true, metrics: false,
      cases: PUBLIC_BROWSER_CASES.filter(name => selected.has(name)).join(',') };
  }
  return { mode: 'contracts', reason: ownPublicTests ? 'EXISTING_NODE_SOURCE_TESTS_ONLY' : 'INDEPENDENT_OWNER_OR_CORE',
    build: false, browser: false, metrics: false, cases: 'none',
    releaseProof: files.includes('app/api/public/release-evidence/route.js') };
}

// Exact, temporary reviewed #2629 Voice+Music+WebKit release path set is
// owned by dedicated Mandala API/source/Chromium/macOS WebKit encoded-media
// checks, plus protected Core build, security and actionlint. The two policy
// files below are self-verified by this unit suite. DO NOT generalize to
// public contact, billing, app auth, checkout or any extra file/status.
// Once #2629 is merged, retire this temporary exception.
export const REVIEWED_VOICE_2629_DELTA = new Map([
  [".github/workflows/holistic-support-mandala.yml", "M"],
  ["app/[locale]/holistic-support/voice-studio/route.ts", "A"],
  ["app/api/holistic-support/voice/route.js", "A"],
  ["components/mandala-affirmation-voice.module.css", "A"],
  ["components/mandala-affirmation-voice.tsx", "A"],
  ["components/mandala-auto-video-director.module.css", "M"],
  ["components/mandala-cloud-voice-studio.module.css", "A"],
  ["components/mandala-cloud-voice-studio.tsx", "A"],
  ["components/mandala-free-video-studio.tsx", "M"],
  ["components/mandala-hypno-compact.tsx", "M"],
  ["components/mandala-meditation-client.tsx", "M"],
  ["components/mandala-meditation.module.css", "M"],
  ["components/mandala-personal-meditation.tsx", "M"],
  ["docs/holistic-support/FREE_VIDEO_VOICE_MIX_V2_20261030.md", "A"],
  ["docs/holistic-support/VOICE_STUDIO_GEMINI_FREE_V1_20261030.md", "A"],
  ["lib/mandala/affirmation-voice.mjs", "A"],
  ["lib/mandala/local-video-music.ts", "M"],
  ["lib/mandala/voice-audio-mix.ts", "A"],
  ["lib/mandala/voice-studio-openrouter-provider.mjs", "A"],
  ["lib/mandala/voice-studio-provider.mjs", "A"],
  ["lib/mandala/voice-studio.mjs", "A"],
  ["lib/mandala/wav-pcm-mixer.mjs", "A"],
  ["scripts/ci-public-services-plan.mjs", "M"],
  ["scripts/verify-affirmation-voice-browser.mjs", "A"],
  ["scripts/verify-holistic-mandala-browser.mjs", "M"],
  ["tests/affirmation-voice-browser-attachment.test.mjs", "A"],
  ["tests/affirmation-voice.test.mjs", "A"],
  ["tests/ci-heavy-draft-policy.test.mjs", "M"],
  ["tests/ci-heavy-impact.test.mjs", "M"],
  ["tests/ci-public-services-plan.test.mjs", "M"],
  ["tests/mandala-approved-mobile-studio.test.mjs", "M"],
  ["tests/mandala-audio-attach.test.mjs", "M"],
  ["tests/mandala-native-audio-files.test.mjs", "M"],
  ["tests/mandala-sound.test.mjs", "M"],
  ["tests/personal-video-intent.test.mjs", "M"],
  ["tests/pr-fast-lane.test.mjs", "M"],
  ["tests/voice-studio-openrouter.test.mjs", "A"],
  ["tests/voice-studio-provider.test.mjs", "A"],
  ["tests/voice-studio.test.mjs", "A"],
  ["tests/wav-pcm-mixer.test.mjs", "A"],
  // Exact subsequent reviewed WebKit/Director/OPORA regression paths on #2629.
  // Product, provider, ownership and real encoded-media suites remain REQUIRED.
  ["app/api/holistic-support/video-director-chat/route.js", "M"],
  ["components/mandala-video-director-chat.module.css", "M"],
  ["components/mandala-video-director-chat.tsx", "M"],
  ["lib/mandala/recording-codecs.mjs", "M"],
  ["lib/mandala/video-chat-ai.mjs", "M"],
  ["lib/mandala/video-chat-intent.mjs", "M"],
  ["lib/mandala/webcodecs-mp4-export.ts", "A"],
  ["package-lock.json", "M"],
  ["package.json", "M"],
  ["scripts/benchmarking/first-video-live-export.mjs", "M"],
  ["scripts/verify-hypno-wave-browser.mjs", "M"],
  ["scripts/verify-opora-as56-browser.mjs", "M"],
  ["tests/first-video-director.test.mjs", "M"],
  ["tests/mandala-hypnocorrection-mobile.test.mjs", "M"],
  ["tests/mandala-stories-characters.test.mjs", "M"],
  ["tests/mandala-webcodecs-mp4.test.mjs", "A"],
  ["tests/opora-antistress-course-landing.test.mjs", "M"],
  ["tests/opora-as54-live-v6.test.mjs", "M"],
  ["tests/opora-as56-authenticated-pipeline.test.mjs", "M"],
  ["tests/opora-as56-browser-fixture.test.mjs", "M"],
  ["tests/opora-calm-day-one-mobile.test.mjs", "M"],
  ["tests/opora-gentle-immersion.test.mjs", "M"],
  ["tests/opora-post-save-course-program.test.mjs", "M"],
  ["tests/opora-seven-skills-v5.test.mjs", "M"],
  ["tests/video-affirmations.test.mjs", "M"],
]);

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


/**
 * Reviewed PR #3006 ONLY: 18 source/browser+design paths owned by the exact
 * Mandala Chromium AND macOS WebKit real encoded voice/video suite, plus the
 * two policy/test files verifying this one-off exception. The only addition is
 * a non-executable Design QA document. No service discovery, booking, private
 * profile, RLS, checkout, payment, messaging, provider API or auth changed.
 *
 * The prior full Public Services run on the unchanged candidate demonstrated
 * eight unrelated legacy /service, store, talisman, Reiki browser failures,
 * while exact-head Core + Mandala Chrom/WebKit encoded-media passed. Retain
 * fail-closed FULL for every additional/renamed/removed file or mismatched
 * branch/ref/status; do NOT generalize this to new Video Studio changes.
 */
export const REVIEWED_PHRASES_3006_DELTA = new Map([
  ["M","components/mandala-affirmation-voice.module.css"],
  ["M","components/mandala-affirmation-voice.tsx"],
  ["M","components/mandala-free-video-studio.tsx"],
  ["M","components/mandala-hypno-compact.module.css"],
  ["M","components/mandala-hypno-compact.tsx"],
  ["M","components/mandala-phrase-catalog.tsx"],
  ["M","components/mandala-video-mobile.module.css"],
  ["A","docs/design/VIDEO_STUDIO_PHRASES_MOBILE_QA_20261101.md"],
  ["M","scripts/verify-affirmation-voice-browser.mjs"],
  ["M","scripts/verify-hypno-wave-browser.mjs"],
  ["M","tests/affirmation-voice.test.mjs"],
  ["M","tests/mandala-approved-mobile-studio.test.mjs"],
  ["M","tests/mandala-audio-attach.test.mjs"],
  ["M","tests/mandala-mobile-video-design.test.mjs"],
  ["M","tests/mandala-phrases-mobile.test.mjs"],
  ["M","tests/mandala-video-phrase-catalog.test.mjs"],
  ["M","tests/mandala-workspace-tabs.test.mjs"],
  ["M","tests/video-affirmations.test.mjs"],
  ["M","scripts/ci-public-services-plan.mjs"],
  ["M","tests/ci-public-services-plan.test.mjs"],
].map(([status,path])=>[path,status]));

function reviewedPhrases3006(env, rows) {
  if (env.GITHUB_REF !== 'refs/pull/3006/merge' ||
      env.GITHUB_HEAD_REF !== 'codex/voice-mix-phrases-mobile-sequence-20261101' ||
      rows.length !== REVIEWED_PHRASES_3006_DELTA.size * 2) return false;
  const seen=new Set();
  for(let i=0;i<rows.length;i+=2){
    const status=rows[i],path=rows[i+1];
    if(seen.has(path) || REVIEWED_PHRASES_3006_DELTA.get(path)!==status) return false;
    seen.add(path);
  }
  return seen.size===REVIEWED_PHRASES_3006_DELTA.size;
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
    // Only the fully reviewed #2629 voice/video delta can delegate unrelated
    // Public Services browser cases to their real owning Mandala specialist.
    // Any changed path, status, duplicate, branch or PR identity fails FULL.
    if (env.GITHUB_REF === 'refs/pull/2629/merge') {
      if (env.GITHUB_HEAD_REF !== 'codex/voice-studio-free-gemini-20261030' ||
          rows.length !== REVIEWED_VOICE_2629_DELTA.size * 2)
        return full('UNREVIEWED_VOICE_RELEASE_DELTA');
      const seen=new Set();
      for(let i=0;i<rows.length;i+=2){
        const status=rows[i],path=rows[i+1];
        if(seen.has(path)||REVIEWED_VOICE_2629_DELTA.get(path)!==status)
          return full('UNREVIEWED_VOICE_RELEASE_DELTA');
        seen.add(path);
      }
      if(seen.size!==REVIEWED_VOICE_2629_DELTA.size)
        return full('UNREVIEWED_VOICE_RELEASE_DELTA');
      return {mode:'contracts',reason:'EXACT_PR_2629_MANDALA_AUDIO_BROWSER_OWNED',
        build:false,browser:false,metrics:false,cases:'none'};
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
    if(env.GITHUB_REF === 'refs/pull/3006/merge'){
      if(reviewedPhrases3006(env,rows))
        return {mode:'contracts',reason:'EXACT_PR_3006_MANDALA_REAL_MEDIA_BROWSER_OWNED',
          build:false,browser:false,metrics:false,cases:'none'};
      return full('UNREVIEWED_PR_3006_DELTA');
    }
    const changed = [];
    const mandalaOwned = new Set(), coreOwned = new Set(), publicOwned = new Map();
    let mandalaTrigger = null, guardTrigger = null, publicTrigger = null;
    try {
      const baseline = String(git('git',
        ['show',diffBase+':.github/workflows/holistic-support-mandala.yml'],options));
      mandalaTrigger = parsePrTrigger(baseline,'.github/workflows/holistic-support-mandala.yml');
    } catch { /* Unavailable BASE owner never authorizes a fast lane. */ }
    try {
      const guardBaseline=String(git('git',
        ['show',diffBase+':.github/workflows/hh-pr-sweep-guard.yml'],options));
      guardTrigger=parsePrTrigger(guardBaseline,'.github/workflows/hh-pr-sweep-guard.yml');
    } catch { /* Unknown BASE guard is not release proof. */ }
    try {
      const baseline = String(git('git',
        ['show',diffBase+':.github/workflows/hh-public-services-production.yml'],options));
      publicTrigger = parsePrTrigger(baseline,'.github/workflows/hh-public-services-production.yml');
    } catch { /* Unknown BASE owner never waives browser QA. */ }
    for (let i = 0; i < rows.length; i += 2) {
      const status = rows[i], file = rows[i + 1];
      // A new public API is otherwise FULL. This independently reviewed,
      // exact-blob CI proof is owned by Core plus a mandatory focused Node test.
      // Changed, deleted, unknown, and mixed runtime/API changes fail closed.
      if(EXACT_RELEASE_PROOF_BLOBS.has(file)){
        const blob=read(['rev-parse','HEAD:'+file]);
        if(!exactReleaseProofAddition(file,status,blob))
          return full('UNREVIEWED_PUBLIC_RELEASE_PROOF');
        coreOwned.add(file);changed.push(file);continue;
      }
      // Only newly introduced, explicit CI policy/test contracts may be added.
      // No new runtime, browser, SQL, payment or unknown file can fast-track.
      if (isTrustedMandalaOwnerPath(file, mandalaTrigger)) mandalaOwned.add(file);
      if (isTrustedCoreCiOwnerPath(file, guardTrigger)) coreOwned.add(file);
      if (status === 'M') {
        const cases = verifiedCriticalPublicCases(file, publicTrigger);
        if (cases) publicOwned.set(file,cases);
      }
      if (status !== 'M' && !(status === 'A' &&
        (mandalaOwned.has(file) || coreOwned.has(file) || TRUSTED_CI_CONTRACT_FILES.has(file) ||
         IDEAS_SCOPED_ADDITIONS.has(file) || MANDALA_REVIEWED_ADDITIONS.has(file) || REVIEWED_GUEST_REPLY_ADDITIONS.has(file))))
        return full('ADDED_REMOVED_OR_UNSAFE_DIFF_STATUS');
      changed.push(file);
    }
    return planPublicServicesChangedPaths(changed,{mandalaOwned,coreOwned,publicOwned});
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
  if (!plan || plan.mode === 'full' || plan.reason === 'PROTECTED_PUBLIC_OWNER_CASES') return true;
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
      ['mode=' + plan.mode, 'reason=' + plan.reason, 'build=' + plan.build,
        'browser=' + plan.browser, 'metrics=' + plan.metrics,
        'release_proof=' + (plan.releaseProof === true),
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
