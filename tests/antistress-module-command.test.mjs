import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'

// Run from a checkout: node --test tests/antistress-module-command.test.mjs
// Standalone artifact: GROWTH_COURSE_ROOT=/absolute/candidate node --test /path/to/this-file.mjs
// Actual repository, owner guards, router, presets, scales and encryption execute.
// Only transaction/SQL, billing configuration and the createNewCycle boundary are
// replaced. No database client, environment credentials, network or real users.
const root = process.env.GROWTH_COURSE_ROOT
  ? resolve(process.env.GROWTH_COURSE_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), '..')
const load = path => import(pathToFileURL(resolve(root, path)).href)
const requireFromRoot = createRequire(resolve(root, 'package.json'))
const ts = requireFromRoot('typescript')
const [contracts, model, guidance, programs, catalog, definitions, strategy, router, presets, plans, access, crypto, nodeCrypto, guides] = await Promise.all([
  'lib/assessments/contracts.js', 'lib/inner-growth/course-model.js', 'lib/assessments/personal-guidance.js',
  'lib/inner-growth/course-programs.js', 'data/assessments/catalog.js', 'lib/assessments/definitions.js',
  'lib/inner-growth/course-strategy.js', 'lib/inner-growth/antistress-module-router.js',
  'lib/inner-growth/course-presets.js', 'lib/inner-growth/course-plans.js', 'lib/app/course-access.js',
  'lib/app/crypto.js',
].map(load).concat([import('node:crypto'), load('lib/assessments/scale-guides.js')]))

const OWNER = '00000000-0000-4000-8000-000000000001'
const OTHER_OWNER = '00000000-0000-4000-8000-000000000002'
const COURSE = '00000000-0000-4000-8000-000000000003'
const OTHER_COURSE = '00000000-0000-4000-8000-000000000004'
const RESULT = '00000000-0000-4000-8000-000000000005'
const actor = { id: OWNER }
const clone = value => structuredClone(value)
const config = { multiCourseEnabled: true, billingEnvironment: 'sandbox',
  encryptionKey: Buffer.alloc(32, 31), encryptionKeyId: 'synthetic-command-test-only' }
const context = (courseId = COURSE, accountId = OWNER) => ({ accountId, recordId: courseId, field: 'course.concerns' })
const plainConcern = 'Synthetic practice goal'
const finderAnswers = { F1: 7, F2: 7, F3: 7, F4: 7, F5: 2, F6: 2, F7: 7, F8: 7 }
const now = Date.now()
function resultFor(key = 'hh-weekly-pulse', { ageDays = 1, accountId = OWNER, id = RESULT, values = {} } = {}) {
  const entry = catalog.MONITORING_CATALOG.find(item => item.key === key)
  const guide = guides.getTestScaleGuide(key, 'en')
  assert.ok(entry && guide, 'real catalogue and scale guide are required for fixture ' + key)
  return { id, account_id: accountId, provenance: { definitionKey: key, definitionVersion: entry.version,
    instrumentLocale: entry.instrumentLocale === 'dynamic' ? 'en' : entry.instrumentLocale },
  measurement_at: new Date(now - ageDays * 86400000).toISOString(),
  dimensions: guide.scales.map(scale => ({ key: scale.key, min: scale.min, max: scale.max,
    direction: scale.direction, value: values[scale.key] ?? Math.round((scale.min + scale.max) / 2) })) }
}
function courseRow(overrides = {}) {
  return { id: COURSE, account_id: OWNER, status: 'active', stage: 3, revision: 7, is_primary: true,
    focus_tags: [...programs.getCourseProgram('stress').focusTags], test_keys: ['hh-weekly-pulse'],
    goals: [], scale_keys: [], duration_days: 14, day_completions: {},
    concerns_ciphertext: crypto.seal(plainConcern, context(), config), ...overrides }
}
function selectedScales(row, resultRows) {
  return strategy.courseMeasuredProfile({ testKeys: row.test_keys, locale: 'en', results: resultRows.map(r => ({
    id: r.id, ...r.provenance, dimensions: r.dimensions, measurementAt: r.measurement_at,
  })) }).eligible.slice(0, 3).map(item => item.id)
}
function commandBody(row, results, overrides = {}) {
  const scaleKeys = selectedScales(row, results.filter(item => item.account_id === row.account_id))
  return { action: 'choose-goals', courseId: row.id, expectedRevision: row.revision, consent: true,
    durationDays: 14, ...(scaleKeys.length ? { scaleKeys } : { goals: ['calm_regulation'] }), ...overrides }
}

function harness({ row = courseRow(), results = [resultFor()], otherRows = [],
  beforeCycle, accountActive = true } = {}) {
  let rows = [clone(row), ...clone(otherRows)]
  const queries = [], cycles = [], transactions = [], seals = []
  let ownerId
  const db = { async query(sql, parameters = []) {
    assert.equal(typeof sql, 'string')
    const q = sql.replace(/\s+/g, ' ').trim()
    const args = clone(parameters)
    queries.push({ sql: q, args })
    if (q.startsWith('select status,onboarding_state from app.accounts')) {
      assert.match(q, /where id=\$1/); assert.equal(args[0], ownerId)
      return { rows: accountActive ? [{ status: 'active', onboarding_state: 'active' }] : [] }
    }
    if (q === 'select * from app_private.course_access($1)') {
      assert.deepEqual(args, ['sandbox'])
      return { rows: [{ tier: 'advanced', active_course_limit: 5,
        active_course_count: rows.filter(r => r.account_id === ownerId && r.status === 'active').length }] }
    }
    if (/^select .* from app_private.growth_courses where account_id=\$1/.test(q)) {
      assert.equal(args[0], ownerId, 'course reads remain actor-scoped')
      let owned = rows.filter(r => r.account_id === args[0])
      if (/and id=\$2/.test(q)) owned = owned.filter(r => r.id === args[1])
      if (/limit 1(?: |$)/.test(q)) owned = owned.slice(0, 1)
      if (/limit 2(?: |$)/.test(q)) owned = owned.slice(0, 2)
      return { rows: clone(owned) }
    }
    if (q.startsWith('select v.course_id,v.status as cycle_status')) {
      assert.match(q, /where v.account_id=\$1/); assert.equal(args[0], ownerId)
      return { rows: [] }
    }
    if (q.includes('from app.assessment_results')) {
      assert.match(q, /where account_id=\$1(?: |$)/, 'every measurement query must constrain account_id')
      assert.deepEqual(args, [ownerId], 'every measurement query must use the transaction actor')
      return { rows: clone(results.filter(r => r.account_id === args[0]).sort((a, b) => b.measurement_at.localeCompare(a.measurement_at))) }
    }
    if (q.includes('from app_private.assessment_plans')) {
      assert.match(q, /where account_id=\$1/); assert.deepEqual(args, [ownerId])
      return { rows: [] }
    }
    if (q.startsWith('update app_private.growth_courses set stage=4,')) {
      assert.match(q, /where id=\$1 returning \*/)
      // Mirrors owner-role RLS for the repository's locked selected-row update.
      const current = rows.find(r => r.id === args[0] && r.account_id === ownerId)
      assert.ok(current, 'update can only touch the selected owner course')
      Object.assign(current, { stage: 4, goals: clone(args[1]), scale_keys: clone(args[2]), duration_days: args[3],
        revision: current.revision + 1, started_at: new Date(now).toISOString(), chosen_at: new Date(now).toISOString() })
      if (q.includes('concerns_ciphertext=$5')) current.concerns_ciphertext = args[4]
      return { rows: [clone(current)] }
    }
    assert.fail('Unexpected SQL; this harness has no live database fallback: ' + q)
  } }
  const runTransaction = async (receivedConfig, receivedActor, fn) => {
    assert.equal(receivedConfig, config)
    ownerId = receivedActor.id
    const snapshot = clone(rows)
    try { const result = await fn(db); transactions.push('committed'); return result }
    catch (error) { rows = snapshot; transactions.push('rolled-back'); throw error }
  }
  const modules = {
    'server-only': {}, 'node:crypto': nodeCrypto,
    './database.js': { transaction: runTransaction },
    './crypto.js': { ...crypto, seal(value, encryptionContext, cfg) {
      seals.push({ value, context: clone(encryptionContext) }); return crypto.seal(value, encryptionContext, cfg)
    } },
    '../billing/config.js': { getBillingConfig: () => ({ enabled: false, enabledPlans: [] }) },
    '../inner-growth/course-plans.js': plans, '../inner-growth/course-presets.js': presets,
    './course-access.js': access, '../assessments/contracts.js': contracts,
    '../inner-growth/course-model.js': model, '../assessments/personal-guidance.js': guidance,
    '../inner-growth/course-programs.js': programs, '../../data/assessments/catalog.js': catalog,
    '../assessments/definitions.js': definitions, '../inner-growth/course-strategy.js': strategy,
    '../inner-growth/antistress-module-router.js': router,
    './growth-daily.js': { async createNewCycle(receivedDB, receivedActor, receivedRow, receivedConfig, payload) {
      assert.equal(receivedDB, db); assert.equal(receivedConfig, config)
      assert.equal(receivedActor.id, ownerId); assert.equal(receivedRow.account_id, ownerId)
      assert.equal(receivedRow.stage, 4)
      beforeCycle?.(receivedRow, payload)
      cycles.push({ actorId: receivedActor.id, row: clone(receivedRow), payload: clone(payload) })
      return { id: 'synthetic-cycle' }
    } },
  }
  const path = resolve(root, 'lib/app/growth-course.js')
  const source = readFileSync(path, 'utf8')
  assert.doesNotMatch(source, /^<{7}|^={7}|^>{7}/m, 'repository must have no conflict markers')
  const compiled = ts.transpileModule(source, { fileName: 'growth-course.js', compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText
  const runtime = { exports: {}, Date, Buffer, console, require: name => {
    assert.ok(Object.hasOwn(modules, name), 'Unexpected import; no live dependency fallback: ' + name)
    return modules[name]
  } }
  vm.runInNewContext(compiled, runtime, { filename: path })
  const repo = runtime.exports.createGrowthCourseRepository(config, { runTransaction })
  return { repo, queries, cycles, seals, transactions, body: commandBody(row, results),
    get rows() { return clone(rows) } }
}

function assertScoped(h, id = COURSE) {
  const lock = h.queries.find(q => q.sql === 'select status,onboarding_state from app.accounts where id=$1 for update')
  assert.ok(lock, 'actual lockCourseOwner executes'); assert.deepEqual(lock.args, [OWNER])
  const selected = h.queries.find(q => q.sql.startsWith('select * from app_private.growth_courses') && q.sql.endsWith('for update'))
  assert.ok(selected); assert.match(selected.sql, /where account_id=\$1 and id=\$2/)
  assert.deepEqual(selected.args, [OWNER, id])
  const assessmentReads = h.queries.filter(q => q.sql.includes('from app.assessment_results'))
  assert.ok(assessmentReads.length)
  for (const query of assessmentReads) { assert.match(query.sql, /where account_id=\$1/); assert.deepEqual(query.args, [OWNER]) }
}

test('actual choose-goals command persists selected AS3 and reaches createNewCycle after the branch', async () => {
  const h = harness()
  const response = await h.repo.command(actor, { ...h.body, moduleAnswers: finderAnswers, moduleGoal: 'AS3', moduleId: 'AS3' })
  assert.equal(h.cycles.length, 1); assert.equal(h.cycles[0].payload.moduleId, 'AS3')
  assert.equal(h.cycles[0].row.id, COURSE); assert.equal(h.cycles[0].actorId, OWNER)
  assert.equal(response.course.stage, 4); assert.equal(response.course.revision, 8)
  assert.equal(response.course.concerns, plainConcern); assert.equal(response.courses[0].title, plainConcern)
  assert.equal(response.course.moduleChoice.id, 'AS3')
  const persisted = router.unpackCourseModuleContext(crypto.openSealed(h.rows[0].concerns_ciphertext, context(), config))
  assert.equal(persisted.concerns, plainConcern); assert.equal(persisted.moduleChoice.id, 'AS3')
  assert.equal(persisted.moduleChoice.weeklyResultId, RESULT)
  assert.equal(persisted.moduleChoice.version, router.ANTISTRESS_ROUTER_VERSION)
  assert.equal(h.seals.length, 1); assert.deepEqual(h.seals[0].context, context())
  assert.deepEqual(h.transactions, ['committed']); assertScoped(h)
})

test('new personal Anti-Stress requires a skill questionnaire before a new cycle',async()=>{
  const h=harness()
  await assert.rejects(h.repo.command(actor,h.body),
    {code:'COURSE_MODULE_FINDER_REQUIRED',status:409})
  assert.equal(h.cycles.length,0)
  assert.deepEqual(h.transactions,['rolled-back'])
})

test('clinician-supported AS4 cannot be started from a self-guided test',async()=>{
  const h=harness()
  await assert.rejects(h.repo.command(actor,{...h.body,moduleAnswers:finderAnswers,moduleId:'AS4'}),
    {code:'COURSE_PROFESSIONAL_SUPPORT_REQUIRED',status:403})
  assert.equal(h.cycles.length,0)
  assert.deepEqual(h.transactions,['rolled-back'])
})

test('actual legacy non-Anti-Stress command needs no module finder or assessment battery', async () => {
  const h = harness({ row: courseRow({ focus_tags: [], test_keys: [] }), results: [] })
  const response = await h.repo.command(actor, h.body)
  assert.equal(h.cycles.length, 1); assert.equal(h.cycles[0].payload.moduleId, 'AS2')
  assert.equal(response.course.stage, 4); assert.equal(response.course.moduleChoice, null)
  assert.equal(h.seals.length, 0); assertScoped(h)
})

for (const preset of presets.COURSE_PRESETS) {
  test(`actual fixed preset ${preset.id} starts without finder and without a fresh Weekly Pulse`, async () => {
    const row = courseRow({ focus_tags: presets.coursePresetTags(preset.id), test_keys: [...preset.testKeys] })
    const results = preset.testKeys.map((key, index) => resultFor(key, { ageDays: 30,
      id: `00000000-0000-4000-8000-${String(index + 20).padStart(12, '0')}` }))
    assert.equal(router.weeklyAxesFromResults(results.map(r => ({ ...r.provenance, dimensions: r.dimensions, measurementAt: r.measurement_at }))).ready, false)
    const h = harness({ row, results })
    const response = await h.repo.command(actor, h.body)
    assert.equal(h.cycles.length, 1); assert.equal(h.cycles[0].payload.moduleId, 'AS2')
    assert.equal(response.course.presetId, preset.id); assert.equal(response.course.stage, 4)
    assert.equal(response.course.moduleChoice, null); assert.equal(h.seals.length, 0)
    assert.deepEqual([...response.course.testKeys], preset.testKeys); assertScoped(h)
  })
}

test('module recommendation only reads this actor; another owner cannot supply the missing Weekly baseline', async () => {
  const h = harness({ results: [resultFor('hh-weekly-pulse', { accountId: OTHER_OWNER })] })
  await assert.rejects(h.repo.command(actor, { ...h.body, moduleAnswers: finderAnswers, moduleId: 'AS4' }),
    { code: 'COURSE_TESTS_REMAIN', status: 409 })
  assert.equal(h.cycles.length, 0); assert.equal(h.rows[0].stage, 3)
  assert.deepEqual(h.transactions, ['rolled-back']); assertScoped(h)
})

test('another owner courseId is rejected by the actual ownership guard before assessment reads or update', async () => {
  const foreign = courseRow({ id: OTHER_COURSE, account_id: OTHER_OWNER, concerns_ciphertext: null })
  const h = harness({ otherRows: [foreign] })
  await assert.rejects(h.repo.command(actor, { ...h.body, courseId: OTHER_COURSE }), { code: 'COURSE_NOT_FOUND', status: 404 })
  assert.equal(h.cycles.length, 0)
  assert.equal(h.queries.some(q => q.sql.startsWith('update ')), false)
  assert.equal(h.queries.some(q => q.sql.includes('from app.assessment_results')), false)
  assert.equal(h.rows.find(row => row.id === OTHER_COURSE).stage, 3)
})

test('multiple owned courses still require explicit courseId for a command', async () => {
  const second = courseRow({ id: OTHER_COURSE, concerns_ciphertext: null })
  const h = harness({ otherRows: [second] })
  const { courseId, ...body } = h.body
  await assert.rejects(h.repo.command(actor, body), { code: 'COURSE_SELECTION_REQUIRED', status: 409 })
  assert.equal(h.cycles.length, 0); assert.equal(h.queries.some(q => q.sql.startsWith('update ')), false)
})

test('stale revision and missing consent stop choose-goals before mutation and cycle creation', async () => {
  for (const [overrides, code] of [[{ expectedRevision: 6 }, 'REVISION_CONFLICT'], [{ consent: false }, 'CONSENT_REQUIRED']]) {
    const h = harness()
    await assert.rejects(h.repo.command(actor, { ...h.body, ...overrides }), { code })
    assert.equal(h.cycles.length, 0); assert.equal(h.queries.some(q => q.sql.startsWith('update ')), false)
  }
})

test('invalid finder answers or module id cannot activate a course', async () => {
  for (const overrides of [{ moduleAnswers: { F1: 99 }, moduleId: 'AS4' },
    { moduleAnswers: finderAnswers, moduleId: 'AS7' }, { moduleAnswers: finderAnswers, moduleGoal: 'AS7' },
    { moduleAnswers: finderAnswers, moduleId: 'AS7' }, { moduleAnswers: finderAnswers, moduleGoal: 'AS7' }]) {
    const h = harness()
    await assert.rejects(h.repo.command(actor, { ...h.body, ...overrides }),
      { code: 'COURSE_MODULE_FINDER_INVALID', status: 400 })
    assert.equal(h.cycles.length, 0); assert.equal(h.queries.some(q => q.sql.startsWith('update ')), false)
  }
})

test('personal Anti-Stress still rejects stale Weekly Pulse at actual activation', async () => {
  const h = harness({ results: [resultFor('hh-weekly-pulse', { ageDays: 8 })] })
  await assert.rejects(h.repo.command(actor, { ...h.body, moduleAnswers: finderAnswers, moduleId: 'AS4' }),
    { code: 'COURSE_TESTS_REMAIN', status: 409 })
  assert.equal(h.cycles.length, 0); assert.equal(h.queries.some(q => q.sql.startsWith('update ')), false)
  assertScoped(h)
})

test('cycle creation failure rolls back the chosen module envelope with the course activation', async () => {
  const h = harness({ beforeCycle() { throw new Error('SYNTHETIC_CYCLE_FAILURE') } })
  await assert.rejects(h.repo.command(actor, { ...h.body, moduleAnswers: finderAnswers, moduleId: 'AS3' }), /SYNTHETIC_CYCLE_FAILURE/)
  assert.deepEqual(h.transactions, ['rolled-back']); assert.equal(h.rows[0].stage, 3)
  assert.equal(crypto.openSealed(h.rows[0].concerns_ciphertext, context(), config), plainConcern)
})

for (const preset of presets.COURSE_PRESETS) {
  test(`actual fixed preset ${preset.id} still rejects an incomplete mandatory battery`, async () => {
    const row = courseRow({ stage: 2, focus_tags: presets.coursePresetTags(preset.id), test_keys: [...preset.testKeys] })
    const h = harness({ row, results: [] })
    await assert.rejects(h.repo.command(actor, { action: 'confirm-tests', courseId: COURSE,
      expectedRevision: row.revision, testKeys: preset.testKeys.slice(1) }), { code: 'COURSE_PRESET_TESTS_FIXED', status: 409 })
    assert.equal(h.cycles.length, 0); assert.equal(h.queries.some(q => q.sql.startsWith('update ')), false)
  })
}
