// Independent read-only BASE_ADVANCED signal for an *open* production PR.
// A BASE move is not itself a PR failure, runner delay, or forced-refresh gate.
const SHA = /^[a-f0-9]{40}$/i;
const REPO = 'andylitvinov-design/books';
const BASE = 'codex/public-book-library';
const valid = value => typeof value === 'string' && SHA.test(value);

export function classifyBaseAdvance(pr, production, comparison = null) {
  const unknown = reason => ({schema:'HH_PR_BASE_ADVANCE_V1', signal:null, state:'UNKNOWN', reason,
    old_base_sha:null, current_base_sha:null, commits_ahead:null, evidence_url:null,
    is_pr_failure:false, requires_new_ci:null});
  if (pr?.state === 'closed' || pr?.merged_at) return {
    ...unknown('CLOSED_PR_NOT_IN_ACTIVE_COHORT'), state:'NOT_APPLICABLE'};
  if (pr?.state !== 'open' || pr?.base?.ref !== BASE ||
      pr?.base?.repo?.full_name !== REPO || !valid(pr.base.sha))
    return unknown('PR_BASE_IDENTITY_NOT_VERIFIED');
  if (production?.name !== BASE || production?.protected !== true ||
      !valid(production?.commit?.sha))
    return unknown('PROTECTED_PRODUCTION_HEAD_NOT_VERIFIED');
  const old = pr.base.sha.toLowerCase();
  const current = production.commit.sha.toLowerCase();
  if (old === current) return {schema:'HH_PR_BASE_ADVANCE_V1',signal:null,
    state:'ALIGNED_AT_SNAPSHOT',reason:'PR_BASE_EQUALS_PROTECTED_HEAD',
    old_base_sha:old,current_base_sha:current,commits_ahead:0,evidence_url:null,
    is_pr_failure:false,requires_new_ci:null};
  const unverified = reason => ({...unknown(reason),old_base_sha:old,current_base_sha:current});
  if (!comparison || comparison.status !== 'ahead' || comparison.behind_by !== 0 ||
      !Number.isSafeInteger(comparison.ahead_by) || comparison.ahead_by < 1 ||
      comparison.ahead_by > 100 || comparison.base_commit?.sha?.toLowerCase() !== old ||
      comparison.merge_base_commit?.sha?.toLowerCase() !== old ||
      !Array.isArray(comparison.commits) ||
      comparison.commits.length !== comparison.ahead_by ||
      comparison.commits.at(-1)?.sha?.toLowerCase() !== current)
    return unverified('NO_COMPLETE_ANCESTOR_PROOF');
  return {schema:'HH_PR_BASE_ADVANCE_V1', signal:'BASE_ADVANCED',state:'VERIFIED',
    reason:'PROTECTED_BASE_IS_ANCESTOR_OF_CURRENT_PRODUCTION',old_base_sha:old,
    current_base_sha:current,commits_ahead:comparison.ahead_by,
    evidence_url:'https://github.com/'+REPO+'/compare/'+old+'...'+current,
    is_pr_failure:false,requires_new_ci:null};
}
