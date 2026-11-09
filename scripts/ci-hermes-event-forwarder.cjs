'use strict';

const CORE_WORKFLOW_PATH = '.github/workflows/hh-pr-core-release.yml';
const FAILURE_CONCLUSIONS = new Set(['failure', 'timed_out', 'startup_failure']);
const SHA = /^[a-f0-9]{40}$/;

function safeText(value, limit = 255) {
  return typeof value === 'string'
    ? value.replace(/[\\u0000-\\u001f\\u007f]/g, ' ').trim().slice(0, limit)
    : '';
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function validateCoreFailureEvent(payload, expectedRepository = 'andylitvinov-design/books') {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, reason: 'INVALID_EVENT' };
  }
  const run = payload.workflow_run;
  if (!run || typeof run !== 'object' || Array.isArray(run)) {
    return { ok: false, reason: 'MISSING_WORKFLOW_RUN' };
  }
  if (payload.action && payload.action !== 'completed') {
    return { ok: false, reason: 'EVENT_NOT_COMPLETED' };
  }
  if (safeText(run.name, 160) !== 'HH PR core release gate' ||
      safeText(run.path, 300).split('@')[0] !== CORE_WORKFLOW_PATH ||
      run.event !== 'pull_request' || run.status !== 'completed' ||
      !FAILURE_CONCLUSIONS.has(run.conclusion)) {
    return { ok: false, reason: 'EVENT_NOT_IN_SCOPE' };
  }

  const repository = safeText(run.repository && run.repository.full_name, 200);
  const headRepository = safeText(run.head_repository && run.head_repository.full_name, 200);
  if (!expectedRepository || repository !== expectedRepository || headRepository !== expectedRepository) {
    return { ok: false, reason: 'UNTRUSTED_REPOSITORY' };
  }

  const runId = positiveInteger(run.id);
  const attempt = positiveInteger(run.run_attempt);
  const links = run.pull_requests;
  if (!runId || !attempt || !Array.isArray(links) || links.length !== 1) {
    return { ok: false, reason: 'PR_ASSOCIATION_NOT_UNAMBIGUOUS' };
  }

  const linked = links[0];
  const number = positiveInteger(linked && linked.number);
  const sourceSha = safeText(linked && linked.head && linked.head.sha, 64).toLowerCase();
  const headRef = safeText(linked && linked.head && linked.head.ref, 255);
  const baseRef = safeText(linked && linked.base && linked.base.ref, 255);
  const headRepo = safeText(linked && linked.head && linked.head.repo && linked.head.repo.full_name, 200);
  const baseRepo = safeText(linked && linked.base && linked.base.repo && linked.base.repo.full_name, 200);

  if (!number || !SHA.test(sourceSha) || !headRef || !baseRef ||
      safeText(run.head_branch, 255) !== headRef ||
      headRepo !== expectedRepository || baseRepo !== expectedRepository) {
    return { ok: false, reason: 'PR_SOURCE_HEAD_NOT_VERIFIED' };
  }

  return {
    ok: true,
    value: {
      runId,
      attempt,
      prNumber: number,
      repository: expectedRepository,
      sourceSha,
      headRef,
      baseRef,
      workflowPath: CORE_WORKFLOW_PATH,
      conclusion: run.conclusion
    }
  };
}

function diagnosticsFromJobs(jobs = []) {
  const failedJobs = [];
  const failedSteps = [];
  for (const job of Array.isArray(jobs) ? jobs : []) {
    if (!FAILURE_CONCLUSIONS.has(job && job.conclusion)) continue;
    if (job.name) failedJobs.push(safeText(job.name, 160));
    for (const step of Array.isArray(job.steps) ? job.steps : []) {
      if (FAILURE_CONCLUSIONS.has(step && step.conclusion) && step.name) {
        failedSteps.push(safeText(step.name, 160));
      }
    }
  }
  return {
    category: 'UNKNOWN',
    failedJobs: [...new Set(failedJobs)].filter(Boolean).slice(0, 10),
    failedSteps: [...new Set(failedSteps)].filter(Boolean).slice(0, 10)
  };
}

module.exports = {
  CORE_WORKFLOW_PATH,
  validateCoreFailureEvent,
  diagnosticsFromJobs
};
