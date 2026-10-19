import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePublicServiceEnquiry, publicEnquiryReference } from '../lib/practitioners/public-service-enquiry-input.mjs'

const valid = {
  operationId: '13b822f6-8d70-4b1c-b44e-d0c31ad1d82f',
  serviceTitle: 'Alchemy of the Soul',
  description: 'I would like to discuss booking a session and what to expect.',
  sourcePath: '/en/services/alchemy-of-soul',
  locale: 'en',
}

test('public enquiry normalizes a safe, public service request', () => {
  assert.deepEqual(normalizePublicServiceEnquiry(valid), valid)
})
test('public enquiry never accepts tracking URLs, private paths or extra fields', () => {
  for (const item of [
    { ...valid, sourcePath:'/en/app/portrait' },
    { ...valid, sourcePath:'/en/services/alchemy-of-soul?email=hi@example.test' },
    { ...valid, sourcePath:'https://example.org/services' },
    { ...valid, surprise:'private' },
    { ...valid, locale:'fr' },
    { ...valid, description:'too short' },
    { ...valid, description:'a'.repeat(1401) },
    { ...valid, operationId:'not-a-uuid' },
  ]) assert.throws(() => normalizePublicServiceEnquiry(item))
})
test('public reference is a non-secret correlation label', () => {
  assert.equal(publicEnquiryReference(valid.operationId), 'HH-13B822F68D70')
})
