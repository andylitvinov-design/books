import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { appFetch } from '../lib/app/client-fetch.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const sample = {
  account: { id: 'synthetic-owner', onboardingState: 'active' },
  results: [{ id: 'private-assessment', dimensions: [] }],
  runs: [], requests: [], consents: [], services: [],
  savedReports: [{ id: 'saved-report' }], savedDocuments: [], savedSessions: [],
}

test('minimal Profile bootstrap stays authenticated, no-store and contract-checked', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/app/bootstrap?view=portrait')
    assert.equal(options.method, 'GET')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.credentials, 'same-origin')
    return Response.json(sample, { headers: { 'Cache-Control': 'private, no-store' } })
  })
  assert.deepEqual(await appFetch('bootstrap?view=portrait'), sample)
})

test('a truncated or invalid minimal bootstrap never puts Cabinet into ready state', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ account: sample.account, results: null }))
  await assert.rejects(appFetch('bootstrap?view=portrait'), { code: 'SERVICE_UNAVAILABLE' })
})

test('Profile-only repository projection skips expensive non-profile reads, preserves reports and auth', () => {
  const repository = read('lib/app/repository.js')
  const route = read('app/api/app/[...path]/route.js')
  assert.match(route, /export const runtime = 'nodejs'/)
  assert.match(route, /export const preferredRegion = 'yul1'/)
  const start = repository.indexOf('    async bootstrap(actor, { view =')
  const end = repository.indexOf('    async createTestPlan(', start)
  assert.ok(start >= 0 && end > start)
  const block = repository.slice(start, end)
  assert.match(block, /const portraitOnly = view === 'portrait'/)
  assert.match(block, /const account = await accountLock\(db, actor, \{ ready: false \}\)/)
  assert.match(block, /results: portraitOnly \? results : await withResultInterpretations\(db, results\)/)
  for (const name of ['runs', 'snapshot', 'requests', 'events', 'moodCheckins', 'consents', 'services',
    'activeTestPlan', 'latestTestPlan']) {
    assert.match(block, new RegExp('const ' + name + ' = portraitOnly \\?'), name + ' should not block Profile')
  }
  for (const name of ['savedReports', 'savedDocuments', 'savedSessions', 'practiceRow']) {
    assert.match(block, new RegExp('const ' + name + ' ='), name + ' must remain available to Profile')
  }
  const verified = route.indexOf('const actor = await auth.verified(),')
  const limiter = route.indexOf('await consumeRate(', verified)
  const initial = route.indexOf("if (joined === 'bootstrap' && method === 'GET')", verified)
  assert.ok(verified >= 0 && limiter > verified && initial > limiter,
    'minimal bootstrap must run after the existing verified login and private rate limit')
  const endOfBootstrap = route.indexOf('\n    }', initial)
  assert.ok(endOfBootstrap > initial, 'bootstrap handler has a bounded closing block')
  const bootstrap = route.slice(initial, endOfBootstrap)
  assert.match(bootstrap, /const view = new URL\(request.url\).searchParams.get\('view'\) === 'portrait' \? 'portrait' : 'full'/)
  assert.match(bootstrap, /return json\(await repo.bootstrap\(actor, \{ view \}\)\)/)
})

test('full tabs keep the complete bootstrap; route transition cannot reuse reduced Profile data', () => {
  const workspace = read('components/app/app-workspace.jsx')
  const route = read('app/[locale]/app/[[...path]]/page.jsx')
  assert.match(workspace, /page === 'portrait' \? 'bootstrap\?view=portrait' : 'bootstrap'/)
  assert.match(workspace, /const epoch = \+\+loadEpoch.current/)
  assert.match(workspace, /if \(epoch !== loadEpoch.current\) return/)
  assert.match(workspace, /}, \[page\]\)/)
  assert.match(route, /<AppWorkspace key=\{path\[0\]\}/)
  assert.match(workspace, /<ProfileDomains locale=\{locale\} mode="account"/)
  assert.match(workspace, /<MyCourse data=\{data\}/)
})
