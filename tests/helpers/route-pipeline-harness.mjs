import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'

// All production code is loaded unchanged from the selected checkout. The only
// server replacement is a strict in-memory SQL transport; there is no live DB.
export const root = process.env.GROWTH_COURSE_ROOT ? resolve(process.env.GROWTH_COURSE_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const appRoot = resolve(root, 'lib/app')
export const loadModule = name => import(pathToFileURL(resolve(root, name)).href)
export const programs = await loadModule('lib/inner-growth/course-programs.js')
export const presets = await loadModule('lib/inner-growth/course-presets.js')
export const router = await loadModule('lib/inner-growth/antistress-module-router.js')
export const lessons = await loadModule('lib/inner-growth/lesson-library.js')
export const methods = await loadModule('lib/inner-growth/anti-stress-method-activities.js')
export const labs = await loadModule('lib/inner-growth/anti-stress-practice-lab.js')
export const moduleActivities = await loadModule('lib/inner-growth/opora-module-exercise.js')
export const outcomes = await loadModule('lib/inner-growth/course-single-lesson-outcome.js')
export const slideSequence = await loadModule('lib/inner-growth/course-slide-sequence.js')
export const dayOne = await loadModule('lib/inner-growth/anti-stress-day-one.js')
const source = readFileSync(resolve(appRoot, 'growth-daily.js'), 'utf8')
const imports = [...source.matchAll(/^import\s+.*?\s+from\s+['"]([^'"]+)['"]/gm)].map(m => m[1])
const dependencies = Object.fromEntries(await Promise.all(imports.filter(n => n !== './database.js').map(async n =>
  [n, await import(n.startsWith('node:') ? n : pathToFileURL(resolve(appRoot, n)).href)])))
dependencies['server-only'] = {}
dependencies['./database.js'] = { transaction() { assert.fail('Live database forbidden') } }
const compiledDaily = ts.transpileModule(source, { fileName: 'growth-daily.js', compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText
export const OWNER = '00000000-0000-4000-8000-000000000701'
export const COURSE = '00000000-0000-4000-8000-000000000702'
export const clone = value => structuredClone(value)
const date = value => new Date(value).toISOString().slice(0, 10)
const DAY = 86400000

export function repositoryHarness({ presetId, storedCycle, freshPhase = false } = {}) {
  const now = Date.now(), clock = { now: now - 13 * DAY }
  class FixtureDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.now])) }
    static now() { return clock.now }
  }
  const config = { multiCourseEnabled: true, billingEnvironment: 'sandbox',
    encryptionKey: Buffer.alloc(32, 23), encryptionKeyId: 'synthetic-pipeline-only' }
  const course = { id: COURSE, account_id: OWNER, stage: 4, status: 'active', revision: 1,
    goals: [presetId ? presets.getCoursePreset(presetId).primaryGoal : 'calm_regulation'], scale_keys: [],
    test_keys: presetId ? presets.getCoursePreset(presetId).testKeys : ['hh-weekly-pulse'],
    focus_tags: presetId ? presets.coursePresetTags(presetId) : [...programs.getCourseProgram('stress').focusTags] }
  let cycle = storedCycle ? clone(storedCycle) : null, target = null, sessions = []
  const queries = [], writes = []
  const db = { async query(sql, values = []) {
    const q = sql.replace(/\s+/g, ' ').trim(), args = clone(values)
    queries.push({ sql: q, args })
    const owned = () => assert.deepEqual(args.slice(0, 2), [OWNER, cycle.id])
    if (/^select status,onboarding_state(?:,timezone)? from app.accounts where id=\$1(?: for update)?$/.test(q)) {
      assert.deepEqual(args, [OWNER]); return { rows: [{ status: 'active', onboarding_state: 'active', timezone: 'UTC' }] }
    }
    if (q === 'select * from app_private.course_access($1)') {
      assert.deepEqual(args, ['sandbox']); return { rows: [{ tier: 'advanced', active_course_limit: 5, active_course_count: 1 }] }
    }
    if (q.startsWith('select * from app_private.growth_courses')) {
      assert.match(q, /where account_id=\$1 and id=\$2/); assert.deepEqual(args, [OWNER, COURSE])
      return { rows: [clone(course)] }
    }
    if (q === 'select status from app_private.growth_cycles where account_id=$1 and course_id=$2') {
      assert.deepEqual(args, [OWNER, COURSE]); return { rows: cycle ? [{ status: cycle.status }] : [] }
    }
    if (q.startsWith('select id from app_private.growth_cycles')) {
      assert.match(q, /where account_id=\$1 and course_id=\$2/); assert.deepEqual(args, [OWNER, COURSE])
      return { rows: cycle ? [{ id: cycle.id }] : [] }
    }
    if (q.startsWith('select coalesce(max(cycle_number),0)::integer as max')) {
      assert.deepEqual(args, [OWNER, COURSE]); return { rows: [{ max: 0 }] }
    }
    if (q.startsWith('insert into app_private.growth_cycles')) {
      assert.equal(args.length, 9); assert.deepEqual(args.slice(1, 3), [OWNER, COURSE])
      writes.push({ sql: q, args });
      cycle = { id: args[0], account_id: args[1], course_id: args[2], cycle_number: args[3], primary_domain: args[4],
        content_version: args[5], start_local_date: args[6], time_zone: args[7], duration_days: 14,
        preferences: JSON.parse(args[8]), status: 'active', revision: 1, created_at: new Date(clock.now).toISOString() }
      return { rows: [] }
    }
    if (q.startsWith('insert into app_private.growth_targets')) {
      assert.equal(args.length, 5); assert.deepEqual(args.slice(1, 3), [OWNER, cycle.id]); writes.push({ sql: q, args })
      target = { id: args[0], account_id: args[1], cycle_id: args[2], problem_label_ciphertext: args[3], intention_ciphertext: args[4] }
      return { rows: [] }
    }
    if (q.startsWith('select * from app_private.growth_cycles')) {
      assert.match(q, /where account_id=\$1 and course_id=\$2/); assert.deepEqual(args, [OWNER, COURSE])
      return { rows: cycle ? [clone(cycle)] : [] }
    }
    if (q === 'select * from app_private.growth_targets where account_id=$1 and cycle_id=$2') {
      owned(); return { rows: [clone(target)] }
    }
    if (q === 'select * from app_private.growth_sessions where account_id=$1 and cycle_id=$2 order by day_number,id') {
      owned(); return { rows: clone(sessions) }
    }
    if (q === 'select id from app_private.growth_sessions where account_id=$1 and cycle_id=$2 and operation_id=$3') {
      owned(); return { rows: sessions.filter(s => s.operation_id === args[2]).map(s => ({ id: s.id })) }
    }
    if (/^select .* from app_private.growth_(checkins|reviews) where account_id=\$1 and cycle_id=\$2/.test(q)) {
      owned(); return { rows: [] }
    }
    if (q.startsWith('select ') && q.includes('from app.assessment_results')) {
      assert.match(q, /where account_id=\$1/); assert.equal(args[0], OWNER); return { rows: [] }
    }
    if (q.startsWith('insert into app_private.growth_sessions')) {
      assert.equal(args.length, 14); assert.deepEqual(args.slice(1, 3), [OWNER, cycle.id]); writes.push({ sql: q, args })
      assert.equal(sessions.some(s => s.day_number === args[3]), false)
      sessions.push({ id: args[0], account_id: args[1], cycle_id: args[2], day_number: args[3], local_date: args[4],
        lesson_id: args[5], content_version: args[6], before_now: args[7], after_now: args[8], feedback: args[9],
        reflection_ciphertext: args[10], operation_id: args[11], signals: JSON.parse(args[12]),
        practice_plan_ciphertext: args[13], completed_at: new Date(now).toISOString() })
      return { rows: [] }
    }
    if (q.startsWith("update app_private.growth_cycles set status='completed'")) {
      assert.deepEqual(args, [cycle.id]); assert.ok(sessions.some(s => s.day_number === 14))
      writes.push({ sql: q, args }); cycle.status = 'completed'; cycle.revision++; return { rows: [] }
    }
    if (q.startsWith("update app_private.growth_courses set status='completed'")) {
      assert.deepEqual(args, [OWNER, COURSE]); writes.push({ sql: q, args }); course.status = 'completed'; return { rows: [] }
    }
    assert.fail('Unexpected SQL; no live fallback: ' + q)
  } }
  const runtime = { exports: {}, Date: FixtureDate, Buffer, require(name) {
    assert.ok(Object.hasOwn(dependencies, name), 'Unmocked dependency: ' + name); return dependencies[name]
  } }
  vm.runInNewContext(compiledDaily, runtime, { filename: resolve(appRoot, 'growth-daily.js') })
  const repo = runtime.exports.createDailyCourseRepository(config, { runTransaction(cfg, actor, fn) {
    assert.equal(cfg, config); assert.equal(actor.id, OWNER); return fn(db)
  } })
  return { course, queries, writes, get cycle() { return cycle }, get sessions() { return sessions },
    async create(moduleId) {
      // This legacy regression harness deliberately models a persisted NAV-2.0
      // cycle. New NAV-3 enrollments (including clinician-only AS4 gating) are
      // tested separately; historical cycles must never be silently rewritten.
      const id = await runtime.exports.createNewCycle(db, { id: OWNER }, course, config,
        { problemLabel: 'Synthetic ordinary workload', intention: 'Synthetic manageable step', timeZone: 'UTC',
          moduleId: !freshPhase&&moduleId==='AS4'?'AS2':moduleId })
      if (!presetId && !freshPhase) {
        cycle.preferences = {length:'standard',imagery:'optional',checkinFrequency:'daily',
          oporaModuleId:moduleId,oporaModuleRouter:router.ANTISTRESS_PREVIOUS_ROUTER_VERSION}
        cycle.content_version = moduleId==='AS2'
          ? lessons.COURSE_ANTISTRESS_OUTCOME_V3 : lessons.COURSE_CONTENT_V4
      }
      clock.now = now; assert.equal(id, cycle.id); return clone(cycle)
    },
    seedDay(day) {
      sessions = Array.from({ length: day - 1 }, (_, i) => ({
        id: '00000000-0000-4000-8000-' + String(800 + i).padStart(12, '0'), account_id: OWNER, cycle_id: cycle.id,
        day_number: i + 1, local_date: date(now - (day - i - 1) * DAY), completed_at: new Date(now - (day - i - 1) * DAY).toISOString(),
        feedback: 'skip', before_now: null, after_now: null, reflection_ciphertext: null, practice_plan_ciphertext: null, signals: {},
      }))
    },
    read: locale => repo.read({ id: OWNER }, locale, COURSE),
    command: (input, locale = 'en') => repo.command({ id: OWNER }, 'session', { courseId: COURSE, cycleId: cycle.id, ...input }, locale),
  }
}

export const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes)
  : [tree, ...nodes(tree.props?.children)]
export const textOf = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree)
  : Array.isArray(tree) ? tree.map(textOf).join(' ') : textOf(tree.props?.children)
export const findPart = (tree, name) => nodes(tree).find(n => n.type?.testName === name)
export const findButton = (tree, label) => nodes(tree).find(n => n.type === 'button' && textOf(n).trim() === label)
const uiNames = ['course-slide-player', 'opora-v6-slide-player', 'opora-experience-player', 'opora-module-activity', 'opora-state-journey', 'anti-stress-method-activity', 'anti-stress-practice-lab', 'course-lesson-result', 'anti-stress-day-one']
const compiledUI = Object.fromEntries(uiNames.map(name => [name, ts.transpileModule(readFileSync(resolve(root, 'components/app', name + '.jsx'), 'utf8'), {
  fileName: name + '.jsx', compilerOptions: { allowJs: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText]))
const pureUI = Object.fromEntries(await Promise.all(['anti-stress-skills-v5', 'anti-stress-day-one', 'course-moment-trends', 'course-adaptation',
  'course-welcome', 'anti-stress-method-activities', 'anti-stress-practice-lab', 'opora-module-exercise', 'course-single-lesson-outcome',
  'course-slide-sequence', 'course-membership', 'opora-as56-experience-guides', 'opora-lesson-outro', 'anti-stress-skills-v5', 'anti-stress-skills-v6', 'opora-state-journey','trauma-phase-catalog'].map(async name =>
  ['@/lib/inner-growth/' + name, await loadModule('lib/inner-growth/' + name + '.js')])) )

// Executes real JSX component functions with isolated state/effect slots.
// The Player's local route adapters AND the canonical OporaModuleActivity are
// recursively executed, not replaced by a presentation stub. Leaf controls
// remain separately mounted with the exact props emitted by that real chain,
// so their genuine buttons and callbacks, not fabricated choices, are exercised.
export function mount(name, props, { exportName = 'default' } = {}) {
  let active, pending = [], dirty = false, tree, serial = 900
  const contexts = new Map(), compiledModules = new Map()
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]))
  const hooks = {
    useState(initial) { const { slots } = active, i = active.cursor++; slots[i] ||= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; dirty = true }] },
    useRef(initial) { return active.slots[active.cursor++] ||= { current: initial } },
    useMemo(fn, deps) { const { slots } = active, i = active.cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value },
    useEffect(fn, deps) { const { slots, effects } = active, i = active.cursor++; if (!same(slots[i]?.deps, deps)) pending.push(() => {
      slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; if (!effects.includes(i)) effects.push(i)
    }) },
  }
  const stub = testName => Object.assign(() => null, { testName })
  const child = testName => ({ __esModule: true, default: stub(testName) })
  const jsx = (type, props, key) => ({ type, props, key })
  const modules = { ...pureUI, react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'lucide-react': new Proxy({}, { get: (_, name) => stub(String(name)) }),
    './opora-v6-slide-player': child('OporaV6SlidePlayer'), './opora-ocean-outro': child('OporaOceanOutro'), './course-guided-timer': child('CourseGuidedTimer'), './course-practice-voice': child('CoursePracticeVoice'),
    './anti-stress-method-activity': child('AntiStressMethodActivity'), './anti-stress-practice-lab': child('AntiStressPracticeLab'),
    './course-lesson-result': child('CourseLessonResult'), './anti-stress-day-one': {
      __esModule: true, default: stub('DayOneExercise'), DayOneChoices: stub('DayOneChoices'), DayOneFocusPicker: stub('DayOneFocusPicker'),
    },
  }
  const requireUI = key => {
    if (key.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) }
    // This import must resolve to the actual canonical implementation. A new
    // presentation layer cannot silently bypass all underlying activity tests.
    if (key === './opora-module-activity') return evaluate('opora-module-activity')
    if (key === './opora-state-journey') return evaluate('opora-state-journey')
    if (key === './opora-v6-slide-player') return evaluate('opora-v6-slide-player')
    assert.ok(Object.hasOwn(modules, key), 'Unmocked UI dependency: ' + key); return modules[key]
  }
  const evaluate = uiName => {
    if (compiledModules.has(uiName)) return compiledModules.get(uiName)
    assert.ok(Object.hasOwn(compiledUI, uiName), 'Uncompiled actual UI component: ' + uiName)
    const runtime = { exports: {}, require: requireUI, console,
      crypto: { randomUUID: () => '00000000-0000-4000-8000-' + String(++serial).padStart(12, '0') },
      document: { body: { style: { overflow: '' } }, addEventListener() {}, removeEventListener() {} } }
    vm.runInNewContext(compiledUI[uiName], runtime, { filename: resolve(root, 'components/app', uiName + '.jsx') })
    if (uiName === 'opora-module-activity') runtime.exports.default.testName = 'OporaModuleActivity'
    if (uiName === 'opora-state-journey') runtime.exports.default.testName = 'OporaStateJourney'
    compiledModules.set(uiName, runtime.exports)
    return runtime.exports
  }
  const component = evaluate(name)[exportName]
  assert.equal(typeof component, 'function', 'Expected component export ' + exportName)
  const cleanup = context => context.effects.forEach(i => context.slots[i]?.cleanup?.())
  const execute = (fn, nextProps, path) => {
    let context = contexts.get(path)
    if (context && context.component !== fn) { cleanup(context); contexts.delete(path); context = null }
    if (!context) { context = { component: fn, slots: [], effects: [] }; contexts.set(path, context) }
    context.used = true; context.cursor = 0
    const previous = active; active = context
    try { return fn(nextProps) } finally { active = previous }
  }
  const recursiveComponents = new Set(['RouteMethodActivity', 'RoutePracticeLab', 'OporaModuleActivity','OporaStateJourney','ChoiceRow','OpeningRating'])
  const expand = (value, path) => {
    if (Array.isArray(value)) return value.map((child, index) => expand(child, path + '/' + (child?.key ?? index)))
    if (!value || typeof value !== 'object') return value
    const recursive = typeof value.type === 'function' && recursiveComponents.has(value.type.testName || value.type.name)
    const children = recursive ? execute(value.type, value.props, path) : value.props?.children
    return { ...value, props: { ...value.props, children: expand(children, path + '/children') } }
  }
  const render = (nextProps = props) => {
    props = nextProps
    pending = []; dirty = false
    for (const context of contexts.values()) context.used = false
    tree = expand(execute(component, props, 'root'), 'root/output')
    for (const [path, context] of contexts) if (!context.used) { cleanup(context); contexts.delete(path) }
    for (const node of nodes(tree)) if (node.props?.ref && typeof node.type === 'string') node.props.ref.current ||= {
      focus() {}, querySelector() { return { focus() {}, scrollTo() {} } }, querySelectorAll() { return [] },
    }
    pending.forEach(fn => fn()); return tree
  }
  render()
  return { get tree() { return tree }, render,
    async settle() { for (let i = 0; i < 24; i++) { await Promise.resolve(); if (dirty) render() } },
    unmount() { for (const context of contexts.values()) cleanup(context) },
  }
}
