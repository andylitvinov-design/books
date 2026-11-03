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


test('backstop counts real dispatcher job and runner, not a green workflow_run wrapper', async () => {
  const {decideWatchdogWake,verifyHandoffJob,scheduledCadence} =
    await import('../lib/automation/github-watchdog-backstop.mjs')
  const now=Date.parse('2026-11-03T12:00:00Z')
  const run=(id,event,at,status='completed')=>({
    id,event,status,conclusion:status==='completed'?'success':null,
    head_branch:'codex/bootstrap-books',created_at:at
  })
  const empty={total_count:0,workflow_runs:[]}
  const latest=run(42,'workflow_run','2026-11-03T11:58:00Z')
  const histories={schedule:empty,workflow_dispatch:empty,
    workflow_run:{total_count:1,workflow_runs:[latest]}}
  const skipped={total_count:2,jobs:[
    {id:10,name:'core-ci-freed-slot-wakeup',status:'completed',conclusion:'success'},
    {id:11,name:'direct-handoff',status:'completed',conclusion:'skipped'}
  ]}
  assert.equal(verifyHandoffJob(skipped),'HANDOFF_SKIPPED')
  assert.equal(decideWatchdogWake(histories,now,new Map([[42,'HANDOFF_SKIPPED']])).wake,true)
  const executed={total_count:1,jobs:[{
    id:125,name:'direct-handoff',status:'completed',conclusion:'success',
    runner_name:'GitHub Actions 125',started_at:'2026-11-03T11:59:00Z',
    steps:[{name:'Start workers from Watchdog with signed HEAD reservations',
      status:'completed',conclusion:'success'}]
  }]}
  assert.equal(verifyHandoffJob(executed),'DISPATCHER_EXECUTED')
  const proof=decideWatchdogWake(histories,now,new Map([[42,'DISPATCHER_EXECUTED']]))
  assert.equal(proof.wake,false)
  assert.equal(proof.reason,'VERIFIED_DISPATCHER_RUNNER')
  assert.equal(verifyHandoffJob({...executed,jobs:[{...executed.jobs[0],runner_name:null}]}),
    'RUNNER_NOT_PROVEN')
  assert.equal(verifyHandoffJob({...executed,jobs:[{...executed.jobs[0],steps:[]}]}),
    'DISPATCH_STEP_NOT_EXECUTED')
  assert.equal(scheduledCadence([],now),false)
  assert.equal(decideWatchdogWake({...histories,schedule:{total_count:1,workflow_runs:[]}},
    now).reason,'UNVERIFIED_HISTORY')
})

test('external watchdog cron backstop confirms a real runner or dispatches after stale evidence', async()=> {
  const {runWatchdogBackstop}=await import('../lib/automation/github-watchdog-backstop.mjs')
  const now=Date.parse('2026-11-03T12:00:00Z')
  const token='synthetic-token-for-test-only-123456'
  const run={id:25,event:'workflow_run',status:'completed',conclusion:'success',
    head_branch:'codex/bootstrap-books',created_at:'2026-11-03T11:58:00Z'}
  const histories={schedule:{total_count:0,workflow_runs:[]},
    workflow_dispatch:{total_count:0,workflow_runs:[]},
    workflow_run:{total_count:1,workflow_runs:[run]}}
  let posts=0,reads=0
  const fetcher=async(url,options)=>{
    if(options.method==='POST'){posts++;return {status:204}}
    reads++
    const event=new URL(url).searchParams.get('event')
    if(event)return {status:200,headers:{get:()=> '4800'},
      json:async()=>histories[event]}
    return {status:200,headers:{get:()=> '4800'},json:async()=>({
      total_count:1,jobs:[{id:115,name:'direct-handoff',
        status:'completed',conclusion:'skipped'}]})}
  }
  const pending=await runWatchdogBackstop({token,now,fetcher,timeout:()=>undefined})
  assert.equal(pending.status,202)
  assert.equal(pending.body.status,'dispatch_accepted')
  assert.equal(pending.body.executionVerified,false)
  assert.equal(pending.body.taskTransferVerified,false)
  assert.equal(posts,1)
  assert.equal(reads,4)
  const missing=await runWatchdogBackstop({token:'',now,fetcher})
  assert.equal(missing.status,503)
  assert.equal(posts,1)
  // A confirmed Watchdog job must also prove that its actual dispatcher step ran.
  const runnerFetcher=async(url,options)=>{
    if(options.method==='POST')assert.fail('recent real dispatcher runner is enough')
    const event=new URL(url).searchParams.get('event')
    if(event)return {status:200,headers:{get:()=> '4800'},
      json:async()=>histories[event]}
    return {status:200,headers:{get:()=> '4800'},json:async()=>({
      total_count:1,jobs:[{id:115,name:'direct-handoff',
        status:'completed',conclusion:'success',runner_name:'GitHub Actions 115',
        started_at:'2026-11-03T11:59:00Z',
        steps:[{name:'Start workers from Watchdog with signed HEAD reservations',
          status:'completed',conclusion:'success'}]}]})}
  }
  const healthy=await runWatchdogBackstop({token,now,
    fetcher:runnerFetcher,timeout:()=>undefined})
  assert.equal(healthy.status,200)
  assert.equal(healthy.body.status,'watchdog_sweep_verified')
  assert.equal(healthy.body.taskTransferVerified,false)
})

test('backstop never dispatches on unverified GH history or runner evidence',async()=>{
  const {runWatchdogBackstop}=await import('../lib/automation/github-watchdog-backstop.mjs')
  const now=Date.parse('2026-11-03T12:00:00Z'),token='synthetic-token-for-test-only-123456'
  let posts=0
  const histories={schedule:{total_count:1,workflow_runs:[]},
    workflow_dispatch:{total_count:0,workflow_runs:[]},
    workflow_run:{total_count:0,workflow_runs:[]}}
  const result=await runWatchdogBackstop({token,now,timeout:()=>undefined,
    fetcher:async(url,opt)=>{
      if(opt.method==='POST'){posts++;return {status:204}}
      const event=new URL(url).searchParams.get('event')
      return {status:200,headers:{get:()=> '4800'},json:async()=>histories[event]}
    }})
  assert.equal(result.status,503)
  assert.equal(posts,0)
  const source=readFileSync(root+'/lib/automation/github-watchdog-backstop.mjs','utf8')
  assert.match(source,/verifyHandoffJob/)
  assert.doesNotMatch(source,/update-branch|merge_pull_request|sourceChanged:true/)
  const route=readFileSync(root+'/app/api/internal/pr-watchdog-backstop/route.js','utf8')
  assert.match(route,/cronAuthorized/)
  assert.match(route,/VERCEL_ENV!=='production'/)
  assert.match(route,/HH_PR_CRON_DISPATCH_TOKEN/)
})
