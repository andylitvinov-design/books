'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCoreFailureEvent, diagnosticsFromJobs, CORE_WORKFLOW_PATH } = require('./ci-hermes-event-forwarder.cjs');

const SHA = 'a'.repeat(40);
function fixture(overrides = {}) {
  return {
    action: 'completed',
    workflow_run: {
      id: 12345,
      run_attempt: 1,
      name: 'HH PR core release gate',
      path: CORE_WORKFLOW_PATH + '@refs/heads/codex/bootstrap-books',
      event: 'pull_request',
      status: 'completed',
      conclusion: 'failure',
      head_branch: 'feature/fix',
      repository: { full_name: 'andylitvinov-design/books' },
      head_repository: { full_name: 'andylitvinov-design/books' },
      pull_requests: [{
        number: 4049,
        head: { sha: SHA, ref: 'feature/fix', repo: { full_name: 'andylitvinov-design/books' } },
        base: { ref: 'codex/bootstrap-books', repo: { full_name: 'andylitvinov-design/books' } }
      }],
      ...overrides
    }
  };
}

test('accepts one same-repository Core failure with exact PR source SHA', () => {
  const result = validateCoreFailureEvent(fixture());
  assert.equal(result.ok, true);
  assert.equal(result.value.runId, 12345);
  assert.equal(result.value.prNumber, 4049);
  assert.equal(result.value.sourceSha, SHA);
});

test('rejects success and non-terminal runs', () => {
  assert.equal(validateCoreFailureEvent(fixture({ conclusion: 'success' })).reason, 'EVENT_NOT_IN_SCOPE');
  assert.equal(validateCoreFailureEvent(fixture({ status: 'in_progress' })).reason, 'EVENT_NOT_IN_SCOPE');
});

test('rejects another workflow even when its display name is spoofed', () => {
  assert.equal(validateCoreFailureEvent(fixture({ path: '.github/workflows/other.yml' })).reason, 'EVENT_NOT_IN_SCOPE');
});

test('rejects forked or foreign repository runs', () => {
  assert.equal(validateCoreFailureEvent(fixture({ head_repository: { full_name: 'fork/books' } })).reason, 'UNTRUSTED_REPOSITORY');
});

test('rejects missing, ambiguous or stale PR association', () => {
  assert.equal(validateCoreFailureEvent(fixture({ pull_requests: [] })).reason, 'PR_ASSOCIATION_NOT_UNAMBIGUOUS');
  assert.equal(validateCoreFailureEvent(fixture({ pull_requests: [{ number: 1 }, { number: 2 }] })).reason, 'PR_ASSOCIATION_NOT_UNAMBIGUOUS');
  assert.equal(validateCoreFailureEvent(fixture({ head_branch: 'another-branch' })).reason, 'PR_SOURCE_HEAD_NOT_VERIFIED');
});

test('rejects invalid source SHA, invalid run identity and foreign base repository', () => {
  assert.equal(validateCoreFailureEvent(fixture({ pull_requests: [{ number: 1, head: { sha: 'bad', ref: 'feature/fix', repo: { full_name: 'andylitvinov-design/books' } }, base: { ref: 'main', repo: { full_name: 'andylitvinov-design/books' } } }] })).reason, 'PR_SOURCE_HEAD_NOT_VERIFIED');
  assert.equal(validateCoreFailureEvent(fixture({ id: 0 })).reason, 'PR_ASSOCIATION_NOT_UNAMBIGUOUS');
  const foreignBase = fixture();
  foreignBase.workflow_run.pull_requests[0].base.repo.full_name = 'someone/else';
  assert.equal(validateCoreFailureEvent(foreignBase).reason, 'PR_SOURCE_HEAD_NOT_VERIFIED');
});

test('diagnostics are bounded, unique names only and preserve ordinary text', () => {
  const result = diagnosticsFromJobs([
    { name: 'Typecheck', conclusion: 'failure', steps: [{ name: 'tsc', conclusion: 'failure' }, { name: 'checkout', conclusion: 'success' }] },
    { name: 'Typecheck', conclusion: 'failure', steps: [{ name: 'tsc', conclusion: 'failure' }] },
    { name: 'Passed', conclusion: 'success', steps: [{ name: 'ignored', conclusion: 'failure' }] },
    { name: 'Build' + String.fromCharCode(0) + ' Worker', conclusion: 'timed_out', steps: [{ name: 'Run' + String.fromCharCode(10) + 'Tests', conclusion: 'timed_out' }] }
  ]);
  assert.deepEqual(result, {
    category: 'UNKNOWN',
    failedJobs: ['Typecheck', 'Build  Worker'],
    failedSteps: ['tsc', 'Run Tests']
  });
});
