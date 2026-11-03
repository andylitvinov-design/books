import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

if (!process.execArgv.includes('--conditions=react-server')) {
  test('Stripe service adapter security suite (isolated mocked provider)', () => {
    const result = spawnSync(process.execPath, ['--conditions=react-server', '--test', fileURLToPath(import.meta.url)], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stdout + result.stderr)
  })
} else {
  const { createStripeCommerceProvider } = await import('../lib/commerce/stripe-provider.js')
  const config = { configured: true, enabled: true, provider: 'stripe', environment: 'sandbox', accountId: 'acct_synthetic', prices: { 'express-consultation-30':'price_30' } }
  const order = { id:'33333333-3333-4333-8333-333333333333',customerId:'cus_synthetic',locale:'ru',currency:'EUR',totalMinor:5000,
    items:[{serviceId:'express-consultation-30',quantity:1,amountMinor:5000,currency:'EUR'}],providerPrices:{'express-consultation-30':'price_30'},
    providerCheckoutId:'cs_test_service',createdAt:'2026-10-13T12:00:00Z',expiresAt:'2026-10-13T13:00:00Z' }
  function fixture() {
    const price={id:'price_30',livemode:false,active:true,type:'one_time',currency:'eur',unit_amount:5000,recurring:null,billing_scheme:'per_unit'}
    const session={id:'cs_test_service',livemode:false,mode:'payment',customer:'cus_synthetic',amount_total:5000,currency:'eur',metadata:{hh_service_order_id:order.id},status:'complete',payment_status:'paid',payment_intent:'pi_synthetic',total_details:{amount_discount:0,amount_shipping:0},url:'https://checkout.stripe.com/c/pay/synthetic'}
    const charge={id:'ch_synthetic',livemode:false,paid:true,captured:true,status:'succeeded',customer:'cus_synthetic',payment_intent:'pi_synthetic',currency:'eur',amount:5000,amount_captured:5000,amount_refunded:0,disputed:false}
    const intent={id:'pi_synthetic',livemode:false,status:'succeeded',customer:'cus_synthetic',amount:5000,amount_received:5000,currency:'eur',latest_charge:charge}
    const lines={has_more:false,data:[{price,quantity:1,amount_total:5000}]}
    const sessions={has_more:false,data:[]}
    const calls=[]
    const merchant={id:'acct_synthetic'}
    const client={
      accounts:{retrieve:async()=>merchant},
      customers:{create:async()=>({id:'cus_synthetic',livemode:false})},
      prices:{retrieve:async()=>price},
      checkout:{sessions:{create:async(body,options)=>{calls.push({body,options});return session},retrieve:async()=>session,listLineItems:async()=>lines,list:async(query)=>{calls.push({lookup:query});return sessions}}},
      paymentIntents:{retrieve:async()=>intent},charges:{retrieve:async()=>charge},
      invoices:{retrieve:async()=>({id:'in_synthetic',livemode:false,customer:'cus_synthetic',currency:'eur',total:5000})},
    }
    return {provider:createStripeCommerceProvider(config,{client}),price,session,charge,intent,lines,calls,merchant,sessions}
  }
  test('one-time checkout submits verified server price IDs, frozen expiry and opaque order metadata only',async()=>{
    const f=fixture(); await f.provider.checkout({order,origin:'https://holistic.example'})
    const {body,options}=f.calls[0]
    assert.equal(body.mode,'payment');assert.deepEqual(body.line_items,[{price:'price_30',quantity:1}])
    assert.deepEqual(body.metadata,{hh_service_order_id:order.id})
    assert.equal(body.expires_at,Date.parse(order.expiresAt)/1000)
    assert.equal(body.payment_method_types,undefined);assert.equal(body.price_data,undefined);assert.equal(body.allow_promotion_codes,undefined)
    assert.match(options.idempotencyKey,/service-checkout/)
    assert.match(body.success_url,/serviceOrder=33333333/)
  })
  test('configured merchant must match the account actually owning the provider key',async()=>{
    const f=fixture();f.merchant.id='acct_other'
    await assert.rejects(f.provider.createCustomer('owner'),/SERVICE_PROVIDER_MISMATCH/)
    await assert.rejects(f.provider.checkout({order,origin:'https://holistic.example'}),/SERVICE_PROVIDER_MISMATCH/)
    await assert.rejects(f.provider.reconcile(order),/SERVICE_PROVIDER_MISMATCH/)
    assert.equal(f.calls.length,0)
  })
  test('recurring, wrong-currency, wrong-amount, transformed and inactive provider prices are refused before create',async()=>{
    for(const patch of [{type:'recurring'},{currency:'usd'},{unit_amount:1},{transform_quantity:{}},{active:false},{recurring:{interval:'month'}}]){
      const f=fixture();Object.assign(f.price,patch)
      await assert.rejects(f.provider.checkout({order,origin:'https://holistic.example'}),/SERVICE_PROVIDER_MISMATCH/)
      assert.equal(f.calls.length,0)
    }
  })
  test('authoritative paid session + exact lines + succeeded intent/captured charge are required',async()=>{
    const f=fixture();const paid=await f.provider.reconcile(order)
    assert.equal(paid.status,'paid');assert.equal(paid.paymentIntentId,'pi_synthetic')
    f.session.payment_status='unpaid';f.intent.status='processing'
    assert.equal((await f.provider.reconcile(order)).status,'processing')
  })
  test('mismatched owner, scope, total, line quantities and live mode cannot confirm payment',async()=>{
    for(const [target,patch] of [['session',{customer:'cus_other'}],['session',{amount_total:1}],['session',{mode:'subscription'}],['session',{livemode:true}],['charge',{customer:'cus_other'}],['charge',{amount_captured:100}],['intent',{amount_received:1}]]){
      const f=fixture();Object.assign(f[target],patch);await assert.rejects(f.provider.reconcile(order),/SERVICE_PROVIDER_MISMATCH/)
    }
    const f=fixture();f.lines.data[0].quantity=2;await assert.rejects(f.provider.reconcile(order),/SERVICE_PROVIDER_MISMATCH/)
  })
  test('full/partial refunds and disputes produce hold states rather than free fulfilment',async()=>{
    const f=fixture();f.charge.amount_refunded=1000
    assert.equal((await f.provider.reconcile(order)).status,'payment_review')
    f.charge.amount_refunded=5000
    assert.equal((await f.provider.reconcile(order)).status,'refunded')
    f.charge.disputed=true
    assert.equal((await f.provider.reconcile(order)).status,'disputed')
  })
  test('retired prices remain valid for already-purchased orders and invoice ownership is checked',async()=>{
    const f=fixture();f.price.active=false
    assert.equal((await f.provider.reconcile(order)).status,'paid')
    f.session.invoice='in_synthetic'
    assert.equal((await f.provider.reconcile(order)).invoiceId,'in_synthetic')
  })
  test('missing checkout ID recovers by customer, creation window and opaque order metadata',async()=>{
    const f=fixture();f.sessions.data.push(f.session)
    const recovered=await f.provider.findCheckout({...order,providerCheckoutId:null})
    assert.equal(recovered.status,'paid');assert.equal(recovered.providerCheckoutId,'cs_test_service')
    assert.equal(f.calls[0].lookup.customer,order.customerId)
    assert.equal(f.calls[0].lookup.created.gte,Date.parse(order.createdAt)/1000-300)
  })
  test('incomplete or multiple recovery results never confirm absence or create another checkout',async()=>{
    const f=fixture();f.sessions.has_more=true
    await assert.rejects(f.provider.findCheckout(order),/SERVICE_RECONCILIATION_REQUIRED/)
    f.sessions.has_more=false;f.sessions.data=[f.session,{...f.session,id:'cs_second'}]
    await assert.rejects(f.provider.findCheckout(order),/SERVICE_MULTIPLE_CHECKOUTS/)
    f.sessions.data=[];assert.equal(await f.provider.findCheckout(order),null)
    assert.ok(f.calls.every((call)=>!call.body))
  })
  test('provider redirects cannot leave the exact Stripe checkout host',async()=>{
    for(const url of ['http://checkout.stripe.com/x','https://checkout.stripe.com.evil.example/x','https://evil@checkout.stripe.com/x','https://checkout.stripe.com:444/x']){
      const f=fixture();f.session.url=url
      await assert.rejects(f.provider.checkout({order,origin:'https://holistic.example'}),/SERVICE_PROVIDER_MISMATCH/)
    }
  })
  test('only payment sessions and owned refund references enter commerce handling',async()=>{
    const f=fixture();const base={livemode:false,type:'checkout.session.completed',data:{object:f.session}}
    assert.equal((await f.provider.eventReference(base)).orderId,order.id)
    f.session.mode='subscription';assert.equal(await f.provider.eventReference(base),null)
    await assert.rejects(f.provider.eventReference({...base,livemode:true}),/SERVICE_PROVIDER_MISMATCH/)
    assert.equal((await f.provider.eventReference({livemode:false,type:'charge.refunded',data:{object:f.charge}})).paymentIntentId,'pi_synthetic')
  })
}
