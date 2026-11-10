'use strict';

/**
 * Versioned, deterministic classification for trusted CI/PR diagnostics.
 *
 * IMPORTANT: classification is advisory. This module never grants source-write,
 * retry, merge, deployment, credential, or lease authority. Existing trusted
 * dispatcher/worker gates remain the only execution authority.
 */
const RULESET = require('./ci-pr-error-rules.v1.json');
const FAILED = new Set(['failure', 'timed_out', 'startup_failure']);
const AGGREGATE = new Set([
  'hh-merge-check', 'hh-core-verified', 'hh-specialist',
  'hh-specialists-verified', 'release-ready'
]);
const SHA = /^[0-9a-f]{40}$/i;

const SIGNALS = Object.freeze({
  SECURITY: /(?:\bsecurity\b|secret[- ]?scan|codeql|sast|vulnerabilit|dependency[- ]?audit|trivy|semgrep|gitleaks|policy violation)/i,
  ACCESS_CONFIG: /(?:missing secret|secret .*not found|resource not accessible|permission denied|insufficient permissions|unauthorized|\b401\b|\b403\b|invalid credentials|token.*missing|environment variable.*missing|cloudflare_api_token|vercel.*credential|github.*write.*permission)/i,
  INFRASTRUCTURE: /(?:\btimeout\b|timed out|startup_failure|runner unavailable|runner lost|disk quota|quota exceeded|out of disk|no space left|resource temporarily unavailable|service unavailable|\b502\b|\b503\b|\b504\b|rate limit|api rate limit)/i,
  MERGE_CONFLICT: /(?:merge conflict|conflict markers|unmerged paths|cannot be merged|mergeable_state.*dirty)/i,
  BASE_ADVANCED: /(?:BASE_ADVANCED|production[- ]base (?:advanced|moved)|stale[- ]base|base[- ]ancestry|base[- ]sha mismatch|behind base)/i,
  TYPESCRIPT: /(?:\btypescript[-_ ]?(?:build|check|compile)\b|\btypecheck\b|\btsc\b|^Run TypeScript\b|typescript error)/i,
  TEST_FAILURE: /(?:\btests?\b|\bunit\b|\b(?:vitest|jest|mocha|ava|uvu|tap|pytest)\b|\bcontracts?\b|\be2e\b|\bplaywright\b|\bwebkit\b|\bspecs?\b|\bassertions?\b|snapshot mismatch|test failed)/i,
  INTEGRATION: /(?:\bapi\b|supabase|vercel|github api|\bmcp\b|oauth|webhook|integration|database connection|schema mismatch|http client)/i,
  AI_EXECUTOR: /(?:openrouter|model response|completion response|invalid patch|patch response|free_model|free model|provider quota|model timeout|empty model|non[- ]text response|unexpected model identity|inference)/i,
  AUTOMATION_PROCESS: /(?:dispatcher|dispatch(?:er)?|task queue|queue reservation|\blease\b|prompt missing|missing prompt|no executor|executor not invoked|finalizer|finalization|task state|task capsule|handoff|idempotency|duplicate task|lost context|worker claim)/i,
  CI_WORKFLOW_BUDGET: /(?:workflow budget exceeded|workflow count (?:exceeded|limit)|too many (?:github actions )?workflows|workflow (?:graph|fan.out) budget|CI[- ]policy changes|specialist ownership|Messenger isolation)/i,
  SPECIALIST_PROOF_GATE: /^(?:validate exact-head risk and required specialist workflows)$/i,
  SOURCE_CODE: /(?:eslint|syntax error|cannot find module|module not found|missing import|build failed|compilation failed|type error|referenceerror|syntaxerror|cannot resolve|dependency conflict)/i,
  CORE_SOURCE_PREFLIGHT: /^Source Preflight — syntax and TypeScript before costly Next build$/,
  INFRA_STEP: /^(?:set ?up job|run actions\/(?:checkout|setup-node)@|checkout|install dependencies|download|fetch|restore cache|prepare runner)/i
});

function evidenceFor(jobs) {
  return jobs.filter(Boolean).flatMap(job => {
    const failedSteps = Array.isArray(job.steps)
      ? job.steps.filter(step => step?.conclusion === 'failure')
      : [];
    if (!failedSteps.length) return [{ job: job.name || '', step: '', conclusion: job.conclusion || '' }];
    return failedSteps.map(step => ({
      job: job.name || '', step: step.name || '', conclusion: job.conclusion || ''
    }));
  });
}

function makeResult(category, evidence, confidence, details = {}) {
  const policy = RULESET.categories[category] || RULESET.categories.UNKNOWN;
  const first = evidence[0] || {};
  return {
    ruleset_version: RULESET.version,
    category,
    confidence,
    reason_code: details.reasonCode || policy.reason_code,
    failed_job: first.job || null,
    failed_step: first.step || null,
    evidence_code: details.evidenceCode || null,
    recommended_action: policy.action,
    recommended_status: details.recommendedStatus || policy.recommended_status,
    responsible_role: policy.responsible_role,
    retry: { ...policy.retry, ...(details.retryOverride || {}) },
    requires_human: policy.requires_human,
    source_write_authorized: false,
    execution_authorized: false,
    status: 'DIAGNOSTIC_ONLY'
  };
}

/**
 * Inputs are trusted workflow metadata plus bounded diagnostic strings.
 * No raw logs, prompts, model output, or credentials are returned or persisted.
 */
function classifyRedCiError({
  pr, jobs, coreRoot = 'UNVERIFIED', failureMessage = '',
  automationState = null, integrationTarget = null
} = {}) {
  if (!SHA.test(pr?.head?.sha || '') || !Array.isArray(jobs) || !jobs.length) {
    return makeResult('UNKNOWN', [], 0.05, { evidenceCode: 'INVALID_OR_MISSING_EXACT_HEAD' });
  }

  const failed = jobs.filter(job => job && FAILED.has(job.conclusion));
  if (!failed.length) {
    return makeResult('UNKNOWN', [], 0.05, { evidenceCode: 'NO_CONFIRMED_FAILED_JOB' });
  }

  const causal = failed.filter(job => !AGGREGATE.has(String(job.name || '').toLowerCase()));
  const evidence = evidenceFor(causal.length ? causal : failed);
  const text = [
    failureMessage,
    ...evidence.flatMap(item => [item.job, item.step, item.conclusion])
  ].filter(Boolean).join('\n');

  // Safety and credential failures take precedence over all repairable causes.
  if (SIGNALS.SECURITY.test(text)) {
    return makeResult('SECURITY', evidence, 0.99, { evidenceCode: 'SECURITY_GATE_FAILURE' });
  }

  if (SIGNALS.ACCESS_CONFIG.test(text)) {
    return makeResult('ACCESS_CONFIG', evidence, 0.97, { evidenceCode: 'ACCESS_OR_CONFIGURATION_FAILURE' });
  }

  if (pr.mergeable === false && pr.mergeable_state === 'dirty') {
    return makeResult('MERGE_CONFLICT', evidence, 0.99, { evidenceCode: 'LIVE_PR_IS_DIRTY' });
  }

  // The GitHub mergeability field can be null while the failed job still
  // reports a concrete conflict (for example, a merge-tree or unmerged-path
  // diagnostic). Keep that separate from a stale conflict label: only the
  // authenticated failed-job evidence is used here, and this remains
  // diagnostic-only with no source-write authority.
  if (SIGNALS.MERGE_CONFLICT.test(text)) {
    return makeResult('MERGE_CONFLICT', evidence, 0.94, {
      reasonCode: 'MERGE_CONFLICT_DIAGNOSTIC_MARKER',
      evidenceCode: 'FAILED_JOB_REPORTED_CONFLICT'
    });
  }

  if (SIGNALS.BASE_ADVANCED.test(text)) {
    return makeResult('BASE_ADVANCED', evidence, 0.97, { evidenceCode: 'EXPLICIT_BASE_FAILURE' });
  }
  if (SIGNALS.CI_WORKFLOW_BUDGET.test(text)) {
    return makeResult('BASE_OR_CI_ROUTING', evidence, 0.97, {
      reasonCode: 'CI_WORKFLOW_BUDGET_GUARD',
      evidenceCode: 'WORKFLOW_BUDGET_GUARD'
    });
  }
  // This exact specialist gate validates live HEAD/base identity and the
  // presence/completion of required specialist workflows. Its failure is
  // missing/stale CI proof, never proof that product source is defective.
  const specialistProofFailure=evidence.some(item=>
    String(item.job||'').toLowerCase()==='hh-specialist'&&
    SIGNALS.SPECIALIST_PROOF_GATE.test(String(item.step||'')));
  if(specialistProofFailure){
    return makeResult('BASE_OR_CI_ROUTING',evidence,0.97,{
      reasonCode:'SPECIALIST_REQUIRED_PROOF_MISSING_OR_STALE',
      evidenceCode:'SPECIALIST_PROOF_UNAVAILABLE'
    });
  }
  if (coreRoot === 'CI_PREFLIGHT_OR_ROUTING') {
    return makeResult('BASE_OR_CI_ROUTING', evidence, 0.9, { evidenceCode: 'TRUSTED_PREFLIGHT_ROUTING_FAILURE' });
  }

  const providerQuota = /(?:(?:openrouter|model|provider)[^\\n]{0,60}(?:quota|rate limit|credits)|(?:quota|rate limit|credits)[^\\n]{0,60}(?:openrouter|model|provider))/i.test(text);
  if (providerQuota) {
    return makeResult('AI_EXECUTOR', evidence, 0.96, {
      evidenceCode: 'MODEL_PROVIDER_QUOTA_OR_REJECTION',
      recommendedStatus: 'REROUTED',
      retryOverride: { allowed: false, max_attempts: 0 }
    });
  }

  const infraStep = evidence.some(item =>
    item.conclusion === 'timed_out' ||
    item.conclusion === 'startup_failure' ||
    SIGNALS.INFRA_STEP.test(item.step)
  );
  if (infraStep || SIGNALS.INFRASTRUCTURE.test(text) ||
      coreRoot === 'CI_INFRA_OR_ENVIRONMENT') {
    const transient = evidence.some(item =>
      ['timed_out', 'startup_failure'].includes(item.conclusion)
    ) || /(?:\\b502\\b|\\b503\\b|\\b504\\b|temporarily unavailable|runner lost)/i.test(text);
    return makeResult('INFRASTRUCTURE', evidence, transient ? 0.96 : 0.82, {
      evidenceCode: transient ? 'TRANSIENT_INFRASTRUCTURE_FAILURE' : 'PERSISTENT_INFRASTRUCTURE_FAILURE',
      recommendedStatus: transient ? 'RETRY_SCHEDULED' : 'MANUAL_REQUIRED',
      retryOverride: transient ? {} : { allowed: false, max_attempts: 0 }
    });
  }

  if (SIGNALS.AUTOMATION_PROCESS.test(text) ||
      (automationState && ['PROMPT_MISSING', 'NO_EXECUTOR', 'LEASE_EXPIRED',
        'FINALIZER_FAILED', 'CONTEXT_LOST', 'TASK_NOT_CREATED'].includes(automationState))) {
    return makeResult('AUTOMATION_PROCESS', evidence, automationState ? 0.99 : 0.88, {
      evidenceCode: automationState || 'AUTOMATION_HANDOFF_FAILURE'
    });
  }

  if (SIGNALS.AI_EXECUTOR.test(text)) {
    return makeResult('AI_EXECUTOR', evidence, 0.9, {
      evidenceCode: 'AI_EXECUTOR_OR_MODEL_FAILURE'
    });
  }

  if (integrationTarget || SIGNALS.INTEGRATION.test(text)) {
    return makeResult('INTEGRATION', evidence, integrationTarget ? 0.96 : 0.82, {
      evidenceCode: integrationTarget ? String(integrationTarget).slice(0, 48) : 'INTEGRATION_FAILURE'
    });
  }

  if (evidence.length && evidence.every(item => SIGNALS.TYPESCRIPT.test(item.step) || SIGNALS.TYPESCRIPT.test(item.job))) {
    return makeResult('TYPESCRIPT', evidence, 0.97, { evidenceCode: 'FAILED_TYPESCRIPT_STEP' });
  }

  if (evidence.length && evidence.every(item => SIGNALS.TEST_FAILURE.test(item.step) || SIGNALS.TEST_FAILURE.test(item.job))) {
    return makeResult('TEST_FAILURE', evidence, 0.9, { evidenceCode: 'FAILED_TEST_STEP_REQUIRES_TRIAGE' });
  }

  if (SIGNALS.SOURCE_CODE.test(text)) {
    return makeResult('SOURCE_CODE', evidence, 0.86, { evidenceCode: 'SOURCE_BUILD_OR_LINT_FAILURE' });
  }

  // An exact failed trusted Core source-preflight step is a bounded source
  // candidate, not proof of the underlying TypeScript diagnostic. The Worker
  // must reproduce a failure on one allowlisted exact-HEAD file before it
  // may request any zero-cost model patch. Unrelated or mixed jobs are held.
  if (evidence.length===1&&
      evidence[0].job==='core-lint-types-build'&&
      evidence[0].conclusion==='failure'&&
      SIGNALS.CORE_SOURCE_PREFLIGHT.test(evidence[0].step)) {
    return makeResult('SOURCE_CODE',evidence,0.82,{
      reasonCode:'CORE_SOURCE_PREFLIGHT_REPRODUCTION_REQUIRED',
      evidenceCode:'EXACT_FAILED_CORE_SOURCE_PREFLIGHT_STEP'
    });
  }

  // A partially interpretable or mixed failure is never silently discarded.
  if (causal.length && evidence.length) {
    return makeResult('UNKNOWN', evidence, 0.2, { evidenceCode: 'MIXED_OR_UNRECOGNIZED_FAILURE' });
  }
  return makeResult('UNKNOWN', evidence, 0.1, { evidenceCode: 'NO_CAUSAL_FAILURE_EVIDENCE' });
}

module.exports = { classifyRedCiError, RULESET_VERSION: RULESET.version };
