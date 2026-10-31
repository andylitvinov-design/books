/**
 * The production review gate is deliberately fail-closed.
 * This module prepares policy only; it does not grant GitHub privileges.
 */
export const REPO = 'andylitvinov-design/books';
export const OWNER = 'andylitvinov-design';
export const BRANCH = 'codex/public-book-library';
export const RULESET_NAME = 'HH production · independent review (P0)';
export const REQUIRED_CHECK = 'release-ready';

export const CODEOWNER_PATHS = Object.freeze([
  '/.github/CODEOWNERS',
  '/.github/workflows/',
  '/lib/ci/',
  '/scripts/ci-*',
  '/scripts/pr-sweep-guard.mjs',
  '/middleware.ts',
  '/next.config.ts',
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
    '# Generated for andylitvinov-design/books, production codex/public-book-library.',
    '# Only activate after an independent HUMAN reviewer accepts GitHub WRITE access.',
    '# Managed by scripts/admin/production-review-gate.mjs; do not grant self-approval.',
    ...CODEOWNER_PATHS.map(path => `${path} @${login}`),
    '',
  ].join('\n');
}

export function assertCodeowners(content, input) {
  const login = verifiedReviewerLogin(input);
  if (typeof content !== 'string') throw new Error('PRODUCTION_CODEOWNERS_MISSING');
  const active = content.split(/\r?\n/)
    .map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  // CODEOWNERS is last-match-wins; reject *any* appended or reordered rule,
  // including a broad wildcard that would silently override a sensitive path.
  const expected = CODEOWNER_PATHS.map(path => `${path} @${login}`);
  if (active.length !== expected.length ||
      active.some((line, i) => line !== expected[i])) {
    throw new Error('PRODUCTION_CODEOWNERS_INCOMPLETE_OR_OVERRIDDEN');
  }
  return true;
}

export function productionRuleset() {
  return {
    name: RULESET_NAME,
    target: 'branch',
    enforcement: 'active',
    bypass_actors: [],
    conditions: {ref_name: {include: [`refs/heads/${BRANCH}`], exclude: []}},
    rules: [
      {type: 'deletion'},
      {type: 'non_fast_forward'},
      {type: 'pull_request', parameters: {
        allowed_merge_methods: ['squash'],
        dismiss_stale_reviews_on_push: true,
        require_code_owner_review: true,
        require_last_push_approval: true,
        required_approving_review_count: 1,
        required_review_thread_resolution: true,
      }},
      {type: 'required_status_checks', parameters: {
        strict_required_status_checks_policy: true,
        required_status_checks: [{context: REQUIRED_CHECK}],
      }},
    ],
  };
}

export function assertRulesetReadback(actual) {
  if (!actual || actual.name !== RULESET_NAME || actual.target !== 'branch' ||
      actual.enforcement !== 'active' || (actual.bypass_actors || []).length !== 0) {
    throw new Error('RULESET_NOT_ACTIVE_OR_HAS_BYPASS');
  }
  if (JSON.stringify(actual.conditions?.ref_name?.include) !== JSON.stringify([`refs/heads/${BRANCH}`]) ||
      (actual.conditions?.ref_name?.exclude || []).length !== 0) {
    throw new Error('RULESET_TARGET_MISMATCH');
  }
  const rules = actual.rules || [];
  for (const required of ['deletion', 'non_fast_forward']) {
    if (!rules.some(rule => rule.type === required)) throw new Error(`RULESET_MISSING:${required}`);
  }
  const pr = rules.find(rule => rule.type === 'pull_request')?.parameters;
  if (!pr || pr.required_approving_review_count < 1 ||
      !pr.require_code_owner_review || !pr.require_last_push_approval ||
      !pr.dismiss_stale_reviews_on_push || !pr.required_review_thread_resolution ||
      !pr.allowed_merge_methods?.includes('squash')) {
    throw new Error('RULESET_REVIEW_REQUIREMENTS_WEAK');
  }
  const checks = rules.find(rule => rule.type === 'required_status_checks')?.parameters;
  if (!checks || !checks.strict_required_status_checks_policy ||
      !checks.required_status_checks?.some(check => check.context === REQUIRED_CHECK)) {
    throw new Error('RULESET_CORE_CHECK_NOT_REQUIRED');
  }
  return true;
}
