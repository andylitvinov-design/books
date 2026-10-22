import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { getCommerceConfig } from '../lib/commerce/config.js'
import { SERVICE_PRODUCTS } from '../lib/commerce/catalog.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const verified={
  VERCEL_ENV:'production',
  HH_COMMERCE_PROVIDER:'paypal',
  HH_PAYPAL_ENVIRONMENT:'live',
  HH_COMMERCE_PRODUCTION_APPROVED:'true',
  HH_PAYPAL_PRODUCTION_APPROVED:'true',
  HH_PAYPAL_TAX_REVIEW_APPROVED:'true',
  HH_COMMERCE_SCHEMA_APPROVED:'true',
  HH_BILLING_SCHEMA_APPROVED:'true',
  HH_COMMERCE_ENABLED:'true',
  HH_COMMERCE_FULFILLMENT_APPROVED:'true',
  HH_COMMERCE_TAX_REVIEW_APPROVED:'true',
  HH_PAYPAL_CLIENT_ID:'merchant_live_app_id_123',
  HH_PAYPAL_CLIENT_SECRET:'synthetic_secret_value_test_only',
  HH_PAYPAL_MERCHANT_ID:'MERCHANT12345',
  HH_PAYPAL_WEBHOOK_ID:'WH-TEST-123456789',
}

test('no merchant credentials, schema or independent approvals means NO automatic checkout',()=>{
  assert.equal(getCommerceConfig({VERCEL_ENV:'production'}).enabled,false)
  assert.equal(getCommerceConfig({...verified,HH_PAYPAL_ENVIRONMENT:'sandbox'}).enabled,false)
  assert.equal(getCommerceConfig({...verified,HH_PAYPAL_ENVIRONMENT:'live',HH_COMMERCE_PRODUCTION_APPROVED:'false'}).enabled,false)
  assert.equal(getCommerceConfig({...verified,HH_PAYPAL_CLIENT_SECRET:''}).enabled,false)
  assert.equal(getCommerceConfig({...verified,HH_BILLING_SCHEMA_APPROVED:'false'}).enabled,false)
  assert.equal(getCommerceConfig({...verified,HH_COMMERCE_FULFILLMENT_APPROVED:'false'}).enabled,false)
  assert.equal(getCommerceConfig({...verified,HH_COMMERCE_TAX_REVIEW_APPROVED:'false'}).enabled,false)
  assert.equal(getCommerceConfig({...verified,HH_PAYPAL_TAX_REVIEW_APPROVED:'false'}).enabled,false)
  const configured=getCommerceConfig(verified)
  assert.equal(configured.provider,'paypal')
  assert.equal(configured.environment,'live')
  assert.equal(configured.enabled,true)
  assert.equal(configured.prices['express-consultation-30'],undefined)
})

test('legacy ZEN/Stripe configurations remain independently disabled and unchanged',()=>{
  assert.equal(getCommerceConfig({HH_COMMERCE_PROVIDER:'zen',VERCEL_ENV:'production'}).enabled,false)
  assert.equal(getCommerceConfig({HH_COMMERCE_PROVIDER:'stripe',VERCEL_ENV:'production'}).enabled,false)
  for(const item of SERVICE_PRODUCTS){
    assert.equal(item.kind,'one_time')
    assert.equal(item.currency,'EUR')
    assert.ok([5000,10000].includes(item.amountMinor))
  }
})

test('verified checkout links keep PayPal.Me fallback and use one checkout component',()=>{
  const payments=read('app/[locale]/payments/page.tsx')
  const cart=read('app/[locale]/cart/page.tsx')
  for(const page of [payments,cart]){
    assert.match(page,/getCommerceConfig\(\)/)
    assert.match(page,/commerce\.provider === "paypal" && commerce\.enabled/)
    assert.doesNotMatch(page,/verifiedPayPalCheckout \? <ServiceCart locale=\{locale\} \/>/)
  }
  assert.match(payments,/data-verified-paypal-checkout/)
  assert.match(payments,/data-verified-paypal-combined/)
  assert.match(cart,/verifiedPayPalEnabled=\{verifiedPayPalCheckout\}/)
  assert.match(read('components/commerce/personal-cart.tsx'),/data-cart-verified-paypal-checkout/)
  assert.match(read('app/[locale]/services/checkout/page.tsx'),/en", "ru", "es/)
  assert.match(payments,/data-paypal-personal-link/)
  assert.match(payments,/data-paypal-combined-link/)
  assert.match(cart,/<PersonalCart locale=\{locale\}/)
  assert.doesNotMatch(payments,/NEXT_PUBLIC_HH_PAYPAL_CLIENT_SECRET|markAsPaid/)
})

test('PayPal return only requests authenticated capture with account check: it cannot mark paid',()=>{
  const client=read('components/commerce/service-cart.tsx')
  const route=read('app/api/app/commerce/orders/[orderId]/capture/route.js')
  const service=read('lib/commerce/service.js')
  assert.match(client,/paymentProvider === "paypal" && paypalReturned/)
  assert.match(client,/paymentCancelled/)
  assert.match(client,/paypalCaptureAttempted\.current\.add/)
  assert.match(client,/\/capture/)
  assert.match(client,/credentials: "same-origin"/)
  assert.match(client,/verifyCommerceIdentity\(guard, ticket!\)/)
  assert.match(client,/www\.paypal\.com/)
  assert.match(client,/data-paypal-verified-retry/)
  assert.match(route,/requireSameOrigin\(request, config\)/)
  assert.match(route,/requireCommerceAccount\(request, actor\)/)
  assert.match(route,/serviceCommerceRuntime\(config\)\.capture\(/)
  assert.match(service,/provider\.capture\(order\)/)
  assert.match(read('lib/commerce/paypal-provider.js'),/\/services\/checkout\?serviceOrder=/)
  assert.doesNotMatch(route,/payment_status\s*=\s*'paid'|request\.json\(\).*paid/)
})

test('PayPal server verifies signed webhook and provider evidence, not browser query claims',()=>{
  const provider=read('lib/commerce/paypal-provider.js')
  const webhook=read('app/api/billing/paypal/webhook/route.js')
  const runtime=read('lib/commerce/runtime.js')
  const schema=read('docs/billing/proposed-service-commerce-schema.sql')
  assert.match(provider,/merchant_id !== config\.merchantId/)
  assert.match(provider,/\/v1\/notifications\/verify-webhook-signature/)
  assert.match(provider,/verifyRemoteOrder\(remote, order, config\)/)
  assert.match(webhook,/provider\.verifyWebhook/)
  assert.match(runtime,/handleServicePayPalEvent/)
  assert.match(runtime,/createZenCommerceProvider/)
  assert.match(runtime,/createStripeCommerceProvider/)
  assert.match(schema,/UNAPPLIED SERVICE COMMERCE PROPOSAL/)
  assert.match(schema,/provider='paypal'/)
  assert.match(schema,/FORCE ROW LEVEL SECURITY/)
})
