export function evaluateLabRelease({now, history, sha, budget, isolation, lease, target, projectId}) {
  if (projectId !== 'prj_bjwATbHF61gzEhfsrNe54lEnvJZw') return 'wrong-project';
  if (target !== 'preview') return 'wrong-target';
  if (isolation !== 'verified') return 'isolation-unverified';
  if (budget !== 'verified') return 'budget-unverified';
  if (lease !== 'verified') return 'central-lease-unverified';
  if (!/^[0-9a-f]{40}$/.test(sha)) return 'invalid-sha';
  if (!Array.isArray(history)) return 'history-unavailable';
  const recent = history.filter(x => Number.isFinite(x.time) && x.time <= now && now-x.time < 86400000);
  if (recent.some(x => x.sha === sha)) return 'duplicate-sha';
  if (recent.length >= 12) return 'daily-limit';
  if (recent.some(x => now-x.time < 1800000)) return 'cooldown';
  return 'allowed';
}
