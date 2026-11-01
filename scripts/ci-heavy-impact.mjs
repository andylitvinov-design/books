// Fail-closed, exact-HEAD impact routing for expensive specialized PR jobs.
// Only allowlisted MODIFIED presentation/tests can delegate redundant work.
// Auth, billing, API, SQL, dependencies, added/deleted files and API failures
// always retain the original exhaustive suites.
import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TARGET = 'codex/public-book-library';
const APP_UI = /^(?:components\/(?:profile-[\w.-]+\.(?:tsx|jsx|js|css)|my-course[\w.-]*\.(?:tsx|jsx|js|css)|academy-video-library-client\.tsx)|tests\/(?:profile-(?:four-domains|assessment-overview|compact-design|integrated-summary)|cabinet-today|personal-analysis-cabinet|free-course-banner|course-immersive-start-ui)\.test\.mjs|tests\/course-banner\/browser\.mjs)$/;
const BANNER = /^(?:components\/(?:my-course|academy-video-library-client)|tests\/(?:my-course|free-course-banner|course-immersive-start-ui|course-banner\/browser))/;
const CI_ONLY_CONFIG = /^(?:\.github\/workflows\/(?:hh-app-r1|hh-app-browser|hh-alchemy-mobile-acceptance|hh-free-review-live-mobile|hh-pr-sweep-guard|hh-pr-core-release|hh-public-services-production|holistic-support-mandala|opora-module-ci|ia-v2|site-video-browser)\.yml|scripts\/ci-heavy-impact\.mjs|tests\/(?:ci-heavy-impact|ci-alchemy-impact|ci-heavy-draft-policy|ci-head-cancellation|ci-stale-run-deduplication|ci-specialist-aggregate|pr-fast-lane)\.test\.mjs)$/;
const FREE_REVIEW_UNIT = new Set(['tests/free-diagnosis-three-offers.test.mjs',
  'tests/personal-testimonials-prefetch.test.mjs', 'tests/private-material-handoff.test.mjs']);
const MANDALA_UNIT = new Set([
  'tests/first-video-director.test.mjs',
  'tests/mandala-free-stock-sources.test.mjs',
  'tests/real-money-film-library.test.mjs',
  'tests/film-collection-v2.test.mjs',
  'tests/holistic-mandala-meditation.test.mjs',
  'tests/mandala-export.test.mjs',
  'tests/mandala-free-video.test.mjs',
  'tests/mandala-mobile-video-design.test.mjs',
  'tests/mandala-approved-mobile-studio.test.mjs',
  'tests/personal-video-intent.test.mjs',
  'tests/mandala-sound.test.mjs',
  'tests/mandala-native-audio-files.test.mjs',
  'tests/mandala-smart-audio.test.mjs',
  'tests/mandala-audio-attach.test.mjs',
  'tests/video-affirmations.test.mjs',
  'tests/personal-guided-course.test.mjs',
  'tests/mandala-video-therapy-focus.test.mjs',
  'tests/holistic-support-meditations.test.mjs',
  'tests/holistic-support-mobile-alternative.test.mjs',
  'tests/meditation-filters.test.mjs',
  'tests/meditation-narration.test.mjs',
  'tests/personal-meditation-script.test.mjs',
  'tests/cinematic-studio.test.mjs',
  'tests/cinematic-creative-brief.test.mjs',
  'tests/video-studio-question-registry.test.mjs',
  'tests/video-ai-gpu-readiness.test.mjs',
]);

export function decideHeavyImpact(mode, changed) {
  if (!['app-r1', 'mandala', 'free-review'].includes(mode)) throw Error('UNKNOWN_SUITE:' + mode);
  const strictlyModified = Array.isArray(changed) && changed.length > 0 &&
    changed.length <= 3000 && changed.every(file => file && file.status === 'modified' &&
      typeof file.filename === 'string' && /^[\w./[\]-]+$/.test(file.filename) &&
      !file.filename.split('/').some(segment => segment === '.' || segment === '..'));
  if (mode === 'app-r1') {
    const uiOnly = strictlyModified && changed.every(file => APP_UI.test(file.filename));
    // Only preapproved CI-specific files may bypass unrelated App/DB/browser suites.
    // This includes ADDING a new focused CI test, but never product, auth, SQL or payments.
    const ciOnly = Array.isArray(changed) && changed.length > 0 && changed.length <= 3000 &&
      changed.every(file => file && ['modified', 'added', 'removed'].includes(file.status) &&
        typeof file.filename === 'string' && CI_ONLY_CONFIG.test(file.filename));
    return {
      full_app: !(uiOnly || ciOnly),
      database: !(uiOnly || ciOnly),
      banner: !ciOnly && (!uiOnly || changed.some(file => BANNER.test(file.filename))),
      profile: !ciOnly,
    };
  }
  const testsOnly = strictlyModified && changed.every(file =>
    (mode === 'free-review' ? FREE_REVIEW_UNIT.has(file.filename) : MANDALA_UNIT.has(file.filename)));
  // Core and actionlint own the current CI workflow policies. Do not allocate
  // redundant full browser matrices for edits restricted to these policy files.
  const ciOnly = Array.isArray(changed) && changed.length > 0 && changed.length <= 3000 &&
    changed.every(file => file && ['modified', 'added'].includes(file.status) &&
      typeof file.filename === 'string' && CI_ONLY_CONFIG.test(file.filename));
  return { browser: !(testsOnly || ciOnly) };
}

async function requestJson(path) {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !/^[\w.-]+\/[\w.-]+$/.test(repository || '')) throw Error('NO_READ_ONLY_GITHUB_IDENTITY');
  const response = await fetch('https://api.github.com/repos/' + repository + path, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error('GITHUB_HTTP_' + response.status);
  return response.json();
}

// GitHub's /pulls/:number/files can include unrelated already-merged production
// changes when the event carries a stale base. Trust the exact GitHub-generated
// merge checkout instead, never a live moving-base file listing. A wrong or
// shallow checkout refuses the fast lane and retains ALL expensive checks.
export function readTestedCandidateChanges(expectedHead, eventMerge, git = execFileSync) {
  if (!/^[0-9a-f]{40}$/i.test(expectedHead || '') ||
      !/^[0-9a-f]{40}$/i.test(eventMerge || '')) throw Error('INVALID_TESTED_MERGE_IDENTITY');
  const opts = { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore','pipe','pipe'] };
  const rev = ref => String(git('git', ['rev-parse', ref], opts)).trim();
  if (rev('HEAD') !== eventMerge) throw Error('NOT_EVENT_TESTED_CHECKOUT');
  const trustedBase = rev('HEAD^1');
  if (!/^[0-9a-f]{40}$/i.test(trustedBase) ||
      rev('HEAD^2') !== expectedHead) throw Error('UNVERIFIED_EVENT_MERGE_PARENTS');
  const raw = String(git('git', ['diff','--no-renames','--name-status','-z',trustedBase,'HEAD'], opts));
  const rows = raw.split('\0');
  if (rows.pop() !== '' || rows.length < 2 || rows.length % 2 !== 0)
    throw Error('INVALID_OR_EMPTY_TESTED_DIFF');
  const files = [];
  for (let i = 0; i < rows.length; i += 2) {
    const status = { M: 'modified', A: 'added', D: 'removed' }[rows[i]];
    if (!status || !rows[i + 1]) throw Error('UNSAFE_TESTED_FILE_STATUS');
    files.push({ filename: rows[i + 1], status });
  }
  if (files.length > 3000) throw Error('TOO_MANY_TESTED_CHANGES');
  return files;
}

async function getExactPullRequestChanges(mode) {
  const number = Number(process.env.HH_PR_NUMBER);
  const expectedHead = process.env.HH_HEAD_SHA;
  if (!Number.isSafeInteger(number) || number < 1 || !/^[0-9a-f]{40}$/i.test(expectedHead || '')) {
    throw Error('INVALID_PR_ID_OR_HEAD');
  }
  const pr = await requestJson('/pulls/' + number);
  if (pr.head?.sha !== expectedHead || pr.base?.ref !== TARGET ||
      pr.head?.repo?.full_name !== process.env.GITHUB_REPOSITORY) {
    throw Error('STALE_HEAD_OR_WRONG_BASE');
  }
  let files;
  if (mode === 'app-r1') {
    // The impact job checks out GitHub's exact PR-merge candidate with both
    // parents, not an arbitrary local branch or the moving PR files endpoint.
    files = readTestedCandidateChanges(expectedHead, process.env.GITHUB_SHA);
  } else {
    // Preserve established Mandala and Free Review behavior in this focused
    // App R1 fix; unknown API state still falls back to FULL acceptance.
    files = [];
    for (let page = 1; page <= 30; page++) {
      const batch = await requestJson('/pulls/' + number + '/files?per_page=100&page=' + page);
      if (!Array.isArray(batch)) throw Error('INVALID_CHANGED_FILES');
      files.push(...batch.map(file => ({ filename: file.filename, status: file.status })));
      if (files.length > 3000) throw Error('TOO_MANY_CHANGED_FILES');
      if (batch.length < 100) break;
      if (page === 30) throw Error('INCOMPLETE_CHANGED_FILES');
    }
  }
  // Recheck head after pagination: synchronize while paging must NEVER
  // silently classify a different snapshot as test-only.
  const stillCurrent = await requestJson('/pulls/' + number);
  if (stillCurrent.head?.sha !== expectedHead || stillCurrent.base?.ref !== TARGET) {
    throw Error('PR_MOVED_DURING_CLASSIFICATION');
  }
  return files;
}

async function main() {
  const mode = process.argv[2];
  if (!['app-r1', 'mandala', 'free-review'].includes(mode)) throw Error('UNKNOWN_SUITE');
  let files = null;
  let reason = 'NON_PR_FULL_COVERAGE';
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    try {
      files = await getExactPullRequestChanges(mode);
      reason = 'EXACT_HEAD_PATH_CLASSIFICATION';
    } catch (error) {
      reason = 'FAIL_CLOSED_' + error.message;
      console.warn(reason);
      files = null;
    }
  }
  const result = decideHeavyImpact(mode, files);
  console.log(mode + ' ' + reason + ' ' + JSON.stringify(result));
  if (!process.env.GITHUB_OUTPUT) throw Error('MISSING_GITHUB_OUTPUT');
  for (const [name, enabled] of Object.entries(result)) {
    appendFileSync(process.env.GITHUB_OUTPUT, name + '=' + enabled + '\n');
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, 'Impact routing: ' + mode + ' — ' + reason +
      '; jobs: ' + JSON.stringify(result) + '\n');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
