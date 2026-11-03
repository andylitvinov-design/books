import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
const source = readFileSync('public/course-notifications-sw.js', 'utf8')
function worker(clients = []) {
  const listeners = {}, shown = [], opened = []
  const self = { location: { origin: 'https://example.test' }, registration: { showNotification: async (title, options) => shown.push({ title, ...options }) }, clients: { matchAll: async () => clients, openWindow: async url => opened.push(url) }, addEventListener: (name, callback) => { listeners[name] = callback } }
  vm.runInNewContext(source, { self, URL })
  return { listeners, shown, opened }
}
async function emit(listener, event) { let promise; listener({ ...event, waitUntil(value) { promise = value } }); await promise }
test('renders fixed private notification text instead of untrusted content or URL', async () => {
  const value = worker()
  await emit(value.listeners.push, { data: { json: () => ({ locale: 'ru', title: 'Diagnosis', body: 'private score', href: 'https://evil.test/' }) } })
  assert.equal(value.shown[0].title, 'Holistic House')
  assert.doesNotMatch(JSON.stringify(value.shown[0]), /Diagnosis|private score|evil\.test/)
  assert.equal(value.shown[0].data.href, '/ru/app/course')
})
test('malformed payload still shows a safe visible notification', async () => {
  const value = worker()
  await emit(value.listeners.push, { data: { json() { throw new Error('bad') } } })
  assert.equal(value.shown.length, 1)
  assert.equal(value.shown[0].data.href, '/en/app/course')
})
test('Spanish copy uses working English account route until Spanish private pages exist', async () => {
  const value = worker()
  await emit(value.listeners.push, { data: { json: () => ({ locale: 'es' }) } })
  assert.match(value.shown[0].body, /recordatorio/)
  assert.equal(value.shown[0].data.href, '/en/app/course')
})
test('notification clicks reject external and tokenized destinations', async () => {
  for (const href of ['https://evil.test', '//evil.test', '/en/app/results/private-id', '/en/app/course?token=secret']) {
    const value = worker()
    await emit(value.listeners.notificationclick, { notification: { close() {}, data: { href } } })
    assert.deepEqual(value.opened, ['https://example.test/en/app/course'])
  }
})
test('focuses matching course tab without replacing an in-progress test', async () => {
  let focused = false
  const value = worker([{ url: 'https://example.test/en/app/runs/fixture', navigate() { throw new Error('must not navigate') } }, { url: 'https://example.test/en/app/course', focus: async () => { focused = true } }])
  await emit(value.listeners.notificationclick, { notification: { close() {}, data: { href: '/en/app/course' } } })
  assert.equal(focused, true); assert.equal(value.opened.length, 0)
})
test('course manifest and worker preserve private network-only behavior', () => {
  const manifest = JSON.parse(readFileSync('public/course.webmanifest', 'utf8'))
  assert.equal(manifest.display, 'standalone'); assert.equal(manifest.start_url, '/en/app/course')
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192', '512x512'])
  const root = readFileSync('public/sw.js', 'utf8')
  assert.match(root, /importScripts\('\/course-notifications-sw.js'\)/)
  assert.match(root, /\/api\/app/); assert.match(root, /network-only/)
  assert.doesNotMatch(source, /caches\.|fetch\(/)
})

function rootWorker() {
  const listeners = {}, calls = { respond: 0, fetch: 0, cache: 0, put: 0 }
  const response = { ok: true, headers: { get: () => '' }, clone() { return this } }
  const self = { location: { origin: 'https://example.test' }, addEventListener: (name, callback) => { listeners[name] = callback } }
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self, URL, importScripts() {},
    fetch: async () => { calls.fetch++; return response },
    caches: { open: async () => { calls.cache++; return { match: async () => undefined, put: async () => { calls.put++ } } } },
  })
  async function request(path, method = 'GET', aborted = false) {
    let work
    listeners.fetch({ request: { url: 'https://example.test' + path, method, signal: { aborted } }, respondWith(value) { calls.respond++; work = value } })
    await work
  }
  return { calls, request }
}
test('private and cancelled requests bypass service-worker forwarding and caches entirely', async () => {
  const value = rootWorker()
  for (const path of ['/en/app/settings', '/ru/app/course', '/es/client', '/api/app/communication-preferences', '/api/app/shared-materials', '/api/app/course', '/api/client/private', '/document-preview/example', '/%65n//app/settings']) {
    await value.request(path); await value.request(path, 'GET', true)
  }
  await value.request('/api/app/notifications', 'DELETE')
  assert.deepEqual(value.calls, { respond: 0, fetch: 0, cache: 0, put: 0 })
})
test('private bypass preserves normal public-asset cache behavior', async () => {
  const value = rootWorker()
  await value.request('/icons/public.png')
  assert.deepEqual(value.calls, { respond: 1, fetch: 1, cache: 1, put: 1 })
})
