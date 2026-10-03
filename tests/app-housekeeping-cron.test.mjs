import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as maintenance from '../lib/app/maintenance.js'

const environment = { CRON_SECRET: 'synthetic-cron-secret' }
const root = fileURLToPath(new URL('..', import.meta.url))

test('housekeeping cron rejects unauthenticated requests before any work starts', async () => {
  assert.equal(typeof maintenance.runHousekeepingCron, 'function')

  let calls = 0
  const rejected = await maintenance.runHousekeepingCron(
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
  assert.equal(typeof maintenance.runHousekeepingCron, 'function')

  let calls = 0
  const result = await maintenance.runHousekeepingCron(
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
  assert.equal(typeof maintenance.runHousekeepingCron, 'function')
  const result = await maintenance.runHousekeepingCron(
    new Request('https://holistichouse.vercel.app/api/internal/housekeeping', {
      headers: { authorization: 'Bearer synthetic-cron-secret' },
    }),
    { env: {}, run: async () => assert.fail('must not run') },
  )
  assert.equal(result.status, 401)
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
  ])
})

test('app verification command includes the server-only cron guard suite', () => {
  const packageJson = JSON.parse(readFileSync(`${root}/package.json`, 'utf8'))
  assert.match(packageJson.scripts['test:app'], /--conditions=react-server/)
  assert.match(packageJson.scripts['test:app'], /tests\/app-housekeeping-cron\.test\.mjs/)
})

test('R1 database and browser workflows verify canonical-base pull requests', () => {
  for (const workflow of ['hh-app-r1.yml', 'hh-app-browser.yml']) {
    const source = readFileSync(`${root}/.github/workflows/${workflow}`, 'utf8')
    assert.match(source, /pull_request:\s*\n\s*branches: \['codex\/public-book-library'\]/)
  }
})
