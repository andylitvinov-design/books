/**
 * Fail-closed, read-only PR sweep policy. No merge action is exported.
 * All statuses must refer to the *current* PR head (and current target base).
 */
import { createHash } from 'node:crypto';

export const LEASE_MARKER = '<!-- HH_PR_SWEEP_LEASE_V1 -->';
export const MAX_LEASE_MS = 30 * 60_000;
const PASSED = new Set(['success']);
const TERMINAL_FAILURE = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'stale']);

export function productionSpecialists(paths) {
  const files = Array.isArray(paths) ? paths : [];
  const any = (...rules) => files.some(path => rules.some(rule => rule.test(path)));
  const required = new Set();
  const all = any(/^(package(-lock)?\.json|AGENTS\.md|middleware\.ts)$/, /^next\.config\./);
  const db = any(/^supabase\/migrations\//);
  if (all || db || any(/^components\/app\//, /^lib\/app\//, /^lib\/assessments\//, /^app\/api\/app\//, /^app\/.*\/app\//, /^app\/.*\/client\//, /^\.github\/workflows\/hh-app-(r1|browser)\.yml$/)) {
    required.add('unit-build');
    required.add('database');
  }
  if (all || db || any(/^lib\/(billing|commerce|checkout)\//, /^components\/commerce\//, /^app\/api\/(billing|payments)\//, /^\.github\/workflows\/hh-billing-isolated\.yml$/)) {
    required.add('billing-database');
  }
  if (all || db || any(/^lib\/interpretation\//, /^data\/assessments\//, /^app\/api\/assessments\//, /^\.github\/workflows\/hh-interpretation-database\.yml$/)) {
    required.add('interpretation-database');
  }
  if (all || any(/^lib\/(course|opora|antistress)\//, /^components\/(opora|antistress|anti-stress|my-course)[^/]*\//, /^components\/(opora|antistress|anti-stress|my-course)/, /^app\/.*\/(courses|academy)\//, /^\.github\/workflows\/opora-module-ci\.yml$/)) {
    required.add('module-routing');
  }
  if (all || db || any(/^lib\/(security|ia|encryption|app)\//, /^app\/api\/(auth|app)\//, /^app\/.*\/(app|client)\//, /^components\/app\//, /^\.github\/workflows\/ia-v2\.yml$/)) {
    required.add('verify');
  }
  if (all || any(/^lib\/holistic-support\//, /^components\/(holistic-|mandala-|remote-energy-|taoist-)/, /^app\/.*\/holistic-support\//, /^app\/api\/public\//, /^\.github\/workflows\/hh-public-services-production\.yml$/)) {
    required.add('public-services');
  }
  if (all || db || any(/^components\/app\//, /^app\/.*\/app\//, /^app\/.*\/client\//, /^\.github\/workflows\/hh-app-browser\.yml$/)) {
    required.add('browser (chromium, core)');
    required.add('browser (webkit, core)');
  }
  // Additional high-volume, path-scoped release workflows must pass their own
  // actual jobs. A successful general build cannot stand in for a missing CRM,
  // private-media, practitioner, visual, or notification contract.
  // Keep each matcher a SUBSET of the corresponding workflow's PR paths.
  // This map is deliberately not presented as a complete 90-workflow aggregate.
  if (any(/^lib\/crm\//, /^app\/api\/app\/crm\//, /^components\/app\/crm-[^/]+/, /^tests\/crm-[^/]+/, /^\.github\/workflows\/hh-crm-source-check\.yml$/)) {
    required.add('crm');
    required.add('build');
  }
  if (any(/^components\/app\/(?:app-workspace|my-services-dashboard|practice-inner-navigation)\.jsx$/, /^components\/practice-showcase(?:\.jsx|\.module\.css)$/, /^scripts\/verify-practice-post-google-browser\.mjs$/, /^\.github\/workflows\/practice-google-browser\.yml$/)) {
    required.add('signed-in-mock-browser');
  }
  if (any(/^lib\/practitioners\//, /^components\/app\/practice-workspace\.jsx$/, /^components\/app\/practice-materials\.[^/]+$/, /^components\/practitioner-presentation-video\.[^/]+$/, /^\.github\/workflows\/practitioner-presentations\.yml$/)) {
    required.add('presentation-contract');
  }
  if (any(/^components\/session-audio-recorder\.jsx$/, /^lib\/clients\/(?:recording-upload|session-delivery-[^/]+)\.js$/, /^app\/api\/client-session-viewer\//, /^\.github\/workflows\/hh-private-audio-e2e\.yml$/)) {
    required.add('private-audio');
  }
  if (any(/^components\/practice-showcase\.jsx$/, /^scripts\/verify-practice-visual-browser\.mjs$/, /^\.github\/workflows\/practice-visual-browser\.yml$/)) {
    required.add('practice-visual-parity');
  }
  if (any(/^components\/app\/(?:simple-service-editor|my-services-dashboard)\.[^/]+$/, /^components\/app\/practice-workspace\.jsx$/, /^\.github\/workflows\/practice-visual-services\.yml$/)) {
    required.add('service-editor');
  }
  if (any(/^components\/app\/my-progress\.[^/]+$/, /^lib\/app\/(?:my-progress\.mjs|video-progress\.js)$/, /^app\/api\/app\/video-progress\/route\.js$/, /^\.github\/workflows\/hh-my-progress-release\.yml$/)) {
    required.add('private-progress');
  }
  if (any(/^lib\/app\/messenger-notification-[^/]+\.js$/, /^components\/app\/messenger-notification-settings\.[^/]+$/, /^app\/api\/app\/notification-channels\//, /^\.github\/workflows\/hh-messenger-notification-build\.yml$/)) {
    required.add('notification-build');
  }
  if (any(/^lib\/kling-(?:video|avatar)\.mjs$/, /^components\/kling-(?:scene|avatar)-studio\.tsx$/, /^\.github\/workflows\/hh-kling-video\.yml$/)) {
    required.add('kling');
  }
  if (any(/^lib\/personal-coaching\//, /^components\/app\/personal-coaching[^/]+/, /^\.github\/workflows\/hh-personal-coaching-session\.yml$/)) {
    required.add('focused-verification');
  }
  if (any(/^\.github\/workflows\/[^/]+\.ya?ml$/)) required.add('actionlint-changed');
  if (any(/^lib\/ci\/pr-sweep-guard\.mjs$/, /^scripts\/pr-sweep-guard\.mjs$/, /^tests\/pr-sweep-guard\.test\.mjs$/, /^\.github\/workflows\/hh-pr-sweep-guard\.yml$/)) required.add('guard-unit');
  return [...required].sort();
}

function timestamp(check) {
  return Date.parse(check.completed_at || check.started_at || check.created_at || '') || 0;
}
function latestChecks(checks) {
  const byName = new Map();
  for (const check of checks || []) {
    if (!check?.name) continue;
    const key = String(check.name);
    const existing = byName.get(key);
    if (!existing || timestamp(check) > timestamp(existing) ||
      (timestamp(check) === timestamp(existing) && Number(check.id || 0) > Number(existing.id || 0))) {
      byName.set(key, check);
    }
  }
  return byName;
}

export function analyzeCI({ pr, checks = [], statuses = [], workflowRuns = [], paths = [], required = ['release-ready'] }) {
  const blockers = [];
  const head = pr?.head?.sha;
  const base = pr?.base?.sha;
  if (!head || !base) blockers.push('PR_HEAD_OR_BASE_UNKNOWN');
  if (pr?.state !== 'open') blockers.push('PR_NOT_OPEN');
  if (pr?.draft !== false) blockers.push('PR_IS_DRAFT');
  if (pr?.base?.ref !== 'codex/public-book-library') blockers.push('NON_PRODUCTION_TARGET');
  if (pr?.mergeable === false || ['dirty', 'blocked'].includes(pr?.mergeable_state)) blockers.push('MERGE_CONFLICT_OR_BLOCKED');
  if (!Array.isArray(paths) || !paths.length) blockers.push('DIFF_EMPTY_OR_UNAVAILABLE');
  const byName = latestChecks(checks);
  const duplicates = new Map();
  for (const check of checks || []) {
    if (!check?.name) continue;
    duplicates.set(check.name, (duplicates.get(check.name) || 0) + 1);
  }
  // A repeated context can originate from another workflow, not merely a successful retry.
  // Without workflow identity we cannot safely discard the earlier failure.
  for (const [name, count] of duplicates) if (count > 1) blockers.push(`AMBIGUOUS_CHECK:${name}`);
  const expected = [...new Set([...required, ...productionSpecialists(paths)])];
  for (const name of expected) {
    const check = byName.get(name);
    if (!check) blockers.push(`MISSING:${name}`);
    else if (check.head_sha !== head) blockers.push(`WRONG_OR_UNKNOWN_HEAD:${name}`);
    else if (check.status !== 'completed') blockers.push(`WAITING:${name}`);
    else if (!PASSED.has(check.conclusion)) blockers.push(`NOT_SUCCESS:${name}:${check.conclusion || 'unknown'}`);
  }
  // A successful core gate cannot override failed/cancelled/pending specialist checks.
  for (const [name, check] of byName) {
    if (check.head_sha !== head) {
      blockers.push(`WRONG_HEAD:${name}`);
    } else if (check.status !== 'completed') {
      blockers.push(`WAITING:${name}`);
    } else if (TERMINAL_FAILURE.has(check.conclusion)) {
      blockers.push(`FAILED:${name}:${check.conclusion}`);
    } else if (check.conclusion !== 'success' && expected.includes(name)) {
      blockers.push(`NOT_SUCCESS:${name}:${check.conclusion || 'unknown'}`);
    }
  }
  // GitHub can reject a workflow before creating jobs/check-runs (jobs=0).
  // Inspect actual run records on the exact SHA, including push validation failures.
  const seenRunIds = new Set();
  for (const run of workflowRuns) {
    if (!['push', 'pull_request', 'merge_group'].includes(run?.event)) continue;
    const id = Number(run.id);
    if (!Number.isSafeInteger(id) || seenRunIds.has(id)) {
      blockers.push('AMBIGUOUS_WORKFLOW_RUN');
      continue;
    }
    seenRunIds.add(id);
    if (run.head_sha !== head) blockers.push(`WRONG_HEAD_WORKFLOW:${id}`);
    else if (run.status !== 'completed') blockers.push(`WAITING_WORKFLOW:${id}`);
    else if (run.conclusion !== 'success') blockers.push(`FAILED_WORKFLOW:${id}:${run.conclusion || 'unknown'}`);
  }
  // GitHub statuses are newest first; superseded successes are not current evidence.
  const currentStatuses = new Map();
  for (const status of statuses) {
    if (status?.context && !currentStatuses.has(status.context)) currentStatuses.set(status.context, status);
  }
  // No failures observed is not proof of a completed exact-head CI check.
  // This is a minimum evidence guard, NOT complete specialist coverage.
  const positiveExactHeadCI = [...byName.values()].some(check =>
    check.head_sha === head && check.status === 'completed' && check.conclusion === 'success') ||
    workflowRuns.some(run => ['push', 'pull_request', 'merge_group'].includes(run?.event) &&
      run.head_sha === head && run.status === 'completed' && run.conclusion === 'success') ||
    [...currentStatuses.values()].some(status => status.state === 'success' &&
      (status.sha === head || status.head_sha === head));
  if (!positiveExactHeadCI) blockers.push('NO_POSITIVE_EXACT_HEAD_CI');
  // Legacy commit-status contexts are as important as Actions check-runs.
  for (const s of currentStatuses.values()) {
    if (s.state !== 'success') blockers.push(`COMMIT_STATUS:${s.context}:${s.state || 'unknown'}`);
  }
  // CI readiness is not authorization to merge: reviews, rules, SHA lease and live rollout are separate.
  const unique = [...new Set(blockers)].sort();
  return { ci_ready: unique.length === 0, blockers: unique, required_checks: expected.sort(), observed_checks: byName.size };
}

export function evidenceKey({ pr, checks = [], statuses = [], workflowRuns = [], paths = [] }) {
  const slim = {
    head: pr?.head?.sha || '', base: pr?.base?.sha || '',
    paths: [...paths].sort(),
    checks: checks.map(c => [c.name, c.id, c.status, c.conclusion, c.head_sha]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),
    statuses: statuses.map(s => [s.context, s.state]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),
    workflow_runs: workflowRuns.map(r => [r.id, r.event, r.name, r.head_sha, r.status, r.conclusion]).sort((a,b)=>Number(a[0])-Number(b[0])),
  };
  return createHash('sha256').update(JSON.stringify(slim)).digest('hex').slice(0, 24);
}

// During the rollout, baseline may not contain the core gate yet. Its absence
// is not proof that the PR passed. Core is required when installed on the
// actual base, or when a PR itself introduces or edits that workflow.
export function requiredCoreChecks({baseHasCore, paths = []}) {
  if (typeof baseHasCore !== 'boolean' || !Array.isArray(paths)) throw new Error('CORE_GATE_STATE_UNKNOWN');
  return baseHasCore || paths.includes('.github/workflows/hh-pr-core-release.yml')
    ? ['release-ready'] : [];
}

export function parseLease(body) {
  if (typeof body !== 'string' || !body.includes(LEASE_MARKER)) return null;
  try {
    const payload = body.slice(body.indexOf(LEASE_MARKER) + LEASE_MARKER.length).trim();
    // Lease owners may use plain JSON or the existing GitHub PR Markdown JSON fence.
    // Strict anchors prevent interpreting arbitrary prose, comments or embedded examples.
    const fenced = /^\`\`\`(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n\`\`\`[ \t]*$/.exec(payload);
    const state = JSON.parse(fenced ? fenced[1] : payload);
    if (state.schema !== 'HH_PR_SWEEP_LEASE_V1' || !/^[a-zA-Z0-9_.-]{2,80}$/.test(state.owner || '') ||
      !Number.isFinite(Date.parse(state.expires_at)) || !/^[a-f0-9]{40}$/.test(state.head_sha || '') ||
      !/^[a-f0-9]{40}$/.test(state.base_sha || '')) return null;
    return state;
  } catch { return null; }
}

export function renderLease(state) {
  return `${LEASE_MARKER}\n${JSON.stringify({schema:'HH_PR_SWEEP_LEASE_V1',...state}, null, 2)}`;
}

export function activeLease(comments, now = Date.now()) {
  // Oldest nonexpired claim wins, keyed by GitHub server comment ID. Refreshes edit that claim.
  // Leases intentionally span head changes, preventing simultaneous writes during a rebase.
  const claims = (comments || []).map(comment => ({
    id: Number(comment.id), state: parseLease(comment.body), created_at: comment.created_at,
  })).filter(c => Number.isSafeInteger(c.id) && c.state &&
    Date.parse(c.state.expires_at) > now && Date.parse(c.state.expires_at) <= now + MAX_LEASE_MS + 60_000 &&
    Number.isFinite(Date.parse(c.created_at)));
  claims.sort((a,b) => Number(a.id) - Number(b.id));
  return claims[0] || null;
}

export function makeLease({owner, head_sha, base_sha, leaseMinutes = 12, now = Date.now()}) {
  if (!/^[a-zA-Z0-9_.-]{2,80}$/.test(owner)) throw new Error('INVALID_OWNER');
  if (!/^[a-f0-9]{40}$/.test(head_sha) || !/^[a-f0-9]{40}$/.test(base_sha)) throw new Error('INVALID_SHA');
  if (!Number.isInteger(leaseMinutes) || leaseMinutes < 1 || leaseMinutes > MAX_LEASE_MS / 60_000) throw new Error('INVALID_LEASE_DURATION');
  return {schema:'HH_PR_SWEEP_LEASE_V1',owner,head_sha,base_sha,expires_at:new Date(now+leaseMinutes*60_000).toISOString(),last_action:'claimed'};
}
