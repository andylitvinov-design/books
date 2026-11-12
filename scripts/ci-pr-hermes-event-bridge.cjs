'use strict';

const REPO = 'andylitvinov-design/books';
const BASE = 'codex/public-book-library';
const FAILURES = new Set(['failure', 'timed_out', 'startup_failure']);
const SHA = /^[a-f0-9]{40}$/i;
const { classifyRedCiError } = require('./ci-pr-red-ci-classifier.cjs');
const { strategyFor } = require('./ci-pr-error-task.cjs');
const {validatedJobEvidence,isActualBaseAdvancedLog}=require('./ci-pr-base-advanced-recovery.cjs');

function exactPullRequestLink(pr) {
  if (!pr || pr.state !== 'open' || pr.draft ||
      pr.base?.ref !== BASE || pr.head?.repo?.full_name !== REPO ||
      !SHA.test(pr.head?.sha || '') ||
      typeof pr.head?.ref !== 'string' || !pr.head.ref ||
      typeof pr.base?.ref !== 'string' || !pr.base.ref) return null;
  return {
    number: pr.number,
    base: { ref: pr.base.ref, sha: pr.base.sha, repo: { full_name: pr.base.repo?.full_name || REPO } },
    head: { ref: pr.head.ref, sha: pr.head.sha, repo: { full_name: pr.head.repo.full_name } },
    mergeable: pr.mergeable === true ? true : pr.mergeable === false ? false : null,
    mergeable_state: typeof pr.mergeable_state === 'string' ? pr.mergeable_state : null
  };
}

async function resolveExactPR({ github, owner, repo, workflowRun }) {
  if (owner + '/' + repo !== REPO || workflowRun?.repository?.full_name !== REPO ||
      workflowRun?.head_repository?.full_name !== REPO ||
      workflowRun?.event !== 'pull_request' ||
      workflowRun?.status !== 'completed' || !FAILURES.has(workflowRun?.conclusion) ||
      workflowRun?.path?.split('@')[0] !== '.github/workflows/hh-pr-core-release.yml' ||
      typeof workflowRun.head_branch !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,254}$/.test(workflowRun.head_branch)) {
    return { ok: false, reason: 'UNTRUSTED_CORE_EVENT' };
  }

  const links = Array.isArray(workflowRun.pull_requests) ? workflowRun.pull_requests : [];
  if (links.length > 1) return { ok: false, reason: 'AMBIGUOUS_EVENT_PR_LINKS' };

  let candidates = [];
  if (links.length === 1 && Number.isSafeInteger(links[0]?.number) && links[0].number > 0) {
    const response = await github.rest.pulls.get({ owner, repo, pull_number: links[0].number });
    candidates = [response.data];
    const linkedSha = links[0]?.head?.sha;
    if (!SHA.test(linkedSha || '') || candidates[0]?.head?.sha !== linkedSha) {
      return { ok: false, reason: 'EVENT_PR_HEAD_MOVED' };
    }
  } else {
    // GitHub occasionally emits pull_requests:[] for a genuine PR workflow.
    // Recover only a unique live PR whose branch AND source SHA match the event.
    const response = await github.rest.pulls.list({
      owner, repo, state: 'open', head: owner + ':' + workflowRun.head_branch, per_page: 100
    });
    candidates = (response.data || []).filter((pr) =>
      pr?.head?.ref === workflowRun.head_branch &&
      pr?.head?.repo?.full_name === REPO &&
      pr?.head?.sha === workflowRun.head_sha);
  }

  const exact = candidates.map(exactPullRequestLink).filter(Boolean).filter((link) =>
    link.head.ref === workflowRun.head_branch);
  if (exact.length !== 1) {
    return { ok: false, reason: exact.length ? 'AMBIGUOUS_LIVE_PR' : 'NO_UNIQUE_EXACT_HEAD_PR' };
  }
  return { ok: true, pullRequest: exact[0] };
}

/** Optional read-only proof for the existing immutable BASE-owned specialist.
 * Invalid/missing logs keep the original classification without any retry.
 * Do not log, store or expose raw job logs or provider information. */
async function verifiedSpecialistBaseAdvanced({github,owner,repo,jobData}={}){
 if(owner+'/'+repo!==REPO||typeof github?.request!=='function')return '';
 const jobId=validatedJobEvidence(jobData);
 if(!jobId)return '';
 try{
  const response=await github.request(
   'GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs',
   {owner,repo,job_id:jobId});
  return isActualBaseAdvancedLog(response?.data)
   ?'BASE_ADVANCED: PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED':'';
 }catch{return '';}
}
function buildDiagnostics(jobs, pr, verifiedFailureHint='') {
  const failed = (Array.isArray(jobs) ? jobs : []).filter((job) =>
    FAILURES.has(job?.conclusion));
  const failedJobs = failed.map((job) => String(job.name || 'unnamed-job').slice(0, 160));
  const failedSteps = failed.flatMap((job) => (Array.isArray(job.steps) ? job.steps : [])
    .filter((step) => FAILURES.has(step?.conclusion))
    .map((step) => String(job.name || 'unnamed-job').slice(0, 90) + ' / ' +
      String(step.name || 'unnamed-step').slice(0, 90))).slice(0, 10);
  const failureMessage=verifiedFailureHint===
    'BASE_ADVANCED: PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED'
      ?verifiedFailureHint:'';
  const decision = classifyRedCiError({ pr, jobs, failureMessage });
  const strategy=strategyFor(decision.category,'UNVERIFIED',decision.retry.allowed===true);
  return {
    category: decision.category,
    failedJobs: failedJobs.slice(0, 10),
    failedSteps,
    classification: {
      schema: 'HH_CI_ERROR_CLASSIFICATION_V1',
      ruleset_version: decision.ruleset_version,
      category: decision.category,
      confidence: decision.confidence,
      reason_code: decision.reason_code,
      strategy_code:strategy.code,
      next_action:strategy.action,
      evidence_code: decision.evidence_code,
      // Preserve the exact authenticated Core job/step for the already
      // existing guarded source-test route. The private inbox persists
      // these separately as failed_jobs/failed_steps.
      failed_job: typeof decision.failed_job === 'string' ?
        decision.failed_job.slice(0, 90) : null,
      failed_step: typeof decision.failed_step === 'string' ?
        decision.failed_step.slice(0, 90) : null,
      recommended_action: decision.recommended_action,
      recommended_status: decision.recommended_status,
      responsible_role: decision.responsible_role,
      retry: decision.retry,
      requires_human: decision.requires_human,
      status: decision.status,
      source_write_authorized: decision.source_write_authorized,
      execution_authorized: decision.execution_authorized
    }
  };
}
async function sendWorkflowFailure({
  github, context, core, oidcToken = '', fetchImpl = global.fetch,
  endpoint = 'https://shervdixkaxurnaecioe.supabase.co/functions/v1/agent-commander-private-store-v1/webhooks/github-workflow-run'
}) {
  const workflowRun = context?.payload?.workflow_run;
  if (typeof oidcToken !== 'string' || oidcToken.length < 100) {
    const result = { outcome: 'BRIDGE_DISABLED_MISSING_OIDC_TOKEN', sent: false };
    core?.warning?.('COMMANDER_CI_EVENT_BRIDGE ' + JSON.stringify(result));
    return result;
  }
  if (typeof fetchImpl !== 'function') throw new Error('COMMANDER_CI_EVENT_FETCH_UNAVAILABLE');
  const parsedEndpoint = new URL(endpoint);
  if (parsedEndpoint.protocol !== 'https:' ||
      parsedEndpoint.hostname !== 'shervdixkaxurnaecioe.supabase.co' ||
      parsedEndpoint.pathname !== '/functions/v1/agent-commander-private-store-v1/webhooks/github-workflow-run' ||
      parsedEndpoint.username || parsedEndpoint.password || parsedEndpoint.search || parsedEndpoint.hash) {
    throw new Error('COMMANDER_CI_EVENT_ENDPOINT_NOT_ALLOWLISTED');
  }

  const { owner, repo } = context.repo;
  const association = await resolveExactPR({ github, owner, repo, workflowRun });
  if (!association.ok) {
    const result = { outcome: association.reason, sent: false, runId: workflowRun?.id || null };
    core?.warning?.('COMMANDER_CI_EVENT_BRIDGE ' + JSON.stringify(result));
    return result;
  }

  const jobsResponse = await github.rest.actions.listJobsForWorkflowRun({
    owner, repo, run_id: workflowRun.id, per_page: 100, filter: 'latest'
  });
  const verifiedFailureHint=await verifiedSpecialistBaseAdvanced({
    github,owner,repo,jobData:jobsResponse.data
  });
  const diagnostics = buildDiagnostics(jobsResponse.data?.jobs,
    association.pullRequest,verifiedFailureHint);
  const payload = {
    action: 'completed',
    workflow_run: { ...workflowRun, pull_requests: [association.pullRequest] },
    diagnostics
  };
  const response = await fetchImpl(parsedEndpoint.toString(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + oidcToken },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000)
  });
  const bodyText = await response.text();
  let receipt = null;
  try { receipt = JSON.parse(bodyText); } catch { /* never echo a response body into Actions logs */ }
  if (!response.ok || !receipt || typeof receipt.accepted !== 'boolean') {
    throw new Error('COMMANDER_CI_EVENT_HTTP_OR_RECEIPT_INVALID status=' + response.status);
  }
  const result = {
    outcome: receipt.outcome || (receipt.accepted ? 'ACCEPTED' : 'REJECTED'),
    accepted: receipt.accepted,
    prNumber: Number.isSafeInteger(receipt.pr_number) ? receipt.pr_number : association.pullRequest.number,
    headSha: association.pullRequest.head.sha,
    headRef: association.pullRequest.head.ref,
    runId: workflowRun.id,
    inboxId: typeof receipt.inbox_id === 'string' ? receipt.inbox_id : null,
    association: typeof receipt.association === 'string' ? receipt.association : null,
    category: diagnostics.category,
    classification: diagnostics.classification,
    endpointStatus: response.status
  };
  if (receipt.accepted) core?.info?.('COMMANDER_CI_EVENT_BRIDGE ' + JSON.stringify(result));
  else core?.warning?.('COMMANDER_CI_EVENT_BRIDGE ' + JSON.stringify(result));
  return result;
}

module.exports = { exactPullRequestLink, resolveExactPR, buildDiagnostics, verifiedSpecialistBaseAdvanced, sendWorkflowFailure };
