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

test('paid €50/€100 call-to-action shows the selected request, not an automatic booking, in EN/RU/ES', () => {
  // The previous selector computed the tariff-specific CTA but never passed it
  // to ContactChannelChooser: paid buttons all showed generic "Request to join".
  assert.match(checkout, /const cta = isService \? t\.serviceActions\[serviceChoice\] : t\.freeAction/)
  assert.match(checkout, /whatsappUrl=\{whatsappUrl\}\s+label=\{cta\}\s+publicServiceTitle=\{t\.serviceOptions\[serviceChoice\]\}/)
  assert.match(chooser, /<span>\{label \|\| c\.order\}<\/span>/)
  for (const requestLabel of [
    'Request 60-min session · €100',
    'Request 30-min consultation · €50',
    'Заявка на сессию · 60 мин · €100',
    'Заявка на консультацию · 30 мин · €50',
    'Solicitar sesión · 60 min · €100',
    'Solicitar consulta · 30 min · €50',
  ]) assert.ok(checkout.includes(requestLabel), 'missing paid request CTA: ' + requestLabel)
  assert.doesNotMatch(checkout, /session: "(?:Book|Записаться|Reservar) (?:60|на 60)/)
  assert.match(checkout, /This is an enquiry, not a confirmed booking or payment/)
})

test('changing the selected paid offer remounts the enquiry to clear the previous draft and consent', () => {
  // The chooser already resets on whatsappUrl changes, but only a keyed
  // subtree guarantees the old form and saved receipt cannot be reused by
  // React reconciliation when the tariff changes during an async request.
  assert.match(checkout, /isPaidRequest\s*\?\s*\([\s\S]*?<ContactChannelChooser[\s\S]*?key=\{serviceChoice\}/)
  assert.match(chooser, /const \[consent, setConsent\] = useState\(false\)/)
  assert.match(chooser, /const \[saved, setSaved\] = useState<SavedEnquiry \| null>\(null\)/)
  assert.match(chooser, /const operationId = useRef<string \| null>\(null\)/)
})
