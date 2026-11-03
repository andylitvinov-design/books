// Independent Vercel clock. Never treat a scheduler event or dispatch HTTP 200
// as evidence that a Watchdog job, a worker, or PR Core CI actually started.
export const REPOSITORY = 'andylitvinov-design/books'
export const CONTROL_BRANCH = 'codex/bootstrap-books'
export const WATCHDOG_WORKFLOW = 'hh-pr-ten-minute-watchdog.yml'
export const STALE_AFTER_MS = 11 * 60_000
const WATCHDOG_ID = 403593743
const MAX_RUNS = 10
const MAX_JOBS = 50
const VALID_EVENTS = new Set(['schedule', 'workflow_run', 'workflow_dispatch'])
const VALID_STATES = new Set(['queued', 'in_progress', 'pending', 'requested', 'waiting', 'completed'])
const BASE = 'https://api.github.com/repos/' + REPOSITORY

function validTime(value, now) {
  const time = typeof value === 'string' ? Date.parse(value) : NaN
  return Number.isFinite(time) && time <= now + 60_000 ? time : null
}
function safeId(value) { return Number.isSafeInteger(value) && value > 0 }
function isTrustedRun(run, now) {
  return run && safeId(run.id) && VALID_STATES.has(run.status) &&
    VALID_EVENTS.has(run.event) && run.head_branch === CONTROL_BRANCH &&
    run.conclusion !== 'skipped' && run.conclusion !== 'cancelled' &&
    validTime(run.created_at, now) !== null
}
// Pure decision: the most recent event is only a candidate for runner proof.
// In particular a queued workflow_dispatch must NEVER be called healthy.
export function decideWatchdogWake(history, now = Date.now()) {
  if (!history || !Number.isSafeInteger(history.total_count) || history.total_count < 0 ||
      !Array.isArray(history.workflow_runs) ||
      history.workflow_runs.length > MAX_RUNS ||
      history.workflow_runs.length > history.total_count)
    return {wake:false,reason:'UNVERIFIED_HISTORY'}
  if (history.total_count && !history.workflow_runs.length)
    return {wake:false,reason:'INCOMPLETE_HISTORY'}
  let latest = null
  for (const run of history.workflow_runs) {
    if (!run || !safeId(run.id) || !VALID_STATES.has(run.status) ||
        typeof run.event !== 'string' || typeof run.created_at !== 'string')
      return {wake:false,reason:'INVALID_HISTORY_RECORD'}
    if (!isTrustedRun(run,now)) continue
    const timestamp = validTime(run.created_at,now)
    if (!latest || timestamp > latest.timestamp)
      latest = {timestamp,id:run.id,event:run.event,status:run.status}
  }
  if (latest && now - latest.timestamp < STALE_AFTER_MS)
    return {wake:false,reason:'RECENT_RUN_REQUIRES_RUNNER_PROOF',
      lastRunId:latest.id,lastRunAt:new Date(latest.timestamp).toISOString(),
      lastEvent:latest.event}
  return {wake:true,reason:'NO_RECENT_REAL_WORKFLOW_RUN',
    lastRunId:latest?.id ?? null,
    lastRunAt:latest ? new Date(latest.timestamp).toISOString() : null,
    lastEvent:latest?.event ?? null}
}
function parseMarker(log, marker) {
  if (typeof log !== 'string' || log.length > 4_000_000) return null
  const line = log.split('\n').filter(x => x.includes(marker)).pop()
  if (!line) return null
  const start = line.indexOf(marker) + marker.length
  try { return JSON.parse(line.slice(start).trim()) } catch { return null }
}
export function parseHandoffEvidence(log) {
  const control = parseMarker(log,'HH_CONTROL_TOWER: ')
  const handoff = parseMarker(log,'HH_WATCHDOG_DIRECT_HANDOFF ')
  if (control?.schema !== 'HH_CONTROL_DISPATCH_V1' || control.dryRun ||
      !Array.isArray(control.workerRuns) || !Number.isSafeInteger(control.candidates) ||
      !Number.isSafeInteger(control.dispatchAccepted) ||
      control.candidates < 0 || control.dispatchAccepted < 0 ||
      control.dispatchAccepted > control.candidates || !handoff ||
      handoff.candidates !== control.candidates ||
      handoff.dispatched !== control.dispatchAccepted ||
      control.workerRuns.filter(w => w.outcome === 'DISPATCH_ACCEPTED').length !== control.dispatchAccepted)
    return null
  return {candidates:control.candidates,dispatchAccepted:control.dispatchAccepted,
    reason:control.reason,blocked:handoff.blocked || {},
    checkedAt:control.checkedAt,
    workerRuns:control.workerRuns.filter(w => w.outcome === 'DISPATCH_ACCEPTED')}
}
// The independent worker and Core checks never write PRs or synthesize checks.
// If evidence is missing, emit pending/unverified rather than an invented success.
export async function inspectWatchdogRun({id, now=Date.now(), get, readLog}) {
  if (!safeId(id)) return {status:'unverified',reason:'INVALID_RUN_ID',runnerStarted:false}
  let run, jobs
  try {
    run = await get(BASE + '/actions/runs/' + id)
    jobs = await get(BASE + '/actions/runs/' + id + '/jobs?per_page=' + MAX_JOBS)
  } catch { return {status:'unverified',reason:'WATCHDOG_RUN_OR_JOBS_UNAVAILABLE',runId:id,runnerStarted:false} }
  if (run?.id !== id || run.workflow_id !== WATCHDOG_ID ||
      !isTrustedRun(run,now) || !Array.isArray(jobs?.jobs) ||
      !Number.isSafeInteger(jobs.total_count) ||
      jobs.total_count > MAX_JOBS || jobs.jobs.length !== jobs.total_count)
    return {status:'unverified',reason:'WATCHDOG_RUN_OR_JOBS_UNTRUSTED',runId:id,runnerStarted:false}
  const started = name => jobs.jobs.find(j => j.name === name &&
    j.run_id === id && validTime(j.started_at,now) !== null &&
    (j.status === 'in_progress' || j.status === 'completed'))
  const reconcile=started('reconcile')
  const delivery=started('direct-handoff')
  if (!reconcile) return {status:'pending',reason:'WATCHDOG_RECONCILE_RUNNER_NOT_STARTED',
    runId:id,runnerStarted:false}
  if (!delivery) return {status:'pending',reason:'WATCHDOG_DIRECT_HANDOFF_NOT_STARTED',
    runId:id,runnerStarted:true,taskDeliveryVerified:false}
  if (delivery.conclusion !== 'success')
    return {status:'pending',reason:'WATCHDOG_DIRECT_HANDOFF_NOT_COMPLETED',
      runId:id,runnerStarted:true,taskDeliveryVerified:false}
  let log
  try { log=await readLog(BASE + '/actions/jobs/' + delivery.id + '/logs') }
  catch { return {status:'unverified',reason:'HANDOFF_LOG_UNAVAILABLE',
    runId:id,runnerStarted:true,taskDeliveryVerified:false} }
  const receipt=parseHandoffEvidence(log)
  if (!receipt) return {status:'unverified',reason:'HANDOFF_RECEIPT_UNVERIFIED',
    runId:id,runnerStarted:true,taskDeliveryVerified:false}
  const evidence={runId:id,runnerStarted:true,taskDeliveryVerified:false,
    deliveryAccepted:receipt.dispatchAccepted > 0,
    ciStartedVerified:false,dispatched:receipt.dispatchAccepted,
    candidates:receipt.candidates,blocked:receipt.blocked,
    reason:receipt.reason,workerEvidence:[]}
  if (!receipt.dispatchAccepted)
    return {...evidence,status:receipt.candidates === 0 ? 'idle_verified' : 'task_delivery_blocked'}
  for (const task of receipt.workerRuns.slice(0,2)) {
    const worker=await inspectWorkerAndCore({task, since:validTime(receipt.checkedAt,now),
      now,get,readLog})
    evidence.workerEvidence.push(worker)
  }
  const allWorkers=evidence.workerEvidence.length === receipt.dispatchAccepted &&
    evidence.workerEvidence.every(w=>w.workerRunnerStarted)
  const ci=evidence.workerEvidence.filter(w=>w.lane==='ci')
  const allCi=ci.length > 0 && ci.every(w=>w.coreRunnerStarted)
  return {...evidence,taskDeliveryVerified:allWorkers,
    workerRunnerStarted:allWorkers,ciStartedVerified:allCi,
    status:!allWorkers?'worker_runner_unverified':
      ci.length && !allCi?'core_ci_runner_not_started':
      ci.length && allCi?'ci_runner_verified':
      'worker_runner_verified_core_pending'}
}
async function inspectWorkerAndCore({task,since,now,get,readLog}) {
  const evidence={pr_number:task.pr_number,lane:task.lane,workerRunnerStarted:false,
    taskAcceptedByWorker:false,coreRunnerStarted:false}
  if (!safeId(task.pr_number) || !/^[a-f0-9]{40}$/i.test(task.head_sha || '') ||
      !['repair','ci','conflict'].includes(task.lane) ||
      typeof task.task_key !== 'string' || since === null) {
    evidence.reason='UNTRUSTED_TASK_RECEIPT';return evidence
  }
  const workflow=task.lane==='ci'?'hh-pr-ci-worker.yml':'hh-pr-repair-worker.yml'
  let list
  try { list=await get(BASE+'/actions/workflows/'+workflow+'/runs?event=workflow_dispatch&per_page=30') }
  catch { evidence.reason='WORKER_HISTORY_UNAVAILABLE';return evidence }
  if (!Number.isSafeInteger(list?.total_count) || !Array.isArray(list.workflow_runs) ||
      list.workflow_runs.length > 30) {
    evidence.reason='WORKER_HISTORY_UNVERIFIED';return evidence
  }
  const candidates=list.workflow_runs.filter(r=>isTrustedRun(r,now) &&
    r.event==='workflow_dispatch' && validTime(r.created_at,now)>=since-60_000).slice(0,6)
  for(const run of candidates){
    let jobs
    try { jobs=await get(BASE+'/actions/runs/'+run.id+'/jobs?per_page='+MAX_JOBS) }
    catch { continue }
    if (!Array.isArray(jobs?.jobs) || jobs.total_count > MAX_JOBS ||
        jobs.jobs.length !== jobs.total_count) continue
    const bootstrap=jobs.jobs.find(j=>j.run_id===run.id && j.name==='bootstrap' &&
      validTime(j.started_at,now)!==null &&
      (j.status==='in_progress'||j.status==='completed'))
    if (!bootstrap) continue
    let logs
    try { logs=await readLog(BASE+'/actions/jobs/'+bootstrap.id+'/logs') }
    catch { continue }
    if(task.lane==='ci'){
      const outcome=parseMarker(logs,'HH_CI_METADATA_WAKE ')
      if(outcome?.schema!=='HH_PR_CI_METADATA_WAKE_V1' ||
          outcome.pr_number!==task.pr_number)continue
      evidence.workerRunnerStarted=true
      evidence.taskAcceptedByWorker=outcome.status==='CI_WAKE_REQUESTED' &&
        outcome.metadataEditAccepted===true
      evidence.workerRunId=run.id
      if(!evidence.taskAcceptedByWorker){evidence.reason='CI_METADATA_WAKE_NOT_ACCEPTED';return evidence}
      evidence.coreRunnerStarted=await inspectCoreRunner({task,since,now,get})
      evidence.reason=evidence.coreRunnerStarted?'CORE_RUNNER_STARTED':'CORE_RUNNER_NOT_PROVEN'
      return evidence
    }
    // Repair logs are not a signed commit receipt. Require the exact task
    // key before associating a runner, and NEVER claim Core CI from it.
    if (logs.includes(task.task_key) && logs.includes(String(task.pr_number))) {
      evidence.workerRunnerStarted=true;evidence.workerRunId=run.id
      evidence.reason='REPAIR_RUNNER_STARTED_SOURCE_OUTCOME_UNVERIFIED'
      return evidence
    }
  }
  evidence.reason='MATCHING_WORKER_RUNNER_NOT_PROVEN'
  return evidence
}
async function inspectCoreRunner({task,since,now,get}) {
  let list
  try { list=await get(BASE+'/actions/workflows/400848212/runs?event=pull_request&per_page=50') }
  catch { return false }
  if (!Array.isArray(list?.workflow_runs) || !Number.isSafeInteger(list.total_count) ||
      list.workflow_runs.length > 50) return false
  for(const run of list.workflow_runs){
    if (run.name!=='HH PR core release gate' || run.event!=='pull_request' ||
        validTime(run.created_at,now)===null || validTime(run.created_at,now)<since ||
        !Array.isArray(run.pull_requests) ||
        !run.pull_requests.some(p=>p.number===task.pr_number &&
          p.head?.sha===task.head_sha)) continue
    let jobs
    try { jobs=await get(BASE+'/actions/runs/'+run.id+'/jobs?per_page='+MAX_JOBS) }
    catch { continue }
    if (!Array.isArray(jobs?.jobs) || jobs.total_count > MAX_JOBS ||
        jobs.jobs.length!==jobs.total_count)continue
    if (jobs.jobs.some(j=>j.run_id===run.id &&
      ['classify-change','core-lint-types-build','hh-merge-check'].includes(j.name) &&
      (j.status==='in_progress'||j.status==='completed') &&
      validTime(j.started_at,now)!==null))return true
  }
  return false
}
export async function runWatchdogBackstop({
  token, now=Date.now(), fetcher=fetch, timeout=AbortSignal.timeout,
  wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
}={}) {
  if (typeof token !== 'string' || token.length < 20)
    return {status:503,body:{status:'blocked',reason:'ACTIONS_WRITE_TOKEN_NOT_CONFIGURED'}}
  const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'}
  const request=async(url,opts={})=>fetcher(url,{headers,signal:timeout(9000),
    cache:'no-store',...opts})
  const get=async url=>{
    const res=await request(url)
    if(res.status!==200)throw Error('GITHUB_READ_UNAVAILABLE')
    const raw=res.headers?.get?.('x-ratelimit-remaining')
    if(raw!==null && raw!==undefined && Number(raw)<100)
      throw Error('GITHUB_RATE_RESERVE_LOW')
    return res.json()
  }
  const readLog=async url=>{
    const res=await request(url)
    if(res.status!==200)throw Error('GITHUB_JOB_LOG_UNAVAILABLE')
    return res.text()
  }
  let history
  try { history=await get(BASE+'/actions/workflows/'+WATCHDOG_WORKFLOW+'/runs?per_page='+MAX_RUNS) }
  catch { return {status:503,body:{status:'blocked',reason:'GITHUB_HISTORY_OR_QUOTA_UNAVAILABLE'}} }
  const decision=decideWatchdogWake(history,now)
  if (!decision.wake && decision.reason==='RECENT_RUN_REQUIRES_RUNNER_PROOF') {
    const proof=await inspectWatchdogRun({id:decision.lastRunId,now,get,readLog})
    return {status:proof.status==='idle_verified'||proof.status==='ci_runner_verified' ? 200 :
      proof.status==='task_delivery_blocked'||proof.status==='unverified' ? 503 : 202,
      body:{...proof,lastRunAt:decision.lastRunAt,executionVerified:proof.runnerStarted===true &&
        (proof.status==='idle_verified'||proof.status==='ci_runner_verified')}}
  }
  if (!decision.wake)
    return {status:503,body:{status:'blocked',reason:decision.reason}}
  let dispatch
  try {
    dispatch=await request(BASE+'/actions/workflows/'+WATCHDOG_WORKFLOW+'/dispatches',{
      method:'POST',headers:{...headers,'Content-Type':'application/json'},
      body:JSON.stringify({ref:CONTROL_BRANCH,inputs:{dry_run:'false'},
        return_run_details:true})})
  } catch { return {status:503,body:{status:'blocked',reason:'GITHUB_DISPATCH_UNAVAILABLE'}} }
  if(dispatch.status!==200)
    return {status:503,body:{status:'blocked',reason:dispatch.status===204?
      'DISPATCH_ACCEPTED_BUT_RUN_ID_MISSING':'GITHUB_ACTIONS_WRITE_DENIED_OR_UNAVAILABLE'}}
  let details
  try { details=await dispatch.json() } catch {}
  const runId=details?.workflow_run_id
  if(!safeId(runId))
    return {status:503,body:{status:'blocked',reason:'DISPATCH_RUN_ID_UNVERIFIED'}}
  let proof={status:'pending',reason:'WATCHDOG_RUN_NOT_VISIBLE_YET',
    runId,runnerStarted:false,taskDeliveryVerified:false,ciStartedVerified:false}
  // A 30-second Vercel function can make a bounded proof attempt; absence of
  // runner evidence stays PENDING, not success. The next cron rechecks this run.
  for(let attempt=0;attempt<2;attempt++){
    proof=await inspectWatchdogRun({id:runId,now:Date.now(),get,readLog})
    if(proof.runnerStarted || attempt===1)break
    await wait(2500)
  }
  return {status:proof.status==='idle_verified'||proof.status==='ci_runner_verified'?200:
    proof.status==='task_delivery_blocked'?503:202,
    body:{...proof,status:proof.status==='pending'?
    'runner_pending':proof.status,reason:proof.reason||decision.reason,
    dispatchRunId:runId,executionVerified:proof.status==='idle_verified'||
      proof.status==='ci_runner_verified',sourceChanged:false}}
}
