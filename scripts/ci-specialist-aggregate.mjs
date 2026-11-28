#!/usr/bin/env node
// Read-only exact-HEAD and exact-BASE coverage of applicable specialist workflows.
// Runs from the PR merge checkout; no third-party API and no write permissions.
import { readFileSync, readdirSync, appendFileSync, mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { safeDocumentationAdvance, safeTrustedPolicyAdvance, safeIndependentPublicMediaAdvance, safeIndependentCiMaintenanceAdvance, verifiedIndependentPublicRasterAdvance, safeIndependentPublicPresentationAdvance, safeDisjointPublicSourceAdvance, safeIndependentQaAdvance, safeIndependentDomainTestAdvance, safeComposedIndependentAdvance, safeScopedDisjointProductionAdvance, safeMixedProtectedAdvance, safeDetachedCiSourceAdvance, safeIsolatedFeatureAdvance, safeUnrelatedPublicLeafAdvance, safeNonOverlappingProductAdvance, REVALIDATABLE_CI_POLICY_FILES } from '../lib/ci/production-base-impact.mjs';
import { classifyStaticUiText, scopedCssIsSafe } from '../lib/ci/fast-static-ui-text.mjs';
import { requiresRealMediaWebKit } from '../lib/ci/merge-check-light.mjs';
import {
  TARGET, WORKFLOW_PREFIX, expectedWorkflows, classifyPackageImpact, resolveExpectedSpecialists,
  inspectWorkflowRuns, inspectJobs, trustedConditionalJobs, trustedRequiredJobs, trustedConditionallyInapplicableJobs, validateParameters, classifyReleaseRisk, concurrencyOnlyAdvisory, selfTriggerRemovalAdvisory, isConcurrencyAdvisoryRun,
} from '../lib/ci/specialist-aggregate.mjs';

export function worktreeSources(baseSha, cwd = process.cwd()) {
  const baseNames = execFileSync('git', ['ls-tree','-r','--name-only',baseSha,'--',WORKFLOW_PREFIX],
    {cwd, encoding:'utf8',maxBuffer:5e6}).split('\n').filter(x => /\.ya?ml$/.test(x));
  const base = new Map();
  for (const name of baseNames) {
    const text = execFileSync('git', ['show',baseSha + ':' + name], {cwd,encoding:'utf8',maxBuffer:2e6});
    base.set(name,text);
  }
  const current = new Map(), dir = join(cwd,WORKFLOW_PREFIX);
  for (const name of readdirSync(dir)) {
    if (/\.ya?ml$/.test(name)) current.set(WORKFLOW_PREFIX + name,readFileSync(join(dir,name),'utf8'));
  }
  if (!base.size || !current.size) throw Error('NO_WORKFLOW_SOURCES');
  // Always compare the immutable base manifest to the exact proposed checkout.
  const basePackage = execFileSync('git', ['show',baseSha + ':package.json'], {cwd,encoding:'utf8',maxBuffer:2e6});
  const currentPackage = readFileSync(join(cwd,'package.json'),'utf8');
  // Immutable merge parent and actual proposed checkout; missing evidence remains strict.
  let baseLock,currentLock;
  try {
    baseLock=execFileSync('git',['show',baseSha+':package-lock.json'],{cwd,encoding:'utf8',maxBuffer:2e6});
    currentLock=readFileSync(join(cwd,'package-lock.json'),'utf8');
  } catch { /* no readiness compatibility proof */ }
  return {base,current,basePackage,currentPackage,baseLock,currentLock};
}

// Use the exact tested merge checkout, including both sides of renames, rather
// than a live PR file listing that can change when production advances.
export function checkoutChangedRows(baseSha, cwd = process.cwd()) {
  const raw = execFileSync('git', ['diff','--no-renames','--name-status','-z',baseSha,'HEAD'],
    {cwd, encoding:'utf8', maxBuffer:5e6}).split('\0');
  if (raw.at(-1) === '') raw.pop();
  if (!raw.length || raw.length % 2 || raw.length / 2 >= 3000) throw Error('CHECKOUT_CHANGED_FILES_INVALID');
  const rows = [];
  for (let i = 0; i < raw.length; i += 2) {
    if (!/^[AMDT]$/.test(raw[i]) || !raw[i + 1]) throw Error('CHECKOUT_CHANGED_FILES_INVALID');
    rows.push({ status: raw[i], filename: raw[i + 1] });
  }
  return rows;
}

export function verifiedCheckoutBase(env, ctx, cwd = process.cwd()) {
  if (!env.HH_TRUSTED_BASE_SHA) return null; // Compatibility with existing in-flight workflows.
  const git = (...args) => execFileSync('git', args, {cwd,encoding:'utf8'}).trim();
  if (!/^[0-9a-f]{40}$/.test(env.HH_TRUSTED_BASE_SHA) ||
      git('rev-parse','HEAD') !== env.GITHUB_SHA ||
      git('rev-parse','HEAD^1') !== env.HH_TRUSTED_BASE_SHA ||
      git('rev-parse','HEAD^2') !== ctx.head) throw Error('UNVERIFIED_MERGE_CHECKOUT');
  return env.HH_TRUSTED_BASE_SHA;
}

export function githubReader(repo, token, transport = fetch, options = {}) {
  const root = 'https://api.github.com/repos/' + repo;
  const headers = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  // Retrying only idempotent GETs prevents a transient GitHub Actions API
  // HTTP 500 from invalidating an otherwise successful exact-HEAD Core.
  // Never treat an exhausted retry as a passing specialist check.
  const sleep = options.sleep ?? delay;
  const retryDelaysMs = [400, 1200, 2400];
  async function get(path) {
    const endpoint = path.split('?')[0];
    for (let attempt = 0; ; attempt += 1) {
      let response;
      try {
        response = await transport(root + path, {headers,signal:AbortSignal.timeout(12_000)});
      } catch (error) {
        const transient = ['AbortError', 'TimeoutError', 'TypeError'].includes(error?.name);
        if (!transient || attempt >= retryDelaysMs.length)
          throw Error('GitHub read ' + endpoint + ' NETWORK ' + (error?.name || 'UNKNOWN'));
        await sleep(retryDelaysMs[attempt]);
        continue;
      }
      if (response.ok) return response.json();
      // Retryable HTTP 500 and network failures are different from a
      // genuine quota exhaustion. Waiting 0.4/1.2/2.4 seconds cannot reset
      // a primary/secondary GitHub rate window, and multiplied across
      // concurrent specialists those retries make 403 storms worse.
      const rateLimited = (response.status === 403 || response.status === 429) &&
        (response.status === 429 ||
         response.headers?.get('x-ratelimit-remaining') === '0' ||
         Boolean(response.headers?.get('retry-after')));
      if (rateLimited)
        throw Error('GitHub read ' + endpoint + ' HTTP ' + response.status + ' RATE_LIMITED');
      const transientStatus = response.status >= 500 && response.status <= 504;
      if (!transientStatus || attempt >= retryDelaysMs.length)
        throw Error('GitHub read ' + endpoint + ' HTTP ' + response.status);
      await sleep(retryDelaysMs[attempt]);
    }
  }
  async function pages(path, kind, maximum = 1000) {
    const out = [];
    for (let page = 1; page <= Math.ceil(maximum / 100) + 1; page++) {
      const separator = path.includes('?') ? '&' : '?';
      const response = await get(path + separator + 'per_page=100&page=' + page);
      const chunk = kind ? response?.[kind] : response;
      if (!Array.isArray(chunk)) throw Error('GITHUB_PAGE_SHAPE:' + path);
      out.push(...chunk);
      if (out.length > maximum) throw Error('GITHUB_PAGE_LIMIT:' + path);
      if (chunk.length < 100) return out;
    }
    throw Error('GITHUB_PAGINATION_INCOMPLETE:' + path);
  }
  return {
    pr: (n) => get('/pulls/' + n),
    changed: (n) => pages('/pulls/' + n + '/files',null,3000),
    runs: (sha) => pages('/actions/runs?head_sha=' + sha,'workflow_runs',1000),
    // Targeted fallback for GitHub's eventually consistent HEAD-wide index:
    // only probe a required workflow known missing after the initial grace.
    runsForWorkflow: async (sha, filename) => {
      if (!/^[0-9a-f]{40}$/.test(sha) ||
          !/^\.github\/workflows\/[a-z0-9._-]+\.ya?ml$/i.test(filename))
        throw Error('INVALID_WORKFLOW_FALLBACK_ARGUMENTS');
      const workflow = filename.slice(WORKFLOW_PREFIX.length);
      const result = await get('/actions/workflows/' + workflow +
        '/runs?head_sha=' + sha + '&event=pull_request&per_page=100');
      if (!Number.isSafeInteger(result?.total_count) || result.total_count > 100 ||
          result.total_count < 0 || !Array.isArray(result.workflow_runs) ||
          result.workflow_runs.length > result.total_count) throw Error('INCOMPLETE_WORKFLOW_FALLBACK');
      return result.workflow_runs;
    },
    runById: async id => {
      if (!Number.isSafeInteger(id) || id < 1) throw Error('INVALID_RUN_FALLBACK_ID');
      const row = await get('/actions/runs/' + id);
      if (row?.id !== id) throw Error('MISMATCHED_RUN_FALLBACK_ID');
      return row;
    },
    jobs: (runId) => pages('/actions/runs/' + runId + '/jobs','jobs',1000),
    // PR event payloads may retain the base SHA from when the PR was opened.
    // Read the actual protected target ref, not pulls/:number.base.sha.
    target: async () => {
      const refs = await get('/git/matching-refs/heads/' + TARGET);
      const exact = Array.isArray(refs) ? refs.filter(ref =>
        ref?.ref === 'refs/heads/' + TARGET && /^[0-9a-f]{40}$/.test(ref.object?.sha || '')) : [];
      if (exact.length !== 1) throw Error('PRODUCTION_TARGET_REF_UNAVAILABLE');
      return exact[0].object.sha;
    },
    compare: (base, head) => get('/compare/' + base + '...' + head + '?per_page=100'),
  };
}

// Compare the actual macOS job definition, not the unrelated workflow paths.
// The immutable tested BASE still determines when this optional job is required.
// Changing trigger globs alone cannot turn a deliberately skipped macOS job into
// a phantom failure, but any edit to its guard, platform or steps is refused.
function trustedMandalaMacosJob(workflow) {
  if (typeof workflow !== 'string') return null;
  const header = '\n  voice-webkit-macos:\n';
  const index = workflow.indexOf(header);
  if (index < 0 || workflow.indexOf(header, index + header.length) >= 0) return null;
  const source = workflow.slice(index + 1);
  // Compare to the next job definition. Top-level workflow metadata comes
  // before jobs: in the current supported schema.
  const rest = source.slice(header.length - 1);
  const boundary = /^  [a-z][a-z0-9_-]*:[ \t]*(?:#.*)?$/m.exec(rest);
  const end = boundary ? boundary.index : rest.length;
  return source.slice(0, header.length - 1 + end).trimEnd();
}

// A skipped macOS job is neutral only when BASE's unchanged job guard excludes
// this exact branch and no encoded-media/voice source is modified.
export function optionalMandalaMacosSkip(files, branch, changed) {
  const name = '.github/workflows/holistic-support-mandala.yml';
  const source = files?.base?.get(name);
  const candidate = files?.current?.get(name);
  const baseJob = trustedMandalaMacosJob(source);
  const candidateJob = trustedMandalaMacosJob(candidate);
  // The BASE macOS job may acquire exactly one REQUIRED cheap prerequisite.
  // A skipped WebKit job remains neutral only when the BASE branch predicate
  // itself excludes this PR; the preflight cannot alter its guard or steps.
  // Browser-only acceptance assertions do not change voice or MP4 runtime.
  // They remain covered by Core and focused Mandala tests; an unchanged
  // trusted BASE branch predicate decides whether macOS is even scheduled.
  // Preserve strict macOS enforcement for voice, codec and export source.
  const withRequiredPreflight = baseJob?.replace(
    /^(    if: .+)\n(    runs-on: macos-15)$/m,
    '$1\n    needs: [webkit_preflight]\n$2');
  const readyPreflight = typeof candidate === 'string' &&
    /^  webkit_preflight:\n    if: \$\{\{ github\.event_name != 'pull_request' \|\| github\.event\.pull_request\.draft == false \}\}$/m.test(candidate);
  const trustedMacosJob = baseJob === candidateJob ||
    (readyPreflight && withRequiredPreflight !== baseJob && withRequiredPreflight === candidateJob);
  if (!baseJob || !trustedMacosJob ||
      typeof branch !== 'string' || !branch || !Array.isArray(changed) ||
      changed.some(path => typeof path !== 'string' ||
        /^(?:app\/api\/holistic-support\/voice\/|lib\/mandala\/(?:voice|wav|affirmation|media-record|video-export|recording|webcodecs|audio|codec|mp4)|components\/mandala-(?:affirmation-voice|cloud-voice)|scripts\/benchmarking\/first-video-live-export\.mjs$)/.test(path))) return false;
  const guard = source.match(/^  voice-webkit-macos:\n    if: \$\{\{ (.+) \}\}$/m)?.[1];
  const sourceGuard = "github.event_name == 'pull_request' && github.event.pull_request.draft == false && needs.webkit_preflight.outputs.media_required == 'true'";
  if(guard===sourceGuard) {
    // The required macOS decision is derived only from TESTED BASE. Any PR
    // that alters the preflight, the workflow or physical media cannot waive.
    const preflight=yaml=>{
      if(typeof yaml!=='string')return null;
      const start=yaml.indexOf('\n  webkit_preflight:\n');
      const end=yaml.indexOf('\n  voice-webkit-macos:\n');
      return start>=0&&end>start?yaml.slice(start,end):null;
    };
    return !changed.includes(name) && preflight(source)!==null &&
      preflight(source)===preflight(candidate) &&
      !requiresRealMediaWebKit(changed.map(filename=>({filename,status:'M'})));
  }
  const fixed = "github.event_name == 'pull_request' && github.event.pull_request.draft == false && (";
  if (!guard?.startsWith(fixed) || !guard.endsWith(')')) return false;
  const predicates = guard.slice(fixed.length, -1).split(' || ');
  // Bound the immutable BASE-owned literal list, including newly required
  // WebKit branch routes (24 in BASE, 25 after fix/montage-audio). No dynamic
  // expressions, changed macOS job, or encoded-media skip gains permission.
  if (!predicates.length || predicates.length > 32) return false;
  // Trusted BASE guards may include literal startsWith prefixes and one
  // literal exact branch. Reject every computed or unknown expression.
  const rules = predicates.map(item => {
    const prefix = item.match(/^startsWith\(github\.head_ref, '([a-z][a-z0-9/-]+)'\)$/)?.[1];
    if (prefix) return {kind:'prefix', value:prefix};
    const exact = item.match(/^github\.head_ref == '([a-z][a-z0-9/-]+)'$/)?.[1];
    return exact ? {kind:'exact', value:exact} : null;
  });
  if (rules.some(rule => !rule)) return false;
  return !rules.some(rule => rule.kind === 'prefix'
    ? branch.startsWith(rule.value) : branch === rule.value);
}


/**
 * Only the unmodified, BASE-owned Profile Axis workflow may skip its one
 * writer-only job on unrelated source branches. Its main axis suite is still
 * mandatory, and a changed workflow/guard or the writer's own branch fails
 * closed. Generic branch predicates remain disallowed by trustedConditionalJobs.
 */
export function optionalProfileWriterSkip(files, branch) {
  const name = '.github/workflows/hh-profile-axis-matching.yml';
  const source = files?.base?.get(name);
  const candidate = files?.current?.get(name);
  // The selective-workflow migration can replace this owner's YAML self-trigger
  // with the reviewed shared contract. The only approved exception is this
  // exact one-line swap: job guards, permissions and every other line remain
  // byte-identical to immutable production BASE.
  const oldTrigger = "      - '.github/workflows/hh-profile-axis-matching.yml'";
  const migrationTrigger = "      - 'tests/ci-pr-selective-workflows.test.mjs'";
  const approvedMigration = typeof source === 'string' && typeof candidate === 'string' &&
    source.split(oldTrigger).length === 2 && !source.includes(migrationTrigger) &&
    candidate === source.replace(oldTrigger, migrationTrigger);
  if (typeof source !== 'string' || typeof candidate !== 'string' ||
      (source !== candidate && !approvedMigration) ||
      typeof branch !== 'string' || !branch ||
      (branch === 'feat/meditation-writer-device-voice-v1-20261030' ||
       branch === 'fix/ci-ffmpeg-verified-github-asset-20261105')) return false;
  const onlyWriter = [
    '  writer-practical-focused:',
    "    if: ${{ github.event_name == 'pull_request' && (github.event.pull_request.base.ref == 'codex/holistic-intelligence-core-20261029' || github.event.pull_request.base.ref == 'codex/public-book-library') && (github.head_ref == 'feat/meditation-writer-device-voice-v1-20261030' || github.head_ref == 'fix/ci-ffmpeg-verified-github-asset-20261105') }}",
    '    runs-on: ubuntu-24.04',
  ].join('\n');
  const requiredAxis = [
    '  axis-unit-types-build:',
    "    if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}",
  ].join('\n');
  return source.split(onlyWriter).length === 2 &&
    source.split(requiredAxis).length === 2;
}

// Loose BASE is permitted only for recognizable, non-sensitive source paths.
// A surprising path, CI/policy change, credential-related name, private-data
// surface, API, or billing/security feature retains fresh production-base
// matching. This is deliberately independent of FAST UI routing: normal
// application code still requires Core and all applicable specialist checks.
export function requiresCurrentProductionBase(changed) {
  if (!Array.isArray(changed) || changed.length === 0) return true;
  const ordinaryRoots = /^(?:app|components|lib|tests|public|content|data|docs)\//;
  // Browser, video and unit acceptance helpers are NOT production runtime.
  // Their filenames may mention voice, export, codec or chat; that does not
  // turn an otherwise public PR into a stale-base security change. A real
  // encoded-file/WebKit Specialist remains mandatory based on changed files.
  // Keep CI/release, auth, patient/privacy, payment and credential QA strict.
  const testOnlyAcceptance = file =>
    (/^tests\/[a-z0-9._/-]+\.test\.(?:mjs|cjs|js|ts|tsx)$/i.test(file) ||
     /^scripts\/(?:verify-[a-z0-9._/-]+|benchmarking\/[a-z0-9._/-]+)\.mjs$/i.test(file)) &&
    !/(?:^|[\/_.-])(?:ci|workflow|policy|release|deploy|deployment|vercel|config|admin|api|auth|authorization|account|billing|booking|cabinet|checkout|client|consent|credential|crm|database|identity|login|medical|patient|payment|private|privacy|rls|secret|security|session|storage|supabase|token|wallet)(?:$|[\/_.-])/i.test(file);
  // This exact synthetic PUBLIC Services browser verifier is test-only:
  // it cannot change Next runtime, payment handlers, private data or consent.
  // A mixed PR containing any sensitive source still retains the strict base.
  const publicSourceAcceptanceHarness = file =>
    file === 'scripts/verify-public-services-production.mjs';
  const sensitiveName = /(?:^|[\/_.-])(?:account|admin|api|auth|billing|booking|cabinet|chat|checkout|client|consent|conversation|credential|crm|database|health|identity|inbox|login|medical|message|messages|messaging|migration|patient|payment|private|privacy|profile|rls|secret|security|session|storage|supabase|token|wallet)(?:$|[\/_.-])/i;
  const sensitiveRoots = /^(?:app\/(?:\[[^/]+\]\/)?api\/|app\/(?:\[[^/]+\]\/)?app\/|components\/app\/|lib\/(?:app|assessments|ia|practitioners)\/|docs\/operations\/|docs\/billing\/|docs\/payments\/)/i;
  return changed.some(file =>
    typeof file !== 'string' ||
    (!ordinaryRoots.test(file) && !testOnlyAcceptance(file) && !publicSourceAcceptanceHarness(file)) ||
    file.split('/').some(segment => segment === '.' || segment === '..' || segment === '') ||
    (!testOnlyAcceptance(file) && sensitiveName.test(file)) ||
    /^tests\/(?:ci-|workflow-|required-gate-|pr-fast-lane)/i.test(file) ||
    sensitiveRoots.test(file)
  );
}

// Verified one-time owner selector migration: changing a path filter alone
// cannot change runtime, permissions or job bodies. A rising production BASE
// must not turn an otherwise green CI-maintenance PR red. This exception is
// used only with exact status rows from the immutable GitHub test-merge diff.
const OPTIONAL_SELECTOR_OWNERS = new Set([".github/workflows/admin-seo-dashboard.yml",".github/workflows/dao-iching-library.yml",".github/workflows/hh-benchmark-program.yml",".github/workflows/hh-benchmark-public-browser.yml",".github/workflows/hh-course-presets.yml",".github/workflows/hh-direct-video-notes.yml",".github/workflows/hh-energywork-ai.yml",".github/workflows/hh-event-referral-contract.yml",".github/workflows/hh-first-video-live-export.yml",".github/workflows/hh-growth-journey.yml",".github/workflows/hh-growth-studio.yml",".github/workflows/hh-home-conversation.yml",".github/workflows/hh-ideas-coaching-public.yml",".github/workflows/hh-live-audio-ci.yml",".github/workflows/hh-live-seo-audit.yml",".github/workflows/hh-personal-coaching-session.yml",".github/workflows/hh-public-performance-audit.yml",".github/workflows/hh-salesbot-remaster-feature.yml",".github/workflows/hh-sitemap-runtime-assets.yml",".github/workflows/hh-static-image-cost-guard.yml",".github/workflows/hh-support-guided-recommendations.yml",".github/workflows/hh-video-feature-lab.yml",".github/workflows/holistic-house-native.yml",".github/workflows/holistic-house-ocean-audio.yml",".github/workflows/library-public-feed.yml",".github/workflows/mentor-community-acceptance.yml",".github/workflows/practice-google-browser.yml",".github/workflows/practice-material-previews.yml",".github/workflows/practice-visual-browser.yml"]);
const OPTIONAL_SELECTOR_OLD = "      - 'tests/ci-pr-selective-workflows.test.mjs'";
const OPTIONAL_SELECTOR_NEW = "      - 'docs/operations/CI_OWNER_ROUTE_MIGRATION_20261104.md'";
const OPTIONAL_SELECTOR_GUARD = '.github/workflows/hh-pr-sweep-guard.yml';
const OPTIONAL_SELECTOR_MARKER = 'docs/operations/CI_OWNER_ROUTE_MIGRATION_20261104.md';
const OPTIONAL_SELECTOR_TESTS = new Set(['tests/ci-pr-selective-workflows.test.mjs',
  'tests/growth-studio-benchmark-quick-compose.test.mjs']);
export function verifiedOptionalOwnerSelectorMigration(files, rows) {
  if (!(files?.base instanceof Map) || !(files?.current instanceof Map) ||
      !Array.isArray(rows) || rows.length < 3 || rows.length > 34) return false;
  let owners = 0, marker = 0;
  const seen = new Set();
  for (const row of rows) {
    const {filename: path, status} = row || {};
    if (typeof path !== 'string' || seen.has(path) || row.previous_filename) return false;
    seen.add(path);
    if (OPTIONAL_SELECTOR_OWNERS.has(path)) {
      const original = files.base.get(path), candidate = files.current.get(path);
      if (status !== 'M' || typeof original !== 'string' ||
          original.split(OPTIONAL_SELECTOR_OLD).length !== 2 ||
          original.includes(OPTIONAL_SELECTOR_NEW) ||
          candidate !== original.replace(OPTIONAL_SELECTOR_OLD,OPTIONAL_SELECTOR_NEW)) return false;
      owners++;
      continue;
    }
    if (path === OPTIONAL_SELECTOR_GUARD) {
      const original = files.base.get(path), candidate = files.current.get(path);
      if (status !== 'M' || typeof original !== 'string' ||
          original.split(OPTIONAL_SELECTOR_OLD).length !== 2 ||
          original.includes(OPTIONAL_SELECTOR_NEW) ||
          candidate !== original.replace(OPTIONAL_SELECTOR_OLD,
            OPTIONAL_SELECTOR_OLD + '\n' + OPTIONAL_SELECTOR_NEW)) return false;
      continue;
    }
    if (path === OPTIONAL_SELECTOR_MARKER && status === 'A') { marker++; continue; }
    if (OPTIONAL_SELECTOR_TESTS.has(path) && status === 'M') continue;
    return false; // no runtime, checkout, auth, dependency, mixed or unknown changes
  }
  return owners >= 1 && marker === 1;
}
// A precise PR state reason is actionable; a generic HEAD/BASE message is not.
// Keep the fail-closed prefix for existing consumers and expose the precise cause.
export function classifyPrState(pr, ctx, requireCurrentBase = false) {
  if (!pr || pr.number !== ctx.number) return 'WRONG_PR_NUMBER';
  if (pr.state !== 'open') return 'PR_NOT_OPEN';
  if (pr.draft) return 'PR_DRAFT';
  if (pr.head?.sha !== ctx.head) return 'PR_HEAD_CHANGED';
  if (!/^[0-9a-f]{40}$/i.test(pr.base?.sha || '')) return 'INVALID_BASE_SHA';
  if (pr.base?.ref !== TARGET) return 'WRONG_PRODUCTION_TARGET';
  if (pr.base?.repo?.full_name !== ctx.repo || pr.head?.repo?.full_name !== ctx.repo) return 'WRONG_REPOSITORY';
  if (requireCurrentBase && pr.base.sha !== ctx.base) return 'PRODUCTION_BASE_CHANGED';
  if (pr.mergeable === false || pr.mergeable_state === 'dirty') return 'MERGE_CONFLICT';
  return null;
}

// A protected target advance can temporarily make GitHub mergeability null.
// This helper is read-only, bounded, and never accepts an unproven target.
export async function awaitPositiveMergeability(api, ctx, target, sleep = delay) {
  for (const wait of [1000, 2000, 4000]) {
    await sleep(wait);
    const fresh = await api.pr(ctx.number);
    assertSame(fresh, ctx, false);
    if (await api.target() !== target) return null;
    if (fresh.mergeable === true && fresh.base.sha === target) return fresh;
    if (fresh.mergeable !== null && fresh.mergeable !== true) return null;
  }
  return null;
}

function assertSame(pr, ctx, requireCurrentBase = false) {
  const reason = classifyPrState(pr, ctx, requireCurrentBase);
  if (reason) throw Error('PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:' + reason);
}

// These broad domain/browser diagnostics remain visible in Actions. Only a
// proven FAST presentation change may stop waiting for an unchanged BASE copy.
const FAST_ADVISORY_WORKFLOWS = new Set([
  '.github/workflows/hh-public-services-production.yml',
  '.github/workflows/hh-app-r1.yml',
  '.github/workflows/hh-app-browser.yml',
  '.github/workflows/ia-v2.yml',
  '.github/workflows/opora-module-ci.yml',
  '.github/workflows/site-video-browser.yml',
  '.github/workflows/hh-benchmark-public-browser.yml',
]);

// Load only the BASE-pinned parser, without PR dependencies or npm scripts.
// A failed install never waives checks: callers fall back to STRICT.
export function loadTrustedTypescript(base) {
  if (!/^[0-9a-f]{40}$/.test(base || '')) return null;
  let dir;
  try {
    const read=path=>execFileSync('git',['show',base+':'+path],{encoding:'utf8',maxBuffer:100_000,stdio:['ignore','pipe','pipe']});
    const manifest=read('lib/ci/fast-ui-parser/package.json');
    const lock=read('lib/ci/fast-ui-parser/parser-lock.json');
    const pkg=JSON.parse(manifest), parsed=JSON.parse(lock);
    const entry=parsed.packages?.['node_modules/typescript'];
    if (Object.keys(pkg).sort().join(',') !== 'dependencies,name,private,version' ||
        pkg.name !== 'hh-fast-ui-parser' || pkg.private !== true || pkg.version !== '1.0.0' ||
        JSON.stringify(pkg.dependencies) !== JSON.stringify({typescript:'5.9.3'}) ||
        JSON.stringify(parsed.packages?.['']?.dependencies) !== JSON.stringify({typescript:'5.9.3'}) ||
        Object.keys(parsed.packages || {}).sort().join(',') !== ',node_modules/typescript' ||
        entry?.version !== '5.9.3' || entry.resolved !== 'https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz' ||
        entry.integrity !== 'sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==') return null;
    dir=mkdtempSync(join(tmpdir(),'hh-ci-ui-parser-'));
    writeFileSync(join(dir,'package.json'),manifest,{mode:0o600});
    writeFileSync(join(dir,'package-lock.json'),lock,{mode:0o600});
    const env={PATH:process.env.PATH || '/usr/bin:/bin',CI:'true',npm_config_userconfig:join(dir,'user.npmrc'),
      npm_config_globalconfig:join(dir,'global.npmrc'),npm_config_cache:join(dir,'cache')};
    execFileSync('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],
      {cwd:dir,env,timeout:45_000,maxBuffer:1_000_000,stdio:['ignore','pipe','pipe']});
    return createRequire(join(dir,'package.json'))('typescript');
  } catch {
    console.warn('Trusted UI parser unavailable; routing this change to STRICT.');
    return null;
  }
  finally { if (dir) rmSync(dir,{recursive:true,force:true}); }
}

export function trustedAdditiveActionlint(base, current) {
  if (typeof base !== 'string' || typeof current !== 'string') return false;
  if (base === current) return true;
  const additions = [
    "      - 'tests/ci-stale-run-deduplication.test.mjs'\n",
    "          node --test tests/ci-stale-run-deduplication.test.mjs\n",
  ];
  if (additions.some(line => current.split(line).length !== 2)) return false;
  let restored = current;
  for (const line of additions) restored = restored.replace(line, '');
  return restored === base;
}

export async function verify(api,ctx,files,options={}) {
  // Distinguish an absent workflow from a queued run and genuine execution.
  // Running checks use the long deadline; registered queued checks get a separate,
  // bounded runner-capacity grace rather than the old three-minute false red.
  const boundedMs = (value, maximum, minimum = 0) => {
    const n = Number(value);
    if (!Number.isFinite(n)) throw Error('INVALID_SPECIALIST_WAIT_CONFIG');
    return Math.max(minimum, Math.min(maximum, n));
  };
  const maxWait = boundedMs(options.maxWaitMs ?? 35*60_000, 40*60_000);
  // A real exact-HEAD actionlint run can be registered after the first Core
  // Specialist index read. Give GitHub a bounded second minute before
  // declaring NOT_TRIGGERED; never infer PASS from absence.
  const missingGrace = Math.min(maxWait, boundedMs(options.missingGraceMs ?? 120_000, 180_000));
  // An expected workflow can be created on GitHub but temporarily absent
  // from its HEAD-indexed Actions list while other specialists are queued.
  // Never certify a missing job; only postpone NOT_TRIGGERED for the bounded
  // period in which independent required jobs are demonstrably pending.
  // No reruns, commits, privileged permissions or paid services are needed.
  const correlatedMissingGrace = Math.min(maxWait,
    boundedMs(options.correlatedMissingGraceMs ?? 5*60_000, 8*60_000));
  // Registered queued/requested/waiting checks are dispatched, not failed.
  // Unlike actual execution, idle runner allocation must not occupy this
  // read-only aggregation runner for 35 minutes. Keep a 10-minute default,
  // with an explicit bounded override for confirmed long GitHub queue periods.
  // Exhaustion blocks merge as RUNNER_QUEUE, never as failed application code.
  const queuedGrace = Math.min(maxWait, boundedMs(options.queuedGraceMs ?? 10*60_000, 40*60_000));
  // A completed workflow's jobs API may lag; read only missing/pending job data.
  const jobGrace = Math.min(maxWait, boundedMs(options.jobGraceMs ?? 45_000, 90_000));
  // Poll non-final queued/running specialists every 60s instead of every 30s:
  // halve redundant GitHub HEAD-index reads while preserving all required checks.
  // Missing-workflow discovery and the final-running fast lane remain responsive.
  const pollMs = boundedMs(options.pollMs ?? 60_000, 60_000, 100);
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? delay;
  const pinnedChangeRows = Array.isArray(files.changedRows) && files.changedRows.length > 0;
  const pr = await api.pr(ctx.number);
  // Loose base is never allowed for legacy/unverified live file listings.
  // Only exact merged checkout rows can prove what was tested.
  assertSame(pr,ctx,!pinnedChangeRows);
  const changedRows=pinnedChangeRows ? files.changedRows : await api.changed(ctx.number);
  if (changedRows.some(row => row.status === 'renamed' && typeof row.previous_filename !== 'string')) {
    throw Error('PR_CHANGED_FILES_RENAME_SOURCE_MISSING');
  }
  const changed=changedRows.flatMap(row => row.previous_filename ? [row.filename, row.previous_filename] : [row.filename]);
  if (!changed.length || changedRows.length >= 3000 || changed.some(x=>typeof x!=='string')) throw Error('PR_CHANGED_FILES_MISSING_OR_TRUNCATED');
  // BASE/HEAD workflow definitions and the actual merge snapshot stay
  // immutable even when the production target moves after the check started.
  const requireCurrentBase=!pinnedChangeRows || (requiresCurrentProductionBase(changed) &&
    !verifiedOptionalOwnerSelectorMigration(files,changedRows));
  const approvedBaseChanges = new Set();
  const approvedPresentationBases = new Set();
  const approvedDisjointBases = new Set();
  async function verifyCurrentBase(live, allowMergeabilityRetry = true) {
    assertSame(live, ctx, false);
    if (!requireCurrentBase) return;
    // GitHub's pull_request.base.sha is an event/PR snapshot and can lag the
    // protected branch after a verified merge checkout has been created.
    // Compare against the actual production ref while keeping HEAD exact.
    const liveBaseSha = typeof api.target === 'function' ? await api.target() : live.base.sha;
    if (!/^[0-9a-f]{40}$/.test(liveBaseSha)) {
      throw Error('PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED');
    }
    if (liveBaseSha === ctx.base) return;
    if (!pinnedChangeRows || typeof api.compare !== 'function') {
      throw Error('PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED');
    }
    // GitHub temporarily returns mergeable=null while it recomputes an exact
    // merge after a production update. That is NOT a confirmed conflict.
    // Safe-base reuse still requires complete protected Compare proof; the
    // native merge gate separately requires affirmative mergeable=true.
    if ((approvedPresentationBases.has(liveBaseSha) || approvedDisjointBases.has(liveBaseSha)) &&
        (live.mergeable === false || live.mergeable_state === 'dirty'))
      throw Error('PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:MERGE_CONFLICT');
    if (!approvedBaseChanges.has(liveBaseSha)) {
      // Only a complete, ancestry-proven, documentation-only target advance
      // may pass. Security, runtime, CI, unknown and incomplete diffs stay blocked.
      const diff = await api.compare(ctx.base, liveBaseSha);
      const documentationOnly = safeDocumentationAdvance(diff, ctx.base, liveBaseSha, changed);
      // This option is set ONLY after loading the validator, dependencies and
      // helper from this exact protected production commit (never the PR HEAD).
      // The new BASE must contain CI-only policy/test changes: no workflows or
      // application source may have advanced without new proposed-merge CI.
      const independentlyRevalidated = options.trustedPolicyBaseSha === liveBaseSha &&
        safeTrustedPolicyAdvance(diff, ctx.base, liveBaseSha, changed);
      // Independently tested public media source advances cannot change a
      // candidate that edits ONLY detached Specialist policy code/tests. The
      // immutable PR HEAD, actual successful Core and every Specialist job
      // remain mandatory; auth/billing/workflows/CI/unknown paths stay red.
      const isolatedCiPolicy = pinnedChangeRows &&
        changedRows.every(row => row.status === 'M' || row.status === 'A' ||
          row.status === 'modified' || row.status === 'added') &&
        safeIndependentPublicMediaAdvance(diff, ctx.base, liveBaseSha, changed);
      // Do not invalidate a long-running sensitive PR just because another
      // already-protected PR shipped *only* independent CI telemetry/tests or
      // one-line retired optional-owner trigger removals. GitHub's full
      // ancestor/commit/file proof and strict no-overlap check are required.
      // Never reuse green checks over real runtime, Core, Guard, actionlint,
      // Specialist, dependency or security policy changes.
      const unrelatedCiMaintenance = pinnedChangeRows &&
        safeIndependentCiMaintenanceAdvance(diff, ctx.base, liveBaseSha, changed);
      // Reuse unchanged source checks if the newer protected BASE contains
      // nothing but independently proven public raster assets. GitHub must
      // report this PR as actually mergeable: no guessed/null conflict state.
      // A deleted/renamed CANDIDATE file cannot change an unrelated protected
      // image advance. The complete pinned source path inventory is the proof,
      // not the candidate's status code. The policy rejects target deletions.
      const inertPublicImages = pinnedChangeRows &&
        live.mergeable !== false && live.mergeable_state !== 'dirty' &&
        verifiedIndependentPublicRasterAdvance(diff, ctx.base, liveBaseSha, changed);
      // If a protected PR shipped an independent public page/feature component,
      // its successful tests remain usable for a genuinely disjoint candidate.
      // A positive GitHub mergeable result and complete ancestry proof are required.
      const independentPresentation = pinnedChangeRows &&
        live.mergeable !== false && live.mergeable_state !== 'dirty' &&
        safeIndependentPublicPresentationAdvance(diff, ctx.base, liveBaseSha, changed);
      // A real protected production promotion may change unrelated public
      // product files while this PR's Core and specialists are still running.
      // Do not discard those successful results merely because BASE moved.
      // Require GitHub's affirmative mergeability and complete source proof.
      const disjointPublicSource = pinnedChangeRows &&
        live.mergeable !== false && live.mergeable_state !== 'dirty' &&
        safeDisjointPublicSourceAdvance(diff, ctx.base, liveBaseSha, changed);
      // An unrelated public browser verifier is QA evidence, not runtime.
      // Actual changed workflow/job scope, private tests and failed checks
      // are still independently enforced above and by native merge rules.
      const independentQa = pinnedChangeRows &&
        live.mergeable !== false && live.mergeable_state !== 'dirty' &&
        safeIndependentQaAdvance(diff, ctx.base, liveBaseSha, changed);
      // Target-only unit tests of another domain do not invalidate source QA.
      // The current exact-HEAD Core and all actually required specialists are
      // still mandatory; native ARM independently verifies GitHub mergeability.
      const independentDomainTest = pinnedChangeRows &&
        live.mergeable !== false && live.mergeable_state !== 'dirty' &&
        safeIndependentDomainTestAdvance(diff, ctx.base, liveBaseSha, changed);
      // Mixed read-only/docs/public-asset/test promotions need not invalidate
      // this already tested immutable HEAD. Require an affirmative mergeability
      // result, full ancestry and every row's *existing* trusted risk proof.
      const composedIndependent = pinnedChangeRows && live.mergeable === true &&
        safeComposedIndependentAdvance(diff, ctx.base, liveBaseSha, changed);
      // A complete proven target advance across different product domains
      // cannot invalidate green Core/required specialists for unchanged HEAD.
      const scopedDisjoint = pinnedChangeRows &&
        live.mergeable !== false && live.mergeable_state !== 'dirty' &&
        safeScopedDisjointProductionAdvance(diff, ctx.base, liveBaseSha, changed);
      // General protected mixed-delta reuse, including many small protected
      // commits while a long-running required specialist was in flight.
      const mixedProtected = pinnedChangeRows &&
        live.mergeable !== false && live.mergeable_state !== 'dirty' &&
        safeMixedProtectedAdvance(diff, ctx.base, liveBaseSha, changed);
      // A tested, detached CI Specialist-only PR remains reusable when
      // unrelated protected product source (no workflow/config/security)
      // advanced. The native merge still needs real green checks and
      // GitHub's affirmative mergeability for this exact HEAD.
      const detachedCi = pinnedChangeRows && live.mergeable === true &&
        safeDetachedCiSourceAdvance(diff,ctx.base,liveBaseSha,changed);
      // A new, independently namespaced public feature must not require a
      // rebase just because a different protected PR reached production.
      // This stricter fallback needs GitHub's affirmative mergeability, a
      // complete ancestry/path diff and rejects shared/critical source.
      const isolatedFeature = pinnedChangeRows && live.mergeable === true &&
        safeIsolatedFeatureAdvance(diff, ctx.base, liveBaseSha, changed, live.mergeable);
      // Protected public route leaves cannot invalidate a completed private
      // API/coach suite. Shared UI, auth, CRM, SQL, CI and deps remain strict.
      const unrelatedPublicLeaves = pinnedChangeRows && live.mergeable === true &&
        changedRows.every(row => !row.previous_filename &&
          ['M','A','modified','added'].includes(row.status)) &&
        safeUnrelatedPublicLeafAdvance(diff, ctx.base, liveBaseSha, changed);
      // One general loose-base rule for complete non-overlapping ordinary product changes.
      // Preserve the actual tested HEAD and all required specialist outcomes.
      const nonOverlappingProduct = pinnedChangeRows && live.mergeable === true &&
        safeNonOverlappingProductAdvance(diff, ctx.base, liveBaseSha, changed, files);
      if (!documentationOnly && !independentlyRevalidated &&
          !isolatedCiPolicy && !unrelatedCiMaintenance && !inertPublicImages &&
          !independentPresentation && !disjointPublicSource && !independentQa &&
          !independentDomainTest && !composedIndependent && !scopedDisjoint && !mixedProtected && !detachedCi && !isolatedFeature && !unrelatedPublicLeaves && !nonOverlappingProduct) {
        // Retry only an existing positive-only compatibility proof, not actual
        // overlap or an unproven compare. Null never authorizes reuse.
        const positiveOnlyProof = allowMergeabilityRetry && live.mergeable === null &&
          typeof api.target === 'function' && maxWait > 0 &&
          (safeComposedIndependentAdvance(diff, ctx.base, liveBaseSha, changed) ||
           safeDetachedCiSourceAdvance(diff, ctx.base, liveBaseSha, changed) ||
           safeNonOverlappingProductAdvance(diff, ctx.base, liveBaseSha, changed, files) ||
           safeIsolatedFeatureAdvance(diff, ctx.base, liveBaseSha, changed, true) ||
           (changedRows.every(row => !row.previous_filename &&
             ['M','A','modified','added'].includes(row.status)) &&
            safeUnrelatedPublicLeafAdvance(diff, ctx.base, liveBaseSha, changed)));
        if (positiveOnlyProof) {
          const fresh = await awaitPositiveMergeability(api, ctx, liveBaseSha, sleep);
          if (fresh) {
            console.log('CI_BASE_ADVANCE_MERGEABILITY_REFRESH: recovered positive GitHub mergeability without a new CI wave');
            return verifyCurrentBase(fresh, false);
          }
        }
        // Report bounded causal evidence, not an unsupported root classification.
        const rows = Array.isArray(diff?.files) ? diff.files : [];
        const candidate = new Set(changed);
        console.log('CI_BASE_ADVANCE_BLOCKED:' + JSON.stringify({
          tested_base:ctx.base, observed_base:liveBaseSha, head:ctx.head,
          mergeable:live.mergeable ?? null, compare_status:diff?.status ?? null,
          ahead_by:diff?.ahead_by ?? null, behind_by:diff?.behind_by ?? null,
          reported_file_rows:rows.length, overlap:rows.filter(row=>candidate.has(row?.filename) ||
            candidate.has(row?.previous_filename)).map(row=>row.filename).slice(0,30),
          target_paths:rows.slice(0,30).map(row=>({path:row?.filename,status:row?.status})),
          proof:'NOT_ACCEPTED',
        }));
        throw Error('PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED');
      }
      if (nonOverlappingProduct) {
        approvedDisjointBases.add(liveBaseSha);
        console.log('CI_BASE_ADVANCE_REUSED: ordinary non-overlapping protected product delta; retain exact-HEAD CI without a new build');
      }
      if (unrelatedPublicLeaves) {
        approvedDisjointBases.add(liveBaseSha);
        console.log('CI_BASE_ADVANCE_REUSED: protected production changed only independent public leaves; exact-HEAD checks retained');
      }
      if(detachedCi) {
        approvedDisjointBases.add(liveBaseSha);
        console.log('CI_BASE_ADVANCE_REUSED: independent protected product source; retain green detached Specialist CI');
      }
      if (isolatedFeature) {
        approvedDisjointBases.add(liveBaseSha);
        console.log('CI_BASE_ADVANCE_REUSED: separate unclassified public feature; verified GitHub mergeability and full protected Compare');
      }
      if (mixedProtected) {
        approvedDisjointBases.add(liveBaseSha);
        console.log('CI_BASE_ADVANCE_REUSED: verified independent protected mixed delta; keep unchanged exact-HEAD Core and specialists');
      }
      if (scopedDisjoint) {
        approvedDisjointBases.add(liveBaseSha);
        console.log('CI_BASE_ADVANCE_REUSED: verified disjoint product domains; preserve green exact-HEAD checks');
      }
      if (composedIndependent) {
        approvedDisjointBases.add(liveBaseSha);
        console.log('CI_BASE_ADVANCE_REUSED: all independently validated mixed protected files; preserve green exact-HEAD checks');
      }
      if (disjointPublicSource) {
        approvedDisjointBases.add(liveBaseSha);
        console.log('CI_BASE_ADVANCE_REUSED: verified disjoint public product source; preserve green exact-HEAD checks');
      }
      if (independentQa) {
        console.log('CI_BASE_ADVANCE_REUSED: independent browser-only QA advance; exact-HEAD Core remains valid');
      }
      if (independentDomainTest) {
        console.log('CI_BASE_ADVANCE_REUSED: isolated unrelated domain test advance; preserve exact-HEAD checks');
      }
      if (independentPresentation) {
        approvedPresentationBases.add(liveBaseSha);
        console.log('CI_BASE_ADVANCE_REUSED: independent public presentation advanced; exact-HEAD checks preserved');
      }
      if (inertPublicImages) {
        console.log('CI_BASE_ADVANCE_REUSED: only independent public raster assets advanced; exact-HEAD checks retained');
      }
      if (unrelatedCiMaintenance) {
        console.log('CI_BASE_ADVANCE_REUSED: exact-HEAD checks retained after unrelated protected CI maintenance; no second CI wave');
        if (process.env.GITHUB_STEP_SUMMARY)
          appendFileSync(process.env.GITHUB_STEP_SUMMARY,
            '- CI target advanced by independently proven, disjoint maintenance; reuse original exact-HEAD checks (no rebuild)\n');
      }
      approvedBaseChanges.add(liveBaseSha);
    }
  }
  // Postpone potentially stale protected-BASE authorization until the
  // exact-HEAD macOS Media/MP4 specialist completes. An early BASE_ADVANCED
  // failure triggers the owner auto-sync which CANCELS the still-running Mac
  // job; two such loops struck #5093. Required Core and Specialist outcomes
  // remain mandatory, and the final protected BASE check is unchanged.
  // For non-media / skipped optional macOS runs, fail fast as before.
  let risk=classifyReleaseRisk(changed);
  const readSource=options.readSource ?? ((rev,path)=>execFileSync('git',['show',rev+':'+path],
    {encoding:'utf8',maxBuffer:1_000_000,stdio:['ignore','pipe','pipe']}));
  const sources=(side,path)=>readSource(side === 'base' ? ctx.base : ctx.head,path);
  if (risk === 'FAST' && !scopedCssIsSafe(changedRows,sources)) risk='STRICT';
  if (risk !== 'FAST') {
    let loaded=false, parser;
    const loadTypescript=()=>{
      if (!loaded) { loaded=true; parser=(options.loadTypescript ?? (()=>loadTrustedTypescript(ctx.base)))(); }
      return parser;
    };
    risk=classifyStaticUiText(changedRows,sources,{loadTypescript});
  }
  const packageImpact=classifyPackageImpact({changed,basePackage:files.basePackage,currentPackage:files.currentPackage});
  const baselineExpected=expectedWorkflows({ ...files,changed,packageImpact });
  const routed=resolveExpectedSpecialists({ ...files,changed,expected:baselineExpected });
  const delegated=routed.delegated;
  const replacements=new Set(delegated.map(item=>item.replacement));
  const syntaxWorkflow=WORKFLOW_PREFIX+'hh-actionlint.yml';
  // The protected BASE-owned actionlint workflow must independently validate
  // every modified YAML; never let a PR replace or omit that enforcement.
  const trustedSyntax=pinnedChangeRows && baselineExpected.includes(syntaxWorkflow) &&
    files.base.has(syntaxWorkflow) &&
    trustedAdditiveActionlint(files.base.get(syntaxWorkflow),files.current.get(syntaxWorkflow));
  const concurrencyAdvisory=trustedSyntax ? concurrencyOnlyAdvisory({
    ...files,changedRows,expected:routed.expected,
  }) : new Set();
  for (const replacement of replacements) concurrencyAdvisory.delete(replacement);
  // Only exact one-line PR self-path deletions with a successful independent
  // actionlint proof may stop registering domain jobs on future YAML-only PRs.
  const selfTriggerAdvisory=trustedSyntax ? selfTriggerRemovalAdvisory({
    ...files,changedRows,expected:routed.expected,
  }) : new Set();
  for (const replacement of replacements) selfTriggerAdvisory.delete(replacement);
  const advisoryPaths=new Set(risk === 'FAST' ? [...FAST_ADVISORY_WORKFLOWS].filter(name=>
    files.base.has(name) && files.base.get(name) === files.current.get(name) && !replacements.has(name)) : []);
  // The workflow's protected BASE/HEAD path triggers determine whether it is
  // affected. Fast source contracts cannot replace an affected real browser
  // release workflow, regardless of filename or route classification.
  const mandala = WORKFLOW_PREFIX + 'holistic-support-mandala.yml';
  if (routed.expected.includes(mandala)) advisoryPaths.delete(mandala);
  const expected=routed.expected.filter(name=>!advisoryPaths.has(name) && !concurrencyAdvisory.has(name) && !selfTriggerAdvisory.has(name));
  // A moving production SHA is not itself a failing PR. Wait for required
  // exact-HEAD specialist evidence before considering any base-sync recovery.
  // Earlier BASE_ADVANCED errors cancelled still-running browser/macOS work;
  // extend the existing media safeguard to ALL real specialist owners.
  // No required jobs => check the target immediately. After every real
  // specialist finishes, the existing final protected base gate still runs.
  const deferBaseUntilSpecialists = pinnedChangeRows && expected.length > 0;
  if (!deferBaseUntilSpecialists) await verifyCurrentBase(pr);
  else console.log('CI_BASE_CHECK_DEFERRED: preserve all required exact-HEAD specialists before production-base reconciliation');
  // BASE/HEAD rules enumerate applicable PR specialists. Only completed/pending
  // PR workflow runs proven non-applicable may be advisory. Same-HEAD push
  // failures and orphan/unassociated runs remain fail-closed: there is no
  // trustworthy PR scope evidence to waive them.
  // Keep unknown workflows and failed retired migration workflows fail-closed.
  const catalog = new Set([...files.base.keys(), ...files.current.keys()]);
  const retired = new Set(delegated.map(item => item.retired));
  const workflowPath = item => item.slice(0, item.lastIndexOf(':'));
  const start = now();
  const deadline = start + maxWait;
  const missingDeadline = start + missingGrace;
  // Measure the ten-minute idle-runner grace only while no other required
  // Specialist is genuinely executing. Concurrent real browser/IA work must
  // not turn an unrelated queued sibling into an artificial failed PR.
  // Both scenarios retain the same fixed overall maxWait deadline.
  let queuedWithoutRunningSince = null;
  let state, fastDiagnostics=[];
  let incompleteSince = null;
  // Only the single last running Specialist can use the shorter cadence;
  // bound it to 90 seconds to conserve the shared GitHub read-only API.
  let finalWaveSince = null;
  const recovered = new Map();
  const probeTimes = new Map();
  const refreshTimes = new Map();
  // For PRs without required specialists, retain the bounded freshness
  // check. With active specialists, an early BASE_ADVANCED RED would trigger
  // auto-sync and cancel their exact-HEAD evidence; verify the current target
  // only after these specialist outcomes are terminal.
  const sensitiveFreshnessInterval = 90_000;
  let nextSensitiveFreshnessCheck = start + sensitiveFreshnessInterval;
  for (;;) {
    if (requireCurrentBase && !deferBaseUntilSpecialists && now() >= nextSensitiveFreshnessCheck) {
      // Fresh PR identity/HEAD and production ref; existing exception logic
      // still admits only exhaustively verified, disjoint BASE advances.
      await verifyCurrentBase(await api.pr(ctx.number));
      nextSensitiveFreshnessCheck = now() + sensitiveFreshnessInterval;
    }
    const indexed = await api.runs(ctx.head);
    // Cache only GitHub-returned evidence. A recovered pending workflow must
    // still finish successfully; refresh its immutable ID if the HEAD index lags.
    if (typeof api.runById === 'function') {
      const indexedIds = new Set(indexed.map(row => row.id));
      for (const [filename, row] of recovered) {
        if (indexedIds.has(row.id)) { recovered.delete(filename); continue; }
        if (row.status === 'completed') continue;
        if (now() - (refreshTimes.get(filename) ?? -Infinity) < 60_000) continue;
        recovered.set(filename, await api.runById(row.id));
        refreshTimes.set(filename, now());
      }
    }
    const allRuns=[...indexed,...recovered.values()];
    fastDiagnostics=allRuns.filter(run=>advisoryPaths.has(String(run.path || '').split('@')[0]) &&
      (run.status !== 'completed' || run.conclusion !== 'success')).map(run=>String(run.path).split('@')[0]+':'+(run.conclusion || run.status || 'unknown'));
    const eligibleRuns = rows => rows.filter(run =>
      !advisoryPaths.has(String(run.path || '').split('@')[0]) &&
      !isConcurrencyAdvisoryRun(run,pr,concurrencyAdvisory) &&
      !isConcurrencyAdvisoryRun(run,pr,selfTriggerAdvisory));
    state=inspectWorkflowRuns({expected,runs:eligibleRuns(allRuns),pr});
    // Probe the one missing workflow EARLY, then retry its authenticated
    // exact-HEAD index. The old code first probed at its own missing deadline
    // and immediately failed if GitHub indexing lagged: no chance to recover.
    if (state.missing.length && now() - start >= Math.min(missingGrace, 20_000) &&
        typeof api.runsForWorkflow === 'function') {
      for (const filename of state.missing) {
        // At most one lookup per missing workflow every 30 seconds, for
        // a bounded 2-minute discovery window; no full Core rerun.
        if (now() - (probeTimes.get(filename) ?? -Infinity) < 30_000) continue;
        const rows = await api.runsForWorkflow(ctx.head, filename);
        if (!Array.isArray(rows) || rows.length > 100)
          throw Error('INCOMPLETE_WORKFLOW_FALLBACK');
        // The BASE-owned verifier proves exact HEAD, branch, repository and
        // PR association. A source-less or unrelated run cannot be recovered.
        const proof = inspectWorkflowRuns({expected:[filename],runs:rows,pr});
        if (!proof.missing.length) {
          const candidates = rows.filter(run =>
            run.head_sha === ctx.head &&
            String(run.path || '').split('@')[0] === filename &&
            run.event === 'pull_request' &&
            run.head_branch === pr.head.ref &&
            run.head_repository?.full_name === pr.base.repo.full_name &&
            Array.isArray(run.pull_requests) && run.pull_requests.some(item =>
              item.number === pr.number && item.base?.ref === TARGET));
          if (candidates.length) {
            const latest = candidates.sort((left,right) =>
              right.id - left.id || Number(right.run_attempt||1)-Number(left.run_attempt||1))[0];
            recovered.set(filename,latest);
          }
        }
        probeTimes.set(filename,now());
      }
      state=inspectWorkflowRuns({expected,runs:eligibleRuns([...indexed,...recovered.values()]),pr});
    }
    const unregistered = state.observedUnrelated.filter(item => !catalog.has(workflowPath(item)));
    const retiredProblems = state.observedUnrelated.filter(item => retired.has(workflowPath(item)));
    const unexpected = [...new Set([...unregistered, ...retiredProblems])];
    const withConclusion = endings => unexpected.filter(item =>
      endings.some(conclusion => item.endsWith(':' + conclusion)));
    const unexpectedFailures = withConclusion(['failure']);
    const unexpectedCancelled = withConclusion(['cancelled']);
    const unexpectedInterrupted = withConclusion(['timed_out', 'startup_failure']);
    const unexpectedNotExecuted = withConclusion(['skipped', 'neutral', 'action_required']);
    const known = new Set([...unexpectedFailures, ...unexpectedCancelled,
      ...unexpectedInterrupted, ...unexpectedNotExecuted]);
    const unexpectedIncomplete = unexpected.filter(item => !known.has(item));
    // Only an actual terminal failure is a failed source check. Cancelled,
    // infrastructure-interrupted and skipped dependencies also block release,
    // but must never create a false source-repair task.
    if (state.failed.length || state.orphanFailures.length || unexpectedFailures.length) {
      throw Error('SPECIALIST_FAILED:' + JSON.stringify({
        failed:state.failed, orphan:state.orphanFailures,
        unregistered:unregistered.filter(item => unexpectedFailures.includes(item)),
        retired:retiredProblems.filter(item => unexpectedFailures.includes(item)),
      }));
    }
    if (state.cancelled.length || state.orphanCancelled.length || unexpectedCancelled.length) {
      throw Error('SPECIALIST_DEPENDENCY_CANCELLED:' + JSON.stringify({
        cancelled:state.cancelled, orphan:state.orphanCancelled, unexpected:unexpectedCancelled,
      }));
    }
    if (state.interrupted.length || state.orphanInterrupted.length || unexpectedInterrupted.length) {
      throw Error('SPECIALIST_DEPENDENCY_INTERRUPTED:' + JSON.stringify({
        interrupted:state.interrupted, orphan:state.orphanInterrupted, unexpected:unexpectedInterrupted,
      }));
    }
    if (state.notExecuted.length || state.orphanNotExecuted.length || unexpectedNotExecuted.length) {
      throw Error('SPECIALIST_DEPENDENCY_NOT_EXECUTED:' + JSON.stringify({
        notExecuted:state.notExecuted, orphan:state.orphanNotExecuted, unexpected:unexpectedNotExecuted,
      }));
    }
    const incomplete = [...state.uncertain, ...state.orphanIncomplete, ...unexpectedIncomplete];
    if (incomplete.length) {
      if (incompleteSince === null) incompleteSince = now();
      const remaining = Math.min(deadline - now(), 30_000 - (now() - incompleteSince));
      if (remaining <= 0) {
        throw Error('SPECIALIST_DEPENDENCY_INCOMPLETE:' + JSON.stringify({incomplete}));
      }
      // GitHub sometimes publishes completed without its terminal conclusion
      // for one index read. Recheck briefly, never call it a source failure.
      await sleep(Math.max(1, Math.min(5_000, pollMs, remaining)));
      continue;
    }
    incompleteSince = null;
    if (!state.missing.length && !state.pending.length) break;
    // GitHub may take a few seconds to register a newly triggered workflow.
    // After the short discovery grace, absence is a configuration/dispatch
    // failure, NOT a 35-minute running test. Never waive an expected workflow.
    const timestamp = now();
    const missingStateDeadline = state.pending.length
      ? start + correlatedMissingGrace : missingDeadline;
    if (state.missing.length && timestamp >= missingStateDeadline) {
      throw Error('SPECIALIST_MISSING_OR_PENDING:NOT_TRIGGERED:' +
        JSON.stringify({missing:state.missing,pending:state.pending}));
    }
    // A registered but queued/requested/waiting workflow is not an executing
    // test. Give the GitHub runner queue a separate bounded startup window.
    const notStarted = state.queued;
    // A queued action is not a failure while another *actual* required run
    // occupies a runner. Allow the bounded solo queue budget after that run
    // completes; reset on a new in-progress sibling, but never extend maxWait.
    // GitHub's immutable exact-HEAD run evidence still must finish green.
    if (!notStarted.length || state.running.length) queuedWithoutRunningSince = null;
    else if (queuedWithoutRunningSince === null) queuedWithoutRunningSince = timestamp;
    const queuedDeadline = queuedWithoutRunningSince === null
      ? Infinity : Math.min(deadline, queuedWithoutRunningSince + queuedGrace);
    if (notStarted.length && timestamp >= queuedDeadline) {
      throw Error('SPECIALIST_MISSING_OR_PENDING:NOT_STARTED:' +
        JSON.stringify({queued:notStarted,running:state.running}));
    }
    if (timestamp >= deadline) {
      throw Error('SPECIALIST_MISSING_OR_PENDING:RUNNING_TIMEOUT:' +
        JSON.stringify({running:state.running,queued:state.queued}));
    }
    const nextDeadline = Math.min(deadline,
      state.missing.length ? missingStateDeadline : Infinity,
      notStarted.length ? queuedDeadline : Infinity);
    // When one real running job remains after siblings have passed,
    // a bounded fast poll avoids a redundant 30-second post-green gap.
    // Missing, queued, cancelled and multi-running dependencies keep
    // the original low-API cadence; there is no synthetic success.
    const finalRunning = state.missing.length === 0 &&
      state.queued.length === 0 && state.running.length === 1 &&
      state.pending.length === 1 && state.passed.length > 0;
    if (!finalRunning) finalWaveSince = null;
    else if (finalWaveSince === null) finalWaveSince = timestamp;
    const finalFast = finalWaveSince !== null &&
      timestamp - finalWaveSince < 90_000;
    const interval = state.missing.length && !state.pending.length
      ? Math.min(pollMs, 10_000)
      : finalFast ? Math.min(pollMs, 10_000) : pollMs;
    await sleep(Math.max(1, Math.min(interval, nextDeadline - timestamp)));
  }
  const executed=[];
  for (const run of state.passed) {
    const requiredJobs = pinnedChangeRows ? trustedRequiredJobs(files.base.get(run.path)) : [];
    const jobDeadline = Math.min(deadline, now() + jobGrace);
    let jobs;
    for (;;) {
      jobs = await api.jobs(run.id);
      const missing = requiredJobs.filter(name => !jobs.some(job => job.name === name));
      const pending = jobs.filter(job => job.status !== 'completed');
      if (now() >= jobDeadline || (jobs.length && !missing.length && !pending.length)) break;
      // No workflow dispatch or retry; keep independent green runs untouched.
      await sleep(Math.max(1, Math.min(pollMs, 5_000, jobDeadline - now())));
    }
    // GitHub's jobs endpoint may lag a completed workflow. After the bounded
    // grace, a still-running job is incomplete evidence, not a failed test.
    const pendingJobs = jobs.filter(job => job.status !== 'completed');
    if (pendingJobs.length) {
      throw Error('SPECIALIST_DEPENDENCY_JOB_PENDING_TIMEOUT:' + JSON.stringify({
        pending:pendingJobs.map(job => run.path + ':' + job.name + ':' + (job.status || 'unknown')),
      }));
    }
    const cancelledJobs = jobs.filter(job => job.conclusion === 'cancelled');
    if (cancelledJobs.length) {
      throw Error('SPECIALIST_DEPENDENCY_JOB_CANCELLED:' + JSON.stringify({
        cancelled:cancelledJobs.map(job => run.path + ':' + job.name),
      }));
    }
    // Branch-conditional macOS is excluded from generic optional jobs.
    // Admit it separately only if the immutable BASE macOS job and source
    // scope prove this exact non-voice branch cannot execute it.
    const optionalSkipped = [...new Set([
      ...trustedConditionalJobs(files.base.get(run.path), pr.head.ref),
      ...trustedConditionallyInapplicableJobs(files.base.get(run.path), files.current.get(run.path), pr),
    ])].filter(job => job !== 'voice-webkit-macos');
    if (run.path === '.github/workflows/holistic-support-mandala.yml' &&
        optionalMandalaMacosSkip(files, pr.head.ref, changed)) {
      optionalSkipped.push('voice-webkit-macos');
    }
    if (run.path === '.github/workflows/hh-profile-axis-matching.yml' &&
        optionalProfileWriterSkip(files, pr.head.ref)) {
      // Fail closed on missing, failed, or skipped primary axis verification.
      if (!jobs.some(job => job.name === 'axis-unit-types-build' &&
          job.status === 'completed' && job.conclusion === 'success')) {
        throw Error('NO_EXECUTED_REQUIRED_SPECIALIST_JOB:' + run.path);
      }
      optionalSkipped.push('writer-practical-focused');
    }
    executed.push({name:run.path,run_id:run.id,jobs:inspectJobs(jobs,run.path,optionalSkipped,requiredJobs)});
  }
  const fresh=await api.pr(ctx.number);
  await verifyCurrentBase(fresh);
  // Report non-gating runs for audit; never confuse them with validated CI.
  const advisory={
    nonApplicable:[...state.observedUnrelated.filter(item => !retired.has(workflowPath(item))),
      ...state.pushAdvisory.map(item => 'unassociated-push:'+item),
      ...state.orphanFailures.map(item => 'orphan:'+item),...fastDiagnostics],
    concurrencyOnly:[...concurrencyAdvisory].sort(),
    selfTriggerOnly:[...selfTriggerAdvisory].sort(),
  };
  return {risk,expected,delegated,executed,advisory,packageImpact,head:ctx.head,base:ctx.base};
}

// Reuse the successful Core and domain jobs for CI-policy-only production
// advances. A new trusted validator must re-check all required run evidence;
// the OLD validator cannot certify that its own replacement is compatible.
// This path never executes candidate PR code or changes a branch/status.
const TRUSTED_VALIDATOR_FILES = Object.freeze([
  'scripts/ci-specialist-aggregate.mjs',
  'lib/ci/specialist-aggregate.mjs',
  'lib/ci/fast-static-ui-text.mjs',
  'lib/ci/production-base-impact.mjs',
  'lib/ci/merge-check-light.mjs',
]);
function loadProtectedValidator(liveSha) {
  const dir = mkdtempSync(join(tmpdir(), 'hh-specialist-policy-recheck-'));
  try {
    execFileSync('git', ['fetch', '--quiet', '--no-tags', '--depth=1', 'origin', liveSha],
      {timeout: 90_000, maxBuffer: 1_000_000, stdio: ['ignore','pipe','pipe']});
    for (const path of TRUSTED_VALIDATOR_FILES) {
      const content = execFileSync('git', ['show', liveSha + ':' + path],
        {encoding:'utf8', maxBuffer: 2_000_000, stdio:['ignore','pipe','pipe']});
      const destination = join(dir, path);
      mkdirSync(join(destination, '..'), {recursive:true});
      writeFileSync(destination, content, {mode:0o600});
    }
    return {
      path: join(dir, 'scripts/ci-specialist-aggregate.mjs'),
      impactPath: join(dir, 'lib/ci/production-base-impact.mjs'),
      cleanup: () => rmSync(dir, {recursive:true, force:true}),
    };
  } catch (error) {
    rmSync(dir, {recursive:true, force:true});
    throw error;
  }
}

export async function revalidateAfterTrustedPolicyAdvance(api, ctx, files, options={}) {
  const blocked = () => Error('PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED');
  const changed = files.changedRows?.flatMap(row => row.previous_filename
    ? [row.filename, row.previous_filename] : [row.filename]);
  if (!Array.isArray(changed) || !changed.length ||
      changed.some(path => typeof path !== 'string')) throw blocked();

  // Always execute policy code from the CURRENT protected production commit,
  // never the PR source or an untrusted checkpoint. The old immutable policy
  // can fail to understand a mixed target advance approved by a newer reviewed
  // policy. Loading the new policy is permitted ONLY if GitHub Compare proves
  // at least one exact trusted CI validator/test path changed; loading is NOT
  // permission to PASS. The latest policy must independently approve ALL rows.
  const loader = options.loadPolicy ?? (async sha => {
    const extracted = loadProtectedValidator(sha);
    try {
      const [policyModule, impact] = await Promise.all([
        import(pathToFileURL(extracted.path).href),
        import(pathToFileURL(extracted.impactPath).href),
      ]);
      return {verify:policyModule.verify,
        safeTrustedPolicyAdvance:impact.safeTrustedPolicyAdvance,
        cleanup:extracted.cleanup};
    } catch (error) { extracted.cleanup(); throw error; }
  });
  const policyFiles = new Set(REVALIDATABLE_CI_POLICY_FILES);
  for (let attempt = 0; attempt < 4; attempt++) {
    const target = await api.target();
    if (!/^[0-9a-f]{40}$/.test(target || '')) throw blocked();
    const diff = await api.compare(ctx.base, target);
    const oldPolicyAccepts = safeTrustedPolicyAdvance(diff, ctx.base, target, changed);
    const possibleNewPolicy = Array.isArray(diff?.files) && diff.files.some(row =>
      policyFiles.has(row?.filename) && !changed.includes(row.filename) &&
      ['added','modified'].includes(row.status) && !row.previous_filename);
    if (!oldPolicyAccepts && !possibleNewPolicy) throw blocked();

    // Do not fetch a stale validator if another protected merge already won.
    if (await api.target() !== target) {
      console.log('CI_BASE_ADVANCE_RETRY: target changed before protected policy load');
      continue;
    }
    const policy = await loader(target);
    try {
      if (typeof policy?.verify !== 'function')
        throw Error('TRUSTED_SPECIALIST_POLICY_NOT_EXECUTABLE');
      const currentImpact = typeof policy.safeTrustedPolicyAdvance === 'function'
        ? policy.safeTrustedPolicyAdvance : safeTrustedPolicyAdvance;
      if (!currentImpact(diff, ctx.base, target, changed)) throw blocked();

      // Target can move while the new validator reviews successful workflows.
      // Retry only this read-only policy check on a different verified SHA;
      // never rerun green Core, create commits or waive actual failing jobs.
      if (await api.target() !== target) {
        console.log('CI_BASE_ADVANCE_RETRY: target changed before evidence recheck');
        continue;
      }
      let result;
      try {
        result = await policy.verify(api, ctx, files,
          {trustedPolicyBaseSha:target});
      } catch (error) {
        if (String(error?.message || error).includes(
              'PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED') &&
            await api.target() !== target) {
          console.log('CI_BASE_ADVANCE_RETRY: protected target moved during evidence recheck');
          continue;
        }
        throw error; // real HEAD conflict, incomplete/failed job or API denial
      }
      if (await api.target() !== target) {
        console.log('CI_BASE_ADVANCE_RETRY: protected target moved after successful recheck');
        continue;
      }
      return {...result, policyRevalidatedAgainst:target,
        policyRevalidationAttempts:attempt+1};
    } finally {
      if (typeof policy?.cleanup === 'function') policy.cleanup();
    }
  }
  // Never certify a perpetually moving or unproven target as green.
  throw blocked();
}

// Normalize observable symptoms across PRs without claiming identical root causes.
// Actual code failures require comparison of the exact-HEAD job logs before repair.
export function diagnoseAggregateError(error) {
  const message = String(error?.message || error || 'unknown');
  const rules = [
    ['PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED','BASE_ADVANCED','Inspect actual overlap, critical/shared changes or incomplete ancestry proof before requesting a new CI wave. Ordinary verified non-overlapping production advances do not require rebasing.'],
    ['PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PR_HEAD_CHANGED','HEAD_ADVANCED','Discard stale results and run checks on the new PR HEAD.'],
    ['PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:MERGE_CONFLICT','MERGE_CONFLICT','Resolve the real merge conflict; do not bypass the gate.'],
    ['PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PR_DRAFT','DRAFT_PR','Mark Ready only after the implementation is complete.'],
    ['PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED','PR_STATE_INVALID','Inspect the precise PR state/repository/target reason.'],
    ['SPECIALIST_MISSING_OR_PENDING:NOT_TRIGGERED','WORKFLOW_NOT_TRIGGERED','Fix scoped dispatch or use the guarded recovery path; never mark missing CI successful.'],
    ['SPECIALIST_MISSING_OR_PENDING:NOT_STARTED','RUNNER_QUEUE','Keep merge blocked. After every named queued exact-HEAD workflow finishes successfully, retry only the failed hh-specialist job once (by job ID), never re-run green Core or the whole workflow.'],
    ['SPECIALIST_MISSING_OR_PENDING:RUNNING_TIMEOUT','CHECK_TIMEOUT','Inspect the running job and optimize its actual bottleneck.'],
    ['SPECIALIST_DEPENDENCY_CANCELLED:','DEPENDENCY_CANCELLED','A cancelled exact-HEAD dependency did not run successfully. Check current HEAD and rerun only the affected check when safe; do not open a source repair task.'],
    ['SPECIALIST_DEPENDENCY_INTERRUPTED:','DEPENDENCY_INTERRUPTED','Inspect timed-out/startup-failed infrastructure or job duration; do not presume application test failure.'],
    ['SPECIALIST_DEPENDENCY_NOT_EXECUTED:','DEPENDENCY_NOT_EXECUTED','Inspect skipped/neutral/approval-required dispatch; required CI remains blocked.'],
    ['SPECIALIST_DEPENDENCY_INCOMPLETE:','DEPENDENCY_INCOMPLETE','GitHub provided an incomplete/unknown terminal state; inspect the exact run and recover valid evidence.'],
    ['SPECIALIST_DEPENDENCY_JOB_PENDING_TIMEOUT:','DEPENDENCY_JOB_PENDING','The jobs API still reports unfinished jobs after its bounded consistency grace.'],
    ['SPECIALIST_DEPENDENCY_JOB_CANCELLED:','DEPENDENCY_JOB_CANCELLED','Inspect the cancelled required job; rerun only verified interrupted work on current HEAD.'],
    ['SPECIALIST_FAILED:','SPECIALIST_FAILED','Compare exact-HEAD logs across affected PRs; fix confirmed common code roots once.'],
    ['ZERO_JOB_WORKFLOW:','WORKFLOW_JOBLESS','Check runner/workflow dispatch; safely rerun a confirmed interrupted run once.'],
    ['MISSING_REQUIRED_SPECIALIST_JOB:','REQUIRED_JOB_MISSING','Check the immutable BASE job contract and exact-HEAD evidence, not independent green workflows.'],
    ['NO_EXECUTED_REQUIRED_SPECIALIST_JOB:','REQUIRED_JOB_NOT_EXECUTED','Inspect the required job dispatch, not unrelated green jobs.'],
    ['UNSUCCESSFUL_SPECIALIST_JOB:','SPECIALIST_JOB_FAILED','Inspect the named failing job; never treat a skipped or failed job as green.'],
    ['UNVERIFIED_MERGE_CHECKOUT','CHECKOUT_UNVERIFIED','Rebuild a verified exact-HEAD/exact-BASE merge checkout.'],
    ['GitHub read ','GITHUB_API_READ_FAILED','Check API availability and permissions and quota; never repeat exhausted 403 requests.'],
  ];
  const found = rules.find(([prefix]) => message.startsWith(prefix));
  const category = found?.[1] || 'CI_UNKNOWN_FAILURE';
  const action = found?.[2] || 'Inspect the exact failure; do not auto-waive a required check.';
  let payload = {};
  const jsonStart = message.indexOf('{');
  if (jsonStart >= 0) {
    try { payload = JSON.parse(message.slice(jsonStart)); } catch { /* preserve fail-closed status */ }
  }
  const symptoms = [];
  const add = (type, raw) => {
    const path = String(raw).split(':')[0];
    if (/^\.github\/workflows\/[a-z0-9._-]+\.ya?ml$/i.test(path)) {
      symptoms.push(type + '/' + path);
    }
  };
  if (category === 'SPECIALIST_FAILED') {
    for (const field of ['failed','retired','unregistered','push','orphan']) {
      for (const item of Array.isArray(payload[field]) ? payload[field] : []) add(field,item);
    }
  }
  if (['WORKFLOW_NOT_TRIGGERED','RUNNER_QUEUE','CHECK_TIMEOUT','DEPENDENCY_CANCELLED',
    'DEPENDENCY_INTERRUPTED','DEPENDENCY_NOT_EXECUTED','DEPENDENCY_INCOMPLETE',
    'DEPENDENCY_JOB_PENDING','DEPENDENCY_JOB_CANCELLED'].includes(category)) {
    for (const field of ['missing','pending','queued','running','cancelled',
      'interrupted','notExecuted','incomplete','unexpected','orphan']) {
      for (const item of Array.isArray(payload[field]) ? payload[field] : []) add(field,item);
    }
  }
  if (['WORKFLOW_JOBLESS','SPECIALIST_JOB_FAILED','REQUIRED_JOB_MISSING','REQUIRED_JOB_NOT_EXECUTED'].includes(category)) {
    add('job',message.split(':')[1] || '');
  }
  // Shared SYMPTOM keys are a triage aid, not proof that the code root is shared.
  return {category,action,symptomKeys:[...new Set(symptoms)].sort().slice(0,30)};
}

async function main() {
  const env=process.env;
  if (env.GITHUB_EVENT_NAME !== 'pull_request') throw Error('ONLY_PULL_REQUEST_EVENT');
  const ctx=validateParameters(env);
  const api=githubReader(ctx.repo,ctx.token);
  const verifiedBase = verifiedCheckoutBase(env, ctx);
  const testedBase = verifiedBase || ctx.base;
  const files=worktreeSources(testedBase);
  if (verifiedBase) files.changedRows=checkoutChangedRows(verifiedBase);
  // The verified merge parent is always the trusted tested BASE. Only
  // non-sensitive ordinary paths permit a newer live production BASE; security,
  // payment, privacy, auth, policy and unknown paths still require freshness.
  const checkedCtx={...ctx,base:testedBase};
  let result;
  try {
    result=await verify(api,checkedCtx,files);
  } catch (error) {
    // A changed production CI *policy* cannot be ignored by the old policy.
    // Re-execute the new trusted policy against the same exact-HEAD evidence,
    // but ONLY when the production delta is confined to the approved CI files.
    if (!String(error?.message || error).includes(
      'PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED')) throw error;
    result=await revalidateAfterTrustedPolicyAdvance(api,checkedCtx,files);
  }
  const report='Specialist CI aggregate for PR #' + ctx.number + ' head=' + ctx.head +
    ' event_base=' + ctx.base + ' tested_base=' + testedBase + '\nRisk: ' + result.risk + '\nVerified applicable workflows: ' + result.expected.length +
    '\n' + result.executed.map(x=>'- ' + x.name + ' (' + x.jobs + ' executed jobs; run ' + x.run_id + ')').join('\n') +
    '\nTrusted replacements: ' + result.delegated.map(x=>x.retired + ' => ' + x.replacement).join(', ') +
    '\nPackage impact: ' + result.packageImpact.mode + ' (' + result.packageImpact.reason + ')' +
    '\nTrusted policy revalidated: ' + (result.policyRevalidatedAgainst || 'not required') +
    '\nNon-gating CI advisory: ' + JSON.stringify(result.advisory).slice(0,2000);
  console.log(report);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY,report+'\n');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  main().catch(error=>{
    const diagnosis = diagnoseAggregateError(error);
    const detail = String(error?.message || error).slice(0,1200);
    const escaped = (diagnosis.category + ': ' + detail).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
    console.error('::error title=HH CI ' + diagnosis.category + '::' + escaped);
    console.error('CI_SPECIALIST_FAIL_CLOSED: ' + detail);
    const report = ['## HH CI blocker diagnosis', '',
      '- Category: \`' + diagnosis.category + '\`',
      '- Next action: ' + diagnosis.action,
      '- Shared symptom keys (NOT verified common root causes): ' +
        (diagnosis.symptomKeys.length ? diagnosis.symptomKeys.map(x=>'\`'+x+'\`').join(', ') : 'none'),
      '- Check exact-head job logs before combining repairs.', ''].join('\n');
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
    process.exitCode=1;
  });
}
