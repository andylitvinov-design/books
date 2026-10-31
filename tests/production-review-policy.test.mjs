import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REPO, BRANCH, CODEOWNER_PATHS, REQUIRED_CHECK, verifiedReviewerLogin,
  assertWritePermission, renderCodeowners, assertCodeowners,
  productionRuleset, assertRulesetReadback,
} from '../lib/ci/production-review-policy.mjs';

const reviewer = 'Independent-Reviewer';

test('fixed production repo and real separate human account', () => {
  assert.equal(REPO, 'andylitvinov-design/books');
  assert.equal(BRANCH, 'codex/public-book-library');
  assert.equal(verifiedReviewerLogin(reviewer), reviewer);
  for (const bad of ['', '@someone', 'andylitvinov-design', 'andylitvinov-design[bot]', '../bad', 'example-bot']) {
    assert.throws(() => verifiedReviewerLogin(bad), /REVIEWER/);
  }
});

test('reviewer must have accepted repository write access, not triage or pending invite', () => {
  for (const allowed of ['write', 'maintain', 'admin']) assert.equal(assertWritePermission(allowed), true);
  for (const denied of ['none', 'read', 'triage', undefined]) assert.throws(() => assertWritePermission(denied), /WRITE_ACCESS/);
});

test('CODEOWNERS protects CI, auth, payments, migrations, and itself', () => {
  const content = renderCodeowners(reviewer);
  assert.ok(CODEOWNER_PATHS.includes('/.github/CODEOWNERS'));
  assert.ok(CODEOWNER_PATHS.includes('/app/api/payments/'));
  assert.ok(CODEOWNER_PATHS.includes('/app/api/client-access/'));
  assert.ok(CODEOWNER_PATHS.includes('/supabase/'));
  assert.ok(CODEOWNER_PATHS.includes('/.github/workflows/'));
  assert.equal(assertCodeowners(content, reviewer), true);
  assert.throws(() => assertCodeowners(content.replace('/app/api/payments/', '/app/api/other/'), reviewer), /INCOMPLETE_OR_OVERRIDDEN/);
  assert.throws(() => assertCodeowners(content + '\n/app/api/payments/ @andylitvinov-design\n', reviewer), /INCOMPLETE_OR_OVERRIDDEN/);
  assert.throws(() => assertCodeowners(content + '\n* @andylitvinov-design\n', reviewer), /INCOMPLETE_OR_OVERRIDDEN/);
});

test('ruleset active, unbypassable, exact production ref, review and core gate required', () => {
  const ruleset = productionRuleset();
  assert.equal(assertRulesetReadback(ruleset), true);
  assert.deepEqual(ruleset.bypass_actors, []);
  assert.ok(ruleset.rules.find(x => x.type === 'required_status_checks')
    .parameters.required_status_checks.some(x => x.context === REQUIRED_CHECK));
  const edit = transform => JSON.parse(JSON.stringify(transform));
  assert.throws(() => assertRulesetReadback({...ruleset, bypass_actors: [{actor_id: 5}]}), /BYPASS/);
  assert.throws(() => assertRulesetReadback({...ruleset, enforcement: 'evaluate'}), /ACTIVE/);
  assert.throws(() => assertRulesetReadback({...ruleset, conditions: {ref_name:{include:['refs/heads/codex/bootstrap-books'],exclude:[]}}}), /TARGET/);
  const withoutReview = edit(ruleset); withoutReview.rules.find(x => x.type === 'pull_request').parameters.required_approving_review_count = 0;
  assert.throws(() => assertRulesetReadback(withoutReview), /WEAK/);
  const withoutCodeowner = edit(ruleset); withoutCodeowner.rules.find(x => x.type === 'pull_request').parameters.require_code_owner_review = false;
  assert.throws(() => assertRulesetReadback(withoutCodeowner), /WEAK/);
  const withoutCore = edit(ruleset); withoutCore.rules.find(x => x.type === 'required_status_checks').parameters.required_status_checks = [];
  assert.throws(() => assertRulesetReadback(withoutCore), /CORE_CHECK/);
});
