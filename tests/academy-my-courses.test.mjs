import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('components/academy-my-courses.tsx')
const compile = (text, fileName) => {
  const compiled = ts.transpileModule(text, {
    fileName, reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
  })
  assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0)
  return compiled.outputText
}
const nodes = tree => tree == null || typeof tree !== 'object' ? []
  : Array.isArray(tree) ? tree.flatMap(nodes)
    : [tree, ...nodes(tree.props?.children)]
const words = tree => tree == null || typeof tree === 'boolean' ? ''
  : typeof tree !== 'object' ? String(tree)
    : Array.isArray(tree) ? tree.map(words).join(' ') : words(tree.props?.children)
const bootstrap = id => ({
  account: { id, onboardingState: 'active' },
  results: [], runs: [], requests: [], consents: [], services: [],
})
const growth = {
  courses: [
    { id: 'owned-growth-course', stage: 4, status: 'active', isPrimary: true,
      title: 'Stress & tension', completedLessons: 3, durationDays: 14, focusTags: ['stress'] },
  ],
}
const reiki = {
  enrolled: true, slideId: 'flight-04', status: 'completed',
  answers: { 'flight-04': 'Synthetic feedback' },
}
function harness(handler, locale = 'en') {
  let index = 0, pending = [], dirty = false, tree, props = { locale }
  const slots = [], calls = [], listeners = new Map(), channels = []
  const same = (a, b) => Array.isArray(a) && a.length === b?.length && a.every((v, i) => Object.is(v, b[i]))
  const hooks = {
    useState(initial) {
      const i = index++
      slots[i] ??= { value: initial }
      return [slots[i].value, value => {
        slots[i].value = typeof value === 'function' ? value(slots[i].value) : value
        dirty = true
      }]
    },
    useEffect(fn, deps) {
      const i = index++
      if (!same(slots[i]?.deps, deps)) pending.push(() => {
        slots[i]?.cleanup?.()
        slots[i] = { deps, cleanup: fn() }
      })
    },
  }
  class Channel {
    constructor(name) { assert.equal(name, 'hh-app-session'); channels.push(this) }
    close() { this.closed = true }
  }
  const fetch = async (path, body, method, options) => {
    calls.push({ path, body, method, options })
    return handler(path, body, method, options, calls.length)
  }
  const jsx = (type, props) => ({ type, props })
  const deps = {
    react: hooks,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': 'Link',
    'next/image': 'Image',
    'lucide-react': new Proxy({}, { get: (_, key) => String(key) }),
    '@/lib/app/client-fetch': { appFetch: fetch },
    '@/lib/inner-growth/course-presets': { getCoursePreset: () => null },
    '@/data/academy/energywork-ai-schema': {
      energyworkSequence: () => ['intro-1', 'flight-04', 'lesson2-1'],
      energyworkLessonRanges: () => [
        { start: 1, end: 2, lesson: 1, count: 1 },
        { start: 2, end: 3, lesson: 2, count: 1 },
      ],
    },
    './academy-my-courses.module.css': {
      default: new Proxy({}, { get: (_, key) => String(key) }),
    },
  }
  const document = {
    visibilityState: 'visible',
    addEventListener: (name, fn) => listeners.set('doc:' + name, fn),
    removeEventListener: name => listeners.delete('doc:' + name),
  }
  const window = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name),
  }
  const runtime = { exports: {}, require: name => {
    assert.ok(deps[name], 'Unmocked dependency ' + name)
    return deps[name]
  }, window, document, BroadcastChannel: Channel, AbortController, console }
  vm.runInNewContext(compile(source, 'academy-my-courses.tsx'), runtime)
  function render(next = props) {
    props = next; index = 0; pending = []; dirty = false
    tree = runtime.exports.AcademyMyCourses(props)
    pending.forEach(fn => fn())
    return tree
  }
  async function settle() {
    for (let i = 0; i < 55; i++) {
      await Promise.resolve()
      if (dirty) render()
    }
    return tree
  }
  render()
  return {
    calls, channels, render, settle,
    get tree() { return tree },
    event(name) { listeners.get(name)?.() },
    signedOut() {
      channels.filter(c => !c.closed).forEach(c => c.onmessage?.({ data: 'signed-out' }))
    },
    unmount() { slots.forEach(s => s?.cleanup?.()) },
  }
}

test('Academy discovery shows the authenticated My courses section before Choose your course and Free Courses', () => {
  const discovery = read('components/academy-discovery.tsx')
  const index = discovery.indexOf('<AcademyMyCourses locale={locale} />')
  assert.ok(index > 0)
  assert.ok(index < discovery.indexOf('className={styles.listHeading}'))
  assert.ok(index < discovery.indexOf('id="academy-free-courses"'))
  assert.match(discovery, /view === "programs"/)
})

test('signed-out visitors never receive course cards or private course reads', async () => {
  const h = harness(path => { assert.equal(path, 'bootstrap'); throw Error('NO_AUTH') })
  await h.settle()
  assert.equal(h.tree, null)
  assert.equal(h.calls.length, 1)
  h.unmount()
})

test('signed-in course owner sees their live growth and Reiki progress and one-click saved resume', async () => {
  const h = harness((path, _, method, options) => {
    assert.equal(method, 'GET')
    if (path === 'bootstrap') return bootstrap('owner-a')
    assert.equal(options.accountId, 'owner-a')
    return path === 'course' ? growth : path === 'academy-energywork' ? reiki : null
  })
  await h.settle()
  const items = nodes(h.tree)
  assert.ok(items.some(n => n.props?.['data-academy-owned-growth'] === 'owned-growth-course'))
  assert.ok(items.some(n => n.props?.['data-academy-owned-reiki'] !== undefined))
  assert.ok(words(h.tree).includes('My courses'))
  assert.ok(words(h.tree).includes('Stress & tension'))
  assert.ok(words(h.tree).includes('Reiki Practitioner'))
  assert.ok(items.some(n => n.props?.href === '/en/app/course?courseId=owned-growth-course'))
  assert.ok(items.some(n => n.props?.href === '/en/academy/principles-of-energywork/learn?slide=flight-04'))
  assert.ok(items.some(n => n.props?.href === '/en/academy/principles-of-energywork/learn?slide=flight-04'
    && words(n).includes('Flight to the Sun')))
  assert.ok(items.some(n => n.props?.role === 'progressbar' && n.props?.['aria-valuenow'] === 3))
  assert.deepEqual(h.calls.map(c => c.path), ['bootstrap', 'course', 'academy-energywork', 'bootstrap'])
  h.signedOut()
  h.render()
  assert.equal(h.tree, null, 'A sign-out event must clear the personal cards synchronously')
  h.unmount()
})

test('a signed-in learner with no saved courses sees a gentle empty state, not a fake enrollment', async () => {
  const h = harness(path => path === 'bootstrap' ? bootstrap('owner-a')
    : path === 'course' ? { courses: [] }
      : { enrolled: false }, 'ru')
  await h.settle()
  assert.match(words(h.tree), /Мои курсы/)
  assert.match(words(h.tree), /Вы пока не начали/)
  assert.ok(!nodes(h.tree).some(n => n.props?.['data-academy-owned-growth']))
  h.unmount()
})

test('a changed account between reads never sees the first owner private courses', async () => {
  let bootstrapReads = 0
  const h = harness(path => {
    if (path === 'bootstrap') return bootstrap(++bootstrapReads === 1 ? 'owner-a' : 'owner-b')
    return path === 'course' ? growth : reiki
  })
  await h.settle()
  assert.equal(h.tree, null)
  h.unmount()
})

test('a partial course backend outage still shows the independently authorized Reiki progress', async () => {
  const h = harness(path => {
    if (path === 'bootstrap') return bootstrap('owner-a')
    if (path === 'course') throw Error('TEMPORARY_OUTAGE')
    return reiki
  }, 'es')
  await h.settle()
  assert.ok(nodes(h.tree).some(n => n.props?.['data-academy-owned-reiki'] !== undefined))
  assert.match(words(h.tree), /Mis cursos/)
  assert.match(words(h.tree), /Parte del progreso no está disponible/)
  assert.ok(nodes(h.tree).some(n => n.props?.href === '/en/academy/principles-of-energywork/learn?slide=flight-04'))
  h.unmount()
})

test('responsive cards stay inside the screen, with 320px and 430px breakpoints', () => {
  const css = read('components/academy-my-courses.module.css')
  assert.match(css, /@media \(max-width: 430px\)/)
  assert.match(css, /@media \(max-width: 340px\)/)
  assert.match(css, /grid-template-columns: 96px minmax\(0, 1fr\)/)
  assert.match(css, /min-width: 0/)
  assert.match(css, /:focus-visible/)
  assert.match(css, /min-height: 44px/)
})
