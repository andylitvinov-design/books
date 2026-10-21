import { COURSE_ANTISTRESS_SKILLS_V7 } from '../lib/inner-growth/anti-stress-skills-v7.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'

// Executes the complete, unchanged growth-daily module, including its real
// createNewCycle and course-access implementation. Only database transport is
// replaced with an allowlisted synthetic query recorder; no live fallback.
// Portable in tests/. GROWTH_COURSE_ROOT supports standalone local execution.
const root = process.env.GROWTH_COURSE_ROOT
  ? resolve(process.env.GROWTH_COURSE_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), '..')
const appRoot = resolve(root, 'lib/app')
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const pureImports = [
  '../inner-growth/trauma-phase-catalog.js','../inner-growth/trauma-phase-outcomes.js',
  '../inner-growth/course-presets.js', './course-access.js', '../assessments/contracts.js', './crypto.js',
  '../inner-growth/course-model.js', '../inner-growth/course-programs.js', '../../data/assessments/catalog.js',
  '../inner-growth/course-final-retest.js', '../inner-growth/anti-stress-weekly-checkpoint.js',
  '../assessments/scale-guides.js', '../inner-growth/lesson-library.js', '../inner-growth/course-v3.js',
  '../../data/inner-growth/course-journey.js', '../inner-growth/course-strategy.js',
  '../inner-growth/course-adaptation.js', '../inner-growth/antistress-module-lessons.js',
  '../inner-growth/antistress-module-router.js', '../inner-growth/anti-stress-day-one.js',
  '../inner-growth/opora-state-journey.js', '../inner-growth/anti-stress-skills-v6.js',
  '../inner-growth/anti-stress-practice-lab.js', '../inner-growth/anti-stress-method-activities.js',
  '../inner-growth/course-slide-sequence.js',
  '../assessments/verified-history.js',
  '../inner-growth/course-progress.js', '../inner-growth/opora-module-exercise.js',
]
const modules = Object.fromEntries(await Promise.all(pureImports.map(async specifier =>
  [specifier, await import(pathToFileURL(resolve(appRoot, specifier)).href)])))
modules['server-only'] = {}
modules['node:crypto'] = await import('node:crypto')
modules['./database.js'] = { transaction() { assert.fail('Live transaction is forbidden in synthetic cycle tests') } }
const programs = modules['../inner-growth/course-programs.js']
const presets = modules['../inner-growth/course-presets.js']
const crypto = modules['./crypto.js']
const router = modules['../inner-growth/antistress-module-router.js']
const lessons = modules['../inner-growth/lesson-library.js']
const { COURSE_CONTENT_V4, COURSE_ANTISTRESS_OUTCOME_V3 } = lessons
const path = resolve(appRoot, 'growth-daily.js')
const source = readFileSync(path, 'utf8')
assert.doesNotMatch(source, /^<{7}|^={7}|^>{7}/m)
const compiled = ts.transpileModule(source, { fileName: 'growth-daily.js', compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText
const runtime = { exports: {}, Date, Buffer, console, require(specifier) {
  assert.ok(Object.hasOwn(modules, specifier), 'No unmocked database or unknown import: ' + specifier)
  return modules[specifier]
} }
vm.runInNewContext(compiled, runtime, { filename: path })
const { createNewCycle } = runtime.exports
assert.equal(typeof createNewCycle, 'function')

const OWNER = '00000000-0000-4000-8000-000000000101'
const COURSE = '00000000-0000-4000-8000-000000000102'
const actor = { id: OWNER }
const config = { multiCourseEnabled: true, billingEnvironment: 'sandbox',
  encryptionKey: Buffer.alloc(32, 19), encryptionKeyId: 'synthetic-cycle-test-only' }
const context = (recordId, field) => ({ accountId: OWNER, recordId, field })
const input = { problemLabel: 'Synthetic everyday practice', intention: 'Synthetic achievable step', timeZone: 'UTC' }
const clone = value => structuredClone(value)
function courseRow({ presetId, storedModule, ...overrides } = {}) {
  const concern = storedModule ? router.packCourseModuleContext('Synthetic concern', { id: storedModule }) : 'Synthetic concern'
  return { id: COURSE, account_id: OWNER, status: 'active', stage: 4, revision: 8,
    goals: [presetId ? presets.getCoursePreset(presetId).primaryGoal : 'calm_regulation'],
    focus_tags: presetId ? presets.coursePresetTags(presetId) : [...programs.getCourseProgram('stress').focusTags],
    concerns_ciphertext: crypto.seal(concern, context(COURSE, 'course.concerns'), config), ...overrides }
}
function harness(course = courseRow(), { existingCycle = false, maxCycle = 0, capacityUnavailable = false } = {}) {
  const queries = [], inserts = []
  const db = { async query(sql, args = []) {
    args = clone(args) // Normalize VM arrays before host strict assertions.
    const q = sql.replace(/\s+/g, ' ').trim()
    queries.push({ sql: q, args: clone(args) })
    if (q === 'select status,onboarding_state,timezone from app.accounts where id=$1') {
      assert.deepEqual(args, [OWNER])
      return { rows: [{ status: 'active', onboarding_state: 'active', timezone: 'UTC' }] }
    }
    if (q === 'select * from app_private.course_access($1)') {
      assert.deepEqual(args, ['sandbox'])
      return { rows: capacityUnavailable ? [] : [{ tier: 'advanced', active_course_limit: 5, active_course_count: 1 }] }
    }
    if (q.startsWith('select * from app_private.growth_courses where account_id=$1')) {
      assert.match(q, /and id=\$2/); assert.deepEqual(args, [OWNER, COURSE])
      return { rows: [clone(course)] }
    }
    if (q === 'select status from app_private.growth_cycles where account_id=$1 and course_id=$2') {
      assert.deepEqual(args, [OWNER, COURSE]); return { rows: [] }
    }
    if (q.startsWith('select id from app_private.growth_cycles')) {
      assert.match(q, /where account_id=\$1 and course_id=\$2 and status in \('active','paused'\) for update/)
      assert.deepEqual(args, [OWNER, COURSE])
      return { rows: existingCycle ? [{ id: '00000000-0000-4000-8000-000000000103' }] : [] }
    }
    if (q.startsWith('select coalesce(max(cycle_number),0)::integer as max')) {
      assert.match(q, /where account_id=\$1 and course_id=\$2$/); assert.deepEqual(args, [OWNER, COURSE])
      return { rows: [{ max: maxCycle }] }
    }
    if (q.startsWith('insert into app_private.growth_cycles')) {
      assert.match(q, /\(id,account_id,course_id,cycle_number,primary_domain,content_version,start_local_date,time_zone,duration_days,preferences\)/)
      assert.match(q, /values\(\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8,14,\$9::jsonb\)/)
      assert.equal(args.length, 9); assert.equal(args[1], OWNER); assert.equal(args[2], COURSE)
      inserts.push({ table: 'growth_cycles', args: clone(args) }); return { rows: [] }
    }
    if (q.startsWith('insert into app_private.growth_targets')) {
      assert.equal(args.length, 5); assert.equal(args[1], OWNER)
      inserts.push({ table: 'growth_targets', args: clone(args) }); return { rows: [] }
    }
    assert.fail('Unexpected SQL; no live database fallback: ' + q)
  } }
  return { db, queries, inserts, course,
    async create(overrides = {}) { return createNewCycle(db, actor, course, config, { ...input, ...overrides }) } }
}
function assertCreated(h, id, expectedVersion, expectedPreferences, cycleNumber = 1) {
  assert.equal(h.inserts.length, 2, 'only the new cycle and its target are written')
  const cycle = h.inserts[0].args, target = h.inserts[1].args
  assert.equal(h.inserts[0].table, 'growth_cycles'); assert.equal(h.inserts[1].table, 'growth_targets')
  assert.equal(cycle[0], id); assert.equal(cycle[1], OWNER); assert.equal(cycle[2], COURSE)
  assert.equal(cycle[3], cycleNumber); assert.equal(cycle[4], h.course.goals[0])
  assert.equal(cycle[5], expectedVersion); assert.equal(cycle[7], 'UTC')
  assert.deepEqual(JSON.parse(cycle[8]), {length:'standard',imagery:'optional',checkinFrequency:'daily',...expectedPreferences})
  assert.equal(target[1], OWNER); assert.equal(target[2], id)
  assert.equal(crypto.openSealed(target[3], context(target[0], 'course.target_label'), config), input.problemLabel)
  assert.equal(crypto.openSealed(target[4], context(target[0], 'course.target_intention'), config), input.intention)
  assert.equal(h.queries.some(q => /^update |^delete /.test(q.sql)), false, 'existing cycle/history is never modified')
}
const preferences = id => ({ oporaModuleId: id, oporaModuleRouter: router.ANTISTRESS_ROUTER_VERSION, oporaPrimaryMetric: router.ANTISTRESS_MODULE_PRIMARY_METRICS[id] })

for (const id of router.ANTISTRESS_ACTIVE_MODULE_IDS.filter(id => id !== 'AS4')) {
  test(`real createNewCycle persists personal ${id} with the correct content version`, async () => {
    const h = harness()
    const cycleId = await h.create({ moduleId: id })
    assertCreated(h, cycleId, id === 'AS2' ? COURSE_ANTISTRESS_SKILLS_V7 : COURSE_CONTENT_V4, preferences(id))
  })
}

test('trauma-focused AS4 cannot be newly created as an unsupervised cycle', async () => {
  const h=harness()
  await assert.rejects(h.create({moduleId:'AS4'}),{code:'COURSE_PROFESSIONAL_SUPPORT_REQUIRED'})
  assert.equal(h.inserts.length,0)
})

test('real createNewCycle creates approved AS-5.5 AS2 for a new personal Anti-Stress cycle without changing existing history', async () => {
  const h = harness()
  assertCreated(h, await h.create(), COURSE_ANTISTRESS_SKILLS_V7, preferences('AS2'))
})

test('real createNewCycle uses the encrypted personal selection when no new module is supplied', async () => {
  const h = harness(courseRow({ storedModule: 'AS5' }))
  assertCreated(h, await h.create(), COURSE_CONTENT_V4, preferences('AS5'))
})

test('an explicit personal choice overrides the prior encrypted module without mutating prior storage', async () => {
  const course = courseRow({ storedModule: 'AS3' }), original = course.concerns_ciphertext
  const h = harness(course)
  assertCreated(h, await h.create({ moduleId: 'AS5' }), COURSE_CONTENT_V4, preferences('AS5'))
  assert.equal(course.concerns_ciphertext, original)
})

test('invalid direct ids fall back to a saved educational choice or AS2', async () => {
  for (const moduleId of ['AS7']) for (const storedModule of [undefined, 'AS3']) {
    const h = harness(courseRow({ storedModule }))
    assertCreated(h, await h.create({ moduleId }),
      storedModule ? COURSE_CONTENT_V4 : COURSE_ANTISTRESS_SKILLS_V7, preferences(storedModule || 'AS2'))
  }
})

for (const preset of presets.COURSE_PRESETS) {
  test(`real createNewCycle leaves fixed preset ${preset.id} on its existing V4 content with no module preferences`, async () => {
    const row = courseRow({ presetId: preset.id, storedModule: 'AS4' })
    // Real preset tags include the preset marker and do not match the exact
    // personal stress tag pack. The pre-module version also selected V4 here.
    assert.equal(programs.courseProgramFromTopics(row.focus_tags), null)
    const h = harness(row)
    assertCreated(h, await h.create({ moduleId: 'AS6' }), COURSE_CONTENT_V4, {})
  })
}

test('real createNewCycle keeps other legacy programs at V4 and ignores module-specific preferences', async () => {
  const h = harness(courseRow({ focus_tags: [...programs.getCourseProgram('confidence').focusTags], storedModule: 'AS4' }))
  assertCreated(h, await h.create({ moduleId: 'AS6' }), COURSE_CONTENT_V4, {})
})

test('real cycle guards reject existing cycles and exhausted cycle numbers before inserting', async () => {
  for (const [options, code] of [[{ existingCycle: true }, 'COURSE_ACTIVE_CYCLE_EXISTS'],
    [{ maxCycle: 100 }, 'COURSE_CYCLE_LIMIT'], [{ capacityUnavailable: true }, 'COURSE_ACCESS_UNAVAILABLE']]) {
    const h = harness(courseRow(), options)
    await assert.rejects(h.create({ moduleId: 'AS3' }), { code })
    assert.equal(h.inserts.length, 0)
  }
})

test('real cycle continuation increments its own course number and preserves routing', async () => {
  const h = harness(courseRow({ storedModule: 'AS3' }), { maxCycle: 2 })
  assertCreated(h, await h.create(), COURSE_CONTENT_V4, preferences('AS3'), 3)
})

test('current educational route AS6 remains usable as a selected course', async () => {
  const course = courseRow({ storedModule: 'AS6' }), ciphertext = course.concerns_ciphertext
  const h = harness(course)
  assertCreated(h, await h.create(), COURSE_CONTENT_V4, preferences('AS6'))
  assert.equal(course.concerns_ciphertext, ciphertext, 'stored choice must remain unchanged')
})

// Keep verification real: malformed historical rows never become trusted scores.
test('real history verification rejects missing, sparse and unknown provenance', () => {
  const { verifiedHistoryResult } = modules['../assessments/verified-history.js']
  for (const row of [null, {}, { dimensions: [] }, { dimensions: new Array(1) },
    { dimensions: [null] }, { dimensions: [{ key: 'synthetic.unknown', value: 1 }] }]) {
    assert.equal(verifiedHistoryResult(row), false)
  }
})

test('cycle loader rejects unknown imports and live transaction fallback', () => {
  assert.throws(() => runtime.require('./unknown-synthetic-import.js'), /No unmocked database or unknown import/)
  assert.throws(() => runtime.require('./database.js').transaction(), /Live transaction is forbidden/)
})
