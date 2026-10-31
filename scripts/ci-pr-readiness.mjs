// Fail-closed early runner-minute guard: run after checkout, before setup-node/npm/Next.
// Advisory efficiency check; NOT a substitute for the immutable-base release-ready gate.
import { readFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SHA = /^[0-9a-f]{40}$/i;
const fail = (code, message) => ({ ready: false, code, message });

export function assessPrReadiness(event, live, repository) {
  const pr = event?.pull_request;
  if (!pr || !live || event.repository?.full_name !== repository) {
    return fail('invalid_event', 'Cannot confirm PR and repository identity');
  }
  if (!Number.isInteger(pr.number) || pr.number < 1 || live.number !== pr.number) {
    return fail('pr_mismatch', 'Live PR number differs from event payload');
  }
  if (pr.base?.ref !== 'codex/public-book-library' || live.base?.ref !== pr.base.ref) {
    return fail('base_branch_changed', 'Production target differs from current PR base');
  }
  if (pr.head?.repo?.full_name !== repository || live.head?.repo?.full_name !== repository) {
    return fail('fork_head', 'Fork-head PR needs separate trusted/manual review');
  }
  if (!SHA.test(pr.head?.sha ?? '') || !SHA.test(pr.base?.sha ?? '')) {
    return fail('invalid_sha', 'Event HEAD/base SHA missing or invalid');
  }
  if (live.head?.sha !== pr.head.sha) {
    return fail('superseded_head', 'Newer PR HEAD exists; do not build old commit');
  }
  if (live.base?.sha !== pr.base.sha) {
    return fail('superseded_base', 'Production base moved since event; refresh PR');
  }
  if (pr.draft || live.draft) {
    return fail('draft', 'PR is Draft: finish edits before expensive acceptance');
  }
  if (live.state !== 'open') {
    return fail('closed', 'PR is no longer open');
  }
  if (live.mergeable === false || live.mergeable_state === 'dirty') {
    return fail('conflict', 'Merge conflicts must be repaired before heavy CI');
  }
  if (live.mergeable !== true || live.mergeable_state === 'unknown') {
    return fail('mergeability_pending', 'GitHub has not confirmed mergeability');
  }
  // Blocked/unstable may be caused by pending CI or reviews: never deadlock CI.
  return { ready: true, code: 'ready', message: 'Exact HEAD/base current and mergeable' };
}

async function readLivePr(repository, number, token) {
  const response = await fetch(`https://api.github.com/repos/${repository}/pulls/${number}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`GitHub PR read failed: HTTP ${response.status}`);
  return response.json();
}

function emit(result) {
  const status = result.ready ? 'PASS' : 'BLOCK';
  console.log(`PR early-readiness ${status}: ${result.code}: ${result.message}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `- PR early-readiness **${status}**: ${result.code} — ${result.message}\n`);
  }
}

export async function main() {
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request') {
    emit({ ready: true, code: 'non_pr', message: 'Push/merge-group/manual coverage unchanged' });
    return;
  }
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !token || !eventPath) {
    throw new Error('Missing read-only GitHub token, repository or event payload');
  }
  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
  if (!Number.isInteger(event?.pull_request?.number) || event.pull_request.number < 1) {
    throw new Error('PR number missing; expensive work not authorized');
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const live = await readLivePr(repository, event.pull_request.number, token);
    const result = assessPrReadiness(event, live, repository);
    if (result.code !== 'mergeability_pending' || attempt === 2) {
      emit(result);
      if (!result.ready) process.exitCode = 1;
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    emit(fail('api_or_config_error', error.message));
    process.exitCode = 1;
  });
}
