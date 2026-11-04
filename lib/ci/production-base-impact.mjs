// A deliberately narrow, evidence-based exception for non-runtime production
// changes. Never infer safety from disjoint file names alone: code and config
// may share runtime dependencies even without direct path overlap.
const SHA = /^[0-9a-f]{40}$/i;
const RUNTIME_POLICY = /(?:^|[\/_-])(?:operations|policy|policies|release|deployment|ci|workflow|security|privacy|auth|consent|secret|credential|payment|billing|rls|database|migration|supabase|api)(?:$|[\/_-])/i;

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
