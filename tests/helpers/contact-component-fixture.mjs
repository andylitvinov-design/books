// Synthetic state/handler fixture for the exact current public contact components.
// Real pure validators, phone input and topic parser; no browser/auth/DB/network.
// Native validation, layout, focus, routing and acquisition-link default actions
// are browser concerns. Icons/header/video/Next leaves are explicit markers.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {randomUUID} from 'node:crypto'
import ts from 'typescript'
import * as whatsapp from '../../lib/whatsapp-enquiry.js'
import * as organic from '../../lib/organic-event-referrals.js'
import * as paid from '../../lib/paid-ad-referrals.js'
import * as input from '../../lib/practitioners/public-service-enquiry-input.mjs'
import * as receipt from '../../lib/practitioners/enquiry-receipt.mjs'
import * as phoneCountry from '../../lib/contact/phone-country.js'
import * as siteVideoModel from '../../lib/site-videos/model.js'
import * as intakeModel from '../../lib/coaching/intake-model.js'
export {whatsapp, organic, paid, input, receipt, phoneCountry, intakeModel}
export const readContactSource = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
export const CONTACT_REFERENCE = 'HH-F4E3D2C1B0A9'
export const success = () => ({ok: true, status: 200, json: async () => ({saved: true, referenceCode: CONTACT_REFERENCE})})
export const turn = async f => { await new Promise(resolve => setImmediate(resolve)); f.flush() }
export const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return {promise, resolve} }
export function environment(locale, {denyReceiptStorage = false, pathname = '/' + locale + '/services/free-situation-review', search = '', reducedMotion = true} = {}) {
  const requests = [], writes = [], navigations = [], popups = [], events = [], frames = [], copies = [], scrollCalls = []
  const storage = new Map()
  let respond = success, denyCopy = false
  const location = {pathname, search, href: 'http://127.0.0.1:3100' + pathname + search}
  const window = {
    crypto: {randomUUID}, location,
    matchMedia: () => ({matches: reducedMotion}),
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
    window, requests, writes, navigations, popups, events, frames, copies, storage, scrollCalls,
    navigate(pathname, search = '') { Object.assign(location, {pathname, search, href: 'http://127.0.0.1:3100' + pathname + search}) },
    document: {documentElement: {dataset: {analyticsConsent: 'granted'}}, body:{style:{overflow:''}}, addEventListener(){}, removeEventListener(){}},
    navigator: {clipboard: {writeText: async value => { copies.push(value); if (denyCopy) throw new Error('SYNTHETIC_CLIPBOARD_DENIED') }}},
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
export function compileContactModule(text, imports, env) {
  const parsed = ts.createSourceFile('contact-fixture.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.equal(parsed.parseDiagnostics.length, 0, 'Actual component syntax must parse before execution')
  const loaded = {exports: {}}
  const code = ts.transpileModule(text, {compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText
  runInNewContext(code, {
    exports: loaded.exports, module: loaded,
    require: name => {
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
let nextInstance = 0
export function mount(name, exportName, initialProps, env, {sourceOverride, composeHomeCapture = false, chooserSourceOverride} = {}) {
  const instance = ++nextInstance, instances = new Map(), effects = []
  let current, dirty = true, tree, props = initialProps, unmounted = false
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]))
  const slot = init => { const index = current.index++; return current.slots[index] || (current.slots[index] = init()) }
  const hooks = {
    useState(initial) {
      const entry = slot(() => ({value: typeof initial === 'function' ? initial() : initial}))
      return [entry.value, value => { const next = typeof value === 'function' ? value(entry.value) : value; if (!Object.is(next, entry.value)) {entry.value = next; dirty = true} }]
    },
    useRef(initial) { return slot(() => ({current: initial})) },
    useId() { return slot(() => ({value: 'synthetic-contact-' + instance + '-' + current.path + '-' + current.index})).value },
    useEffect(effect, deps) {
      const entry = slot(() => ({}))
      if (!same(entry.deps, deps)) {
        entry.deps = deps
        effects.push(() => { entry.cleanup?.(); entry.cleanup = effect() })
      }
    },
  }
  hooks.useLayoutEffect = hooks.useEffect
  const element = (type, props) => {assert.ok(type, 'Missing JSX export'); return {type, props: props || {}}}
  const jsx = {'react/jsx-runtime': {jsx: element, jsxs: element, Fragment: 'fragment'}, react: hooks}
  const analytics = compileContactModule(readContactSource('lib/public-analytics.ts'), {}, env)
  const phone = compileContactModule(readContactSource('components/phone-country-input.tsx'), {
    ...jsx, '@/lib/contact/phone-country': phoneCountry, './phone-country-input.module.css': {default: {}},
  }, env)
  const serviceVideoLibrary = compileContactModule(readContactSource('data/service-video-library.ts'), {'@/lib/site-videos/model':siteVideoModel}, env)
  const icons = Object.fromEntries(['ArrowLeft', 'ArrowUpRight', 'FileText', 'ShieldCheck', 'ChevronDown', 'MessageCircle', 'Send', 'ShoppingBag', 'CheckCircle2', 'ArrowRight', 'MailCheck', 'Check', 'HeartHandshake', 'ExternalLink', 'Sparkles', 'X'].map(name => [name, 'icon-' + name]))
  const imports = {
    ...jsx,
    'next/navigation': {usePathname: () => env.window.location.pathname, useRouter: () => env.router},
    'next/link': {default: 'a'}, 'next/image': {default: 'img'}, 'lucide-react': icons,
    // These composition boundaries preserve props; this fixture does not claim
    // to execute external anchor defaults, acquisition telemetry or site chrome.
    '@/components/contact-channel-chooser': {ContactChannelChooser: 'chooser'},
    '@/components/compact-lead-capture': {CompactLeadCapture:'compact-capture'},
    '@/components/free-diagnosis-offers': {FreeDiagnosisOffers:'diagnosis-offers'},
    '@/components/free-diagnostic-start': {FreeDiagnosticStart:'diagnostic-start'},
    '@/components/free-situation-review-form': {FreeSituationReviewForm:'private-entry'},
    '@/components/personal-testimonials': {PersonalTestimonials:'testimonials'},
    '@/lib/site-videos/model':siteVideoModel, '@/data/service-video-library':serviceVideoLibrary,
    '@/components/acquisition-event-link': {AcquisitionEventLink: 'acquisition-link'},
    '@/components/phone-country-input': phone,
    '@/components/static-portrait': {StaticPortrait: 'static-portrait'},
    '@/components/public-site-header': {PublicSiteHeader: 'public-site-header'},
    '@/components/site-video-player': {SiteVideoPlayer: 'site-video-player'},
    '@/lib/whatsapp-enquiry': whatsapp, '@/lib/public-analytics': analytics,
    '@/lib/organic-event-referrals': organic, '@/lib/paid-ad-referrals': paid,
    '@/lib/coaching/intake-model': intakeModel,
    '@/lib/practitioners/public-service-enquiry-input.mjs': input,
    '@/lib/practitioners/enquiry-receipt.mjs': receipt,
    ...Object.fromEntries(['free-drawing-intake', 'contact-channel-chooser', 'compact-lead-capture', 'service-enquiry-thank-you', 'client-assessment-invite', 'free-diagnosis-offers', 'free-entry-landing'].map(name => ['./' + name + '.module.css', {default: {}}])),
  }
  // Opt-in composition executes the complete current Home capture and shared
  // chooser, including the actual PhoneCountryInput above, rather than a JSX
  // placeholder at the contact boundary. No native-browser success is implied.
  if (composeHomeCapture) {
    assert.equal(name, 'homepage-free-capture')
    imports['lucide-react'] = {...icons, Brain:'icon-Brain', GraduationCap:'icon-GraduationCap'}
    imports['./consultation-choice-capture.module.css'] = {default:{}}
    imports['@/components/acquisition-event-link'] = compileContactModule(
      readContactSource('components/acquisition-event-link.tsx'), imports, env)
    imports['@/components/contact-channel-chooser'] = compileContactModule(
      chooserSourceOverride ?? readContactSource('components/contact-channel-chooser.tsx'), imports, env)
  }
  const component = compileContactModule(sourceOverride ?? readContactSource('components/' + name + '.tsx'), imports, env)[exportName]
  assert.equal(typeof component, 'function', 'Exact component export must exist')
  function renderComponent(component, props, path) {
    let entry = instances.get(path)
    if (!entry || entry.component !== component) {entry = {component, path, index: 0, slots: []}; instances.set(path, entry)}
    entry.index = 0; const previous = current; current = entry
    const result = component(props); current = previous
    return renderNode(result, path + '.r')
  }
  function renderNode(node, path) {
    if (Array.isArray(node)) return node.map((child, i) => renderNode(child, path + '.' + i))
    if (!node || typeof node !== 'object' || !('type' in node)) return node
    if (typeof node.type === 'function') return renderComponent(node.type, node.props, path)
    const result = {...node, props: {...node.props, children: renderNode(node.props.children, path + '.c')}}
    if (result.props.ref) result.props.ref.current = {
      scrollIntoView: options => env.scrollCalls.push({...options, target: 'panel'}),
      querySelector: selector => {assert.equal(selector, '[data-contact-channel="whatsapp"]'); return {scrollIntoView: options => env.scrollCalls.push({...options, target: 'saved-whatsapp'})}},
      focus() {},
    }
    return result
  }
  function flush() {
    for (let count = 0; dirty && !unmounted; count++) {
      assert.ok(count < 30, 'Unexpected state/effect loop')
      dirty = false; effects.length = 0; tree = renderComponent(component, props, 'root')
      for (const effect of effects) effect()
    }
  }
  function nodes() {
    const result = []
    function walk(value, hidden = false) {
      if (Array.isArray(value)) { value.forEach(child => walk(child, hidden)); return }
      if (!value || typeof value !== 'object' || !('type' in value)) return
      const invisible = hidden || Boolean(value.props.hidden)
      result.push({...value, hidden: invisible}); walk(value.props.children, invisible)
    }
    walk(tree); return result
  }
  const f = {
    env, flush, nodes,
    find(type, predicate = () => true) {const found = nodes().filter(node => node.type === type && predicate(node.props)); assert.equal(found.length, 1, 'Expected exactly one ' + type); return found[0]},
    change(type, predicate, value) {f.find(type, predicate).props.onChange({target: {value, checked: value}}); flush()},
    click(type, predicate) {const result = f.find(type, predicate).props.onClick(); flush(); return result},
    async submit() {const result = f.find('form').props.onSubmit({preventDefault() {}}); flush(); await result; flush()},
    update(value = {}) {props = {...props, ...value}; dirty = true; flush()},
    unmount() {unmounted = true; for (const entry of instances.values()) for (const slot of entry.slots) slot?.cleanup?.()},
  }
  flush(); return f
}
