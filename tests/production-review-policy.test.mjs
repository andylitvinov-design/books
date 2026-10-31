import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REPO, BRANCH, RULESET_ID, RULESET_NAME, CODEOWNER_PATHS,
  REQUIRED_CHECK, REQUIRED_INTEGRATION_ID, verifiedReviewerLogin,
  assertWritePermission, renderCodeowners, assertCodeowners,
  assertRulesetReadback, upgradeExistingRuleset,
} from '../lib/ci/production-review-policy.mjs';

const human = 'Independent-Reviewer';
const fixture = () => ({
  id: RULESET_ID,
  name: RULESET_NAME,
  target: 'branch', source: REPO, source_type: 'Repository',
  enforcement: 'active', bypass_actors: [], current_user_can_bypass: 'never',
  conditions: {ref_name:{include:[`refs/heads/${BRANCH}`],exclude:[]}},
  rules: [
    {type:'deletion'}, {type:'non_fast_forward'},
    {type:'pull_request',parameters:{
      required_approving_review_count:1,
      dismiss_stale_reviews_on_push:true,
      required_reviewers:[],
      require_code_owner_review:false,
      require_last_push_approval:true,
      required_review_thread_resolution:true,
      require_extra_approval_for_unattributed_changes:true,
      allowed_merge_methods:['squash'],
    }},
    {type:'required_status_checks',parameters:{
      strict_required_status_checks_policy:true,
      do_not_enforce_on_create:false,
      required_status_checks:[{context:REQUIRED_CHECK,integration_id:REQUIRED_INTEGRATION_ID}],
    }},
  ],
});
const copy = x => JSON.parse(JSON.stringify(x));

test('production target is fixed and the human reviewer is not the author or a bot', () => {
  assert.equal(REPO,'andylitvinov-design/books');
  assert.equal(BRANCH,'codex/public-book-library');
  assert.equal(RULESET_ID,26269892);
  assert.equal(verifiedReviewerLogin(human),human);
  for(const name of ['', '@someone','andylitvinov-design','andylitvinov-design[bot]','a-bot','../bad']) {
    assert.throws(()=>verifiedReviewerLogin(name),/REVIEWER/);
  }
});

test('collaborator must accept at least write; pending invite and read are insufficient', () => {
  for (const x of ['write','maintain','admin']) assert.equal(assertWritePermission(x),true);
  for (const x of [null,'read','triage',undefined]) assert.throws(()=>assertWritePermission(x),/WRITE_ACCESS/);
});

test('CODEOWNERS last-match-wins guard covers CI, login, billing, deployments, migrations, itself', () => {
  const content=renderCodeowners(human);
  for(const path of ['/.github/CODEOWNERS','/.github/workflows/','/scripts/admin/production-review-gate.mjs','/vercel.json',
    '/lib/security/','/app/api/payments/','/app/api/client-access/','/supabase/']) {
    assert.ok(CODEOWNER_PATHS.includes(path),path);
  }
  assert.equal(assertCodeowners(content,human),true);
  assert.throws(()=>assertCodeowners(content.replace('/app/api/payments/','/app/api/other/'),human),/OVERRIDDEN/);
  assert.throws(()=>assertCodeowners(content+'\n/app/api/payments/ @andylitvinov-design\n',human),/OVERRIDDEN/);
  assert.throws(()=>assertCodeowners(content+'\n* @andylitvinov-design\n',human),/OVERRIDDEN/);
});

test('live P0 ruleset is recognized as already protected but awaiting CODEOWNER', () => {
  assert.equal(assertRulesetReadback(fixture(),{requireCodeOwner:false}),true);
  assert.throws(()=>assertRulesetReadback(fixture()),/WEAK/);
});

test('upgrade changes only codeowner flag, never adds a second ruleset or drops GitHub Actions binding', () => {
  const current=fixture();
  const original=copy(current);
  const patch=upgradeExistingRuleset(current);
  assert.deepEqual(current,original,'must not mutate live snapshot');
  assert.equal(patch.name,RULESET_NAME);
  assert.equal(patch.rules.find(x=>x.type==='pull_request').parameters.require_code_owner_review,true);
  assert.deepEqual(patch.rules.find(x=>x.type==='required_status_checks'),
    current.rules.find(x=>x.type==='required_status_checks'));
  assert.deepEqual(patch.rules.filter(x=>x.type!=='pull_request'),
    current.rules.filter(x=>x.type!=='pull_request'));
  assert.deepEqual(patch.bypass_actors,[]);
  assert.equal(assertRulesetReadback({...current,...patch}),true);
  const fullyUpdated={...current,...patch};
  assert.deepEqual(upgradeExistingRuleset(fullyUpdated),patch,'idempotent');
});

test('reject weak/outdated/misidentified rulesets before any PUT', () => {
  const mutate = fn => {const x=fixture();fn(x);return x};
  for(const x of [
    mutate(x=>x.id=1), mutate(x=>x.name='HH production · independent review (P0)'),
    mutate(x=>x.enforcement='evaluate'), mutate(x=>x.bypass_actors=[{actor_id:5}]),
    mutate(x=>x.conditions.ref_name.include=['refs/heads/codex/bootstrap-books']),
    mutate(x=>x.rules.find(r=>r.type==='pull_request').parameters.required_approving_review_count=0),
    mutate(x=>x.rules.find(r=>r.type==='pull_request').parameters.allowed_merge_methods.push('merge')),
    mutate(x=>x.rules.find(r=>r.type==='pull_request').parameters.require_last_push_approval=false),
    mutate(x=>x.rules.find(r=>r.type==='pull_request').parameters.require_extra_approval_for_unattributed_changes=false),
    mutate(x=>x.rules.find(r=>r.type==='required_status_checks').parameters.required_status_checks[0].integration_id=999),
    mutate(x=>x.rules.find(r=>r.type==='required_status_checks').parameters.strict_required_status_checks_policy=false),
  ]) {
    assert.throws(()=>upgradeExistingRuleset(x),/RULESET/);
  }
});
