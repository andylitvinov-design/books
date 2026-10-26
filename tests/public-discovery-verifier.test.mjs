import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import { readFileSync } from 'node:fs'
import { hooks, compile, modules, jsx, renderWithEffects, assertDiscoveryIsolation, assertAfterIsolation } from './helpers/public-discovery-fixture.mjs'

afterEach(assertDiscoveryIsolation)
import { availableTestCollections, availableTantraTestPaths } from '../lib/assessments/test-collections.js'
import { assertCompactAccountPicker } from '../scripts/helpers/account-picker-disclosure-verifier.mjs'
import { exercisePortraitRays, assertPublicCollectionChips, assertPublicCollectionMatches } from '../scripts/helpers/public-discovery-verifier.mjs'
import * as portraitConstructs from '../lib/assessments/portrait-constructs.js'
import * as portraitSectors from '../lib/assessments/portrait-sectors.js'
import * as portraitRayLabels from '../lib/assessments/portrait-ray-labels.js'
import * as explorerModule from '../lib/assessments/test-explorer.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]
const accessibleText = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree) : Array.isArray(tree) ? tree.map(accessibleText).join('') : tree.props['aria-hidden'] ? '' : accessibleText(tree.props.children)
const parentSource = read('components/app/test-explorer.jsx')
const pickerSource = read('components/app/simple-test-picker.jsx')
for (const locale of ['en', 'ru', 'es']) test(locale + ' real collection handlers preserve chosen facets, preserve manual selections and never start tests', () => {
  const parentHooks = hooks(), pickerHooks = hooks()
  let starts = 0, tree, pickerProps
  assertAfterIsolation(() => assert.equal(starts, 0, 'Browsing must not start tests during effects or cleanup'))
  const frames = [], scrolls = []
  const browser = {
    window: { requestAnimationFrame(callback) { frames.push(callback) } },
    document: { getElementById(id) { return nodes(tree).some(node => node.props.id === id) ? { scrollIntoView(options) { scrolls.push({ id, ...options }) } } : null } },
  }
  const { TestExplorer } = compile(parentSource, parentHooks, modules)
  const { SimpleTestPicker } = compile(pickerSource, pickerHooks, modules, browser)
  const render = () => renderWithEffects([parentHooks, pickerHooks], () => {
    const parent = TestExplorer({ locale, audience: 'guest', simpleMode: true, onStart: () => { starts++ } })
    assert.equal(parent.type, 'SimpleTestPicker')
    pickerProps = parent.props
    tree = SimpleTestPicker(pickerProps)
    return tree
  })
  const collectionCards = () => nodes(tree).filter(node => node.type === 'button' && node.props['data-test-collection'])
  const chooseCollection = id => {
    const card = collectionCards().find(node => node.props['data-test-collection'] === id)
    const target = 'hh-simple-recommendations'
    const before = scrolls.length
    card.props.onClick()
    assert.equal(scrolls.length, before, 'Scroll waits for the updated section to render')
    assert.equal(frames.length, 1)
    render()
    frames.shift()()
    assert.deepEqual(scrolls.slice(before), [{ id: target, behavior: 'smooth', block: 'start' }])
  }
  render()
  assert.equal(tree.props['data-public-test-picker'], 'true')
  assert.equal(tree.props['data-account-test-picker'], undefined)
  assert.equal(nodes(tree).filter(node => node.props['data-research-directory']).length, 0)
  const collections = availableTestCollections(pickerProps.catalogEntries)
  assert.deepEqual(collectionCards().map(node => node.props['data-test-collection']), collections.map(item => item.id))
  const title = locale === 'ru' ? 'Подборки тестов по темам (необязательно)' : locale === 'es' ? 'Colecciones de pruebas por tema (opcional)' : 'Test collections by topic (optional)'
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
  // Explicit collection changes retain the owner-approved visible preferences.
  pickerProps.onToggleFocus('sleep'); render()
  pickerProps.onToggleProblem('unrested'); render()
  pickerProps.onDepth('deep'); pickerProps.onMaxMinutes(5); pickerProps.onSelectTestKind('professional'); render()
  pickerProps.onChooseCollection('stress'); render()
  assert.deepEqual(Array.from(pickerProps.focus), ['sleep'])
  assert.deepEqual(Array.from(pickerProps.problems), ['unrested'])
  assert.equal(pickerProps.depth, 'deep'); assert.equal(pickerProps.maxMinutes, 5)
  assert.deepEqual(Array.from(pickerProps.testKinds), ['professional'])
  assert.deepEqual(pickerProps.activeBattery.map(entry => entry.key), preserved)
  // The user explicitly clears these facets before browsing every collection.
  pickerProps.onToggleFocus('sleep'); pickerProps.onClearProblems();
  pickerProps.onDepth('balanced'); pickerProps.onMaxMinutes(0); pickerProps.onClearTestKinds(); pickerProps.onChooseCollection(null); render()
  for (const id of ['stress', 'relationships', 'tantra', 'sexuality']) {
    const collection = collections.find(item => item.id === id)
    chooseCollection(id)
    assert.deepEqual(Array.from(pickerProps.focus), []); assert.equal(pickerProps.activeCollectionId,id)
    assert.equal(pickerProps.depth, 'balanced'); assert.equal(pickerProps.maxMinutes, 0)
    assert.deepEqual(Array.from(pickerProps.testKinds), [])
    assert.deepEqual(Array.from(pickerProps.problems), [])
    assert.deepEqual(pickerProps.activeBattery.map(entry => entry.key), preserved)
    const expected = new Set(explorerModule.filterExplorerEntries(pickerProps.catalogEntries, { availability: 'available', selectedKeys: preserved }).filter(entry => entry.selectable).map(entry => entry.key))
    assert.ok(pickerProps.recommendations.length > 0)
    assert.ok(pickerProps.recommendations.every(entry => expected.has(entry.key)))
    assert.ok(preserved.every(key => pickerProps.recommendations.some(entry => entry.key === key)), 'Every explicit cross-topic selection stays reachable')
    assertPublicCollectionMatches(nodes(tree).filter(node => node.props['data-test-match']).map(node => node.props['data-test-match']), pickerProps.catalogEntries, collection, preserved)
    assert.equal(collectionCards().filter(node => node.props['aria-pressed']).length, 1)
  }
  chooseCollection('sexuality')
  assert.deepEqual(Array.from(pickerProps.focus), [])
  assert.deepEqual(pickerProps.activeBattery.map(entry => entry.key), preserved)
  chooseCollection('sleep')
  const query = locale === 'ru' ? 'Любовь' : locale === 'es' ? 'amor' : 'Love'
  const search = () => nodes(tree).find(node => node.props.id === 'hh-test-hero-search')
  search().props.onChange({ target: { value: query } }); render()
  nodes(tree).find(node => node.type === 'form' && node.props.role === 'search').props.onSubmit({ preventDefault() {} }); render()
  const hits = nodes(tree).filter(node => node.props['data-test-match']).map(node => node.props['data-test-match'])
  assert.ok(hits.length > 0)
  const expected = new Set(explorerModule.searchPublicTestEntries(pickerProps.searchRecommendations, query).map(entry => entry.key))
  assert.ok(hits.every(key => expected.has(key)))
  assert.equal(nodes(tree).filter(node => node.props['data-via-family']).length, 0)
  assert.deepEqual(Array.from(pickerProps.focus), []); assert.equal(pickerProps.activeCollectionId,'sleep')
  assert.deepEqual(pickerProps.activeBattery.map(entry => entry.key), preserved)
  chooseCollection('sexuality')
  assert.equal(search().props.value, '')
  assert.deepEqual(Array.from(pickerProps.focus), []); assert.equal(pickerProps.activeCollectionId,'sexuality')
  assert.equal(starts, 0)
})

// Execute the exact pure expectation statements used by the browser journey,
// not a second implementation or a result inferred from the rendered cards.
// This boundary does not run Playwright; selectors and native input remain CI gates.
function browserCollectionSearchKeys({ entries, collections, preserved, query, initialPreferences }) {
  const source = read('scripts/helpers/public-discovery-verifier.mjs')
  const start = '    const sleepCollection = collections.find(item=>item.id===\'sleep\')'
  const end = '    assert.ok(expectedSearch.length > 0)'
  assert.equal(source.split(start).length, 2, 'Exactly one browser search expectation starts here')
  const tail = source.slice(source.indexOf(start))
  assert.equal(tail.split(end).length, 2, 'The complete browser expectation has a unique boundary')
  const recipe = tail.slice(0, tail.indexOf(end))
  const evaluate = new Function('entries', 'collections', 'preserved', 'query', 'initialPreferences',
    'rankPublicTestMatches', 'filterExplorerEntries', 'searchPublicTestEntries', 'groupViaRecommendations',
    recipe + '\nreturn expectedSearch')
  return evaluate(entries, collections, preserved, query, initialPreferences,
    explorerModule.rankPublicTestMatches, explorerModule.filterExplorerEntries,
    explorerModule.searchPublicTestEntries, modules['@/lib/assessments/via-family'].groupViaRecommendations)
}

for (const { locale, depth, query } of [
  { locale: 'en', depth: 'quick', query: 'Love' },
  { locale: 'ru', depth: 'balanced', query: 'Любовь' },
]) test(locale + ' browser search oracle keeps prior Stress + ' + depth + ' through Sleep and exact ordered Love search', () => {
  const parentHooks = hooks(), pickerHooks = hooks(), frames = []
  let starts = 0, tree, pickerProps
  assertAfterIsolation(() => assert.equal(starts, 0, 'Search must not start tests during effects or cleanup'))
  const { TestExplorer } = compile(parentSource, parentHooks, modules)
  const { SimpleTestPicker } = compile(pickerSource, pickerHooks, modules, {
    window: { requestAnimationFrame(callback) { frames.push(callback) } },
  })
  const render = () => renderWithEffects([parentHooks, pickerHooks], () => {
    pickerProps = TestExplorer({ locale, audience: 'guest', simpleMode: true, onStart: () => { starts++ } }).props
    return tree = SimpleTestPicker(pickerProps)
  })
  render()
  pickerProps.onToggleFocus('stress'); render()
  pickerProps.onDepth(depth); render()
  const suggested = pickerProps.activeBattery.map(entry => entry.key)
  const manual = pickerProps.recommendations.find(entry => !suggested.includes(entry.key))
  assert.ok(manual)
  pickerProps.onToggleTest(manual.key); render()
  const preserved = pickerProps.activeBattery.map(entry => entry.key)
  assert.deepEqual(preserved.length, suggested.length + 1)
  const sleepButton = nodes(tree).find(node => node.props['data-test-collection'] === 'sleep')
  assert.ok(sleepButton)
  sleepButton.props.onClick(); render()
  assert.equal(frames.length, 1); frames.shift()()
  assert.deepEqual(Array.from(pickerProps.focus), ['stress'])
  assert.equal(pickerProps.depth, depth)
  assert.equal(pickerProps.activeCollectionId, 'sleep')
  const search = () => nodes(tree).find(node => node.props.id === 'hh-test-hero-search')
  search().props.onChange({ target: { value: query } }); render()
  nodes(tree).find(node => node.type === 'form' && node.props.role === 'search').props.onSubmit({ preventDefault() {} }); render()

  // Independent public-catalog oracle: prior focus is a persistent preference,
  // Sleep is additive, selected tests affect VIA grouping only, never relevance.
  const entries = explorerModule.buildExplorerEntries({ locale, audience: 'guest' })
  const initialPreferences = { focus: ['stress'], depth }
  const collections = availableTestCollections(entries, initialPreferences)
  const sleep = collections.find(item => item.id === 'sleep')
  const pool = explorerModule.filterExplorerEntries(entries, { availability: 'available', kinds: [], maxMinutes: 0 })
  const rank = focus => explorerModule.rankPublicTestMatches(pool, {
    depth, focus, collectionId: 'sleep', collectionFocus: sleep.focus,
  })
  const searchKeys = ranked => explorerModule.searchPublicTestEntries(
    modules['@/lib/assessments/via-family'].groupViaRecommendations(ranked, new Set(preserved), false).visible, query,
  ).slice(0, 5).map(entry => entry.key)
  const independentExpected = searchKeys(rank([...new Set(['stress', ...sleep.focus])]))
  const droppedPersistentFocus = searchKeys(rank(sleep.focus))
  assert.equal(independentExpected.length, 5)
  assert.notDeepEqual(independentExpected, droppedPersistentFocus, 'Dropping persistent Stress is a real order-changing counterfactual')
  const browserExpected = browserCollectionSearchKeys({ entries, collections, preserved, query, initialPreferences })
  assert.deepEqual(browserExpected, independentExpected, 'The native browser oracle must retain prior Stress alongside Sleep')
  const hits = nodes(tree).filter(node => node.props['data-test-match']).map(node => node.props['data-test-match'])
  assert.deepEqual(hits, independentExpected, 'The actual picker preserves the exact ranked order, not only membership')
  assert.deepEqual(Array.from(pickerProps.focus), ['stress'])
  assert.equal(pickerProps.depth, depth)
  assert.equal(pickerProps.activeCollectionId, 'sleep')
  assert.deepEqual(pickerProps.activeBattery.map(entry => entry.key), preserved, 'Love search cannot rewrite manual selection')
  assert.equal(nodes(tree).filter(node => node.props['data-via-family']).length, 0)
  assert.equal(starts, 0)
})

for (const locale of ['en','ru','es']) test(locale+' collection standard Details stays read-only and Start launches exactly one cleared test',async()=>{
 const parentHooks=hooks(),pickerHooks=hooks(),starts=[];let tree,props
 let explicitKey
 assertAfterIsolation(() => assert.deepEqual(starts, [[explicitKey]], 'Only the explicit single Start is allowed, including after cleanup'))
 const {TestExplorer}=compile(parentSource,parentHooks,modules)
 const {SimpleTestPicker}=compile(pickerSource,pickerHooks,modules)
 const render=()=>renderWithEffects([parentHooks,pickerHooks],()=>{props=TestExplorer({locale,audience:'guest',simpleMode:true,onStart:async entries=>starts.push(Array.from(entries,e=>e.key))}).props;return tree=SimpleTestPicker(props)})
 render();props.onChooseCollection('sexuality');render()
 assert.equal(nodes(tree).filter(n=>n.props['data-tantra-path']).length,0)
 const first=nodes(tree).find(n=>n.props['data-test-match']);assert.ok(first)
 const key=first.props['data-test-match'];explicitKey=key;assert.ok(props.catalogEntries.some(e=>e.key===key&&e.selectable))
 const card=()=>nodes(tree).find(n=>n.props['data-test-match']===key)
 const details=()=>nodes(card()).find(n=>n.props.className==='testDetailsButton')
 const battery=props.activeBattery.map(e=>e.key)
 details().props.onClick();render();assert.equal(details().props['aria-expanded'],true)
 assert.deepEqual(props.activeBattery.map(e=>e.key),battery);assert.deepEqual(starts,[])
 assert.equal(nodes(card()).find(n=>n.props.id===details().props['aria-controls']).props.hidden,false)
 const start=nodes(card()).find(n=>n.props.className==='takeTest');assert.equal(start.props.disabled,false)
 await start.props.onClick();render();assert.deepEqual(starts,[[key]])
 assert.deepEqual(props.activeBattery.map(e=>e.key),battery,'Single Start does not rewrite the selected battery')
})

test('collection browser acceptance checks exact boosted ranking and rejects unknown, duplicated or reordered cards', () => {
  const entries=explorerModule.buildExplorerEntries({locale:'en',audience:'guest'})
  const collection=availableTestCollections(entries).find(item=>item.id==='tantra')
  const ranked=explorerModule.rankPublicTestMatches(explorerModule.filterExplorerEntries(entries,{availability:'available'}),{depth:'balanced',focus:collection.focus,collectionId:collection.id,collectionFocus:collection.focus})
  const expected=ranked.filter(e=>!/^ipip-via-r-(?!strengths-96$).+-(4|6)$/.test(e.key)).slice(0,5).map(e=>e.key)
  assertPublicCollectionMatches(expected,entries,collection,[])
  for(const shown of [expected.slice(1),[...expected].reverse(),['unknown-key'],[expected[0],expected[0]],[],Array(6).fill(expected[0])])assert.throws(()=>assertPublicCollectionMatches(shown,entries,collection,[]))

})

function portraitHarness(locale, mutate = source => source, measuredCount = 8) {
  const react = hooks()
  const { TestExplorerVisual } = compile(mutate(read('components/app/test-explorer-visual.jsx')), react, { '@/lib/assessments/test-explorer': explorerModule, '@/lib/assessments/portrait-ray-labels': portraitRayLabels, '@/lib/assessments/portrait-sectors': portraitSectors, '@/lib/assessments/portrait-constructs': portraitConstructs })
  const axes = explorerModule.TEST_EXPLORER_AXES
  const props = { locale, coverage: { axes: {}, coveredCount: 0 }, portrait: { axes: Object.fromEntries(axes.filter(axis => axis !== 'personality').slice(0, measuredCount).map(axis => [axis, { percent: 50, rawValue:5, min:0, max:10, mode:"directional" }])) } }
  let tree
  const render = () => { react.reset(); tree = TestExplorerVisual(props); return tree }
  const locator = query => ({
    list: query,
    locator(selector) {
      return locator(() => query().flatMap(root => {
        const all = nodes(root)
        if (selector === '[data-portrait-sectors]') return all.filter(node => node.props['data-portrait-sectors'])
        if (selector === '[data-portrait-sector]') return all.filter(node => node.props['data-portrait-sector'])
        if (selector === '[data-portrait-sector-all]') return all.filter(node => node.props['data-portrait-sector-all'])
        if (selector === '[data-sector-point]') return all.filter(node => node.props['data-sector-point'])
        const sector = selector.match(/^\[data-portrait-sector="([^" ]+)"\]$/)
        if (sector) return all.filter(node => node.props['data-portrait-sector'] === sector[1])
        if (selector === '[data-portrait-ray-options]') return all.filter(node => node.props['data-portrait-ray-options'])
        if (selector === 'input[type="checkbox"]') return all.filter(node => node.type === 'input')
        if (selector === 'input:checked') return all.filter(node => node.type === 'input' && node.props.checked)
        if (selector === 'input:disabled') return all.filter(node => node.type === 'input' && node.props.disabled)
        if (selector === 'svg[role="img"] > g:has(> line[x1="180"][y1="182"])') return all.filter(node => node.type === 'svg' && node.props.role === 'img').flatMap(node => nodes(node).filter(child => child?.type === 'g' && [].concat(child.props.children).flat().some(line => line?.type === 'line' && String(line.props.x1) === '180' && String(line.props.y1) === '182')))
        throw new Error('Unexpected selector: ' + selector)
      }))
    },
    getByRole(role, { name, exact }) { assert.equal(exact, true); return locator(() => query().flatMap(nodes).filter(node => node.type === role && accessibleText(node) === name)) },
    nth(index) { return locator(() => query().slice(index, index + 1)) },
    async getAttribute(name) { assert.equal(query().length, 1); return String(query()[0].props[name]) },
    async click() { assert.equal(query().length, 1); query()[0].props.onClick() },
    async check() { assert.equal(query().length, 1); const node = query()[0]; assert.ok(!node.props.disabled); if (!node.props.checked) node.props.onChange() },
    async uncheck() { assert.equal(query().length, 1); const node = query()[0]; assert.ok(!node.props.disabled); if (node.props.checked) node.props.onChange() },
    async evaluateAll(fn) {
      const selected = query()
      return fn(selected.map(node => ({ checked: node.props.checked, parentElement: {
        querySelector(selector) {
          assert.equal(selector, 'strong')
          const label = nodes(tree).find(item => item.type === 'label' && nodes(item).includes(node))
          const score = nodes(label).find(item => item.type === 'strong')
          return score ? { textContent: accessibleText(score) } : null
        },
      } })))
    },
  })
  const expect = value => ({
    async toHaveCount(count) { assert.equal(value.list().length, count) },
    async toHaveAttribute(name, expected) { assert.equal(await value.getAttribute(name), expected) },
    async toBeChecked() { assert.equal(value.list()[0].props.checked, true) },
  })
  return { portrait: locator(() => [render()]), expect }
}

test('browser ray verifier exercises measured defaults, all 17 rays, sector filters and exact restoration in EN/RU/ES', async () => {
  for (const locale of ['en', 'ru', 'es']) for (const measuredCount of [0, 8, 17]) {
    const h = portraitHarness(locale, source => source, measuredCount)
    await exercisePortraitRays(h.portrait, h.expect, locale)
  }
})
test('browser ray verifier rejects no-op expansion, obsolete caps, fabricated defaults and lost fine selections', async () => {
  const mutations = [
    ["setSelectedSector(sector.key)", "setSelectedSector('all')"],
    ['[...selected, axis]', '(selected.length >= 10 ? selected : [...selected, axis])'],
    ['const suggestedRays = PORTRAIT_AXES', 'const suggestedRays = measuredAxes'],
    ['setSelectedSector(sector.key)', '(setChosenRays(null), setSelectedSector(sector.key))'],
    ['portraitAxesForSectors([selectedSector])', "portraitAxesForSectors(['body'])"],
  ]
  for (const [before, after] of mutations) {
    assert.ok(read('components/app/test-explorer-visual.jsx').includes(before), 'Mutation must alter the actual current source')
    const h = portraitHarness('en', source => source.replace(before, after), 0)
    await assert.rejects(exercisePortraitRays(h.portrait, h.expect, 'en'))
  }
})

test('core keeps new discovery paths inside the isolated native browser acceptance and preserves Spanish public diagnostics', () => {
  const core = read('scripts/verify-app-r1.mjs')
  for (const [locale, suffix] of [['en',",{focus:['stress'],depth:'quick'}"], ['ru',",{focus:['stress'],depth:'balanced'}"], ['es','']]) assert.ok(core.includes(`exercisePublicCollections(guestPickerPage,expect,'${locale}'${suffix})`))
  assert.ok(core.includes("guestPickerPage.goto(origin+'/es/client/tests')"))
  assert.ok(core.includes('exercisePortraitRays(portrait,expect,locale)'))
  assert.ok(core.includes("target.locator('[data-sitewide-personal-review-banner]')).toBeHidden()"))
  assert.ok(core.includes("target.locator('.ia222-bottom-navigation')).toBeHidden()"))
  const helper = read('scripts/helpers/public-discovery-verifier.mjs')
  for (const contract of ['toHaveAccessibleName', 'assert.deepEqual(shown,expected', 'readSelection(picker), preserved', "assert.deepEqual(writes, []", 'toHaveURL(currentUrl)', "locale === 'es' ? 'en' : locale"]) assert.ok(helper.includes(contract), contract)
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
  assertAfterIsolation(() => assert.equal(starts, 0, 'Account search must not start tests during effects or cleanup'))
  const render = () => renderWithEffects([parentHooks, pickerHooks], () => {
    const parent = TestExplorer({ locale, audience: 'account', authenticated: true, simpleMode: true, preserveScaleFilters: true, onStart: () => { starts++ } })
    pickerProps = parent.props; tree = SimpleTestPicker(pickerProps); return tree
  })
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

function collectionChipHarness(locale, fault = null, width = 390) {
  const react = hooks(), { SimpleTestPicker } = compile(pickerSource, react, modules)
  const catalogEntries = explorerModule.buildExplorerEntries({ locale: locale === 'es' ? 'en' : locale, audience: 'guest' })
  const collections = availableTestCollections(catalogEntries)
  const rawText = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(rawText).join('') : rawText(node.props.children)
  let root, heading, clicks = 0
  const render = () => {
    react.reset()
    const tree = SimpleTestPicker({ locale, authenticated: false, focus: [], recommendations: [], activeBattery: [], matchCount: 0, depth: 'balanced', maxMinutes: 0, catalogEntries })
    root = nodes(tree).find(node => node.props['data-test-topic-collections'])
    heading = nodes(root).find(node => node.type === 'h2')
    const cards = nodes(root).filter(node => node.props['data-test-collection'])
    const expanded = root.props['data-expanded'] === 'true'
    const collapsedCount = fault === 'legacyCollapsedCount' ? (width <= 760 ? 4 : 8) : 2
    // Match accepted CSS: display:none removes a card and its descendants from
    // the accessibility tree; the visible optional heading remains accessible.
    for (const [index, card] of cards.entries()) for (const node of nodes(card)) node.cssHidden = !expanded && index >= collapsedCount
    if (fault === 'missingHeading') heading.type = 'p'
    if (fault === 'missingOptionalQualifier') heading.props.children = heading.props.children.replace(/ \(.*\)$/, '')
    if (fault === 'hiddenHeading') heading.props['aria-hidden'] = true
    if (fault === 'wrongBinding') root.props['aria-labelledby'] = 'wrong-heading'
    if (fault === 'wrongName') cards[0].props['aria-label'] = 'Stress only'
    if (fault === 'wrongHiddenName') cards.at(-1).props['aria-label'] = 'Hidden incorrect source label'
    if (fault === 'wrongCount') nodes(cards[0]).find(node => node.props.className === 'curatedCardBottom').props.children[0].props.children = 999
    if (fault === 'wrongTitle') nodes(cards[0]).find(node => node.type === 'strong').props.children = 'Incorrect title'
    if (fault === 'description') cards[0].props.children.push(jsx('small', { children: 'Removed description' }))
    if (fault === 'missingCard') cards[0].props['data-test-collection'] = undefined
    if (fault === 'expandedHidden' && expanded) for (const node of nodes(cards.at(-1))) node.cssHidden = true
    if (fault === 'expandedInaccessible' && expanded) cards.at(-1).props['aria-hidden'] = true
    if (fault === 'wrongCollapsedOrder' && !expanded) {
      for (const node of nodes(cards[0])) node.cssHidden = true
      for (const node of nodes(cards.at(-1))) node.cssHidden = false
    }
    return root
  }
  const hidden = node => node.cssHidden || node.props['aria-hidden'] === true || node.props['aria-hidden'] === 'true'
  const locator = query => ({
    list: query,
    nth(index) { return locator(() => query().slice(index, index + 1)) },
    locator(selector) {
      return locator(() => query().flatMap(nodes).flatMap(node => {
        if (selector === '[data-test-collection]' || selector === '[data-test-collection]:visible') return node.props['data-test-collection'] && (!selector.endsWith(':visible') || !node.cssHidden) ? [node] : []
        if (selector === 'button[aria-controls="hh-test-curated-grid"]') return node.type === 'button' && node.props['aria-controls'] === 'hh-test-curated-grid' ? [node] : []
        if (selector === 'strong' || selector === 'small') return node.type === selector ? [node] : []
        assert.equal(selector, 'span[aria-hidden="true"] > span')
        return node.type === 'span' && node.props['aria-hidden'] === 'true' ? [].concat(node.props.children).filter(child => child?.type === 'span') : []
      }))
    },
    getByRole(role, options) {
      assert.equal(role, 'heading'); assert.equal(options.level, 2); assert.equal(options.exact, true)
      return locator(() => query().flatMap(nodes).filter(node => node.type === 'h2' && !hidden(node) && accessibleText(node) === options.name))
    },
    async click() {
      const values = query(); assert.equal(values.length, 1); assert.ok(!hidden(values[0]))
      assert.equal(values[0].props['aria-controls'], 'hh-test-curated-grid')
      clicks++
      if (fault !== 'blockedExpansion' && !(fault === 'blockedCollapse' && clicks > 1)) values[0].props.onClick()
    },
  })
  const expect = value => ({
    async toHaveCount(count) { assert.equal(value.list().length, count) },
    async toBeVisible() { const values = value.list(); assert.equal(values.length, 1); assert.ok(!values[0].cssHidden) },
    async toBeHidden() { const values = value.list(); assert.equal(values.length, 1); assert.equal(values[0].cssHidden, true) },
    async toHaveAttribute(name, expected) { const values = value.list(); assert.equal(values.length, 1); assert.equal(String(values[0].props[name]), expected) },
    async toHaveText(expected) { const values = value.list(); assert.equal(values.length, 1); assert.equal(rawText(values[0]), expected) },
    async toHaveAccessibleName(expected) {
      const values = value.list(); assert.equal(values.length, 1); const node = values[0]
      const label = hidden(node) ? '' : node.props['aria-label'] ?? (node.props['aria-labelledby'] ? accessibleText(nodes(root).find(item => item.props.id === node.props['aria-labelledby'])) : accessibleText(node))
      assert.equal(label, expected)
    },
  })
  return { root: locator(() => [render()]), expect, collections, width, heading: () => { render(); return heading }, clicks: () => clicks }
}
for (const locale of ['en', 'ru', 'es']) for (const width of [390, 760, 761, 1280]) test(locale + ' collection disclosure preserves every source chip and verifies visible accessibility at ' + width + 'px', async () => {
  const h = collectionChipHarness(locale, null, width)
  const hidden = h.root.locator('[data-test-collection]').nth(2)
  await assert.rejects(h.expect(hidden).toHaveAccessibleName('A CSS-hidden chip cannot expose its aria-label'))
  await h.expect(hidden).toHaveAccessibleName('')
  await assertPublicCollectionChips(h.root, h.expect, locale, h.collections, h.width)
  assert.notEqual(h.heading().props.className, 'curatedSrOnly')
  await h.expect(h.root.getByRole('heading', {name: h.heading().props.children, level: 2, exact: true})).toBeVisible()
  assert.equal(h.clicks(), 2, 'Real expansion and collapse handlers must both run')
})
for (const fault of ['missingHeading', 'missingOptionalQualifier', 'legacyCollapsedCount', 'hiddenHeading', 'wrongBinding', 'wrongName', 'wrongHiddenName', 'wrongCount', 'wrongTitle', 'description', 'missingCard', 'expandedHidden', 'expandedInaccessible', 'wrongCollapsedOrder', 'blockedExpansion', 'blockedCollapse']) test('compact collection proof rejects ' + fault, async () => {
  const h = collectionChipHarness('en', fault)
  await assert.rejects(assertPublicCollectionChips(h.root, h.expect, 'en', h.collections, h.width))
})
test('visible optional heading and two-chip collapsed layout keep expansion and interaction checks strict', () => {
  const css = read('components/app/simple-test-picker.module.css')
  const rule = css.match(/\.curatedSrOnly\s*\{([^}]+)\}/)?.[1]
  assert.ok(rule)
  for (const declaration of [/position:\s*absolute/, /width:\s*1px/, /height:\s*1px/, /clip:\s*rect\(0, 0, 0, 0\)/]) assert.match(rule, declaration)
  assert.doesNotMatch(rule, /display:\s*none|visibility:\s*hidden/)
  assert.match(css, /\.curatedCard:nth-child\(n\+3\)\s*\{\s*display:\s*none/)
  assert.match(css, /\.curated\[data-expanded="true"\] \.curatedCard\s*\{\s*display:\s*flex/)
  assert.doesNotMatch(css, /\.curatedCard:nth-child\(n\+(?:5|9)\)/)
  const helper = read('scripts/helpers/public-discovery-verifier.mjs')
  assert.match(helper, /await assertPublicCollectionChips\(root, expect, locale, collections, width\)/)
  for (const guard of ["'aria-pressed', 'true'", 'assert.deepEqual(shown,expected', 'readSelection(picker), preserved', 'toHaveURL(currentUrl)', 'assert.deepEqual(writes, []', 'expectedSearch']) assert.ok(helper.includes(guard), guard)
})

for (const name of ['./unreviewed-discovery-child', '@/lib/unreviewed-discovery-module', './unreviewed-discovery.module.css']) test('discovery module map rejects unknown import ' + name, () => {
  assert.throws(() => compile(`import * as unreviewed from '${name}'; export const result = unreviewed.value`, hooks()), /Unexpected dependency:/)
})

test('real research directory remains an unmounted function boundary in simple-mode exploration', () => {
  const actual = compile(read('components/app/research-directory.jsx'), hooks())
  assert.equal(typeof actual.ResearchDirectory, 'function')
  const source = parentSource.replace("import { ResearchDirectory } from './research-directory'", "import { ResearchDirectory } from './research-directory'; export { ResearchDirectory }")
  assert.notEqual(source, parentSource)
  const loaded = compile(source, hooks(), modules)
  assert.equal(typeof loaded.ResearchDirectory, 'function')
  assert.equal(loaded.ResearchDirectory.toString(), actual.ResearchDirectory.toString(), 'The strict map loads independently compiled real research source, not a no-op leaf')
  const directory = actual.ResearchDirectory({ locale: 'en' })
  assert.equal(directory.props['data-research-directory'], true)
  assert.ok(nodes(directory).some(node => node.type === 'h3' && accessibleText(node) === 'Scientific test reference library'))
  assert.equal(nodes(directory).filter(node => node.type === 'button').length, 0, 'Initial research metadata has no questionnaire Start action')
  const tree = loaded.TestExplorer({ locale: 'en', audience: 'guest', simpleMode: true })
  assert.equal(tree.type, 'SimpleTestPicker')
  assert.equal(nodes(tree).some(node => node.type === loaded.ResearchDirectory), false)
})
