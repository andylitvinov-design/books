'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveExactPR, buildDiagnostics, sendWorkflowFailure } =
  require('../scripts/ci-pr-hermes-event-bridge.cjs');

const REPO = 'andylitvinov-design/books';
const HEAD = 'a'.repeat(40);
const BASE_SHA = 'b'.repeat(40);
const RUN_SHA = 'c'.repeat(40);

function makePR(overrides = {}) {
  return {
    number: 44, state: 'open', draft: false,
    base: { ref: 'codex/public-book-library', sha: BASE_SHA, repo: { full_name: REPO } },
    head: { ref: 'fix/repair', sha: HEAD, repo: { full_name: REPO } },
    ...overrides
  };
}
function makeRun(prLinks = [{ number: 44, head: { sha: HEAD } }]) {
  return {
    id: 123, run_attempt: 2, name: 'HH PR core release gate',
    path: '.github/workflows/hh-pr-core-release.yml',
    event: 'pull_request', status: 'completed', conclusion: 'failure',
    head_branch: 'fix/repair', head_sha: RUN_SHA,
    repository: { full_name: REPO }, head_repository: { full_name: REPO },
    pull_requests: prLinks
  };
}

test('event link is revalidated against live exact-head PR', async () => {
  const pr = makePR();
  const github = { rest: { pulls: { get: async () => ({ data: pr }) } } };
  const result = await resolveExactPR({ github, owner: 'andylitvinov-design', repo: 'books', workflowRun: makeRun() });
  assert.equal(result.ok, true);
  assert.equal(result.pullRequest.number, 44);
  assert.equal(result.pullRequest.head.sha, HEAD);
});

test('empty GitHub PR association resolves only one branch-and-SHA exact live PR', async () => {
  const pr = makePR();
  const run = makeRun([]);
  run.head_sha = HEAD;
  const github = { rest: { pulls: { list: async () => ({ data: [pr] }) } } };
  const result = await resolveExactPR({ github, owner: 'andylitvinov-design', repo: 'books', workflowRun: run });
  assert.equal(result.ok, true);
  assert.equal(result.pullRequest.number, 44);
  assert.equal(result.pullRequest.head.sha, HEAD);
});

test('stale, ambiguous and moved associations fail closed', async () => {
  const pr = makePR();
  const github = { rest: { pulls: {
    get: async () => ({ data: makePR({ head: { ...pr.head, sha: 'd'.repeat(40) } }) }),
    list: async () => ({ data: [pr, makePR({ number: 45, head: { ...pr.head } })] })
  } } };
  const stale = await resolveExactPR({ github, owner: 'andylitvinov-design', repo: 'books', workflowRun: makeRun() });
  assert.equal(stale.reason, 'EVENT_PR_HEAD_MOVED');
  const ambiguous = await resolveExactPR({ github, owner: 'andylitvinov-design', repo: 'books', workflowRun: makeRun([]) });
  assert.equal(ambiguous.reason, 'NO_UNIQUE_EXACT_HEAD_PR');
});

test('failure diagnostics are bounded and classified without logs or source contents', () => {
  const result = buildDiagnostics([{ name: 'typecheck', conclusion: 'failure', steps: [
    { name: 'tsc --noEmit', conclusion: 'failure' }, { name: 'build', conclusion: 'success' }
  ] }], makePR());
  assert.equal(result.category, 'TYPESCRIPT');
  assert.equal(result.classification.schema, 'HH_CI_ERROR_CLASSIFICATION_V1');
  assert.equal(result.classification.reason_code, 'FAILED_TYPESCRIPT_STEP');
  assert.equal(result.classification.source_write_authorized, false);
  assert.equal(result.classification.execution_authorized, false);
  assert.deepEqual(result.failedJobs, ['typecheck']);
  assert.deepEqual(result.failedSteps, ['typecheck / tsc --noEmit']);
});

test('bridge does not send when GitHub OIDC token is absent', async () => {
  let calls = 0;
  const warnings = [];
  const result = await sendWorkflowFailure({
    github: {}, context: {}, core: { warning: (v) => warnings.push(v) },
    oidcToken: '', fetchImpl: async () => { calls++; }
  });
  assert.equal(result.sent, false);
  assert.equal(result.outcome, 'BRIDGE_DISABLED_MISSING_OIDC_TOKEN');
  assert.equal(calls, 0);
  assert.equal(warnings.length, 1);
});

test('bridge sends GitHub OIDC-authenticated event to the fixed Commander inbox endpoint', async () => {
  const pr = makePR();
  const github = {
    rest: {
      pulls: { get: async () => ({ data: pr }) },
      actions: { listJobsForWorkflowRun: async () => ({ data: { jobs: [
        { name: 'typecheck', conclusion: 'failure', steps: [{ name: 'tsc', conclusion: 'failure' }] }
      ] } }) }
    }
  };
  let request;
  const info = [];
  const result = await sendWorkflowFailure({
    github,
    context: { repo: { owner: 'andylitvinov-design', repo: 'books' }, payload: { workflow_run: makeRun() } },
    core: { info: (v) => info.push(v), warning: () => {} },
    oidcToken: 'x'.repeat(180),
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 202, text: async () => JSON.stringify({ accepted: true, outcome: 'RECORDED', pr_number: 44, inbox_id: 'abc' }) };
    }
  });
  assert.equal(request.url, 'https://shervdixkaxurnaecioe.supabase.co/functions/v1/agent-commander-private-store-v1/webhooks/github-workflow-run');
  assert.equal(request.options.headers.authorization, 'Bearer ' + 'x'.repeat(180));
  assert.equal(request.options.headers['x-hermes-secret'], undefined);
  assert.equal(JSON.parse(request.options.body).diagnostics.category, 'TYPESCRIPT');
  assert.equal(JSON.parse(request.options.body).diagnostics.classification.ruleset_version, '1.1.0');
  assert.equal(result.accepted, true);
  assert.equal(result.prNumber, 44);
  assert.equal(result.inboxId, 'abc');
  assert.equal(info.length, 1);
});

test('empty association with a synthetic or stale run SHA does not guess the PR source HEAD', async () => {
  const pr = makePR();
  const github = { rest: { pulls: { list: async () => ({ data: [pr] }) } } };
  const result = await resolveExactPR({ github, owner: 'andylitvinov-design', repo: 'books', workflowRun: makeRun([]) });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'NO_UNIQUE_EXACT_HEAD_PR');
});

test('specialist gate failures are not misclassified as test failures by the substring spec', () => {
  const result = buildDiagnostics([
    { name: 'hh-specialist', conclusion: 'failure', steps: [
      { name: 'Validate exact-head risk and required specialist workflows', conclusion: 'failure' }
    ] },
    { name: 'hh-merge-check', conclusion: 'failure', steps: [
      { name: 'Require real Core and specialist results from this workflow', conclusion: 'failure' }
    ] }
  ]);
  assert.equal(result.category, 'UNKNOWN');
  assert.deepEqual(result.failedJobs, ['hh-specialist', 'hh-merge-check']);
  assert.equal(buildDiagnostics([{name:'unit-tests',conclusion:'failure'}],makePR()).category,'TEST_FAILURE');
  assert.equal(buildDiagnostics([{name:'vitest',conclusion:'failure'}],makePR()).category,'TEST_FAILURE');
  assert.equal(buildDiagnostics([{name:'jest',conclusion:'failure'}],makePR()).category,'TEST_FAILURE');
  assert.equal(buildDiagnostics([{name:'typescript-check',conclusion:'failure'}],makePR()).category,'TYPESCRIPT');
  assert.equal(buildDiagnostics([{name:'typescript_build',conclusion:'failure'}],makePR()).category,'TYPESCRIPT');
  assert.equal(buildDiagnostics([{name:'TypeScript compile',conclusion:'failure'}],makePR()).category,'TYPESCRIPT');
});


test('event bridge uses the shared 13-family classifier and keeps policy precedence diagnostic-only',()=>{
 const cases=[
  {step:'Secret scan failed',category:'SECURITY',status:'MANUAL_REQUIRED'},
  {step:'Resource not accessible by integration',category:'ACCESS_CONFIG',status:'WAITING_INPUT'},
  {step:'Unmerged paths detected',category:'MERGE_CONFLICT',status:'MANUAL_REQUIRED'},
  {step:'BASE_ADVANCED production-base mismatch',category:'BASE_ADVANCED',status:'REROUTED'},
  {step:'Runner startup_failure',conclusion:'startup_failure',category:'INFRASTRUCTURE',status:'RETRY_SCHEDULED'},
  {step:'Prompt missing; executor not invoked',category:'AUTOMATION_PROCESS',status:'REROUTED'},
  {step:'OpenRouter model response invalid',category:'AI_EXECUTOR',status:'REROUTED'},
  {step:'Supabase schema mismatch',category:'INTEGRATION',status:'REROUTED'},
  {step:'TypeScript check',category:'TYPESCRIPT',status:'REROUTED'},
  {step:'Run WebKit E2E tests',category:'TEST_FAILURE',status:'REROUTED'},
  {step:'Cannot find module ./missing',category:'SOURCE_CODE',status:'REROUTED'},
  {step:'Opaque proprietary action',category:'UNKNOWN',status:'UNCLASSIFIED'}
 ];
 for(const item of cases){
  const diagnostics=buildDiagnostics([{name:'diagnostic',conclusion:item.conclusion||'failure',
    steps:[{name:item.step,conclusion:item.conclusion||'failure'}]}],makePR());
  assert.equal(diagnostics.category,item.category,item.step);
  assert.equal(diagnostics.classification.recommended_status,item.status,item.step);
  assert.equal(diagnostics.classification.status,'DIAGNOSTIC_ONLY',item.step);
  assert.equal(diagnostics.classification.source_write_authorized,false,item.step);
  assert.equal(diagnostics.classification.execution_authorized,false,item.step);
  assert.ok(diagnostics.classification.responsible_role,item.step);
 }
});

test('event bridge cannot infer conflict from green jobs or stale labels',()=>{
 const green=buildDiagnostics([{name:'merge-tree',conclusion:'success',steps:[
   {name:'Unmerged paths',conclusion:'success'}]}],makePR({labels:[{name:'hh:conflict-repair-needed'}]}));
 assert.equal(green.category,'UNKNOWN');
 assert.equal(green.classification.retry.allowed,false);
});

test('event bridge preserves exact live dirty mergeability for conflict classification',()=>{
 const liveDirty=makePR({mergeable:false,mergeable_state:'dirty'});
 const exact=JSON.parse(JSON.stringify(liveDirty));
 const { exactPullRequestLink }=require('../scripts/ci-pr-hermes-event-bridge.cjs');
 const snapshot=exactPullRequestLink(exact);
 assert.equal(snapshot.mergeable,false);
 assert.equal(snapshot.mergeable_state,'dirty');
 const result=buildDiagnostics([{name:'merge-check',conclusion:'failure',steps:[]}],snapshot);
 assert.equal(result.category,'MERGE_CONFLICT');
 assert.equal(result.classification.responsible_role,'semantic-conflict-resolver');
 assert.equal(result.classification.retry.allowed,false);
});


test('known real Specialist proof gate becomes an owner-visible CI routing strategy',()=>{
 const jobs=[
  {name:'core-lint-types-build',conclusion:'success',steps:[]},
  {name:'hh-specialist',conclusion:'failure',steps:[{name:'Validate exact-head risk and required specialist workflows',conclusion:'failure'}]},
  {name:'hh-merge-check',conclusion:'failure',steps:[{name:'Require real Core and specialist results from this workflow',conclusion:'failure'}]}
 ];
 const d=buildDiagnostics(jobs,makePR());
 assert.equal(d.category,'BASE_OR_CI_ROUTING');
 assert.equal(d.classification.reason_code,'SPECIALIST_REQUIRED_PROOF_MISSING_OR_STALE');
 assert.equal(d.classification.strategy_code,'CI_ROUTING_DIAGNOSIS');
 assert.equal(d.classification.next_action,'INSPECT_REQUIRED_HEAD_CHECKS');
 assert.equal(d.classification.retry.max_attempts,1);
 assert.equal(d.classification.execution_authorized,false);
});


test('signed Core source-test incident preserves causal job/step across Commander handoff',()=>{
 const {repairableCoreTestFailure}=require('../scripts/ci-pr-error-task.cjs');
 const step='Mobile Dock Core geometry and iPhone keyboard contracts';
 const d=buildDiagnostics([{name:'core-lint-types-build',conclusion:'failure',
  steps:[{name:step,conclusion:'failure'}]}],makePR());
 assert.equal(d.category,'TEST_FAILURE');
 assert.equal(d.classification.reason_code,'FAILED_TEST_STEP_REQUIRES_TRIAGE');
 assert.equal(d.classification.evidence_code,'FAILED_TEST_STEP_REQUIRES_TRIAGE');
 assert.equal(d.classification.failed_job,'core-lint-types-build');
 assert.equal(d.classification.failed_step,step);
 assert.equal(d.failedSteps[0],'core-lint-types-build / '+step);
 assert.equal(repairableCoreTestFailure(d.classification),true);
 const blocked=buildDiagnostics([{name:'hh-specialist',conclusion:'failure',
  steps:[{name:'WebKit test',conclusion:'failure'}]}],makePR());
 assert.equal(repairableCoreTestFailure(blocked.classification),false);
});
