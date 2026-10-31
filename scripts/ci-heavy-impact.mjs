// Fail-closed, exact-HEAD impact routing for expensive specialized PR jobs.
// Only allowlisted MODIFIED presentation/tests can delegate redundant work.
// Auth, billing, API, SQL, dependencies, added/deleted files and API failures
// always retain the original exhaustive suites.
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TARGET = 'codex/public-book-library';
const APP_UI = /^(?:components\/(?:profile-[\w.-]+\.(?:tsx|jsx|js|css)|my-course[\w.-]*\.(?:tsx|jsx|js|css)|academy-video-library-client\.tsx)|tests\/(?:profile-[\w.-]+|checkin-[\w.-]+|author-score-clusters|cabinet-today|free-course-banner|my-course[\w.-]*|course-immersive-start-ui|historical-interpretation-coverage|psi-monitoring|full-assessment-library-quality)\.test\.mjs|tests\/course-banner\/browser\.mjs)$/;
const BANNER = /^(?:components\/(?:my-course|academy-video-library-client)|tests\/(?:my-course|free-course-banner|course-immersive-start-ui|course-banner\/browser))/;
const MANDALA_UNIT = /^tests\/(?:mandala-[\w.-]+|holistic-mandala-[\w.-]+|first-video-director|personal-video-intent|video-affirmations|personal-guided-course|meditation-(?:filters|narration)|personal-meditation-script|cinematic-[\w.-]+|real-money-film-library|film-collection-v2|video-studio-question-registry|video-ai-gpu-readiness)\.test\.mjs$/;

export function decideHeavyImpact(mode, changed) {
  if (mode !== 'app-r1' && mode !== 'mandala') throw Error('UNKNOWN_SUITE:' + mode);
  const strictlyModified = Array.isArray(changed) && changed.length > 0 &&
    changed.length <= 3000 && changed.every(file => file && file.status === 'modified' &&
      typeof file.filename === 'string' && /^[\w./[\]-]+$/.test(file.filename) &&
      !file.filename.split('/').some(segment => segment === '.' || segment === '..'));
  if (mode === 'app-r1') {
    const uiOnly = strictlyModified && changed.every(file => APP_UI.test(file.filename));
    return {
      full_app: !uiOnly,
      database: !uiOnly,
      banner: !uiOnly || changed.some(file => BANNER.test(file.filename)),
    };
  }
  const testsOnly = strictlyModified && changed.every(file => MANDALA_UNIT.test(file.filename));
  return { browser: !testsOnly };
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

async function getExactPullRequestChanges() {
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
  const files = [];
  for (let page = 1; page <= 30; page++) {
    const batch = await requestJson('/pulls/' + number + '/files?per_page=100&page=' + page);
    if (!Array.isArray(batch)) throw Error('INVALID_CHANGED_FILES');
    files.push(...batch.map(file => ({ filename: file.filename, status: file.status })));
    if (files.length > 3000) throw Error('TOO_MANY_CHANGED_FILES');
    if (batch.length < 100) break;
    if (page === 30) throw Error('INCOMPLETE_CHANGED_FILES');
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
  if (mode !== 'app-r1' && mode !== 'mandala') throw Error('UNKNOWN_SUITE');
  let files = null;
  let reason = 'NON_PR_FULL_COVERAGE';
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    try {
      files = await getExactPullRequestChanges();
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
