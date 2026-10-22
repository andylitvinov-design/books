import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as journeys from '../lib/assessments/topic-journeys.js'
import { buildTopicTestSuggestions } from '../lib/assessments/topic-test-suggestions.js'
import * as intents from '../lib/app/test-selection-intent.js'
import * as contracts from '../lib/assessments/contracts.js'

// Actual client and unchanged API route, with synthetic identities and in-memory repositories.
// No network, database, cookie, entitlement or billing operation runs in this harness.
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const compile = (source, fileName) => ts.transpileModule(source, { fileName, compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText
const clientSource = compile(read('components/topic-journey-selector.tsx'), 'topic-journey-selector.tsx')
const routeSource = compile(read('app/api/app/[...path]/route.js'), 'route.js')
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree)
  ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function mount(locale = 'en', options = {}) {
  let actorId = 'owner-a', props = { locale, journey: journeys.TOPIC_JOURNEYS[0],
    suggestions: buildTopicTestSuggestions(journeys.TOPIC_JOURNEYS[0], locale) }
  const calls = [], dispatches = [], navigations = [], authNavigations = [], channels = [], storage = new Map()
  const listeners = { window: new Map(), document: new Map() }
  const add = (target, name, fn) => { const set = listeners[target].get(name) || new Set(); set.add(fn); listeners[target].set(name, set) }
  const remove = (target, name, fn) => listeners[target].get(name)?.delete(fn)
  const emit = (target, name) => { for (const fn of [...(listeners[target].get(name) || [])]) fn({}) }
  const repo = {
    bootstrap: async actor => ({ account: { id: actor.id } }),
    createTestPlan: async (actor, body) => { dispatches.push({ actorId: actor.id, body }); return { id: 'synthetic-plan' } },
  }
  const routeModules = {
    'next/server': { NextResponse: { json: (body, { status = 200 } = {}) => json(body, status) } },
    '@/lib/app/config': { getAppConfig: () => ({ supabaseUrl: 'https://auth.example' }), requestOrigin: () => 'https://local.example', requireSameOrigin: () => {} },
    '@/lib/app/session': { createRequestAuth: () => ({ verified: async () => {
      if (!actorId) throw new contracts.AppError('UNAUTHORIZED', 401)
      return { id: actorId }
    }, apply: response => response, client: { auth: { signInWithOAuth: async () => ({ data: { url: 'https://auth.example/start' } }) } } }) },
    '@/lib/app/repository': { createAppRepository: () => repo },
    '@/lib/practitioners/repository': { createPractitionerRepository: () => ({}) },
    '@/lib/practitioners/article-repository': { createArticleRepository: () => ({}) },
    '@/lib/practitioners/events-repository': { createPractitionerEventsRepository: () => ({}) },
    '@/lib/app/guest-repository': { createGuestRepository: () => ({}) },
    '@/lib/app/database': { consumeRate: async () => {} },
    '@/lib/app/http': { PRIVATE_HEADERS: {}, readBody: request => request.json(), safeError: error => ({ code: error.code || error.message, status: error.status || 500 }) },
    '@/lib/assessments/contracts': contracts,
  }
  const route = { exports: {}, URL, require: name => routeModules[name] || {} }
  vm.runInNewContext(routeSource, route)
  const fetchSynthetic = async (path, requestOptions) => {
    const call = { path, options: requestOptions }; calls.push(call)
    await options.beforeRoute?.(call, h)
    // Deliberately ignore abort: lifecycle guards must reject late responses too.
    let response = await route.exports[requestOptions.method](new Request('https://local.example' + path, requestOptions),
      { params: { path: path.replace('/api/app/', '').split('/') } })
    response = await options.afterRoute?.(call, response, h) || response
    return response
  }
  const slots = []; let index = 0, pending = [], dirty = false, tree, mounted = true, serial = 0
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]))
  const hooks = {
    useState(initial) { const i = index++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[i].value, value => { assert.ok(mounted, 'no state update after unmount'); slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; dirty = true }] },
    useRef(initial) { return slots[index++] ??= { current: initial } },
    useMemo(fn, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value },
    useEffect(fn, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) pending.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() } }) },
  }
  const document = { visibilityState: 'visible', addEventListener: (name, fn) => add('document', name, fn), removeEventListener: (name, fn) => remove('document', name, fn) }
  const window = { location: { href: 'https://local.example/' + locale + '/explore/relationships', assign: url => { if (url.startsWith('/')) navigations.push(url); else authNavigations.push(url) } },
    sessionStorage: { getItem: key => { if (options.storageThrows === 'read') throw Error('SecurityError'); return storage.get(key) ?? null }, setItem: (key, value) => { if (options.storageThrows === 'write') throw Error('SecurityError'); storage.set(key, value) }, removeItem: key => { if (options.storageThrows === 'remove') throw Error('SecurityError'); storage.delete(key) } },
    addEventListener: (name, fn) => add('window', name, fn), removeEventListener: (name, fn) => remove('window', name, fn) }
  const modules = { react: hooks, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'next/image': { default: 'Image' }, 'next/link': { default: 'Link' },
    '@/components/acquisition-event-link': { AcquisitionEventLink: 'TrackedLink' },
    '@/components/discovery-section-tabs': { DiscoverySectionTabs: 'DiscoverySectionTabs' },
    '@/components/business-consultation-finder': { BusinessConsultationFinder: 'BusinessConsultationFinder' },
    '@/components/business-service-browser': { BusinessServiceBrowser: 'BusinessServiceBrowser' },
    'lucide-react': new Proxy({}, { get: (_, key) => String(key) }), '@/lib/assessments/topic-journeys': journeys,
    '@/lib/app/test-selection-intent': intents, './topic-journey-selector.module.css': { default: new Proxy({}, { get: (_, key) => String(key) }) } }
  const runtime = { exports: {}, require: name => { assert.ok(modules[name], name); return modules[name] }, window, document,
    fetch: fetchSynthetic, AbortController, Error, crypto: { randomUUID: () => `synthetic-${++serial}` },
    BroadcastChannel: class { constructor(name) { if (options.channelThrows) throw Error('SecurityError'); assert.equal(name, 'hh-app-session'); channels.push(this) } close() { this.closed = true } }, console }
  vm.runInNewContext(clientSource, runtime)
  const render = () => { index = 0; pending = []; dirty = false; tree = runtime.exports.TopicJourneySelector(props); pending.forEach(fn => fn()) }
  const h = { calls, dispatches, navigations, authNavigations, storage, document, window,
    get tree() { return tree }, setActor(value) { actorId = value }, get props() { return props },
    action: name => nodes(tree).find(node => (node.props?.['data-topic-action'] || node.props?.attributes?.['data-topic-action']) === name),
    start: () => h.action('tests').props.onClick(),
    async settle() { for (let i = 0; i < 30; i++) { await Promise.resolve(); if (dirty && mounted) render() } },
    rerender(next) { props = { ...props, ...next }; render() },
    emit: name => emit('window', name), hide() { document.visibilityState = 'hidden'; emit('document', 'visibilitychange') },
    signout() { for (const channel of channels) if (!channel.closed) channel.onmessage?.({ data: 'signed-out' }) },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); mounted = false },
  }
  render()
  return h
}

for (const locale of ['en', 'ru']) {
  test(`topic start uses a fresh private document after the actual owner-bound route and preserves the plan payload (${locale})`, async () => {
    const h = mount(locale)
    const first = h.start(); const duplicate = h.start()
    await Promise.all([first, duplicate]); await h.settle()
    assert.deepEqual(h.calls.map(call => call.path), ['/api/app/bootstrap', '/api/app/test-plans', '/api/app/bootstrap'])
    assert.equal(h.calls[1].options.headers['X-HH-Account-ID'], 'owner-a')
    assert.equal(h.calls[2].options.headers['X-HH-Account-ID'], 'owner-a')
    assert.equal(h.dispatches.length, 1); assert.equal(h.dispatches[0].actorId, 'owner-a')
    assert.equal(h.dispatches[0].body.appendActive, true)
    assert.deepEqual(h.dispatches[0].body.items, h.props.suggestions[''].map(item => ({ definitionKey: item.definition.key, definitionVersion: item.definition.version, instrumentLocale: item.definition.instrumentLocale })))
    assert.deepEqual(h.navigations, [`/${locale}/app/tests?plan=synthetic-plan`]); assert.equal(h.storage.size, 0)
    await h.start(); assert.equal(h.dispatches.length, 1); h.unmount()
  })

  test(`owner A to B between bootstrap and POST is rejected before dispatch (${locale})`, async () => {
    const h = mount(locale, { afterRoute(call, response, harness) { if (call.path === '/api/app/bootstrap') harness.setActor('owner-b'); return response } })
    await h.start(); await h.settle()
    assert.equal(h.calls.length, 2); assert.equal(h.calls[1].options.headers['X-HH-Account-ID'], 'owner-a')
    assert.equal(h.dispatches.length, 0); assert.equal(h.navigations.length, 0); assert.equal(h.authNavigations.length, 0)
    assert.equal(h.action('tests').props.disabled, false); assert.ok(nodes(h.tree).find(node => node.props?.role === 'alert')); h.unmount()
  })

  test(`owner change after save blocks stale navigation and never dispatches to B (${locale})`, async () => {
    const h = mount(locale, { afterRoute(call, response, harness) { if (call.path === '/api/app/test-plans') harness.setActor('owner-b'); return response } })
    await h.start(); await h.settle()
    assert.equal(h.dispatches.length, 1); assert.equal(h.dispatches[0].actorId, 'owner-a')
    assert.equal(h.calls[2].options.headers['X-HH-Account-ID'], 'owner-a'); assert.equal(h.navigations.length, 0); h.unmount()
  })

  test(`guest flow retains the original consent handoff and editorial-only intent (${locale})`, async () => {
    const h = mount(locale); h.setActor(null); await h.start(); await h.settle()
    assert.deepEqual(h.calls.map(call => call.path), ['/api/app/bootstrap', '/api/app/auth/start'])
    assert.equal(h.dispatches.length, 0); assert.equal(h.navigations.length, 0)
    assert.deepEqual(h.authNavigations, ['https://auth.example/start'])
    assert.deepEqual(JSON.parse(h.calls[1].options.body), { locale, continueTo: 'tests' })
    const intent = h.storage.get(intents.PENDING_TEST_SELECTION_KEY)
    assert.deepEqual(intents.readTestSelectionIntent(intent)?.keys, h.props.suggestions[''].map(item => item.key))
    h.unmount(); assert.equal(h.storage.get(intents.PENDING_TEST_SELECTION_KEY), intent)
  })
}

for (const stage of ['bootstrap', 'test-plans', 'final-bootstrap']) {
  for (const cancel of ['unmount', 'pagehide', 'popstate', 'hidden', 'signout', 'route-change', 'alternate-link', 'consultation-link', 'locale-change', 'topic-change']) {
    test(`${cancel} during ${stage} prevents late requests/navigation even if abort is ignored`, async () => {
      const gate = deferred(), reached = deferred(); let bootstraps = 0
      const h = mount('en', { async afterRoute(call, response) {
        if (call.path === '/api/app/bootstrap') bootstraps++
        if (call.path === '/api/app/' + stage || (stage === 'final-bootstrap' && call.path === '/api/app/bootstrap' && bootstraps === 2)) { reached.resolve(); await gate.promise }
        return response
      } })
      const work = h.start(); await reached.promise
      if (cancel === 'unmount') h.unmount()
      if (cancel === 'pagehide' || cancel === 'popstate') h.emit(cancel)
      if (cancel === 'hidden') h.hide()
      if (cancel === 'signout') h.signout()
      if (cancel === 'route-change') h.window.location.href = 'https://local.example/en/app'
      if (cancel === 'alternate-link') h.action('browse').props.onClick()
      if (cancel === 'consultation-link') { assert.equal(h.action('consultation').props.href, '/en/services/systemic-constellations'); h.action('consultation').props.onClick() }
      if (cancel === 'locale-change') h.rerender({ locale: 'ru' })
      if (cancel === 'topic-change') { nodes(h.tree).find(node => node.props?.['data-topic-choice']).props.onClick(); await h.settle() }
      gate.resolve(); await work; await h.settle()
      assert.equal(h.navigations.length, 0); assert.equal(h.authNavigations.length, 0)
      assert.equal(h.calls.length, stage === 'bootstrap' ? 1 : stage === 'test-plans' ? 2 : 3)
      assert.equal(h.dispatches.length, stage === 'bootstrap' ? 0 : 1)
      assert.ok(h.dispatches.every(item => item.actorId === 'owner-a'))
      assert.ok(h.calls.every(call => call.options.signal.aborted))
      if (cancel !== 'unmount') h.unmount()
    })
  }
}

test('canceled guest handoff removes only its own intent and cannot redirect later', async () => {
  for (const newerIntent of [false, true]) {
    const gate = deferred(), reached = deferred()
    const h = mount('en', { async afterRoute(call, response) { if (call.path === '/api/app/auth/start') { reached.resolve(); await gate.promise } return response } })
    h.setActor(null); const work = h.start(); await reached.promise
    assert.ok(h.storage.get(intents.PENDING_TEST_SELECTION_KEY))
    if (newerIntent) h.storage.set(intents.PENDING_TEST_SELECTION_KEY, 'newer-selection')
    h.unmount(); gate.resolve(); await work
    assert.equal(h.authNavigations.length, 0); assert.equal(h.dispatches.length, 0)
    assert.equal(h.storage.get(intents.PENDING_TEST_SELECTION_KEY), newerIntent ? 'newer-selection' : undefined)
  }
})

test('invalid identity and mismatched final identity fail closed without guest fallback', async () => {
  for (const stage of ['initial', 'final']) {
    let bootstraps = 0
    const h = mount('en', { afterRoute(call, response) {
      if (call.path === '/api/app/bootstrap' && ++bootstraps === (stage === 'initial' ? 1 : 2)) return json({ account: { id: stage === 'initial' ? '' : 'owner-b' } })
      return response
    } })
    await h.start(); await h.settle()
    assert.equal(h.dispatches.length, stage === 'initial' ? 0 : 1)
    assert.equal(h.navigations.length, 0); assert.equal(h.authNavigations.length, 0); assert.equal(h.storage.size, 0); h.unmount()
  }
})

 test('an old canceled response cannot override a newer explicit owner attempt', async () => {
  const gate = deferred(), reached = deferred(); let first = true
  const h = mount('en', { async afterRoute(call, response) {
    if (call.path === '/api/app/bootstrap' && first) { first = false; reached.resolve(); await gate.promise }
    return response
  } })
  const old = h.start(); await reached.promise; h.signout(); h.setActor('owner-b')
  await h.start(); await h.settle(); gate.resolve(); await old; await h.settle()
  assert.equal(h.dispatches.length, 1); assert.equal(h.dispatches[0].actorId, 'owner-b')
  assert.deepEqual(h.navigations, ['/en/app/tests?plan=synthetic-plan'])
  assert.equal(h.action('tests').props.disabled, true); assert.ok(!nodes(h.tree).find(node => node.props?.role === 'alert')); h.unmount()
})

test('blocked BroadcastChannel leaves owner-bound requests and navigation checks intact', async () => {
  const h = mount('en', { channelThrows: true }); await h.start(); await h.settle()
  assert.equal(h.dispatches.length, 1); assert.equal(h.dispatches[0].actorId, 'owner-a')
  assert.equal(h.calls[1].options.headers['X-HH-Account-ID'], 'owner-a'); assert.equal(h.navigations.length, 1); h.unmount()
})

test('blocked session storage fails guest handoff safely and cannot break cancellation', async () => {
  const blocked = mount('en', { storageThrows: 'write' }); blocked.setActor(null)
  await blocked.start(); await blocked.settle()
  assert.equal(blocked.calls.length, 1); assert.equal(blocked.authNavigations.length, 0)
  assert.equal(blocked.action('tests').props.disabled, false); blocked.unmount()
  for (const storageThrows of ['read', 'remove']) {
    const gate = deferred(), reached = deferred()
    const h = mount('en', { storageThrows, async afterRoute(call, response) {
      if (call.path === '/api/app/auth/start') { reached.resolve(); await gate.promise }
      return response
    } })
    h.setActor(null); const work = h.start(); await reached.promise
    h.unmount(); gate.resolve(); await work
    assert.equal(h.authNavigations.length, 0); assert.equal(h.dispatches.length, 0)
  }
})
