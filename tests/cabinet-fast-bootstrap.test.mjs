import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { appFetch } from '../lib/app/client-fetch.js'
import { parse, descendants, sourceModule, ts } from './helpers/current-source-render.mjs'

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
  for (const name of ['runs', 'snapshot', 'requestRows', 'events', 'moodCheckins', 'consents', 'services',
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
  const routeFile = parse(route, 'app-route.js')
  const bootstrapBranches = descendants(routeFile).filter(node => ts.isIfStatement(node) &&
    node.expression.getText(routeFile) === "joined === 'bootstrap' && method === 'GET'")
  assert.equal(bootstrapBranches.length, 1, 'Inspect the entire actual bootstrap branch, not a character window')
  const calls = descendants(bootstrapBranches[0].thenStatement).filter(node => ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText(routeFile) === 'repo' &&
    node.expression.name.text === 'bootstrap')
  assert.equal(calls.length, 1, 'Bootstrap route must call the actual repository method')
  assert.equal(calls[0].arguments.length, 2)
  assert.equal(calls[0].arguments[0].getText(routeFile), 'actor')
  const options = calls[0].arguments[1]
  assert.ok(ts.isObjectLiteralExpression(options) && options.properties.length === 1)
  assert.ok(ts.isShorthandPropertyAssignment(options.properties[0]) && options.properties[0].name.text === 'view',
    'Bootstrap route must forward the parsed view')
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

// Execute the actual bootstrap method, not a restatement of its portrait guard.
// The only database is this closed synthetic query fixture; unknown reads fail.
async function bootstrapQueries({ view = 'portrait', requests = true, denied = false } = {}) {
  const file = parse(read('lib/app/repository.js'), 'repository.js')
  const methods = descendants(file).filter(node => ts.isMethodDeclaration(node) && node.name?.getText(file) === 'bootstrap')
  assert.equal(methods.length, 1)
  const actor = { id: 'synthetic-owner', email: 'synthetic@example.invalid' }
  const config = Object.freeze({})
  const calls = []
  const lifecycle = []
  const request = { id: 'synthetic-request', account_id: actor.id }
  const rows = {
    'app.assessment_results': [{ id: 'synthetic-result' }],
    'app.assessment_runs': [], 'app.profile_snapshots': [],
    'app.consultation_requests': requests ? [request] : [],
    'app.practitioner_request_messages': [{ request_id: request.id, unseen_count: 2 }],
    'app.context_events': [], 'app.mood_checkins': [],
    'app.saved_reports': [{ id: 'synthetic-report', occurred_on: '2026-10-25', available: true }],
    'app.saved_documents': [{ id: 'synthetic-document', occurred_on: '2026-10-25' }],
    'app.saved_sessions': [{ id: 'synthetic-session', occurred_on: '2026-10-25', available: true }],
    'app.consent_events': [], 'app.service_offerings': [],
    'app.practitioners': [{ id: 'synthetic-practitioner', status: 'approved' }],
    'app_private.assessment_plans': [],
  }
  const db = { query: async (sql, parameters) => {
    assert.equal(lifecycle[0], 'accountLock', 'authentication must precede every read')
    const table = sql.match(/\bfrom\s+(app(?:_private)?\.[a-z_]+)/i)?.[1]
    assert.ok(Object.hasOwn(rows, table), 'Unapproved synthetic query: ' + sql)
    calls.push({ table, sql: sql.replace(/\s+/g, ' ').trim(), parameters })
    if (table === 'app.practitioner_request_messages') {
      assert.deepEqual(JSON.parse(JSON.stringify(parameters)), [[request.id], actor.id])
      assert.match(sql, /select\s+m\.request_id,count\(\*\)::int as unseen_count\s+from/i)
      assert.match(sql, /seen\.account_id=\$2/)
      assert.match(sql, /m\.request_id=any\(\$1::uuid\[\]\)/)
      assert.match(sql, /m\.visibility='participants'/)
      assert.match(sql, /m\.author_role='practitioner' and m\.author_account_id<>\$2/)
      assert.match(sql, /seen\.last_seen_at is null or m\.created_at>seen\.last_seen_at/)
    } else if (table !== 'app.service_offerings') {
      assert.deepEqual(JSON.parse(JSON.stringify(parameters)), [actor.id], table + ' remains account-scoped')
      assert.match(sql, table === 'app.practitioners' ? /trusted_auth_user_id=\$1/ : /account_id=\$1/)
    }
    return { rows: rows[table] }
  } }
  const unexpectedProjection = () => assert.fail('Unexpected nonempty synthetic projection')
  const { bootstrap } = sourceModule('export const bootstrap = ({' + methods[0].getText(file) + '}).bootstrap',
    'bootstrap-fixture.js', {}, {
      config,
      transaction: async (actualConfig, actualActor, run) => {
        assert.equal(actualConfig, config); assert.equal(actualActor, actor)
        return run(db)
      },
      accountLock: async (actualDb, actualActor, options) => {
        assert.equal(actualDb, db); assert.equal(actualActor, actor)
        assert.equal(options.ready, false); lifecycle.push('accountLock')
        if (denied) throw Error('SYNTHETIC_AUTH_DENIED')
        return { id: actor.id, onboarding_state: 'active' }
      },
      practitionerOwned: async (actualDb, actualActor) => {
        assert.equal(actualDb, db); assert.equal(actualActor, actor)
        lifecycle.push('practitionerOwned'); return null
      },
      accountView: row => ({ id: row.id }), resultView: row => row,
      requestView: row => ({ id: row.id }),
      runView: unexpectedProjection, contextView: unexpectedProjection,
      moodView: unexpectedProjection, testPlanView: unexpectedProjection,
      iso: value => value, deliveryEnabled: () => true,
      withResultInterpretations: async (actualDb, results) => {
        assert.equal(actualDb, db); lifecycle.push('interpretations'); return results
      },
    })
  if (denied) {
    await assert.rejects(bootstrap(actor, { view }), /SYNTHETIC_AUTH_DENIED/)
    assert.deepEqual(calls, [])
    assert.deepEqual(lifecycle, ['accountLock'])
    return
  }
  const data = await bootstrap(actor, { view })
  return { data: JSON.parse(JSON.stringify(data)), calls, lifecycle }
}

test('actual Profile bootstrap never queries requests or unread messages; full tabs still do', async () => {
  const portrait = await bootstrapQueries()
  assert.deepEqual(portrait.calls.map(call => call.table), [
    'app.assessment_results', 'app.saved_reports', 'app.saved_documents',
    'app.saved_sessions', 'app.practitioners',
  ])
  assert.deepEqual(portrait.data.requests, [])
  assert.deepEqual(portrait.lifecycle, ['accountLock', 'practitionerOwned'])
  for (const [key, id] of [['savedReports', 'synthetic-report'], ['savedDocuments', 'synthetic-document'],
    ['savedSessions', 'synthetic-session']]) assert.equal(portrait.data[key][0].id, id)
  assert.equal(portrait.data.results[0].id, 'synthetic-result')
  assert.equal(portrait.data.practice.id, 'synthetic-practitioner')
  const full = await bootstrapQueries({ view: 'full' })
  assert.equal(full.calls.filter(call => call.table === 'app.consultation_requests').length, 1)
  assert.equal(full.calls.filter(call => call.table === 'app.practitioner_request_messages').length, 1)
  assert.deepEqual(full.data.requests, [{ id: 'synthetic-request', newMessageCount: 2 }])
  assert.deepEqual(full.lifecycle, ['accountLock', 'practitionerOwned', 'interpretations'])
  const empty = await bootstrapQueries({ view: 'full', requests: false })
  assert.equal(empty.calls.filter(call => call.table === 'app.consultation_requests').length, 1)
  assert.equal(empty.calls.filter(call => call.table === 'app.practitioner_request_messages').length, 0)
  assert.deepEqual(empty.data.requests, [])
  await bootstrapQueries({ denied: true })
})
