import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
export const jsx = (type, props, key) => ({ type, props: props || {}, key })
const styles = { default: new Proxy({}, { get: (_, key) => String(key) }) }
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => Object.is(value, b[index]))
const scopes = new Set()
const timers = new Map()
let timerId = 0, virtualTime = 0
const setTimer = (callback, delay = 0, ...args) => {
  assert.equal(typeof callback, 'function')
  const id = ++timerId
  timers.set(id, { callback, args, due: virtualTime + Math.max(0, Number(delay) || 0) })
  return id
}
const clearTimer = id => timers.delete(id)
async function drainScheduledWork() {
  // Let resolved anonymous reads clear their deadline before advancing timers.
  await new Promise(resolve => setImmediate(resolve))
  for (let turn = 0; timers.size && turn < 100; turn++) {
    const [id, timer] = [...timers].sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0]
    timers.delete(id)
    virtualTime = timer.due
    timer.callback(...timer.args)
    await new Promise(resolve => setImmediate(resolve))
  }
  assert.equal(timers.size, 0, 'Discovery scheduled work must settle without recurring tasks')
}
const isolationAssertions = []
export const assertAfterIsolation = assertion => isolationAssertions.push(assertion)
export const networkRequests = []
function transport(url, options = {}) {
  const request = { url: String(url), method: String(options.method || 'GET').toUpperCase() }
  networkRequests.push(request)
  assert.deepEqual(request, { url: '/api/test-catalog/stats', method: 'GET' }, 'Discovery can only read optional anonymous counts; no query or writes')
  return Promise.resolve({ ok: true, json: async () => ({ stats: [] }) })
}
export function hooks() {
  let cursor = 0, dirty = false
  const values = [], effects = []
  const state = {
    reset() { cursor = 0; dirty = false },
    useState(initial) { const index = cursor++; if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial; return [values[index], next => { const value = typeof next === 'function' ? next(values[index]) : next; if (!Object.is(value, values[index])) { values[index] = value; dirty = true } }] },
    useMemo(fn, dependencies) { const index = cursor++; if (!values[index] || !same(values[index].dependencies, dependencies)) values[index] = { value: fn(), dependencies }; return values[index].value },
    useEffect(fn, dependencies) { const index = cursor++; if (!values[index] || !same(values[index].dependencies, dependencies)) { const previous = values[index]; values[index] = { dependencies, cleanup: previous?.cleanup }; effects.push(() => { previous?.cleanup?.(); values[index].cleanup = fn() }) } },
    useRef(initial) { const index = cursor++; return values[index] ??= { current: initial } },
    useId() { const index = cursor++; return values[index] ??= `synthetic-discovery-${index}` },
    commit() { for (const effect of effects.splice(0)) effect(); return dirty },
    dispose() { for (const value of values) value?.cleanup?.(); scopes.delete(state) },
  }
  scopes.add(state)
  return state
}
export function renderWithEffects(states, render) {
  for (let attempt = 0; attempt < 20; attempt++) {
    states.forEach(state => state.reset())
    const tree = render()
    const dirty = states.map(state => state.commit()).some(Boolean)
    if (!dirty) return tree
  }
  assert.fail('Synthetic discovery render did not settle')
}
export async function assertDiscoveryIsolation() {
  // Drain effects, real optional-read catch/finally and cleanup microtasks.
  // Keep Start spies live through both checkpoints: an automatic async Start
  // is no safer than a synchronous one, including during unmount cleanup.
  const checks = isolationAssertions.splice(0)
  try {
    await drainScheduledWork()
    for (const scope of [...scopes]) scope.dispose()
    await drainScheduledWork()
    assert.deepEqual(networkRequests.filter(request => request.method !== 'GET' || request.url !== '/api/test-catalog/stats'), [], 'No transport may write or send a personal query')
    for (const check of checks) check()
  } finally { networkRequests.length = 0; timers.clear(); virtualTime = 0 }
}

// Explicit real pure-module imports. A new alias import fails closed rather
// than silently acquiring any runtime service or an inert catch-all substitute.
export const modules = {}
for (const name of [
  '@/lib/assessments/personal-guidance', '@/lib/assessments/test-recommendations',
  '@/lib/assessments/test-kinds', '@/lib/assessments/psychometric-validity-2026',
  '@/data/assessments/mind-body-monitor-registry', '@/data/assessments/psychotherapy-core-100',
  '@/lib/assessments/test-explorer', '@/lib/assessments/test-problems',
  '@/lib/assessments/test-collections', '@/lib/assessments/psych-portrait',
  '@/lib/assessments/test-popularity', '@/lib/assessments/test-collection-membership',
  '@/lib/assessments/insights-categories', '@/lib/assessments/via-family',
  '@/lib/assessments/spanish-scale-guide', '@/data/assessments/priority-methods-2026',
  '@/lib/assessments/portrait-ray-labels', '@/lib/assessments/portrait-sectors',
  '@/lib/assessments/portrait-constructs',
]) modules[name] = await import(new URL('../../' + name.slice(2) + '.js', import.meta.url))
const sourceModules = {
  '@/lib/public-locales': 'lib/public-locales.ts',
  '../discovery-section-tabs': 'components/discovery-section-tabs.tsx',
  './research-directory': 'components/app/research-directory.jsx',
  './priority-methods-review': 'components/app/priority-methods-review.jsx',
  './test-scale-guide': 'components/app/test-scale-guide.jsx',
  '@/lib/assessments/test-catalog-stats-client': 'lib/assessments/test-catalog-stats-client.js',
}
const cssModules = new Set(['./test-explorer.module.css', './simple-test-picker.module.css', '../academy-discovery.module.css', './discovery-section-tabs.module.css', './research-directory.module.css', './priority-methods-review.module.css', './test-scale-guide.module.css'])
const iconNames = new Set('Activity ArrowLeft ArrowRight Brain ChevronRight ChevronDown Clock3 Compass Heart Languages Layers MessageCircle Moon Shield Sparkles Zap GraduationCap FileDown Check BookOpen ListChecks BriefcaseBusiness CirclePlus Search Leaf Play ShieldCheck SlidersHorizontal Smile Sun Target Users'.split(' '))
export function compile(source, react, bindings = modules, browser = {}) {
  const exported = {}
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: exported, window: { location: { search: '' }, ...browser.window }, console, URLSearchParams, AbortController,
    fetch: browser.fetch || transport,
    // Deterministic optional read lifecycle; no real timer/network is created.
    setTimeout: setTimer, clearTimeout: clearTimer,
    document: browser.document || { getElementById: () => ({ scrollIntoView() {} }) },
    require(name) {
      if (Object.hasOwn(bindings, name)) return bindings[name]
      if (name === 'react') return react
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (name === 'next/link' || name === 'next/image') return { default: name === 'next/link' ? 'a' : 'img' }
      if (cssModules.has(name)) return styles
      if (name === 'lucide-react') return new Proxy({}, { get: (_, icon) => { assert.ok(iconNames.has(icon), 'Unexpected icon: ' + String(icon)); return 'svg' } })
      if (Object.hasOwn(sourceModules, name)) return compile(read(sourceModules[name]), react, bindings, browser)
      // These two boundaries are rendered from the actual source separately in
      // this suite (full picker handlers and portrait ray controls respectively).
      if (name === './simple-test-picker') return { SimpleTestPicker: 'SimpleTestPicker' }
      if (name === './test-explorer-visual') return { TestExplorerVisual: 'TestExplorerVisual' }
      throw new Error('Unexpected dependency: ' + name)
    },
  })
  return exported
}
