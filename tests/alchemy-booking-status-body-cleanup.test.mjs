import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const source = () => readFileSync(new URL('../components/contact-channel-chooser.tsx', import.meta.url), 'utf8')
const start = '  useEffect(() => {\n    if (!bookingSku) return;\n    let active = true;'
const end = '  }, [bookingSku, enquiryResetKey]);'
const sku = 'personal-session-60', reference = 'HH-ABCDEF123456'
const secret = 'synthetic-private-body-not-for-parsing'
function extractEffect(text = source()) {
  const first = text.indexOf(start), last = text.indexOf(end, first)
  assert.ok(first >= 0 && last > first, 'Extract the actual complete booking status effect')
  assert.equal(text.lastIndexOf(start), first); assert.equal(text.lastIndexOf(end), last)
  return text.slice(first, last + end.length)
}
function effect(response, { bookingSku = sku, fetchPromise } = {}) {
  const state = { saved: [], confirmed: [], startsAt: [], requests: [], cleanup: undefined, firstResult: undefined }
  runInNewContext(extractEffect(), {
    bookingSku, enquiryResetKey: 'synthetic-fixed-public-selection',
    useEffect: (callback, dependencies) => { assert.equal(dependencies[0], bookingSku); state.cleanup = callback() },
    fetch: (url, options) => {
      state.requests.push({ url, options: JSON.parse(JSON.stringify(options)) })
      const pending = fetchPromise || Promise.resolve(response)
      const nativeThen = pending.then.bind(pending)
      // Capture only the actual first continuation result, so a pending cancel
      // cannot silently add a new wait to the authored non-OK status decision.
      pending.then = (...args) => { const result = nativeThen(...args); state.firstResult = result; return result }
      return pending
    },
    setSaved: value => state.saved.push(JSON.parse(JSON.stringify(value))),
    setBookingConfirmed: value => state.confirmed.push(value),
    setBookingStartsAt: value => state.startsAt.push(value),
  }, { timeout: 1000 })
  return state
}
const flush = () => new Promise(resolve => setImmediate(resolve))
const assertLocked = state => { assert.deepEqual(state.saved, [], 'Unverified or inactive response must not update the saved receipt'); assert.deepEqual(state.confirmed, [], 'Unverified or inactive response must not confirm payment'); assert.deepEqual(state.startsAt, []) }
function nativeResponse({ status = 401, payload = secret, cancel = 'resolve', empty = false } = {}) {
  const calls = { cancel: 0, underlyingCancel: 0, json: 0, text: 0, otherRead: 0 }
  const stream = empty ? null : new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode(payload)) },
    cancel() {
      calls.underlyingCancel++
      if (cancel === 'throw') throw new Error('synthetic cancel throw')
      if (cancel === 'reject') return Promise.reject(new Error('synthetic cancel rejection'))
      if (cancel === 'pending') return new Promise(() => {})
    },
  })
  const response = new Response(stream, { status, headers: { 'Cache-Control': 'private, no-store' } })
  if (stream) {
    const nativeCancel = stream.cancel.bind(stream)
    stream.cancel = (...args) => { calls.cancel++; return nativeCancel(...args) }
  }
  const nativeJson = response.json.bind(response), nativeText = response.text.bind(response)
  response.json = (...args) => { calls.json++; return nativeJson(...args) }
  response.text = (...args) => { calls.text++; return nativeText(...args) }
  for (const method of ['arrayBuffer','blob','formData','bytes']) if (typeof response[method] === 'function') {
    const original = response[method].bind(response)
    response[method] = (...args) => { calls.otherRead++; return original(...args) }
  }
  return { response, stream, calls }
}

for (const status of [400,401,403,404,429,500,503]) test('actual mount effect cancels only its unused non-OK body without parsing or unlocking: ' + status, async () => {
  const n = nativeResponse({ status, payload: JSON.stringify({ bookingSku: sku, referenceCode: reference, booked: true, startsAt: '2030-01-01T12:00:00Z', private: secret }) })
  const state = effect(n.response)
  await state.firstResult; await flush()
  assert.deepEqual(n.calls, { cancel: 1, underlyingCancel: 1, json: 0, text: 0, otherRead: 0 }, 'Owned non-OK response is cancelled, never read')
  assert.equal(n.response.bodyUsed, true); assertLocked(state)
  assert.deepEqual(state.requests, [{ url: '/api/service-enquiries/booking-status', options: { credentials: 'same-origin', cache: 'no-store' } }])
})

for (const cancel of ['throw','reject','pending']) test('non-OK cancellation ' + cancel + ' cannot change the locked result or add a wait', async () => {
  const n = nativeResponse({ cancel }), state = effect(n.response)
  const result = await Promise.race([state.firstResult.then(value => ({ completed: true, value })), flush().then(() => ({ completed: false }))])
  assert.deepEqual(result, { completed: true, value: null }, 'Do not await cancellation before preserving the non-OK result')
  await flush() // node:test itself fails any unhandled rejection; no global handler.
  assertLocked(state); assert.equal(state.requests.length, 1); assert.equal(n.calls.cancel, 1); assert.equal(n.calls.json, 0)
})

test('non-OK null body is harmless and remains locked', async () => {
  const n = nativeResponse({ empty: true }), state = effect(n.response)
  assert.equal(await state.firstResult, null); await flush(); assertLocked(state)
  assert.deepEqual(n.calls, { cancel: 0, underlyingCancel: 0, json: 0, text: 0, otherRead: 0 })
})

test('already-locked non-OK stream rejection cannot escape or read its data', async () => {
  const n = nativeResponse(), reader = n.stream.getReader(), state = effect(n.response)
  assert.equal(await state.firstResult, null); await flush(); assertLocked(state)
  assert.equal(n.calls.cancel, 1); assert.equal(n.calls.underlyingCancel, 0); assert.equal(n.calls.json, 0)
  await reader.cancel(); reader.releaseLock() // Fixture-only release of its own lock.
})

test('synchronously throwing owned cancel method still returns null without retrying or reading', async () => {
  const n = nativeResponse(); let directCalls = 0
  n.stream.cancel = () => { directCalls++; throw new Error('synthetic direct cancel throw') }
  const state = effect(n.response)
  assert.equal(await state.firstResult, null); await flush(); assertLocked(state)
  assert.equal(directCalls, 1); assert.equal(state.requests.length, 1)
  assert.equal(n.calls.json, 0); assert.equal(n.calls.text, 0); assert.equal(n.calls.otherRead, 0)
  await ReadableStream.prototype.cancel.call(n.stream) // Fixture-only release after asserting the throwing method.
})

test('three independently mounted booking consumers release their own response, never a shared body', async () => {
  const owned = [nativeResponse(), nativeResponse(), nativeResponse()]
  const states = owned.map((n, index) => effect(n.response, { bookingSku: index === 1 ? 'express-consultation-30' : sku }))
  await Promise.all(states.map(state => state.firstResult)); await flush()
  for (let i = 0; i < owned.length; i++) { assert.equal(owned[i].calls.underlyingCancel, 1); assertLocked(states[i]); assert.equal(states[i].requests.length, 1) }
})

function okResponse(data) {
  const response = new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
  const calls = { json: 0, cancel: 0 }, json = response.json.bind(response), cancel = response.body.cancel.bind(response.body)
  response.json = () => { calls.json++; return json() }
  response.body.cancel = () => { calls.cancel++; return cancel() }
  return { response, calls }
}
for (const booked of [true,false]) test('OK status still parses and applies only the original booking proof fields: booked=' + booked, async () => {
  const n = okResponse({ bookingSku: sku, referenceCode: reference, booked, startsAt: '2030-01-01T12:00:00Z' }), state = effect(n.response)
  await state.firstResult; await flush()
  assert.deepEqual(n.calls, { json: 1, cancel: 0 }, 'Successful responses must retain ordinary JSON consumption')
  assert.deepEqual(state.saved, [{ saved: true, referenceCode: reference }]); assert.deepEqual(state.confirmed, [booked])
  assert.deepEqual(state.startsAt, [booked ? '2030-01-01T12:00:00Z' : null])
})
for (const data of [null, {}, { bookingSku: 'wrong-sku', referenceCode: reference, booked: true }, { bookingSku: sku, referenceCode: 'invalid', booked: true }]) {
  test('OK response still rejects missing or mismatched proof: ' + JSON.stringify(data), async () => {
    const n = okResponse(data), state = effect(n.response)
    await state.firstResult; await flush(); assertLocked(state); assert.deepEqual(n.calls, { json: 1, cancel: 0 })
  })
}

test('malformed OK JSON stays an ignored refresh failure and is never cancelled as non-OK', async () => {
  const response = new Response('not-json', { status: 200 }); let cancels = 0
  response.body.cancel = () => { cancels++; assert.fail('OK response cancellation is forbidden') }
  const state = effect(response)
  await assert.rejects(state.firstResult, SyntaxError); await flush(); assertLocked(state); assert.equal(cancels, 0)
})

for (const status of [200,401]) test('unmount before response preserves original active guard while releasing only a non-OK body: ' + status, async () => {
  let resolve
  const fetchPromise = new Promise(done => { resolve = done })
  const n = status === 200 ? okResponse({ bookingSku: sku, referenceCode: reference, booked: true }) : nativeResponse()
  const state = effect(n.response, { fetchPromise }); state.cleanup(); resolve(n.response)
  await state.firstResult; await flush(); assertLocked(state)
  assert.equal(n.calls.cancel, status === 401 ? 1 : 0); assert.equal(n.calls.json, status === 200 ? 1 : 0)
})

test('cleanup during a pending cancellation does not retry or later unlock', async () => {
  const n = nativeResponse({ cancel: 'pending' }), state = effect(n.response)
  const pending = Symbol('pending cancellation')
  assert.equal(await Promise.race([state.firstResult, flush().then(() => pending)]), null, 'A pending cancellation never blocks the original null result')
  state.cleanup(); await flush(); assertLocked(state); assert.equal(state.requests.length, 1)
})

for (const error of [new Error('synthetic network failure'), new DOMException('synthetic abort', 'AbortError')]) test('rejected fetch preserves the existing ignored-refresh failure and never retries: ' + error.name, async () => {
  const state = effect(null, { fetchPromise: Promise.reject(error) })
  await assert.rejects(state.firstResult, found => found === error); await flush(); assertLocked(state); assert.equal(state.requests.length, 1)
})

test('non-booking callers still make no booking status request', () => {
  const state = effect(null, { bookingSku: null }); assert.equal(state.requests.length, 0); assert.equal(state.cleanup, undefined); assertLocked(state)
})

test('source scope remains a single mount refresh with original selection and active guards; manual refresh still parses its own response', () => {
  const text = source(), snippet = extractEffect(text)
  assert.equal((snippet.match(/fetch\(/g) || []).length, 1)
  assert.equal((snippet.match(/\.cancel\(/g) || []).length, 1)
  assert.match(snippet, /if \(response\.ok\) return response\.json\(\);/)
  assert.match(snippet, /return \(\) => \{ active = false; \};/)
  assert.match(snippet, /if \(!active \|\| !status \|\| status\.bookingSku !== bookingSku/)
  assert.doesNotMatch(snippet, /AbortController|setTimeout|setInterval|console\.|localStorage|sessionStorage|await .*cancel/)
  const manual = text.slice(text.indexOf('  async function checkBookingStatus()'), text.indexOf('  const referredWhatsappUrl'))
  assert.match(manual, /const status = await response\.json\(\)\.catch\(\(\) => \(\{\}\)\);/)
  assert.match(manual, /if \(!response\.ok \|\| status\.bookingSku !== bookingSku/)
  assert.doesNotMatch(manual, /\.cancel\(/)
})

for (const [name, mutate] of [['missing start', text => text.replace(start, '')], ['missing end', text => text.replace(end, '')], ['duplicate start', text => text + start], ['duplicate end', text => text + end]]) {
  test('actual effect extraction rejects ' + name, () => assert.throws(() => extractEffect(mutate(source())), { code: 'ERR_ASSERTION' }))
}
