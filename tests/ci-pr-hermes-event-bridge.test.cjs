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
  ] }]);
  assert.equal(result.category, 'TYPESCRIPT');
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
  assert.equal(buildDiagnostics([{name:'unit-tests',conclusion:'failure'}]).category,'TEST_FAILURE');
  assert.equal(buildDiagnostics([{name:'vitest',conclusion:'failure'}]).category,'TEST_FAILURE');
  assert.equal(buildDiagnostics([{name:'typescript-check',conclusion:'failure'}]).category,'TYPESCRIPT');
});
