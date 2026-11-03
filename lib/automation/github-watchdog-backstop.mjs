// Independent Vercel scheduler. A green workflow_run callback is NOT proof
// that Watchdog reconciled anything or that a CI Worker received a task.
export const REPOSITORY = 'andylitvinov-design/books'
export const CONTROL_BRANCH = 'codex/bootstrap-books'
export const WATCHDOG_WORKFLOW = 'hh-pr-ten-minute-watchdog.yml'
export const STALE_AFTER_MS = 11 * 60_000
const PENDING_GRACE_MS = 3 * 60_000
const RUN_EVENTS = ['schedule', 'workflow_dispatch', 'workflow_run']
const VALID_STATES = new Set(['queued', 'in_progress', 'pending', 'requested', 'waiting', 'completed'])
const ACTIVE_STATES = new Set(['queued', 'in_progress', 'pending', 'requested', 'waiting'])
const EXECUTION_STEP = 'Start workers from Watchdog with signed HEAD reservations'

function parseRuns(history, event, now) {
  if (!history || !Number.isSafeInteger(history.total_count) ||
      history.total_count < 0 || !Array.isArray(history.workflow_runs) ||
      history.workflow_runs.length > 10 ||
      history.workflow_runs.length > history.total_count ||
      (history.total_count > 0 && history.workflow_runs.length === 0))
    return null
  const runs = []
  for (const run of history.workflow_runs) {
    if (!run || !Number.isSafeInteger(run.id) || run.id < 1 ||
        run.event !== event || !VALID_STATES.has(run.status) ||
        !Number.isFinite(Date.parse(run.created_at || ''))) return null
    const createdAt = Date.parse(run.created_at)
    if (createdAt > now + 60_000) return null
    if (run.head_branch === CONTROL_BRANCH &&
        !['cancelled', 'skipped'].includes(run.conclusion))
      runs.push({...run, createdAt})
  }
  return runs
}

// A real schedule *delivery* is tracked separately from execution and manual wake.
export function scheduledCadence(runs, now = Date.now()) {
  if (!Array.isArray(runs) || runs.length < 3) return false
  const dates = runs.slice(0, 3).map(run => Date.parse(run.created_at || ''))
  if (dates.some(time => !Number.isFinite(time)) || now - dates[0] > 20 * 60_000)
    return false
  return dates.slice(1).every((time, index) => {
    const gap = dates[index] - time
    return gap >= 7 * 60_000 && gap <= 13 * 60_000
  })
}

// Inspect the actual dispatcher JOB and step, not the surrounding workflow status.
export function verifyHandoffJob(payload) {
  if (!payload || !Number.isSafeInteger(payload.total_count) ||
      payload.total_count < 0 || payload.total_count > 100 ||
      !Array.isArray(payload.jobs) || payload.jobs.length !== payload.total_count)
    return 'JOB_HISTORY_UNVERIFIED'
  const jobs = payload.jobs.filter(job => job?.name === 'direct-handoff')
  if (jobs.length !== 1) return 'DIRECT_HANDOFF_UNVERIFIED'
  const job = jobs[0]
  if (job.status === 'completed' && job.conclusion === 'skipped') return 'HANDOFF_SKIPPED'
  const runnerStarted = typeof job.runner_name === 'string' && job.runner_name.length > 0 &&
    Number.isFinite(Date.parse(job.started_at || '')) &&
    Number.isSafeInteger(job.id) && job.id > 0
  if (!runnerStarted) return ACTIVE_STATES.has(job.status) ? 'WAITING_FOR_RUNNER' : 'RUNNER_NOT_PROVEN'
  if (job.status === 'in_progress') return 'RUNNER_IN_PROGRESS'
  if (job.status !== 'completed' || job.conclusion !== 'success') return 'HANDOFF_JOB_UNSUCCESSFUL'
  if (!Array.isArray(job.steps) || !job.steps.some(step =>
    step.name === EXECUTION_STEP && step.status === 'completed' && step.conclusion === 'success'))
    return 'DISPATCH_STEP_NOT_EXECUTED'
  return 'DISPATCHER_EXECUTED'
}

export function decideWatchdogWake(histories, now = Date.now(), observations = new Map()) {
  if (!Number.isFinite(now) || !histories || !(observations instanceof Map))
    return {wake:false,reason:'UNVERIFIED_HISTORY'}
  const runs = []
  for (const event of RUN_EVENTS) {
    const parsed = parseRuns(histories[event], event, now)
    if (!parsed) return {wake:false,reason:'UNVERIFIED_HISTORY'}
    runs.push(...parsed)
  }
  const scheduled = runs.filter(run => run.event === 'schedule')
    .sort((a, b) => b.createdAt - a.createdAt)
  const nativeScheduleVerified = scheduledCadence(scheduled, now)
  const lastScheduleAt = scheduled[0]?.created_at || null
  const evidence = runs.filter(run => now - run.createdAt < STALE_AFTER_MS)
    .sort((a, b) => b.createdAt - a.createdAt)
  for (const run of evidence) {
    const proof = observations.get(run.id)
    if (proof === 'DISPATCHER_EXECUTED')
      return {wake:false,reason:'VERIFIED_DISPATCHER_RUNNER',runId:run.id,
        event:run.event,lastScheduleAt,nativeScheduleVerified}
  }
  for (const run of evidence) {
    const proof = observations.get(run.id)
    if (!proof || proof === 'JOB_HISTORY_UNVERIFIED' || proof === 'DIRECT_HANDOFF_UNVERIFIED')
      return {wake:false,reason:'JOB_EVIDENCE_UNVERIFIED',runId:run.id,
        lastScheduleAt,nativeScheduleVerified}
    if (ACTIVE_STATES.has(run.status) && now - run.createdAt < PENDING_GRACE_MS &&
        ['WAITING_FOR_RUNNER', 'RUNNER_IN_PROGRESS'].includes(proof))
      return {wake:false,reason:'WATCHDOG_RUNNER_PENDING',runId:run.id,
        lastScheduleAt,nativeScheduleVerified}
  }
  return {wake:true,reason:'NO_VERIFIED_RECENT_DISPATCHER_RUNNER',
    lastScheduleAt,nativeScheduleVerified}
}

async function requestJson(fetcher, url, headers, timeout) {
  const response = await fetcher(url,{
    headers,signal:timeout(7000),cache:'no-store'
  })
  if (response.status !== 200) throw Error('GITHUB_READ_DENIED')
  const raw = response.headers?.get?.('x-ratelimit-remaining')
  if (raw != null && Number.isFinite(Number(raw)) && Number(raw) < 100)
    throw Error('GITHUB_RATE_RESERVE_LOW')
  return response.json()
}

export async function runWatchdogBackstop({
  token, now = Date.now(), fetcher = fetch, timeout = AbortSignal.timeout
} = {}) {
  if (typeof token !== 'string' || token.length < 20)
    return {status:503,body:{status:'blocked',reason:'ACTIONS_WRITE_TOKEN_NOT_CONFIGURED'}}
  const base = 'https://api.github.com/repos/' + REPOSITORY +
    '/actions/workflows/' + WATCHDOG_WORKFLOW
  const headers = {
    Authorization:'Bearer ' + token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'
  }
  let histories
  try {
    const entries = await Promise.all(RUN_EVENTS.map(async event => [
      event,await requestJson(fetcher,base+'/runs?event='+event+'&per_page=10',headers,timeout)
    ]))
    histories = Object.fromEntries(entries)
  } catch (error) {
    return {status:503,body:{status:'blocked',
      reason:error?.message === 'GITHUB_RATE_RESERVE_LOW' ? 'GITHUB_RATE_RESERVE_LOW' : 'GITHUB_HISTORY_UNAVAILABLE'}}
  }
  const prelim = decideWatchdogWake(histories,now)
  if (prelim.reason === 'UNVERIFIED_HISTORY')
    return {status:503,body:{status:'blocked',...prelim}}
  const recent = RUN_EVENTS.flatMap(event => histories[event].workflow_runs)
    .filter(run => run.head_branch === CONTROL_BRANCH &&
      !['cancelled','skipped'].includes(run.conclusion) &&
      now - Date.parse(run.created_at) < STALE_AFTER_MS)
  // Preserve each trigger class so noisy Core-success callbacks cannot crowd
  // out the scheduled / manually dispatched full reconciliation run.
  const selection = RUN_EVENTS.flatMap(event =>
    recent.filter(run => run.event === event).slice(0,event==='workflow_run'?3:2))
  const observed = new Map()
  try {
    await Promise.all(selection.map(async run => {
      const url = 'https://api.github.com/repos/' + REPOSITORY +
        '/actions/runs/' + run.id + '/jobs?per_page=100'
      const jobs = await requestJson(fetcher,url,headers,timeout)
      observed.set(run.id,verifyHandoffJob(jobs))
    }))
  } catch {
    return {status:503,body:{status:'blocked',reason:'GITHUB_JOB_EVIDENCE_UNAVAILABLE',
      nativeScheduleVerified:prelim.nativeScheduleVerified,
      lastScheduleAt:prelim.lastScheduleAt}}
  }
  const decision = decideWatchdogWake(histories,now,observed)
  if (!decision.wake)
    return {status:decision.reason === 'JOB_EVIDENCE_UNVERIFIED'?503:200,
      body:{status:decision.reason === 'VERIFIED_DISPATCHER_RUNNER'?
        'watchdog_sweep_verified':decision.reason === 'WATCHDOG_RUNNER_PENDING'?
        'pending_runner':'blocked',...decision,
        taskTransferVerified:false,ciRunnerVerified:false}}
  try {
    const response = await fetcher(base+'/dispatches',{
      method:'POST',headers:{...headers,'Content-Type':'application/json'},
      body:JSON.stringify({ref:CONTROL_BRANCH,inputs:{dry_run:'false'}}),
      signal:timeout(9000),cache:'no-store'
    })
    if (response.status !== 204)
      return {status:503,body:{status:'blocked',
        reason:'GITHUB_ACTIONS_WRITE_DENIED_OR_UNAVAILABLE',...decision}}
    return {status:202,body:{status:'dispatch_accepted',...decision,
      dispatchEvent:'workflow_dispatch',executionVerified:false,
      taskTransferVerified:false,ciRunnerVerified:false}}
  } catch {
    return {status:503,body:{status:'blocked',reason:'GITHUB_DISPATCH_UNAVAILABLE',...decision}}
  }
}
