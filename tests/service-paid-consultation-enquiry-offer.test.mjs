import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs'

const checkout = readFileSync(new URL('../components/consultation-choice-capture.tsx', import.meta.url), 'utf8')
const chooser = readFileSync(new URL('../components/contact-channel-chooser.tsx', import.meta.url), 'utf8')
const repository = readFileSync(new URL('../lib/practitioners/public-service-enquiry.js', import.meta.url), 'utf8')

test('€50 and €100 public offers remain distinct in saved CRM requests across EN/RU/ES', () => {
  assert.match(checkout, /publicServiceTitle=\{t\.serviceOptions\[serviceChoice\]\}/)
  assert.match(chooser, /publicServiceTitle\?: string/)
  assert.match(chooser, /const serviceTitle = publicServiceTitle\?\.trim\(\) \|\|/)
  for (const offer of [
    '60-minute personal session · €100',
    '30-minute express consultation · €50',
    'Личная сессия 60 минут · €100',
    'Экспресс-консультация 30 минут · €50',
    'Sesión personal de 60 minutos · €100',
    'Consulta exprés de 30 minutos · €50',
  ]) assert.ok(checkout.includes(offer), 'missing public offer: ' + offer)
})

test('selected offer uses the established consented, committed and idempotent CRM path', () => {
  assert.match(chooser, /operationId: nextId, serviceTitle/)
  assert.match(chooser, /contactConsent: consent/)
  assert.match(chooser, /if \(!response\.ok \|\| data\.saved !== true/)
  assert.deepEqual(normalizePublicServiceEnquiry(paidOffer), paidOffer)
  assert.match(repository, /operationHash\(input, config\)/)
  assert.match(repository, /insert into app\.public_service_enquiries/)
  assert.match(repository, /insert into app\.crm_contacts/)
  assert.doesNotMatch(checkout, /payment_captured|booking_confirmed|service_completed/)
})

const paidOffer = {
  operationId: '13b822f6-8d70-4b1c-b44e-d0c31ad1d82f',
  serviceTitle: '30-minute express consultation · €50',
  description: 'Please contact me about this consultation.',
  sourcePath: '/en/services/personal-consultation',
  locale: 'en',
}
const serviceId = 'd64348a8-3f64-4688-94da-725a777b63c2'
const marketplaceOffer = {
  ...paidOffer, serviceId, description: '',
  sourcePath: '/en/services/example-master/personal-consultation',
  contact: { displayName: 'Example Visitor', email: 'visitor@example.test', phone: '' },
  contactConsent: true, website: '',
}

test('the actual normalizer preserves paid offers with or without the authorized marketplace serviceId', () => {
  for (const [locale, titles] of [
    ['en', ['60-minute personal session · €100', '30-minute express consultation · €50']],
    ['ru', ['Личная сессия 60 минут · €100', 'Экспресс-консультация 30 минут · €50']],
    ['es', ['Sesión personal de 60 minutos · €100', 'Consulta exprés de 30 minutos · €50']],
  ]) for (const serviceTitle of titles) {
    const legacy = { ...paidOffer, serviceTitle, locale, sourcePath: '/' + locale + '/services/personal-consultation' }
    assert.deepEqual(normalizePublicServiceEnquiry(legacy), legacy)
    const input = { ...marketplaceOffer, serviceTitle, locale,
      sourcePath: '/' + locale + '/services/example-master/personal-consultation' }
    const output = normalizePublicServiceEnquiry(input)
    assert.deepEqual(output, {
      operationId: input.operationId, serviceId, serviceTitle, description: output.description,
      sourcePath: input.sourcePath, locale,
      contact: { ...input.contact, source: 'website' }, contactConsent: true,
    })
    assert.ok(output.description.includes(serviceTitle))
    // Source and payload property ordering are not part of the public API.
    assert.deepEqual(normalizePublicServiceEnquiry(Object.fromEntries(Object.entries(input).reverse())), output)
  }
})

test('paid offer inputs reject recipient, price, marketing and unknown-field overrides', () => {
  for (const field of ['unexpected', 'practitionerId', 'recipientId', 'recipientPractitionerId',
    'ownerId', 'serviceOfferingId', 'price', 'amount', 'currency', 'paymentStatus', 'marketingConsent']) {
    for (const input of [paidOffer, marketplaceOffer])
      assert.throws(() => normalizePublicServiceEnquiry({ ...input, [field]: 'untrusted' }), /INVALID_REQUEST/, field)
  }
  for (const field of ['ownerId', 'practitionerId', 'source', 'lifecycle', 'marketingConsent', 'unexpected'])
    assert.throws(() => normalizePublicServiceEnquiry({ ...marketplaceOffer,
      contact: { ...marketplaceOffer.contact, [field]: 'untrusted' } }), /CONSENT_OR_CONTACT_REQUIRED/, field)
})

test('paid offer inputs retain UUID, public-source, contact, consent and abuse boundaries', () => {
  for (const change of [
    { operationId: 'not-a-uuid' }, { serviceId: 'not-a-uuid' }, { serviceId: null },
    { sourcePath: '/en/app/consultations' }, { sourcePath: 'https://example.test/services' },
    { sourcePath: marketplaceOffer.sourcePath + '?email=private@example.test' },
    { sourcePath: marketplaceOffer.sourcePath + '#private' },
    { sourcePath: '/ru/services/example-master/personal-consultation' },
    { sourcePath: '/en/services/example-master' }, { locale: 'fr' },
    { contact: undefined }, { contact: undefined, contactConsent: undefined, description: paidOffer.description },
    { contact: {} }, { contact: { email: 'invalid' } },
    { contact: { phone: '12345' } }, { contactConsent: false }, { contactConsent: 'true' },
    { contactConsent: undefined }, { contact: { displayName: 'A', email: 'visitor@example.test' } },
    { serviceTitle: '' }, { serviceTitle: 'x'.repeat(161) }, { serviceTitle: 'title\u0000' },
    { description: 'x'.repeat(1401) }, { description: 'note\u0000' }, { website: 'spam' },
  ]) assert.throws(() => normalizePublicServiceEnquiry({ ...marketplaceOffer, ...change }), undefined, JSON.stringify(change))
})
