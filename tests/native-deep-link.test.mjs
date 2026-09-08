import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyNativeLink } from '../lib/native/deep-link-policy.js'
import { nativePrivatePrescriptionEnabled, privateNativeSessionPolicy } from '../lib/native/private-session.js'

test('accepts only a public canonical remedy link for in-app native routing', () => {
  assert.deepEqual(classifyNativeLink('https://codex-public-book-library.vercel.app/ru/homeopathy/remedies/aurum-metallicum'), {
    kind: 'public-remedy', path: '/ru/homeopathy/remedies/aurum-metallicum',
  })
  assert.deepEqual(classifyNativeLink('psialchemy://en/homeopathy/remedies/natrum-muriaticum'), {
    kind: 'public-remedy', path: '/en/homeopathy/remedies/natrum-muriaticum',
  })
})

test('does not route private prescriptions or unknown internal paths in native code', () => {
  assert.deepEqual(classifyNativeLink('https://codex-public-book-library.vercel.app/ru/prescriptions/private-id'), { kind: 'private-blocked' })
  assert.deepEqual(classifyNativeLink('https://codex-public-book-library.vercel.app/ru/homeopathy'), { kind: 'unsupported' })
})

test('keeps non-PsiAlchemy URLs external', () => {
  assert.deepEqual(classifyNativeLink('https://example.com/remedy'), { kind: 'external', url: 'https://example.com/remedy' })
})

test('private native sessions remain hard fail-closed until device evidence exists', () => {
  assert.equal(nativePrivatePrescriptionEnabled(), false)
  assert.deepEqual(privateNativeSessionPolicy(), {
    enabled: false, storage: 'ephemeral-only', urlPersistence: false,
    cookiePersistence: false, cachePersistence: false,
    serviceWorkerPersistence: false, historyPersistence: false,
  })
})
