import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {randomUUID} from 'node:crypto'
import ts from 'typescript'
import * as whatsapp from '../lib/whatsapp-enquiry.js'
import * as organic from '../lib/organic-event-referrals.js'
import * as paid from '../lib/paid-ad-referrals.js'
import * as input from '../lib/practitioners/public-service-enquiry-input.mjs'
import * as receipt from '../lib/practitioners/enquiry-receipt.mjs'

// Actual current TSX handlers, effects and pure input contracts, not a fake DOM.
// No browser, server, database, administrator, auth or live transport is imported.
// These tests establish state/handler/router-intent contracts. The browser
// adapter owns native validation, hydration, focus, layout and actual navigation.
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = Object.fromEntries(['free-drawing-intake', 'contact-channel-chooser',
  'compact-lead-capture', 'service-enquiry-thank-you'].map(name => [name, read('components/' + name + '.tsx')]))
const analyticsSource = read('lib/public-analytics.ts')
const CONTACT = 'free-review-component-fixture@example.invalid'
const REFERENCE = 'HH-F4E3D2C1B0A9'
const pathFor = locale => '/' + locale + '/services/free-situation-review'
const FOOTER_SERVICE = 'Free written Situation Review'
const copy = {
  en: {
    service: 'Coaching questionnaire — free drawing assessment', topic: 'Topic: Work or business',
    fields: ['Situation / problem', 'Desired goal', 'Perceived obstacle', 'Previous attempts'],
    request: 'Request: Please review my coaching answers and handwritten drawing (ME / MY GOAL / MY PROBLEM) and send me a personal written report.',
    ready: 'Your answers are ready to copy. Nothing has been sent.', button: 'Copy answers',
    copied: 'Copied — paste them into your chosen chat',
    fallback: 'Select and copy the text below, then paste it into your chosen chat.',
    reference: 'Enquiry',
  },
  ru: {
    service: 'Коучинг-форма — бесплатная диагностика по рисунку', topic: 'Тема: Работа и бизнес',
    fields: ['Ситуация / проблема', 'Желаемая цель', 'Предполагаемое препятствие', 'Что уже предпринимали'],
    request: 'Запрос: прошу провести диагностику по моим ответам и рисунку (Я / МОЯ ЦЕЛЬ / МОЯ ПРОБЛЕМА) и прислать персональный письменный отчёт.',
    ready: 'Ответы готовы к копированию. Пока ничего не отправлено.', button: 'Скопировать ответы',
    copied: 'Скопировано — вставьте в выбранный чат',
    fallback: 'Выделите и скопируйте текст ниже, затем вставьте его в выбранный чат.',
    reference: 'Заявка',
  },
}
const markers = locale => ['problem', 'goal', 'obstacle', 'tried'].map(name => 'SYNTHETIC_PRIVATE_' + name + '_' + locale)
const expectedAnswers = locale => [copy[locale].service, copy[locale].topic,
  ...markers(locale).map((value, i) => copy[locale].fields[i] + ': ' + value), '', copy[locale].request].join('\n')
const success = () => ({ok: true, status: 200, json: async () => ({saved: true, referenceCode: REFERENCE})})
const turn = async f => { await new Promise(resolve => setImmediate(resolve)); f.flush() }
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return {promise, resolve} }
const element = (type, props) => ({type, props: props || {}})
const empty = () => null
let nextInstance = 0

function environment(locale, {denyReceiptStorage = false} = {}) {
  const requests = [], writes = [], navigations = [], popups = [], events = [], frames = [], copies = []
  const storage = new Map()
  let respond = success, denyCopy = false
  const window = {
    crypto: {randomUUID},
    location: {pathname: pathFor(locale), search: '', href: 'http://127.0.0.1:3100' + pathFor(locale)},
    matchMedia: () => ({matches: true}),
    dispatchEvent: event => events.push(event.detail),
    sessionStorage: {
      getItem: key => storage.get(key) ?? null,
      removeItem: key => storage.delete(key),
      setItem: (key, value) => {
        assert.equal(key, receipt.RECEIPT_SESSION_KEY, 'Only the public receipt may be persisted')
        if (denyReceiptStorage) throw new Error('SYNTHETIC_RECEIPT_STORAGE_DENIED')
        writes.push([key, value]); storage.set(key, value)
      },
    },
    open: (url, target, features) => {
      assert.equal(url, 'about:blank'); assert.equal(target, '_blank'); assert.equal(features, undefined)
      const popup = {closed: false, opener: {}, destinations: [], close() { this.closed = true },
        location: {replace: destination => popup.destinations.push(destination)}}
      popups.push(popup); return popup
    },
  }
  return {
    window, requests, writes, navigations, popups, events, frames, copies, storage,
    document: {documentElement: {dataset: {analyticsConsent: 'granted'}}},
    navigator: {clipboard: {writeText: async value => {
      copies.push(value)
      if (denyCopy) throw new Error('SYNTHETIC_CLIPBOARD_DENIED')
    }}},
    setRespond: fn => { respond = fn }, setCopyDenied: value => { denyCopy = value },
    router: {push: path => navigations.push(path)},
    fetch: (url, options) => {
      assert.equal(url, '/api/service-enquiries', 'Any other API or external request is forbidden')
      assert.equal(options.method, 'POST'); assert.equal(options.credentials, 'same-origin')
      assert.equal(options.headers['Content-Type'], 'application/json')
      assert.equal(typeof options.body, 'string'); requests.push(options.body)
      return respond()
    },
  }
}

function compile(text, imports, env) {
  const loaded = {exports: {}}
  const code = ts.transpileModule(text, {compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText
  runInNewContext(code, {
    exports: loaded.exports, module: loaded,
    require: name => {
      if (name.endsWith('.module.css')) return {default: {}}
      assert.ok(Object.hasOwn(imports, name), 'Unexpected runtime dependency: ' + name)
      return imports[name]
    },
    window: env.window, document: env.document, navigator: env.navigator,
    fetch: env.fetch, URL, URLSearchParams, crypto: {randomUUID}, Date,
    requestAnimationFrame: callback => env.frames.push(callback),
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail } },
  })
  return loaded.exports
}

function mount(name, exportName, initialProps, env) {
  const instance = ++nextInstance, slots = []
  let index = 0, dirty = true, pending = [], tree, props = initialProps
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]))
  const hooks = {
    useState(initial) {
      const i = index++
      if (!slots[i]) slots[i] = {value: typeof initial === 'function' ? initial() : initial}
      return [slots[i].value, value => {
        const next = typeof value === 'function' ? value(slots[i].value) : value
        if (!Object.is(next, slots[i].value)) { slots[i].value = next; dirty = true }
      }]
    },
    useRef(initial) { const i = index++; return slots[i] || (slots[i] = {current: initial}) },
    useId() { return 'synthetic-free-review-' + instance + '-' + index++ },
    useEffect(effect, deps) {
      const i = index++
      if (!slots[i] || !same(slots[i].deps, deps)) {
        slots[i] = {deps, cleanup: slots[i]?.cleanup}
        pending.push(() => { slots[i].cleanup?.(); slots[i].cleanup = effect() })
      }
    },
  }
  hooks.useLayoutEffect = hooks.useEffect
  const analytics = compile(analyticsSource, {}, env)
  const imports = {
    react: hooks, 'react/jsx-runtime': {jsx: element, jsxs: element, Fragment: 'fragment'},
    'next/navigation': {usePathname: () => env.window.location.pathname, useRouter: () => env.router},
    'next/link': {default: 'a'}, 'next/image': {default: 'img'},
    'lucide-react': new Proxy({}, {get: () => empty}),
    '@/components/contact-channel-chooser': {ContactChannelChooser: 'chooser'},
    '@/components/acquisition-event-link': {AcquisitionEventLink: 'acquisition-link'},
    '@/components/phone-country-input': {PhoneCountryInput: 'phone-input'},
    '@/components/static-portrait': {StaticPortrait: empty},
    '@/components/public-site-header': {PublicSiteHeader: empty},
    '@/components/site-video-player': {SiteVideoPlayer: empty},
    '@/data/local-acquisition': {ACQUISITION_EVENTS: []},
    '@/lib/whatsapp-enquiry': whatsapp, '@/lib/public-analytics': analytics,
    '@/lib/organic-event-referrals': organic, '@/lib/paid-ad-referrals': paid,
    '@/lib/practitioners/public-service-enquiry-input.mjs': input,
    '@/lib/practitioners/enquiry-receipt.mjs': receipt,
  }
  const component = compile(source[name], imports, env)[exportName]
  function flush() {
    for (let count = 0; dirty; count++) {
      assert.ok(count < 30, 'Unexpected state/effect loop')
      dirty = false; index = 0; pending = []; tree = component(props)
      for (const effect of pending) effect()
    }
  }
  function nodes() {
    const result = []
    function walk(value) {
      if (Array.isArray(value)) { value.forEach(walk); return }
      if (!value || typeof value !== 'object' || !('type' in value)) return
      result.push(value); walk(value.props.children)
    }
    walk(tree); return result
  }
  const f = {
    env, flush, nodes,
    find(type, predicate = () => true) {
      const found = nodes().filter(node => node.type === type && predicate(node.props))
      assert.equal(found.length, 1, 'Expected exactly one ' + type)
      return found[0]
    },
    change(type, predicate, value) {
      f.find(type, predicate).props.onChange({target: {value, checked: value}}); flush()
    },
    click(type, predicate) { const result = f.find(type, predicate).props.onClick(); flush(); return result },
    async submit() {
      const result = f.find('form').props.onSubmit({preventDefault() {}})
      flush(); await result; flush()
    },
    update(value) { props = {...props, ...value}; dirty = true; flush() },
    unmount() { for (const slot of slots) slot?.cleanup?.() },
  }
  flush(); return f
}

async function preparedIntake(locale, env = environment(locale)) {
  const f = mount('free-drawing-intake', 'FreeDrawingIntake', {locale}, env)
  assert.equal(f.nodes().filter(node => node.props.role === 'region').length, 0)
  const questions = f.nodes().filter(node => node.type === 'textarea')
  assert.equal(questions.length, 4)
  assert.deepEqual(questions.map(node => Boolean(node.props.required)), [true, true, false, false])
  assert.deepEqual(questions.map(node => node.props.maxLength), [3000, 2000, 2000, 2000])
  // This is an actual topic button handler; optional disclosures are a browser concern.
  const topics = f.nodes().filter(node => node.type === 'button' && 'aria-pressed' in node.props)
  assert.equal(topics.length, 4); assert.equal(topics[0].props['aria-pressed'], true)
  topics[2].props.onClick(); f.flush()
  for (const [i, value] of markers(locale).entries()) {
    f.nodes().filter(node => node.type === 'textarea')[i].props.onChange({target: {value: '  ' + value + '  '}})
    f.flush()
  }
  assert.deepEqual(env.copies, []); assert.deepEqual(env.requests, []); assert.deepEqual(env.writes, [])
  await f.submit()
  return f
}

function assertNoPrivate(value, locale, extras = []) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  for (const marker of [...markers(locale), CONTACT, ...extras]) assert.ok(!text.includes(marker), 'Private value escaped its intended boundary')
}

function assertPayload(raw, locale, serviceTitle, description = '') {
  const body = JSON.parse(raw)
  assert.match(body.operationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  assert.deepEqual(body, {
    operationId: body.operationId, serviceTitle, description, sourcePath: pathFor(locale), locale,
    contact: {displayName: '', email: CONTACT, phone: ''}, contactConsent: true, website: '',
  })
  for (const marker of markers(locale)) assert.ok(!raw.includes(marker))
}

function assertReceipt(env, denied) {
  if (denied) { assert.deepEqual(env.writes, []); assert.equal(env.storage.size, 0); return }
  assert.equal(env.writes.length, 1); assert.equal(env.writes[0][0], receipt.RECEIPT_SESSION_KEY)
  const value = JSON.parse(env.writes[0][1])
  assert.deepEqual(Object.keys(value).sort(), ['createdAt', 'referenceCode'])
  assert.equal(value.referenceCode, REFERENCE); assert.ok(Number.isSafeInteger(value.createdAt))
  assert.deepEqual(receipt.parseEnquiryReceipt(value), value)
}

function assertLink(props, channel, locale, service) {
  const url = new URL(props.href)
  assert.equal(url.origin, channel === 'whatsapp' ? 'https://wa.me' : 'https://t.me')
  assert.equal(url.pathname, channel === 'whatsapp' ? '/14376066502' : '/AndyTherapist')
  assert.ok(!url.username && !url.password && !url.port && !url.hash)
  assert.deepEqual([...url.searchParams.keys()], ['text'])
  assert.equal(props.target, '_blank')
  assert.deepEqual(props.rel.split(/\s+/).sort(), ['noopener', 'noreferrer'])
  const text = url.searchParams.get('text')
  assert.ok(text.includes(service)); assert.ok(text.includes(REFERENCE))
  assert.ok(text.includes('https://holistichouse.vercel.app' + pathFor(locale)))
  assertNoPrivate(text, locale)
  assert.doesNotMatch(text, /operationId|contactConsent|\/api\/|\/app\/|\/auth\/|\/checkout\//)
  return text
}

for (const locale of ['en', 'ru']) {
  test(locale + ': actual drawing handlers prepare private preview, copy, denial and recovery without transmission', async () => {
    const f = await preparedIntake(locale), env = f.env
    const ready = f.find('div', props => props.role === 'region')
    assert.equal(ready.props['aria-label'], copy[locale].ready)
    assert.equal(ready.props['aria-live'], 'polite'); assert.equal(ready.props.tabIndex, -1)
    assert.equal(env.frames.length, 1, 'Preparation requests a later focus attempt')
    assert.equal(f.find('textarea', props => props.readOnly).props.value, expectedAnswers(locale))
    const chooser = f.find('chooser').props
    assert.deepEqual(Object.keys(chooser).sort(), ['className', 'event', 'locale', 'onChannelClick', 'whatsappUrl'])
    assert.equal(chooser.event, 'contact_click'); assert.equal(chooser.locale, locale)
    assertNoPrivate(chooser, locale)
    const draft = new URL(chooser.whatsappUrl).searchParams.get('text')
    assert.ok(draft.includes(copy[locale].service)); assert.ok(draft.includes(copy[locale].topic))
    assert.ok(draft.includes('https://holistichouse.vercel.app' + pathFor(locale)))
    const copyButton = props => Array.isArray(props.children) && props.children.includes(copy[locale].button)
    const status = () => f.find('p', props => props['aria-live'] === 'polite').props.children
    f.click('button', copyButton); await turn(f)
    assert.deepEqual(env.copies, [expectedAnswers(locale)]); assert.equal(status(), copy[locale].copied)
    env.setCopyDenied(true); f.click('button', copyButton); await turn(f)
    assert.equal(status(), copy[locale].fallback)
    assert.equal(f.find('textarea', props => props.readOnly).props.value, expectedAnswers(locale))
    env.setCopyDenied(false); f.click('button', copyButton); await turn(f)
    assert.equal(status(), copy[locale].copied)
    for (const channel of ['whatsapp', 'telegram']) {
      f.find('chooser').props.onChannelClick(channel); await turn(f)
      assert.equal(status(), copy[locale].copied)
    }
    assert.equal(env.copies.length, 5); assert.ok(env.copies.every(value => value === expectedAnswers(locale)))
    assert.deepEqual(env.events, [], 'Actual public analytics hold suppresses started/prepared despite stale granted consent')
    assert.deepEqual(env.requests, []); assert.deepEqual(env.writes, []); assert.deepEqual(env.navigations, []); assert.deepEqual(env.popups, [])
    f.nodes().filter(node => node.type === 'textarea' && !node.props.readOnly)[0].props.onChange({target: {value: 'SYNTHETIC_CHANGED_PROBLEM'}})
    f.flush(); assert.equal(f.nodes().filter(node => node.props.role === 'region').length, 0)
    await f.submit(); assert.equal(status(), null)
    assert.ok(f.find('textarea', props => props.readOnly).props.value.includes('SYNTHETIC_CHANGED_PROBLEM'))
    f.nodes().find(node => node.type === 'button' && node.props['aria-pressed'] === false).props.onClick()
    f.flush(); assert.equal(f.nodes().filter(node => node.props.role === 'region').length, 0)
    assert.deepEqual(env.requests, []); assert.deepEqual(env.events, [])
  })

  for (const denied of [false, true]) test(locale + ': questionnaire chooser exact payload and ' + (denied ? 'storage-denied fallback' : 'thank-you router intent'), async () => {
    const env = environment(locale, {denyReceiptStorage: denied}), parent = await preparedIntake(locale, env)
    const chooserProps = parent.find('chooser').props
    const f = mount('contact-channel-chooser', 'ContactChannelChooser', chooserProps, env)
    const consent = () => f.find('input', props => props.type === 'checkbox')
    const submit = () => f.find('button', props => props.type === 'submit')
    assert.equal(consent().props.checked, false); assert.equal(consent().props.required, true)
    f.change('input', props => props.type === 'email', CONTACT)
    assert.equal(submit().props.disabled, true)
    await f.submit() // Also tests runtime validation if native disabled handling is bypassed.
    assert.deepEqual(env.requests, []); assert.deepEqual(env.writes, [])
    f.change('input', props => props.type === 'checkbox', true)
    assert.equal(submit().props.disabled, false)
    await f.submit()
    assert.equal(env.requests.length, 1); assertPayload(env.requests[0], locale, copy[locale].service)
    assertReceipt(env, denied); assert.deepEqual(env.popups, []); assert.deepEqual(env.copies, [])
    if (denied) {
      assert.deepEqual(env.navigations, [])
      assert.equal(f.nodes().filter(node => node.type === 'form').length, 0)
      const links = f.nodes().filter(node => node.type === 'acquisition-link')
      assert.equal(links.length, 2)
      const texts = []
      for (const channel of ['whatsapp', 'telegram']) {
        const link = f.find('acquisition-link', props => props.attributes['data-contact-channel'] === channel)
        texts.push(assertLink(link.props, channel, locale, copy[locale].service))
        link.props.onClick(); await turn(parent)
      }
      assert.equal(texts[0], texts[1])
      assert.equal(texts[0], new URL(chooserProps.whatsappUrl).searchParams.get('text') + '\n\n' + copy[locale].reference + ': ' + REFERENCE)
      assert.deepEqual(env.copies, [expectedAnswers(locale), expectedAnswers(locale)])
      // AcquisitionEventLink itself is a marker here: browser tests own its
      // native anchor default/analytics behavior. The real chooser callback ran.
    } else {
      assert.deepEqual(env.navigations, ['/' + locale + '/thank-you'])
      const thanks = mount('service-enquiry-thank-you', 'ServiceEnquiryThankYou', {locale, video: null}, env)
      assert.equal(thanks.find('strong').props.children, REFERENCE)
      assertNoPrivate(thanks.nodes(), locale)
      // Router is an intent recorder, so this test does not pretend it unmounted the chooser.
    }
  })

  for (const channel of ['whatsapp', 'telegram']) for (const denied of [false, true]) {
    test(locale + ': separate compact free-review ' + channel + ', receipt storage denied=' + denied, async () => {
      const env = environment(locale, {denyReceiptStorage: denied}), hold = deferred()
      const f = mount('compact-lead-capture', 'CompactLeadCapture', {
        locale, serviceTitle: FOOTER_SERVICE, id: 'request-free-review', title: 'Synthetic free review', lead: 'Synthetic only',
      }, env)
      const click = () => f.click('button', props => props['data-compact-channel'] === channel)
      assert.equal(f.find('input', props => props.type === 'checkbox').props.checked, false)
      f.change('input', props => props.name === 'contact', CONTACT)
      click(); await turn(f)
      assert.deepEqual(env.requests, []); assert.deepEqual(env.popups, [])
      f.change('input', props => props.type === 'checkbox', true)
      env.setRespond(() => hold.promise)
      const handler = f.find('button', props => props['data-compact-channel'] === channel).props.onClick
      handler(); handler(); f.flush()
      assert.equal(env.requests.length, 1, 'Same-tick double activation has one operation')
      assertPayload(env.requests[0], locale, FOOTER_SERVICE, 'Preferred reply channel: ' + (channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'))
      assert.equal(env.popups.length, 1); assert.equal(env.popups[0].opener, null)
      assert.deepEqual(env.popups[0].destinations, []); assert.deepEqual(env.writes, [])
      assert.equal(f.find('input', props => props.name === 'contact').props.disabled, true)
      assert.equal(f.find('input', props => props.type === 'checkbox').props.disabled, true)
      hold.resolve(success()); await turn(f)
      assertReceipt(env, denied); assert.deepEqual(env.navigations, []); assert.deepEqual(env.copies, [])
      assert.equal(f.nodes().filter(node => node.type === 'form').length, 0)
      const links = f.nodes().filter(node => node.type === 'a' && node.props['data-compact-channel'])
      assert.equal(links.length, 2)
      const texts = links.map(link => assertLink(link.props, link.props['data-compact-channel'], locale, FOOTER_SERVICE))
      assert.equal(texts[0], texts[1])
      assert.deepEqual(env.popups[0].destinations, [f.find('a', props => props['data-compact-channel'] === channel).props.href])
      assert.equal(env.requests.length, 1)
    })
  }
}

for (const fault of ['network', 'json', 'http-error', 'saved-false', 'bad-reference', 'array-reference']) {
  test('questionnaire chooser rejects unconfirmed ' + fault + ' and retries the byte-identical private-free body', async () => {
    const env = environment('en'), parent = await preparedIntake('en', env)
    const f = mount('contact-channel-chooser', 'ContactChannelChooser', parent.find('chooser').props, env)
    f.change('input', props => props.type === 'email', CONTACT)
    f.change('input', props => props.type === 'checkbox', true)
    env.setRespond(async () => {
      if (fault === 'network') throw new Error('SYNTHETIC_TRANSPORT_UNKNOWN')
      return {ok: fault !== 'http-error', json: async () => {
        if (fault === 'json') throw new Error('SYNTHETIC_BAD_JSON')
        return {saved: fault !== 'saved-false', referenceCode: fault === 'bad-reference' ? 'INVALID' : fault === 'array-reference' ? [REFERENCE] : REFERENCE}
      }}
    })
    await f.submit()
    assert.equal(env.requests.length, 1); assertPayload(env.requests[0], 'en', copy.en.service)
    assert.deepEqual(env.writes, []); assert.deepEqual(env.navigations, []); assert.deepEqual(env.popups, [])
    assert.equal(f.find('input', props => props.type === 'email').props.disabled, true)
    assert.equal(f.find('input', props => props.type === 'checkbox').props.disabled, true)
    assert.equal(f.find('button', props => props.type === 'submit').props.disabled, false)
    assert.equal(f.nodes().filter(node => node.type === 'acquisition-link').length, 0)
    env.setRespond(success); await f.submit()
    assert.equal(env.requests.length, 2); assert.equal(env.requests[1], env.requests[0])
    assertReceipt(env, false); assert.deepEqual(env.navigations, ['/en/thank-you'])
  })
}

test('questionnaire deliberate separate contact note is submitted, but neither note nor four drawing answers enters a public draft', async () => {
  const env = environment('en', {denyReceiptStorage: true}), parent = await preparedIntake('en', env)
  const f = mount('contact-channel-chooser', 'ContactChannelChooser', parent.find('chooser').props, env)
  const note = 'SYNTHETIC_PRACTICAL_CONTACT_NOTE'
  f.change('input', props => props.type === 'email', CONTACT)
  f.change('input', props => props.type === 'checkbox', true)
  f.change('textarea', () => true, note)
  await f.submit(); assertPayload(env.requests[0], 'en', copy.en.service, note)
  for (const link of f.nodes().filter(node => node.type === 'acquisition-link')) assertNoPrivate(decodeURIComponent(link.props.href), 'en', [note])
})

test('missing receipt cannot make the actual thank-you component invent a confirmed request', () => {
  const env = environment('en')
  const thanks = mount('service-enquiry-thank-you', 'ServiceEnquiryThankYou', {locale: 'en', video: null}, env)
  assert.equal(thanks.nodes().filter(node => node.type === 'strong').length, 0)
  assert.equal(thanks.find('h1').props.children, 'Open this page after sending a request')
  assert.deepEqual(env.requests, []); assert.deepEqual(env.writes, []); assert.deepEqual(env.navigations, [])
})

test('landing still binds its compact footer separately from the optional drawing form', () => {
  const landing = read('components/free-entry-landing.tsx')
  assert.match(landing, /situation: "Free written Situation Review"/)
  assert.match(landing, /<details className=\{styles\.fullQuestionnaire\} data-optional-written-review>/)
  assert.match(landing, /<FreeSituationReviewForm locale=\{locale\}/)
  assert.match(landing, /<CompactLeadCapture[\s\S]*?serviceTitle=\{serviceTitles\[kind\]\}/)
})

test('payload and public-link acceptance oracles reject changed consent, identity, route and private-data leaks', async () => {
  const env = environment('en', {denyReceiptStorage: true}), parent = await preparedIntake('en', env)
  const f = mount('contact-channel-chooser', 'ContactChannelChooser', parent.find('chooser').props, env)
  f.change('input', props => props.type === 'email', CONTACT)
  f.change('input', props => props.type === 'checkbox', true)
  await f.submit()
  const good = JSON.parse(env.requests[0])
  for (const changes of [
    {contactConsent: false}, {serviceTitle: FOOTER_SERVICE}, {sourcePath: '/en/services/other'},
    {locale: 'ru'}, {description: markers('en')[0]}, {questionnaire: markers('en')},
    {contact: {...good.contact, phone: '+14165550100'}}, {operationId: 'not-a-uuid'},
  ]) assert.throws(() => assertPayload(JSON.stringify({...good, ...changes}), 'en', copy.en.service))
  const goodLink = f.find('acquisition-link', props => props.attributes['data-contact-channel'] === 'whatsapp').props
  for (const changes of [
    {href: goodLink.href.replace('wa.me', 'untrusted.example.invalid')},
    {href: goodLink.href.replace('/14376066502', '/14376066503')},
    {href: goodLink.href + '&email=' + CONTACT}, {target: '_self'}, {rel: 'noopener'},
    {href: goodLink.href.replace(REFERENCE, 'HH-000000000000')},
  ]) assert.throws(() => assertLink({...goodLink, ...changes}, 'whatsapp', 'en', copy.en.service))
  const leaked = new URL(goodLink.href)
  leaked.searchParams.set('text', leaked.searchParams.get('text') + '\n' + markers('en')[2])
  assert.throws(() => assertLink({...goodLink, href: leaked.href}, 'whatsapp', 'en', copy.en.service))
})

test('compact free-review uncertain result locks the initial channel and retries its unchanged operation', async () => {
  const env = environment('en')
  const f = mount('compact-lead-capture', 'CompactLeadCapture', {
    locale: 'en', serviceTitle: FOOTER_SERVICE, title: 'Synthetic free review', lead: 'Synthetic only',
  }, env)
  f.change('input', props => props.name === 'contact', CONTACT)
  f.change('input', props => props.type === 'checkbox', true)
  env.setRespond(async () => ({ok: false, status: 503, json: async () => ({saved: false})}))
  f.click('button', props => props['data-compact-channel'] === 'telegram'); await turn(f)
  assert.equal(env.requests.length, 1)
  assertPayload(env.requests[0], 'en', FOOTER_SERVICE, 'Preferred reply channel: Telegram')
  assert.equal(env.popups[0].closed, true); assert.deepEqual(env.popups[0].destinations, [])
  assert.deepEqual(env.writes, []); assert.deepEqual(env.navigations, [])
  assert.equal(f.find('button', props => props['data-compact-channel'] === 'whatsapp').props.disabled, true)
  f.click('button', props => props['data-compact-channel'] === 'whatsapp'); await turn(f)
  assert.equal(env.requests.length, 1, 'Even direct invocation cannot change the unresolved channel')
  env.setRespond(success)
  f.click('button', props => props['data-compact-channel'] === 'telegram'); await turn(f)
  assert.equal(env.requests.length, 2); assert.equal(env.requests[0], env.requests[1])
  assertReceipt(env, false)
  assert.deepEqual(env.popups[1].destinations, [f.find('a', props => props['data-compact-channel'] === 'telegram').props.href])
})

test('questionnaire chooser duplicate pending submit and late unmount cannot fabricate a receipt', async () => {
  const env = environment('en'), parent = await preparedIntake('en', env), hold = deferred()
  const f = mount('contact-channel-chooser', 'ContactChannelChooser', parent.find('chooser').props, env)
  f.change('input', props => props.type === 'email', CONTACT)
  f.change('input', props => props.type === 'checkbox', true)
  env.setRespond(() => hold.promise)
  const handler = f.find('form').props.onSubmit
  const running = handler({preventDefault() {}}), duplicate = handler({preventDefault() {}})
  f.flush()
  assert.equal(env.requests.length, 1); assertPayload(env.requests[0], 'en', copy.en.service)
  assert.equal(f.find('button', props => props.type === 'submit').props.disabled, true)
  assert.equal(f.nodes().filter(node => node.type === 'acquisition-link').length, 0)
  assert.deepEqual(env.writes, []); assert.deepEqual(env.navigations, [])
  f.unmount(); hold.resolve(success()); await running; await duplicate; f.flush()
  assert.deepEqual(env.writes, []); assert.deepEqual(env.navigations, []); assert.deepEqual(env.popups, [])
})
