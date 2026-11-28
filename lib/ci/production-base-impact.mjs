// A deliberately narrow, evidence-based exception for non-runtime production
// changes. Never infer safety from disjoint file names alone: code and config
// may share runtime dependencies even without direct path overlap.
const SHA = /^[0-9a-f]{40}$/i;
const RUNTIME_POLICY = /(?:^|[\/._-])(?:operations|policy|policies|release|deployment|ci|workflow|security|privacy|private|token|client|crm|message|medical|health|audio|voice|recording|codec|encoder|export|license|auth|consent|secret|credential|payment|billing|rls|database|migration|supabase|api)(?:$|[\/._-])/i;

// This is not a blanket CI bypass. A trusted production-only change to the
// read-only Specialist validator can be re-evaluated against the new policy
// without rebuilding unchanged application sources. Workflow YAML, package
// manifests, runtime code, security policy, and any unknown path stay blocked.
export const REVALIDATABLE_CI_POLICY_FILES = Object.freeze([
  'scripts/ci-specialist-aggregate.mjs',
  'lib/ci/specialist-aggregate.mjs',
  'lib/ci/production-base-impact.mjs',
  'lib/ci/fast-static-ui-text.mjs',
  'tests/ci-specialist-aggregate.test.mjs',
  'tests/ci-specialist-wait.test.mjs',
  'tests/ci-fast-static-ui-text.test.mjs',
]);
export function safeTrustedPolicyAdvance(compare, testedBase, liveBase, prPaths = []) {
  if (!SHA.test(testedBase || '') || !SHA.test(liveBase || '') ||
      testedBase === liveBase || !compare || compare.status !== 'ahead' ||
      compare.base_commit?.sha !== testedBase || compare.merge_base_commit?.sha !== testedBase ||
      compare.behind_by !== 0 || !Number.isInteger(compare.ahead_by) ||
      compare.ahead_by < 1 || compare.ahead_by > 99 ||
      compare.total_commits !== compare.ahead_by ||
      !Array.isArray(compare.commits) || compare.commits.length !== compare.ahead_by ||
      compare.commits.at(-1)?.sha !== liveBase ||
      !Array.isArray(compare.files) || compare.files.length === 0 ||
      compare.files.length >= 100 || !Array.isArray(prPaths) ||
      prPaths.some(path => typeof path !== 'string')) return false;
  const approved = new Set(REVALIDATABLE_CI_POLICY_FILES);
  // Production can advance twice while a specialist runs: e.g. a separate
  // public Services change followed by an isolated validator-only patch.
  // Check ALL non-policy files together using the CURRENT protected mixed
  // delta classifier; isolated per-row allowlists may miss a valid mixture.
  // A workflow, shared dependency, sensitive source, same-domain change,
  // or any overlap still fails inside the protected helper.
  const nonPolicyRows = compare.files.filter(row => !approved.has(row?.filename));
  const mixedIndependent = nonPolicyRows.length > 0 &&
    safeMixedProtectedAdvance({...compare,files:nonPolicyRows},
      testedBase,liveBase,prPaths);
  const prChanged = new Set(prPaths), seen = new Set();
  let trustedPolicyChanged = 0;
  for (const file of compare.files) {
    const path = file?.filename;
    // A complete ancestry proof is necessary, but repeated/renamed/deleted,
    // overlapping or unknown target file rows can never reuse green checks.
    if (typeof path !== 'string' || !path || seen.has(path) || prChanged.has(path) ||
        (file.status !== 'modified' && file.status !== 'added') ||
        file.previous_filename || path.split('/').some(x => !x || x === '.' || x === '..')) return false;
    seen.add(path);
    if (approved.has(path)) { trustedPolicyChanged++; continue; }

    // Several protected merges may have advanced production while this PR's
    // specialists ran: latest policy + independent product/photos/docs.
    // Validate EVERY such file with its original full-history SHA/commit proof,
    // under the NEW protected validator. No union-of-allowlists shortcuts:
    // each path must pass one existing, risk-scoped independent impact policy.
    const isolated = { ...compare, files: [file] };
    if (!safeDisjointPublicSourceAdvance(isolated, testedBase, liveBase, prPaths) &&
        !safeIndependentPublicPresentationAdvance(isolated, testedBase, liveBase, prPaths) &&
        !verifiedIndependentPublicRasterAdvance(isolated, testedBase, liveBase, prPaths) &&
        !safeDocumentationAdvance(isolated, testedBase, liveBase, prPaths) &&
        !safeIndependentCiMaintenanceAdvance(isolated, testedBase, liveBase, prPaths) &&
        !safeIndependentQaAdvance(isolated, testedBase, liveBase, prPaths) &&
        !safeIndependentDomainTestAdvance(isolated, testedBase, liveBase, prPaths) &&
        !mixedIndependent) return false;
  }
  // No "latest policy" revalidation without an actual protected policy delta.
  // Mixed source still requires fresh exact-HEAD Core/real specialist evidence.
  return trustedPolicyChanged > 0;
}

export function safeDocumentationAdvance(compare, testedBase, liveBase, prPaths = []) {
  if (!SHA.test(testedBase || '') || !SHA.test(liveBase || '') ||
      testedBase === liveBase || !compare || compare.status !== 'ahead' ||
      compare.base_commit?.sha !== testedBase ||
      compare.merge_base_commit?.sha !== testedBase ||
      compare.behind_by !== 0 ||
      !Number.isInteger(compare.ahead_by) || compare.ahead_by < 1 || compare.ahead_by > 99 ||
      compare.total_commits !== compare.ahead_by ||
      !Array.isArray(compare.commits) || compare.commits.length !== compare.ahead_by ||
      compare.commits.at(-1)?.sha !== liveBase ||
      !Array.isArray(compare.files) || compare.files.length === 0 ||
      compare.files.length >= 100 || !Array.isArray(prPaths)) return false;
  const touched = new Set(prPaths);
  return compare.files.every(file => {
    const path = file?.filename;
    if (!path || typeof path !== 'string' || touched.has(path) ||
        !['added','modified'].includes(file.status) ||
        !/^docs\/.+\.md$/i.test(path) ||
        path.split('/').some(part => !part || part === '.' || part === '..') ||
        RUNTIME_POLICY.test(path)) return false;
    return true;
  });
}

// Reuse an already successful CI-validator unit/core result only when the PR
// changes isolated, read-only CI code and the independently reviewed production
// advance is limited to public media-editor sources. This is NOT a generic
// "disjoint filenames" exception for auth, payment, workflow or runtime PRs.
// The protected branch must be a fully proven, bounded descendant; no missing,
// renamed, deleted, ambiguous or truncated compare page can authorize a merge.
const ISOLATED_CI_CANDIDATE_FILES = new Set([
  'scripts/ci-specialist-aggregate.mjs',
  'lib/ci/specialist-aggregate.mjs',
  'lib/ci/production-base-impact.mjs',
  'tests/ci-specialist-aggregate.test.mjs',
  'tests/ci-specialist-wait.test.mjs',
]);
const PUBLIC_MEDIA_ONLY = /^(?:components\/mandala-[a-z0-9._/-]+\.(?:tsx|jsx|css)|lib\/mandala\/[a-z0-9._/-]+\.(?:mjs|js|ts|tsx)|tests\/(?:mandala-|video-|free-film-)[a-z0-9._/-]+\.test\.mjs|docs\/[a-z0-9._-]+\.md)$/i;
export function safeIndependentPublicMediaAdvance(compare, testedBase, liveBase, prPaths = []) {
  if (!SHA.test(testedBase || '') || !SHA.test(liveBase || '') ||
      testedBase === liveBase || !compare || compare.status !== 'ahead' ||
      compare.base_commit?.sha !== testedBase ||
      compare.merge_base_commit?.sha !== testedBase ||
      compare.behind_by !== 0 ||
      !Number.isInteger(compare.ahead_by) || compare.ahead_by < 1 ||
      compare.ahead_by > 20 || compare.total_commits !== compare.ahead_by ||
      !Array.isArray(compare.commits) || compare.commits.length !== compare.ahead_by ||
      compare.commits.at(-1)?.sha !== liveBase ||
      !Array.isArray(compare.files) || compare.files.length < 1 ||
      compare.files.length >= 50 ||
      !Array.isArray(prPaths) || prPaths.length < 1 ||
      prPaths.length > ISOLATED_CI_CANDIDATE_FILES.size ||
      new Set(prPaths).size !== prPaths.length ||
      !prPaths.every(path => ISOLATED_CI_CANDIDATE_FILES.has(path))) return false;
  const changed = new Set(prPaths);
  return compare.files.every(row =>
    typeof row?.filename === 'string' &&
    !changed.has(row.filename) &&
    (row.status === 'modified' || row.status === 'added') &&
    !row.previous_filename &&
    !row.filename.split('/').some(part => !part || part === '.' || part === '..') &&
    PUBLIC_MEDIA_ONLY.test(row.filename) &&
    !RUNTIME_POLICY.test(row.filename));
}
// Reuse already successful exact-HEAD Core + Specialist evidence after a
// DIFFERENT PR merges a fully proven, independent CI-maintenance change.
// Normal code, required release policy/Guard/actionlint/Specialist definitions,
// dependency manifests and auth/payment/consent changes never qualify. This
// is intentionally narrower than a generic disjoint-path or loose-base pass.
const NON_RUNTIME_CI_MAINTENANCE = new Set([
  '.github/workflows/hh-ci-stale-run-prune.yml',
  'README.PR-LOSS-TELEMETRY.md',
  'lib/ci/pr-loss-metrics.mjs',
  // Read-only per-Core-wave attribution (#3753); no security, workflow or runtime changes.
  'lib/ci/pr-wave-attribution.mjs',
  'scripts/ci-pr-loss-report.mjs',
  'scripts/ci-pr-repair-start.mjs',
  'scripts/ci-prune-stale-runs.mjs',
  'tests/ci-pr-loss-metrics.test.mjs',
  'tests/ci-pr-repair-start.test.mjs',
  'tests/ci-prune-stale-runs.test.mjs',
  'tests/pr-fast-lane.test.mjs',
  'tests/ci-pr-selective-workflows.test.mjs',
]);
// One-time optional-owner migration has already finished its real specialist
// checks. The exact retired marker can be removed without changing ANY job,
// permission, source-owner path, check name or dispatch of real product edits.
const RETIRED_OPTIONAL_MARKER = "-      - 'docs/operations/CI_OWNER_ROUTE_MIGRATION_20261104.md'";
const OPTIONAL_WORKFLOW_YAML = /^\.github\/workflows\/[a-z0-9._-]+\.ya?ml$/i;
export function safeIndependentCiMaintenanceAdvance(compare, testedBase, liveBase, candidatePaths = []) {
  if (!SHA.test(testedBase || '') || !SHA.test(liveBase || '') ||
      testedBase === liveBase || !compare || compare.status !== 'ahead' ||
      compare.base_commit?.sha !== testedBase ||
      compare.merge_base_commit?.sha !== testedBase ||
      compare.behind_by !== 0 ||
      !Number.isInteger(compare.ahead_by) || compare.ahead_by < 1 || compare.ahead_by > 50 ||
      compare.total_commits !== compare.ahead_by ||
      !Array.isArray(compare.commits) || compare.commits.length !== compare.ahead_by ||
      compare.commits.at(-1)?.sha !== liveBase ||
      !Array.isArray(compare.files) || compare.files.length < 1 ||
      compare.files.length >= 100 ||
      !Array.isArray(candidatePaths) || !candidatePaths.length ||
      candidatePaths.some(path => typeof path !== 'string' ||
        !path || path.split('/').some(s => !s || s === '.' || s === '..'))) return false;
  const affected = new Set(candidatePaths), seen = new Set();
  return compare.files.every(row => {
    const path = row?.filename;
    if (typeof path !== 'string' || !path || affected.has(path) ||
        seen.has(path) || row.previous_filename ||
        path.split('/').some(s => !s || s === '.' || s === '..')) return false;
    seen.add(path);
    if (NON_RUNTIME_CI_MAINTENANCE.has(path))
      return row.status === 'modified' || row.status === 'added';
    // An already-protected optional workflow narrowed only its trigger paths.
    // Do not use that exception to self-certify a candidate CI/policy rewrite.
    if (verifiedOptionalTriggerNarrowing(row))
      return !candidatePaths.some(candidate =>
        /^(?:\.github\/|lib\/ci\/|scripts\/ci-|tests\/ci-|docs\/operations\/|package(?:-lock)?\.json$)/i.test(candidate));
    if (!OPTIONAL_WORKFLOW_YAML.test(path) || row.status !== 'modified' ||
        row.changes !== 1 || row.additions !== 0 || row.deletions !== 1 ||
        typeof row.patch !== 'string') return false;
    const changed = row.patch.split('\n').filter(line =>
      (line.startsWith('+') && !line.startsWith('+++')) ||
      (line.startsWith('-') && !line.startsWith('---')));
    return changed.length === 1 && changed[0] === RETIRED_OPTIONAL_MARKER;
  });
}

// Protected target promotions that REMOVE optional, unrelated CI triggers
// cannot make an already successful exact-HEAD Core/Specialist suite less tested.
// Only these reviewed, non-required domain owners can use this exception.
// Never accept job-body, permission, event, mandatory gate, or added-positive
// source trigger edits. Full ancestry and all-path/overlap proof remain required.
const OPTIONAL_TRIGGER_NARROWING_OWNERS = new Set([
  '.github/workflows/hh-profile-axis-matching.yml',
  '.github/workflows/holistic-house-pdf-graphics.yml',
  '.github/workflows/maya-reader-bundle.yml',
  '.github/workflows/practice-visual-browser.yml',
  '.github/workflows/tantra-pdf-source-qa.yml',
  '.github/workflows/tantra-testimonials.yml',
  '.github/workflows/visual-to-code-skill.yml',
]);
function verifiedOptionalTriggerNarrowing(row) {
  if (!OPTIONAL_TRIGGER_NARROWING_OWNERS.has(row.filename) ||
      row.status !== 'modified' || typeof row.patch !== 'string' ||
      row.patch.length > 20_000 || !row.patch.includes('@@') ||
      !Number.isSafeInteger(row.additions) || row.additions < 0 ||
      !Number.isSafeInteger(row.deletions) || row.deletions < 0 ||
      !Number.isSafeInteger(row.changes) || row.changes < 1 ||
      row.changes > 40 || row.additions + row.deletions !== row.changes)
    return false;
  const edits = row.patch.split('\n').filter(line =>
    (line.startsWith('+') && !line.startsWith('+++')) ||
    (line.startsWith('-') && !line.startsWith('---')));
  // GitHub omits/truncates large per-file patches. Missing evidence is RED,
  // never an approval based on only the subset of edits we could read.
  if (edits.length !== row.changes) return false;
  let narrower = false;
  for (const entry of edits) {
    const text = entry.slice(1);
    if (/^\s*#/.test(text)) continue; // YAML comments are non-executable.
    // In these reviewed owners, six-space quoted list entries are event
    // paths selectors; a job step/permissions/if/run edit cannot match.
    const match = /^ {6}- (?:'([^']+)'|"([^"]+)")$/.exec(text);
    if (!match) return false;
    const selector = match[1] ?? match[2];
    if (selector.length > 200 || !/^[!a-z0-9._/*?\\\[\]-]+$/i.test(selector) ||
        selector === '!') return false;
    // Removing a positive selector OR adding a negative selector ONLY makes
    // an optional workflow less eager; the old tested BASE was at least as
    // strict. The opposite direction requires new exact-BASE checks.
    if ((entry[0] === '-' && !selector.startsWith('!')) ||
        (entry[0] === '+' && selector.startsWith('!'))) {
      narrower = true;
      continue;
    }
    return false;
  }
  return narrower;
}

// Safe reuse after a protected target advance that changes only inert public
// raster images. This is intentionally not a generic disjoint-files waiver:
// no SVG, JS, CSS, workflows, dependencies, authentication, billing or privacy.
// The immutable tested merge, HEAD and required Specialist jobs remain binding.
const PUBLIC_RASTER_BASE_ADVANCE = /^public\/(?:images|photos|assets)\/(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+\.(?:png|jpe?g|webp|avif|gif)$/i;
export function verifiedIndependentPublicRasterAdvance(compare, testedBase, liveBase, candidatePaths = []) {
  if (!SHA.test(testedBase || '') || !SHA.test(liveBase || '') || testedBase === liveBase ||
      !compare || compare.status !== 'ahead' || compare.base_commit?.sha !== testedBase ||
      compare.merge_base_commit?.sha !== testedBase || compare.behind_by !== 0 ||
      !Number.isInteger(compare.ahead_by) || compare.ahead_by < 1 || compare.ahead_by > 20 ||
      compare.total_commits !== compare.ahead_by ||
      !Array.isArray(compare.commits) || compare.commits.length !== compare.ahead_by ||
      compare.commits.at(-1)?.sha !== liveBase || !Array.isArray(compare.files) ||
      compare.files.length < 1 || compare.files.length >= 100 ||
      !Array.isArray(candidatePaths) || candidatePaths.length < 1 || candidatePaths.length > 300 ||
      candidatePaths.some(path => typeof path !== 'string' || !path ||
        path.split('/').some(part => !part || part === '.' || part === '..')) ||
      new Set(candidatePaths).size !== candidatePaths.length) return false;
  const changed = new Set(candidatePaths), seen = new Set();
  return compare.files.every(file => {
    const path = file?.filename;
    if (typeof path !== 'string' || !PUBLIC_RASTER_BASE_ADVANCE.test(path) ||
        file.previous_filename || changed.has(path) || seen.has(path) ||
        !['added', 'modified'].includes(file.status) ||
        path.split('/').some(part => !part || part === '.' || part === '..')) return false;
    seen.add(path);
    return true;
  });
}
// Safely reuse a successful exact-HEAD suite after a DIFFERENT, protected PR
// updates only isolated public presentation leaves. This is deliberately not
// a disjoint-filenames waiver: shared modules, CI policy, dependencies, server
// routes, user data and ambiguous/renamed/deleted history require a new merge
// checkout and its real checks. GitHub mergeability is separately mandatory.
const INDEPENDENT_PUBLIC_PAGE = /^app\/(?:\[[a-z][a-z0-9_-]*\]\/)?(?:about|academy|business|courses|events|holistic-support|library|practices|services|tests|video)(?:\/[a-z0-9-]+)*\/(?:page|loading|error|not-found)\.(?:tsx|jsx)$/i;
const INDEPENDENT_PUBLIC_COMPONENT = /^components\/(?:academy|business|mandala|practice|support|video)-[a-z0-9._-]+\.(?:tsx|jsx|module\.css)$/i;
const RELEASE_CONTROL_SOURCE = /^(?:\.github\/|supabase\/|db\/|config\/|lib\/ci\/|tests\/ci-|scripts\/(?:ci-|lab-|pr-sweep-|vercel-)|docs\/operations\/|docs\/security\/|package(?:-lock)?\.json$|next\.config\.|tsconfig\.|vercel\.json$|middleware\.)/i;
export function safeIndependentPublicPresentationAdvance(compare, testedBase, liveBase, candidatePaths = []) {
  if (!SHA.test(testedBase || '') || !SHA.test(liveBase || '') || testedBase === liveBase ||
      !compare || compare.status !== 'ahead' || compare.base_commit?.sha !== testedBase ||
      compare.merge_base_commit?.sha !== testedBase || compare.behind_by !== 0 ||
      !Number.isInteger(compare.ahead_by) || compare.ahead_by < 1 || compare.ahead_by > 40 ||
      compare.total_commits !== compare.ahead_by ||
      !Array.isArray(compare.commits) || compare.commits.length !== compare.ahead_by ||
      compare.commits.at(-1)?.sha !== liveBase || !Array.isArray(compare.files) ||
      compare.files.length < 1 || compare.files.length >= 100 ||
      !Array.isArray(candidatePaths) || !candidatePaths.length || candidatePaths.length > 300 ||
      new Set(candidatePaths).size !== candidatePaths.length ||
      candidatePaths.some(path => typeof path !== 'string' || !path ||
        path.split('/').some(segment => !segment || segment === '.' || segment === '..') ||
        RELEASE_CONTROL_SOURCE.test(path))) return false;

  const candidate = new Set(candidatePaths), seen = new Set();
  const candidateSource = candidatePaths.map(path => '-' + path.toLowerCase().replace(/[\/._]/g, '-') + '-');
  return compare.files.every(row => {
    const path = row?.filename;
    if (typeof path !== 'string' || candidate.has(path) || seen.has(path) ||
        row.previous_filename || !['modified', 'added'].includes(row.status) ||
        path.split('/').some(segment => !segment || segment === '.' || segment === '..') ||
        RUNTIME_POLICY.test(path) ||
        !(INDEPENDENT_PUBLIC_PAGE.test(path) || INDEPENDENT_PUBLIC_COMPONENT.test(path))) return false;
    seen.add(path);
    // A feature may span a page, its components and its own library module.
    // Any shared feature namespace on BOTH sides is potentially dependent.
    const route = path.match(/^app\/(?:\[[^/]+\]\/)?(.+)\/(?:page|loading|error|not-found)\.(?:tsx|jsx)$/i);
    const component = path.match(/^components\/([a-z]+)-/i);
    const scopes = route ? route[1].split('/') : component ? [component[1]] : [];
    if (!scopes.length || scopes.some(scope => !/^[a-z0-9-]{3,}$/i.test(scope) ||
        candidateSource.some(source => source.includes('-' + scope.toLowerCase() + '-')))) return false;
    return true;
  });
}
// This extends the earlier page-only exception to ordinary, independent
// public product code. Expensive exact-HEAD checks must *already* have passed:
// a changed protected production SHA is not, by itself, a test failure.
// Keep CI/dependencies/API/data/security/consent/payment changes fail-closed.
// A GitHub-positive mergeability read is additionally enforced by both gates.
const DISJOINT_HARD_BLOCK = /^(?:\.github\/|supabase\/|db\/|config\/|infra\/|scripts\/(?:ci-|pr-sweep-|lab-|vercel-)|lib\/ci\/|tests\/ci-|docs\/operations\/|docs\/security\/|package(?:-lock)?\.json$|pnpm-lock\.yaml$|yarn\.lock$|next\.config\.|tsconfig\.|middleware\.|vercel\.json$|eslint\.config\.)/i;
const DISJOINT_RUNTIME_EXCLUDE = /^(?:app\/(?:\[[^/]+\]\/)?(?:api|app|account|admin|auth|cabinet|login|register|settings)\/|components\/(?:app\/)?(?:auth|account|cabinet|shared|ui|global|layout)[\/-]|lib\/(?:app|ci|auth|billing|security|server|supabase|db|shared|common|config|permissions)\/)/i;
const DISJOINT_PUBLIC_FILE = /^(?:app\/[a-z0-9_/\[\].-]+\/(?:page|loading|error|not-found)\.(?:tsx|jsx)|components\/[a-z0-9_/-]+\.(?:tsx|jsx|module\.css|css)|lib\/[a-z0-9_/-]+\.(?:mjs|js|ts|tsx)|tests\/[a-z0-9_/-]+\.test\.(?:mjs|cjs|js|ts)|docs\/[a-z0-9_/-]+\.md|public\/(?:images|photos|assets)\/[a-z0-9_./-]+\.(?:png|jpe?g|webp|avif|gif))$/i;
const DISJOINT_FEATURE_SCOPES = /(?:^|[\/_.-])(alchemy|academy|assessment|business|coach|coaching|course|crm|home|mandala|mytube|reiki|services|shamanica|support|telegram|therapy|video|wave|voice)(?=$|[\/_.-])/gi;
function scopesOf(path) {
  const result = new Set();
  for (const matched of path.matchAll(DISJOINT_FEATURE_SCOPES))
    result.add(matched[1] === 'coach' ? 'coaching' :
      matched[1] === 'course' ? 'academy' : matched[1].toLowerCase());
  return result;
}
// Production base movement must not invalidate an exact-HEAD suite when the
// changed files belong to a clearly different feature. Scope matters: plain
// disjoint filenames can still share auth, CI, imports, global config or data.
// The immutable Compare proof + real green Core/Specialist jobs are mandatory.
const SCOPED_FEATURE_FILES = /^(?:app\/(?:\[[a-z][a-z0-9_-]*\]\/)?(?:api\/)?[a-z0-9_./-]+\/(?:page|route|loading|error|not-found)\.(?:tsx?|jsx?)|components\/[a-z0-9_./-]+\.(?:tsx?|jsx?|module\.css)|lib\/[a-z0-9_./-]+\.(?:tsx?|jsx?|mjs)|tests\/[a-z0-9_./-]+\.test\.(?:mjs|cjs|tsx?|jsx?))$/i;
const SCOPED_SHARED_PATHS = /^(?:components\/(?:app\/|ui\/|shared\/|common\/|global\/|layout\/)|lib\/(?:ci|shared|common|server|config|security|auth|billing|db|supabase|app)(?:\/|[.-])|app\/(?:\[[^/]+\]\/)?(?:layout|template|page)\.|tests\/(?:ci-|integration-|e2e-|global-))/i;
const SCOPED_CROSS_CUTTING = /(?:^|[\/._-])(?:auth|authorization|account|admin|privacy|private|security|secret|credential|token|consent|permission|payment|billing|checkout|invoice|rls|database|migration|supabase|middleware|config|global|shared|common|provider|webhook|integration|session|client|profile|storage|medical|health|voice|audio|recording|license|export|codec|encoder)(?:$|[\/._-])/i;
const SCOPED_FEATURE_FAMILIES = new Map([
  ...['ali','alchemy','wave','coach','coaching','secretary','messenger','chat','telegram','crm','persona','lead'].map(t=>[t,'assistant']),
  ...['video','mytube','film','footage','storyboard','montage','render','media','cinematic','mandala'].map(t=>[t,'video']),
  ...['academy','course','courses','reiki','learning','lesson','lessons'].map(t=>[t,'academy']),
  ...['diagnostic','diagnostics','assessment','test','tests','psychometric','quiz'].map(t=>[t,'diagnostics']),
  ...['shamanica','shamanic'].map(t=>[t,'shamanica']),
  ...['business','consulting','team'].map(t=>[t,'business']),
  ...['services','support','energywork','therapy','healing'].map(t=>[t,'services']),
  ...['home','homepage','landing'].map(t=>[t,'home']),
  ...['library','books','news'].map(t=>[t,'library']),
  ...['tarot','archetype'].map(t=>[t,'tarot']),
]);
function scopedFeatureFamily(path) {
  if (typeof path !== 'string' || !SCOPED_FEATURE_FILES.test(path) ||
      SCOPED_SHARED_PATHS.test(path) || SCOPED_CROSS_CUTTING.test(path) ||
      DISJOINT_HARD_BLOCK.test(path)) return null;
  const families = new Set(path.toLowerCase().split(/[\/._-]+/)
    .map(token => SCOPED_FEATURE_FAMILIES.get(token)).filter(Boolean));
  // Zero/multiple scopes are ambiguous; do not reuse old results.
  return families.size === 1 ? [...families][0] : null;
}

export function safeDisjointPublicSourceAdvance(compare, testedBase, liveBase, candidatePaths = []) {
  if (!SHA.test(testedBase || '') || !SHA.test(liveBase || '') ||
      testedBase === liveBase || !compare || compare.status !== 'ahead' ||
      compare.base_commit?.sha !== testedBase || compare.merge_base_commit?.sha !== testedBase ||
      compare.behind_by !== 0 || !Number.isInteger(compare.ahead_by) ||
      compare.ahead_by < 1 || compare.ahead_by > 99 ||
      compare.total_commits !== compare.ahead_by ||
      !Array.isArray(compare.commits) || compare.commits.length !== compare.ahead_by ||
      compare.commits.at(-1)?.sha !== liveBase ||
      !Array.isArray(compare.files) || compare.files.length < 1 ||
      compare.files.length >= 100 || !Array.isArray(candidatePaths) ||
      candidatePaths.length < 1 || candidatePaths.length > 300 ||
      new Set(candidatePaths).size !== candidatePaths.length ||
      candidatePaths.some(path => typeof path !== 'string' || !path ||
        path.split('/').some(segment => !segment || segment === '.' || segment === '..') ||
        DISJOINT_HARD_BLOCK.test(path))) return false;
  const affected = new Set(candidatePaths), seen = new Set();
  const scope = new Set(candidatePaths.flatMap(path => [...scopesOf(path)]));
  const scopedCandidates = candidatePaths.map(scopedFeatureFamily);
  const scopedFamilies = scopedCandidates.every(Boolean) ? new Set(scopedCandidates) : null;
  return compare.files.every(row => {
    const path = row?.filename;
    if (typeof path !== 'string' || !path || affected.has(path) ||
        seen.has(path) || row.previous_filename ||
        (row.status !== 'added' && row.status !== 'modified') ||
        path.split('/').some(segment => !segment || segment === '.' || segment === '..') ||
        DISJOINT_HARD_BLOCK.test(path) || SCOPED_SHARED_PATHS.test(path)) return false;
    seen.add(path);
    // A shared feature is not independent merely because it uses different
    // files or the older generic public-leaf allowlist would have admitted it.
    const targetFamily = scopedFeatureFamily(path);
    if (scopedFamilies && targetFamily && scopedFamilies.has(targetFamily)) return false;
    // Preserve the original public-leaf allowlist (including candidates that
    // are not feature-scoped). Never broaden that legacy policy silently.
    const publicLeaf = !DISJOINT_RUNTIME_EXCLUDE.test(path) &&
      !RUNTIME_POLICY.test(path) && DISJOINT_PUBLIC_FILE.test(path) &&
      ![...scopesOf(path)].some(s => scope.has(s));
    if (publicLeaf) return true;
    // New exception for independent feature-scoped API/components/library code.
    // Both sides must have exactly one known, DIFFERENT feature family and
    // neither side may contain shared, cross-cutting or release-control paths.
    return Boolean(scopedFamilies && targetFamily && !scopedFamilies.has(targetFamily));
  });
}
// A reviewed, independent browser-only verification script is not application
// runtime, a workflow owner, or a new provider. Do not throw away completed
// Core when production changes such a script on a different PR.
// Same path, security/provider/voice/media or CI/deploy scripts stay strict.
const INDEPENDENT_QA_VERIFIER =
  /^scripts\/verify-[a-z0-9.-]+-(?:browser|mobile)\.mjs$/i;
const INDEPENDENT_QA_SENSITIVE =
  /(?:^|[\/_.-])(?:admin|api|auth|audio|billing|codec|consent|credential|encoded|encoder|export|health|identity|license|login|medical|payment|private|privacy|provider|recording|recorder|rls|secret|security|service|services|session|storage|supabase|token|voice)(?:$|[\/_.-])/i;
export function safeIndependentQaAdvance(compare, testedBase, liveBase, candidatePaths = []) {
  if (!SHA.test(testedBase || '') || !SHA.test(liveBase || '') ||
      testedBase === liveBase || !compare || compare.status !== 'ahead' ||
      compare.base_commit?.sha !== testedBase ||
      compare.merge_base_commit?.sha !== testedBase || compare.behind_by !== 0 ||
      !Number.isInteger(compare.ahead_by) || compare.ahead_by < 1 || compare.ahead_by > 99 ||
      compare.total_commits !== compare.ahead_by ||
      !Array.isArray(compare.commits) || compare.commits.length !== compare.ahead_by ||
      compare.commits.at(-1)?.sha !== liveBase ||
      !Array.isArray(compare.files) || !compare.files.length || compare.files.length >= 100 ||
      !Array.isArray(candidatePaths) || !candidatePaths.length ||
      candidatePaths.length > 300 || new Set(candidatePaths).size !== candidatePaths.length ||
      candidatePaths.some(p => typeof p !== 'string' || !p ||
        p.split('/').some(s => !s || s === '.' || s === '..'))) return false;
  const touched = new Set(candidatePaths), seen = new Set();
  return compare.files.every(row => {
    const path = row?.filename;
    if (typeof path !== 'string' || touched.has(path) || seen.has(path) ||
        row.previous_filename || !['added','modified'].includes(row.status) ||
        !INDEPENDENT_QA_VERIFIER.test(path) || INDEPENDENT_QA_SENSITIVE.test(path)) return false;
    seen.add(path);
    return true;
  });
}
// Fully isolated TEST-ONLY target promotions do not change a candidate's
// runtime. Treat a genuine different feature's test file as independent while
// retaining all complete protected Compare ancestry / overlap requirements.
// Cross-domain integration, release, security and unknown test scope remain
// blocked, as do tests targeting any feature touched by the candidate.
const INDEPENDENT_DOMAIN_TEST = /^tests\/[a-z0-9._/-]+\.test\.(?:mjs|cjs|js|ts|tsx)$/i;
const GLOBAL_OR_SENSITIVE_TEST =
  /(?:^|[\/_.-])(?:auth|authorization|billing|ci|compliance|consent|credential|database|dependency|gate|global|integration|migration|payment|privacy|release|required|rls|security|sensitive|source-preflight|supabase|token|workflow)(?:$|[\/_.-])/i;
const DOMAIN_TEST_SCOPES =
  /(?:^|[\/_.-])(academy|alchemy|assessment|business|coach|coaching|course|crm|home|mandala|mytube|reiki|services|service|shamanica|support|telegram|therapy|video|voice|wave)(?=$|[\/_.-])/gi;
function testScopeSet(path) {
  const found = new Set();
  for (const hit of path.matchAll(DOMAIN_TEST_SCOPES))
    found.add(hit[1] === 'coach' ? 'coaching' :
      hit[1] === 'course' ? 'academy' :
      hit[1] === 'service' ? 'services' : hit[1].toLowerCase());
  return found;
}
export function safeIndependentDomainTestAdvance(compare, testedBase, liveBase, candidatePaths = []) {
  if (!SHA.test(testedBase || '') || !SHA.test(liveBase || '') ||
      testedBase === liveBase || !compare || compare.status !== 'ahead' ||
      compare.base_commit?.sha !== testedBase ||
      compare.merge_base_commit?.sha !== testedBase || compare.behind_by !== 0 ||
      !Number.isInteger(compare.ahead_by) || compare.ahead_by < 1 || compare.ahead_by > 99 ||
      compare.total_commits !== compare.ahead_by ||
      !Array.isArray(compare.commits) || compare.commits.length !== compare.ahead_by ||
      compare.commits.at(-1)?.sha !== liveBase ||
      !Array.isArray(compare.files) || !compare.files.length || compare.files.length >= 100 ||
      !Array.isArray(candidatePaths) || !candidatePaths.length || candidatePaths.length > 300 ||
      new Set(candidatePaths).size !== candidatePaths.length ||
      candidatePaths.some(path => typeof path !== 'string' || !path ||
        path.split('/').some(segment => !segment || segment === '.' || segment === '..') ||
        DISJOINT_HARD_BLOCK.test(path))) return false;
  const touched = new Set(candidatePaths), seen = new Set();
  const features = new Set(candidatePaths.flatMap(p => [...testScopeSet(p)]));
  // Unknown/shared runtime paths might indirectly change a feature's test
  // behavior. Do not infer independence for such unscoped source edits.
  if (candidatePaths.some(p => /^(?:app\/|components\/|lib\/)/i.test(p) &&
      testScopeSet(p).size === 0)) return false;
  return compare.files.every(row => {
    const path = row?.filename;
    if (typeof path !== 'string' || touched.has(path) || seen.has(path) ||
        row.previous_filename || !['added','modified'].includes(row.status) ||
        !INDEPENDENT_DOMAIN_TEST.test(path) || GLOBAL_OR_SENSITIVE_TEST.test(path) ||
        path.split('/').some(segment => !segment || segment === '.' || segment === '..')) return false;
    seen.add(path);
    const scope = testScopeSet(path);
    return scope.size > 0 && [...scope].every(s => !features.has(s));
  });
}

// A protected production promotion may mix *independent* file categories:
// for example read-only documentation + public raster assets, or isolated
// domain tests + verified CI telemetry. The single-category validators above
// reject that entire mixed Compare even though each changed row is harmless.
// Only compose the existing BASE-owned validators, NEVER a candidate policy.
// Every row must individually pass a complete immutable ancestry proof,
// strict path overlap check, status check and its original risk-specific cap.
// Changes to shared runtime, auth/CRM, dependencies, workflows or release
// policy are NOT authorized merely because the names differ.
export function safeComposedIndependentAdvance(compare, testedBase, liveBase, candidatePaths = []) {
  if (!SHA.test(testedBase || '') || !SHA.test(liveBase || '') || testedBase === liveBase ||
      !compare || compare.status !== 'ahead' ||
      compare.base_commit?.sha !== testedBase ||
      compare.merge_base_commit?.sha !== testedBase || compare.behind_by !== 0 ||
      !Number.isInteger(compare.ahead_by) || compare.ahead_by < 1 ||
      compare.ahead_by > 99 || compare.total_commits !== compare.ahead_by ||
      !Array.isArray(compare.commits) || compare.commits.length !== compare.ahead_by ||
      compare.commits.at(-1)?.sha !== liveBase ||
      !Array.isArray(compare.files) || compare.files.length < 2 ||
      compare.files.length >= 100 ||
      !Array.isArray(candidatePaths) || !candidatePaths.length ||
      candidatePaths.length > 300 || new Set(candidatePaths).size !== candidatePaths.length ||
      candidatePaths.some(path => typeof path !== 'string' || !path ||
        path.split('/').some(part => !part || part === '.' || part === '..'))) return false;

  const candidate = new Set(candidatePaths), seen = new Set(), categories = new Set();
  const validators = [
    ['docs', safeDocumentationAdvance],
    ['ci-maintenance', safeIndependentCiMaintenanceAdvance],
    ['raster', verifiedIndependentPublicRasterAdvance],
    ['presentation', safeIndependentPublicPresentationAdvance],
    ['public-source', safeDisjointPublicSourceAdvance],
    ['qa', safeIndependentQaAdvance],
    ['domain-test', safeIndependentDomainTestAdvance],
  ];
  for (const row of compare.files) {
    const path = row?.filename;
    if (typeof path !== 'string' || !path || candidate.has(path) ||
        seen.has(path) || row.previous_filename ||
        !['added', 'modified'].includes(row.status) ||
        path.split('/').some(part => !part || part === '.' || part === '..')) return false;
    seen.add(path);
    // The complete Compare ancestry remains unchanged; each original
    // validator must independently approve this exact row and candidate.
    const isolated = { ...compare, files: [row] };
    const owner = validators.find(([, check]) =>
      check(isolated, testedBase, liveBase, candidatePaths));
    if (!owner) return false;
    categories.add(owner[0]);
  }
  // A single-category advance belongs to its existing complete-list policy.
  // Do not let per-row checking widen those older, stricter list limits.
  return categories.size >= 2;
}

// A moving protected production ref is not by itself a source regression.
// For distinct product domains reuse an already tested exact-HEAD result,
// provided GitHub Compare proves the COMPLETE protected advance. This does
// NOT waive Core/Specialist success or GitHub's native conflict protection.
const SCOPED_BASE_GLOBAL = /^(?:\.github\/|(?:supabase|db|infra|config|migrations)\/|lib\/(?:ci|shared|common|config|security|auth|billing|db|supabase|server)\/|components\/(?:ui|shared|common|global|layout)\/|scripts\/(?:ci-|pr-sweep-|lab-|vercel-)|tests\/ci-|docs\/(?:operations|security)\/|(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|next\.config\.[^/]+|tsconfig(?:\.[^/]+)?\.json|vercel\.json|eslint\.config\.[^/]+|middleware\.[^/]+)$|app\/(?:\[[^/]+\]\/)?page\.[^/]+$|app\/(?:[^/]+\/)*(?:layout|template|globals|global-error)\.[^/]+$|app\/api\/holistic-support\/(?:voice|audio|first-video|video|hypno)\/)/i;
function scopedBaseFeature(path) {
  if (typeof path !== 'string' || path.length > 512 ||
      (!/^(?:app|components|lib|tests|public|content|data)\//i.test(path) &&
       !/^scripts\/(?:verify-|benchmarking\/)/i.test(path)) ||
      SCOPED_BASE_GLOBAL.test(path) ||
      MIXED_CRITICAL_SOURCE.test(path) ||
      path.split('/').some(part => !part || part === '.' || part === '..')) return null;
  // These three reviewed, non-runtime WebKit acceptance helpers are uniquely
  // part of the existing Mandala video editor. A generic "quiz" or "story"
  // token must NOT classify unrelated diagnostics/library source as video.
  const videoQa = /^scripts\/benchmarking\/(?:complete-three-step-goals-quiz|verify-five-scene-stories-browser|verify-original-motion-export)\.mjs$/i;
  if (videoQa.test(path)) return 'video';
  const tokens = new Set(path.toLowerCase().split(/[\/._-]+/));
  const has = words => words.some(word => tokens.has(word));
  // Specific feature anchors win over incidental "chat" or "voice" in tests.
  if (has(['mandala','video','videos','webcodecs','mp4','storyboard','montage','cinematic','footage','film','filming','filmed','mytube'])) return 'video';
  if (has(['ali','alchemy','crm','telegram','messenger','secretary','inbox','assistant','conversation','dialogue','persona','personas','wave','chat'])) return 'assistant';
  if (has(['affirmation','voice','audio','recording','recorder','encoder','codec'])) return 'video';
  if (has(['academy','course','courses','reiki','learning','lesson','lessons'])) return 'academy';
  if (has(['shamanica','shamanic','shamanism'])) return 'shamanica';
  if (has(['business','consulting','teams'])) return 'business';
  // Public Services UI, its domain libraries and the existing read-only
  // Services browser verifier belong to ONE feature. Their promotion must not
  // invalidate completed iPhone-video Core/Media CI on an unchanged HEAD.
  // Video/assistant/security checks above take precedence on mixed names.
  if (has(['services','service','support','energywork','healing'])) return 'services';
  if (has(['assessment','assessments','diagnostic','diagnostics','quiz','tests','psychometric'])) return 'diagnostics';
  if (has(['therapy','therapeutic','psychotherapy','coaching','coach','constellation','constellations'])) return 'therapy';
  if (has(['profile','cabinet','account','session','sessions'])) return 'profile';
  if (has(['home','homepage','landing','about'])) return 'home';
  return null; // shared/unknown source is never presumed independent
}
export function safeScopedDisjointProductionAdvance(compare, testedBase, liveBase, candidatePaths = []) {
  if (!SHA.test(testedBase || '') || !SHA.test(liveBase || '') || testedBase === liveBase ||
      !compare || compare.status !== 'ahead' ||
      compare.base_commit?.sha !== testedBase ||
      compare.merge_base_commit?.sha !== testedBase ||
      compare.behind_by !== 0 || !Number.isSafeInteger(compare.ahead_by) ||
      compare.ahead_by < 1 || compare.ahead_by > 99 ||
      compare.total_commits !== compare.ahead_by ||
      !Array.isArray(compare.commits) || compare.commits.length !== compare.ahead_by ||
      compare.commits.at(-1)?.sha !== liveBase ||
      !Array.isArray(compare.files) || !compare.files.length || compare.files.length >= 300 ||
      !Array.isArray(candidatePaths) || !candidatePaths.length ||
      candidatePaths.length >= 3000 || new Set(candidatePaths).size !== candidatePaths.length)
    return false;
  const candidate = new Set(candidatePaths);
  const domains = new Set();
  for (const path of candidate) {
    const family = scopedBaseFeature(path);
    if (!family) return false;
    domains.add(family);
  }
  const seen = new Set();
  for (const row of compare.files) {
    const path = row?.filename;
    if (typeof path !== 'string' || !path || candidate.has(path) ||
        seen.has(path) || row.previous_filename ||
        !['added','modified'].includes(row.status)) return false;
    seen.add(path);
    const family = scopedBaseFeature(path);
    if (!family || domains.has(family)) return false;
  }
  return true;
}

// Keep valid exact-HEAD Core and Specialist results when several DIFFERENT
// protected PRs move production while they run. GitHub Compare authenticates
// the first/last refs and full path delta. For >100 commits its commit page is
// capped, so use the authenticated ahead/merge-base proof, NEVER an inferred
// missing commit list. >=300 file rows remain rejected as potentially truncated.
// This accepts mixed independent source, docs, images and isolated QA changes,
// not changes to a shared dependency, a matching feature or release control.
const MIXED_CRITICAL_SOURCE = /(?:^|[\/._-])(?:account|auth|authorization|billing|checkout|consent|credential|database|identity|invoice|medical|migration|password|payment|patient|permission|private|privacy|rls|secret|security|session|storage|supabase|token|wallet)(?:$|[\/._-])/i;
const MIXED_CI_TEST = /^tests\/(?:ci-[a-z0-9._-]+|pr-fast-lane|required-gate-policy|workflow-next-route-filters)\.test\.mjs$/i;
const MIXED_RELEASE_SOURCE = /^(?:\.github\/|scripts\/(?:ci-|pr-sweep-|lab-|vercel-)|lib\/ci\/|tests\/(?:ci-|pr-fast-lane|required-gate-policy|workflow-next-route-filters)|docs\/operations\/|(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|next\.config\.[^/]+|tsconfig(?:\.[^/]+)?\.json|vercel\.json|eslint\.config\.[^/]+|middleware\.[^/]+)$)/i;
const MIXED_DOCS = /^docs\/(?!operations\/|security\/|billing\/|payments\/)[a-z0-9_./-]+\.md$/i;
const MIXED_RASTER = /^public\/(?:images|photos|assets)\/[a-z0-9_./-]+\.(?:png|jpe?g|webp|avif|gif)$/i;
function mixedSafePath(path) {
  return typeof path === 'string' && path.length > 0 && path.length <= 512 &&
    !path.split('/').some(part => !part || part === '.' || part === '..');
}
function completeMixedCompare(compare, testedBase, liveBase) {
  if (!SHA.test(testedBase || '') || !SHA.test(liveBase || '') ||
      testedBase === liveBase || !compare || compare.status !== 'ahead' ||
      compare.base_commit?.sha !== testedBase ||
      compare.merge_base_commit?.sha !== testedBase || compare.behind_by !== 0 ||
      !Number.isSafeInteger(compare.ahead_by) || compare.ahead_by < 1 || compare.ahead_by > 1000 ||
      compare.total_commits !== compare.ahead_by ||
      !Array.isArray(compare.commits) ||
      compare.commits.length !== Math.min(compare.ahead_by,100) ||
      !compare.commits.every(row => SHA.test(row?.sha || '')) ||
      (compare.ahead_by <= 100 && compare.commits.at(-1)?.sha !== liveBase) ||
      !Array.isArray(compare.files) || !compare.files.length || compare.files.length >= 300)
    return false;
  return true;
}
// An isolated CI quick-router policy PR is NOT an application release.
// Its green exact-HEAD Core and required specialists remain valid when an
// independent protected product PR moves production. This policy is intentionally
// small: it cannot excuse altered Core/CI checks, dependency graphs, secrets,
// authentication, billing, migrations or changed PR source. The final native
// merge still needs GitHub branch protection and real mergeability.
const ROUTER_ONLY_POLICY_FILES = new Set([
  'scripts/ci-quick-route.mjs',
  'tests/ci-quick-route.test.mjs',
  'docs/operations/MERGE_CHECK_LIGHT_V2_20261120.md',
]);
const ROUTER_MOVED_PROTECTED_CONTROL = /^(?:lib\/ci\/|scripts\/(?:ci-|pr-sweep-|lab-|vercel-)|tests\/(?:ci-|pr-fast-lane|required-gate-policy|workflow-)|docs\/operations\/|(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|next\.config\.[^/]+|tsconfig(?:\.[^/]+)?\.json|vercel\.json|eslint\.config\.[^/]+|middleware\.[^/]+)$|(?:supabase|db|infra|config|migrations)\/|app\/(?:\[[^/]+\]\/)?(?:layout|template|page)\.[^/]+$|components\/(?:ui|shared|common|global|layout)\/)/i;
const ROUTER_MOVED_HIGH_RISK = /(?:^|[\/._-])(?:auth|authorization|billing|checkout|consent|credential|database|identity|invoice|medical|migration|password|payment|patient|permission|private|privacy|rls|secret|security|storage|supabase|token|wallet)(?:$|[\/._-])/i;
const ROUTER_ALLOWED_OWNER_WORKFLOW = /^\.github\/workflows\/(?!hh-(?:pr-core-release|pr-sweep-guard|native-auto-merge|actionlint|ci-stale-run-prune)|release-reaudit|holistic-support-mandala)[a-z0-9._-]+\.ya?ml$/i;
export function safeIndependentRouterPolicyAdvance(compare, testedBase, liveBase, candidatePaths = []) {
  if (!completeMixedCompare(compare,testedBase,liveBase) ||
      !Array.isArray(candidatePaths) || candidatePaths.length < 1 ||
      candidatePaths.length > ROUTER_ONLY_POLICY_FILES.size ||
      new Set(candidatePaths).size !== candidatePaths.length ||
      !candidatePaths.includes('scripts/ci-quick-route.mjs') ||
      !candidatePaths.every(path => ROUTER_ONLY_POLICY_FILES.has(path))) return false;
  const candidate = new Set(candidatePaths), seen = new Set();
  for (const row of compare.files) {
    const path=row?.filename;
    if (!mixedSafePath(path) || candidate.has(path) || seen.has(path) ||
        row.previous_filename || !['added','modified'].includes(row.status)) return false;
    seen.add(path);
    if (/^\.github\/workflows\//.test(path)) {
      // Another independently protected owner workflow is not a change to the
      // mandatory Core/auto-merge policy. Never waive edits to release controls.
      if (!ROUTER_ALLOWED_OWNER_WORKFLOW.test(path)) return false;
      continue;
    }
    if (ROUTER_MOVED_PROTECTED_CONTROL.test(path) ||
        ROUTER_MOVED_HIGH_RISK.test(path) ||
        !/^(?:app|components|lib|tests|public|content|data|docs)\//i.test(path)) return false;
  }
  return true;
}

// A protected domain owner may add a focused test without invalidating
// another domain's already successful Core / Specialist. This NEVER waives
// an actual failed required job, changes a workflow guard or trusts PR code.
// Compare must prove exact protected ancestry plus every changed-file row.
const INDEPENDENT_OWNER_TESTS = Object.freeze({
  '.github/workflows/hh-crm-source-check.yml': {domain:'assistant',
    test:/^tests\/(?:crm|telegram|messenger|ali)-[a-z0-9._-]+\.test\.mjs$/i},
  '.github/workflows/holistic-support-mandala.yml': {domain:'video',
    test:/^tests\/(?:mandala|video|stories|first-video)-[a-z0-9._-]+\.test\.mjs$/i},
  '.github/workflows/hh-public-services-production.yml': {domain:'services',
    test:/^tests\/(?:services|service|public-services)-[a-z0-9._-]+\.test\.mjs$/i},
  '.github/workflows/hh-profile-axis-matching.yml': {domain:'profile',
    test:/^tests\/(?:profile|axis)-[a-z0-9._-]+\.test\.mjs$/i},
});
function additiveUnrelatedOwnerTest(row,candidateDomains) {
  const owner=INDEPENDENT_OWNER_TESTS[row?.filename];
  if (!owner || !candidateDomains || candidateDomains.has(owner.domain) ||
      row.status!=='modified' || row.previous_filename ||
      row.additions!==2 || row.deletions!==0 || row.changes!==2 ||
      typeof row.patch!=='string' || row.patch.length>20_000) return false;
  const edits=row.patch.split('\n').filter(line=>
    /^[+-]/.test(line) && !/^(?:\+\+\+|---)/.test(line));
  if(edits.length!==2 || edits.some(line=>!line.startsWith('+'))) return false;
  const label=edits[0].slice(1),command=edits[1].slice(1);
  if(!/^ {6}- name: [a-z0-9 ()!&:,./+_—–-]{8,180}$/i.test(label)) return false;
  const test=/^ {8}run: node --test (tests\/[a-z0-9._/-]+\.test\.mjs)$/i.exec(command);
  return Boolean(test && owner.test.test(test[1]));
}

// Isolated read-only Specialist-policy PRs need no rebuild when the protected
// target advances only by unrelated product source. Never admit candidate
// workflow edits, shared deps, private/security target code or unknown files.
const DETACHED_CI_FILES = new Set([
  'scripts/ci-specialist-aggregate.mjs','lib/ci/specialist-aggregate.mjs',
  'lib/ci/production-base-impact.mjs','lib/ci/fast-static-ui-text.mjs',
  'tests/ci-specialist-aggregate.test.mjs','tests/ci-specialist-wait.test.mjs',
  'tests/ci-fast-static-ui-text.test.mjs',
]);
const DETACHED_CI_SOURCE = new Set([
  'scripts/ci-specialist-aggregate.mjs','lib/ci/specialist-aggregate.mjs',
  'lib/ci/production-base-impact.mjs','lib/ci/fast-static-ui-text.mjs',
]);
export function safeDetachedCiSourceAdvance(compare,testedBase,liveBase,candidatePaths=[]) {
  if(!completeMixedCompare(compare,testedBase,liveBase) ||
     !Array.isArray(candidatePaths) || candidatePaths.length<1 ||
     candidatePaths.length>DETACHED_CI_FILES.size ||
     new Set(candidatePaths).size!==candidatePaths.length ||
     !candidatePaths.every(path=>DETACHED_CI_FILES.has(path)) ||
     !candidatePaths.some(path=>DETACHED_CI_SOURCE.has(path))) return false;
  const candidate=new Set(candidatePaths),seen=new Set();
  for(const row of compare.files) {
    const path=row?.filename;
    if(!mixedSafePath(path) || candidate.has(path) || seen.has(path) ||
       row.previous_filename || !['added','modified'].includes(row.status) ||
       MIXED_RELEASE_SOURCE.test(path) || MIXED_CRITICAL_SOURCE.test(path) ||
       !scopedBaseFeature(path)) return false;
    seen.add(path);
  }
  return true;
}


/*
 * A BASE-tested PR changing exactly the seven independent Specialist
 * leaf-trigger filters and their routing regression should not replay all
 * completed Core/security checks merely because a separately protected
 * public video copy/editor PR landed. This is a narrow source-independent
 * release proof, never an authorization to waive a failed or missing job.
 * Do not broaden to payments, private media, voice APIs, Core/Guard,
 * unknown paths or arbitrary UI dependencies.
 */
const SPECIALIST_LEAF_TRIGGER_COHORT = new Set([
  '.github/workflows/hh-course-presets.yml',
  '.github/workflows/hh-interpretation-database.yml',
  '.github/workflows/hh-personal-coaching-session.yml',
  '.github/workflows/hh-private-audio-e2e.yml',
  '.github/workflows/hh-profile-axis-matching.yml',
  '.github/workflows/practice-google-browser.yml',
  '.github/workflows/practice-visual-services.yml',
  'tests/ci-workflow-globs.test.mjs',
]);
const VERIFIED_DETACHED_PUBLIC_VIDEO_DELTA = new Set([
  'data/video-catalog/meaning-axis-energy-phrases-512-v1.json',
  'docs/videos/ENERGY_SUPPORT_PHRASES_512_20261122.md',
  'tests/meaning-axis-energy-phrases-style-512.test.mjs',
  'components/mandala-auto-video-director.tsx',
  'components/mandala-free-video-studio.tsx',
  'tests/mandala-auto-video-director-ui.test.mjs',
  'tests/mandala-mobile-video-design.test.mjs',
]);
export function safeStandaloneVideoAfterSpecialistScopeAdvance(compare,testedBase,liveBase,candidatePaths=[]) {
  if (!completeMixedCompare(compare,testedBase,liveBase) ||
      !Array.isArray(candidatePaths) ||
      candidatePaths.length !== SPECIALIST_LEAF_TRIGGER_COHORT.size ||
      new Set(candidatePaths).size !== candidatePaths.length ||
      !candidatePaths.every(path=>SPECIALIST_LEAF_TRIGGER_COHORT.has(path)))
    return false;
  const candidate = new Set(candidatePaths), seen = new Set();
  return compare.files.every(row => {
    const path = row?.filename;
    if (!VERIFIED_DETACHED_PUBLIC_VIDEO_DELTA.has(path) ||
        candidate.has(path) || seen.has(path) ||
        row.previous_filename || !['modified','added'].includes(row.status) ||
        !mixedSafePath(path) || MIXED_RELEASE_SOURCE.test(path) ||
        MIXED_CRITICAL_SOURCE.test(path)) return false;
    seen.add(path);
    return true;
  });
}

export function safeMixedProtectedAdvance(compare, testedBase, liveBase, candidatePaths = []) {
  if (!completeMixedCompare(compare, testedBase, liveBase) ||
      !Array.isArray(candidatePaths) || !candidatePaths.length ||
      candidatePaths.length >= 3000 ||
      candidatePaths.some(path => !mixedSafePath(path)) ||
      new Set(candidatePaths).size !== candidatePaths.length) return false;
  const candidate = new Set(candidatePaths);
  // Legitimate protected product promotions must not waste a second Core wave
  // for unchanged, narrowly scoped CI routing code. This is an impact proof,
  // not a waiver of any failed Core or applicable Specialist workflow.
  if (safeIndependentRouterPolicyAdvance(compare,testedBase,liveBase,candidatePaths))
    return true;
  if (safeStandaloneVideoAfterSpecialistScopeAdvance(compare,testedBase,liveBase,candidatePaths))
    return true;
  const nonPolicyCandidate = candidatePaths.every(path => !MIXED_RELEASE_SOURCE.test(path));
  const domains = candidatePaths.map(scopedBaseFeature);
  const scopedCandidate = domains.every(Boolean) ? new Set(domains) : null;
  const seen = new Set();
  for (const row of compare.files) {
    const path = row?.filename;
    if (!mixedSafePath(path) || seen.has(path) || candidate.has(path) ||
        !['added','modified'].includes(row.status) || row.previous_filename)
      return false;
    seen.add(path);
    // Stronger than the prior scoped exception: private/auth/payment source
    // cannot be assumed independent merely because its filename says "profile".
    if (MIXED_CRITICAL_SOURCE.test(path) &&
        !MIXED_CI_TEST.test(path)) return false;
    // Adding one focused test to a DIFFERENT protected domain's owner
    // workflow does not invalidate this PR's existing green HEAD evidence.
    if(nonPolicyCandidate && scopedCandidate &&
       additiveUnrelatedOwnerTest(row,scopedCandidate)) continue;
    // A CI-only test in the newer protected base doesn't alter production
    // runtime or CI execution policy. Candidate CI/release changes stay strict.
    if (nonPolicyCandidate && MIXED_CI_TEST.test(path)) continue;
    // Each verified delta may belong to a different approved source category.
    // Do not demand that the WHOLE moving base match a single category.
    const isolated = {...compare,files:[row]};
    if (compare.ahead_by <= 99 && (
        safeDocumentationAdvance(isolated,testedBase,liveBase,candidatePaths) ||
        safeIndependentCiMaintenanceAdvance(isolated,testedBase,liveBase,candidatePaths) ||
        verifiedIndependentPublicRasterAdvance(isolated,testedBase,liveBase,candidatePaths) ||
        safeIndependentPublicPresentationAdvance(isolated,testedBase,liveBase,candidatePaths) ||
        safeDisjointPublicSourceAdvance(isolated,testedBase,liveBase,candidatePaths) ||
        safeIndependentQaAdvance(isolated,testedBase,liveBase,candidatePaths) ||
        safeIndependentDomainTestAdvance(isolated,testedBase,liveBase,candidatePaths)
      )) continue;
    // For long histories, preserve independent inert docs and raster proofs.
    // No workflow/policy, security or shared runtime exception is implied.
    if (MIXED_DOCS.test(path) && !RUNTIME_POLICY.test(path)) continue;
    if (MIXED_RASTER.test(path) && !MIXED_CRITICAL_SOURCE.test(path)) continue;
    const domain = scopedBaseFeature(path);
    if (scopedCandidate && domain && !scopedCandidate.has(domain) &&
        !MIXED_RELEASE_SOURCE.test(path) &&
        !MIXED_CRITICAL_SOURCE.test(path)) continue;
    return false;
  }
  return true;
}

 
// General fallback for a genuinely independent, namespaced feature that was
// NOT in yesterday's fixed feature-family list. Never infer independence from
// disjoint file names alone. Require complete protected GitHub Compare history,
// affirmative native mergeability, distinct feature namespaces AND families.
// Shared modules, auth/private data, CI/workflows/dependencies, deletions,
// renames and incomplete/unknown paths remain fail-closed.
const ISOLATED_NAMESPACE_RESERVED = new Set([
  'account','admin','api','app','assets','auth','backend','billing','brand',
  'cabinet','checkout','ci','client','common','config','core','data','design',
  'e2e','footer','general','generic','global','header','health','home',
  'integration','layout','navigation','page','payment','privacy','profile',
  'provider','public','release','schema','security','server','session',
  'settings','shared','site','sitewide','state','store','system','test',
  'tests','theme','types','ui','unit','user','users','utils','wallet',
  'website','workflow',
]);
const ISOLATED_NAMESPACE_PRIVATE =
  /(?:^|[\/._-])(?:client|clinical|compliance|consent|credential|crm|database|health|identity|medical|messag(?:e|es|ing)|migration|patient|payment|private|privacy|profile|provider|rls|secret|security|session|storage|supabase|token|wallet)(?:$|[\/._-])/i;
function isolatedFeatureNamespace(path) {
  if (!mixedSafePath(path) || MIXED_CRITICAL_SOURCE.test(path) ||
      MIXED_RELEASE_SOURCE.test(path) || SCOPED_BASE_GLOBAL.test(path) ||
      ISOLATED_NAMESPACE_PRIVATE.test(path)) return null;
  const match = [
    /^components\/(my-[a-z][a-z0-9]{2,}|[a-z][a-z0-9]{2,})[-/][a-z0-9._/-]+\.(?:tsx?|jsx?|module\.css)$/i,
    /^lib\/(my-[a-z][a-z0-9]{2,}|[a-z][a-z0-9]{2,})[-/][a-z0-9._/-]+\.(?:mjs|js|ts|tsx)$/i,
    /^tests\/(my-[a-z][a-z0-9]{2,}|[a-z][a-z0-9]{2,})[-/][a-z0-9._/-]+\.test\.(?:mjs|cjs|js|ts|tsx)$/i,
    /^app\/(?:\[[a-z][a-z0-9_-]*\]\/)?([a-z][a-z0-9-]{2,})\/(?:[a-z0-9-]+\/)*(?:page|loading|error|not-found)\.(?:tsx?|jsx?)$/i,
    /^scripts\/verify-(my-[a-z][a-z0-9]{2,}|[a-z][a-z0-9]{2,})-[a-z0-9._-]+\.mjs$/i,
  ].map(pattern => path.match(pattern)).find(Boolean);
  const scope = match?.[1]?.toLowerCase();
  return scope && !ISOLATED_NAMESPACE_RESERVED.has(scope) ? scope : null;
}

/**
 * An unrelated PRODUCTION_BASE_CHANGED is NOT a failed source check.
 * This fallback admits separately namespaced, non-critical public features
 * which yesterday's hardcoded classifier did not know. Real Core and every
 * applicable exact-HEAD Specialist must still independently succeed; GitHub
 * branch protection must still authorize the native merge.
 */
export function safeIsolatedFeatureAdvance(compare, testedBase, liveBase, candidatePaths = [], mergeable = false) {
  if (mergeable !== true || !completeMixedCompare(compare, testedBase, liveBase) ||
      !Array.isArray(candidatePaths) || !candidatePaths.length ||
      candidatePaths.length >= 300 || new Set(candidatePaths).size !== candidatePaths.length)
    return false;
  const changed = new Set(candidatePaths), namespaces = new Set(), families = new Set();
  let previouslyUnclassified = false;
  for (const path of candidatePaths) {
    const namespace = isolatedFeatureNamespace(path);
    if (!namespace) return false;
    namespaces.add(namespace);
    const family = scopedBaseFeature(path);
    if (family) families.add(family);
    else previouslyUnclassified = true;
  }
  const seen = new Set();
  for (const row of compare.files) {
    const path = row?.filename;
    if (!mixedSafePath(path) || changed.has(path) || seen.has(path) ||
        row.previous_filename || !['modified','added'].includes(row.status))
      return false;
    seen.add(path);
    const namespace = isolatedFeatureNamespace(path);
    if (!namespace || namespaces.has(namespace)) return false;
    const family = scopedBaseFeature(path);
    if (family && families.has(family)) return false;
    if (!family) previouslyUnclassified = true;
  }
  // Never use this fallback to override a deliberate rejection by the older
  // known-feature policies. It is strictly for newly isolated namespaces.
  return previouslyUnclassified;
}


// A protected production promotion confined to unrelated PUBLIC page leaves,
// images or non-operational docs cannot invalidate a completed exact-HEAD suite
// for an otherwise sensitive PR. Unlike a generic disjoint-files waiver this
// refuses global/shared components, APIs, migrations, workflow policy, package
// changes, renames/deletions, overlap and same-feature pages. Native GitHub
// mergeability, Core, Guard and every required Specialist remain mandatory.
const UNRELATED_PUBLIC_PAGE = /^app\/(?:\[[a-z][a-z0-9_-]*\]\/)?([a-z][a-z0-9-]{2,})(?:\/[a-z0-9-]+)*\/(?:page|loading|error|not-found)\.(?:tsx|jsx)$/i;
const UNRELATED_PUBLIC_PAGE_DENY = new Set([
  'account','admin','api','app','auth','cabinet','checkout','client','config',
  'dashboard','login','medical','payment','privacy','profile','register','security',
  'session','settings','shared','system','user','users'
]);
const UNRELATED_CANDIDATE_POLICY = /^(?:\.github\/|(?:supabase|db|infra|config)\/|lib\/ci\/|scripts\/(?:ci-|pr-sweep-|lab-|vercel-)|tests\/(?:ci-|workflow-|required-gate-)|(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|tsconfig(?:\.[a-z0-9-]+)?\.json|next\.config\.[a-z]+|vercel\.json|middleware\.[a-z]+)$)/i;
export function safeUnrelatedPublicLeafAdvance(compare, testedBase, liveBase, candidatePaths = []) {
  if (!completeMixedCompare(compare, testedBase, liveBase) ||
      !Array.isArray(candidatePaths) || !candidatePaths.length ||
      candidatePaths.length > 300 || new Set(candidatePaths).size !== candidatePaths.length ||
      candidatePaths.some(path => !mixedSafePath(path) ||
        UNRELATED_CANDIDATE_POLICY.test(path) ||
        SCOPED_BASE_GLOBAL.test(path) ||
        /^app\/(?:\[[^/]+\]\/)?(?:globals?|unified-|shared-)[^/]*\.(?:css|tsx?|jsx?)$/i.test(path))) return false;
  const candidate = new Set(candidatePaths);
  const candidateTokens = new Set(candidatePaths.flatMap(path => {
    const parts = path.toLowerCase().split(/[\/._]+/).filter(Boolean);
    // Keep the whole feature segment (ali-greeting), not only its words.
    return [...parts, ...parts.flatMap(part => part.split('-'))];
  }));
  const seen = new Set();
  return compare.files.every(row => {
    const path = row?.filename;
    if (!mixedSafePath(path) || candidate.has(path) || seen.has(path) ||
        row.previous_filename || !['added','modified'].includes(row.status) ||
        MIXED_CRITICAL_SOURCE.test(path) || MIXED_RELEASE_SOURCE.test(path))
      return false;
    seen.add(path);
    if ((MIXED_DOCS.test(path) && !RUNTIME_POLICY.test(path)) ||
        MIXED_RASTER.test(path)) return true;
    const page = path.match(UNRELATED_PUBLIC_PAGE);
    const scope = page?.[1]?.toLowerCase();
    return Boolean(scope && !UNRELATED_PUBLIC_PAGE_DENY.has(scope) &&
      !candidateTokens.has(scope));
  });
}


// Owner policy: ordinary, already-protected product changes do not invalidate
// an unchanged PR's successful immutable Core and all required Specialists just
// because the production branch advances. This is the normal loose-base model,
// not a guarantee of cross-file independence or a substitute for integration
// testing. No changed release controls, shared/global contracts, critical data
// or auth/payment/privacy paths, unknown history, target deletions/renames, or
// overlapping files qualify. The callers require affirmative native mergeability.
const LOOSE_PRODUCT_LEAF = /^(?:app\/(?!api\/)[a-z0-9_\[\]./-]+\.(?:tsx?|jsx?|css)|components\/[a-z0-9_\[\]./-]+\.(?:tsx?|jsx?|css)|lib\/[a-z0-9_\[\]./-]+\.(?:mjs|cjs|[cm]?ts|js|tsx)|tests\/[a-z0-9_.\/-]+\.test\.(?:mjs|cjs|js|ts|tsx)|(?:content|data)\/[a-z0-9_.\/-]+\.(?:json|md|mdx))$/i;

// Reviewed independent public readiness instrumentation. Ordinary product policy remains strict.
const REVIEWED_PUBLIC_READINESS_DELTA = Object.freeze([
  {
    "filename": "components/shamanica-business-content.tsx",
    "status": "modified",
    "additions": 2,
    "deletions": 1,
    "changes": 3,
    "patch": "@@ -178,7 +178,8 @@ export function ShamanicaBusinessContent({locale}:{locale:PublicLocale}){\n   const index=BUSINESS_SERVICES.indexOf(id);\n   return t.services[index>=0?index:0];\n  };\n- return <div className={styles.root} data-shamanica-business>\n+ // Mark this client component only after its DOM ref has committed (not during SSR).\n+ return <div className={styles.root} data-shamanica-business ref={node=>{if(node)node.dataset.businessHydrated=\"true\";}}>\n   <details className={styles.quizDrawer} data-business-extras><summary>{locale===\"ru\"?\"Подобрать решение · 3 вопроса\":locale===\"es\"?\"Encontrar solución · 3 preguntas\":\"Find my approach · 3 questions\"}<ArrowRight size={17} aria-hidden=\"true\"/></summary>\n   <section id=\"business-quiz\" className={styles.quiz} data-business-quiz data-quiz-step={step+1} aria-labelledby=\"business-quiz-heading\">\n    <div className={styles.quizTop}>"
  },
  {
    "filename": "scripts/verify-public-services-production.mjs",
    "status": "modified",
    "additions": 4,
    "deletions": 2,
    "changes": 6,
    "patch": "@@ -137,6 +137,9 @@ try {\n   await page.goto(origin+\"/\"+locale+\"/shamanica/business\",{waitUntil:\"domcontentloaded\",timeout:75000});\n   const section=page.locator(\"[data-shamanica-business]\");\n   await visible(section);\n+  // The native disclosure can open before React hydration and be reset when\n+  // the client subtree commits. Wait for this component, not router internals.\n+  await expect(section).toHaveAttribute(\"data-business-hydrated\",\"true\",{timeout:30000});\n   await expect(page.locator(\"[data-sitewide-antistress-banner]\")).toHaveCount(0);\n   await expect(page.locator(\"[data-hh-ihelp-trigger]:visible\")).toHaveCount(0);\n   await expect(page.locator(\"[data-shamanica-ihelp-trigger]\")).toBeVisible();\n@@ -195,8 +198,7 @@ try {\n   assert.ok(m.dockTop>=0&&m.dockBottom<=m.viewportHeight+2,\n     \"Business fixed dock must remain inside viewport \"+locale+\"/\"+width+\" \"+JSON.stringify(m));\n   if(locale===\"ru\"&&width===390)await page.screenshot({path:output+\"/shamanica-business-ru-390.png\",fullPage:false});\n-  await expect.poll(()=>page.evaluate(()=>history.pushState.toString().includes(\"__NA\")),\n-   {timeout:30000,message:\"Business quiz hydration\"}).toBe(true);\n+  await expect(shelves.locator('[data-business-shelf=\"express\"]')).toBeVisible();\n   await shelves.locator('[data-business-shelf=\"express\"]').click();\n   await expect(shelves).toHaveAttribute(\"data-expanded\",\"true\");\n   await expect(shelves.locator('[data-business-second-level=\"express\"] [data-business-subservice]')).toHaveCount(5);"
  }
]);
export function verifiedAdditiveServerPackageEvidence(evidence,paths) {
  const packagePaths=paths.filter(p=>/(?:^|\/)(?:package(?:-lock)?\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/.test(p));
  if(!packagePaths.length)return true;
  if(packagePaths.length!==2||!packagePaths.includes('package.json')||!packagePaths.includes('package-lock.json'))return false;
  try{
    const parse=k=>{const raw=evidence?.[k];if(typeof raw!=='string'||!raw.length||raw.length>2_000_000)throw Error('missing evidence');const x=JSON.parse(raw);if(!x||typeof x!=='object'||Array.isArray(x))throw Error('bad evidence');return x;};
    const a=parse('basePackage'),b=parse('currentPackage'),l=parse('baseLock'),m=parse('currentLock'),same=(x,y)=>JSON.stringify(x)===JSON.stringify(y),without=(o,...ks)=>Object.fromEntries(Object.entries(o).filter(([k])=>!ks.includes(k)));
    if(!same(without(a,'dependencies','scripts'),without(b,'dependencies','scripts')))return false;
    const before=a.dependencies,after=b.dependencies;
    if(!before||!after||typeof before!=='object'||typeof after!=='object'||Object.entries(before).some(([k,v])=>after[k]!==v))return false;
    const added=Object.keys(after).filter(k=>!Object.hasOwn(before,k));
    if(!added.length||added.some(k=>!['@vercel/functions','ws'].includes(k)||!/^\d+\.\d+\.\d+$/.test(after[k])))return false;
    if(!a.scripts||!b.scripts||!same(without(a.scripts,'test:app'),without(b.scripts,'test:app')))return false;
    if(a.scripts['test:app']!==b.scripts['test:app']){
      const parseTests=value=>{if(typeof value!=='string')throw Error('bad test command');const match=/^(node --conditions=react-server --test(?: tests\/[a-z0-9_./-]+\.(?:test|integration)\.mjs)+)( && npm run test:monetization)?$/i.exec(value);if(!match)throw Error('unknown script');return {list:match[1].split(' ').slice(3),tail:match[2]||''};};
      const previous=parseTests(a.scripts['test:app']),next=parseTests(b.scripts['test:app']);if(previous.tail!==next.tail)return false;
      let i=0;for(const item of next.list){if(item===previous.list[i])i++;else if(previous.list.includes(item)||!paths.includes(item))return false;}
      if(i!==previous.list.length||new Set(next.list).size!==next.list.length)return false;
    }
    if(l.lockfileVersion!==3||m.lockfileVersion!==3||!same(without(l,'packages'),without(m,'packages')))return false;
    const p=l.packages,q=m.packages;
    if(!p||!q||!p['']||!q['']||!same(p[''].dependencies,before)||!same(q[''].dependencies,after)||!same(without(p[''],'dependencies'),without(q[''],'dependencies')))return false;
    if(Object.keys(p).some(k=>k!==''&&(!Object.hasOwn(q,k)||!same(p[k],q[k]))))return false;
    const additions=Object.keys(q).filter(k=>!Object.hasOwn(p,k));
    if(!additions.length||additions.length>100||!added.every(k=>q['node_modules/'+k]?.version===after[k]))return false;
    const names=new Set(Object.keys(p).filter(Boolean).map(k=>k.split('node_modules/').at(-1)));
    return additions.every(k=>/^node_modules\/(?:@[\w.-]+\/)?[\w.-]+$/.test(k)&&!names.has(k.split('node_modules/').at(-1))&&typeof q[k]?.version==='string'&&typeof q[k]?.integrity==='string'&&q[k].integrity.startsWith('sha512-')&&!q[k].link);
  }catch{return false;}
}
export function safeIndependentPublicReadinessAdvance(compare,testedBase,liveBase,paths=[],evidence) {
  if(!completeMixedCompare(compare,testedBase,liveBase)||compare.ahead_by>20||!Array.isArray(paths)||!paths.length||paths.length>300||new Set(paths).size!==paths.length||paths.some(p=>!mixedSafePath(p)))return false;
  // Public DOM-only marker and matching browser wait. Exact reviewed target patch,
  // not a PR-number exemption. All original candidate gates remain mandatory.
  const related=/(?:shamanic|shamanism|public-services|mandatory-messenger-actions|public-locales|whatsapp-enquiry|telegram-business-request)/i;
  const shared=/^(?:\.github\/(?:actions\/|workflows\/(?:hh-pr-core-release|hh-native-auto-merge|hh-pr-sweep-guard|hh-actionlint|release-reaudit)\.)|lib\/(?:ci|shared|common|config)\/|scripts\/(?:ci-|pr-sweep-|vercel-)|docs\/(?:operations|security)\/|components\/(?:ui|shared|common|global|layout)\/|(?:next\.config\.|tsconfig\.|middleware\.|vercel\.json|eslint\.config\.)|app\/(?:[^/]+\/)*(?:layout|template|globals|global-error)\.[^/]+$)/i;
  if(paths.some(p=>related.test(p)||shared.test(p))||!verifiedAdditiveServerPackageEvidence(evidence,paths))return false;
  if(compare.files.length!==REVIEWED_PUBLIC_READINESS_DELTA.length)return false;
  const seen=new Set(),candidate=new Set(paths);
  return compare.files.every(row=>{
    const rule=REVIEWED_PUBLIC_READINESS_DELTA.find(x=>x.filename===row?.filename);
    if(!rule||seen.has(row.filename)||candidate.has(row.filename)||row.previous_filename||row.status!==rule.status||row.additions!==rule.additions||row.deletions!==rule.deletions||row.changes!==rule.changes||row.patch!==rule.patch)return false;
    seen.add(row.filename);return true;
  });
}


// A mixed candidate has already been tested as one immutable merge checkout.
// Its own API, migrations, manifests and feature workflow do not make a
// DIFFERENT protected product domain stale. Evaluate the actual moving-base
// delta instead of classifying the entire candidate as globally sensitive.
// This is loose-base CI, not a dependency-graph or integration guarantee.
// Shared/global target source, changed release controls, unknown namespaces,
// target critical data/security, same domain, overlap and incomplete evidence
// remain fail-closed. No special PR numbers or exact target patch are required.
const MIXED_CANDIDATE_RELEASE_CONTROL = /^(?:\.github\/(?:actions\/|workflows\/(?:hh-pr-core-release|hh-native-auto-merge|hh-pr-sweep-guard|hh-actionlint|release-reaudit)[.-])|lib\/ci\/|scripts\/(?:ci-|pr-sweep-|lab-|vercel-)|tests\/(?:ci-|pr-fast-lane|required-gate-|workflow-)|docs\/(?:operations|security)\/)/i;
const MOVING_BASE_SHARED = /^(?:app\/(?:\[[^/]+\]\/)?(?:api|app|admin|account|auth|cabinet|settings)\/|components\/(?:app|ui|shared|common|global|layout)\/|lib\/(?:app|server|shared|common|config|security|auth|billing|db|supabase|crm)\/|(?:supabase|db|infra|config|migrations)\/)/i;
function independentDomainKeys(path) {
  const keys = new Set([...scopesOf(path), ...testScopeSet(path)]);
  const family = scopedBaseFeature(path);
  const namespace = isolatedFeatureNamespace(path);
  if (family) keys.add(family);
  if (namespace) keys.add(namespace);
  // Mixed private paths are often deliberately excluded from the public
  // classifier. Their explicit feature names still count for overlap.
  const words = path.toLowerCase().split(/[\/._-]+/);
  if (words.some(t=>['coach','coaching','clarity','daybook','goal'].includes(t))) {
    keys.add('coaching'); keys.add('therapy');
  }
  if (words.includes('shamanica') || words.includes('shamanic')) keys.add('shamanica');
  if (words.includes('tarot')) keys.add('tarot');
  return keys;
}
// A test-only file belonging to a concrete product owner does not change
// global CI execution. It is still part of the immutable tested PR and all
// applicable Core, RLS and Specialist jobs remain mandatory. Unknown CI
// tests and tests of global release/dispatch/aggregation policy stay strict.
function featureOwnedCiRegression(path, candidatePaths) {
  const hit = /^tests\/ci-([a-z][a-z0-9]{2,})-[a-z0-9._-]+\.test\.mjs$/i.exec(path);
  if (!hit || /(?:^|[._-])(?:core|release|workflow|dispatch|aggregate|automerge|native|global|shared|freshness|specialist|routing|router|sweep|prune|actionlint|policy|merge|dependency|package)(?:$|[._-])/i.test(path)) return false;
  const owner = hit[1].toLowerCase();
  if (ISOLATED_NAMESPACE_RESERVED.has(owner)) return false;
  const ownerKeys = independentDomainKeys('lib/' + owner + '/feature.mjs');
  return ownerKeys.size > 0 && candidatePaths.some(p =>
    /^(?:app|components|lib)\//i.test(p) &&
    !MIXED_CANDIDATE_RELEASE_CONTROL.test(p) &&
    [...independentDomainKeys(p)].some(k => ownerKeys.has(k)));
}

// Assess the scope of the *protected delta*, not the breadth of the candidate.
// Domain-owned CI regression tests are not global release policy changes.
export function safeIndependentMixedCandidateAdvance(compare, testedBase, liveBase, candidatePaths = [], packageEvidence) {
  if (!completeMixedCompare(compare, testedBase, liveBase) ||
      !Array.isArray(candidatePaths) || !candidatePaths.length ||
      candidatePaths.length >= 3000 || new Set(candidatePaths).size !== candidatePaths.length ||
      candidatePaths.some(p=>!mixedSafePath(p) || (MIXED_CANDIDATE_RELEASE_CONTROL.test(p) &&
        !featureOwnedCiRegression(p,candidatePaths))) ||
      !verifiedAdditiveServerPackageEvidence(packageEvidence,candidatePaths)) return false;
  // A known paired readiness change must retain its complete reviewed proof.
  // A partial Compare containing only the UI half is not independent evidence.
  const readinessRows=REVIEWED_PUBLIC_READINESS_DELTA.filter(rule=>compare.files.some(row=>
    row?.filename===rule.filename && row.patch===rule.patch));
  if(readinessRows.length>0 && readinessRows.length!==REVIEWED_PUBLIC_READINESS_DELTA.length) return false;
  const touched=new Set(candidatePaths), candidateKeys=new Set(candidatePaths.flatMap(p=>[...independentDomainKeys(p)]));
  // Without any recognized candidate domain there is no positive proof of
  // independence. Do not turn a generic unknown PR into a loose-base pass.
  if (!candidateKeys.size) return false;
  const seen=new Set();
  for(const row of compare.files) {
    const p=row?.filename;
    if(!mixedSafePath(p)||seen.has(p)||touched.has(p)||row.previous_filename||
        !['added','modified'].includes(row.status)) return false;
    seen.add(p);
    // Compose existing independently reviewed read-only CI maintenance with
    // ordinary protected feature changes. No required gate or job is waived.
    if (safeIndependentCiMaintenanceAdvance({...compare,files:[row]},testedBase,liveBase,candidatePaths)) continue;
    if (SCOPED_BASE_GLOBAL.test(p)||MIXED_RELEASE_SOURCE.test(p)||
        MIXED_CRITICAL_SOURCE.test(p)||MOVING_BASE_SHARED.test(p)) return false;
    if ((MIXED_DOCS.test(p)&&!RUNTIME_POLICY.test(p))||MIXED_RASTER.test(p)) continue;
    if(!LOOSE_PRODUCT_LEAF.test(p)&&!INDEPENDENT_QA_VERIFIER.test(p)) return false;
    if(INDEPENDENT_QA_VERIFIER.test(p)&&INDEPENDENT_QA_SENSITIVE.test(p)) return false;
    const keys=independentDomainKeys(p);
    if(!keys.size||[...keys].some(k=>candidateKeys.has(k))) return false;
  }
  return true;
}

export function safeNonOverlappingProductAdvance(compare, testedBase, liveBase, candidatePaths = [], packageEvidence) {
  if (safeIndependentMixedCandidateAdvance(compare, testedBase, liveBase, candidatePaths, packageEvidence)) return true;
  if (safeIndependentPublicReadinessAdvance(compare, testedBase, liveBase, candidatePaths, packageEvidence)) return true;
  if (!completeMixedCompare(compare, testedBase, liveBase) ||
      compare.ahead_by > 100 ||
      !Array.isArray(candidatePaths) || !candidatePaths.length ||
      candidatePaths.length > 300 || new Set(candidatePaths).size !== candidatePaths.length ||
      candidatePaths.some(path => !mixedSafePath(path))) return false;
  // A test-only advance may add coverage for the candidate itself. Keep
  // the existing domain-test proof authoritative for such advances.
  if (compare.files.every(row => INDEPENDENT_DOMAIN_TEST.test(row?.filename || '')))
    return false;
  const detachedPolicy = candidatePaths.every(path => DETACHED_CI_FILES.has(path));
  if (!detachedPolicy && candidatePaths.some(path =>
      SCOPED_BASE_GLOBAL.test(path) || MIXED_RELEASE_SOURCE.test(path))) return false;
  const candidate = new Set(candidatePaths), seen = new Set();
  return compare.files.every(row => {
    const path = row?.filename;
    if (!mixedSafePath(path) || candidate.has(path) || seen.has(path) ||
        row.previous_filename || !['added','modified'].includes(row.status) ||
        SCOPED_BASE_GLOBAL.test(path) || MIXED_RELEASE_SOURCE.test(path) ||
        MIXED_CRITICAL_SOURCE.test(path)) return false;
    seen.add(path);
    return LOOSE_PRODUCT_LEAF.test(path) ||
      (MIXED_DOCS.test(path) && !RUNTIME_POLICY.test(path)) ||
      MIXED_RASTER.test(path);
  });
}


// A complete, exact regular-file blob match is already part of the tested
// proposed tree. Filter only those collisions; all remaining target changes
// still go through the existing independent-domain policy.
export async function normalizeIdenticalProtectedOverlap(compare,testedBase,liveBase,changedRows,readTested,readProtected) {
  const unchanged={compare,identical:[]};
  if (!completeMixedCompare(compare,testedBase,liveBase) || compare.ahead_by>100 ||
      !Array.isArray(changedRows) || !changedRows.length || changedRows.length>2999 ||
      typeof readTested!=='function' || typeof readProtected!=='function') return unchanged;
  const candidate=new Map(),seen=new Set();
  for(const row of changedRows){
    if(!mixedSafePath(row?.filename)||candidate.has(row.filename)||row.previous_filename)return unchanged;
    candidate.set(row.filename,row.status);
  }
  const overlaps=[];
  for(const row of compare.files){
    if(!mixedSafePath(row?.filename)||seen.has(row.filename)||row.previous_filename||
       !['added','modified'].includes(row.status))return unchanged;
    seen.add(row.filename);
    if(!candidate.has(row.filename))continue;
    const path=row.filename;
    // No policy, manifest, SQL, authentication, billing or unknown exemptions.
    if(!['M','A','modified','added'].includes(candidate.get(path))||
       SCOPED_BASE_GLOBAL.test(path)||MIXED_RELEASE_SOURCE.test(path)||MIXED_CRITICAL_SOURCE.test(path)||
       !(LOOSE_PRODUCT_LEAF.test(path)||/^scripts\/verify-[a-z0-9._-]+\.mjs$/i.test(path))||
       !SHA.test(row.sha||''))return unchanged;
    overlaps.push(row);
  }
  if(!overlaps.length||overlaps.length>12)return unchanged;
  try{
    const identical=[];
    for(const row of overlaps){
      const [a,b]=await Promise.all([readTested(row.filename),readProtected(liveBase,row.filename)]);
      if(a?.type!=='blob'||b?.type!=='blob'||a.mode!=='100644'||b.mode!=='100644'||
         a.sha!==row.sha||b.sha!==row.sha)return unchanged;
      identical.push(row.filename);
    }
    const set=new Set(identical);
    return {compare:{...compare,files:compare.files.filter(row=>!set.has(row.filename))},identical};
  }catch{return unchanged;}
}
