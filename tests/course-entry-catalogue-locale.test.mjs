import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Render the real selector JSX. Children and business modules are explicit
// boundaries: this test proves catalogue locale rendering, not private courses.
const source = readFileSync(new URL('../components/app/course-entry-selector.jsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { fileName: 'course-entry-selector.jsx',
  compilerOptions: { allowJs: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022 } }).outputText
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree)
  ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]
const textOf = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object'
  ? String(tree) : Array.isArray(tree) ? tree.map(textOf).join(' ') : textOf(tree.props?.children)

function render(locale) {
  const effects = [], calls = []
  const denied = (...args) => { calls.push(args); throw new Error('Unexpected API or callback in locale rendering') }
  const child = name => ({ __esModule: true, default: name })
  const icons = Object.fromEntries(['ArrowRight', 'BookOpen', 'Check', 'Crown', 'Heart', 'Leaf',
    'LockKeyhole', 'MoreVertical', 'Archive', 'Plus', 'ShieldCheck', 'Sparkles', 'TrendingUp',
    'UsersRound', 'X'].map(name => [name, 'icon:' + name]))
  const jsx = (type, props, key) => ({ type, props, key })
  const modules = {
    react: { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
      useRef: initial => ({ current: initial }), useEffect: effect => effects.push(effect) },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'next/navigation': { useSearchParams: () => new URLSearchParams() },
    'lucide-react': icons,
    '@/lib/inner-growth/course-model': { GROWTH_GOALS: {}, COURSE_TOPICS: [] },
    '@/lib/inner-growth/course-programs': { courseProgramFromTopics: () => null },
    '@/lib/inner-growth/course-membership': { COURSE_MEMBERSHIP: {}, COURSE_PUBLIC_PLANS: [] },
    './manual-billing-request': child('ManualBillingRequest'),
    '@/lib/app/client-fetch': { appFetch: denied },
    './course-14-day-overview': child('Course14DayOverview'),
    './cabinet-free-course-banners': child('CabinetFreeCourseBanners'),
    '@/components/reiki-my-reviews': { ReikiMyReviews: 'ReikiMyReviews' },
    '@/lib/inner-growth/antistress-module-router': { antistressModuleTitle: denied, ANTISTRESS_MODULE_IDS: [] },
    './course-entry-selector.module.css': { __esModule: true, default: new Proxy({}, { get: (_, name) => name }) },
  }
  const runtime = { exports: {}, URLSearchParams,
    require: key => { assert.ok(Object.hasOwn(modules, key), 'Unexpected import: ' + key); return modules[key] },
    fetch: denied, document: new Proxy({}, { get: denied }), window: new Proxy({}, { get: denied }) }
  vm.runInNewContext(compiled, runtime, { timeout: 1000 })
  const tree = runtime.exports.default({ locale, course: null, accountId: undefined,
    onOpen: denied, onAdd: denied, onCloseCourse: denied })
  for (const effect of effects) effect()
  assert.equal(calls.length, 0, 'initial locale render must not request private data or call actions')
  return tree
}

for (const locale of ['en', 'ru', 'es', undefined]) {
  test('catalogue locale renders all four copy positions without private calls: ' + String(locale), () => {
    const tree = render(locale)
    const bridge = nodes(tree).filter(node => node.type === 'section' && node.props.className === 'courseCatalogBridge')
    assert.equal(bridge.length, 1)
    const russian = locale === 'ru'
    assert.equal(bridge[0].props['aria-label'], russian ? 'Каталог курсов Holistic House' : 'Holistic House course catalogue')
    const heading = nodes(bridge[0]).find(node => node.type === 'strong')
    const detail = nodes(bridge[0]).find(node => node.type === 'small')
    const link = nodes(bridge[0]).find(node => node.type === 'a')
    assert.equal(textOf(heading), russian ? 'Выбрать следующий курс' : 'Explore more courses')
    assert.equal(textOf(detail), russian ? 'Бесплатные и расширенные программы — без потери прогресса в моих курсах.' : 'Browse free and advanced programmes without losing your saved progress.')
    assert.equal(textOf(link).trim(), russian ? 'Все курсы' : 'All Courses')
    assert.equal(link.props.href, '/' + (locale || 'en') + '/academy')
    assert.equal(textOf(nodes(tree).find(node => node.type === 'h1')), russian ? 'Мои курсы' : 'My courses')
  })
}
