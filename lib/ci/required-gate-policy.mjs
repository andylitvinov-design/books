/**
 * Read-only effective required status policy for the Core/Specialist migration.
 * A missing, partial, unknown or conflicting rule MUST NOT be treated as green.
 * This module never grants merge authorization or modifies branch protection.
 */
const SHA = /^[a-f0-9]{40}$/i;
const NAMES = ['hh-core-verified', 'hh-specialist', 'release-ready'];
const VALID = new Map([
  ['release-ready', 'legacy'],
  ['hh-core-verified,hh-specialist,release-ready', 'dual'],
  ['hh-core-verified,hh-specialist', 'migrated'],
]);
const FAILURES = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'stale', 'skipped', 'neutral']);

/** Resolve the complete effective rule union, not only the legacy alias. */
export function resolveRequiredGatePolicy(rules) {
  if (!Array.isArray(rules)) throw Error('REQUIRED_GATE_RULES_UNAVAILABLE');
  const relevant = rules.filter(rule => rule?.type === 'required_status_checks');
  if (!relevant.length) throw Error('REQUIRED_GATE_RULES_MISSING');
  const byName = new Map();
  for (const rule of relevant) {
    const required = rule.parameters?.required_status_checks;
    if (!Array.isArray(required) || !required.length) throw Error('REQUIRED_GATE_RULES_INVALID');
    for (const item of required) {
      const name = item?.context;
      const id = item?.integration_id;
      if (!NAMES.includes(name) || !Number.isSafeInteger(id) || id < 1) {
        throw Error('REQUIRED_GATE_UNKNOWN_CONTEXT_OR_APP');
      }
      if (byName.has(name) && byName.get(name) !== id) {
        throw Error('REQUIRED_GATE_CONFLICTING_APPS');
      }
      byName.set(name, id);
    }
  }
  const contexts = [...byName.keys()].sort();
  const mode = VALID.get(contexts.join(','));
  if (!mode) throw Error('REQUIRED_GATE_PARTIAL_MIGRATION');
  const appIds = new Set(byName.values());
  if (appIds.size !== 1) throw Error('REQUIRED_GATE_CONFLICTING_APPS');
  return { mode, contexts, appId: [...appIds][0] };
}

/**
 * A per-context read is necessary: a commit can have >100 unrelated checks.
 * One insufficient, stale or paginated read leaves the candidate unresolved.
 * A confirmed failure never becomes green because a sibling check succeeded.
 */
export function assessRequiredGates({ head, policy, observations }) {
  const unknown = { state: 'UNKNOWN' };
  if (!SHA.test(head || '') || !policy || !Number.isSafeInteger(policy.appId) || policy.appId < 1 ||
      !['legacy', 'dual', 'migrated'].includes(policy.mode) || !Array.isArray(policy.contexts) ||
      !Array.isArray(observations) || observations.length !== policy.contexts.length ||
      VALID.get([...policy.contexts].sort().join(',')) !== policy.mode) return unknown;
  const seen = new Set(), failures = [], waiting = [], successes = [];
  for (const observation of observations) {
    const name = observation?.context;
    const checks = observation?.check_runs;
    const total = observation?.total_count;
    if (!policy.contexts.includes(name) || seen.has(name) || !Array.isArray(checks) ||
        !Number.isSafeInteger(total) || total !== checks.length || total < 1 || total > 100) {
      return unknown;
    }
    seen.add(name);
    if (checks.some(c => c?.name !== name || c?.app?.id !== policy.appId ||
        c.head_sha !== head || !Number.isSafeInteger(c.id) || c.id < 1)) return unknown;
    if (checks.length > 1 && checks.some(c => !Number.isFinite(Date.parse(c.started_at || '')))) return unknown;
    const ordered = [...checks].sort((a,b) =>
      (Date.parse(b.started_at) || 0) - (Date.parse(a.started_at) || 0) || b.id - a.id);
    const check = ordered[0];
    if (check.status !== 'completed') waiting.push({ name, id: check.id });
    else if (check.conclusion === 'success') successes.push({ name, id: check.id });
    else if (FAILURES.has(check.conclusion)) failures.push({ name, id: check.id, conclusion: check.conclusion });
    else return unknown;
  }
  if (seen.size !== policy.contexts.length) return unknown;
  const failedIds = failures.map(x => x.id);
  if (failures.length) return { state: 'FAILED', check_run_id: failedIds[0],
    check_run_ids: failedIds, failed_contexts: failures.map(x => x.name),
    pending_contexts: waiting.map(x => x.name), conclusion: failures[0].conclusion };
  if (waiting.length) return { state: 'WAITING', check_run_id: waiting[0].id,
    pending_contexts: waiting.map(x => x.name) };
  if (successes.length !== policy.contexts.length) return unknown;
  return { state: 'SUCCESS', check_run_ids: successes.map(x => x.id) };
}
