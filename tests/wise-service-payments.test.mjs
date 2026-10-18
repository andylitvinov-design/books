import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeWiseOpenPaymentLink, wisePaymentsEnabled, buildWiseServicePaymentUrl } from '../lib/commerce/wise-payments.js'

const openLink = 'https://wise.com/pay/business/holistichouse-example'

test('only canonical reusable Wise Business OPEN links are accepted', () => {
  assert.equal(normalizeWiseOpenPaymentLink(openLink), openLink)
  assert.equal(normalizeWiseOpenPaymentLink('https://www.wise.com/pay/business/holistichouse-example/'), openLink)
  for (const raw of [
    '', 'https://wise.com.evil.example/pay/business/mine',
    'https://evil.example/pay/business/mine', 'http://wise.com/pay/business/mine',
    'https://wise.com/pay/business/mine?amount=1',
    'https://wise.com/pay/business/mine#receipt',
    'https://user@wise.com/pay/business/mine',
    'https://wise.com/pay/me/mine', 'https://wise.com/send', 'https://wise.com/r/mine',
    'https://wise.com/pay/business/mine/redirect',
  ]) assert.equal(normalizeWiseOpenPaymentLink(raw), null, raw)
})

test('real activation needs both verified payee and enabled switch, not just a URL', () => {
  const base = { HH_WISE_PAYMENT_OPEN_LINK: openLink }
  assert.equal(wisePaymentsEnabled(base), false)
  assert.equal(wisePaymentsEnabled({ ...base, HH_WISE_PAYMENTS_ENABLED: 'true' }), false)
  assert.equal(wisePaymentsEnabled({ ...base, HH_WISE_PAYMENTS_ENABLED: 'true', HH_WISE_PAYEE_APPROVED: 'true' }), true)
  assert.equal(wisePaymentsEnabled({ ...base, HH_WISE_PAYMENTS_ENABLED: 'true', HH_WISE_PAYEE_APPROVED: 'true', HH_WISE_PAYMENT_OPEN_LINK: 'https://evil.example' }), false)
})

test('immutable source catalog supplies EUR 50/100 amounts; client cannot choose arbitrary price', () => {
  const thirty = new URL(buildWiseServicePaymentUrl(openLink, 'express-consultation-30'))
  const sixty = new URL(buildWiseServicePaymentUrl(openLink, 'personal-session-60'))
  assert.equal(thirty.origin + thirty.pathname, openLink)
  assert.equal(thirty.searchParams.get('amount'), '50.00')
  assert.equal(sixty.searchParams.get('amount'), '100.00')
  assert.equal(thirty.searchParams.get('currency'), 'EUR')
  assert.equal(sixty.searchParams.get('currency'), 'EUR')
  assert.equal(thirty.searchParams.get('description'), 'Holistic House - express-consultation-30')
  for (const invalid of ['unknown', 'free', 'personal-session-60?amount=1', null, '__proto__']) {
    assert.equal(buildWiseServicePaymentUrl(openLink, invalid), null)
  }
})

test('EN/RU/ES service selectors are integration points, no client-side paid confirmation', () => {
  const route = readFileSync(new URL('../app/api/payments/wise/[productId]/route.ts', import.meta.url), 'utf8')
  const capture = readFileSync(new URL('../components/consultation-choice-capture.tsx', import.meta.url), 'utf8')
  const alchemy = readFileSync(new URL('../components/alchemy-soul-lead-form.tsx', import.meta.url), 'utf8')
  const main = readFileSync(new URL('../app/[locale]/services/page.tsx', import.meta.url), 'utf8')
  const spanish = readFileSync(new URL('../app/es/services/page.tsx', import.meta.url), 'utf8')
  assert.match(route, /wisePaymentsEnabled\(\)/)
  assert.match(route, /303/)
  assert.match(route, /Cache-Control/)
  assert.doesNotMatch(route, /paid\s*=|grantAccess|activateEntitlement/)
  assert.match(capture, /data-wise-payment-link/)
  assert.match(alchemy, /data-wise-payment-link/)
  assert.match(main, /wiseEnabled=\{wisePaymentsEnabled\(\)\}/)
  assert.match(spanish, /wiseEnabled=\{wisePaymentsEnabled\(\)\}/)
})
