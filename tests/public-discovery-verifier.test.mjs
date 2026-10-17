import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { availableTestCollections } from '../lib/assessments/test-collections.js'
import { exercisePortraitRays } from '../scripts/helpers/public-discovery-verifier.mjs'
import * as explorerModule from '../lib/assessments/test-explorer.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]
const accessibleText = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree) : Array.isArray(tree) ? tree.map(accessibleText).join('') : tree.props['aria-hidden'] ? '' : accessibleText(tree.props.children)
const jsx = (type, props, key) => ({ type, props: props || {}, key })
const styles = { default: new Proxy({}, { get: (_, key) => String(key) }) }
function hooks() {
  let cursor = 0
  const values = []
  return {
    reset() { cursor = 0 },
    useState(initial) { const index = cursor++; if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial; return [values[index], next => { values[index] = typeof next === 'function' ? next(values[index]) : next }] },
    useMemo: fn => fn(), useEffect() {}, useRef: initial => ({ current: initial }), useId: () => 'synthetic-portrait-rays',
  }
}
function compile(source, react, modules = {}) {
  const exported = {}
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: exported, window: {}, console, URLSearchParams,
    document: { getElementById: () => ({ scrollIntoView() {} }) },
    require(name) {
      if (modules[name]) return modules[name]
      if (name === 'react') return react
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (name === 'next/link' || name === 'next/image') return { default: name === 'next/link' ? 'a' : 'img' }
      if (name.endsWith('.css')) return styles
      if (name === 'lucide-react') return new Proxy({}, { get: () => 'svg' })
      if (name === './simple-test-picker') return { SimpleTestPicker: 'SimpleTestPicker' }
      if (name === './test-explorer-visual') return { TestExplorerVisual: 'TestExplorerVisual' }
      if (name === './priority-methods-review') return { PriorityMethodsReview: 'PriorityMethodsReview' }
      if (name === './test-scale-guide') return { TestScaleGuide: 'TestScaleGuide' }
      throw new Error('Unexpected dependency: ' + name)
    },
  })
  return exported
}

const parentSource = read('components/app/test-explorer.jsx')
const pickerSource = read('components/app/simple-test-picker.jsx')
const modules = {}
for (const source of [parentSource, pickerSource])
  for (const [, name] of source.matchAll(/from ['"](@\/[^'"]+)['"]/g)) modules[name] = await import(new URL('../' + name.slice(2) + '.js', import.meta.url))

for (const locale of ['en', 'ru', 'es']) test(locale + ' real collection handlers reset stale facets, preserve manual selections and never start tests', () => {
  const parentHooks = hooks(), pickerHooks = hooks()
  const { TestExplorer } = compile(parentSource, parentHooks, modules)
  const { SimpleTestPicker } = compile(pickerSource, pickerHooks, modules)
  let starts = 0, tree, pickerProps
  const render = () => {
    parentHooks.reset(); pickerHooks.reset()
    const parent = TestExplorer({ locale, audience: 'guest', simpleMode: true, onStart: () => { starts++ } })
    assert.equal(parent.type, 'SimpleTestPicker')
    pickerProps = parent.props
    tree = SimpleTestPicker(pickerProps)
    return tree
  }
  const collectionCards = () => nodes(tree).filter(node => node.type === 'button' && node.props['data-test-collection'])
  render()
  const collections = availableTestCollections(pickerProps.catalogEntries)
  assert.deepEqual(collectionCards().map(node => node.props['data-test-collection']), collections.map(item => item.id))
  const title = locale === 'ru' ? 'Подборки тестов по темам' : locale === 'es' ? 'Colecciones de pruebas por tema' : 'Test collections by topic'
  assert.ok(nodes(tree).some(node => node.type === 'h2' && accessibleText(node) === title))
  const more = () => nodes(tree).find(node => node.props['aria-controls'] === 'hh-test-curated-grid')
  assert.equal(more().props['aria-expanded'], false)
  more().props.onClick(); render(); assert.equal(more().props['aria-expanded'], true)
  more().props.onClick(); render(); assert.equal(more().props['aria-expanded'], false)
  const selected = pickerProps.activeBattery.map(entry => entry.key)
  const candidate = pickerProps.recommendations.find(entry => !selected.includes(entry.key))
  assert.ok(candidate)
  pickerProps.onToggleTest(candidate.key); render()
  const preserved = pickerProps.activeBattery.map(entry => entry.key)
  assert.equal(preserved.length, selected.length + 1)
  assert.ok(preserved.includes(candidate.key))
  // Seed stale facets so collection reset is an exercised contract.
  pickerProps.onDepth('deep'); pickerProps.onMaxMinutes(5); pickerProps.onSelectTestKind('professional'); render()
  for (const id of ['stress', 'relationships', 'tantra', 'sexuality']) {
    const collection = collections.find(item => item.id === id)
    collectionCards().find(node => node.props['data-test-collection'] === id).props.onClick(); render()
    assert.deepEqual(Array.from(pickerProps.focus), collection.focus)
    assert.equal(pickerProps.depth, 'balanced'); assert.equal(pickerProps.maxMinutes, 0)
    assert.deepEqual(Array.from(pickerProps.testKinds), [])
    assert.deepEqual(Array.from(pickerProps.problems), [])
    assert.deepEqual(pickerProps.activeBattery.map(entry => entry.key), preserved)
    const expected = new Set(explorerModule.filterExplorerEntries(pickerProps.catalogEntries, { availability: 'available', focus: collection.focus }).filter(entry => entry.selectable).map(entry => entry.key))
    assert.ok(pickerProps.recommendations.length > 0)
    assert.ok(pickerProps.recommendations.every(entry => expected.has(entry.key)))
    assert.equal(collectionCards().filter(node => node.props['aria-pressed']).length, 1)
  }
  collectionCards().find(node => node.props['data-test-collection'] === 'sexuality').props.onClick(); render()
  assert.deepEqual(Array.from(pickerProps.focus), [])
  assert.deepEqual(pickerProps.activeBattery.map(entry => entry.key), preserved)
  collectionCards().find(node => node.props['data-test-collection'] === 'sleep').props.onClick(); render()
  const query = locale === 'ru' ? 'Любовь' : locale === 'es' ? 'amor' : 'Love'
  const search = () => nodes(tree).find(node => node.props.id === 'hh-test-hero-search')
  search().props.onChange({ target: { value: query } }); render()
  nodes(tree).find(node => node.type === 'form' && node.props.role === 'search').props.onSubmit({ preventDefault() {} }); render()
  const hits = nodes(tree).filter(node => node.props['data-test-match']).map(node => node.props['data-test-match'])
  assert.ok(hits.length > 0)
  const expected = new Set(explorerModule.searchPublicTestEntries(pickerProps.searchRecommendations, query).map(entry => entry.key))
  assert.ok(hits.every(key => expected.has(key)))
  assert.equal(nodes(tree).filter(node => node.props['data-via-family']).length, 0)
  assert.deepEqual(Array.from(pickerProps.focus), ['sleep'])
  assert.deepEqual(pickerProps.activeBattery.map(entry => entry.key), preserved)
  collectionCards().find(node => node.props['data-test-collection'] === 'sexuality').props.onClick(); render()
  assert.equal(search().props.value, '')
  assert.deepEqual(Array.from(pickerProps.focus), ['sexuality'])
  assert.equal(starts, 0)
})

function portraitHarness(locale, mutate = source => source) {
  const react = hooks()
  const { TestExplorerVisual } = compile(mutate(read('components/app/test-explorer-visual.jsx')), react, { '@/lib/assessments/test-explorer': explorerModule })
  const axes = explorerModule.TEST_EXPLORER_AXES
  const props = { locale, coverage: { axes: {}, coveredCount: 0 }, portrait: { axes: Object.fromEntries(axes.filter(axis => axis !== 'personality').slice(0, 8).map(axis => [axis, { percent: 50 }])) } }
  const render = () => { react.reset(); return TestExplorerVisual(props) }
  const locator = query => ({
    list: query,
    locator(selector) {
      return locator(() => query().flatMap(root => {
        const all = nodes(root)
        if (selector === '[data-portrait-ray-options]') return all.filter(node => node.props['data-portrait-ray-options'])
        if (selector === 'input[type="checkbox"]') return all.filter(node => node.type === 'input')
        if (selector === 'input:checked') return all.filter(node => node.type === 'input' && node.props.checked)
        if (selector === 'input:disabled') return all.filter(node => node.type === 'input' && node.props.disabled)
        if (selector === 'svg[role="img"] > g') return all.filter(node => node.type === 'svg' && node.props.role === 'img').flatMap(node => [].concat(node.props.children).flat().filter(child => child?.type === 'g'))
        throw new Error('Unexpected selector: ' + selector)
      }))
    },
    getByRole(role, { name, exact }) { assert.equal(exact, true); return locator(() => query().flatMap(nodes).filter(node => node.type === role && accessibleText(node) === name)) },
    nth(index) { return locator(() => query().slice(index, index + 1)) },
    async getAttribute(name) { assert.equal(query().length, 1); return String(query()[0].props[name]) },
    async click() { assert.equal(query().length, 1); query()[0].props.onClick() },
    async check() { assert.equal(query().length, 1); const node = query()[0]; assert.ok(!node.props.disabled); if (!node.props.checked) node.props.onChange() },
    async uncheck() { assert.equal(query().length, 1); const node = query()[0]; assert.ok(!node.props.disabled); if (node.props.checked) node.props.onChange() },
    async evaluateAll(fn) { return fn(query().map(node => ({ checked: node.props.checked }))) },
  })
  const expect = value => ({
    async toHaveCount(count) { assert.equal(value.list().length, count) },
    async toHaveAttribute(name, expected) { assert.equal(await value.getAttribute(name), expected) },
    async toBeChecked() { assert.equal(value.list()[0].props.checked, true) },
  })
  return { portrait: locator(() => [render()]), expect }
}

test('browser ray verifier drives real canonical handlers, selection cap, collapse persistence and restoration in EN/RU/ES', async () => {
  for (const locale of ['en', 'ru', 'es']) {
    const h = portraitHarness(locale)
    await exercisePortraitRays(h.portrait, h.expect, locale)
  }
})
test('browser ray verifier rejects no-op expansion, broken 10-ray cap and collapse state loss', async () => {
  for (const mutate of [
    source => source.replace('setShowAllPortraitRays(current => !current)', 'setShowAllPortraitRays(current => current)'),
    source => source.replace('visibleRays.length >= 10', 'visibleRays.length >= 11'),
    source => source.replace('setShowAllPortraitRays(current => !current)', '(setChosenRays(null), setShowAllPortraitRays(current => !current))'),
  ]) {
    const h = portraitHarness('en', mutate)
    await assert.rejects(exercisePortraitRays(h.portrait, h.expect, 'en'))
  }
})

test('core keeps new discovery paths inside the isolated native browser acceptance and preserves Spanish public diagnostics', () => {
  const core = read('scripts/verify-app-r1.mjs')
  for (const locale of ['en', 'ru', 'es']) assert.ok(core.includes(`exercisePublicCollections(guestPickerPage,expect,'${locale}')`))
  assert.ok(core.includes("guestPickerPage.goto(origin+'/es/client/tests')"))
  assert.ok(core.includes('exercisePortraitRays(portrait,expect,locale)'))
  assert.ok(core.includes("target.locator('[data-sitewide-personal-review-banner]')).toBeHidden()"))
  assert.ok(core.includes("target.locator('.ia222-bottom-navigation')).toBeHidden()"))
  const helper = read('scripts/helpers/public-discovery-verifier.mjs')
  for (const contract of ['toHaveAccessibleName', 'allowed.has(key)', 'readSelection(picker), preserved', "assert.deepEqual(writes, []", 'toHaveURL(currentUrl)', "locale === 'es' ? 'en' : locale"]) assert.ok(helper.includes(contract), contract)
})
