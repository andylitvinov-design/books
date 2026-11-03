import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { observeReload } from '../scripts/helpers/reload-diagnostics.mjs'
const origin = 'http://localhost:3100'
function fixture() {
  const page = new EventEmitter()
  const frame = { url: () => origin + '/ru/app/results/person-secret?token=secret#secret' }
  page.mainFrame = () => frame
  return { page, frame }
}
const request = (url = origin + '/api/app/bootstrap?token=secret') => ({ url: () => url, method: () => 'GET', failure: () => ({ errorText: 'ECONNRESET secret' }) })
test('reload evidence includes only bounded technical events and masked same-origin paths', () => {
  const { page, frame } = fixture()
  const probe = observeReload(page, { origin, runtime: 'isolated' })
  page.emit('request', request())
  page.emit('response', { request, status: () => 200 })
  page.emit('requestfinished', request())
  page.emit('requestfailed', request())
  page.emit('request', request('https://external.invalid/secret'))
  page.emit('pageerror', new TypeError('secret https://secret.invalid'))
  page.emit('framenavigated', frame)
  page.emit('framenavigated', { url: () => origin + '/secret' })
  page.emit('domcontentloaded'); page.emit('load')
  const evidence = probe.stop(), text = JSON.stringify(evidence)
  assert.ok(!text.includes('secret')); assert.ok(!text.includes('external'))
  assert.ok(evidence.events.some(e => e.type === 'response' && e.status === 200))
  assert.ok(evidence.events.some(e => e.type === 'navigation' && e.pathname === '/ru/app/results/[segment]'))
  assert.ok(evidence.events.some(e => e.category === 'connection_reset'))
  assert.ok(evidence.events.every(e => Number.isInteger(e.atMs) && e.atMs >= 0))
  assert.deepEqual(page.eventNames(), [])
  page.emit('load'); assert.deepEqual(probe.stop(), evidence)
})
test('diagnostics reject non-isolated and non-loopback use', () => {
  for (const options of [{ origin, runtime: 'production' }, { origin: 'https://example.com', runtime: 'isolated' }]) {
    const { page } = fixture(); assert.throws(() => observeReload(page, options)); assert.deepEqual(page.eventNames(), [])
  }
})
test('event cap and malformed events cannot affect page execution', () => {
  const { page } = fixture(), probe = observeReload(page, { origin, runtime: 'isolated' })
  assert.doesNotThrow(() => page.emit('request', null))
  for (let i = 0; i < 300; i++) page.emit('load')
  const result = probe.stop()
  assert.equal(result.events.length, 200); assert.ok(result.dropped > 0)
  assert.deepEqual(page.eventNames(), [])
})
test('reload keeps original strict assertion and records diagnostics in finally', async () => {
  const source = await readFile(new URL('../scripts/verify-compassion-assessments.mjs', import.meta.url), 'utf8')
  assert.match(source, /try \{\s+await page\.reload\(\)\s+await expect\(page\.locator\('\[data-personal-result-report\]'\)\)\.toBeVisible\(\)\s+\} finally \{/)
  assert.match(source, /const evidence = reloadDiagnostics\.stop\(\)/)
  assert.match(source, /assertIsolated\(\)/)
})
