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
  const prChanged = new Set(prPaths);
  return compare.files.every(file => typeof file?.filename === 'string' &&
    approved.has(file.filename) && !prChanged.has(file.filename) &&
    (file.status === 'modified' || file.status === 'added') &&
    !file.previous_filename);
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
    if (!OPTIONAL_WORKFLOW_YAML.test(path) || row.status !== 'modified' ||
        row.changes !== 1 || row.additions !== 0 || row.deletions !== 1 ||
        typeof row.patch !== 'string') return false;
    const changed = row.patch.split('\n').filter(line =>
      (line.startsWith('+') && !line.startsWith('+++')) ||
      (line.startsWith('-') && !line.startsWith('---')));
    return changed.length === 1 && changed[0] === RETIRED_OPTIONAL_MARKER;
  });
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
