// Fail-closed early runner-minute guard: run after checkout, before setup-node/npm/Next.
// Advisory efficiency check; NOT a substitute for the immutable-base release-ready gate.
import { readFileSync, appendFileSync, existsSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SHA = /^[0-9a-f]{40}$/i;
const fail = (code, message) => ({ ready: false, code, message });

export function assessPrReadiness(event, live, repository, ancestryProof = null) {
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
  // GitHub loose required checks permit production to advance after the
  // proposed merge snapshot was tested. This advisory preflight must not
  // invalidate a healthy unchanged HEAD solely because BASE advanced.
  // The required release-ready gate separately verifies the tested merge
  // checkout and enforces current-base freshness for sensitive changes.
  if (!SHA.test(live.base?.sha ?? '')) {
    return fail('invalid_live_base_sha', 'Cannot verify the current production commit');
  }
  if (pr.draft || live.draft) {
    return fail('draft', 'PR is Draft: finish edits before expensive acceptance');
  }
  if (live.state !== 'open') {
    return fail('closed', 'PR is no longer open');
  }
  // GitHub can temporarily retain a stale "dirty" bit after a fast-forward
  // update/ref refresh. Override it only when a separate Compare response proves
  // this exact live BASE is an ancestor of this exact live HEAD (ahead, never
  // diverged/behind). Missing, truncated, mismatched or unavailable proof fails closed.
  const exactFastForward = ancestryProof?.status === 'ahead' &&
    ancestryProof.base_sha === live.base.sha &&
    ancestryProof.head_sha === live.head.sha &&
    ancestryProof.merge_base_sha === live.base.sha;
  if ((live.mergeable === false || live.mergeable_state === 'dirty') && !exactFastForward) {
    return fail('conflict', 'Merge conflicts must be repaired before heavy CI');
  }
  if ((live.mergeable !== true || live.mergeable_state === 'unknown') && !exactFastForward) {
    return fail('mergeability_pending', 'GitHub has not confirmed mergeability');
  }
  // Blocked/unstable may be caused by pending CI or reviews: never deadlock CI.
  return { ready: true, code: 'ready', message: 'Exact HEAD and mergeability verified; trusted release gate pins the tested merge base' };
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

async function readExactBaseAncestry(repository, live, token) {
  const base = live?.base?.sha;
  const head = live?.head?.sha;
  if (!SHA.test(base ?? '') || !SHA.test(head ?? '')) return null;
  const response = await fetch(
    `https://api.github.com/repos/${repository}/compare/${base}...${head}`, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
      },
      signal: AbortSignal.timeout(8000),
    });
  if (!response.ok) return null;
  const comparison = await response.json();
  return {
    status: comparison.status,
    base_sha: comparison.base_commit?.sha,
    head_sha: comparison.head_commit?.sha,
    merge_base_sha: comparison.merge_base_commit?.sha,
  };
}

// The Public Services job uses a pinned Playwright container. actions/checkout
// trusts the workspace in the host runner HOME, but Bash steps run in a separate
// container HOME and may hit git's "dubious ownership" guard. Only after a live,
// exact-HEAD PR readiness PASS, trust the one verified GitHub checkout directory.
// Never use safe.directory=* or trust any caller-supplied path outside workspace.
export function verifiedPublicServicesCheckout(env = process.env, cwd = process.cwd()) {
  if (env.GITHUB_EVENT_NAME !== 'pull_request' ||
      env.HH_PUBLIC_QA_ORIGIN !== 'http://127.0.0.1:3100') return null;
  const workspace = env.GITHUB_WORKSPACE;
  if (typeof workspace !== 'string' || !workspace.startsWith('/') ||
      !existsSync(join(workspace, '.git'))) {
    throw new Error('Public Services checkout workspace missing or unverified');
  }
  const trustedPath = realpathSync(workspace);
  if (trustedPath !== realpathSync(cwd)) {
    throw new Error('Public Services checkout differs from current working directory');
  }
  return trustedPath;
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
    const ancestryProof = live.mergeable === false || live.mergeable_state === 'dirty'
      ? await readExactBaseAncestry(repository, live, token)
      : null;
    const result = assessPrReadiness(event, live, repository, ancestryProof);
    if (result.code !== 'mergeability_pending' || attempt === 2) {
      if (result.ready) {
        const publicWorkspace = verifiedPublicServicesCheckout();
        if (publicWorkspace) {
          // Trust exactly this checked-out repository, then keep all subsequent
          // immutable two-parent/ancestry checks intact in the protected workflow.
          execFileSync('git', ['config', '--global', '--add', 'safe.directory', publicWorkspace],
            { timeout: 4000, stdio: 'pipe' });
        }
      }
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
