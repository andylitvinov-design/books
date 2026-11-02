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

test('production scheduler invokes only the guarded daily housekeeping route', () => {
  const routePath = `${root}/app/api/internal/housekeeping/route.js`
  assert.equal(existsSync(routePath), true)
  const route = readFileSync(routePath, 'utf8')
  const config = JSON.parse(readFileSync(`${root}/vercel.json`, 'utf8'))
  assert.match(route, /runHousekeepingCron/)
  assert.match(route, /PRIVATE_HEADERS/)
  assert.deepEqual(config.crons, [
    { path: '/api/internal/housekeeping', schedule: '0 5 * * *' },
    { path: '/api/internal/revenue-ideas-telegram', schedule: '0 13,14 * * *' },
    { path: '/api/internal/practice-telegram-digest', schedule: '0 13,14,19,20 * * *' },
    { path: '/api/internal/council-archive-telegram', schedule: '0 16,17 * * *' },
    { path: '/api/internal/market-intel-telegram', schedule: '0 18,19 * * *' },
    { path: '/api/internal/pr-watchdog-backstop', schedule: '*/10 * * * *' },
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


test('independent PR Watchdog backstop dispatches only after verified inactivity', async () => {
  const {decideWatchdogWake,runWatchdogBackstop} = await import('../lib/automation/github-watchdog-backstop.mjs')
  const now = Date.parse('2026-11-02T20:00:00Z')
  const recent = {id:112,status:'completed',conclusion:'success',
    head_branch:'codex/bootstrap-books',event:'workflow_run',
    created_at:'2026-11-02T19:54:00Z'}
  assert.deepEqual(decideWatchdogWake({total_count:1,workflow_runs:[recent]},now).wake,false)
  const stale = {...recent,id:111,created_at:'2026-11-02T19:42:00Z'}
  assert.equal(decideWatchdogWake({total_count:1,workflow_runs:[stale]},now).wake,true)
  assert.equal(decideWatchdogWake({total_count:1,workflow_runs:[]},now).reason,'INCOMPLETE_HISTORY')
  assert.equal(decideWatchdogWake({total_count:1,workflow_runs:[{...recent,id:null}]},now).wake,false)
  let calls=[]
  const fetcher=async(url,init)=>{
    calls.push({url,method:init.method||'GET',authorization:init.headers.Authorization})
    if (init.method==='POST') return {status:204}
    return {status:200,headers:{get:()=> '4800'},
      json:async()=>({total_count:1,workflow_runs:[stale]})}
  }
  const token='synthetic-token-for-test-only-123456'
  const outcome=await runWatchdogBackstop({token,now,fetcher,timeout:()=>undefined})
  assert.equal(outcome.status,202)
  assert.equal(outcome.body.status,'dispatch_accepted')
  assert.equal(outcome.body.executionVerified,false)
  assert.deepEqual(calls.map(x=>x.method),['GET','POST'])
  assert.ok(calls[1].url.endsWith('/hh-pr-ten-minute-watchdog.yml/dispatches'))
  assert.equal(calls[1].authorization,'Bearer '+token)
  calls=[]
  const missing=await runWatchdogBackstop({token:'',now,fetcher})
  assert.equal(missing.status,503);assert.equal(calls.length,0)
})
test('backstop does not dispatch on recently active, unknown or rate-limited GitHub evidence', async()=>{
  const {runWatchdogBackstop}=await import('../lib/automation/github-watchdog-backstop.mjs')
  const now=Date.parse('2026-11-02T20:00:00Z'),token='synthetic-token-for-test-only-123456'
  const history={total_count:1,workflow_runs:[{id:30,status:'in_progress',conclusion:null,
    head_branch:'codex/bootstrap-books',event:'workflow_dispatch',
    created_at:'2026-11-02T19:57:00Z'}]}
  for (const [payload,remaining,expected] of [
    [history,4000,200],
    [{total_count:2,workflow_runs:[]},4000,503],
    [history,40,503]
  ]) {
    let posts=0
    const result=await runWatchdogBackstop({token,now,timeout:()=>undefined,fetcher:async(url,options)=>{
      if (options.method==='POST') {posts++; return {status:204}}
      return {status:200,headers:{get:()=>String(remaining)},json:async()=>payload}
    }})
    assert.equal(result.status,expected);assert.equal(posts,0)
  }
})
test('production cron route remains private and its schedule is not an Actions cron claim',()=>{
  const route=readFileSync(root+'/app/api/internal/pr-watchdog-backstop/route.js','utf8')
  assert.match(route,/cronAuthorized/)
  assert.match(route,/VERCEL_ENV!=='production'/)
  assert.match(route,/HH_PR_CRON_DISPATCH_TOKEN/)
  assert.match(route,/PRIVATE_HEADERS/)
  const source=readFileSync(root+'/lib/automation/github-watchdog-backstop.mjs','utf8')
  assert.match(source,/workflow_dispatch/)
  assert.doesNotMatch(source,/update-branch|merge_pull_request|sourceChanged:true/)
  assert.equal(source.includes('pulls/{pull_number}'),false)
})
