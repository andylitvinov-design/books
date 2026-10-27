import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
export const jsx = (type, props, key) => ({ type, props: props || {}, key })
const styles = { default: new Proxy({}, { get: (_, key) => String(key) }) }
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => Object.is(value, b[index]))
const scopes = new Set()
const roots = new Set()
const scopeRoots = new Map()
const timers = new Map()
let timerId = 0, virtualTime = 0
const setTimer = (callback, delay = 0, ...args) => {
  assert.equal(typeof callback, 'function')
  const id = ++timerId
  timers.set(id, { callback, args, due: virtualTime + Math.max(0, Number(delay) || 0) })
  return id
}
const clearTimer = id => timers.delete(id)
function releaseRoot(state) {
  const root = scopeRoots.get(state)
  if (!root) return
  roots.delete(root)
  for (const member of root.states) scopeRoots.delete(member)
}
function renderRoot(root) {
  for (let attempt = 0; attempt < 20; attempt++) {
    root.states.forEach(state => state.reset())
    const tree = root.render()
    root.states.forEach(state => state.commit())
    // A later child effect may dirty an earlier parent scope. Sample only
    // after every scope has committed, never during the sequential commit.
    if (!root.states.some(state => state.pending())) return tree
  }
  assert.fail('Synthetic discovery render did not settle')
}
function flushDirtyRoots() {
  for (const state of scopes) {
    assert.ok(!state.pending() || scopeRoots.has(state), 'Dirty discovery hooks require a registered render root')
  }
  let flushed = false
  for (const root of [...roots]) {
    if (!roots.has(root) || !root.states.some(state => state.pending())) continue
    renderRoot(root)
    flushed = true
  }
  return flushed
}
async function drainScheduledWork() {
  for (let turn = 0; turn < 100; turn++) {
    // Settle request/json/finally microtasks before firing a future timer, then
    // render every dirty mounted root and commit its dependent effects.
    await new Promise(resolve => setImmediate(resolve))
    if (flushDirtyRoots()) continue
    if (!timers.size) return
    const [id, timer] = [...timers].sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0]
    timers.delete(id)
    virtualTime = timer.due
    timer.callback(...timer.args)
  }
  assert.fail('Discovery scheduled work did not settle within 100 turns')
}
const isolationAssertions = []
export const assertAfterIsolation = assertion => isolationAssertions.push(assertion)
export const networkRequests = []
function transport(url, options = {}) {
  const request = {
    url: String(url), method: String(options.method || 'GET').toUpperCase(),
    optionKeys: Object.keys(options).filter(key => key !== 'signal').sort(),
    credentials: options.credentials, hasBody: options.body != null,
  }
  networkRequests.push(request)
  assert.deepEqual(request, {
    url: '/api/test-catalog/stats', method: 'GET', optionKeys: ['credentials'],
    credentials: 'same-origin', hasBody: false,
  }, 'Discovery can only read optional anonymous counts; no query, body, headers or writes')
  return Promise.resolve({ ok: true, json: async () => ({ stats: [] }) })
}
export function hooks() {
  let cursor = 0, dirty = false, mounted = true
  const values = [], effects = [], effectIndices = new Set()
  const state = {
    reset() { assert.ok(mounted, 'Cannot render unmounted discovery hooks'); cursor = 0; dirty = false },
    pending() { return mounted && (dirty || effects.length > 0) },
    useState(initial) { const index = cursor++; if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial; return [values[index], next => { if (!mounted) return; const value = typeof next === 'function' ? next(values[index]) : next; if (!Object.is(value, values[index])) { values[index] = value; dirty = true } }] },
    useMemo(fn, dependencies) { const index = cursor++; if (!values[index] || !same(values[index].dependencies, dependencies)) values[index] = { value: fn(), dependencies }; return values[index].value },
    useEffect(fn, dependencies) { const index = cursor++; effectIndices.add(index); if (!values[index] || !same(values[index].dependencies, dependencies)) { const previous = values[index]; values[index] = { dependencies, cleanup: previous?.cleanup }; effects.push(() => { const cleanup = previous?.cleanup; if (previous) previous.cleanup = undefined; values[index].cleanup = undefined; cleanup?.(); values[index].cleanup = fn() }) } },
    useRef(initial) { const index = cursor++; return values[index] ??= { current: initial } },
    useId() { const index = cursor++; return values[index] ??= `synthetic-discovery-${index}` },
    commit() { for (const effect of effects.splice(0)) effect(); return dirty },
    dispose() {
      if (!mounted) return
      // A cleanup can schedule work, but React must not render an unmounted root.
      mounted = false; dirty = false; effects.length = 0
      releaseRoot(state); scopes.delete(state)
      const errors = []
      for (const index of effectIndices) {
        const cleanup = values[index]?.cleanup
        if (values[index]) values[index].cleanup = undefined
        try { cleanup?.() } catch (error) { errors.push(error) }
      }
      if (errors.length) throw errors[0]
    },
  }
  scopes.add(state)
  return state
}
export function renderWithEffects(states, render) {
  assert.ok(states.length > 0 && new Set(states).size === states.length, 'Render roots need distinct hook scopes')
  const existing = states.map(state => scopeRoots.get(state)).filter(Boolean)
  let root = existing[0]
  if (root) {
    assert.ok(existing.every(candidate => candidate === root) && states.length === root.states.length && states.every((state, index) => state === root.states[index]), 'Hook groups must retain one render-root identity')
    root.render = render
  } else {
    root = { states: [...states], render }
    roots.add(root)
    for (const state of states) scopeRoots.set(state, root)
  }
  return renderRoot(root)
}
export async function assertDiscoveryIsolation() {
  // Flush mounted async state/effect chains, unmount every scope even on failure,
  // then drain cleanup work without resurrecting roots. Preserve the first error.
  const checks = isolationAssertions.splice(0)
  const errors = []
  const capture = async operation => { try { await operation() } catch (error) { errors.push(error) } }
  try {
    await capture(drainScheduledWork)
    for (const scope of [...scopes]) await capture(() => scope.dispose())
    await capture(drainScheduledWork)
    await capture(() => assert.deepEqual(networkRequests.filter(request => request.method !== 'GET' || request.url !== '/api/test-catalog/stats' || request.credentials !== 'same-origin' || request.hasBody || JSON.stringify(request.optionKeys) !== '["credentials"]'), [], 'No transport may write or send a personal query'))
    for (const check of checks) await capture(check)
  } finally {
    scopes.clear(); roots.clear(); scopeRoots.clear()
    networkRequests.length = 0; timers.clear(); virtualTime = 0
  }
  if (errors.length) throw errors[0]
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
