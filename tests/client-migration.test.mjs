import test from 'node:test'
import assert from 'node:assert/strict'
import { privateMigrationBridge, canonicalRedirectTarget } from '../lib/canonical-redirect.js'
import { classifyPwaRequest } from '../lib/pwa/cache-policy.js'
import { classifyNativeLink } from '../lib/native/deep-link-policy.js'
const old = 'https://codex-public-book-library.vercel.app'
test('private migration returns a generic nonce bridge, never a server redirect', () => {
  for (const path of ['/en/client/selector?x=1', '/ru/prescriptions/selector']) {
    assert.equal(canonicalRedirectTarget(old + path, 'GET', true), undefined)
    const bridge = privateMigrationBridge(old + path, 'nonce123', true)
    assert.match(bridge, /location.replace/)
    assert.match(bridge, /location.hash/)
    assert.match(bridge, /no-referrer/)
    assert.doesNotMatch(bridge, /selector\?x|patientName/)
  }
  assert.equal(privateMigrationBridge('https://preview.vercel.app/en/client/x', 'n', true), undefined)
})
test('public fallback routes preserve path/query and well-known stays local', () => {
  assert.equal(canonicalRedirectTarget(old + '/missing?a=1', 'GET', true), 'https://holistichouse.vercel.app/missing?a=1')
  assert.equal(canonicalRedirectTarget(old + '/.well-known/assetlinks.json', 'GET', true), undefined)
})
test('cabinet never becomes offline or native private content', () => {
  for (const path of ['/en/client/abc', '/ru/client/abc/documents/id', '/api/client-access', '/api/client/documents/id/pdf']) {
    assert.equal(classifyPwaRequest(old + path), 'network-only')
  }
  assert.equal(classifyNativeLink('https://holistichouse.vercel.app/en/client/abc#secret').kind, 'private-blocked')
})

test('standalone payment edit preserves its client relationship', async () => {
  const { createPaymentDocument, updatePaymentDocument } = await import('../lib/documents/payment.js')
  const old = { ...createPaymentDocument({ patientName: 'Test Client', dateIssued: '2026-09-21', dateOfService: '2026-09-21', amount: '230', currency: 'CAD', service: 'Consultation', paymentStatus: 'received', status: 'active' }), clientId: 'd650ed65-d140-4e54-8f9c-283d787fef50' }
  assert.equal(updatePaymentDocument(old, { ...old, amount: '240' }).clientId, old.clientId)
})
