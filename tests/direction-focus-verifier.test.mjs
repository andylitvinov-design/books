import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { getTopicJourney } from '../lib/assessments/topic-journeys.js'
import { assertDirectionTestState, directionTestContract } from '../scripts/helpers/direction-focus-verifier.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('scripts/verify-direction-focus-mobile.mjs')
const code = ts.transpileModule(read('components/direction-offers.tsx'), { fileName: 'direction-offers.tsx',
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText
const jsx = (type, props) => ({ type, props: props || {} })
const nodes = tree => tree == null || typeof tree !== 'object' ? []
  : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]
const by = (tree, key, value) => nodes(tree).filter(node => node.props?.[key] === value)

// Execute the current component's state transitions and verifier selectors using
// synthetic DOM-shaped nodes. This is NOT proof of browser hydration or geometry.
function fixture(locale, direction, mutate = () => {}) {
  const journey = getTopicJourney(direction)
  const ids = journey.topics.map(topic => topic.id)
  const contract = directionTestContract(locale, direction, ids)
  const state = []
  let cursor = 0
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: ({ children }) => children },
    'next/image': { __esModule: true, default: props => jsx('img', props) },
    'next/link': { __esModule: true, default: props => jsx('a', props) },
    '@/components/home-free-diagnosis-banner': { HomeFreeDiagnosisBanner: props => jsx('aside', props) },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    react: { useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial
      return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next }] } },
    '@/lib/assessments/topic-journeys': { journeyFocusForTopics: (j, selected) => j.topics.find(t => t.id === selected[0])?.focus || j.focus },
    './direction-offers.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) },
  }
  const exports = {}
  runInNewContext(code, { exports, require: name => {
    assert.ok(Object.hasOwn(modules, name), 'Known source dependency: ' + name); return modules[name]
  } })
  const render = () => {
    cursor = 0
    const tree = exports.DirectionOffers({ locale, journey, suggestions: contract.suggestions })
    mutate(tree)
    return tree
  }
  const attr = (node, key) => node.props[key] == null ? null : String(node.props[key])
  const matches = (node, selector) => {
    const tag = selector.match(/^[a-z]+/)?.[0]
    if (tag && node.type !== tag) return false
    const attributes = [...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)]
    assert.ok(attributes.length > 0, 'Mock must not silently accept an unknown selector: ' + selector)
    return attributes.every(([, key, value]) => value === undefined ? node.props[key] != null : attr(node, key) === value)
  }
  const scoped = (parents, selector) => selector.split(/\s+/).reduce((items, part) =>
    items.flatMap(parent => nodes(parent.props?.children).filter(node => matches(node, part))), parents)
  const dom = node => ({ getAttribute: key => attr(node, key), getBoundingClientRect: () => ({ height: 180 }) })
  const locator = resolve => ({
    locator: selector => locator(() => scoped(resolve(), selector)),
    count: async () => resolve().length,
    getAttribute: async key => { const result = resolve(); assert.equal(result.length, 1, 'Strict unique locator'); return attr(result[0], key) },
    evaluateAll: async callback => callback(resolve().map(dom)),
    evaluate: async callback => { const result = resolve(); assert.equal(result.length, 1); return callback(dom(result[0])) },
    click: async () => { const result = resolve(); assert.equal(result.length, 1, 'Strict unique clickable locator');
      assert.equal(result[0].type, 'button', 'Never navigate into a questionnaire or submit a form');
      assert.equal(result[0].props.type, 'button'); result[0].props.onClick() },
  })
  const page = {
    locator: selector => locator(() => scoped([{ props: { children: render() } }], selector)),
    waitForFunction: async (callback, arg) => {
      const document = { querySelector: selector => {
        const found = scoped([{ props: { children: render() } }], selector)
        assert.equal(found.length, 1, 'Wait targets one real control'); return dom(found[0])
      } }
      assert.equal(runInNewContext('(' + callback.toString() + ')(arg)', { document, arg }), true, 'State wait must observe the transition')
    },
  }
  return { page, contract, ids }
}

const journeyBody = source.slice(source.indexOf('        const contract = directionTestContract'), source.indexOf('      } finally'))
assert.ok(journeyBody.startsWith('        const contract = directionTestContract'), 'Execute the real integrated verifier journey')
const runJourney = new (Object.getPrototypeOf(async function () {}).constructor)(
  'page', 'panel', 'locale', 'direction', 'ids', 'name', 'directionTestContract', 'assertDirectionTestState', 'assert', journeyBody)

for (const locale of ['en', 'ru', 'es']) for (const direction of ['energy', 'love', 'business']) {
  test(locale + '/' + direction + ' actual source passes initial, promoted, reset and 2→4→2 verifier flow', async () => {
    const { page, ids } = fixture(locale, direction)
    await runJourney(page, page.locator('[data-direction-topic-finder]'), locale, direction, ids,
      locale + '/' + direction, directionTestContract, assertDirectionTestState, assert)
  })
}

const firstTest = tree => by(tree, 'data-offer-type', 'test')[0]
const testAction = card => by(card, 'data-offer-action', 'test')[0]
const replaceHref = href => tree => { testAction(firstTest(tree)).props.href = href }
const invalid = [
  ['old filtered picker', replaceHref('/en/client/tests?focus=stress&journey=energy&topics=sleep'), /starts one questionnaire/],
  ['Spanish runner rather than English fallback', replaceHref('/es/client?startTests=hh-weekly-pulse'), /supported guest locale/],
  ['Russian runner for Spanish', replaceHref('/ru/client?startTests=hh-weekly-pulse'), /supported guest locale/],
  ['external destination', replaceHref('https://example.invalid/en/client?startTests=hh-weekly-pulse'), /supported guest locale/],
  ['extra private query', replaceHref('/en/client?startTests=hh-weekly-pulse&concern=private'), /public key only/],
  ['duplicated key parameter', replaceHref('/en/client?startTests=hh-weekly-pulse&startTests=hh-resource-pulse'), /public key only/],
  ['unknown questionnaire', replaceHref('/en/client?startTests=missing-test'), /guest-startable/],
  ['eligible but unrelated questionnaire', replaceHref('/en/client?startTests=hh-closeness-compass'), /belongs to this topic/],
  ['secondary suggestion incorrectly promoted', replaceHref('/en/client?startTests=hh-resource-pulse'), /primary suggestion/],
  ['wrong article identity', tree => { firstTest(tree).props['data-offer-id'] = 'sleep' }, /reset restores/],
  ['wrong article index', tree => { firstTest(tree).props['data-offer-index'] = 2 }, /displayed card order/],
  ['extra duplicate action', tree => { const card = firstTest(tree); card.props.children = [card.props.children, testAction(card)] }, /one test action per/],
  ['only one card', tree => { const list = by(tree, 'id', 'hh-direction-offers-test')[0]; list.props.children = list.props.children.slice(0, 1) }, /Exactly two initial/],
  ['three initial cards', tree => { const list = by(tree, 'id', 'hh-direction-offers-test')[0]; list.props.children = [...list.props.children, list.props.children[0]] }, /Exactly two initial/],
  ['wrong expansion accessibility target', tree => { by(tree, 'data-direction-show-more', 'test')[0].props['aria-controls'] = 'other-list' }, /controls its test list/],
  ['missing list semantics', tree => { by(tree, 'id', 'hh-direction-offers-test')[0].props.role = null }, /one test list/],
  ['expanding unrelated courses', tree => { by(tree, 'data-direction-show-more', 'course')[0].props['aria-expanded'] = true }, /stays independent/],
]
for (const [label, mutate, error] of invalid) test('rejects ' + label, async () => {
  const { page, contract } = fixture('es', 'energy', mutate)
  await assert.rejects(assertDirectionTestState(page, contract), error)
})

test('rejects first-two duplicate destinations even when both are relevant and eligible', async () => {
  const { page, contract } = fixture('en', 'love', tree => {
    const cards = by(tree, 'data-offer-type', 'test')
    testAction(cards[1]).props.href = testAction(cards[0]).props.href
  })
  await assert.rejects(assertDirectionTestState(page, contract), /destinations are distinct/)
})

for (const [field, value] of [['guestEligible', false], ['guestEligible', 'true'], ['startable', false], ['selectable', false],
  ['starterEligible', false], ['rightsStatus', 'restricted'], ['definition', null]]) {
  test('rejects catalog eligibility regression: ' + field, async () => {
    const { page, contract } = fixture('en', 'energy')
    const key = contract.suggestions[''][0].key
    contract.catalog.set(key, { ...contract.catalog.get(key), [field]: value })
    await assert.rejects(assertDirectionTestState(page, contract), /guest-startable and rights-cleared/)
  })
}

for (const [label, mutate, error] of [
  ['selection that does not promote selected topic', tree => { by(tree, 'data-direction-filter', 'sleep')[0].props.onClick = () => {} }, /State wait/],
  ['reset that leaves selected cards', tree => { by(tree, 'data-direction-filter', 'all')[0].props.onClick = () => {} }, /State wait/],
  ['expansion that does not run', tree => { by(tree, 'data-direction-show-more', 'test')[0].props.onClick = () => {} }, /State wait/],
  ['expansion to only three cards', tree => { const list = by(tree, 'id', 'hh-direction-offers-test')[0]; if (list.props.children.length === 4) list.props.children = list.props.children.slice(0, 3) }, /Exactly two initial/],
  ['Spanish catalog handoff incorrectly falls back to English', tree => { const link = by(tree, 'data-direction-all', 'test')[0]; if (link) link.props.href = '/en/client/tests?catalog=full' }, /public locale/],
]) test('whole journey rejects ' + label, async () => {
  const { page, ids } = fixture('es', 'energy', mutate)
  await assert.rejects(runJourney(page, page.locator('[data-direction-topic-finder]'), 'es', 'energy', ids,
    'es/energy', directionTestContract, assertDirectionTestState, assert), error)
})

test('whole journey still rejects a real change in measured panel height', async () => {
  const { page, ids } = fixture('en', 'energy')
  const panel = page.locator('[data-direction-topic-finder]')
  let measured = 0
  panel.evaluate = async callback => callback({ getBoundingClientRect: () => ({ height: 180 + measured++ }) })
  await assert.rejects(runJourney(page, panel, 'en', 'energy', ids, 'en/energy',
    directionTestContract, assertDirectionTestState, assert), /cannot shift the filter/)
})

test('original mobile geometry, failure propagation, loopback restriction and cleanup remain intact', () => {
  const geometry = source.slice(source.indexOf('        for (const width of widths)'), source.indexOf('        // Real hydration'))
  assert.equal(createHash('sha256').update(geometry).digest('hex'), '3420741ccdb5695e7a91a438e4dc54145f65508a03b7428be5a92e7b9057d511')
  assert.match(source, /const widths = \[320, 375, 430\]/)
  assert.match(source, /assert\.ok\(Math\.abs\(\(await panel\.evaluate\(node => node\.getBoundingClientRect\(\)\.height\)\) - heightBefore\) < 1/)
  assert.match(source, /throw new Error\('Direction browser verification must use an isolated loopback server'\)/)
  assert.match(source, /finally \{\s+await context\.close\(\)/)
  assert.match(source, /finally \{\s+await browser\.close\(\)/)
  assert.doesNotMatch(source + read('scripts/helpers/direction-focus-verifier.mjs'), /\.first\(|force:\s*true|dispatchEvent|\.fill\(|\.route\(|\.catch\(/)
  assert.doesNotMatch(source, /page\.locator\('\[data-offer-action="test"\]'\)/)
  assert.equal(source.includes("searchParams.get('topics')"), false)
})
