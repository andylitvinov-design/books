// Synthetic handler fixture for ContactChannelChooser only. Real phone and pure
// referral/receipt modules; no auth, database, provider or browser operations.
// This tests React-like state/effects, not native validation, focus or layout.
// Unknown imports fail closed; every external composition leaf is explicit.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {randomUUID} from 'node:crypto'
import ts from 'typescript'
import * as whatsapp from '../../lib/whatsapp-enquiry.js'
import * as organic from '../../lib/organic-event-referrals.js'
import * as paid from '../../lib/paid-ad-referrals.js'
import * as receipt from '../../lib/practitioners/enquiry-receipt.mjs'
import * as phoneCountry from '../../lib/contact/phone-country.js'
export const readContactSource = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
export const CONTACT_REFERENCE = 'HH-F4E3D2C1B0A9'
export const success = () => ({ok: true, status: 201, json: async () => ({saved: true, referenceCode: CONTACT_REFERENCE})})
export const turn = async f => { await new Promise(resolve => setImmediate(resolve)); f.flush() }
export const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return {promise, resolve} }
export function environment(locale, {denyReceiptStorage = false, pathname = '/' + locale + '/services/free-situation-review', search = '', reducedMotion = true} = {}) {
  const requests = [], attempts = [], writes = [], navigations = [], popups = [], events = [], scrollCalls = []
  const storage = new Map()
  let respond = success
  const location = {pathname, search, href: 'http://127.0.0.1:3100' + pathname + search}
  const window = {
    crypto: {randomUUID}, location,
    matchMedia: () => ({matches: reducedMotion}),
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
      popups.push({url, target, features}); assert.fail('Ordinary registration must not open a provider or popup')
    },
  }
  return {
    window, requests, attempts, writes, navigations, popups, events, storage, scrollCalls,
    navigate(pathname, search = '') { Object.assign(location, {pathname, search, href: 'http://127.0.0.1:3100' + pathname + search}) },
    setRespond: fn => { respond = fn },
    router: {push: path => navigations.push(path)},
    fetch: (url, options) => {
      attempts.push({url, method: options?.method});
      assert.equal(url, '/api/service-enquiries', 'Any other API or external request is forbidden')
      assert.equal(options.method, 'POST'); assert.equal(options.credentials, 'same-origin')
      assert.equal(options.headers['Content-Type'], 'application/json')
      assert.equal(typeof options.body, 'string'); requests.push(options.body)
      return respond()
    },
  }
}
// Cache by exact source text, never by filename: source mutants must compile separately.
const compiledModules = new Map()
export function compileContactModule(text, imports, env) {
  let code = compiledModules.get(text)
  if (!code) {
    const parsed = ts.createSourceFile('contact-fixture.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    assert.equal(parsed.parseDiagnostics.length, 0, 'Actual component syntax must parse before execution')
    code = ts.transpileModule(text, {compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    }}).outputText
    compiledModules.set(text, code)
  }
  const loaded = {exports: {}}
  runInNewContext(code, {
    exports: loaded.exports, module: loaded,
    require: name => {
      assert.ok(Object.hasOwn(imports, name), 'Unexpected runtime dependency: ' + name)
      return imports[name]
    },
    window: env.window,
    fetch: env.fetch, URL, URLSearchParams, crypto: {randomUUID}, Date,
  })
  return loaded.exports
}
let nextInstance = 0
export function mount(name, exportName, initialProps, env, {sourceOverride} = {}) {
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
  const phone = compileContactModule(readContactSource('components/phone-country-input.tsx'), {
    ...jsx, '@/lib/contact/phone-country': phoneCountry, './phone-country-input.module.css': {default: {}},
  }, env)
  const icons = Object.fromEntries(['ChevronDown', 'MessageCircle', 'Send', 'ShoppingBag'].map(name => [name, 'icon-' + name]))
  const imports = {
    ...jsx,
    'next/navigation': {usePathname: () => env.window.location.pathname, useRouter: () => env.router},
    // The real component imports Link only for its confirmed-booking cart.
    // Ordinary contact coverage must fail if that separate branch renders.
    'next/link': {default() {
      assert.fail('Booking cart Link is outside the synthetic ordinary contact fixture')
    }},
    'lucide-react': icons,
    // Anchor props/callbacks are retained. Native provider navigation is never executed.
    '@/components/acquisition-event-link': {AcquisitionEventLink: 'acquisition-link'},
    '@/components/phone-country-input': phone,
    '@/components/free-express-google-claim': {FreeExpressGoogleClaim() {
      assert.fail('Google claim is outside the synthetic ordinary contact fixture')
    }},
    '@/lib/whatsapp-enquiry': whatsapp,
    '@/lib/organic-event-referrals': organic,
    '@/lib/paid-ad-referrals': paid,
    '@/lib/practitioners/enquiry-receipt.mjs': receipt,
    '@/lib/public-analytics': {emitPublicAnalyticsEvent: event => env.events.push(event)},
    './contact-channel-chooser.module.css': {default: {}},
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
    async submit() {f.find('form').props.onSubmit({preventDefault() {}}); flush(); await turn(f)},
    update(value = {}) {props = {...props, ...value}; dirty = true; flush()},
    unmount() {unmounted = true; for (const entry of instances.values()) for (const slot of entry.slots) slot?.cleanup?.()},
  }
  flush(); return f
}
