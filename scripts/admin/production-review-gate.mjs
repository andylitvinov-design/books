#!/usr/bin/env node
/**
 * Admin-only, opt-in production review configuration. Default is read-only.
 * Never sends GH_TOKEN to stdout or logs.
 *
 * Usage:
 * GH_TOKEN=... node scripts/admin/production-review-gate.mjs inspect --reviewer USER
 * GH_TOKEN=... node scripts/admin/production-review-gate.mjs codeowners --reviewer USER
 * GH_TOKEN=... node scripts/admin/production-review-gate.mjs apply --reviewer USER --confirm-active
 */
import {
  REPO, BRANCH, RULESET_NAME, verifiedReviewerLogin, assertWritePermission,
  renderCodeowners, assertCodeowners, productionRuleset, assertRulesetReadback,
} from '../../lib/ci/production-review-policy.mjs';

const [command, flag, candidate, confirm] = process.argv.slice(2);
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!['inspect', 'codeowners', 'apply'].includes(command) || flag !== '--reviewer' || !token ||
    (command === 'apply' && confirm !== '--confirm-active') ||
    (command !== 'apply' && confirm !== undefined)) {
  console.error('Usage: GH_TOKEN=... node scripts/admin/production-review-gate.mjs inspect|codeowners|apply --reviewer HUMAN_LOGIN [--confirm-active for apply]');
  process.exit(2);
}
const reviewer = verifiedReviewerLogin(candidate);
const base = `https://api.github.com/repos/${REPO}`;
const api = async (path, method = 'GET', body) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
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
  const permission = await api(`/collaborators/${reviewer}/permission`);
  assertWritePermission(permission.permission);
  if (command === 'codeowners') {
    process.stdout.write(renderCodeowners(reviewer));
    process.exit(0);
  }

  const branch = await api(`/branches/${BRANCH}`);
  if (branch.name !== BRANCH) throw new Error('WRONG_PRODUCTION_BRANCH');
  const existing = await api('/rulesets?includes_parents=true');
  const target = existing.filter(rule => rule.name === RULESET_NAME);
  if (target.length > 1) throw new Error('DUPLICATE_PRODUCTION_RULESETS');

  // `inspect` reports missing CODEOWNERS and rulesets without writing anything.
  let codeownersReady = false;
  try {
    const file = await api(`/contents/.github/CODEOWNERS?ref=${encodeURIComponent(BRANCH)}`);
    if (file.encoding !== 'base64') throw new Error('UNKNOWN_CODEOWNERS_ENCODING');
    const content = Buffer.from(file.content, 'base64').toString('utf8');
    assertCodeowners(content, reviewer);
    codeownersReady = true;
  } catch (error) {
    if (command === 'apply') throw error;
  }

  if (command === 'inspect') {
    let rulesetReady = false;
    if (target.length === 1) {
      const readback = await api(`/rulesets/${target[0].id}`);
      try { assertRulesetReadback(readback); rulesetReady = true; } catch {}
    }
    console.log(JSON.stringify({repo: REPO, branch: BRANCH, reviewer, permission: permission.permission,
      codeownersReady, rulesetReady, branchProtected: branch.protected,
      acceptance: codeownersReady && rulesetReady && branch.protected ? 'CONFIGURED_NOT_E2E_VERIFIED' : 'BLOCKED'}, null, 2));
    process.exit(codeownersReady && rulesetReady && branch.protected ? 0 : 3);
  }

  // Never create an active ruleset before CODEOWNERS is actually on production.
  if (!codeownersReady) throw new Error('CODEOWNERS_MUST_MERGE_TO_PRODUCTION_FIRST');
  if (target.length === 1) {
    const readback = await api(`/rulesets/${target[0].id}`);
    assertRulesetReadback(readback);
  } else {
    const created = await api('/rulesets', 'POST', productionRuleset());
    const readback = await api(`/rulesets/${created.id}`);
    assertRulesetReadback(readback);
  }
  const confirmed = await api(`/branches/${BRANCH}`);
  if (!confirmed.protected) throw new Error('RULESET_CREATED_BUT_BRANCH_NOT_PROTECTED');
  console.log(JSON.stringify({repo: REPO, branch: BRANCH, reviewer,
    ruleset: RULESET_NAME, rulesetActive: true, branchProtected: true,
    acceptance: 'CONFIGURED_NOT_E2E_VERIFIED',
    next: 'Prove PR without approval BLOCKED, approved exact-head green PR MERGEABLE using separate human accounts.'}, null, 2));
} catch (error) {
  console.error(String(error?.message || error));
  process.exitCode = 1;
}
