'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyRedCiError, RULESET_VERSION } = require('../scripts/ci-pr-red-ci-classifier.cjs');

const PR = { head: { sha: 'a'.repeat(40) }, mergeable: true, mergeable_state: 'clean' };
const job = (name, step, conclusion = 'failure') => ({
  name, conclusion, steps: step ? [{ name: step, conclusion: 'failure' }] : []
});
const classify = (jobs, extra = {}) => classifyRedCiError({ pr: PR, jobs, ...extra });

function assertDiagnosticOnly(result, category) {
  assert.equal(result.category, category);
  assert.equal(result.status, 'DIAGNOSTIC_ONLY');
  assert.equal(result.source_write_authorized, false);
  assert.equal(result.execution_authorized, false);
  assert.ok(result.recommended_action);
  assert.ok(result.responsible_role);
  assert.ok(result.recommended_status);
  assert.ok(Number.isFinite(result.confidence));
  assert.ok(result.ruleset_version);
}

test('versioned taxonomy exposes all required category families', () => {
  assert.equal(RULESET_VERSION, '1.0.0');
  for (const key of ['SECURITY', 'ACCESS_CONFIG', 'INFRASTRUCTURE', 'MERGE_CONFLICT',
    'BASE_ADVANCED', 'BASE_OR_CI_ROUTING', 'TYPESCRIPT', 'SOURCE_CODE',
    'TEST_FAILURE', 'INTEGRATION', 'AI_EXECUTOR', 'AUTOMATION_PROCESS', 'UNKNOWN']) {
    assert.ok(require('../scripts/ci-pr-error-rules.v1.json').categories[key], key);
  }
});

test('security always wins and never authorizes repair', () => {
  const result = classify([
    job('core-lint-types-build', 'TypeScript check'),
    job('guard-unit', 'Secret scan failed')
  ], { pr: { ...PR, mergeable: false, mergeable_state: 'dirty' } });
  assertDiagnosticOnly(result, 'SECURITY');
  assert.equal(result.recommended_status, 'MANUAL_REQUIRED');
  assert.equal(result.retry.allowed, false);
});

test('access/config errors require a real owner-side change before retry', () => {
  const result = classify([job('deploy', 'Deploy application')], {
    failureMessage: 'Error: CLOUDFLARE_API_TOKEN is missing'
  });
  assertDiagnosticOnly(result, 'ACCESS_CONFIG');
  assert.equal(result.recommended_status, 'WAITING_INPUT');
  assert.equal(result.retry.max_attempts, 0);
});

test('dirty PR is not confused with a source-code failure', () => {
  const result = classify([job('core-lint-types-build', 'TypeScript check')], {
    pr: { ...PR, mergeable: false, mergeable_state: 'dirty' }
  });
  assertDiagnosticOnly(result, 'MERGE_CONFLICT');
});

test('base advancement and CI routing have separate paths', () => {
  assertDiagnosticOnly(classify([job('classify-change', 'production-base advanced')]), 'BASE_ADVANCED');
  assertDiagnosticOnly(classify([job('classify-change', 'Check routing')], {
    coreRoot: 'CI_PREFLIGHT_OR_ROUTING'
  }), 'BASE_OR_CI_ROUTING');
});

test('transient infrastructure may be retried only under a bounded policy', () => {
  const result = classify([{ name: 'core-lint-types-build', conclusion: 'startup_failure', steps: [] }]);
  assertDiagnosticOnly(result, 'INFRASTRUCTURE');
  assert.equal(result.retry.allowed, true);
  assert.equal(result.retry.max_attempts, 2);
});

test('persistent infrastructure and provider quota do not schedule blind retries', () => {
  const persistent = classify([job('runner', 'Disk quota exceeded')]);
  assertDiagnosticOnly(persistent, 'INFRASTRUCTURE');
  assert.equal(persistent.recommended_status, 'MANUAL_REQUIRED');
  assert.equal(persistent.retry.allowed, false);
  const quota = classify([job('repair-worker', 'OpenRouter provider quota exceeded')]);
  assertDiagnosticOnly(quota, 'AI_EXECUTOR');
  assert.equal(quota.retry.allowed, false);
  assert.equal(quota.retry.max_attempts, 0);
});

test('TypeScript and ordinary source build errors are distinguished', () => {
  assertDiagnosticOnly(classify([job('core-lint-types-build', 'TypeScript check')]), 'TYPESCRIPT');
  assertDiagnosticOnly(classify([job('build', 'Cannot find module ./missing-module')]), 'SOURCE_CODE');
});

test('tests are routed to diagnosis, not blindly rewritten', () => {
  const result = classify([job('focused-unit-types-build', 'Run unit tests')]);
  assertDiagnosticOnly(result, 'TEST_FAILURE');
  assert.match(result.recommended_action, /test oracle|test/i);
});

test('integration, model and automation handoff failures are distinct', () => {
  assertDiagnosticOnly(classify([job('api-check', 'Supabase integration request failed')]), 'INTEGRATION');
  assertDiagnosticOnly(classify([job('repair-worker', 'OpenRouter model response invalid')]), 'AI_EXECUTOR');
  assertDiagnosticOnly(classify([job('dispatcher', 'Prompt missing; executor not invoked')]), 'AUTOMATION_PROCESS');
  assertDiagnosticOnly(classify([job('generic', 'generic failure')], {
    automationState: 'PROMPT_MISSING'
  }), 'AUTOMATION_PROCESS');
});

test('unknown and mixed failures remain visible and unclassified', () => {
  const unknown = classify([job('custom', 'opaque proprietary action')]);
  assertDiagnosticOnly(unknown, 'UNKNOWN');
  assert.equal(unknown.recommended_status, 'UNCLASSIFIED');
  const mixed = classify([
    job('build', 'TypeScript check'),
    job('unit', 'Run unit tests')
  ]);
  assertDiagnosticOnly(mixed, 'UNKNOWN');
});

test('invalid HEAD and missing jobs fail closed', () => {
  assertDiagnosticOnly(classify([job('build', 'TypeScript check')], {
    pr: { head: { sha: 'bad' } }
  }), 'UNKNOWN');
  assertDiagnosticOnly(classify([], {}), 'UNKNOWN');
});

test('legacy category contract remains compatible with watchdog consumers', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '../scripts/ci-pr-ten-minute-watchdog.cjs'), 'utf8'
  );
  assert.match(source, /classifyRedCiError\(\{pr:live,jobs,coreRoot:root\}\)/);
  assert.match(source, /ciErrorByCategory/);
  assert.match(source, /noteConfirmedBlocker/);
});
