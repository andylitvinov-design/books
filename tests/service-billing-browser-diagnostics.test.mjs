import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { billingStatusRequestDiagnostic, installBillingStatusLifecycleDiagnostics } from '../scripts/billing-status-browser-diagnostics.mjs'
const origin = 'http://127.0.0.1:3100'
const request = (url, errorText) => ({ url: () => url, failure: () => ({ errorText }) })
test('diagnostic captures only exact same-origin billing status, without query values', () => {
  assert.deepEqual(billingStatusRequestDiagnostic(origin, request(origin + '/api/app/billing/status?private=synthetic', 'cancelled'), 42), {
    kind: 'requestfailed', at: 42, path: '/api/app/billing/status', errorText: 'cancelled',
  })
  for (const url of ['https://other.example/api/app/billing/status', origin + '/api/app/billing/checkout', origin + '/api/app/bootstrap'])
    assert.equal(billingStatusRequestDiagnostic(origin, request(url, 'cancelled')), null)
  assert.equal(billingStatusRequestDiagnostic(origin, request(origin + '/api/app/billing/status', 'CORS blocked https://host/?secret=value')).errorText, '[unclassified error text redacted]')
})
test('lifecycle probe preserves rejected fetch identity, emits abort only on actual signal, and never reads a body', async () => {
  const events = [], controller = new AbortController(), callbacks = {}
  let reject
  const result = new Promise((_, no) => { reject = no })
  const window = { location: { href: origin + '/en/app/tests?private=synthetic', origin, pathname: '/en/app/tests' }, fetch: () => result,
    addEventListener: (key, callback) => { callbacks[key] = callback },
    __hhBillingStatusDiagnostic: async event => { events.push(event) },
  }
  const document = { visibilityState: 'visible', addEventListener: (key, callback) => { callbacks[key] = callback } }
  vm.runInNewContext(`(${installBillingStatusLifecycleDiagnostics.toString()})()`, { window, document, URL, Date })
  const observed = window.fetch('/api/app/billing/status', { signal: controller.signal })
  assert.equal(observed, result)
  assert.deepEqual(events.map(x => x.kind), ['request-start'])
  controller.abort(); callbacks.pagehide()
  const failure = new TypeError('genuine active request CORS failure')
  reject(failure)
  await assert.rejects(observed, error => error === failure)
  assert.deepEqual(events.map(x => x.kind), ['request-start', 'signal-abort', 'pagehide'])
  assert.ok(events.every(x => !JSON.stringify(x).includes('private')))
})
test('diagnostics never suppress the current billing pageerror or weaken final error assertion', () => {
  const source = readFileSync(new URL('../scripts/verify-app-r1.mjs', import.meta.url), 'utf8')
  const handler = source.slice(source.indexOf('const capturePageError='), source.indexOf("page.on('pageerror'"))
  assert.ok(handler.indexOf('errors.push(error.message)') < handler.indexOf('SYNTHETIC_BILLING_STATUS_PAGEERROR_AT'))
  assert.match(source, /assert\.deepEqual\(errors,\[\]\)/)
})


test('probe does not mark an unhandled fetch rejection handled', () => {
  const script = `
    import { installBillingStatusLifecycleDiagnostics } from ${JSON.stringify(new URL('../scripts/billing-status-browser-diagnostics.mjs', import.meta.url).href)};
    let count = 0;
    process.on('unhandledRejection', error => { if (error.message === 'synthetic uncaught fetch') count++; });
    globalThis.window = { location: { origin: 'http://127.0.0.1:3100', href: 'http://127.0.0.1:3100/en/app', pathname: '/en/app' },
      fetch: () => Promise.reject(new Error('synthetic uncaught fetch')), addEventListener() {}, __hhBillingStatusDiagnostic: async () => {} };
    globalThis.document = { visibilityState: 'visible', addEventListener() {} };
    installBillingStatusLifecycleDiagnostics();
    window.fetch('/api/app/billing/status');
    setTimeout(() => { console.log(count); process.exitCode = count === 1 ? 0 : 1; }, 30);
  `
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr + result.stdout)
  assert.equal(result.stdout.trim(), '1')
})


test('probe preserves native validation for invalid, URL, Request and throwing-signal inputs', async () => {
  const response = Promise.resolve({}), calls = [], events = []
  const window = { location: { href: origin + '/en/app', origin, pathname: '/en/app' },
    fetch: (...args) => { calls.push(args); return response }, addEventListener() {},
    __hhBillingStatusDiagnostic: async event => { events.push(event) } }
  const document = { visibilityState: 'visible', addEventListener() {} }
  vm.runInNewContext(`(${installBillingStatusLifecycleDiagnostics.toString()})()`, { window, document, URL, Date })
  const inputs = ['http://[', null, new URL(origin + '/api/app/billing/status'), { url: origin + '/api/app/billing/status' }]
  for (const input of inputs) assert.equal(window.fetch(input), response)
  const throwingOptions = { get signal() { throw new Error('synthetic getter'); } }
  assert.equal(window.fetch('/api/app/billing/status', throwingOptions), response)
  assert.equal(calls.length, 5)
  assert.equal(events.filter(x => x.kind === 'request-start').length, 2, 'URL and Request inputs remain observable')
  const thrown = new Error('native synchronous failure')
  const otherWindow = { ...window, fetch() { throw thrown } }
  vm.runInNewContext(`(${installBillingStatusLifecycleDiagnostics.toString()})()`, { window: otherWindow, document, URL, Date })
  assert.throws(() => otherWindow.fetch('bad'), error => error === thrown)
})


test('explicit null signal disables inherited Request abort observation', () => {
  const events = [], controller = new AbortController(); controller.abort()
  const window = { location: { href: origin + '/en/app', origin, pathname: '/en/app' },
    fetch: () => Promise.resolve({}), addEventListener() {}, __hhBillingStatusDiagnostic: async event => { events.push(event.kind) } }
  const document = { visibilityState: 'visible', addEventListener() {} }
  vm.runInNewContext(`(${installBillingStatusLifecycleDiagnostics.toString()})()`, { window, document, URL, Date })
  const request = { url: origin + '/api/app/billing/status', signal: controller.signal }
  window.fetch(request, { signal: null })
  assert.deepEqual(events, ['request-start'])
  window.fetch(request, { signal: undefined })
  assert.deepEqual(events, ['request-start', 'request-start', 'signal-abort'])
})
