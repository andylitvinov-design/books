import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { spawnSync } from 'node:child_process'
import vm from 'node:vm'
import {
  testPlanDiagnosticPath, installTestPlanDOMDiagnostics, installTestPlanNavigationDiagnostics,
} from '../scripts/test-plan-navigation-diagnostics.mjs'

const origin = 'http://127.0.0.1:3100'
const id = '9fdd2141-c96c-414b-b470-de8f4882c4ee'
class FakePage extends EventEmitter {
  address = origin + '/en/app/tests?plan=private-plan&token=private-token'
  frame = { url: () => this.address }
  url() { return this.address }
  mainFrame() { return this.frame }
  async exposeBinding(name, fn) { this.bindingName = name; this.binding = fn }
  async addInitScript(fn) { this.init = fn }
  async evaluate(fn) { this.evaluated = fn }
}
const request = (path, failure = '') => ({
  url: () => origin + path, method: () => 'POST', failure: () => ({ errorText: failure }),
  headers() { throw new Error('Must not read headers') },
  postData() { throw new Error('Must not read body') },
})
function domHarness(binding = async () => {}) {
  const listeners = new Map(), calls = []
  const add = (kind, callback, options) => { listeners.set(kind, callback); calls.push({ kind, options }) }
  const history = { pushState() {}, replaceState() {} }
  const fetch = () => Promise.resolve('original')
  const window = { location: { pathname: '/en/app/tests', search: '?plan=private-plan&token=private-token' },
    addEventListener: add, history, fetch, __hhTestPlanNavigationDiagnostic: binding }
  const document = { visibilityState: 'visible', addEventListener: add }
  vm.runInNewContext(`(${installTestPlanDOMDiagnostics.toString()})()`, { window, document, Date, URLSearchParams })
  return { window, document, listeners, calls, history, fetch }
}

test('paths are same-origin allowlisted, queries discarded and record IDs normalized', () => {
  assert.equal(testPlanDiagnosticPath(origin + '/api/app/test-plans/' + id + '?token=private', origin), '/api/app/test-plans/:id')
  assert.equal(testPlanDiagnosticPath(origin + '/api/app/runs/' + id + '/save?answers=private', origin), '/api/app/runs/:id/save')
  assert.equal(testPlanDiagnosticPath(origin + '/en/app/runs/' + id + '?plan=private#secret', origin), '/en/app/runs/:id')
  assert.equal(testPlanDiagnosticPath(origin + '/api/app/bootstrap?private=yes', origin), '/api/app/bootstrap')
  for (const address of [
    'https://elsewhere.test/api/app/runs', origin + '/api/app/reports/private',
    origin + '/api/app/runs/private-name', origin + '/api/app/runs/' + id + '/private-name',
    origin + '/en/app/private-name', 'http://user:password@127.0.0.1:3100/api/app/runs', 'http://[',
  ]) assert.equal(testPlanDiagnosticPath(address, origin), null)
})

test('Playwright observers preserve scope, request order, errors, and existing listeners', async () => {
  const page = new FakePage(), records = [], applicationErrors = []
  page.on('pageerror', error => applicationErrors.push(error))
  const diagnostic = await installTestPlanNavigationDiagnostics(page, origin, record => records.push(record))
  assert.equal(page.init, installTestPlanDOMDiagnostics)
  assert.equal(page.evaluated, installTestPlanDOMDiagnostics)
  assert.equal(page.listenerCount('pageerror'), 1)
  const outside = request('/api/app/runs')
  page.emit('request', outside)
  assert.equal(records.length, 0)
  diagnostic.marker('enter-test-begin')
  diagnostic.marker('before-start-click')
  const run = request('/api/app/runs?token=private-token', 'CORS blocked https://secret.test/private')
  page.emit('request', run)
  page.emit('response', { request: () => run, status: () => 201, body() { throw new Error('Body read') } })
  page.emit('requestfailed', run)
  page.address = origin + '/en/app/runs/' + id + '?mode=quick&plan=private'
  page.emit('framenavigated', { url: () => page.address })
  page.emit('framenavigated', page.frame)
  const genuine = new Error('Genuine uncaught application failure')
  page.emit('pageerror', genuine)
  assert.deepEqual(applicationErrors, [genuine])
  assert.deepEqual(records.map(record => record.kind), ['marker', 'marker', 'request', 'response', 'requestfailed', 'route-commit'])
  assert.equal(records[2].requestId, records[3].requestId)
  assert.equal(records[4].failure, 'other')
  assert.equal(records[5].path, '/en/app/runs/:id')
  assert.equal(records[5].hasPlan, true)
  assert.ok(!/private|token|secret|9fdd2141/.test(JSON.stringify(records)))
  diagnostic.marker('enter-test-end')
  const count = records.length
  page.emit('requestfailed', run)
  assert.equal(records.length, count)
  diagnostic.marker('enter-test-begin')
  page.emit('response', { request: () => run, status: () => 201 })
  assert.equal(records.length, count + 1, 'prior scope cannot leak into next journey')
  assert.equal(records.at(-1).scope, 2)
  assert.throws(() => diagnostic.marker('private arbitrary label'), /Unknown/)
  diagnostic.dispose()
  assert.equal(page.listenerCount('request'), 0)
  assert.equal(page.listenerCount('pageerror'), 1)
  page.emit('pageerror', genuine)
  assert.equal(applicationErrors.length, 2)
})

test('binding accepts only fixed diagnostic fields and rejects arbitrary paths or target labels', async () => {
  const page = new FakePage(), records = []
  const diagnostic = await installTestPlanNavigationDiagnostics(page, origin, record => records.push(record))
  diagnostic.marker('enter-test-begin')
  const event = { kind: 'click', at: 42, path: '/en/app/tests', visibility: 'visible', hasPlan: true,
    targetClass: 'saved-test-action', intendedStart: true, disabled: false, connected: true,
    text: 'private text', headers: { Authorization: 'private token' } }
  await page.binding({ frame: page.frame }, event)
  assert.equal(records.at(-1).intendedStart, true)
  assert.ok(!JSON.stringify(records).includes('private'))
  const count = records.length
  for (const override of [{ kind: 'pageerror' }, { path: '/en/app/runs/' + id },
    { targetClass: 'private text' }, { visibility: 'private' }, { connected: 'true' }, { at: NaN }])
    await page.binding({ frame: page.frame }, { ...event, ...override })
  await page.binding({ frame: {} }, event)
  assert.equal(records.length, count)
  diagnostic.dispose()
})

test('DOM listeners are passive capture observers and classify the saved-row action without text', async () => {
  const events = [], harness = domHarness(async event => events.push(event))
  assert.equal(harness.window.fetch, harness.fetch)
  assert.equal(harness.window.history, harness.history)
  assert.deepEqual(harness.calls.map(call => call.kind), ['pointerdown', 'click', 'pagehide', 'beforeunload', 'visibilitychange'])
  assert.ok(harness.calls.every(call => call.options.capture && call.options.passive))
  const row = { closest: selector => selector === '#my-tests-list' ? {} : null }
  const button = { disabled: false, isConnected: true, classList: { contains: name => name === 'hh-primary' },
    closest: selector => selector === '[data-saved-test]' ? row : null,
    get textContent() { throw new Error('Must not read text') } }
  const target = { closest: selector => selector === 'button' ? button : null, isConnected: true }
  for (const type of ['pointerdown', 'click']) harness.listeners.get(type)({ type, target,
    preventDefault() { throw new Error('Must not cancel') }, stopPropagation() { throw new Error('Must not stop') } })
  harness.listeners.get('click')({ type: 'click', target: { isConnected: true } })
  harness.listeners.get('pagehide')()
  assert.deepEqual(events.map(event => event.kind), ['pointerdown', 'click', 'click', 'pagehide'])
  assert.equal(events[0].targetClass, 'saved-test-action')
  assert.equal(events[1].intendedStart, true)
  assert.equal(events[2].intendedStart, false)
  assert.equal(events[2].targetClass, 'other')
  assert.ok(!JSON.stringify(events).includes('private'))
  harness.window.location.pathname = '/en/app/runs/' + id
  harness.listeners.get('visibilitychange')()
  assert.equal(events.at(-1).path, '/en/app/runs/:id')
  harness.window.location.pathname = '/en/app/private-name'
  const count = events.length
  harness.listeners.get('pagehide')()
  assert.equal(events.length, count)
})

test('missing, throwing and rejected diagnostic bindings do not cause unhandled failures', async () => {
  for (const callback of [undefined, () => { throw new Error('Closing binding') }, () => Promise.reject(new Error('Closed binding'))]) {
    const harness = domHarness(callback)
    if (callback === undefined) delete harness.window.__hhTestPlanNavigationDiagnostic
    assert.doesNotThrow(() => harness.listeners.get('pagehide')())
  }
  await new Promise(resolve => setImmediate(resolve))
})

test('unhandled application fetch rejection and native fetch identity remain unchanged', () => {
  const script = `
    import { installTestPlanDOMDiagnostics } from ${JSON.stringify(new URL('../scripts/test-plan-navigation-diagnostics.mjs', import.meta.url).href)};
    let count = 0;
    process.on('unhandledRejection', error => { if (error.message === 'synthetic uncaught fetch') count++; });
    const original = () => Promise.reject(new Error('synthetic uncaught fetch'));
    globalThis.window = { location: { pathname: '/en/app/tests', search: '' }, fetch: original,
      addEventListener() {}, __hhTestPlanNavigationDiagnostic: async () => {} };
    globalThis.document = { visibilityState: 'visible', addEventListener() {} };
    installTestPlanDOMDiagnostics();
    if (window.fetch !== original) throw new Error('Fetch was replaced');
    window.fetch('/api/app/runs');
    setTimeout(() => { console.log(count); process.exitCode = count === 1 ? 0 : 1; }, 30);
  `
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr + result.stdout)
  assert.equal(result.stdout.trim(), '1')
})

test('installation refuses non-loopback origins without registering observers', async () => {
  const page = new FakePage()
  await assert.rejects(installTestPlanNavigationDiagnostics(page, 'https://production.example', () => {}), /isolated loopback/)
  assert.deepEqual(page.eventNames(), [])
})
