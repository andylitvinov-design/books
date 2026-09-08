import assert from 'node:assert/strict'
import test from 'node:test'

import {
  authorizePrescriptionSession,
  createPrescriptionSession,
  digestSessionToken,
  isBearerSecret,
  isSelector,
  isSessionToken,
  issuePrescriptionAccess,
  verifyPrescriptionSecret,
} from '../lib/prescriptions/access.js'
import { createPrescription, getClientPrescription } from '../lib/prescriptions/service.js'

const input = {
  patientName: 'Synthetic Access Client',
  dateIssued: '2026-09-08',
  languagePreference: 'bilingual',
  practitionerName: 'Synthetic Practitioner',
  internalNotes: 'Synthetic private note.',
  status: 'active',
  items: [{ remedySlug: 'arsenicum-album', potency: '30C' }],
}

test('issues a selector and fragment secret while storing only a one-way hash', () => {
  const original = createPrescription(input, '2026-09-08T10:00:00.000Z')
  const { record, selector, secret } = issuePrescriptionAccess(original, '2026-09-08T10:01:00.000Z')

  assert.match(selector, /^[A-Za-z0-9_-]{22}$/)
  assert.match(secret, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(record.access.selector, selector)
  assert.match(record.access.secretHash, /^[a-f0-9]{64}$/)
  assert.equal(JSON.stringify(record).includes(secret), false)
  assert.equal(record.access.version, 1)
  assert.equal(verifyPrescriptionSecret(record, secret), true)
  assert.equal(verifyPrescriptionSecret(record, `${secret.slice(0, -1)}${secret.endsWith('A') ? 'B' : 'A'}`), false)
})

test('rotating access invalidates the earlier fragment credential', () => {
  const first = issuePrescriptionAccess(createPrescription(input)).record
  const firstResult = issuePrescriptionAccess(createPrescription(input))
  const rotated = issuePrescriptionAccess(firstResult.record)

  assert.equal(rotated.record.access.version, 2)
  assert.notEqual(rotated.selector, firstResult.selector)
  assert.notEqual(rotated.secret, firstResult.secret)
  assert.equal(verifyPrescriptionSecret(rotated.record, firstResult.secret), false)
  assert.equal(verifyPrescriptionSecret(rotated.record, rotated.secret), true)
  assert.equal(first.access.version, 1)
})

test('rotation removes a legacy path bearer from the encrypted record', () => {
  const legacy = { ...createPrescription(input), publicId: 'L'.repeat(43) }
  const { record } = issuePrescriptionAccess(legacy)

  assert.equal('publicId' in record, false)
})

test('validates fixed-size selector, fragment, and session tokens', () => {
  const { selector, secret } = issuePrescriptionAccess(createPrescription(input))
  const session = createPrescriptionSession(issuePrescriptionAccess(createPrescription(input)).record, 1_788_891_200_000)

  assert.equal(isSelector(selector), true)
  assert.equal(isSelector(`${selector}x`), false)
  assert.equal(isBearerSecret(secret), true)
  assert.equal(isBearerSecret(secret.slice(1)), false)
  assert.equal(isSessionToken(session.token), true)
  assert.equal(isSessionToken('not-a-session'), false)
  assert.match(digestSessionToken(session.token), /^[a-f0-9]{64}$/)
})

test('authorizes only a current unexpired session for an active record', () => {
  const issued = issuePrescriptionAccess(createPrescription(input))
  const session = createPrescriptionSession(issued.record, 1_788_891_200_000)

  assert.equal(authorizePrescriptionSession(issued.record, issued.selector, session, 1_788_891_200_001), true)
  assert.equal(authorizePrescriptionSession(issued.record, issued.selector, session, session.expiresAt), false)
  assert.equal(authorizePrescriptionSession({ ...issued.record, status: 'revoked' }, issued.selector, session, 1_788_891_200_001), false)
  const otherSelector = `${issued.selector.slice(0, -1)}${issued.selector.endsWith('A') ? 'B' : 'A'}`
  assert.equal(authorizePrescriptionSession(issued.record, otherSelector, session, 1_788_891_200_001), false)
  assert.equal(authorizePrescriptionSession({ ...issued.record, access: { ...issued.record.access, version: 2 } }, issued.selector, session, 1_788_891_200_001), false)
})

test('new and client prescription objects expose no bearer or private identifiers', () => {
  const record = createPrescription(input)
  const document = getClientPrescription(record, 'en')

  assert.equal('publicId' in record, false)
  assert.equal('publicId' in document, false)
  assert.equal('id' in document, false)
  assert.equal('internalNotes' in document, false)
  assert.equal('access' in document, false)
})
