import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createPublicEnquirySubmissionScope } from '../lib/practitioners/public-enquiry-submission.js'

const operationId = '13b822f6-8d70-4b1c-b44e-d0c31ad1d82f'
const referenceCode = 'HH-13B822F68D70'
const input = () => ({
  serviceTitle: 'Synthetic service',
  description: 'Please tell me about the available times.',
  sourcePath: '/en/services/alchemy-of-soul', locale: 'en',
  contact: { displayName: 'Synthetic Visitor', email: 'visitor@example.test', phone: '' },
  contactConsent: true, website: '',
})
const response = (status, data) => ({
  ok: status >= 200 && status < 300, status, json: async () => data,
})
const saved = () => response(201, { saved: true, referenceCode })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function harness(steps) {
  const calls = [], ids = []
  const scope = createPublicEnquirySubmissionScope({
    createOperationId: () => { ids.push(operationId); return operationId },
    fetchImpl: async (url, options) => {
      calls.push({ url, ...options })
      return steps.shift()(options)
    },
  })
  return { scope, calls, ids }
}

test('confirmed receipt alone unlocks success, with existing same-origin API contract', async () => {
  const { scope, calls, ids } = harness([saved])
  assert.deepEqual(await scope.submit(input()), { kind: 'saved', referenceCode })
  assert.equal(scope.pending, false)
  assert.equal(calls[0].url, '/api/service-enquiries')
  assert.equal(calls[0].credentials, 'same-origin')
  assert.deepEqual(JSON.parse(calls[0].body), { ...input(), operationId })
  assert.equal(ids.length, 1)
  assert.equal((await scope.submit(input())).kind, 'stale', 'confirmed form cannot submit twice')
})

test('lost response retries byte-identical consent/contact payload and UUID, even if caller input changes', async () => {
  const original = input()
  const { scope, calls, ids } = harness([
    () => { throw new TypeError('Network interrupted') }, saved,
  ])
  assert.equal((await scope.submit(original)).kind, 'unknown')
  assert.equal(scope.pending, true)
  original.contact.email = 'changed@example.test'
  original.contactConsent = false
  original.serviceTitle = 'Another service'
  assert.deepEqual(await scope.submit(original), { kind: 'saved', referenceCode })
  assert.equal(calls[1].body, calls[0].body)
  assert.equal(JSON.parse(calls[1].body).contact.email, 'visitor@example.test')
  assert.equal(JSON.parse(calls[1].body).contactConsent, true)
  assert.equal(ids.length, 1)
})

test('malformed JSON, invalid receipt and server errors remain unknown, not not-saved', async () => {
  for (const result of [
    { ok: true, status: 201, json: async () => { throw new SyntaxError('truncated') } },
    response(201, { saved: true, referenceCode: 'invalid' }),
    response(201, { saved: false, referenceCode }),
    response(500, { error: 'INTERNAL_ERROR' }),
    response(409, { error: 'IDEMPOTENCY_CONFLICT' }),
  ]) {
    const { scope } = harness([() => result])
    assert.equal((await scope.submit(input())).kind, 'unknown')
    assert.equal(scope.pending, true)
  }
})

test('explicit first-attempt validation rejection permits correction without losing form values', async () => {
  const { scope, calls } = harness([
    () => response(400, { error: 'INVALID_SERVICE_ENQUIRY' }), saved,
  ])
  assert.equal((await scope.submit(input())).kind, 'rejected')
  assert.equal(scope.pending, false)
  const corrected = input()
  corrected.contact.email = 'corrected@example.test'
  assert.equal((await scope.submit(corrected)).kind, 'saved')
  assert.equal(JSON.parse(calls[1].body).contact.email, 'corrected@example.test')
})

test('a later validation or throttle rejection never erases an earlier unknown outcome', async () => {
  for (const rejection of [
    response(400, { error: 'INVALID_SERVICE_ENQUIRY' }),
    response(429, { error: 'RATE_LIMITED' }),
  ]) {
    const { scope, calls } = harness([
      () => { throw new Error('response lost after possible commit') },
      () => rejection, saved,
    ])
    assert.equal((await scope.submit(input())).kind, 'unknown')
    assert.equal((await scope.submit(input())).kind, 'unknown')
    assert.equal(scope.pending, true)
    assert.equal((await scope.submit(input())).kind, 'saved')
    assert.equal(new Set(calls.map(item => item.body)).size, 1)
  }
})

test('simultaneous submit events make exactly one POST before React busy state renders', async () => {
  const pending = deferred()
  const { scope, calls } = harness([() => pending.promise])
  const first = scope.submit(input())
  assert.equal((await scope.submit(input())).kind, 'busy')
  assert.equal(calls.length, 1)
  pending.resolve(saved())
  assert.equal((await first).kind, 'saved')
})

test('route/service change closes and aborts the old scope, ignores even an abort-insensitive late receipt', async () => {
  const pending = deferred()
  const old = harness([() => pending.promise])
  const oldResult = old.scope.submit(input())
  old.scope.close()
  assert.equal(old.calls[0].signal.aborted, true)
  const current = harness([saved])
  const next = input()
  next.serviceTitle = 'New synthetic service'
  assert.equal((await current.scope.submit(next)).kind, 'saved')
  pending.resolve(saved())
  assert.equal((await oldResult).kind, 'stale')
  assert.equal((await old.scope.submit(input())).kind, 'stale')
  assert.equal(old.calls.length, 1)
  assert.notEqual(old.calls[0].body, current.calls[0].body)
})

test('unmount abort during response decoding cannot report a saved enquiry', async () => {
  const json = deferred()
  const { scope, calls } = harness([() => ({ ok: true, status: 201, json: () => json.promise })])
  const result = scope.submit(input())
  await Promise.resolve()
  scope.close()
  json.resolve({ saved: true, referenceCode })
  assert.equal((await result).kind, 'stale')
  assert.equal(calls[0].signal.aborted, true)
})

test('unmount rejection stays stale instead of an error in a new form', async () => {
  const pending = deferred()
  const { scope } = harness([() => pending.promise])
  const result = scope.submit(input())
  scope.close()
  pending.reject(new Error('aborted'))
  assert.equal((await result).kind, 'stale')
})

test('a new enquiry is permitted after confirmed save, but reset cannot discard an uncertain request', async () => {
  const { scope, calls } = harness([
    () => { throw new Error('unknown') }, saved, saved,
  ])
  assert.equal((await scope.submit(input())).kind, 'unknown')
  scope.reset()
  assert.equal(scope.pending, true)
  assert.equal((await scope.submit(input())).kind, 'saved')
  scope.reset()
  const next = { ...input(), description: 'Please discuss a different appointment.' }
  assert.equal((await scope.submit(next)).kind, 'saved')
  assert.equal(calls[0].body, calls[1].body)
  assert.notEqual(calls[1].body, calls[2].body)
})

const component = readFileSync(new URL('../components/contact-channel-chooser.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../components/contact-channel-chooser.module.css', import.meta.url), 'utf8')
test('form is keyed to route, service link and locale and cleans up its submission scope', () => {
  assert.match(component, /key=\{JSON\.stringify\(\[pathname, props\.whatsappUrl, props\.locale\]\)\}/)
  assert.match(component, /scope\.close\(\)/)
  assert.match(component, /submission\.current !== scope/)
  assert.doesNotMatch(component, /localStorage|sessionStorage/)
})

test('EN/RU/ES explain uncertainty and same-request retry without inventing a saved or unsaved result', () => {
  assert.equal((component.match(/\n    unknown:/g) || []).length, 3)
  assert.equal((component.match(/\n    retry:/g) || []).length, 3)
  assert.doesNotMatch(component, /no enquiry has been recorded|обращение пока не зарегистрировано|no se ha registrado/)
  assert.match(component, /result\.kind === "saved"/)
  assert.match(component, /setError\(c\.unknown\)/)
})

test('contact and consent remain visible but locked on uncertain retry; native keyboard form and mobile sizing survive', () => {
  assert.equal((component.match(/disabled=\{busy \|\| uncertain\}/g) || []).length, 6)
  assert.match(component, /<form onSubmit=\{submit\}/)
  assert.match(component, /aria-describedby=\{error \? panelId \+ "-error"/)
  assert.match(component, /id=\{panelId \+ "-error"\}[^>]+role="alert"/)
  assert.match(component, /<input type="checkbox" required checked=\{consent\}/)
  assert.match(component, /uncertain \? c\.retry : c\.submit/)
  assert.match(component, /<button type="submit"/)
  assert.match(css, /@media\s*\(max-width:480px\)/)
  assert.match(css, /\.submit\s*\{[\s\S]*?min-height:49px/)
})
