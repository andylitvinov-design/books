'use strict';

// Trusted default-branch coordinator: never checkout or execute a PR HEAD.
const TARGET = 'codex/public-book-library';
const SHA = /^[0-9a-f]{40}$/i;
const valid = value => typeof value === 'string' && SHA.test(value);

function verifyEvent(event, repository) {
  const pr = event && event.pull_request;
  if (!event || event.action !== 'synchronize' || event.repository?.full_name !== repository ||
      !pr || !Number.isSafeInteger(pr.number) || pr.number < 1 ||
      pr.base?.ref !== TARGET || pr.head?.repo?.full_name !== repository ||
      typeof pr.head?.ref !== 'string' || !pr.head.ref ||
      !valid(event.before) || !valid(event.after) ||
      event.before === event.after || event.after !== pr.head.sha) return null;
  return { number: pr.number, before: event.before, after: event.after, branch: pr.head.ref };
}

function isLive(pr, ctx, repository) {
  return !!(pr && pr.number === ctx.number && pr.state === 'open' &&
    pr.base?.ref === TARGET && pr.head?.repo?.full_name === repository &&
    pr.head?.ref === ctx.branch && pr.head?.sha === ctx.after);
}

function eligible(run, pr, ctx, repository) {
  if (!isLive(pr, ctx, repository) || !run || run.event !== 'pull_request' ||
      !['queued', 'in_progress'].includes(run.status) ||
      !Number.isSafeInteger(run.id) || run.id < 1 ||
      run.head_repository?.full_name !== repository || run.head_branch !== ctx.branch ||
      !valid(run.head_sha) || run.head_sha === ctx.after ||
      !Array.isArray(run.pull_requests) || run.pull_requests.length !== 1) return false;
  const linked = run.pull_requests[0];
  // GitHub may rewrite linked.head.sha to the newest PR SHA. Never use this
  // mutable association as evidence of the old source commit.
  return linked.number === ctx.number && linked.base?.ref === TARGET &&
    linked.head?.ref === ctx.branch && valid(linked.head?.sha);
}

async function prune({ github, event, repository, log = () => {}, dryRun = false, maxCancels = 40 }) {
  const ctx = verifyEvent(event, repository);
  if (!ctx) return { status: 'SKIP_UNTRUSTED_EVENT', cancelled: [], confirmed: [] };
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) throw Error('Invalid repository');
  const output = { status: 'OK', pr: ctx.number, head: ctx.after, scanned: 0,
    candidates: 0, cancelled: [], confirmed: [], errors: [], partial: false };
  const current = async () => (await github.rest.pulls.get({ owner, repo, pull_number: ctx.number })).data;
  let pr = await current();
  if (!isLive(pr, ctx, repository)) return { ...output, status: 'SKIP_SUPERSEDED_EVENT' };
  // Only process ordinary fast-forward updates. Do not infer stale ancestry
  // from a force-pushed, disjoint, or otherwise unverifiable PR event.
  const eventCompare = (await github.rest.repos.compareCommits({
    owner, repo, base: ctx.before, head: ctx.after
  })).data;
  if (eventCompare.status !== 'ahead' || !Number.isSafeInteger(eventCompare.ahead_by) ||
      eventCompare.ahead_by < 1) return { ...output, status: 'SKIP_UNPROVEN_EVENT_ANCESTRY' };

  const seen = new Set();
  for (const status of ['queued', 'in_progress']) {
    for (let page = 1; page <= 3; page++) {
      // Never perform repository-wide cancellation. Scope to one exact PR branch.
      const result = (await github.rest.actions.listWorkflowRunsForRepo({
        owner, repo, branch: ctx.branch, event: 'pull_request',
        status, per_page: 100, page
      })).data;
      if (!Array.isArray(result.workflow_runs)) throw Error('Incomplete CI list');
      const rows = result.workflow_runs;
      for (const run of rows) {
        if (seen.has(run.id)) continue;
        seen.add(run.id);
        output.scanned++;
        if (!eligible(run, pr, ctx, repository)) continue;
        output.candidates++;
        if (output.cancelled.length >= Math.min(80, maxCancels)) {
          output.partial = true;
          break;
        }
        const latestRun = async () => (await github.rest.actions.getWorkflowRun({
          owner, repo, run_id: run.id
        })).data;
        // Both objects must be reread; neither list pagination nor webhook
        // payload is an authority for mutable live PR state.
        let [beforeRun, beforePR] = await Promise.all([latestRun(), current()]);
        if (!eligible(beforeRun, beforePR, ctx, repository) ||
            beforeRun.head_sha !== run.head_sha) continue;
        let ancestry;
        try {
          ancestry = (await github.rest.repos.compareCommits({
            owner, repo, base: beforeRun.head_sha, head: beforePR.head.sha
          })).data;
        } catch (error) {
          output.partial = true;
          output.errors.push('compare:' + run.id);
          continue;
        }
        if (ancestry.status !== 'ahead' || !Number.isSafeInteger(ancestry.ahead_by) ||
            ancestry.ahead_by < 1) continue;
        const [lastRun, lastPR] = await Promise.all([latestRun(), current()]);
        if (!eligible(lastRun, lastPR, ctx, repository) ||
            lastRun.head_sha !== beforeRun.head_sha ||
            lastPR.head.sha !== beforePR.head.sha) continue;
        if (dryRun) {
          output.cancelled.push(run.id); // Dry-run selection, not real cancellation.
          continue;
        }
        try {
          await github.rest.actions.cancelWorkflowRun({ owner, repo, run_id: run.id });
          output.cancelled.push(run.id);
          const checked = await latestRun();
          if (checked.status === 'completed' && checked.conclusion === 'cancelled')
            output.confirmed.push(run.id);
        } catch (error) {
          // A competing natural completion is safe; never retry via force-cancel.
          const checked = await latestRun().catch(() => null);
          if (checked?.status !== 'completed') {
            output.partial = true;
            output.errors.push('cancel:' + run.id);
          }
        }
        pr = lastPR;
      }
      if (output.cancelled.length >= Math.min(80, maxCancels)) break;
      if (rows.length < 100) break;
      if (page === 3) output.partial = true;
    }
  }
  if (dryRun) output.status = 'DRY_RUN';
  log('HH_CI_HEAD_PRUNE ' + JSON.stringify(output));
  return output;
}

module.exports = { TARGET, verifyEvent, isLive, eligible, prune };
