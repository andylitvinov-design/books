'use strict';
// Trusted default-branch release accounting. Source of truth for LIVE is the
// independently completed ci-pr-live-verifier; labels are only receipts.
const REPO = 'andylitvinov-design/books';
const PROD = 'codex/public-book-library';
const DEFAULT = 'codex/bootstrap-books';
const LABEL = 'hh:live-verified';
const MARKER = 'HH_LIVE_VERIFIED_V1';
const SHA = /^[a-f0-9]{40}$/i;
const MAX_ASSOCIATED = 100;

function trusted(context) {
  return context?.repo?.owner + '/' + context?.repo?.repo === REPO &&
    context.ref === 'refs/heads/' + DEFAULT &&
    ['schedule', 'workflow_dispatch', 'push', 'repository_dispatch'].includes(context.eventName);
}
function certified(report) {
  return report?.schema === 'HH_LIVE_EVIDENCE_V1' &&
    report.verified_live === true && report.reason === 'LIVE_VERIFIED' &&
    report.repo === REPO && report.production_branch === PROD &&
    report.alias === 'holistichouse.vercel.app' && SHA.test(report.production_sha || '') &&
    /^dpl_[A-Za-z0-9]+$/.test(report.deployment_id || '') &&
    Array.isArray(report.evidence_urls) &&
    ['VERCEL_API_READY_AND_ALIAS','PUBLIC_RUNTIME_EXACT_SHA_AND_DEPLOYMENT'].includes(report.proof_method) &&
    report.evidence_urls.includes('https://github.com/' + REPO + '/commit/' + report.production_sha) &&
    report.evidence_urls.includes('https://' + report.alias + '/en');
}
function exactMergedPR(pr, sha) {
  return pr?.state === 'closed' && pr.merged_at &&
    pr.base?.ref === PROD && pr.base?.repo?.full_name === REPO &&
    pr.merge_commit_sha?.toLowerCase() === sha.toLowerCase();
}
function receiptBody(report) {
  const evidence = report.evidence_urls.filter(u => /^https:\/\/(?:github\.com|vercel\.com|holistichouse\.vercel\.app)\//.test(u));
  const marker = '<!-- ' + MARKER + ' sha=' + report.production_sha + ' deployment=' + report.deployment_id + ' -->';
  return marker + '\n' +
    'LIVE verified for protected production merge commit ' + report.production_sha + '.\n\n' +
    'Vercel production deployment: ' + report.deployment_id + '. Verified public alias: ' +
    'https://' + report.alias + '/en. Method: ' + (report.proof_method || 'VERIFIED') + '.\n\n' +
    evidence.map(url => '- ' + url).join('\n') + '\n';
}
async function recordLive({github, context, report, logger}) {
  if (!trusted(context)) return {state: 'UNTRUSTED_CONTEXT', recorded: []};
  if (!certified(report)) return {state: 'LIVE_UNVERIFIED', recorded: []};
  const {owner, repo} = context.repo, sha = report.production_sha;
  const branch = (await github.rest.repos.getBranch({owner, repo, branch: PROD})).data;
  if (branch?.commit?.sha !== sha || branch.protected !== true)
    return {state: 'PRODUCTION_HEAD_MOVED_OR_UNPROTECTED', recorded: []};
  const response = (await github.rest.repos.listPullRequestsAssociatedWithCommit({owner, repo, commit_sha: sha, per_page: MAX_ASSOCIATED})).data;
  if (!Array.isArray(response) || response.length >= MAX_ASSOCIATED)
    return {state: 'INCOMPLETE_COMMIT_PR_ASSOCIATION', recorded: []};
  const recorded = [];
  for (const match of response) {
    if (!Number.isSafeInteger(match?.number)) continue;
    const number = match.number;
    const pr = (await github.rest.pulls.get({owner, repo, pull_number: number})).data;
    if (!exactMergedPR(pr, sha)) continue;
    // The alias was checked by a separate read-only verifier. HEAD must stay
    // unchanged before each write, or a newer deploy cannot be miscredited.
    const current = (await github.rest.repos.getBranch({owner, repo, branch: PROD})).data;
    if (current?.commit?.sha !== sha || current.protected !== true)
      return {state: 'PRODUCTION_HEAD_MOVED_DURING_RECEIPT', recorded};
    const comments = await github.rest.issues.listComments({owner, repo, issue_number: number, per_page: 100});
    const marker = '<!-- ' + MARKER + ' sha=' + sha + ' deployment=' + report.deployment_id + ' -->';
    if (!Array.isArray(comments.data) || comments.data.length >= 100)
      return {state: 'COMMENT_RECEIPT_HISTORY_INCOMPLETE', recorded};
    const present = comments.data.some(c => c.body?.includes(marker));
    // Comment evidence FIRST: a searchable label must never be treated as
    // trustworthy if the receipt itself could not be written.
    if (!present) {
      await github.rest.issues.createComment({owner, repo, issue_number: number, body: receiptBody(report)});
    }
    const labels = (await github.rest.issues.listLabelsOnIssue({owner, repo, issue_number: number, per_page: 100})).data;
    if (!Array.isArray(labels) || labels.length >= 100)
      return {state: 'LABEL_HISTORY_INCOMPLETE', recorded};
    if (!labels.some(l => l.name === LABEL)) {
      try {await github.rest.issues.getLabel({owner, repo, name: LABEL});}
      catch (e) {
        if (e?.status !== 404) throw e;
        try {await github.rest.issues.createLabel({owner, repo, name: LABEL, color: '167c54', description: 'Vercel production alias and exact merged SHA independently verified'});}
        catch (labelError) {if (labelError?.status !== 422) throw labelError;}
      }
      await github.rest.issues.addLabels({owner, repo, issue_number: number, labels: [LABEL]});
    }
    const checked = (await github.rest.issues.listLabelsOnIssue({owner, repo, issue_number: number, per_page: 100})).data;
    if (!checked.some(l => l.name === LABEL)) throw Error('LIVE_RECEIPT_LABEL_NOT_CONFIRMED');
    recorded.push(number);
    logger?.('LIVE_RECEIPT_CONFIRMED #' + number + ' ' + sha);
  }
  return {state: recorded.length ? 'RECORDED' : 'NO_EXACT_MERGED_PR', recorded};
}

// Only the independent LIVE verifier supplies deployment evidence. This job
// writes a durable PR receipt, never makes its own assertion of deployment.
async function run({github, core, context, liveReport, now = Date.now()}) {
  const report = {schema: 'HH_LIVE_RECEIPTS_V1', checked_at: new Date(now).toISOString(),
    latest_live: certified(liveReport), latest_reason: liveReport?.reason || 'NO_LIVE_REPORT',
    receipt: null};
  if (!trusted(context)) report.receipt = {state: 'UNTRUSTED_CONTEXT'};
  else try {report.receipt = await recordLive({github, context, report: liveReport, logger: msg => core.info(msg)});}
  catch (e) {report.receipt = {state: 'RECEIPT_FAILED', error: String(e?.message || e).slice(0, 140)};}
  core.info('HH_LIVE_RECEIPTS ' + JSON.stringify(report));
  await core.summary.addHeading('HH verified LIVE — durable PR receipts')
    .addCodeBlock(JSON.stringify(report, null, 2)).write();
  return report;
}
module.exports = {REPO,PROD,DEFAULT,LABEL,MARKER,trusted,certified,exactMergedPR,receiptBody,recordLive,run};
