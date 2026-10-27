import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const contact = read('components/remote-support-enquiry-contact.tsx')
const selector = read('components/remote-energy-support-booking.tsx')
const css = read('components/remote-energy-support-booking.module.css')

test('confirmation is a real, consented first-party API write, with a server-issued receipt', () => {
  assert.match(contact, /fetch\("\/api\/service-enquiries", \{/)
  assert.match(contact, /method: "POST", credentials: "same-origin"/)
  assert.match(contact, /contactConsent: true/)
  assert.match(contact, /operationId: id/)
  assert.match(contact, /response\.ok \|\| result\.saved !== true/)
  assert.match(contact, /!\/\^HH-\[A-F0-9\]\{12\}\$\/\.test/)
  assert.match(contact, /setSavedReference\(result\.referenceCode\)/)
  assert.match(contact, /data-remote-order-confirmation/)
  assert.match(contact, /operationId\.current \|\| crypto\.randomUUID\(\)/)
  assert.doesNotMatch(contact, /sessionStorage|localStorage|router\.push|window\.location\.assign/)
  assert.doesNotMatch(selector, /router\.push|\/app\/consultations\?/)
})

test('collapsed optional schedule never blocks submitting without time', () => {
  assert.match(selector, /<details className=\{styles\.timeGroup\} data-optional-session-time/)
  assert.match(selector, /<input id="remote-date" type="date" min=/)
  assert.match(selector, /<input id="remote-time" type="time" value=/)
  assert.doesNotMatch(selector, /<input id="remote-date"[^>]*\brequired/)
  assert.doesNotMatch(selector, /<input id="remote-time"[^>]*\brequired/)
  assert.match(contact, /day && time \? day \+ " " \+ time/)
  assert.match(contact, /"Not specified"/)
  assert.match(contact, /if \(\(day && !time\) \|\| \(!day && time\)\)/)
  assert.match(css, /\.timeToggle/)
})

test('talisman and energy requests share one compact inline route, not payment flow', () => {
  assert.match(selector, /kind="talisman" goal=\{goal\}/)
  assert.match(selector, /kind="energy" goal=\{goal\}/)
  assert.match(selector, /<RemoteSupportEnquiryContact/)
  assert.match(contact, /Type: personal talisman; price and delivery to be agreed/)
  assert.match(contact, /Published price \(verify before payment\)/)
  assert.doesNotMatch(contact, /checkout|paymentIntent|setBookingConfirmed|chargeCustomer/)
  assert.match(contact, /Holistic House свяжется с вами/)
  assert.match(contact, /Confirm request/)
  assert.match(contact, /Подтвердить заявку/)
  assert.match(contact, /Confirmar solicitud/)
  assert.match(css, /\.enquiryReceipt/)
})

test('existing encrypted public enquiry contract accepts guest phone or email in all languages', () => {
  for (const locale of ['en', 'ru', 'es']) {
    for (const sourcePath of [
      '/' + locale + '/services/remote-energy-support',
      '/' + locale + '/holistic-support',
    ]) {
      for (const way of ['email', 'phone']) {
        const normalized = normalizePublicServiceEnquiry({
          operationId: '10000000-0000-4000-8000-000000000002',
          serviceTitle: 'Remote energy support · Andy',
          description: 'Public Holistic House request — not booked or paid\nRequested practitioner: Andy\nArea: Energy and resources\nPreferred time: Not specified',
          sourcePath, locale,
          contact: { displayName: '', email: way === 'email' ? 'guest@example.com' : '',
            phone: way === 'phone' ? '+14165550123' : '' },
          contactConsent: true, website: '',
        })
        assert.equal(normalized.locale, locale)
        assert.equal(normalized.sourcePath, sourcePath)
        assert.equal(normalized.contactConsent, true)
        assert.equal(normalized.contact[way], way === 'email' ? 'guest@example.com' : '+14165550123')
      }
    }
  }
})
