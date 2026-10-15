import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import * as browserTools from '../lib/notifications/browser.js'
import * as contracts from '../lib/notifications/contracts.js'

// Execute the component's actual handlers with synthetic hooks, not a duplicate
// controller. Browser/HTTP dependencies are local fakes; no network or DB access.
const source = readFileSync('components/pwa/course-notification-settings.jsx', 'utf8')
let code = source.replace(/^import .*$/gm, '').replace('export default function', 'function')
code = code.slice(0, code.indexOf('  if (!accountId) return null')) + '  return {enable,disable,save};\n}\nreturn CourseNotificationSettings;'
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)) }
const until = async predicate => {
  const deadline = Date.now() + 5000
  while (!predicate()) { assert.ok(Date.now() < deadline, 'synthetic handler did not reach its expected phase'); await new Promise(resolve => setTimeout(resolve, 1)) }
}
function fixture({ enrolled = false, available = true, stalledDevice = false, pendingReady = false } = {}) {
  const states = [], refs = [], requests = [], stale = deferred(), ready = deferred()
  let stateIndex = 0, refIndex = 0, effect, cleanup, gets = 0, reads = 0, unsubscribeCalls = 0
  const initial = { available, deliveryEnabled: false, deviceCount: enrolled ? 1 : 0, currentDevice: false,
    preferences: { ...contracts.defaultNotificationPreferences(), enabled: enrolled }, preferencesStored: true, publicKey: 'synthetic' }
  const subscription = { endpoint: 'https://fcm.googleapis.com/synthetic', toJSON() { return {} }, unsubscribe: async () => { unsubscribeCalls++; return true } }
  const worker = { active: true, pushManager: { getSubscription: () => stalledDevice ? new Promise(() => {}) : Promise.resolve(subscription) } }
  if (!pendingReady) ready.resolve(worker)
  const deps = {
    useState(initialValue) { const i = stateIndex++; if (!(i in states)) states[i] = initialValue; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value }] },
    useRef(initialValue) { const i = refIndex++; refs[i] ||= { current: initialValue }; return refs[i] },
    useEffect(fn) { effect ||= fn }, useId: () => 'id',
    detectPushCapability: () => ({ supported: true, permission: 'granted' }),
    endpointFingerprint: endpoint => browserTools.endpointFingerprint(endpoint, webcrypto),
    requestPushPermission: async () => 'granted',
    registerDevicePush: async () => ({ subscription, created: false }),
    boundedNotificationWork: work => browserTools.boundedNotificationWork(work, 20),
    defaultNotificationPreferences: contracts.defaultNotificationPreferences,
    validateNotificationPreferences: contracts.validateNotificationPreferences,
    NOTIFICATION_CONSENT_VERSION: contracts.NOTIFICATION_CONSENT_VERSION,
    NOTIFICATION_COPY: { en: { enabled: 'enabled', off: 'off', issue: 'issue', partial: 'partial', saved: 'saved' } },
    window: { isSecureContext: true, addEventListener() {}, removeEventListener() {} },
    navigator: { serviceWorker: { getRegistration: async () => { reads++; return worker }, ready: ready.promise } },
    fetch: async (_url, options) => { requests.push(options.method); return { ok: true, json: async () => options.method === 'GET'
      ? (++gets === 1 ? structuredClone(initial) : stale.promise)
      : options.method === 'PATCH' ? { preferences: initial.preferences } : {} } },
  }
  const Component = Function(...Object.keys(deps), code)(...Object.values(deps))
  const render = () => { stateIndex = 0; refIndex = 0; return Component({ accountId: '11111111-1111-4111-8111-111111111111' }) }
  return { states, requests, stale, ready, worker, render, initial, get reads() { return reads }, get unsubscribeCalls() { return unsubscribeCalls },
    async mount() {
      render(); cleanup = effect(); await until(() => states[1] !== null)
      // Crypto digest uses the asynchronous worker pool. Wait for the actual
      // deferred request, rather than assuming a fixed number of event-loop ticks.
      if (!stalledDevice && (available || enrolled)) await until(() => gets === 2)
      await flush()
    }, unmount() { cleanup() }, consent() { states[4] = true } }
}
for (const withdrawing of [false, true]) test(`late device hydration cannot reverse confirmed ${withdrawing ? 'withdrawal' : 'enrollment'}`, async () => {
  const f = fixture({ enrolled: withdrawing }); await f.mount(); f.consent()
  const actions = f.render()
  if (withdrawing) actions.disable('all'); else actions.enable()
  await flush()
  assert.equal(f.states[1].currentDevice, !withdrawing)
  assert.equal(f.states[1].deviceCount, withdrawing ? 0 : 1)
  f.stale.resolve({ ...f.initial, currentDevice: withdrawing }); await flush()
  assert.equal(f.states[1].currentDevice, !withdrawing)
  assert.equal(f.states[1].deviceCount, withdrawing ? 0 : 1)
  assert.equal(f.states[5], false)
  f.unmount()
})
test('late hydration error cannot overwrite a confirmed action', async () => {
  const f = fixture(); await f.mount(); f.consent(); f.render().enable(); await flush()
  f.stale.reject(Error('old GET failed')); await flush()
  assert.equal(f.states[6], 'enabled'); assert.equal(f.states[1].currentDevice, true); f.unmount()
})
test('disabled initial rollout does no worker or push-manager work', async () => {
  const f = fixture({ available: false }); await f.mount()
  assert.equal(f.states[1].available, false); assert.equal(f.reads, 0); assert.deepEqual(f.requests, ['GET']); f.unmount()
})
test('all-device server withdrawal finishes despite a stalled local PushManager', async () => {
  const f = fixture({ enrolled: true, available: false, stalledDevice: true }); await f.mount()
  f.render().disable('all'); await new Promise(resolve => setTimeout(resolve, 40)); await flush()
  assert.ok(f.requests.includes('DELETE')); assert.equal(f.states[1].deviceCount, 0)
  assert.equal(f.states[5], false); assert.equal(f.states[6], 'partial'); f.unmount()
})
test('eventual worker readiness recovers after timeout without stale error replacing a save', async () => {
  const f = fixture({ pendingReady: true }); await f.mount()
  f.render().save({ preventDefault() {} }); await flush()
  await new Promise(resolve => setTimeout(resolve, 40))
  assert.equal(f.states[6], 'saved'); assert.equal(f.states[5], false)
  f.ready.resolve(f.worker); await flush(); assert.equal(f.states[3], true); assert.equal(f.states[6], 'saved'); f.unmount()
})
test('unmount/account generation invalidates pending hydration and worker readiness', async () => {
  const f = fixture({ pendingReady: true }); await f.mount(); f.unmount()
  const before = structuredClone(f.states)
  f.stale.resolve({ ...f.initial, currentDevice: true, deviceCount: 9 }); f.ready.resolve(f.worker); await flush()
  assert.deepEqual(f.states, before)
})
