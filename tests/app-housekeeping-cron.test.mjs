import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as cron from '../lib/app/housekeeping-cron.js'

const environment = { CRON_SECRET: 'synthetic-cron-secret' }
const root = fileURLToPath(new URL('..', import.meta.url))

test('housekeeping cron rejects unauthenticated requests before any work starts', async () => {
  assert.equal(typeof cron.runHousekeepingCron, 'function')

  let calls = 0
  const rejected = await cron.runHousekeepingCron(
    new Request('https://holistichouse.vercel.app/api/internal/housekeeping'),
    {
      env: environment,
      run: async () => {
        calls += 1
      },
    },
  )

  assert.equal(rejected.status, 401)
  assert.deepEqual(rejected.body, { error: 'UNAUTHORIZED' })
  assert.equal(calls, 0)
})

test('housekeeping cron retries once and returns only a bounded receipt', async () => {
  assert.equal(typeof cron.runHousekeepingCron, 'function')

  let calls = 0
  const result = await cron.runHousekeepingCron(
    new Request('https://holistichouse.vercel.app/api/internal/housekeeping', {
      headers: { authorization: 'Bearer synthetic-cron-secret' },
    }),
    {
      env: environment,
      run: async () => {
        calls += 1
        if (calls === 1) throw new Error('transient synthetic failure')
        return {
          id: '40000000-0000-4000-8000-000000000001',
          status: 'completed',
          guestSessionsDeleted: 2,
          viewerSessionsDeleted: 3,
          intentsDeleted: 4,
        }
      },
      reportFailure: () => {},
    },
  )

  assert.equal(calls, 2)
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, {
    status: 'completed',
    runId: '40000000-0000-4000-8000-000000000001',
    guestSessionsDeleted: 2,
    viewerSessionsDeleted: 3,
    intentsDeleted: 4,
  })
})

test('housekeeping cron fails closed when its secret is not configured', async () => {
  assert.equal(typeof cron.runHousekeepingCron, 'function')
  const result = await cron.runHousekeepingCron(
    new Request('https://holistichouse.vercel.app/api/internal/housekeeping', {
      headers: { authorization: 'Bearer synthetic-cron-secret' },
    }),
    { env: {}, run: async () => assert.fail('must not run') },
  )
  assert.equal(result.status, 401)
})

test('private goal photo retention does not eagerly load native Sharp into the cron', () => {
  const source = readFileSync(`${root}/lib/practitioners/remote-goal-photo.js`, 'utf8')
  assert.doesNotMatch(source, /^import sharp from 'sharp'/m)
  assert.match(source, /await import\('sharp'\)/)
  assert.match(source, /PHOTO_PROCESSING_UNAVAILABLE/)
})

test('production scheduler includes guarded housekeeping and consented phone alert recovery', () => {
  const routePath = `${root}/app/api/internal/housekeeping/route.js`
  assert.equal(existsSync(routePath), true)
  const route = readFileSync(routePath, 'utf8')
  const config = JSON.parse(readFileSync(`${root}/vercel.json`, 'utf8'))
  assert.match(route, /runHousekeepingCron/)
  assert.match(route, /PRIVATE_HEADERS/)
  const pushRoute=readFileSync(`${root}/app/api/internal/direct-message-push/route.js`,'utf8')
  assert.match(pushRoute,/cronAuthorized\(request,process\.env\)/)
  assert.match(pushRoute,/VERCEL_ENV==='preview'/)
  assert.deepEqual(config.crons, [
    { path: '/api/internal/housekeeping', schedule: '0 5 * * *' },
    { path: '/api/internal/direct-message-push', schedule: '*/5 * * * *' },
    { path: '/api/internal/revenue-ideas-telegram', schedule: '0 13,14 * * *' },
    { path: '/api/internal/practice-telegram-digest', schedule: '0 13,14,19,20 * * *' },
    { path: '/api/internal/council-archive-telegram', schedule: '0 16,17 * * *' },
    { path: '/api/internal/market-intel-telegram', schedule: '0 18,19 * * *' },
    {path:'/api/internal/pr-watchdog-backstop',schedule:'*/10 * * * *'},
  ])
})

test('app verification command includes the server-only cron guard suite', () => {
  const packageJson = JSON.parse(readFileSync(`${root}/package.json`, 'utf8'))
  assert.match(packageJson.scripts['test:app'], /--conditions=react-server/)
  assert.match(packageJson.scripts['test:app'], /tests\/app-housekeeping-cron\.test\.mjs/)
})

test('R1 database and browser workflows verify canonical-base pull requests', () => {
  // GitHub Actions allows "types" before "branches". Assert the actual PR
  // trigger block rather than assuming its child keys have a fixed order.
  for (const workflow of ['hh-app-r1.yml', 'hh-app-browser.yml']) {
    const source = readFileSync(root+'/.github/workflows/'+workflow, 'utf8')
    const trigger = source.split(/^  pull_request:\s*$/m)[1]
      ?.split(/^(?:  [a-z][\w-]*:|permissions:|concurrency:|jobs:)/m)[0]
    assert.ok(trigger, workflow+' must retain the pull_request trigger')
    assert.match(trigger, /^    branches:\s*\['codex\/public-book-library'\]\s*$/m,
      workflow+' must target canonical production')
    assert.match(trigger, /^    types:\s*\[opened, synchronize, reopened, ready_for_review, converted_to_draft\]\s*$/m,
      workflow+' must rerun for every new HEAD and Draft-to-Ready transition')
    assert.match(trigger, /^    paths:\s*$/m, workflow+' must retain conservative PR path scoping')

    // Detect accidental broadening and missing Ready-for-review checks.
    assert.doesNotMatch(trigger.replace('codex/public-book-library','codex/bootstrap-books'),
      /^    branches:\s*\['codex\/public-book-library'\]\s*$/m)
    assert.doesNotMatch(trigger.replace(/^    types:.*$/m,''),
      /^    types:\s*\[opened, synchronize, reopened, ready_for_review, converted_to_draft\]\s*$/m)
  }
})


test('external backstop verifies an exact dispatch ID, real jobs and idle receipt',async()=>{
  const {runWatchdogBackstop}=await import('../lib/automation/github-watchdog-backstop.mjs')
  const now=Date.parse('2026-11-03T20:00:00Z'),at='2026-11-03T19:58:00Z'
  const log='HH_CONTROL_TOWER: '+JSON.stringify({
    schema:'HH_CONTROL_DISPATCH_V1',dryRun:false,candidates:0,
    dispatchAccepted:0,workerRuns:[],reason:'NO_ACTIONABLE_PR'
  })+'\nHH_WATCHDOG_DIRECT_HANDOFF '+JSON.stringify({
    candidates:0,dispatched:0,blocked:{}})
  const calls=[]
  const getResponse=x=>({status:200,headers:{get:()=> '4800'},json:async()=>x})
  const fetcher=async(url,opt)=>{
    calls.push({url,method:opt.method||'GET'})
    if(url.endsWith('/dispatches'))return {status:200,json:async()=>({workflow_run_id:200})}
    if(url.endsWith('/runs?per_page=10'))
      return getResponse({total_count:0,workflow_runs:[]})
    if(url.endsWith('/runs/200'))return getResponse({
      id:200,workflow_id:403593743,event:'workflow_dispatch',
      status:'completed',head_branch:'codex/bootstrap-books',created_at:at})
    if(url.endsWith('/runs/200/jobs?per_page=50'))return getResponse({
      total_count:2,jobs:[
        {id:1,run_id:200,name:'reconcile',status:'completed',started_at:at},
        {id:2,run_id:200,name:'direct-handoff',status:'completed',
          conclusion:'success',started_at:at}]})
    if(url.endsWith('/jobs/2/logs'))return {status:200,text:async()=>log}
    throw Error('Unexpected URL '+url)
  }
  const value=await runWatchdogBackstop({token:'synthetic-token-for-test-only-123456',
    now,fetcher,timeout:()=>undefined,wait:async()=>{}})
  assert.equal(value.status,200)
  assert.equal(value.body.status,'idle_verified')
  assert.equal(value.body.runnerStarted,true)
  assert.equal(value.body.executionVerified,true)
  assert.equal(value.body.ciStartedVerified,false)
  assert.equal(value.body.taskDeliveryVerified,false)
  assert.equal(value.body.dispatchRunId,200)
  assert.deepEqual(calls.map(x=>x.method),['GET','POST','GET','GET','GET'])
})
test('a green Watchdog without actual handoff is not successful execution',async()=>{
  const {runWatchdogBackstop}=await import('../lib/automation/github-watchdog-backstop.mjs')
  const at='2026-11-03T19:58:00Z',now=Date.parse('2026-11-03T20:00:00Z')
  const fixture=x=>({status:200,headers:{get:()=> '4800'},json:async()=>x})
  const blocked={schema:'HH_CONTROL_DISPATCH_V1',dryRun:false,candidates:2,
    dispatchAccepted:0,workerRuns:[],reason:'BLOCKED_TASKS',
    blocked:{SOURCE_PROOF_MISSING:1,STACKED_PARENT:1}}
  const fetcher=async(url,opt)=>{
    if(opt.method==='POST')assert.fail('recent run must not be dispatched twice')
    if(url.endsWith('/runs?per_page=10'))return fixture({total_count:1,
      workflow_runs:[{id:300,event:'schedule',head_branch:'codex/bootstrap-books',
        status:'completed',conclusion:'success',created_at:at}]})
    if(url.endsWith('/runs/300'))return fixture({id:300,workflow_id:403593743,
      event:'schedule',head_branch:'codex/bootstrap-books',
      status:'completed',conclusion:'success',created_at:at})
    if(url.endsWith('/runs/300/jobs?per_page=50'))return fixture({total_count:2,
      jobs:[{id:3,run_id:300,name:'reconcile',status:'completed',started_at:at},
        {id:4,run_id:300,name:'direct-handoff',status:'completed',
          conclusion:'success',started_at:at}]})
    if(url.endsWith('/jobs/4/logs'))return {status:200,text:async()=>(
      'HH_CONTROL_TOWER: '+JSON.stringify(blocked)+'\n'+
      'HH_WATCHDOG_DIRECT_HANDOFF '+JSON.stringify({
        candidates:2,dispatched:0,blocked:blocked.blocked}))}
    throw Error('Unexpected URL '+url)
  }
  const value=await runWatchdogBackstop({token:'synthetic-token-for-test-only-123456',
    now,fetcher,timeout:()=>undefined})
  assert.equal(value.status,503)
  assert.equal(value.body.status,'task_delivery_blocked')
  assert.equal(value.body.runnerStarted,true)
  assert.equal(value.body.taskDeliveryVerified,false)
  assert.equal(value.body.blocked.SOURCE_PROOF_MISSING,1)
  assert.equal(value.body.executionVerified,false)
})
test('a worker handoff confirms CI only after matching PR SHA and started Core job',async()=>{
  const {runWatchdogBackstop}=await import('../lib/automation/github-watchdog-backstop.mjs')
  const now=Date.parse('2026-11-03T20:00:00Z'),at='2026-11-03T19:55:00Z'
  const sha='a'.repeat(40),f=x=>({status:200,headers:{get:()=> '4800'},json:async()=>x})
  const task={pr_number:551,head_sha:sha,task_key:'ci:551:test',
    lane:'ci',outcome:'DISPATCH_ACCEPTED'}
  const summary={schema:'HH_CONTROL_DISPATCH_V1',dryRun:false,candidates:1,
    dispatchAccepted:1,workerRuns:[task],checkedAt:at}
  const fetcher=async(url,opt)=>{
    if(opt.method==='POST')assert.fail('recent real Watchdog should not dispatch')
    if(url.endsWith('/runs?per_page=10'))return f({total_count:1,
      workflow_runs:[{id:400,event:'workflow_dispatch',status:'completed',
        head_branch:'codex/bootstrap-books',created_at:at}]})
    if(url.endsWith('/runs/400'))return f({id:400,workflow_id:403593743,
      event:'workflow_dispatch',status:'completed',
      head_branch:'codex/bootstrap-books',created_at:at})
    if(url.endsWith('/runs/400/jobs?per_page=50'))return f({total_count:2,jobs:[
      {id:41,run_id:400,name:'reconcile',status:'completed',started_at:at},
      {id:42,run_id:400,name:'direct-handoff',status:'completed',
        conclusion:'success',started_at:at}]})
    if(url.endsWith('/jobs/42/logs'))return {status:200,text:async()=>(
      'HH_CONTROL_TOWER: '+JSON.stringify(summary)+'\n'+
      'HH_WATCHDOG_DIRECT_HANDOFF '+JSON.stringify({
        candidates:1,dispatched:1,blocked:{}}))}
    if(url.includes('/hh-pr-ci-worker.yml/runs?'))return f({total_count:1,
      workflow_runs:[{id:501,event:'workflow_dispatch',status:'completed',
        head_branch:'codex/bootstrap-books',
        created_at:'2026-11-03T19:56:00Z'}]})
    if(url.endsWith('/runs/501/jobs?per_page=50'))return f({total_count:1,jobs:[
      {id:502,run_id:501,name:'bootstrap',status:'completed',
        started_at:'2026-11-03T19:56:10Z'}]})
    if(url.endsWith('/jobs/502/logs'))return {status:200,text:async()=>(
      'HH_CI_METADATA_WAKE '+JSON.stringify({
        schema:'HH_PR_CI_METADATA_WAKE_V1',pr_number:551,
        status:'CI_WAKE_REQUESTED',metadataEditAccepted:true}))}
    if(url.includes('/workflows/400848212/runs?'))return f({total_count:1,
      workflow_runs:[{id:601,event:'pull_request',name:'HH PR core release gate',
        created_at:'2026-11-03T19:57:00Z',
        pull_requests:[{number:551,head:{sha}}]}]})
    if(url.endsWith('/runs/601/jobs?per_page=50'))return f({total_count:1,
      jobs:[{id:602,run_id:601,name:'core-lint-types-build',status:'in_progress',
        started_at:'2026-11-03T19:58:00Z'}]})
    throw Error('Unexpected URL '+url)
  }
  const value=await runWatchdogBackstop({token:'synthetic-token-for-test-only-123456',
    now,fetcher,timeout:()=>undefined})
  assert.equal(value.status,200)
  assert.equal(value.body.status,'worker_runner_verified')
  assert.equal(value.body.taskDeliveryVerified,true)
  assert.equal(value.body.ciStartedVerified,true)
  assert.equal(value.body.workerEvidence[0].pr_number,551)
  assert.equal(value.body.executionVerified,true)
})
test('dispatch accepted without run ID, pending runner and uncertain history fail closed',async()=>{
  const {runWatchdogBackstop,decideWatchdogWake}=
    await import('../lib/automation/github-watchdog-backstop.mjs')
  const now=Date.parse('2026-11-03T20:00:00Z')
  const token='synthetic-token-for-test-only-123456'
  assert.equal(decideWatchdogWake({total_count:1,workflow_runs:[]},now).reason,
    'INCOMPLETE_HISTORY')
  const history=(total_count,workflow_runs)=>({
    status:200,headers:{get:()=> '4800'},json:async()=>({total_count,workflow_runs})})
  const fetcher=async(url,opt)=>{
    if(opt.method==='POST')return {status:204}
    return history(0,[])
  }
  const missing=await runWatchdogBackstop({token,now,fetcher,
    timeout:()=>undefined})
  assert.equal(missing.status,503)
  assert.equal(missing.body.reason,'DISPATCH_ACCEPTED_BUT_RUN_ID_MISSING')
  const queued=await runWatchdogBackstop({token,now,timeout:()=>undefined,
    wait:async()=>{},fetcher:async(url,opt)=>{
      if(opt.method==='POST')return {status:200,
        json:async()=>({workflow_run_id:600})}
      if(url.endsWith('/runs?per_page=10'))return history(0,[])
      if(url.endsWith('/runs/600'))return {
        status:200,headers:{get:()=> '4800'},json:async()=>({
          id:600,workflow_id:403593743,event:'workflow_dispatch',
          head_branch:'codex/bootstrap-books',status:'queued',
          created_at:'2026-11-03T19:59:00Z'})}
      if(url.endsWith('/runs/600/jobs?per_page=50'))return history(0,[])
      throw Error('Unexpected '+url)
    }})
  assert.equal(queued.status,202)
  assert.equal(queued.body.status,'runner_pending')
  assert.equal(queued.body.executionVerified,false)
  const route=readFileSync(root+'/app/api/internal/pr-watchdog-backstop/route.js','utf8')
  assert.match(route,/cronAuthorized/)
  assert.match(route,/HH_PR_CRON_DISPATCH_TOKEN/)
  const code=readFileSync(root+'/lib/automation/github-watchdog-backstop.mjs','utf8')
  assert.doesNotMatch(code,/update-branch|merge_pull_request|sourceChanged:true/)
})
