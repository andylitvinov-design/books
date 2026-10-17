import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { availableTestCollections } from '../lib/assessments/test-collections.js'
import { assertCompactAccountPicker } from '../scripts/helpers/account-picker-disclosure-verifier.mjs'
import { exercisePortraitRays, assertPublicCollectionChips } from '../scripts/helpers/public-discovery-verifier.mjs'
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

function accountPickerLocator(values) {
  return {
    values,
    locator(selector) {
      return accountPickerLocator(values.flatMap(nodes).filter(node => {
        if (selector === '[data-account-test-picker="true"]') return node.props['data-account-test-picker'] === 'true'
        if (selector === '[data-public-test-picker="true"]') return node.props['data-public-test-picker'] === 'true'
        if (selector === '[data-client-tests-hero]') return node.props['data-client-tests-hero'] === true
        assert.equal(selector, '#hh-test-hero-search'); return node.props.id === 'hh-test-hero-search'
      }))
    },
    getByRole(role, options = {}) {
      return accountPickerLocator(values.flatMap(nodes).filter(node => {
        const matches = role === 'heading' ? node.type === 'h' + options.level : node.type === (role === 'navigation' ? 'nav' : role)
        return matches && (options.name === undefined || accessibleText(node) === options.name)
      }))
    },
  }
}
const accountPickerExpect = value => ({
  async toHaveCount(count) { assert.equal(value.values.length, count) },
  async toBeVisible() { assert.equal(value.values.length, 1) },
  async toHaveAttribute(name, expected) { assert.equal(value.values.length, 1); assert.equal(value.values[0].props[name], expected) },
})
for (const locale of ['en', 'ru', 'es']) test(locale + ' compact account finder keeps actual local search, manual choices and save opt-in', async () => {
  const parentHooks = hooks(), pickerHooks = hooks()
  const { TestExplorer } = compile(parentSource, parentHooks, modules)
  const { SimpleTestPicker } = compile(pickerSource, pickerHooks, modules)
  let starts = 0, pickerProps, tree
  const render = () => {
    parentHooks.reset(); pickerHooks.reset()
    const parent = TestExplorer({ locale, audience: 'account', authenticated: true, simpleMode: true, preserveScaleFilters: true, onStart: () => { starts++ } })
    pickerProps = parent.props; tree = SimpleTestPicker(pickerProps); return tree
  }
  render()
  await assertCompactAccountPicker(accountPickerLocator([tree]), accountPickerExpect, { locale })
  assert.equal(nodes(tree).filter(node => node.props['data-test-topic-collections']).length, 0)
  const selected = pickerProps.activeBattery.map(entry => entry.key)
  const candidate = pickerProps.recommendations.find(entry => !selected.includes(entry.key))
  assert.ok(candidate); pickerProps.onToggleTest(candidate.key); render()
  const preserved = pickerProps.activeBattery.map(entry => entry.key)
  assert.equal(preserved.length, selected.length + 1)
  const query = locale === 'ru' ? 'Любовь' : locale === 'es' ? 'amor' : 'Love'
  nodes(tree).find(node => node.props.id === 'hh-test-hero-search').props.onChange({ target: { value: query } }); render()
  nodes(tree).find(node => node.type === 'form' && node.props.role === 'search').props.onSubmit({ preventDefault() {} }); render()
  const hits = nodes(tree).filter(node => node.props['data-test-match']).map(node => node.props['data-test-match'])
  assert.ok(hits.length > 0)
  const allowed = new Set(explorerModule.searchPublicTestEntries(pickerProps.searchRecommendations, query).map(entry => entry.key))
  assert.ok(hits.every(key => allowed.has(key)))
  assert.deepEqual(pickerProps.activeBattery.map(entry => entry.key), preserved)
  assert.equal(starts, 0, 'Search and manual choice must not save or start tests')
  assert.equal(nodes(tree).find(node => node.props['data-test-start-mode'] === 'tests').props.onClick, pickerProps.onStart)
})

test('compact account browser proof rejects public variant, missing search and promotional hero leakage', async () => {
  for (const fault of ['publicVariant', 'wrongTitle', 'missingSearch', 'publicH1', 'publicTabs']) {
    const pickerHooks = hooks(), { SimpleTestPicker } = compile(pickerSource, pickerHooks, modules)
    const tree = SimpleTestPicker({ locale: 'en', authenticated: true, focus: [], recommendations: [], activeBattery: [], matchCount: 0, depth: 'balanced', maxMinutes: 0 })
    const header = nodes(tree).find(node => node.props['data-client-tests-hero'])
    if (fault === 'publicVariant') { tree.props['data-account-test-picker'] = undefined; tree.props['data-public-test-picker'] = 'true' }
    if (fault === 'wrongTitle') nodes(header).find(node => node.type === 'h2').props.children = 'Old headline'
    if (fault === 'missingSearch') nodes(header).find(node => node.props.id === 'hh-test-hero-search').props.id = 'missing'
    if (fault === 'publicH1') header.props.children.push(jsx('h1', { children: 'Public headline' }))
    if (fault === 'publicTabs') header.props.children.push(jsx('nav', { children: 'Public tabs' }))
    await assert.rejects(assertCompactAccountPicker(accountPickerLocator([tree]), accountPickerExpect))
  }
})

function collectionChipHarness(locale, fault = null) {
  const react = hooks(), { SimpleTestPicker } = compile(pickerSource, react, modules)
  const catalogEntries = explorerModule.buildExplorerEntries({ locale: locale === 'es' ? 'en' : locale, audience: 'guest' })
  const collections = availableTestCollections(catalogEntries)
  const tree = SimpleTestPicker({ locale, authenticated: false, focus: [], recommendations: [], activeBattery: [], matchCount: 0, depth: 'balanced', maxMinutes: 0, catalogEntries })
  const root = nodes(tree).find(node => node.props['data-test-topic-collections'])
  const heading = nodes(root).find(node => node.type === 'h2')
  const cards = nodes(root).filter(node => node.props['data-test-collection'])
  const rawText = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(rawText).join('') : rawText(node.props.children)
  if (fault === 'missingHeading') heading.type = 'p'
  if (fault === 'hiddenHeading') heading.props['aria-hidden'] = true
  if (fault === 'wrongBinding') root.props['aria-labelledby'] = 'wrong-heading'
  if (fault === 'wrongName') cards[0].props['aria-label'] = 'Stress only'
  if (fault === 'wrongCount') nodes(cards[0]).find(node => node.props.className === 'curatedCardBottom').props.children[0].props.children = 999
  if (fault === 'wrongTitle') nodes(cards[0]).find(node => node.type === 'strong').props.children = 'Incorrect title'
  if (fault === 'description') cards[0].props.children.push(jsx('small', { children: 'Removed description' }))
  if (fault === 'missingCard') cards[0].props['data-test-collection'] = undefined
  const locator = values => ({
    values,
    nth(index) { return locator(values.slice(index, index + 1)) },
    locator(selector) {
      return locator(values.flatMap(nodes).flatMap(node => {
        if (selector === '[data-test-collection]') return node.props['data-test-collection'] ? [node] : []
        if (selector === 'strong' || selector === 'small') return node.type === selector ? [node] : []
        assert.equal(selector, 'span[aria-hidden="true"] > span')
        return node.type === 'span' && node.props['aria-hidden'] === 'true' ? [].concat(node.props.children).filter(child => child?.type === 'span') : []
      }))
    },
    getByRole(role, options) {
      assert.equal(role, 'heading'); assert.deepEqual(options, { name: collections.length && heading.props.children, level: 2, exact: true })
      return locator(values.flatMap(nodes).filter(node => node.type === 'h2' && !node.props['aria-hidden']))
    },
  })
  const expect = value => ({
    async toHaveCount(count) { assert.equal(value.values.length, count) },
    async toBeVisible() { assert.equal(value.values.length, 1); assert.equal(value.values[0], root, 'Only the visible chip section, not its screen-reader heading, needs visual presence') },
    async toHaveAttribute(name, expected) { assert.equal(value.values.length, 1); assert.equal(value.values[0].props[name], expected) },
    async toHaveText(expected) { assert.equal(value.values.length, 1); assert.equal(rawText(value.values[0]), expected) },
    async toHaveAccessibleName(expected) {
      assert.equal(value.values.length, 1); const node = value.values[0]
      const label = node.props['aria-label'] ?? accessibleText(nodes(root).find(item => item.props.id === node.props['aria-labelledby']))
      assert.equal(label, expected)
    },
  })
  return { root: locator([root]), expect, collections, heading }
}
for (const locale of ['en', 'ru', 'es']) test(locale + ' compact collection chips retain source counts, visible names and complete accessible labels', async () => {
  const h = collectionChipHarness(locale)
  await assertPublicCollectionChips(h.root, h.expect, locale, h.collections)
  assert.equal(h.heading.props.className, 'curatedSrOnly')
})
for (const fault of ['missingHeading', 'hiddenHeading', 'wrongBinding', 'wrongName', 'wrongCount', 'wrongTitle', 'description', 'missingCard']) test('compact collection proof rejects ' + fault, async () => {
  const h = collectionChipHarness('en', fault)
  await assert.rejects(assertPublicCollectionChips(h.root, h.expect, 'en', h.collections))
})
test('collection heading stays accessible offscreen; visible chip rows and real interaction checks remain strict', () => {
  const css = read('components/app/simple-test-picker.module.css')
  const rule = css.match(/\.curatedSrOnly\s*\{([^}]+)\}/)?.[1]
  assert.ok(rule)
  for (const declaration of [/position:\s*absolute/, /width:\s*1px/, /height:\s*1px/, /clip:\s*rect\(0, 0, 0, 0\)/]) assert.match(rule, declaration)
  assert.doesNotMatch(rule, /display:\s*none|visibility:\s*hidden/)
  assert.match(css, /\.curatedCard:nth-child\(n\+9\)\s*\{\s*display:\s*none/)
  assert.match(css, /\.curatedCard:nth-child\(n\+5\)\s*\{\s*display:\s*none/)
  const helper = read('scripts/helpers/public-discovery-verifier.mjs')
  assert.match(helper, /await assertPublicCollectionChips\(root, expect, locale, collections\)/)
  for (const guard of ["'aria-pressed', 'true'", 'allowed.has(key)', 'readSelection(picker), preserved', 'toHaveURL(currentUrl)', 'assert.deepEqual(writes, []', 'expectedSearch']) assert.ok(helper.includes(guard), guard)
})
