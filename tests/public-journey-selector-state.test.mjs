import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { assertBusinessOfferChoices } from '../scripts/helpers/public-journey-verifier.mjs'

// Capability-free source replay: no browser, server, provider or contact handler.
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const ast = source => ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
function find(source, predicate) {
  let found
  const visit = node => { if (!found && predicate(node)) found = node; ts.forEachChild(node, visit) }
  visit(ast(source)); assert.ok(found, 'Required source node exists'); return found
}
function constant(source, name) {
  const node = find(source, item => ts.isVariableDeclaration(item) && item.name.getText() === name)
  const initial = ts.isAsExpression(node.initializer) ? node.initializer.expression : node.initializer
  return vm.runInNewContext('(' + initial.getText() + ')', Object.create(null), { timeout: 1000 })
}
const children = node => [node?.props?.children].flat(Infinity).filter(value => value && typeof value === 'object')
const descendants = node => children(node).flatMap(child => [child, ...descendants(child)])
function attachParents(node) { for (const child of children(node)) { child.parent = node; attachParents(child) } return node }
const text = node => [node?.props?.children].flat(Infinity).map(child => child && typeof child === 'object' ? text(child) : child ?? '').join('')
const jsx = (type, props = {}, key) => typeof type === 'function' ? type(props) : ({ type, props, key })
function compile(source, modules) {
  const exports = {}
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true })
  assert.deepEqual(result.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error), [])
  vm.runInNewContext(result.outputText, { exports, require: name => {
    assert.ok(Object.hasOwn(modules, name), 'Only inert explicit modules: ' + name); return modules[name]
  } }, { timeout: 1000 })
  return exports
}
class Locator {
  constructor(nodes) { this.nodes = nodes }
  locator(selector) {
    let found
    if (selector === ':scope > div > details') found = this.nodes.flatMap(node => children(node).filter(child => child.type === 'div').flatMap(children).filter(child => child.type === 'details'))
    else if (selector === 'xpath=preceding-sibling::*[1]') found = this.nodes.map(node => children(node.parent)[children(node.parent).indexOf(node) - 1]).filter(Boolean)
    else if (selector === ':scope > span') found = this.nodes.flatMap(children).filter(node => node.type === 'span')
    else if (selector === '[data-business-direct-option]') found = this.nodes.flatMap(descendants).filter(node => Object.hasOwn(node.props, 'data-business-direct-option'))
    else if (['h3', 'details'].includes(selector)) found = this.nodes.flatMap(descendants).filter(node => node.type === selector)
    else throw new Error('Unsupported source selector: ' + selector)
    return new Locator(found)
  }
  last() { return new Locator(this.nodes.slice(-1)) }
  one() { assert.equal(this.nodes.length, 1, 'Strict source-node cardinality'); return this.nodes[0] }
  async count() { return this.nodes.length }
  async innerText() { return text(this.one()) }
  async getAttribute(name) { return this.one().props[name] }
  async isVisible() { this.one(); return true } // Structural replay only; real geometry stays in browser CI.
  async all() { return this.nodes.map(node => new Locator([node])) }
}
const asyncFunction = Object.getPrototypeOf(async () => {}).constructor

test('Business duration extraction uses each actual offer disclosure, not nested contact disclosures', async () => {
  const source = read('components/business-consulting-landing.tsx')
  const copy = constant(read('data/business-consulting-copy.ts'), 'businessConsultingCopy')
  const article = find(source, node => ts.isJsxElement(node) && node.openingElement.tagName.getText() === 'article' && node.openingElement.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText() === 'data-business-offer'))
  const browser = read('scripts/verify-business-quiz-mobile.mjs')
  const start = browser.indexOf('    const offerSnapshot=[]')
  const end = browser.indexOf('    assertBusinessOfferChoices(', start)
  assert.ok(start > 0 && end > start)
  const loop = browser.slice(start, end)
  assert.match(loop, /assert\.equal\(await duration\.count\(\),1/)
  // Match the three extra nested details reported in exact CI without executing
  // ContactChannelChooser, auth, API, consent, or provider code.
  const contactScaffold = () => jsx('section', { children: ['div', 'small', 'form'].flatMap(type => [jsx(type, { children: 'not an offer duration' }), jsx('details')]) })
  // Replay only the source-authored title closure; contactUrl and chooser remain inert stubs.
  const titleDeclarations = ['requestOption', 'requestServiceTitle'].map(name =>
    'const ' + find(source, node => ts.isVariableDeclaration(node) && node.name.getText() === name).getText() + ';').join('\n')
  const bindServiceTitle = compile('export const bind = t => {' + titleDeclarations + 'return requestServiceTitle}', {}).bind
  function cards(locale, snippet = article.getText()) {
    return Array.from(copy[locale].offers, (offer, index) => {
      const exports = compile('export const render=({offer,index,locale,offerImages,t,styles,Image,ChevronDown,ClipboardCheck,ArrowRight,AcquisitionEventLink,ContactChannelChooser,contactUrl,requestServiceTitle,freeHref,detailLabel,siteRequestLabel})=>(' + snippet + ')', { 'react/jsx-runtime': { jsx, jsxs: jsx } })
      return attachParents(exports.render({ offer, index, locale, offerImages: constant(source, 'offerImages'), t: copy[locale], styles: {}, Image: 'img', ChevronDown: 'svg', ClipboardCheck: 'svg', ArrowRight: 'svg',
        AcquisitionEventLink: props => jsx('a', { ...props, ...props.attributes }), ContactChannelChooser: contactScaffold,
        contactUrl: () => 'https://provider.invalid/not-navigated', requestServiceTitle: bindServiceTitle(copy[locale]), freeHref: '/unused', detailLabel: 'Details', siteRequestLabel: 'Website request' }))
    })
  }
  const replay = async (locale, snippet = loop, sourceCards = cards(locale)) => {
    const page = { locator: selector => { assert.equal(selector, '[data-business-service-cards] [data-business-offer]'); return new Locator(sourceCards) } }
    const offers = await new asyncFunction('page', 'assert', 'label', snippet + '\nreturn offerSnapshot')(page, assert, 'offline')
    assertBusinessOfferChoices({ heading: copy[locale].offersTitle, headingVisible: true, offers }, locale, 'source replay')
  }
  for (const locale of ['en', 'ru', 'es']) {
    await replay(locale)
    await assert.rejects(() => replay(locale, loop.replace("card.locator(':scope > div > details')", "card.locator('details')")), /exactly one public offer duration/)
    await assert.rejects(() => replay(locale, loop, cards(locale, article.getText().replace('{offer.time}', "{'changed public duration'}"))), /destination choices/)
    await assert.rejects(() => replay(locale, loop, cards(locale, article.getText().replace('<details className={styles.offerDetails}>', '<details /><details className={styles.offerDetails}>'))), /exactly one public offer duration/)
  }
})

test('Tantra readiness targets the actual labelled intent select even with the nested country select', async () => {
  const source = read('components/tantra-initiation-choice.tsx')
  const browser = read('scripts/verify-contact-channel-chooser-browser.mjs')
  const start = browser.indexOf('            if(item.tantra){')
  const end = browser.indexOf('              await verifyTantraChoice(', start)
  assert.ok(start > 0 && end > start)
  const ready = browser.slice(start + '            if(item.tantra){'.length, end)
  const exports = compile(source, { 'react/jsx-runtime': { jsx, jsxs: jsx }, react: { useState: () => ['free', () => {}], useEffect: () => {} },
    'lucide-react': { ChevronDown: 'svg' }, '@/components/contact-channel-chooser': { ContactChannelChooser: () => jsx('section', { children: jsx('select', { 'aria-label': 'Country calling code' }) }) },
    './tantra-free-initiation.module.css': { default: {} } })
  for (const locale of ['en', 'ru', 'es']) {
    const tree = exports.TantraInitiationChoice({ locale, options: ['free', 'personal', 'session', 'answers', 'feedback'].map(intent => ({ intent, label: intent, whatsappUrl: 'https://provider.invalid/not-navigated' })) })
    const nodes = descendants(tree)
    const intent = nodes.find(node => node.type === 'select' && node.props.id === 'tantra-request-' + locale)
    assert.ok(intent)
    assert.equal(nodes.filter(node => node.type === 'label' && node.props.htmlFor === intent.props.id).length, 1)
    const run = (snippet, allNodes = nodes) => new asyncFunction('page', 'locale', snippet)({ locator(selector) {
      assert.ok(selector.startsWith('[data-tantra-whatsapp-capture] select'))
      const id = selector.split('#')[1]
      const matches = allNodes.filter(node => node.type === 'select' && (!id || node.props.id === id))
      return { waitFor: async options => { assert.equal(options.state, 'visible'); assert.equal(matches.length, 1, 'Strict readiness select cardinality'); assert.equal(matches[0].props.id, intent.props.id) } }
    } }, locale)
    await run(ready)
    await assert.rejects(() => run(ready.replace("select#tantra-request-'+locale", "select'")), /Strict readiness select cardinality/)
    await assert.rejects(() => run(ready, [...nodes, intent]), /Strict readiness select cardinality/)
  }
})

test('Spanish Reiki flow replays actual online reset, explicit Toronto empty state and recovery', async () => {
  const hero = read('components/services-conversion-hero.tsx')
  const facets = constant(read('components/services-explorer-state.tsx'), 'facets')
  const choose = find(hero, node => ts.isFunctionDeclaration(node) && node.name?.getText() === 'chooseTopic').getText()
  const browser = read('scripts/verify-public-services-production.mjs')
  const start = browser.indexOf("    await esShowcase.locator('[data-services-kind=\"reiki\"]').click();")
  const end = browser.indexOf("    await esShowcase.locator('[data-services-kind=\"all\"]').click();", start)
  assert.ok(start > 0 && end > start)
  const flow = browser.slice(start, end)
  const replay = async (snippet, chooseSource = choose) => {
    const state = { mode: 'toronto', topic: 'business' }
    const scope = { setManual: () => {}, setRequestOpen: () => {}, setTopic: value => { state.topic = value }, setMode: value => { state.mode = value }, setIndex: () => {}, slides: constant(hero, 'slides') }
    const compiled = ts.transpileModule(chooseSource + ';globalThis.chooseTopic=chooseTopic', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
    vm.runInNewContext(compiled, scope, { timeout: 1000 })
    const matches = () => Object.entries(facets).filter(([, offer]) => offer.modes.includes(state.mode) && offer.topics.includes(state.topic)).map(([id]) => id)
    const locator = selector => ({ selector, click: async () => {
      if (selector === '[data-services-kind="reiki"]') scope.chooseTopic('reiki')
      else if (selector === '[data-services-mode="toronto"]') state.mode = 'toronto'
      else if (selector === '[data-services-empty] button') { assert.equal(matches().length, 0, 'Recovery needs the actual empty state'); state.mode = 'online' }
      else throw new Error('Unexpected interaction: ' + selector)
    } })
    const expect = ({ selector }) => ({
      toHaveAttribute: async (name, value) => { assert.equal(selector, '[data-services-mode="online"]'); assert.equal(name, 'aria-pressed'); assert.equal(String(state.mode === 'online'), value, 'Reiki selects Online') },
      toBeVisible: async () => {
        if (selector === '[data-services-empty]') assert.equal(matches().length, 0, 'Empty state requires explicit Toronto mode')
        else { assert.equal(selector, '[data-services-studio-card="remote-energy-support"]'); assert.ok(matches().includes('remote-energy-support'), 'Online Reiki offer stays discoverable') }
      },
      toBeHidden: async () => { assert.equal(selector, '[data-services-studio-paid]'); assert.equal(matches().length, 0) },
    })
    await new asyncFunction('esShowcase', 'page', 'expect', snippet)({ locator }, { locator }, expect)
    assert.deepEqual(state, { mode: 'online', topic: 'reiki' })
  }
  await replay(flow)
  await assert.rejects(() => replay(flow.replace("    await esShowcase.locator('[data-services-mode=\"toronto\"]').click();\n", '')), /Empty state requires explicit Toronto/)
  await assert.rejects(() => replay(flow, choose.replace('if (kind === "reiki" || kind === "free") setMode("online");', '')), /Reiki selects Online/)
  await assert.rejects(() => replay(flow.replace("    await esShowcase.locator('[data-services-empty] button').click();\n", '')), /Reiki selects Online/)
  assert.match(hero, /count === 0 \? <div[^>]+data-services-empty/)
  assert.match(hero, /onClick=\{\(\) => setMode\("online"\)\}\>\{t.switchOnline\}/)
})
