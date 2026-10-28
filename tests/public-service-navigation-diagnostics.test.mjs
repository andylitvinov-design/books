import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { observePublicServiceNavigation, withPublicServiceNavigationDiagnostics } from '../scripts/helpers/public-service-navigation-diagnostics.mjs'

const scope = { origin: 'http://localhost:3100', locale: 'en', slug: 'alchemy-of-soul', width: 320, runtime: 'isolated' }
const target = scope.origin + '/en/services/alchemy-of-soul'
const sentinel = 'PRIVATE_name@example.test-secret-token'
class Page extends EventEmitter {
  constructor() { super(); this.current = 'about:blank'; this.closed = false; this.frame = { url: () => this.current }; this.calls = [] }
  mainFrame() { return this.frame }
  url() { return this.current }
  isClosed() { return this.closed }
  evaluate() { assert.fail('Passive observer must not evaluate the page') }
  locator() { assert.fail('Passive observer must not query DOM readiness') }
  route() { assert.fail('Passive observer must not intercept traffic') }
  waitForTimeout() { assert.fail('Passive observer must not wait or retry') }
  async goto(url, options) { this.calls.push([url, options]); throw new Error('fixture goto') }
}
const request = (url = target, resource = 'document', method = 'GET', extra = {}) => ({
  url: () => url, resourceType: () => resource, method: () => method,
  isNavigationRequest: () => resource === 'document', frame: () => null, failure: () => ({ errorText: 'net::ERR_ABORTED ' + sentinel }),
  headers: () => assert.fail('Never read headers'), postData: () => assert.fail('Never read bodies'), ...extra,
})
const response = (req, status) => ({ request: () => req, status: () => status,
  body: () => assert.fail('Never read response bodies'), allHeaders: () => assert.fail('Never read headers') })
const listeners = page => page.eventNames().reduce((sum, name) => sum + page.listenerCount(name), 0)

test('failed exact-page navigation records document status, frame/DCL/load, failed and pending requests without recovery', async () => {
  const page = new Page(), other = new Page(), logs = [], primary = new Error('Timeout 30000ms exceeded ' + sentinel)
  let navigations = 0
  await assert.rejects(withPublicServiceNavigationDiagnostics(page, { ...scope, log: (...args) => logs.push(args) }, async () => {
    navigations++
    const doc = request(target, 'document', 'GET', { frame: () => page.frame }), pending = request(scope.origin + '/api/service-enquiries/booking-status?private=' + sentinel, 'fetch')
    page.emit('request', doc); page.emit('response', response(doc, 200))
    page.current = target; page.emit('framenavigated', page.frame); page.emit('domcontentloaded'); page.emit('load'); page.emit('requestfinished', doc)
    page.emit('request', pending); page.emit('response', response(pending, 401))
    const broken = request(scope.origin + '/_next/static/secret/' + sentinel + '.js', 'script')
    page.emit('request', broken); page.emit('requestfailed', broken)
    other.emit('request', request('https://private.invalid/' + sentinel))
    throw primary
  }), error => error === primary)
  assert.equal(navigations, 1); assert.equal(logs.length, 1)
  const [name, evidence] = logs[0]
  assert.equal(name, 'SYNTHETIC_PUBLIC_SERVICE_NAVIGATION_FAILURE')
  assert.equal(evidence.service, 'alchemy'); assert.equal(evidence.locale, 'en'); assert.equal(evidence.width, 320)
  assert.equal(evidence.currentRoute, 'public-alchemy'); assert.equal(evidence.observer, 'completed')
  assert.deepEqual(evidence.lifecycle, { domcontentloaded: true, load: true, crash: false, close: false })
  assert.deepEqual(evidence.lastMainDocumentResponse, { route: 'public-alchemy', status: 200 })
  assert.equal(evidence.mainFrameNavigations, 1); assert.equal(evidence.lastMainFrameRoute, 'public-alchemy')
  assert.equal(evidence.pendingCount, 1); assert.equal(evidence.pendingDetailsTruncated, 0)
  assert.deepEqual(evidence.pendingDetails, [{ id: 2, route: 'booking-status', method: 'GET', resource: 'fetch', navigation: false, status: 401 }])
  assert.ok(evidence.events.some(event => event.type === 'response' && event.status === 200 && event.resource === 'document'))
  assert.ok(evidence.events.some(event => event.type === 'frame' && event.main && event.route === 'public-alchemy'))
  for (const type of ['domcontentloaded', 'load']) assert.ok(evidence.events.some(event => event.type === type))
  assert.ok(evidence.events.some(event => event.type === 'request-failed' && event.category === 'request_aborted'))
  assert.ok(Number.isInteger(evidence.elapsedMs) && evidence.elapsedMs >= 0)
  assert.equal(listeners(page), 0); assert.equal(listeners(other), 0)
  assert.doesNotMatch(JSON.stringify(evidence), /PRIVATE|secret|https?:|localhost|private\.invalid|ERR_ABORTED/)
})

test('successful navigation is silent, returns the exact response and removes only its own listeners', async () => {
  const page = new Page(), token = {}, logs = [], existing = () => {}
  page.on('pageerror', existing)
  const result = await withPublicServiceNavigationDiagnostics(page, { ...scope, log: (...args) => logs.push(args) }, async () => {
    page.emit('request', request()); page.emit('pageerror', new TypeError(sentinel)); return token
  })
  assert.equal(result, token); assert.deepEqual(logs, []); assert.deepEqual(page.listeners('pageerror'), [existing]); assert.equal(listeners(page), 1)
})

for (const failure of ['setup-before', 'setup-after', 'off', 'url', 'isClosed', 'log', 'request-getter']) {
  test('observer failure cannot replace primary goto failure: ' + failure, async () => {
    const page = new Page(), primary = new Error('primary'), logs = []
    let calls = 0, onCalls = 0
    const on = page.on.bind(page), off = page.off.bind(page)
    if (failure.startsWith('setup')) page.on = (name, fn) => { onCalls++; if (onCalls === 2) { if (failure === 'setup-after') on(name, fn); throw new Error(sentinel) } return on(name, fn) }
    if (failure === 'off') page.off = () => { throw new Error(sentinel) }
    if (failure === 'url') page.url = () => { throw new Error(sentinel) }
    if (failure === 'isClosed') page.isClosed = () => { throw new Error(sentinel) }
    await assert.rejects(withPublicServiceNavigationDiagnostics(page, { ...scope, log: (...args) => { if (failure === 'log') throw new Error(sentinel); logs.push(args) } }, async () => {
      calls++
      if (failure === 'request-getter') page.emit('request', request(target, 'document', 'GET', { url: () => { throw new Error(sentinel) } }))
      throw primary
    }), error => error === primary)
    assert.equal(calls, 1)
    if (failure !== 'off') assert.equal(listeners(page), 0)
    // A failed off implementation may leave callback registrations behind,
    // but stopped callbacks remain inert and never emit late diagnostics.
    const before = JSON.stringify(logs); page.emit('load'); page.emit('request', request()); assert.equal(JSON.stringify(logs), before)
    assert.doesNotMatch(JSON.stringify(logs), /PRIVATE|primary/)
    for (const name of page.eventNames()) for (const fn of page.listeners(name)) off(name, fn)
  })
}

test('setup failure also cannot fail an otherwise successful navigation', async () => {
  const page = new Page(), token = {}; let calls = 0
  page.on = () => { throw new Error(sentinel) }
  assert.equal(await withPublicServiceNavigationDiagnostics(page, { ...scope, log: () => assert.fail('Success must stay silent') }, async () => { calls++; return token }), token)
  assert.equal(calls, 1)
})

for (const [key, value] of [['runtime','production'], ['origin','https://localhost:3100'], ['origin','http://remote.example:3100'], ['origin','http://user:secret@localhost:3100'], ['origin','http://localhost:3100/?secret=1'], ['locale','es'], ['slug','private-customer'], ['width',321]]) {
  test('direct observer refuses non-allowlisted scope before attaching: ' + key + '=' + value, () => {
    const page = new Page()
    assert.throws(() => observePublicServiceNavigation(page, { ...scope, [key]: value }))
    assert.equal(listeners(page), 0)
  })
}

test('route aliases and request enums discard arbitrary paths, queries, fragments, credentials and external hosts', () => {
  const page = new Page(), observer = observePublicServiceNavigation(page, scope)
  for (const [path, alias] of [
    ['/en/services/dao-health-profile','public-dao'], ['/ru/services/alchemy-of-soul','public-alchemy'],
    ['/en/services/hypnotherapy-course','public-hypnotherapy'], ['/ru/services/free-situation-review','public-free-review'],
    ['/api/service-enquiries/booking-status','booking-status'], ['/api/app/auth/contact-profile','contact-profile'],
    ['/api/app/bootstrap','app-bootstrap'], ['/api/app/guest/bootstrap','guest-bootstrap'],
    ['/_next/webpack-hmr','next-hmr'], ['/_next/image','next-image'], ['/_next/static/' + sentinel,'next-static'],
    ['/private/' + sentinel,'other-local'],
  ]) {
    const req = request(scope.origin + path + '?secret=' + sentinel + '#' + sentinel)
    page.emit('request', req); page.emit('requestfinished', req)
  }
  for (const url of ['https://private.example/' + sentinel, 'http://user:' + sentinel + '@localhost:3100/en/services/alchemy-of-soul', 'not a URL ' + sentinel]) {
    page.emit('request', request(url, sentinel, sentinel))
  }
  const result = observer.stop(), encoded = JSON.stringify(result)
  assert.doesNotMatch(encoded, /PRIVATE|secret|private\.example|https?:|localhost|not a URL/)
  const aliases = result.events.filter(x => x.type === 'request').map(x => x.route)
  assert.deepEqual(aliases.slice(0, 12), ['public-dao','public-alchemy','public-hypnotherapy','public-free-review','booking-status','contact-profile','app-bootstrap','guest-bootstrap','next-hmr','next-image','next-static','other-local'])
  assert.deepEqual(aliases.slice(12), ['external','other','other'])
  for (const row of result.pendingDetails) { assert.equal(row.method, 'OTHER'); assert.equal(row.resource, 'other') }
})

test('request/header status does not imply completion and duplicate end events cannot underflow pending count', () => {
  const page = new Page(), observer = observePublicServiceNavigation(page, scope), req = request()
  page.emit('request', req); page.emit('request', req); page.emit('response', response(req, 200))
  page.emit('requestfinished', request()) // unknown request cannot affect the count
  const result = observer.stop()
  assert.equal(result.pendingCount, 1); assert.equal(result.pendingDetails[0].status, 200)
  const next = observePublicServiceNavigation(page, scope)
  page.emit('request', req); page.emit('requestfinished', req); page.emit('requestfailed', req)
  assert.equal(next.stop().pendingCount, 0)
})

test('bounded event/pending details retain accurate pending count and completion after event saturation', () => {
  const page = new Page(), observer = observePublicServiceNavigation(page, scope), requests = []
  for (let i = 0; i < 250; i++) { const req = request(target, 'image'); requests.push(req); page.emit('request', req) }
  for (const req of requests.slice(0, 50)) page.emit('requestfinished', req)
  const doc = request(target, 'document', 'GET', { frame: () => page.frame })
  page.emit('request', doc); page.emit('response', response(doc, 200)); page.emit('requestfinished', doc)
  page.current = target; page.emit('framenavigated', page.frame); page.emit('domcontentloaded'); page.emit('load')
  const result = observer.stop()
  assert.equal(result.events.length, 100); assert.equal(result.droppedEvents, 206)
  assert.deepEqual(result.lastMainDocumentResponse, { route: 'public-alchemy', status: 200 })
  assert.equal(result.mainFrameNavigations, 1); assert.equal(result.lastMainFrameRoute, 'public-alchemy')
  assert.equal(result.lifecycle.domcontentloaded, true); assert.equal(result.lifecycle.load, true)
  assert.equal(result.pendingCount, 200); assert.ok(result.pendingDetails.length <= 32)
  assert.equal(result.pendingDetailsTruncated, result.pendingCount - result.pendingDetails.length)
  assert.equal(listeners(page), 0)
})

test('stop is idempotent, detached, immutable and never samples a later success', () => {
  const page = new Page(), observer = observePublicServiceNavigation(page, scope)
  page.emit('request', request()); const first = observer.stop(), frozen = structuredClone(first)
  first.events[0].route = sentinel; first.pendingDetails.push({ secret: sentinel })
  page.current = target; page.emit('load'); page.emit('requestfinished', request())
  assert.deepEqual(observer.stop(), frozen); assert.equal(frozen.currentRoute, 'blank'); assert.equal(listeners(page), 0)
})

test('document failure, JS error and crash are categorical evidence, not successful readiness', async () => {
  const page = new Page(), logs = [], primary = new Error('navigation failure'), req = request()
  await assert.rejects(withPublicServiceNavigationDiagnostics(page, { ...scope, log: (_, event) => logs.push(event) }, async () => {
    page.emit('request', req); page.emit('response', response(req, 500)); page.emit('requestfailed', req)
    page.emit('pageerror', new TypeError(sentinel)); page.emit('crash'); throw primary
  }), error => error === primary)
  assert.ok(logs[0].events.some(x => x.type === 'response' && x.status === 500))
  assert.ok(logs[0].events.some(x => x.type === 'page-error' && x.category === 'unclassified_error'))
  assert.ok(logs[0].events.some(x => x.type === 'crash'))
  assert.ok(!logs[0].events.some(x => x.type === 'domcontentloaded' || x.type === 'load'))
})

test('invalid response status is never emitted as arbitrary data', () => {
  const page = new Page(), observer = observePublicServiceNavigation(page, scope), req = request()
  page.emit('request', req); page.emit('response', response(req, sentinel))
  const result = observer.stop(); assert.equal(result.pendingDetails[0].status, null); assert.doesNotMatch(JSON.stringify(result), /PRIVATE/)
})

test('hostile error accessors, inherited fields, coercion and Proxy traps are never executed', async () => {
  const reads = { message: 0, name: 0, errorText: 0, inherited: 0, coercion: 0, proxy: 0 }
  const page = new Page(), primary = new Error('original goto failure'), logs = []
  const accessor = Object.defineProperties({}, {
    message: { get() { reads.message++; return sentinel } },
    name: { get() { reads.name++; return sentinel } },
  })
  const failure = Object.defineProperty({}, 'errorText', { get() { reads.errorText++; return sentinel } })
  const inherited = Object.create(Object.defineProperties({}, {
    message: { get() { reads.inherited++; return sentinel } },
    name: { get() { reads.inherited++; return sentinel } },
  }))
  const coercible = { message: { toString() { reads.coercion++; return sentinel } }, name: { toString() { reads.coercion++; return sentinel } } }
  const proxy = new Proxy({}, {
    get() { reads.proxy++; throw new Error(sentinel) },
    getOwnPropertyDescriptor() { reads.proxy++; throw new Error(sentinel) },
    getPrototypeOf() { reads.proxy++; throw new Error(sentinel) },
  })
  const { proxy: revoked, revoke } = Proxy.revocable({}, {}); revoke()
  await assert.rejects(withPublicServiceNavigationDiagnostics(page, { ...scope, log: (_, value) => logs.push(value) }, async () => {
    for (const error of [accessor, inherited, coercible, proxy, revoked]) page.emit('pageerror', error)
    for (const value of [failure, proxy, revoked, { errorText: { toString() { reads.coercion++; return sentinel } } }]) {
      const req = request(target, 'fetch', 'GET', { failure: () => value })
      page.emit('request', req); page.emit('requestfailed', req)
    }
    throw primary
  }), error => error === primary)
  assert.deepEqual(reads, { message: 0, name: 0, errorText: 0, inherited: 0, coercion: 0, proxy: 0 }, 'Foreign diagnostic getters/coercions must never run')
  assert.equal(logs[0].diagnosticErrors, 0)
  for (const event of logs[0].events.filter(event => ['page-error','request-failed'].includes(event.type))) assert.equal(event.category, 'unclassified_error')
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE|original goto failure/)
})

test('foreign route values never invoke URL coercion on request, frame or page observations', () => {
  let coercions = 0
  const hostile = { toString() { coercions++; return target + '?private=' + sentinel } }
  const page = new Page(), observer = observePublicServiceNavigation(page, scope)
  page.emit('request', request(hostile))
  page.frame.url = () => hostile; page.emit('framenavigated', page.frame)
  page.url = () => hostile
  const evidence = observer.stop()
  assert.equal(coercions, 0, 'Foreign route coercion must never run')
  assert.equal(evidence.currentRoute, 'other'); assert.equal(evidence.lastMainFrameRoute, 'other')
  assert.equal(evidence.pendingDetails[0].route, 'other')
  assert.doesNotMatch(JSON.stringify(evidence), /PRIVATE|https?:/)
})

test('own primitive error data remains categorizable without inspecting a prototype', () => {
  const page = new Page(), observer = observePublicServiceNavigation(page, scope)
  page.emit('pageerror', { message: 'Failed to fetch ' + sentinel, name: 'Error' })
  page.emit('pageerror', { message: 'safe', name: 'TypeError' })
  const evidence = observer.stop()
  assert.deepEqual(evidence.events.map(event => event.category), ['network_fetch_error','javascript_type_error'])
  assert.doesNotMatch(JSON.stringify(evidence), /PRIVATE/)
})

test('ordinary rejected native-Promise sink is consumed without awaiting or reading its foreign then', async () => {
  const page = new Page(), primary = new Error('original navigation failure'), sinkFailure = new Error('synthetic sink failure')
  let thenReads = 0, navigations = 0
  // node:test itself fails on an unhandled rejection; install no global handler.
  {
    for (const ownConstructor of [false, true]) {
      await assert.rejects(withPublicServiceNavigationDiagnostics(page, { ...scope, log: () => {
        const rejected = Promise.reject(sinkFailure)
        Object.defineProperty(rejected, 'then', { get() { thenReads++; throw new Error(sentinel) } })
        if (ownConstructor) Object.defineProperty(rejected, 'constructor', { value: Promise })
        return rejected
      } }, async () => { navigations++; throw primary }), error => error === primary)
    }
    await new Promise(resolve => setImmediate(resolve)) // Unit-only event-loop flush, never part of navigation.
    assert.equal(thenReads, 0); assert.equal(navigations, 2); assert.equal(listeners(page), 0)
  }
})

test('pending native-Promise sink never delays the original navigation rejection', async () => {
  const page = new Page(), primary = new Error('primary'), pending = new Promise(() => {})
  let failureDelivered = false
  const result = withPublicServiceNavigationDiagnostics(page, { ...scope, log: () => pending }, async () => { throw primary })
  await result.catch(error => { assert.equal(error, primary); failureDelivered = true })
  assert.equal(failureDelivered, true); assert.equal(listeners(page), 0)
})

test('arbitrary thenables, proxies and exotic Promise constructor/species paths are never assimilated', async () => {
  const reads = { then: 0, constructor: 0, species: 0, proxy: 0 }, primary = new Error('primary')
  const thenable = Object.defineProperty({}, 'then', { get() { reads.then++; return () => { reads.then++ } } })
  const proxy = new Proxy({}, { get() { reads.proxy++; return () => {} }, getOwnPropertyDescriptor() { reads.proxy++; return undefined } })
  const ownConstructor = Promise.resolve()
  Object.defineProperty(ownConstructor, 'constructor', { get() { reads.constructor++; return Promise } })
  const inheritedConstructor = Promise.resolve()
  Object.setPrototypeOf(inheritedConstructor, Object.create(Promise.prototype, { constructor: { get() { reads.constructor++; return Promise } } }))
  const customConstructor = Promise.resolve(), foreignConstructor = {}
  Object.defineProperty(foreignConstructor, Symbol.species, { get() { reads.species++; return Promise } })
  Object.defineProperty(customConstructor, 'constructor', { value: foreignConstructor })
  for (const value of [thenable, proxy, ownConstructor, inheritedConstructor, customConstructor]) {
    const page = new Page()
    await assert.rejects(withPublicServiceNavigationDiagnostics(page, { ...scope, log: () => value }, async () => { throw primary }), error => error === primary)
    assert.equal(listeners(page), 0)
  }
  assert.deepEqual(reads, { then: 0, constructor: 0, species: 0, proxy: 0 }, 'Sink results must never invoke foreign then/constructor/species/proxy hooks')
})

test('actual verifier binding invokes exactly the same networkidle goto on the actual service page', async () => {
  const source = readFileSync(new URL('../scripts/verify-app-r1.mjs', import.meta.url), 'utf8')
  const call = "await withPublicServiceNavigationDiagnostics(servicePage,{origin,locale,slug,width},\n     ()=>servicePage.goto(origin+'/'+locale+'/services/'+slug,{waitUntil:'networkidle'}))"
  assert.equal(source.split(call).length - 1, 1, 'Exact original navigation barrier must be retained once')
  assert.match(source, /servicePage\.on\('pageerror',error=>publicErrors\.push\(error\.message\)\)/)
  assert.match(source, /assert\.deepEqual\(publicErrors,\[\]\)/)
  const page = new Page(), primary = new Error('same goto failure'), calls = []
  page.goto = async (url, options) => { calls.push({ url, options }); throw primary }
  await assert.rejects(runInNewContext('(async()=>{' + call + '})()', {
    servicePage: page, origin: scope.origin, locale: scope.locale, slug: scope.slug, width: scope.width,
    withPublicServiceNavigationDiagnostics: (actual, opts, navigate) => {
      assert.equal(actual, page)
      return withPublicServiceNavigationDiagnostics(actual, { ...opts, runtime: 'isolated', log: () => {} }, navigate)
    },
  }), error => error === primary)
  assert.equal(calls.length, 1); assert.equal(calls[0].url, target)
  assert.equal(JSON.stringify(calls[0].options), '{"waitUntil":"networkidle"}')
  assert.equal(listeners(page), 0)
})
