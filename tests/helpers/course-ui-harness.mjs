import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as billingPlan from '../../lib/billing/public-plan.js'
import * as coursePlans from '../../lib/inner-growth/course-plans.js'
import * as presets from '../../lib/inner-growth/course-presets.js'

const sources = Object.fromEntries(['live-activity-control', 'notification-settings', 'my-course', 'course-today', 'course-r3-steps', 'account-test-battery', 'my-courses-dashboard', 'course-preset-catalog'].map(name => [name,
  readFileSync(new URL('../../components/app/' + name + '.jsx', import.meta.url), 'utf8')]))
export const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]
export const textOf = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree) : Array.isArray(tree) ? tree.map(textOf).join(' ') : textOf(tree.props?.children)
export const findButton = (tree, label) => nodes(tree).find(node => node.type === 'button' && textOf(node).includes(label))
export const findPart = (tree, name) => nodes(tree).find(node => node.type?.testName === name)
export const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
export const account = id => ({ account: { id }, results: [], runs: [] })
export const course = (id, stage = 1, status = 'active') => ({ id, stage, status, revision: 1, testKeys: [], updatedAt: '2026-10-13T12:00:00Z' })
export const courseA = course('course-a'), courseB = course('course-b')
export const access = { tier: 'advanced', activeCourseLimit: 5, activeCourseCount: 2, overLimit: false, multiCourseEnabled: true }
export const courseView = (selected = courseA, extra = {}) => ({ course: selected, courses: [courseA, courseB], assessments: {}, access, ...extra })
export const dailyView = (courseId = 'course-a', cycleId = 'cycle-a', extra = {}) => ({
  courseId, access, available: true,
  cycle: { id: cycleId, day: 1, status: 'active', revision: 1, durationDays: 14, preferences: {} },
  target: { label: 'Synthetic course problem' }, progress: { days: [] }, lesson: null, ...extra,
})

export function mount(name, { props, search = '', fetcher, extraModules = {}, globals = {} } = {}) {
  const slots = [], effects = [], calls = [], navigations = [], notified = [], listeners = new Map()
  let index = 0, pending = [], dirty = false, tree, serial = 0
  let url = new URL('https://local.example/en/app/course' + search)
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]))
  const hooks = {
    useState(initial) { const i = index++; slots[i] ||= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; dirty = true }] },
    useRef(initial) { return slots[index++] ||= { current: initial } },
    useId() { return hooks.useRef('id-' + serial++).current },
    useMemo(fn, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps) },
    useEffect(fn, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) pending.push(() => { slots[i]?.cleanup?.(); const cleanup = fn(); slots[i] = { deps, cleanup }; if (!effects.includes(i)) effects.push(i) }) },
  }
  const stub = name => Object.assign(() => null, { testName: name })
  const moduleFor = name => ({ __esModule: true, default: stub(name) })
  const modules = {
    react: hooks, 'react/jsx-runtime': { jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props, key) => ({ type, props, key }), Fragment: 'Fragment' },
    'next/link': moduleFor('Link'), 'lucide-react': new Proxy({}, { get: (_, key) => stub(String(key)) }),
    'next/navigation': { useRouter: () => ({ push: value => navigations.push(value), replace: value => navigations.push(value) }), useSearchParams: () => new URLSearchParams(url.search) },
    '@/lib/inner-growth/course-model': { COURSE_STEPS: [], GROWTH_GOALS: {}, COURSE_TOPICS: [], suggestedCourseTopics: () => ({ topics: [] }) },
    '@/lib/inner-growth/course-presets': presets, '@/lib/inner-growth/course-plans': coursePlans, '@/lib/billing/public-plan': billingPlan,
    './my-courses-dashboard': moduleFor('MyCoursesDashboard'), './course-preset-catalog': moduleFor('CoursePresetCatalog'),
    './course-today': moduleFor('CourseToday'), './course-14-day-overview': moduleFor('Course14DayOverview'), './course-r3-steps': moduleFor('CourseR3Steps'),
    './course-guided-timer': moduleFor('CourseGuidedTimer'), './course-slide-player': moduleFor('CourseSlidePlayer'), './subscription-access': { useSubscription: () => ({ status: null, phase: 'unavailable', busy: '' }), useLessonCompletionOffer: () => completion => notified.push(completion) },
    './course-quest': { CourseQuestMap: stub('CourseQuestMap'), CourseQuestPlayer: stub('CourseQuestPlayer') },
    ...extraModules,
  }
  const runtime = {
    exports: {}, require: key => {
      if (key === './my-course-theme.css') return {}
      if (key.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, name) => name }) }
      assert.ok(modules[key], 'Unexpected import ' + key); return modules[key]
    },
    URL, URLSearchParams, AbortController, Intl, console, Event,
    navigator: {},
    crypto: { randomUUID: () => '00000000-0000-4000-8000-' + String(++serial).padStart(12, '0') },
    fetch: async (path, options) => {
      const body = options.body ? JSON.parse(options.body) : null
      calls.push({ path, options, body })
      const result = await fetcher(path, options, body)
      return { ok: !result?.error, json: async () => result }
    },
    window: {
      get location() { return url }, history: { state: null, replaceState: (_state, _title, path) => { url = new URL(path, url); navigations.push(path) } },
      dispatchEvent: event => { listeners.get(event.type)?.(event) },
      addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name),
      requestAnimationFrame: () => 1, cancelAnimationFrame: () => {}, sessionStorage: { getItem: () => null, removeItem: () => {} },
    }, ...globals, document: { getElementById: () => null, querySelector: () => null },
  }
  const compiled = ts.transpileModule(sources[name], { fileName: name + '.jsx', compilerOptions: {
    allowJs: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText
  vm.runInNewContext(compiled, runtime)
  const component = runtime.exports.default || runtime.exports.AccountTestBattery
  const render = (nextProps = props) => {
    props = nextProps; index = 0; pending = []; dirty = false
    tree = component(props)
    for (const node of nodes(tree)) if (node.props?.ref && typeof node.type === 'string') {
      node.props.ref.current ||= { open: false, showModal() { this.open = true }, close() { if (this.open) { this.open = false; node.props.onClose?.() } }, focus() {} }
    }
    pending.forEach(fn => fn())
    return tree
  }
  const settle = async () => { for (let i = 0; i < 18; i++) { await Promise.resolve(); if (dirty) render() } return tree }
  render()
  return { render, settle, calls, navigations, notified, get tree() { return tree },
    async backTo(query) { url = new URL(query, url); listeners.get('popstate')?.(); await settle() },
    unmount() { effects.forEach(i => slots[i]?.cleanup?.()) },
  }
}

