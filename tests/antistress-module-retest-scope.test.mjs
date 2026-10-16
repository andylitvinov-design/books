import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'

// Real repository, encryption, and ownership guards; synthetic SQL only.
const root = process.env.GROWTH_COURSE_ROOT ? resolve(process.env.GROWTH_COURSE_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), '..')
const app = resolve(root, 'lib/app'), file = resolve(app, 'growth-daily.js')
const source = readFileSync(file, 'utf8')
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const dependencies = Object.fromEntries(await Promise.all([...source.matchAll(/^import\s+.*?\s+from\s+['"]([^'"]+)['"]/gm)]
  .map(m => m[1]).filter(n => n !== './database.js').map(async n => [n,
    await import(n.startsWith('node:') ? n : pathToFileURL(resolve(app, n)).href)])))
dependencies['server-only'] = {}
dependencies['./database.js'] = { transaction() { assert.fail('Live database forbidden') } }
const runtime = { exports: {}, Date, Buffer, require(name) {
  assert.ok(Object.hasOwn(dependencies, name), name); return dependencies[name]
} }
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText, runtime, { filename: file })
const router = dependencies['../inner-growth/antistress-module-router.js']
const crypto = dependencies['./crypto.js']
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const OWNER = id(801), COURSE = id(802), CYCLE = id(803), OTHER = id(804)
const answers = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`F${i + 1}`, 5]))
function harness({ version = router.ANTISTRESS_ROUTER_VERSION, moduleId = 'AS1', completed = true, age = 15, exit = false } = {}) {
  const config = { multiCourseEnabled: true, billingEnvironment: 'sandbox',
    encryptionKey: Buffer.alloc(32, 29), encryptionKeyId: 'synthetic-retest-only' }
  const context = field => ({ accountId: OWNER, recordId: CYCLE, field })
  const measuredAt = new Date(Date.now() - age * 86400000).toISOString()
  const baseline = { definitionKey: 'hh-module-finder', version: 'v1', recallDays: 7, locale: 'en', answers, measuredAt }
  const course = { id: COURSE, account_id: OWNER, stage: 4, status: 'active', goals: ['calm_regulation'],
    focus_tags: [...dependencies['../inner-growth/course-programs.js'].getCourseProgram('stress').focusTags],
    test_keys: [], scale_keys: [] }
  const cycle = { id: CYCLE, account_id: OWNER, course_id: COURSE, cycle_number: 1,
    primary_domain: 'calm_regulation', content_version: dependencies['../inner-growth/lesson-library.js'].COURSE_CONTENT_V4,
    status: completed ? 'completed' : 'active', revision: 2, start_local_date: measuredAt.slice(0, 10),
    created_at: measuredAt, time_zone: 'UTC', duration_days: 14,
    preferences: { oporaModuleId: moduleId, oporaModuleRouter: version,
      oporaModuleBaselineCiphertext: crypto.seal(JSON.stringify(baseline), context('course.opora.baseline'), config),
      ...(exit ? { oporaModuleExitCiphertext: crypto.seal(JSON.stringify(baseline), context('course.opora.exit'), config) } : {}) } }
  const sessions = [{ id: id(805), day_number: 14, local_date: new Date().toISOString().slice(0, 10), completed_at: new Date().toISOString(), signals: {} }]
  const writes = [], queries = []
  const db = { async query(sql, args = []) {
    args = structuredClone(args)
    const q = sql.replace(/\s+/g, ' ').trim(); queries.push(q)
    if (/^select status,onboarding_state/.test(q)) { assert.deepEqual(args, [OWNER]); return { rows: [{ status: 'active', onboarding_state: 'active', timezone: 'UTC' }] } }
    if (q === 'select * from app_private.course_access($1)') { assert.deepEqual(args, ['sandbox']); return { rows: [{ tier: 'advanced', active_course_limit: 5, active_course_count: 2 }] } }
    if (q.startsWith('select * from app_private.growth_courses')) {
      assert.match(q, /where account_id=\$1 and id=\$2/, 'Every response must retain the explicitly selected non-primary course')
      assert.equal(args[0], OWNER); return { rows: args[1] === COURSE ? [structuredClone(course)] : [] }
    }
    if (q.startsWith('select * from app_private.growth_cycles')) {
      assert.match(q, /where account_id=\$1 and course_id=\$2/); assert.deepEqual(args, [OWNER, COURSE]); return { rows: [structuredClone(cycle)] }
    }
    if (q.startsWith('update app_private.growth_cycles')) {
      assert.match(q, /where account_id=\$1 and id=\$2$/); assert.deepEqual(args.slice(0, 2), [OWNER, CYCLE])
      writes.push(q); cycle.preferences = JSON.parse(args[2]); cycle.revision++; return { rows: [] }
    }
    if (q.includes('from app.assessment_results')) { assert.match(q, /where account_id=\$1/); assert.deepEqual(args, [OWNER]); return { rows: [] } }
    if (/^select .* from app_private.growth_(targets|checkins|sessions|reviews) /.test(q)) {
      assert.match(q, /where account_id=\$1 and cycle_id=\$2/); assert.deepEqual(args, [OWNER, CYCLE])
      return { rows: q.includes('growth_sessions') ? structuredClone(sessions) : q.includes('growth_targets') ? [{ id: id(806) }] : [] }
    }
    assert.fail('Unexpected SQL without live fallback: ' + q)
  } }
  const repo = runtime.exports.createDailyCourseRepository(config, { runTransaction(cfg, actor, fn) {
    assert.equal(cfg, config); assert.equal(actor.id, OWNER); return fn(db)
  } })
  return { writes, queries, cycle, command: (extra = {}) => repo.command({ id: OWNER }, 'module-retest',
    { courseId: COURSE, cycleId: CYCLE, moduleAnswers: answers, ...extra }, 'en') }
}
test('module retest writes only the selected owner cycle and returns that non-primary course', async () => {
  const h = harness(), result = await h.command()
  assert.equal(result.courseId, COURSE); assert.equal(result.cycle.id, CYCLE); assert.equal(h.writes.length, 1)
  assert.ok(result.moduleMeasurements.followUp); assert.equal(result.moduleMeasurements.retestAvailable, false)
  assert.ok(!Object.keys(result.cycle.preferences).some(key => key.endsWith('Ciphertext')))
  const saved = h.cycle.preferences.oporaModuleExitCiphertext
  const repeated = await h.command(); assert.equal(repeated.courseId, COURSE)
  assert.equal(h.writes.length, 1); assert.equal(h.cycle.preferences.oporaModuleExitCiphertext, saved)
})
test('already recorded retest returns selected course without overwriting it', async () => {
  const h = harness({ exit: true }), result = await h.command()
  assert.equal(result.courseId, COURSE); assert.equal(h.writes.length, 0)
})
test('foreign course and stale cycle cannot read measurements or mutate a retest', async () => {
  for (const [input, code] of [[{ courseId: OTHER }, 'COURSE_NOT_FOUND'], [{ cycleId: OTHER }, 'COURSE_CYCLE_CHANGED']]) {
    const h = harness(); await assert.rejects(h.command(input), { code })
    assert.equal(h.writes.length, 0); assert.ok(!h.queries.some(q => q.includes('assessment_results')))
  }
})
test('legacy versions, clinical AS4, unfinished cycles and early retests stay blocked', async () => {
  for (const [options, code] of [[{ version: router.ANTISTRESS_PREVIOUS_ROUTER_VERSION }, 'COURSE_MODULE_RETEST_NOT_AVAILABLE'],
    [{ moduleId: 'AS4' }, 'COURSE_MODULE_RETEST_NOT_AVAILABLE'], [{ completed: false }, 'COURSE_MODULE_RETEST_NOT_AVAILABLE'],
    [{ age: 2 }, 'COURSE_MODULE_RETEST_NOT_DUE']]) {
    const h = harness(options); await assert.rejects(h.command(), { code }); assert.equal(h.writes.length, 0)
  }
})

test('F-primary exit requires that answer or an explicit skip, never another item',async()=>{
  for(const [moduleId,primary] of [['AS1','F2'],['AS3','F4'],['AS5','F7']]){
    const h=harness({moduleId})
    const missing={...answers,[primary]:null}
    await assert.rejects(()=>h.command({moduleAnswers:missing}),/COURSE_MODULE_PRIMARY_OR_SKIP_REQUIRED/)
    assert.equal(h.writes.length,0)
    const saved=await h.command({moduleAnswers:missing,primarySkipped:true})
    assert.equal(saved.moduleMeasurements.followUp.primarySkipped,true)
    assert.equal(saved.moduleMeasurements.followUp.answers[primary],null)
    assert.equal(saved.moduleMeasurements.primaryComparison.comparable,false)
    assert.equal(saved.moduleMeasurements.primaryComparison.reason,'explicit_skip')
    assert.equal(h.writes.length,1)
  }
})
test('all F questions may be explicitly skipped without an imputed primary',async()=>{
  const h=harness()
  const saved=await h.command({moduleAnswers:Object.fromEntries(Object.keys(answers).map(key=>[key,null])),primarySkipped:true})
  assert.ok(Object.values(saved.moduleMeasurements.followUp.answers).every(value=>value===null))
  assert.equal(saved.moduleMeasurements.primaryComparison.comparable,false)
})
test('a real zero primary score is an answer, with compatible immutable baseline',async()=>{
  const h=harness()
  const saved=await h.command({moduleAnswers:{...answers,F2:0}})
  assert.equal(saved.moduleMeasurements.primaryComparison.comparable,true)
  assert.equal(saved.moduleMeasurements.primaryComparison.after,0)
  assert.equal(saved.moduleMeasurements.primaryComparison.before,5)
})
test('explicit primary skip clears a stale numeric draft rather than saving a comparison',async()=>{
  const h=harness()
  const saved=await h.command({moduleAnswers:{...answers,F2:7},primarySkipped:true})
  assert.equal(saved.moduleMeasurements.followUp.answers.F2,null)
  assert.equal(saved.moduleMeasurements.followUp.primarySkipped,true)
  assert.equal(saved.moduleMeasurements.primaryComparison.reason,'explicit_skip')
})
