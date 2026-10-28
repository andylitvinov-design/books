import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as review from '../lib/business-consulting/review-context.js'
import * as remote from '../lib/practitioners/remote-energy-support.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
// Synthetic navigation fixture; no assessment catalog/runner or backend is loaded.
const businessJourney = {
  id: 'business', focus: ['resources'],
  topics: review.BUSINESS_REVIEW_TOPIC_IDS.map(id => ({ id, title: review.BUSINESS_REVIEW_TOPICS[id],
    detail: { en: 'Synthetic detail', ru: 'Синтетический пример', es: 'Detalle sintético' }, focus: ['resources'] })),
}
const getTopicJourney = slug => slug === 'business' ? businessJourney : null
const journeyFocusForTopics = () => ['resources']
const blocked = operation => () => { throw new Error('Unexpected side effect: ' + operation) }
const fields = tree => {
  const output = []
  const visit = node => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    output.push(node)
    visit(node.props?.children)
  }
  visit(tree)
  return output
}
const find = (tree, attribute, value) => fields(tree).find(node => node.props?.[attribute] === value)
const text = node => {
  if (Array.isArray(node)) return node.map(text).join('')
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node !== 'object') return String(node)
  return text(node.props?.children)
}

// Execute only transpiled client component functions with synthetic hooks/DOM.
// No real browser, Next server, form submit, backend, provider or fixture DB.
function componentHarness(path, exportName, props, options = {}) {
  const slots = [], effects = [], refs = [], listeners = new Map()
  let cursor = 0, dirty = true, tree, stageCalls = 0
  const hooks = {
    useState(initial) {
      const index = cursor++
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
      return [slots[index], value => {
        const next = typeof value === 'function' ? value(slots[index]) : value
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true }
      }]
    },
    useRef(initial) {
      const index = cursor++
      if (!(index in slots)) { slots[index] = { current: initial }; refs.push(slots[index]) }
      return slots[index]
    },
    useEffect(callback, deps) {
      const index = cursor++
      const previous = slots[index]
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous[i]))) {
        slots[index] = deps
        effects.push(callback)
      }
    },
  }
  const jsx = (type, props) => ({ type, props: props || {} })
  class FakeElement {
    constructor(attributes) { this.attributes = attributes }
    closest(selector) { assert.equal(selector, '[data-business-direct-option]'); return this }
    getAttribute(name) { return this.attributes[name] ?? null }
  }
  const fakeWindow = {
    location: { search: options.search || '', hash: '' },
    matchMedia: () => ({ matches: true }),
    localStorage: new Proxy({}, { get: blocked('localStorage') }),
    sessionStorage: new Proxy({}, { get: blocked('sessionStorage') }),
    fetch: blocked('window.fetch'),
    open: blocked('window.open'),
  }
  const fakeDocument = {
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
    get cookie() { throw new Error('Unexpected cookie read') },
    set cookie(_) { throw new Error('Unexpected cookie write') },
  }
  const allowed = {
    react: hooks,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'next/link': { default: 'a' }, 'next/image': { default: 'img' },
    'lucide-react': new Proxy({}, { get: (_, key) => String(key) }),
    '@/components/ideas-discovery': { IdeasDiscovery: 'IdeasDiscovery' },
    '@/components/home-free-diagnosis-banner': { HomeFreeDiagnosisBanner: 'HomeFreeDiagnosisBanner' },
    '@/components/phone-country-input': { PhoneCountryInput: 'PhoneCountryInput' },
    '@/lib/business-consulting/intake-policy': { parseBusinessReplyContact: blocked('contact parsing/submission') },
    '@/lib/business-consulting/review-context': review,
    '@/lib/assessments/topic-journeys': { getTopicJourney, journeyFocusForTopics },
    '@/lib/practitioners/remote-energy-support': {
      stageRemoteSupportLandingIntention: value => { stageCalls++; remote.stageRemoteSupportLandingIntention(value) },
    },
  }
  const compiledModule = { exports: {} }
  const compiled = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  })
  assert.deepEqual(compiled.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error), [])
  const context = {
    module: compiledModule, exports: compiledModule.exports,
    require(name) {
      if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => String(key) }) }
      if (Object.hasOwn(allowed, name)) return allowed[name]
      throw new Error('Unexpected import: ' + name)
    },
    window: fakeWindow, document: fakeDocument, Element: FakeElement,
    URLSearchParams, fetch: blocked('fetch'), navigator: { sendBeacon: blocked('sendBeacon') },
    console, setTimeout: blocked('timer'), setInterval: blocked('timer'),
  }
  vm.runInNewContext(compiled.outputText, context, { timeout: 2000, filename: path })
  function render() {
    let passes = 0
    do {
      if (++passes > 8) throw new Error('Synthetic render did not settle')
      dirty = false; cursor = 0
      tree = compiledModule.exports[exportName](props)
      while (effects.length) effects.shift()()
    } while (dirty)
    return tree
  }
  return { render, refs, get stageCalls() { return stageCalls },
    chooseFormat(value) {
      listeners.get('click')({ target: new FakeElement({ 'data-business-direct-option': value }) })
    },
  }
}

test('Business carries only the explicit allowlisted editorial enum, never free text', () => {
  const publishedTopics = read('lib/assessments/topic-journeys.js')
  for (const labels of Object.values(review.BUSINESS_REVIEW_TOPICS))
    for (const label of Object.values(labels)) assert.ok(publishedTopics.includes(label), 'Reuse current editorial copy: ' + label)
  for (const id of review.BUSINESS_REVIEW_TOPIC_IDS) {
    assert.equal(review.businessReviewQuery(id), '?businessTopic=' + id)
    for (const locale of ['en', 'ru', 'es']) {
      const result = review.readBusinessReviewContext('?businessTopic=' + id, locale)
      assert.equal(result.id, id)
      assert.equal(result.title, getTopicJourney('business').topics.find(topic => topic.id === id).title[locale])
    }
  }
  for (const value of ['', 'income', 'Money-beliefs', 'Synthetic private wish', '__proto__', '<script>', null, {}, ['decisions']]) {
    assert.equal(review.businessReviewQuery(value), '')
  }
  for (const query of ['?businessTopic=Synthetic%20private%20wish', '?businessTopic=decisions&businessTopic=work-stress',
    '?businessTopic=__proto__', '?businessTopic=decisions' + 'x'.repeat(2050)]) {
    assert.equal(review.readBusinessReviewContext(query, 'en'), null)
  }
  assert.equal(review.readBusinessReviewContext('?businessTopic=decisions', 'invalid'), null)
})

test('Actual DirectionOffers click selection reaches only the matching editorial topic URL', () => {
  for (const locale of ['en', 'ru', 'es']) {
    const component = componentHarness('components/direction-offers.tsx', 'DirectionOffers',
      { locale, journey: getTopicJourney('business'), suggestions: {} })
    let tree = component.render()
    for (const id of review.BUSINESS_REVIEW_TOPIC_IDS) {
      find(tree, 'data-direction-filter', id).props.onClick()
      tree = component.render()
      const card = find(tree, 'data-offer-id', 'primary-session')
      const link = find(card, 'data-offer-action', 'session')
      assert.equal(link.props.href, '/' + locale + '/services/business-consulting?businessTopic=' + id)
      assert.equal(link.props.prefetch, false, 'No context navigation before an explicit click')
    }
    find(tree, 'id', 'hh-direction-wish').props.onChange({ target: { value: 'SYNTHETIC PRIVATE WISH' } })
    tree = component.render()
    assert.ok(!find(find(tree, 'data-offer-id', 'primary-session'), 'data-offer-action', 'session').props.href.includes('PRIVATE'))
    find(tree, 'data-direction-filter', 'all').props.onClick()
    tree = component.render()
    assert.equal(find(find(tree, 'data-offer-id', 'primary-session'), 'data-offer-action', 'session').props.href,
      '/' + locale + '/services/business-consulting')
  }
})

test('Actual Business enquiry visibly labels context; personal answer and consent remain empty', () => {
  for (const locale of ['en', 'ru', 'es']) {
    const component = componentHarness('components/business-website-enquiry.tsx', 'BusinessWebsiteEnquiry',
      { locale }, { search: '?businessTopic=money-beliefs&businessFormat=mentoring' })
    let tree = component.render()
    const context = find(tree, 'data-business-review-context', 'money-beliefs')
    assert.ok(context)
    assert.equal(context.props.role, 'note')
    assert.ok(text(context).includes(getTopicJourney('business').topics.find(topic => topic.id === 'money-beliefs').title[locale]))
    assert.equal(find(tree, 'data-business-field', 'format').props.value, 'mentoring')
    const assertUntouched = value => {
      assert.equal(fields(value).find(node => node.type === 'textarea').props.value, '')
      assert.equal(fields(value).find(node => node.type === 'input' && node.props.type === 'checkbox').props.checked, false)
      assert.equal(fields(value).find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, true)
    }
    assertUntouched(tree)
    component.chooseFormat('full')
    tree = component.render()
    assert.equal(find(tree, 'data-business-field', 'format').props.value, 'full')
    assert.ok(find(tree, 'data-business-review-context', 'money-beliefs'))
    assertUntouched(tree)
  }
})

test('Unallowlisted or duplicate Business context is not rendered or copied as an answer', () => {
  for (const search of ['', '?businessTopic=SYNTHETIC_PRIVATE', '?businessTopic=decisions&businessTopic=money-beliefs']) {
    const component = componentHarness('components/business-website-enquiry.tsx', 'BusinessWebsiteEnquiry', { locale: 'en' }, { search })
    const tree = component.render()
    assert.equal(fields(tree).filter(node => node.props?.['data-business-review-context']).length, 0)
    assert.equal(fields(tree).find(node => node.type === 'textarea').props.value, '')
  }
})

const originalWindow = globalThis.window
globalThis.window = {}
test.after(() => {
  remote.stageRemoteSupportLandingIntention('')
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
})
const sameTab = { defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }
function holisticWithDraft(value, open = true) {
  const component = componentHarness('components/holistic-support-choices.tsx', 'HolisticSupportChoices', { locale: 'en' })
  let tree = component.render()
  const draft = { value }
  if (open) {
    find(tree, 'data-holistic-choose', 'dao').props.onClick()
    tree = component.render()
    component.refs[0].current = {
      querySelector(selector) { assert.equal(selector, '#ideas-question'); return draft },
      scrollIntoView() {},
    }
  }
  return { component, tree, draft, energy: find(tree, 'data-holistic-choose', 'energy') }
}

test('Actual Energy click alone stages the latest exact DAO field, once, without URL changes', () => {
  remote.stageRemoteSupportLandingIntention('SYNTHETIC OLD GLOBAL STAGE')
  const scene = holisticWithDraft('SYNTHETIC FIRST')
  assert.equal(scene.component.stageCalls, 0)
  scene.draft.value = 'SYNTHETIC EDITED'
  scene.energy.props.onClick(sameTab)
  assert.equal(scene.component.stageCalls, 1)
  assert.equal(scene.energy.props.href, '/en/services/remote-energy-support')
  assert.equal(scene.energy.props.prefetch, false)
  assert.equal(remote.takeRemoteSupportLandingIntention(), 'SYNTHETIC EDITED')
  assert.equal(remote.takeRemoteSupportLandingIntention(), '')
})

test('Cleared, unopened, or closed DAO plus Energy replaces an older global stage with empty', () => {
  for (const mode of ['cleared', 'unopened', 'closed']) {
    remote.stageRemoteSupportLandingIntention('SYNTHETIC OLD STAGE')
    const scene = holisticWithDraft('SYNTHETIC ORIGINAL', mode !== 'unopened')
    if (mode === 'cleared') scene.draft.value = ''
    if (mode === 'closed') scene.component.refs[0].current = null
    scene.energy.props.onClick(sameTab)
    assert.equal(scene.component.stageCalls, 1)
    assert.equal(remote.takeRemoteSupportLandingIntention(), '', mode + ' must clear stale text')
  }
})

test('Modifier/middle/defaultPrevented Energy clicks never stage private text', () => {
  for (const event of [
    { ...sameTab, button: 1 }, { ...sameTab, button: 2 }, { ...sameTab, defaultPrevented: true },
    ...['metaKey', 'ctrlKey', 'shiftKey', 'altKey'].map(key => ({ ...sameTab, [key]: true })),
  ]) {
    remote.stageRemoteSupportLandingIntention('')
    const scene = holisticWithDraft('SYNTHETIC PRIVATE')
    scene.energy.props.onClick(event)
    assert.equal(scene.component.stageCalls, 0)
    assert.equal(remote.takeRemoteSupportLandingIntention(), '')
  }
})

test('Existing bridge retains its 500-character cap, trim, expiry, one-use and memory-only boundary', () => {
  remote.stageRemoteSupportLandingIntention('  ' + 'x'.repeat(700) + '  ', 100)
  assert.equal(remote.takeRemoteSupportLandingIntention(101), 'x'.repeat(500))
  assert.equal(remote.takeRemoteSupportLandingIntention(102), '')
  remote.stageRemoteSupportLandingIntention('SYNTHETIC EXPIRED', 100)
  assert.equal(remote.takeRemoteSupportLandingIntention(100 + 5 * 60 * 1000 + 1), '')
  remote.stageRemoteSupportLandingIntention('SYNTHETIC FUTURE', 100)
  assert.equal(remote.takeRemoteSupportLandingIntention(99), '')
  const bridge = read('lib/practitioners/remote-energy-support.js').split('let pendingLandingIntention = null')[1]
  assert.doesNotMatch(bridge, /fetch\(|sendBeacon|sessionStorage|localStorage|document\.cookie/)
})

test('Restoration changes no payload, consent, new questions or provider operations', () => {
  const business = read('components/business-website-enquiry.tsx')
  const payload = business.match(/body:JSON.stringify\(\{([\s\S]*?)\}\),/)?.[1]
  assert.ok(payload, 'Existing submission payload remains inspectable')
  assert.doesNotMatch(payload, /reviewContext|businessTopic/)
  assert.match(business, /contactConsent:consent/)
  assert.match(business, /type="checkbox" required checked=\{consent\}/)
  const chooser = read('components/holistic-support-choices.tsx')
  assert.equal((chooser.match(/data-holistic-choose=/g) || []).length, 3)
  assert.match(chooser, /querySelector<HTMLTextAreaElement>\("#ideas-question"\)/)
  assert.doesNotMatch(chooser, /fetch\(|sendBeacon|sessionStorage|localStorage|<textarea|<input/)
  assert.doesNotMatch(read('lib/business-consulting/review-context.js'), /fetch\(|sendBeacon|localStorage|sessionStorage|setConsent|setQuestion/)
})
