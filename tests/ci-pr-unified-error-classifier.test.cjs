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
  assert.equal(RULESET_VERSION, '1.1.0');
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

test('workflow budget guard is classified as CI routing policy, never source repair', () => {
  const result = classify([
    job('core-lint-types-build',
      'Verify specialist ownership and Messenger isolation on CI-policy changes')
  ], {
    failureMessage: 'Workflow budget exceeded: reuse an existing domain suite or explicitly review the budget in a CI architecture PR'
  });
  assertDiagnosticOnly(result, 'BASE_OR_CI_ROUTING');
  assert.equal(result.reason_code, 'CI_WORKFLOW_BUDGET_GUARD');
  assert.equal(result.evidence_code, 'WORKFLOW_BUDGET_GUARD');
  assert.equal(result.recommended_status, 'REROUTED');
  assert.equal(result.responsible_role, 'ci-routing-owner');
  assert.equal(result.retry.allowed, true);
  assert.equal(result.retry.max_attempts, 1);
  assert.match(result.recommended_action, /workflow ownership|workflow/i);
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
  const watchdog = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '../scripts/ci-pr-ten-minute-watchdog.cjs'), 'utf8'
  );
  for (const field of ['ci_error_ruleset_version', 'ci_error_confidence',
    'ci_error_reason_code', 'ci_error_recommended_status',
    'ci_error_responsible_role', 'ci_error_next_action', 'ci_error_retry_policy']) {
    assert.ok(watchdog.includes(field), field);
  }
});


test('explicit conflict markers in a failed job classify even when GitHub mergeability is unknown',()=>{
 for(const diagnostic of [
  'Merge conflict while applying production base',
  'Unmerged paths detected by merge-tree',
  'Conflict markers found in source merge'
 ]){
  const result=classify([job('base-recovery',diagnostic)]);
  assertDiagnosticOnly(result,'MERGE_CONFLICT');
  assert.equal(result.reason_code,'MERGE_CONFLICT_DIAGNOSTIC_MARKER');
  assert.equal(result.evidence_code,'FAILED_JOB_REPORTED_CONFLICT');
  assert.equal(result.recommended_status,'MANUAL_REQUIRED');
  assert.equal(result.responsible_role,'semantic-conflict-resolver');
  assert.equal(result.retry.allowed,false);
 }
});

test('category decision matrix keeps owner waits, no-retry states and bounded retries distinct',()=>{
 const rows=[
  {job:'deploy',step:'Missing secret GITHUB_TOKEN',category:'ACCESS_CONFIG',status:'WAITING_INPUT',retry:false},
  {job:'guard',step:'Secret scan failed',category:'SECURITY',status:'MANUAL_REQUIRED',retry:false},
  {job:'merge',step:'Unmerged paths',category:'MERGE_CONFLICT',status:'MANUAL_REQUIRED',retry:false},
  {job:'base',step:'BASE_ADVANCED production-base mismatch',category:'BASE_ADVANCED',status:'REROUTED',retry:true},
  {job:'runner',step:'Disk quota exceeded',category:'INFRASTRUCTURE',status:'MANUAL_REQUIRED',retry:false},
  {job:'runner',step:'Runner lost after startup',category:'INFRASTRUCTURE',status:'RETRY_SCHEDULED',retry:true},
  {job:'openrouter',step:'Provider quota exceeded',category:'AI_EXECUTOR',status:'REROUTED',retry:false},
  {job:'api',step:'Supabase schema mismatch',category:'INTEGRATION',status:'REROUTED',retry:true},
  {job:'tsc',step:'TypeScript check',category:'TYPESCRIPT',status:'REROUTED',retry:true},
  {job:'test',step:'Run WebKit E2E',category:'TEST_FAILURE',status:'REROUTED',retry:true},
  {job:'build',step:'Cannot find module ./missing',category:'SOURCE_CODE',status:'REROUTED',retry:true},
  {job:'dispatch',step:'Prompt missing; executor not invoked',category:'AUTOMATION_PROCESS',status:'REROUTED',retry:true},
  {job:'custom',step:'Opaque runner diagnostic',category:'UNKNOWN',status:'UNCLASSIFIED',retry:false}
 ];
 for(const row of rows){
  const result=classify([job(row.job,row.step)]);
  assert.equal(result.category,row.category,row.step);
  assert.equal(result.recommended_status,row.status,row.step);
  assert.equal(result.retry.allowed,row.retry,row.step);
  assert.equal(result.source_write_authorized,false,row.step);
  assert.equal(result.execution_authorized,false,row.step);
  assert.ok(result.reason_code,row.step);
  assert.ok(result.responsible_role,row.step);
 }
});

test('security and access precedence still win over explicit merge conflict markers',()=>{
 const security=classify([
  job('merge-tree','Unmerged paths'),
  job('secret-scan','Secret scan failed')
 ]);
 assert.equal(security.category,'SECURITY');
 const access=classify([job('merge-tree','Unmerged paths')],{
  failureMessage:'Resource not accessible by integration: insufficient permissions'
 });
 assert.equal(access.category,'ACCESS_CONFIG');
});

test('failed job evidence is required; a stale conflict label or green job cannot trigger conflict routing',()=>{
 const green=classify([{name:'merge-tree',conclusion:'success',steps:[
  {name:'Unmerged paths',conclusion:'success'}]}]);
 assert.equal(green.category,'UNKNOWN');
 const dirtyLabelOnly=classify([job('core-lint-types-build','TypeScript check')],{
  pr:{...PR,labels:[{name:'hh:conflict-repair-needed'}]}
 });
 assert.equal(dirtyLabelOnly.category,'TYPESCRIPT');
});


test('exact Specialist proof failure routes to CI policy diagnostics, not source or test rewriting',()=>{
 const jobs=[
  {name:'core-lint-types-build',conclusion:'success',steps:[]},
  {name:'hh-specialist',conclusion:'failure',steps:[{name:'Validate exact-head risk and required specialist workflows',conclusion:'failure'}]},
  {name:'hh-merge-check',conclusion:'failure',steps:[{name:'Require real Core and specialist results from this workflow',conclusion:'failure'}]}
 ];
 const result=classify(jobs);
 assertDiagnosticOnly(result,'BASE_OR_CI_ROUTING');
 assert.equal(result.reason_code,'SPECIALIST_REQUIRED_PROOF_MISSING_OR_STALE');
 assert.equal(result.evidence_code,'SPECIALIST_PROOF_UNAVAILABLE');
 assert.equal(result.retry.max_attempts,1);
 assert.equal(result.source_write_authorized,false);
 assert.equal(result.recommended_status,'REROUTED');
 const unknown=classify(jobs.filter(j=>j.name!=='core-lint-types-build'));
 assert.equal(unknown.category,'BASE_OR_CI_ROUTING','verified Specialist step is independent routing proof');
});
