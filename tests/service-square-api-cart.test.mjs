import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHmac } from 'node:crypto'
import { test } from 'node:test'
import { normalizeSquareCheckoutRedirect } from '../lib/commerce/square-payment-links.js'
import {
  createSquarePaymentLink, getSquareGatewayConfig, paymentIdFromSquareEvent,
  squareCheckoutPayload, squareWebhookValid, squareApiRequest,
  validateSquareCart, verifiedSquarePaymentSnapshot,
} from '../lib/commerce/square-gateway.js'

const id = '123e4567-e89b-42d3-a456-426614174000'
const op = '4d734b86-0e7a-4f9b-8d1a-1b98f6f67821'
const env = {
  VERCEL_ENV: 'production', HH_SQUARE_API_MODE: 'production',
  HH_SQUARE_API_ENABLED: 'true', HH_SQUARE_API_SCHEMA_APPROVED: 'true',
  HH_SQUARE_API_PRODUCTION_APPROVED: 'true',
  HH_SQUARE_INDIVIDUAL_PAYEE_APPROVED: 'true',
  HH_SQUARE_CAD_AMOUNTS_APPROVED: 'true',
  HH_SQUARE_TAX_REVIEW_APPROVED: 'true',
  HH_SQUARE_REFUND_TERMS_APPROVED: 'true',
  HH_SQUARE_API_TOKEN: 'EAAAtestToken00000000000000',
  HH_SQUARE_MERCHANT_ID: 'TESTMERCHANT001',
  HH_SQUARE_LOCATION_ID: 'TESTLOCATION01',
  HH_SQUARE_WEBHOOK_SIGNATURE_KEY: 'webhooksignaturesecret000000000',
  HH_SQUARE_WEBHOOK_URL: 'https://holistichouse.vercel.app/api/payments/square/webhook',
  HH_SQUARE_CAD_50_MINOR: '7500',
  HH_SQUARE_CAD_100_MINOR: '15000',
  HH_SQUARE_CAD_150_MINOR: '22500',
}
const config = getSquareGatewayConfig(env)
const checkout = { operationId: op, items: ['express-consultation-30'], locale: 'ru' }
const row = {
  id, locale: 'ru', cad_minor: 7500, square_order_id: 'ABCDORDER001',
  square_link_id: 'ABCDLINK001', square_payment_id: null,
}
const payment = {
  id: 'ABCDPAYMENT001', order_id: row.square_order_id,
  location_id: env.HH_SQUARE_LOCATION_ID,
  status: 'COMPLETED', amount_money: { amount: 7500, currency: 'CAD' },
  refunded_money: { amount: 0, currency: 'CAD' },
}
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const rejected = fn => assert.throws(fn, /INVALID|UNAVAILABLE|MISMATCH|CONFLICT|REQUIRED|UNKNOWN_FIELD/)

test('fail closed until live Square, tax, refund, RLS, prices and signature are independently configured', () => {
  assert.equal(config.enabled, true)
  assert.equal(getSquareGatewayConfig({}).enabled, false)
  for (const key of [
    'HH_SQUARE_API_ENABLED','HH_SQUARE_API_SCHEMA_APPROVED',
    'HH_SQUARE_API_PRODUCTION_APPROVED','HH_SQUARE_INDIVIDUAL_PAYEE_APPROVED',
    'HH_SQUARE_CAD_AMOUNTS_APPROVED','HH_SQUARE_TAX_REVIEW_APPROVED',
    'HH_SQUARE_REFUND_TERMS_APPROVED','HH_SQUARE_API_TOKEN',
    'HH_SQUARE_MERCHANT_ID','HH_SQUARE_LOCATION_ID',
    'HH_SQUARE_WEBHOOK_SIGNATURE_KEY','HH_SQUARE_CAD_50_MINOR',
    'HH_SQUARE_CAD_100_MINOR','HH_SQUARE_CAD_150_MINOR',
  ]) {
    const unset = { ...env }
    delete unset[key]
    assert.equal(getSquareGatewayConfig(unset).enabled, false, key)
  }
  assert.equal(getSquareGatewayConfig({ ...env, VERCEL_ENV: 'preview' }).enabled, false)
  assert.equal(getSquareGatewayConfig({ ...env, HH_SQUARE_API_MODE: 'sandbox' }).enabled, false)
  assert.equal(getSquareGatewayConfig({ ...env, HH_SQUARE_CAD_50_MINOR: '999999' }).enabled, false)
  assert.equal(getSquareGatewayConfig({ ...env, HH_SQUARE_WEBHOOK_URL: 'https://evil.example/api/payments/square/webhook' }).enabled, false)
})

test('catalog, one-time cart and server CAD price are immutable; 150 total is legitimate', () => {
  assert.deepEqual(validateSquareCart(checkout, config), {
    operationId: op, items: checkout.items, locale:'ru', eurMinor:5000,
    cadMinor:7500,cartKey:'express-consultation-30',repeatOf:null,
  })
  assert.equal(validateSquareCart({ ...checkout, items: ['personal-session-60'] }, config).cadMinor, 15000)
  assert.equal(validateSquareCart({ ...checkout, items: ['personal-session-60','express-consultation-30'] }, config).cadMinor, 22500)
  for(const items of [[],['unknown'],['personal-session-60','personal-session-60'],['express-consultation-30',42]]) {
    rejected(() => validateSquareCart({ ...checkout, items }, config))
  }
  for(const change of [{ total: 1 },{ price: '1' },{ cadMinor: 1 },{ operationId: 'bad' },{ locale: 'fr' }]) {
    rejected(() => validateSquareCart({ ...checkout, ...change }, config))
  }
})

test('provider checkout is per-order, fixed CAD, no tip/shipping/PII and safe return URL', () => {
  const body = squareCheckoutPayload(row,config.locationId,'https://holistichouse.vercel.app')
  assert.equal(body.idempotency_key,id)
  assert.deepEqual(body.quick_pay.price_money,{ amount:7500,currency:'CAD' })
  assert.equal(body.checkout_options.allow_tipping,false)
  assert.equal(body.checkout_options.ask_for_shipping_address,false)
  assert.equal(body.checkout_options.redirect_url,'https://holistichouse.vercel.app/ru/cart?squareOrder='+id)
  assert.doesNotMatch(JSON.stringify(body),/diagnos|symptom|test_result|email|phone|health/i)
  rejected(() => squareCheckoutPayload(row,config.locationId,'https://other.example'))
})

test('dynamic Square Sandbox checkout uses sandbox host without leaking it into production', () => {
  assert.equal(normalizeSquareCheckoutRedirect('https://sandbox.square.link/u/ABCDE12345','sandbox'),
    'https://sandbox.square.link/u/ABCDE12345')
  assert.equal(normalizeSquareCheckoutRedirect('https://sandbox.square.link/u/ABCDE12345','production'),null)
  assert.equal(normalizeSquareCheckoutRedirect('https://square.link/u/ABCDE12345','sandbox'),null)
  assert.equal(normalizeSquareCheckoutRedirect('https://sandbox.square.link.evil.test/u/ABCDE12345','sandbox'),null)
  assert.equal(normalizeSquareCheckoutRedirect('https://sandbox.square.link/u/ABCDE12345?amount=1','sandbox'),null)
})

test('signed Square raw bytes + exact webhook URL are mandatory', () => {
  const raw=Buffer.from(JSON.stringify({merchant_id:env.HH_SQUARE_MERCHANT_ID,type:'payment.updated'}))
  const sig=createHmac('sha256',config.webhookKey).update(config.webhookUrl).update(raw).digest('base64')
  assert.equal(squareWebhookValid(raw,sig,config),true)
  assert.equal(squareWebhookValid(Buffer.concat([raw,Buffer.from(' ')]),sig,config),false)
  assert.equal(squareWebhookValid(raw,sig,{...config,webhookUrl:'https://other.example/api/payments/square/webhook'}),false)
  assert.equal(squareWebhookValid(raw,'AAAA',config),false)
  assert.equal(squareWebhookValid(raw,sig,{...config,enabled:false}),false)
  const event={merchant_id:config.merchantId,event_id:id,type:'payment.updated',data:{object:{payment:{id:payment.id}}}}
  assert.equal(paymentIdFromSquareEvent(event,config),payment.id)
  assert.equal(paymentIdFromSquareEvent({...event,type:'order.updated'},config),null)
  rejected(() => paymentIdFromSquareEvent({...event,merchant_id:'ATTACKER'},config))
})

test('provider readback owns amount, location, linked order and refunded holds', () => {
  assert.deepEqual(verifiedSquarePaymentSnapshot(payment,row,config),
    {status:'paid',refundedMinor:0,paymentId:payment.id})
  assert.equal(verifiedSquarePaymentSnapshot({...payment,status:'PENDING'},row,config).status,'checkout_ready')
  assert.equal(verifiedSquarePaymentSnapshot({...payment,refunded_money:{amount:1,currency:'CAD'}},row,config).status,'payment_review')
  for(const corrupt of [
    {order_id:'OTHERS'}, {location_id:'OTHERLOCATION'},
    {amount_money:{amount:1,currency:'CAD'}},
    {amount_money:{amount:7500,currency:'EUR'}},
    {refunded_money:{amount:7501,currency:'CAD'}},
  ]) rejected(() => verifiedSquarePaymentSnapshot({...payment,...corrupt},row,config))
})

test('Square API request uses pinned endpoint, auth server only and idempotent order reference', async () => {
  let count=0
  const fetcher=async(url,options) => {
    count++
    assert.equal(url,'https://connect.squareup.com/v2/online-checkout/payment-links')
    assert.equal(options.headers['Square-Version'],'2026-09-16')
    assert.equal(options.headers.Authorization,'Bearer '+env.HH_SQUARE_API_TOKEN)
    const payload=JSON.parse(options.body)
    assert.equal(payload.idempotency_key,id)
    assert.equal(payload.quick_pay.price_money.amount,7500)
    return { ok:true,json:async()=>({payment_link:{
      id:'ABCDEFGH12',order_id:'SQORDER99999',url:'https://square.link/u/ABCDE12345',
    }})}
  }
  const result=await createSquarePaymentLink(config,row,'https://holistichouse.vercel.app',fetcher)
  assert.deepEqual(result,{url:'https://square.link/u/ABCDE12345',linkId:'ABCDEFGH12',squareOrderId:'SQORDER99999'})
  assert.equal(count,1)
  await assert.rejects(squareApiRequest(config,'GET','https://evil.example/',undefined,fetcher))
})

test('cart, endpoints and SQL contain strict order ownership, no fake paid on redirect',()=>{
  const cart=read('components/commerce/personal-cart.tsx')
  const page=read('app/[locale]/cart/page.tsx')
  const checkoutRoute=read('app/api/payments/square/checkout/route.js')
  const statusRoute=read('app/api/payments/square/status/route.js')
  const webhook=read('app/api/payments/square/webhook/route.js')
  const service=read('lib/commerce/square-cart-service.js')
  const sql=read('supabase/migrations/20261024185000_hh_square_cart_one_time.sql')
  assert.match(page,/squareApiEnabled=\{squareGateway.enabled\}/)
  assert.match(cart,/data-cart-square-api-checkout/)
  assert.match(cart,/data-cart-square-buy-again/);
  assert.match(cart,/data-cart-square-buy-again-confirmation/);
  assert.match(cart,/repeatPurchaseRequired/);
  assert.match(read('lib/commerce/square-cart-service.js'),/repeatPurchaseRequired: true/);

  assert.match(cart,/squareStatus === "paid"/)
  assert.match(cart, /normalizeSquareCheckoutRedirect/)
  assert.match(checkoutRoute,/await auth.verified\(\)/)
  assert.match(checkoutRoute,/requireSameOrigin\(request, app\)/)
  assert.match(checkoutRoute,/consumeRate/)
  assert.match(statusRoute,/await auth.verified\(\)/)
  assert.match(webhook,/squareWebhookValid\(raw, signature, square\)/)
  assert.match(webhook,/boundedRawBody/)
  assert.match(service,/squareApiRequest\(settings, 'GET', '\/v2\/payments\/'/)
  assert.match(service,/square_order_id=\$1 and environment=\$2/)
  assert.equal(sql.split("as $$").length - 1, 2, "Both PL/pgSQL guards must have literal $$ delimiters");
  assert.equal(sql.split("end $$;").length - 1, 2, "Both PL/pgSQL guards must close literal $$ delimiters");
  assert.match(sql,/force row level security/i)
  assert.match(sql,/square_orders_account_read/)
  assert.match(sql,/square_orders_verified_webhook_read/)
  assert.match(sql,/SQUARE_PAYMENT_REQUIRES_PROVIDER_VERIFICATION/)
  assert.doesNotMatch(cart,/setSquareStatus\("paid"\)\s*;\s*window\.location/)
})

test('Square paid state must not survive a cart edit or a delayed provider readback', () => {
  const cart = read('components/commerce/personal-cart.tsx')
  const removal = cart.match(/function remove\(id: string\) \{([\s\S]*?)\n  \}\n\n  return <section/)
  assert.ok(removal, 'the existing cart removal handler is present')
  for (const statement of [
    'if (squareBusy) return;',
    'squareStatusGeneration.current += 1;',
    'squareOperation.current = null;',
    'setSquareOrderId(null);',
    'setSquareStatus(null);',
    'setSquareRepeatOf(null);',
    'setSquareError(null);',
  ]) assert.ok(removal[1].includes(statement), statement)
  assert.match(cart, /onClick=\{\(\) => remove\(product\.id\)\} disabled=\{squareBusy\}/)
  // Both the initial Square return and the manual status refresh must discard
  // a late response once the basket has changed.
  assert.equal(cart.split('if (squareStatusGeneration.current !== requestVersion) return;').length - 1, 2)
  assert.match(cart, /if \(squareStatusGeneration\.current === requestVersion\) setSquareError/)
  assert.match(cart, /if \(squareStatusGeneration\.current === requestVersion\)\s+setSquareError/)
})
