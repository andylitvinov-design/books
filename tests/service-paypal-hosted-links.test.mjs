import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { SERVICE_PRODUCTS } from '../lib/commerce/catalog.js'
import { normalizePayPalHostedLink, configuredPayPalHostedLinks, buildPayPalHostedCartUrl } from '../lib/commerce/paypal-hosted-links.js'

const ids = SERVICE_PRODUCTS.map(p => p.id)
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const approved = {
  VERCEL_ENV: 'production',
  HH_PAYPAL_HOSTED_LINKS_ENABLED: 'true',
  HH_PAYPAL_HOSTED_PAYEE_APPROVED: 'true',
  HH_PAYPAL_HOSTED_EUR_AMOUNTS_VERIFIED: 'true',
  HH_PAYPAL_HOSTED_50_EUR_LINK: 'https://www.paypal.com/ncp/payment/PLB-12345678ABC',
  HH_PAYPAL_HOSTED_100_EUR_LINK: 'https://www.paypal.com/ncp/payment/PLB-12345678ABD',
  HH_PAYPAL_HOSTED_150_EUR_LINK: 'https://www.paypal.com/ncp/payment/PLB-12345678ABE',
}
test('PayPal hosted payment stays off without production, payee and price approvals', () => {
  assert.deepEqual(configuredPayPalHostedLinks({}), {})
  for (const key of ['VERCEL_ENV', 'HH_PAYPAL_HOSTED_LINKS_ENABLED',
    'HH_PAYPAL_HOSTED_PAYEE_APPROVED', 'HH_PAYPAL_HOSTED_EUR_AMOUNTS_VERIFIED']) {
    const env = { ...approved }; delete env[key]
    assert.deepEqual(configuredPayPalHostedLinks(env), {})
  }
  assert.deepEqual(configuredPayPalHostedLinks({...approved, VERCEL_ENV:'preview'}), {})
  assert.deepEqual(configuredPayPalHostedLinks({...approved, VERCEL_ENV:'development'}), {})
})
test('Only PayPal-owned, HTTPS, fixed-price hosted paths without arbitrary params', () => {
  assert.equal(normalizePayPalHostedLink(approved.HH_PAYPAL_HOSTED_50_EUR_LINK),
    approved.HH_PAYPAL_HOSTED_50_EUR_LINK)
  for(const bad of [
    'http://www.paypal.com/ncp/payment/PLB-12345678ABC',
    'https://paypal.com/ncp/payment/PLB-12345678ABC',
    'https://www.paypal.com.evil.test/ncp/payment/PLB-12345678ABC',
    'https://attacker@www.paypal.com/ncp/payment/PLB-12345678ABC',
    'https://www.paypal.com/ncp/payment/PLB-12345678ABC?amount=1',
    'https://www.paypal.com/ncp/payment/PLB-12345678ABC#paid',
    'https://www.paypal.com/paypalme/psitrends/50EUR',
    'https://www.sandbox.paypal.com/ncp/payment/PLB-12345678ABC',
    'https://www.paypal.com/ncp/payment/../../../evil',
  ]) assert.equal(normalizePayPalHostedLink(bad), null, bad)
})
test('Only fixed service catalog products can map to EUR 50/100/150', () => {
  const links=configuredPayPalHostedLinks(approved)
  assert.ok(Object.isFrozen(links))
  assert.equal(buildPayPalHostedCartUrl([ids[0]],links),approved.HH_PAYPAL_HOSTED_50_EUR_LINK)
  assert.equal(buildPayPalHostedCartUrl([ids[1]],links),approved.HH_PAYPAL_HOSTED_100_EUR_LINK)
  assert.equal(buildPayPalHostedCartUrl(ids,links),approved.HH_PAYPAL_HOSTED_150_EUR_LINK)
  for(const bad of [[],null,['free'],['fake'],[ids[0],ids[0]],[{id:ids[0],amountMinor:1}]])
    assert.equal(buildPayPalHostedCartUrl(bad,links),null)
})
test('Duplicate or malicious links disable provider; missing combo link falls back', () => {
  assert.deepEqual(configuredPayPalHostedLinks({...approved,
    HH_PAYPAL_HOSTED_100_EUR_LINK:approved.HH_PAYPAL_HOSTED_50_EUR_LINK}),{})
  assert.deepEqual(configuredPayPalHostedLinks({...approved,
    HH_PAYPAL_HOSTED_100_EUR_LINK:'https://example.test/pay'}),{})
  const partial=configuredPayPalHostedLinks({...approved, HH_PAYPAL_HOSTED_150_EUR_LINK:''})
  assert.equal(buildPayPalHostedCartUrl(ids,partial),null)
  assert.equal(buildPayPalHostedCartUrl([ids[0]],partial),approved.HH_PAYPAL_HOSTED_50_EUR_LINK)
})
test('Public payment pages expose hosted links but never auto-mark orders paid', () => {
  const page=read('app/[locale]/payments/page.tsx')
  const cart=read('components/commerce/personal-cart.tsx')
  const entry=read('app/[locale]/cart/page.tsx')
  assert.match(page,/configuredPayPalHostedLinks\(\)/)
  assert.match(page,/data-paypal-hosted-link/)
  assert.match(page,/data-paypal-hosted-combined/)
  assert.match(cart,/buildPayPalHostedCartUrl/)
  assert.match(cart,/data-cart-paypal-hosted/)
  assert.match(entry,/hostedPayPalLinks=\{configuredPayPalHostedLinks\(\)\}/)
  assert.doesNotMatch(page,/setPaid\(|markAsPaid|grantEntitlement/)
  assert.doesNotMatch(cart,/setPaid\(|markAsPaid|grantEntitlement/)
})
