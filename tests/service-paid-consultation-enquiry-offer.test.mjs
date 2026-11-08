import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const checkout = readFileSync(new URL('../components/consultation-choice-capture.tsx', import.meta.url), 'utf8')
const chooser = readFileSync(new URL('../components/contact-channel-chooser.tsx', import.meta.url), 'utf8')
const intake = readFileSync(new URL('../lib/practitioners/public-service-enquiry-input.mjs', import.meta.url), 'utf8')
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
  assert.match(intake, /const permitted = new Set\(\['operationId', 'serviceTitle'/)
  assert.match(repository, /operationHash\(input, config\)/)
  assert.match(repository, /insert into app\.public_service_enquiries/)
  assert.match(repository, /insert into app\.crm_contacts/)
  assert.doesNotMatch(checkout, /payment_captured|booking_confirmed|service_completed/)
})
