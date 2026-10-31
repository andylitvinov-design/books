/**
 * Immutable P0 safeguards for the EXISTING, active production ruleset.
 * This module cannot invite reviewers, create approvals or apply GitHub settings.
 * All admin changes require a separate explicitly confirmed CLI invocation.
 */
export const REPO = 'andylitvinov-design/books';
export const OWNER = 'andylitvinov-design';
export const BRANCH = 'codex/public-book-library';
export const RULESET_ID = 26269892;
export const RULESET_NAME = 'Holistic House · production release protection';
export const REQUIRED_CHECK = 'release-ready';
export const REQUIRED_INTEGRATION_ID = 15368; // GitHub Actions; refuse similarly named status from another app.

export const CODEOWNER_PATHS = Object.freeze([
  '/.github/CODEOWNERS',
  '/.github/',
  '/.github/workflows/',
  '/lib/ci/',
  '/scripts/ci-*',
  '/scripts/pr-sweep-guard.mjs',
  '/scripts/admin/production-review-gate.mjs',
  '/tests/ci-*',
  '/tests/pr-fast-lane.test.mjs',
  '/tests/pr-sweep-guard.test.mjs',
  '/tests/production-review-policy.test.mjs',
  '/middleware.ts',
  '/next.config.ts',
  '/vercel.json',
  '/lib/security/',
  '/app/api/admin/',
  '/app/api/app/',
  '/app/api/client/',
  '/app/api/client-access/',
  '/app/api/client-session-access/',
  '/app/api/client-session-viewer/',
  '/app/api/prescription-access/',
  '/app/api/prescriptions/',
  '/app/api/billing/',
  '/app/api/payments/',
  '/app/api/marketplace/',
  '/lib/billing/',
  '/lib/commerce/',
  '/sql/',
  '/supabase/',
]);

export function verifiedReviewerLogin(input) {
  const login = String(input ?? '').trim();
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(login) ||
      login.toLowerCase() === OWNER || /bot$/i.test(login)) {
    throw new Error('REVIEWER_MUST_BE_A_REAL_INDEPENDENT_GITHUB_LOGIN');
  }
  // Syntax is only a precheck. The real-human identity and invitation require human confirmation.
  return login;
}

export function assertWritePermission(permission) {
  if (!['write', 'maintain', 'admin'].includes(permission)) {
    throw new Error(`REVIEWER_NOT_ACCEPTED_WITH_WRITE_ACCESS:${permission ?? 'unknown'}`);
  }
  return true;
}

export function renderCodeowners(input) {
  const login = verifiedReviewerLogin(input);
  return [
    '# Holistic House production CODEOWNERS: CI, security, auth, payments, database.',
    '# Requires an independently verified human with accepted GitHub Write access.',
    '# In CODEOWNERS the LAST matching rule wins; do not append overriding patterns.',
    ...CODEOWNER_PATHS.map(path => `${path} @${login}`),
    '',
  ].join('\n');
}

export function assertCodeowners(content, input) {
  const login = verifiedReviewerLogin(input);
  if (typeof content !== 'string') throw new Error('PRODUCTION_CODEOWNERS_MISSING');
  const active = content.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  const expected = CODEOWNER_PATHS.map(path => `${path} @${login}`);
  if (active.length !== expected.length || active.some((line, index) => line !== expected[index])) {
    throw new Error('PRODUCTION_CODEOWNERS_INCOMPLETE_OR_OVERRIDDEN');
  }
  return true;
}

/**
 * Recognize the actual protected production ruleset from live GitHub readback.
 * Before the CODEOWNERS file lands, requireCodeOwner=false is a transitional
 * inspection state only; it is NOT acceptance and NOT authorization to merge.
 */
export function assertRulesetReadback(actual, {requireCodeOwner = true} = {}) {
  if (!actual || actual.id !== RULESET_ID || actual.name !== RULESET_NAME ||
      actual.target !== 'branch' || actual.enforcement !== 'active' ||
      actual.source !== REPO || actual.source_type !== 'Repository' ||
      (actual.bypass_actors || []).length !== 0 ||
      (actual.current_user_can_bypass && actual.current_user_can_bypass !== 'never')) {
    throw new Error('RULESET_UNKNOWN_INACTIVE_OR_HAS_BYPASS');
  }
  const ref = actual.conditions?.ref_name;
  if (JSON.stringify(ref?.include) !== JSON.stringify([`refs/heads/${BRANCH}`]) ||
      JSON.stringify(ref?.exclude) !== '[]') {
    throw new Error('RULESET_TARGET_MISMATCH');
  }
  const rules = actual.rules || [];
  for (const type of ['deletion', 'non_fast_forward']) {
    if (rules.filter(rule => rule.type === type).length !== 1) throw new Error(`RULESET_MISSING_OR_DUPLICATE:${type}`);
  }
  const pull = rules.filter(rule => rule.type === 'pull_request');
  if (pull.length !== 1) throw new Error('RULESET_REVIEW_RULE_MISSING_OR_DUPLICATE');
  const p = pull[0].parameters;
  if (!p || p.required_approving_review_count < 1 || !p.require_last_push_approval ||
      !p.dismiss_stale_reviews_on_push || !p.required_review_thread_resolution ||
      !p.require_extra_approval_for_unattributed_changes ||
      JSON.stringify(p.allowed_merge_methods) !== '["squash"]' ||
      !Array.isArray(p.required_reviewers) || p.required_reviewers.length !== 0 ||
      (requireCodeOwner && !p.require_code_owner_review)) {
    throw new Error('RULESET_REVIEW_REQUIREMENTS_WEAK');
  }
  const required = rules.filter(rule => rule.type === 'required_status_checks');
  if (required.length !== 1 || !required[0].parameters?.strict_required_status_checks_policy ||
      required[0].parameters?.do_not_enforce_on_create !== false ||
      !required[0].parameters?.required_status_checks?.some(check =>
        check.context === REQUIRED_CHECK && check.integration_id === REQUIRED_INTEGRATION_ID)) {
    throw new Error('RULESET_CORE_CHECK_OR_APP_WEAK');
  }
  return true;
}

/**
 * Safe, single-field upgrade on existing ruleset #26269892 only.
 * Never create a parallel ruleset or drop existing checks/rule fields.
 */
export function upgradeExistingRuleset(actual) {
  assertRulesetReadback(actual, {requireCodeOwner: false});
  const rules = actual.rules.map(rule => rule.type === 'pull_request'
    ? {...rule, parameters: {...rule.parameters, require_code_owner_review: true}}
    : {...rule});
  const body = {
    name: RULESET_NAME,
    target: 'branch',
    enforcement: 'active',
    bypass_actors: [],
    conditions: actual.conditions,
    rules,
  };
  assertRulesetReadback({...actual, ...body}, {requireCodeOwner: true});
  return body;
}
