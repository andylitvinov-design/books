import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { getCommerceConfig } from '../lib/commerce/config.js'
import { zenCheckoutSignature, zenCheckoutUrl, zenCheckoutReference, zenMinorUnits, zenDecimal, verifyZenIpnPayload } from '../lib/commerce/zen-protocol.js'

const owner = '11111111-1111-4111-8111-111111111111'
const orderId = '33333333-3333-4333-8333-333333333333'
const txId = '55555555-5555-4555-8555-555555555555'
const terminalUuid = '77777777-7777-4777-8777-777777777777'
const secret = 'synthetic-ipn-secret-not-live'

function fakeIpn(changes = {}) {
  const payload = { type:'TRT_PURCHASE', merchantTransactionId:orderId,
    amount:'50.00', currency:'EUR', status:'ACCEPTED', ...changes }
  payload.hash = createHash('sha256').update(
    payload.merchantTransactionId + payload.currency + payload.amount + payload.status + secret
  ).digest('hex').toUpperCase()
  return JSON.stringify(payload)
}

test('ZEN checkout signature sorts and lowercases nested fields with exact secret suffix', () => {
  const payload = {terminalUuid, amount:50, currency:'EUR', merchantTransactionId:orderId,
    items:[{code:'express-consultation-30',name:'Express consultation',price:50,quantity:1,lineAmountTotal:50}]}
  const expectedPairs = [
    'terminaluuid=' + terminalUuid,'amount=50','currency=eur','merchanttransactionid='+orderId,
    'items[0].code=express-consultation-30','items[0].name=express consultation',
    'items[0].price=50','items[0].quantity=1','items[0].lineamounttotal=50',
  ].sort().join('&')
  const expected = createHash('sha256').update(expectedPairs+'synthetic-paywall').digest('hex')+';sha256'
  assert.equal(zenCheckoutSignature(payload,'synthetic-paywall'),expected)
  assert.equal(zenCheckoutSignature({...payload,signature:'malicious'},'synthetic-paywall'),expected)
})
test('ZEN minor-unit conversion and trusted hosted redirects only', () => {
  assert.equal(zenMinorUnits('50.00'),5000)
  assert.equal(zenMinorUnits('0.01'),1)
  assert.equal(zenDecimal(12345),'123.45')
  for(const amount of ['1.999','-1','Infinity','1e5']) assert.throws(()=>zenMinorUnits(amount))
  assert.equal(zenCheckoutReference(orderId),'zc_33333333333343338333333333333333')
  for(const candidate of ['https://secure.zen-test.com.evil.tld/x','https://secure.zen.com/x',
    'https://evil.example/x','http://secure.zen-test.com/x','https://u:pw@secure.zen-test.com/x'])
    assert.throws(()=>zenCheckoutUrl(candidate,'sandbox'))
  assert.equal(zenCheckoutUrl('https://secure.zen-test.com/a','sandbox'),'https://secure.zen-test.com/a')
})
test('ZEN IPN hash is checked over EXACT received amount/status/currency and rejects tampering', () => {
  const event = verifyZenIpnPayload(fakeIpn(),secret)
  assert.equal(event.merchantTransactionId,orderId)
  assert.equal(event.type,'zen.trt_purchase.accepted')
  assert.equal(verifyZenIpnPayload(fakeIpn(),secret).id,event.id)
  const forged = JSON.parse(fakeIpn()); forged.amount='5.00'
  assert.throws(()=>verifyZenIpnPayload(JSON.stringify(forged),secret))
  assert.throws(()=>verifyZenIpnPayload(fakeIpn(),'wrong-ipn-secret'))
  assert.throws(()=>verifyZenIpnPayload(JSON.stringify({...forged,hash:''}),secret))
  assert.throws(()=>verifyZenIpnPayload('{','test'))
})
test('ZEN merchant-portal refund IPN binds the original service order, not the refund reference', () => {
  const payload = JSON.parse(fakeIpn({
    type: 'TRT_REFUND',
    merchantTransactionId: 'merchant-refund-42',
    originMerchantTransactionId: orderId,
    amount: '20.00',
    status: 'ACCEPTED',
  }))
  const event = verifyZenIpnPayload(JSON.stringify(payload), secret)
  assert.equal(event.merchantTransactionId, 'merchant-refund-42')
  assert.equal(event.originMerchantTransactionId, orderId)
  assert.equal(event.type, 'zen.trt_refund.accepted')
  const forged = { ...payload, originMerchantTransactionId: '00000000-0000-4000-8000-000000000000' }
  // The IPN hash does not cover the original-order reference; the provider
  // still performs an authoritative merchant API purchase/order readback.
  const other = verifyZenIpnPayload(JSON.stringify(forged), secret)
  assert.notEqual(other.originMerchantTransactionId, event.originMerchantTransactionId)
})

test('ZEN setup stays disabled without the approved schema, real merchant and launch flags', () => {
  const env = {HH_COMMERCE_PROVIDER:'zen',HH_COMMERCE_ENVIRONMENT:'sandbox',
    HH_COMMERCE_SCHEMA_APPROVED:'true',HH_BILLING_SCHEMA_APPROVED:'true',
    HH_ZEN_TERMINAL_UUID:terminalUuid,HH_ZEN_PAYWALL_SECRET:'synthetic-secret-123',
    HH_ZEN_IPN_SECRET:'synthetic-ipn-12345',HH_ZEN_TERMINAL_API_KEY:'synthetic-key-12345',
    HH_ZEN_SCHEMA_APPROVED:'false',HH_COMMERCE_ENABLED:'true',
    HH_COMMERCE_FULFILLMENT_APPROVED:'true',HH_COMMERCE_TAX_REVIEW_APPROVED:'true'}
  assert.equal(getCommerceConfig(env).enabled,false)
  env.HH_ZEN_SCHEMA_APPROVED='true'
  assert.equal(getCommerceConfig(env).enabled,true)
  assert.equal(getCommerceConfig({...env,VERCEL_ENV:'production'}).enabled,false)
  assert.equal(getCommerceConfig({...env,VERCEL_ENV:'production',HH_COMMERCE_ENVIRONMENT:'live',HH_COMMERCE_PRODUCTION_APPROVED:'true'}).enabled,true)
  assert.equal(getCommerceConfig({...env,HH_ZEN_TERMINAL_API_KEY:''}).enabled,false)
  assert.equal(getCommerceConfig({}).enabled,false)
})

if (!process.execArgv.includes('--conditions=react-server')) {
  test('ZEN service adapter (isolated mocked HTTPS provider)', () => {
    const result = spawnSync(process.execPath,
      ['--conditions=react-server','--test',fileURLToPath(import.meta.url)],{encoding:'utf8'})
    assert.equal(result.status,0,result.stdout+result.stderr)
  })
} else {
  const { createZenCommerceProvider } = await import('../lib/commerce/zen-provider.js')
  const config = { configured:true,enabled:true,provider:'zen',environment:'sandbox',
    zenApiKey:'synthetic-api-key',zenTerminalUuid:terminalUuid,
    zenIpnSecret:secret,zenPaywallSecret:'synthetic-paywall' }
  function fixture() {
    const calls=[]
    let details=null
    const fetcher=async (url, options) => {
      calls.push({url,options})
      if (options.method === 'POST') return new Response(JSON.stringify({redirectUrl:'https://secure.zen-test.com/hosted-123'}),{status:201})
      if (options.method === 'GET') return details ? new Response(JSON.stringify(details),{status:200}) : new Response('',{status:404})
      return new Response('',{status:500})
    }
    const provider=createZenCommerceProvider(config,{fetcher})
    const order={ id:orderId, origin:'https://holistic.example', customerId:null,
      currency:'EUR',totalMinor:5000,locale:'ru',
      items:[{serviceId:'express-consultation-30',quantity:1,amountMinor:5000,currency:'EUR'}],
      providerPrices:{'express-consultation-30':'express-consultation-30'},
      checkoutUrl:'https://secure.zen-test.com/hosted-123',
      providerCheckoutId:zenCheckoutReference(orderId),
      createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString() }
    const ready = async () => {
      order.customerId = await provider.createCustomer(owner)
      details={id:txId,type:'TRT_PURCHASE',merchantTransactionId:orderId,amount:'50.00',
        currency:'EUR',customer:{id:order.customerId},status:'PENDING',refunds:[],
        items:[{code:'express-consultation-30',quantity:1,price:'50.00',lineAmountTotal:'50.00'}]}
    }
    return {calls,provider,order,ready,get details(){return details}}
  }
  test('ZEN POST freezes merchant/order/amount and only sends anonymous customer ID', async () => {
    const f=fixture();await f.ready()
    const session=await f.provider.checkout({order:f.order,origin:f.order.origin})
    assert.equal(session.providerCheckoutId,zenCheckoutReference(orderId))
    assert.equal(session.url,'https://secure.zen-test.com/hosted-123')
    const req=f.calls[0]
    assert.equal(req.url,'https://secure.zen-test.com/api/checkouts')
    const body=JSON.parse(req.options.body)
    assert.equal(body.amount,'50.00');assert.equal(body.currency,'EUR');assert.equal(body.language,'ru');assert.equal(body.merchantTransactionId,orderId)
    assert.equal(body.customer.id,f.order.customerId)
    assert.match(body.urlSuccess,/\/ru\/services\/checkout\?serviceOrder=/)
    assert.equal(body.customIpnUrl,'https://holistic.example/api/billing/zen/ipn')
    assert.deepEqual(body.items,[{code:'express-consultation-30',name:'Express consultation',price:'50.00',quantity:1,lineAmountTotal:'50.00'}])
    const {signature,...unsigned}=body
    assert.equal(signature,zenCheckoutSignature(unsigned,config.zenPaywallSecret))
  })
  test('ZEN readback authoritatively distinguishes pending, paid and refund holds', async () => {
    const f=fixture();await f.ready()
    assert.equal((await f.provider.reconcile(f.order)).status,'open')
    f.details.status='ACCEPTED'
    assert.equal((await f.provider.reconcile(f.order)).status,'paid')
    f.details.refunds=[{status:'ACCEPTED',currency:'EUR',amount:'20.00'}]
    assert.equal((await f.provider.reconcile(f.order)).status,'payment_review')
    f.details.refunds=[{status:'ACCEPTED',currency:'EUR',amount:'50.00'}]
    assert.equal((await f.provider.reconcile(f.order)).status,'refunded')
    f.details.refunds=[];f.details.status='AUTHORIZED'
    assert.notEqual((await f.provider.reconcile(f.order)).status,'paid')
  })
  test('ZEN readback rejects forged owner, currency, amount, items and type', async () => {
    const f=fixture();await f.ready()
    for(const [key,value] of [['amount','1.00'],['currency','USD'],['type','TRT_REFUND']]) {
      const old=f.details[key];f.details[key]=value
      await assert.rejects(f.provider.reconcile(f.order),/SERVICE_PROVIDER_MISMATCH/)
      f.details[key]=old
    }
    f.details.customer.id='zh_wrong'
    await assert.rejects(f.provider.reconcile(f.order),/SERVICE_PROVIDER_MISMATCH/)
    f.details.customer.id=f.order.customerId
    f.details.items[0].price='0.50'
    await assert.rejects(f.provider.reconcile(f.order),/SERVICE_PROVIDER_MISMATCH/)
  })
  test('refund event reference is verified through the refund transaction before the original order', async () => {
    const f=fixture(); await f.ready()
    const merchantRefundId='merchant-refund-42'
    const refund={ id:'88888888-8888-4888-8888-888888888888', type:'TRT_REFUND',
      merchantTransactionId:merchantRefundId, originMerchantTransactionId:orderId,
      currency:'EUR',amount:'20.00',status:'ACCEPTED' }
    const purchase=f.details
    const apiCalls=[]
    const provider=createZenCommerceProvider(config,{fetcher:async(url) => {
      apiCalls.push(url)
      return new Response(JSON.stringify(url.includes(merchantRefundId) ? refund : purchase),{status:200})
    }})
    const event=verifyZenIpnPayload(fakeIpn({
      type:'TRT_REFUND',merchantTransactionId:merchantRefundId,
      originMerchantTransactionId:orderId, amount:'20.00',
    }),secret)
    const reference=await provider.eventReference(event)
    assert.equal(reference.orderId,orderId)
    assert.equal(reference.customerId,f.order.customerId)
    assert.equal(apiCalls.length,2)
    refund.originMerchantTransactionId='99999999-9999-4999-8999-999999999999'
    await assert.rejects(provider.eventReference(event),/SERVICE_PROVIDER_MISMATCH/)
  })
  test('ZEN 404 on initiated checkout fails closed rather than permitting duplicate charge', async () => {
    const f=fixture()
    assert.equal(await f.provider.findCheckout(f.order),null)
    await assert.rejects(f.provider.reconcile(f.order),/SERVICE_RECONCILIATION_REQUIRED/)
    assert.equal(f.calls.filter(x=>x.options.method==='POST').length,0)
  })
}
