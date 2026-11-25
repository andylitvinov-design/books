import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'

// Actual repository and ownership/capacity helpers execute against synthetic
// state. No database driver, live transaction, credential or network fallback.
// Portable under tests/; GROWTH_COURSE_ROOT supports standalone artifact runs.
const root = process.env.GROWTH_COURSE_ROOT ? resolve(process.env.GROWTH_COURSE_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'lib/app/growth-course.js')
const source = readFileSync(file, 'utf8')
assert.doesNotMatch(source, /^<{7}|^={7}|^>{7}/m)
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const specifiers = [...source.matchAll(/^import\s+.*?\s+from\s+['"]([^'"]+)['"]/gm)].map(match => match[1])
const mocked = new Set(['./database.js', './growth-daily.js', '../billing/config.js'])
const realModules = Object.fromEntries(await Promise.all(specifiers.filter(name => !mocked.has(name)).map(async name =>
  [name, await import(name.startsWith('node:') ? name : pathToFileURL(resolve(dirname(file), name)).href)])))
const compiled = ts.transpileModule(source, { fileName: 'growth-course.js', compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText
const OWNER = '00000000-0000-4000-8000-000000000201'
const FOREIGN_OWNER = '00000000-0000-4000-8000-000000000202'
const COURSE = '00000000-0000-4000-8000-000000000203'
const SIBLING = '00000000-0000-4000-8000-000000000204'
const FOREIGN_COURSE = '00000000-0000-4000-8000-000000000205'
const MISSING_COURSE = '00000000-0000-4000-8000-000000000206'
const actor = { id: OWNER }
const oldAt = '2026-01-01T00:00:00.000Z'
const newAt = new Date().toISOString()
const clone = value => structuredClone(value)
function courseRow(overrides = {}) {
  return { id: COURSE, account_id: OWNER, status: 'active', stage: 4, revision: 7, is_primary: true,
    concerns_ciphertext: null, focus_tags: ['stress', 'mood', 'energy'], goals: ['calm_regulation'],
    test_keys: ['hh-weekly-pulse'], scale_keys: ['hh-weekly-pulse::weekly.load'], duration_days: 14,
    day_completions: { '1': { completedAt: oldAt, feedback: 'helped' } },
    started_at: oldAt, chosen_at: oldAt, consented_at: oldAt, updated_at: oldAt, finished_at: null, ...overrides }
}
function cycleRows() {
  return [
    { id: 'cycle-active', account_id: OWNER, course_id: COURSE, status: 'active', revision: 2, cycle_number: 2 },
    { id: 'cycle-paused', account_id: OWNER, course_id: COURSE, status: 'paused', revision: 3, cycle_number: 3 },
    { id: 'cycle-completed', account_id: OWNER, course_id: COURSE, status: 'completed', revision: 4, cycle_number: 1 },
    { id: 'cycle-sibling', account_id: OWNER, course_id: SIBLING, status: 'active', revision: 5, cycle_number: 1 },
    { id: 'cycle-foreign', account_id: FOREIGN_OWNER, course_id: FOREIGN_COURSE, status: 'active', revision: 6, cycle_number: 1 },
  ]
}
function harness({ row = courseRow(), otherRows = [], multiCourseEnabled = true, capacityCount,
  accountActive = true, encryptedConcern = false } = {}) {
  const config = { multiCourseEnabled, billingEnvironment: 'sandbox',
    encryptionKey: Buffer.alloc(32, 17), encryptionKeyId: 'synthetic-close-only' }
  let state = { courses: [...(row ? [clone(row)] : []), ...clone(otherRows)], cycles: row ? cycleRows() : [],
    results: [{ id: 'result-preserved', account_id: OWNER, provenance: { definitionKey: 'hh-weekly-pulse',
      definitionVersion: 'v1', instrumentLocale: 'en' }, measurement_at: oldAt, dimensions: [] }],
    sessions: [{ id: 'session-preserved', account_id: OWNER, cycle_id: 'cycle-active', day_number: 1 }],
    checkins: [{ id: 'checkin-preserved', account_id: OWNER, cycle_id: 'cycle-active', severity: 2 }],
    targets: [{ id: 'target-preserved', account_id: OWNER, cycle_id: 'cycle-active' }] }
  if (!multiCourseEnabled) for (const course of state.courses) { delete course.finished_at; delete course.is_primary }
  if (encryptedConcern) state.courses[0].concerns_ciphertext = realModules['./crypto.js'].seal(
    'Synthetic prior enrollment concern', { accountId: OWNER, recordId: COURSE, field: 'course.concerns' }, config)
  const initial = clone(state), queries = [], transactions = []
  let ownerId, ownerLocked = false
  const db = { async query(sql, parameters = []) {
    const q = sql.replace(/\s+/g, ' ').trim(), args = clone(parameters)
    queries.push({ sql: q, args })
    assert.doesNotMatch(q, /^(delete|truncate|drop|alter)\b/i, 'close/reset cannot delete data or change schemas')
    if (q.startsWith('select status,onboarding_state from app.accounts')) {
      assert.match(q, /where id=\$1/); assert.deepEqual(args, [ownerId])
      if (q.endsWith('for update')) ownerLocked = true
      return { rows: accountActive ? [{ status: 'active', onboarding_state: 'active' }] : [] }
    }
    if (q === 'select * from app_private.course_access($1)') {
      assert.deepEqual(args, ['sandbox'])
      return { rows: [{ tier: 'advanced', active_course_limit: 5,
        active_course_count: capacityCount ?? state.courses.filter(r => r.account_id === ownerId && r.status === 'active').length }] }
    }
    if (q.startsWith('select count(*)::integer as count from app_private.growth_courses')) {
      assert.match(q, /where account_id=\$1 and status='active'/); assert.deepEqual(args, [ownerId])
      return { rows: [{ count: capacityCount ?? state.courses.filter(r => r.account_id === ownerId && r.status === 'active').length }] }
    }
    if (q.startsWith('select * from app_private.growth_courses where account_id=$1')) {
      assert.deepEqual(args.slice(0, 1), [ownerId])
      let rows = state.courses.filter(r => r.account_id === args[0])
      if (/and id=\$2/.test(q)) rows = rows.filter(r => r.id === args[1])
      if (/limit 1(?: |$)/.test(q)) rows = rows.slice(0, 1)
      if (/limit 2(?: |$)/.test(q)) rows = rows.slice(0, 2)
      return { rows: clone(rows) }
    }
    if (q.startsWith('select v.course_id,v.status as cycle_status')) {
      assert.match(q, /where v.account_id=\$1/); assert.deepEqual(args, [ownerId])
      return { rows: state.cycles.filter(c => c.account_id === ownerId).map(c => ({
        course_id: c.course_id, cycle_status: c.status, cycle_number: c.cycle_number,
        completed_lessons: state.sessions.filter(s => s.account_id === ownerId && s.cycle_id === c.id).length,
      })) }
    }
    if (q.includes('from app.assessment_results')) {
      assert.match(q, /where account_id=\$1/); assert.deepEqual(args, [ownerId])
      return { rows: clone(state.results.filter(r => r.account_id === ownerId)) }
    }
    if (q.includes('from app_private.assessment_plans')) {
      assert.match(q, /where account_id=\$1/); assert.deepEqual(args, [ownerId]); return { rows: [] }
    }
    if (q.startsWith('update app_private.growth_cycles set')) {
      assert.equal(ownerLocked, true, 'owner lock precedes every write')
      assert.match(q, /status='archived'/)
      assert.match(q, /where account_id=\$1 and course_id=\$2 and status in \('active','paused'\)/)
      assert.deepEqual(args, [ownerId, COURSE])
      for (const cycle of state.cycles.filter(c => c.account_id === args[0] && c.course_id === args[1] && ['active', 'paused'].includes(c.status))) {
        cycle.status = 'archived'
        if (q.includes('revision=revision+1')) cycle.revision++
        if (q.includes('finished_at=now()')) cycle.finished_at = newAt
        if (q.includes('updated_at=now()')) cycle.updated_at = newAt
      }
      return { rows: [] }
    }
    if (q.startsWith('update app_private.growth_courses set')) {
      assert.equal(ownerLocked, true, 'owner lock precedes every write')
      assert.match(q, /where account_id=\$1 and id=\$2 returning \*/,
        'close/reset must explicitly constrain both account and course')
      assert.deepEqual(args, [ownerId, COURSE])
      const current = state.courses.find(r => r.account_id === args[0] && r.id === args[1])
      assert.ok(current)
      // Apply only assignments actually present in production SQL, so missing
      // reset fields cannot be accidentally supplied by the fake database.
      const setters = q.slice(q.indexOf(' set ') + 5, q.indexOf(' where '))
      if (!multiCourseEnabled) assert.doesNotMatch(setters, /\b(finished_at|is_primary)\b/, 'legacy course schema has neither column')
      const status = setters.match(/\bstatus='([^']+)'/)
      if (status) current.status = status[1]
      for (const field of ['stage', 'duration_days']) {
        const found = setters.match(new RegExp('\\b' + field + '=(\\d+)'))
        if (found) current[field] = Number(found[1])
      }
      for (const field of ['focus_tags', 'goals', 'test_keys', 'scale_keys']) {
        if (setters.includes(field + "='{}'")) current[field] = []
      }
      if (setters.includes("day_completions='{}'::jsonb")) current.day_completions = {}
      if (setters.includes('is_primary=false')) current.is_primary = false
      if (setters.includes('is_primary=true')) current.is_primary = true
      for (const field of ['concerns_ciphertext', 'chosen_at', 'started_at', 'finished_at']) {
        if (setters.includes(field + '=null')) current[field] = null
        if (setters.includes(field + '=now()')) current[field] = newAt
      }
      if (setters.includes('consented_at=now()')) current.consented_at = newAt
      if (setters.includes('updated_at=now()')) current.updated_at = newAt
      if (setters.includes('revision=revision+1')) current.revision++
      return { rows: [clone(current)] }
    }
    if (q.startsWith('insert into app_private.growth_courses(')) {
      assert.equal(ownerLocked, true, 'owner lock precedes enrollment')
      assert.equal(multiCourseEnabled, false, 'fixture covers the free single-course schema')
      assert.match(q, /on conflict\(account_id\) do nothing returning \*/)
      assert.deepEqual(args, [COURSE, ownerId])
      if (state.courses.some(course => course.account_id === ownerId)) return { rows: [] }
      const inserted = { id: args[0], account_id: args[1], status: 'active', stage: 1, revision: 1,
        concerns_ciphertext: null, focus_tags: [], goals: [], test_keys: [], scale_keys: [],
        duration_days: 14, day_completions: {}, chosen_at: null, started_at: null,
        consented_at: newAt, updated_at: newAt }
      state.courses.push(inserted)
      return { rows: [clone(inserted)] }
    }
    assert.fail('Unexpected SQL; no live fallback or unreviewed mutation: ' + q)
  } }
  const runTransaction = async (receivedConfig, receivedActor, fn) => {
    assert.equal(receivedConfig, config); ownerId = receivedActor.id; ownerLocked = false
    const saved = clone(state)
    try { const value = await fn(db); transactions.push('committed'); return value }
    catch (error) { state = saved; transactions.push('rolled-back'); throw error }
  }
  const modules = { ...realModules, 'server-only': {}, './database.js': { transaction: runTransaction },
    './growth-daily.js': { createNewCycle() { assert.fail('close/re-enrollment must not create a daily cycle') } },
    '../billing/config.js': { getBillingConfig: () => ({ enabled: false, enabledPlans: [] }) } }
  const runtime = { exports: {}, Date, Buffer, require(name) {
    assert.ok(Object.hasOwn(modules, name), 'Unexpected import with no live fallback: ' + name); return modules[name]
  } }
  vm.runInNewContext(compiled, runtime, { filename: file })
  const repo = runtime.exports.createGrowthCourseRepository(config, { runTransaction })
  return { repo, queries, initial, transactions, get state() { return clone(state) },
    close(overrides = {}) { return repo.command(actor, { action: 'close', courseId: COURSE, expectedRevision: row.revision, ...overrides }) },
    start(overrides = {}) { return repo.command(actor, { action: 'start', courseId: COURSE, newCourse: false,
      consent: true, expectedRevision: row.revision, ...overrides }) } }
}
function assertHistoryPreserved(h) {
  for (const key of ['results', 'sessions', 'checkins', 'targets']) assert.deepEqual(h.state[key], h.initial[key], key)
  for (const id of ['cycle-completed', 'cycle-sibling', 'cycle-foreign']) {
    assert.deepEqual(h.state.cycles.find(c => c.id === id), h.initial.cycles.find(c => c.id === id), id)
  }
}
const writes = h => h.queries.filter(q => /^(update|insert|delete|truncate|alter|drop)\b/i.test(q.sql))

for (const status of ['active', 'paused']) {
  test(`actual multicourse close archives only the selected ${status} course and preserves history`, async () => {
    const h = harness({ row: courseRow({ status }), otherRows: [courseRow({ id: SIBLING, is_primary: false }),
      courseRow({ id: FOREIGN_COURSE, account_id: FOREIGN_OWNER })] })
    const result = await h.close()
    assert.equal(result.course.id, COURSE); assert.equal(result.course.status, 'archived')
    assert.equal(result.course.revision, 8); assert.equal(result.course.isPrimary, false)
    const closed = h.state.courses.find(c => c.id === COURSE)
    assert.equal(closed.finished_at, newAt); assert.deepEqual(closed.day_completions, h.initial.courses[0].day_completions)
    assert.deepEqual(h.state.courses.filter(c => c.id !== COURSE), h.initial.courses.filter(c => c.id !== COURSE))
    assert.deepEqual(h.state.cycles.filter(c => ['cycle-active', 'cycle-paused'].includes(c.id)).map(c => c.status), ['archived', 'archived'])
    assertHistoryPreserved(h); assert.equal(writes(h).length, 2)
  })
  test(`actual legacy close marks the ${status} course closed with identity/revision preserved`, async () => {
    const h = harness({ row: courseRow({ status }), multiCourseEnabled: false })
    const result = await h.close()
    assert.equal(result.course.id, COURSE); assert.equal(result.course.status, 'closed')
    assert.equal(result.course.revision, 8); assert.equal(h.state.courses[0].stage, 4)
    assertHistoryPreserved(h); assert.equal(writes(h).length, 2)
  })
}

test('close rejects wrong owner/course, stale revision, and missing explicit multicourse selection before any write', async () => {
  for (const multiCourseEnabled of [true, false]) {
    for (const [overrides, code] of [[{ courseId: FOREIGN_COURSE }, 'COURSE_NOT_FOUND'],
      [{ courseId: MISSING_COURSE }, 'COURSE_NOT_FOUND'], [{ expectedRevision: 6 }, 'REVISION_CONFLICT']]) {
      const h = harness({ multiCourseEnabled, otherRows: [courseRow({ id: FOREIGN_COURSE, account_id: FOREIGN_OWNER })] })
      await assert.rejects(h.close(overrides), { code }); assert.equal(writes(h).length, 0); assertHistoryPreserved(h)
    }
  }
  const h = harness({ otherRows: [courseRow({ id: SIBLING })] })
  await assert.rejects(h.repo.command(actor, { action: 'close', expectedRevision: 7 }), { code: 'COURSE_SELECTION_REQUIRED' })
  assert.equal(writes(h).length, 0)
})

test('a first free course can be created with a stable client UUID and cannot accidentally create a second course', async () => {
  const h = harness({ row: null, multiCourseEnabled: false })
  const payload = { action: 'start', courseId: COURSE, newCourse: false, consent: true }
  const first = await h.repo.command(actor, payload)
  assert.equal(first.course.id, COURSE)
  assert.equal(first.course.status, 'active')
  assert.equal(first.course.stage, 1)
  assert.equal(first.access.activeCourseCount, 1)
  assert.equal(writes(h).length, 1)
  assert.match(writes(h)[0].sql, /^insert into app_private.growth_courses/)

  const repeat = await h.repo.command(actor, payload)
  assert.equal(repeat.course.id, COURSE, 'a retry reuses the same enrollment')
  assert.equal(writes(h).length, 1, 'retries never create another enrollment')
  await assert.rejects(
    h.repo.command(actor, { ...payload, courseId: MISSING_COURSE }),
    { code: 'COURSE_NOT_STARTED', status: 404 },
  )
  assert.equal(h.state.courses.length, 1)
  assert.equal(writes(h).length, 1)
})

test('first free enrollment respects owner consent and capacity checks before insertion', async () => {
  for (const [params, expected] of [
    [{ consent: false }, 'CONSENT_REQUIRED'],
    [{ consent: undefined }, 'CONSENT_REQUIRED'],
    [{ capacityCount: 1 }, 'COURSE_ACTIVE_LIMIT'],
  ]) {
    const { capacityCount, ...overrides } = params
    const h = harness({ row: null, multiCourseEnabled: false, capacityCount })
    await assert.rejects(
      h.repo.command(actor, { action: 'start', courseId: COURSE, newCourse: false, consent: true, ...overrides }),
      { code: expected },
    )
    assert.equal(writes(h).length, 0)
    assert.deepEqual(h.state, h.initial)
  }
})

test('legacy re-enrollment resets only its closed course after fresh consent, revision and capacity checks', async () => {
  const h = harness({ multiCourseEnabled: false, encryptedConcern: true })
  const closed = await h.close()
  assert.equal(closed.course.status, 'closed'); assert.equal(closed.course.revision, 8)
  const beforeCycles = clone(h.state.cycles), queryCount = h.queries.length
  const result = await h.start({ expectedRevision: closed.course.revision })
  assert.equal(result.course.id, COURSE); assert.equal(result.course.status, 'active')
  assert.equal(result.course.stage, 1); assert.equal(result.course.revision, 9)
  const reset = h.state.courses[0]
  for (const field of ['focus_tags', 'goals', 'test_keys', 'scale_keys']) assert.deepEqual(reset[field], [], field)
  for (const field of ['concerns_ciphertext', 'chosen_at', 'started_at']) assert.equal(reset[field], null, field)
  assert.equal(Object.hasOwn(reset, 'finished_at'), false); assert.equal(Object.hasOwn(reset, 'is_primary'), false)
  assert.deepEqual(reset.day_completions, {}); assert.equal(reset.duration_days, 14)
  assert.equal(reset.consented_at, newAt); assert.notEqual(reset.consented_at, oldAt)
  assert.deepEqual(h.state.cycles, beforeCycles); assertHistoryPreserved(h)
  const resetQueries = h.queries.slice(queryCount)
  const resetAt = resetQueries.findIndex(q => q.sql.startsWith('update '))
  const capacityAt = resetQueries.findIndex(q => q.sql.startsWith('select count(*)::integer as count'))
  assert.ok(capacityAt >= 0 && capacityAt < resetAt, 'capacity must be checked before reactivation')
  assert.equal(resetQueries.filter(q => q.sql.startsWith('update ')).length, 1)
})

test('legacy reset rejects absent/false consent, stale/missing revision and exhausted capacity without touching history', async () => {
  for (const [overrides, code, capacityCount] of [[{ consent: false }, 'CONSENT_REQUIRED'],
    [{ consent: undefined }, 'CONSENT_REQUIRED'], [{ expectedRevision: 6 }, 'REVISION_CONFLICT'],
    [{ expectedRevision: undefined }, 'REVISION_CONFLICT'], [{}, 'COURSE_ACTIVE_LIMIT', 1]]) {
    const h = harness({ row: courseRow({ status: 'closed' }), multiCourseEnabled: false, capacityCount })
    await assert.rejects(h.start(overrides), { code }); assert.equal(writes(h).length, 0)
    assert.deepEqual(h.state, h.initial); assertHistoryPreserved(h)
  }
})

test('explicit wrong-target legacy start cannot fall back to resetting another closed course', async () => {
  for (const courseId of [FOREIGN_COURSE, MISSING_COURSE]) {
    const h = harness({ row: courseRow({ status: 'closed' }), multiCourseEnabled: false,
      otherRows: [courseRow({ id: FOREIGN_COURSE, account_id: FOREIGN_OWNER })] })
    await assert.rejects(h.start({ courseId }), error => ['COURSE_NOT_FOUND', 'COURSE_NOT_STARTED'].includes(error.code))
    assert.equal(writes(h).length, 0); assert.deepEqual(h.state, h.initial)
  }
})

test('archived multicourse history is not reset by legacy re-enrollment logic', async () => {
  const h = harness({ row: courseRow({ status: 'archived', is_primary: false, finished_at: oldAt }) })
  const result = await h.start()
  assert.equal(result.course.status, 'archived'); assert.equal(result.course.id, COURSE)
  assert.equal(writes(h).length, 0); assert.deepEqual(h.state, h.initial)
})

test('closed legacy courses cannot resume or mutate their prior enrollment without a fresh start', async () => {
  for (const action of ['resume', 'pause', 'intake', 'choose-goals']) {
    const h = harness({ row: courseRow({ status: 'closed' }), multiCourseEnabled: false })
    await assert.rejects(h.repo.command(actor, { action, courseId: COURSE, expectedRevision: 7 }),
      error => ['COURSE_NOT_STARTED', 'COURSE_NOT_ACTIVE'].includes(error.code))
    assert.equal(writes(h).length, 0); assert.deepEqual(h.state, h.initial)
  }
})

test('repeated close cannot rewrite archived cycles or completed enrollment history', async () => {
  for (const multiCourseEnabled of [true, false]) {
    const h = harness({ multiCourseEnabled }), closed = await h.close(), saved = h.state, writeCount = writes(h).length
    await assert.rejects(h.close({ expectedRevision: closed.course.revision }),
      error => ['COURSE_ALREADY_FINISHED', 'COURSE_NOT_STARTED'].includes(error.code))
    assert.equal(writes(h).length, writeCount); assert.deepEqual(h.state, saved); assertHistoryPreserved(h)
  }
})

test('inactive account is rejected by the owner lock before closing or resetting', async () => {
  for (const action of ['close', 'start']) {
    const h = harness({ row: courseRow({ status: action === 'close' ? 'active' : 'closed' }),
      multiCourseEnabled: false, accountActive: false })
    await assert.rejects(h[action](), { code: 'ACCOUNT_UNAVAILABLE', status: 403 })
    assert.equal(writes(h).length, 0); assert.deepEqual(h.state, h.initial)
  }
})

test('close-status migration source retains every prior allowed status without mutating stored histories', () => {
  const migration = readFileSync(resolve(root, 'supabase/migrations/20261014225100_hh_growth_course_close.sql'), 'utf8')
  const check = migration.match(/check\s*\(\s*status\s+in\s*\(([^)]+)\)/i)
  assert.ok(check, 'migration must contain a status allowlist')
  const statuses = [...check[1].matchAll(/'([^']+)'/g)].map(match => match[1])
  assert.deepEqual([...statuses].sort(), ['active', 'paused', 'completed', 'archived', 'closed'].sort())
  assert.doesNotMatch(migration, /\b(delete\s+from|truncate\s|update\s+app(?:_private)?\.)/i)
})

test('unapplied concurrent proposal preserves legacy closed rows and excludes them from active quota', () => {
  const proposal = readFileSync(resolve(root, 'docs/billing/proposed-concurrent-course-schema.sql'), 'utf8')
  const check = proposal.match(/check\s*\(\s*status\s+in\s*\(([^)]+)\)/i)
  assert.ok(check)
  assert.deepEqual([...check[1].matchAll(/'([^']+)'/g)].map(match => match[1]).sort(), ['active','paused','completed','archived','closed'].sort())
  assert.match(proposal, /RAISE EXCEPTION 'UNAPPLIED CONCURRENT COURSE PROPOSAL/)
  assert.match(proposal, /c.status='active'/)
  assert.doesNotMatch(proposal, /status\s*=\s*'closed'/i)
})
