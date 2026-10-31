#!/usr/bin/env node
/**
 * Read-only by default. The only settings write is a confirmed PUT upgrading
 * existing production ruleset #26269892 after effective CODEOWNERS is verified.
 * Requires a HUMAN reviewer with an accepted write invitation.
 * Never writes new rulesets, creates bypasses, merges PRs or echoes token data.
 */
import {
  REPO, BRANCH, RULESET_NAME, RULESET_ID, verifiedReviewerLogin,
  assertWritePermission, renderCodeowners, assertCodeowners,
  assertRulesetReadback, upgradeExistingRuleset,
} from '../../lib/ci/production-review-policy.mjs';

const [command, flag, candidate, confirm] = process.argv.slice(2);
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const hasReviewer = flag === '--reviewer' && typeof candidate === 'string';
const usage = 'Usage: node scripts/admin/production-review-gate.mjs inspect [--reviewer HUMAN_LOGIN] | codeowners --reviewer HUMAN_LOGIN | apply --reviewer HUMAN_LOGIN --confirm-active';
if (!['inspect', 'codeowners', 'apply'].includes(command) ||
    (!hasReviewer && (flag !== undefined || candidate !== undefined)) ||
    (command !== 'inspect' && (!hasReviewer || !token)) ||
    (command === 'apply' && confirm !== '--confirm-active') ||
    (command !== 'apply' && confirm !== undefined) ||
    (hasReviewer && !token)) {
  console.error(usage);
  process.exit(2);
}
const reviewer = hasReviewer ? verifiedReviewerLogin(candidate) : null;
const base = `https://api.github.com/repos/${REPO}`;
const api = async (path, method = 'GET', body) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? {'Authorization': `Bearer ${token}`} : {}),
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? {'Content-Type': 'application/json'} : {}),
    },
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  if (!response.ok) throw new Error(`GITHUB_API_${response.status}:${method}:${path.split('?')[0]}`);
  return response.json();
};

try {
  let permission = null;
  if (reviewer) {
    const response = await api(`/collaborators/${reviewer}/permission`);
    assertWritePermission(response.permission);
    permission = response.permission;
  }
  if (command === 'codeowners') {
    process.stdout.write(renderCodeowners(reviewer));
    process.exit(0);
  }

  const [branch, current] = await Promise.all([
    api(`/branches/${BRANCH}`),
    api(`/rulesets/${RULESET_ID}`),
  ]);
  if (branch.name !== BRANCH || !branch.protected) throw new Error('PRODUCTION_BRANCH_NOT_PROTECTED');
  assertRulesetReadback(current, {requireCodeOwner: false});

  let codeownersReady = false;
  let codeownersError = 'NOT_CHECKED_NO_REVIEWER';
  if (reviewer) {
    try {
      const file = await api(`/contents/.github/CODEOWNERS?ref=${encodeURIComponent(BRANCH)}`);
      if (file.encoding !== 'base64') throw new Error('UNKNOWN_CODEOWNERS_ENCODING');
      const content = Buffer.from(file.content, 'base64').toString('utf8');
      assertCodeowners(content, reviewer);
      codeownersReady = true;
      codeownersError = null;
    } catch (error) {
      codeownersError = String(error?.message || error);
      if (command === 'apply') throw error;
    }
  }

  const codeownerReviewEnabled = current.rules.find(rule => rule.type === 'pull_request')
    ?.parameters?.require_code_owner_review === true;
  if (command === 'inspect') {
    const status = codeownersReady && codeownerReviewEnabled ? 'CONFIGURED_REQUIRE_LIVE_E2E' : 'WAIT_CODEOWNER_REVIEW';
    console.log(JSON.stringify({repo: REPO, branch: BRANCH, protected: true,
      ruleset_id: RULESET_ID, ruleset_name: RULESET_NAME, reviewer, permission,
      codeownersReady, codeownersError, codeownerReviewEnabled,
      status, mergeAuthorized: false}, null, 2));
    process.exit(status === 'CONFIGURED_REQUIRE_LIVE_E2E' ? 0 : 3);
  }

  if (!codeownersReady) throw new Error('CODEOWNERS_MUST_MERGE_TO_PRODUCTION_FIRST');
  if (!codeownerReviewEnabled) {
    // Refuse to accidentally overwrite another actor's policy edit.
    const mostRecent = await api(`/rulesets/${RULESET_ID}`);
    if (current.updated_at !== mostRecent.updated_at ||
        JSON.stringify(current.rules) !== JSON.stringify(mostRecent.rules)) {
      throw new Error('RULESET_CHANGED_DURING_PRECHECK');
    }
    const upgrade = upgradeExistingRuleset(mostRecent);
    const response = await api(`/rulesets/${RULESET_ID}`, 'PUT', upgrade);
    assertRulesetReadback(response, {requireCodeOwner: true});
  }
  const [confirmed, protectedBranch] = await Promise.all([
    api(`/rulesets/${RULESET_ID}`), api(`/branches/${BRANCH}`),
  ]);
  assertRulesetReadback(confirmed, {requireCodeOwner: true});
  if (!protectedBranch.protected) throw new Error('PRODUCTION_LOST_PROTECTION');
  console.log(JSON.stringify({repo: REPO, branch: BRANCH,
    ruleset_id: RULESET_ID, reviewer, codeownerReviewEnabled: true,
    branchProtected: true, bypassActors: 0, mergeAuthorized: false,
    status: 'CONFIGURED_REQUIRE_LIVE_E2E',
    next: 'Verify a real green zero-review PR is blocked; obtain a separate human CODEOWNER APPROVE; verify protected squash merge and Vercel exact deployed SHA.'}, null, 2));
} catch (error) {
  console.error(String(error?.message || error));
  process.exitCode = 1;
}
