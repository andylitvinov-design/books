// Independent Vercel clock for a best-effort GitHub scheduled Watchdog.
// Only posts a documented workflow_dispatch after a verified inactivity gap.
// No source writes, PR comments, merges or synthetic CI results.
export const REPOSITORY = 'andylitvinov-design/books'
export const CONTROL_BRANCH = 'codex/bootstrap-books'
export const WATCHDOG_WORKFLOW = 'hh-pr-ten-minute-watchdog.yml'
export const STALE_AFTER_MS = 11 * 60_000
const VALID_EVENTS = new Set(['schedule', 'workflow_run', 'workflow_dispatch'])
const VALID_STATES = new Set(['queued', 'in_progress', 'pending', 'requested', 'waiting', 'completed'])

export function decideWatchdogWake(history, now = Date.now()) {
  if (!history || !Number.isSafeInteger(history.total_count) || history.total_count < 0 ||
      !Array.isArray(history.workflow_runs) || history.workflow_runs.length > 10 ||
      history.workflow_runs.length > history.total_count) return {wake: false, reason: 'UNVERIFIED_HISTORY'}
  if (history.total_count && history.workflow_runs.length === 0) return {wake: false, reason: 'INCOMPLETE_HISTORY'}
  let latest = null
  for (const run of history.workflow_runs) {
    if (!run || !Number.isSafeInteger(run.id) || !run.status ||
        !VALID_STATES.has(run.status) || typeof run.event !== 'string' ||
        typeof run.created_at !== 'string') return {wake: false, reason: 'INVALID_HISTORY_RECORD'}
    if (!VALID_EVENTS.has(run.event) || run.head_branch !== CONTROL_BRANCH ||
        run.conclusion === 'skipped' || run.conclusion === 'cancelled') continue
    const timestamp = Date.parse(run.created_at)
    if (!Number.isFinite(timestamp) || timestamp > now + 60_000) return {wake: false, reason: 'UNVERIFIED_TIMESTAMP'}
    if (!latest || timestamp > latest.timestamp)
      latest = {timestamp, id:run.id, event:run.event, status:run.status}
  }
  if (latest && now - latest.timestamp < STALE_AFTER_MS)
    return {wake: false, reason: 'RECENT_REAL_WORKFLOW_RUN',
      lastRunId: latest.id, lastRunAt: new Date(latest.timestamp).toISOString(),
      lastEvent: latest.event}
  return {wake: true, reason: 'NO_RECENT_REAL_WORKFLOW_RUN',
    lastRunId: latest?.id ?? null, lastRunAt: latest ? new Date(latest.timestamp).toISOString() : null,
    lastEvent: latest?.event ?? null}
}

export async function runWatchdogBackstop({
  token, now = Date.now(), fetcher = fetch, timeout = AbortSignal.timeout
} = {}) {
  if (typeof token !== 'string' || token.length < 20)
    return {status: 503, body: {status:'blocked',reason:'ACTIONS_WRITE_TOKEN_NOT_CONFIGURED'}}
  const base = 'https://api.github.com/repos/' + REPOSITORY +
    '/actions/workflows/' + WATCHDOG_WORKFLOW
  const headers = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }
  let history
  try {
    const result = await fetcher(base + '/runs?per_page=10',
      {headers, signal: timeout(9000), cache:'no-store'})
    if (result.status !== 200) return {status:503,body:{status:'blocked',reason:'GITHUB_HISTORY_READ_DENIED'}}
    const remaining = Number(result.headers?.get?.('x-ratelimit-remaining'))
    if (Number.isFinite(remaining) && remaining >= 0 && remaining < 100)
      return {status:503,body:{status:'blocked',reason:'GITHUB_RATE_RESERVE_LOW'}}
    history = await result.json()
  } catch {
    return {status:503,body:{status:'blocked',reason:'GITHUB_HISTORY_UNAVAILABLE'}}
  }
  const decision = decideWatchdogWake(history,now)
  if (!decision.wake) return {status:decision.reason==='RECENT_REAL_WORKFLOW_RUN'?200:503,
    body:{status:decision.reason==='RECENT_REAL_WORKFLOW_RUN'?'healthy_recent_activity':'blocked',...decision}}
  try {
    const response = await fetcher(base + '/dispatches', {
      method:'POST',
      headers:{...headers,'Content-Type':'application/json'},
      body:JSON.stringify({ref:CONTROL_BRANCH,inputs:{dry_run:'false'}}),
      signal:timeout(9000),cache:'no-store'
    })
    if (response.status !== 204)
      return {status:503,body:{status:'blocked',reason:'GITHUB_ACTIONS_WRITE_DENIED_OR_UNAVAILABLE'}}
    return {status:202,body:{status:'dispatch_accepted',reason:decision.reason,
      lastRunAt:decision.lastRunAt,lastEvent:decision.lastEvent,
      dispatchEvent:'workflow_dispatch',executionVerified:false}}
  } catch {
    return {status:503,body:{status:'blocked',reason:'GITHUB_DISPATCH_UNAVAILABLE'}}
  }
}
