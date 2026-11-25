import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

if (!process.execArgv.includes('--conditions=react-server')) {
  test('commerce repository guard suite (mock SQL transport)', () => {
    const result = spawnSync(process.execPath, ['--conditions=react-server', '--test', fileURLToPath(import.meta.url)], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stdout + result.stderr)
  })
} else {
  const { commerceStore } = await import('../lib/commerce/repository.js')
  const owner='11111111-1111-4111-8111-111111111111', id='33333333-3333-4333-8333-333333333333'
  function fixture(status='open') {
    const row={id,operation_id:'44444444-4444-4444-8444-444444444444',customer_id:'cus_owner',cart_hash:'abc',items:[{serviceId:'express-consultation-30',quantity:1,amountMinor:5000,currency:'EUR'}],currency:'EUR',total_minor:5000,locale:'ru',checkout_origin:'https://holistic.example',provider_prices:{'express-consultation-30':'price_30'},status,fulfillment_status:status==='refunded'?'on_hold':'awaiting_payment',refund_status:status==='refunded'?'full':'none',refunded_minor:status==='refunded'?5000:0,provider_checkout_id:'cs_test_order',payment_intent_id:'pi_order',invoice_id:null,checkout_url:'https://checkout.stripe.com/c/pay/order',expires_at:new Date(),created_at:new Date(),updated_at:new Date()}
    const calls=[]
    const db={query:async(sql,args)=>{calls.push({sql,args});return {rows:[row]}}}
    return {row,calls,store:commerceStore(db,owner,'stripe','sandbox')}
  }
  test('order lookups always bind owner, provider, environment and UUID',async()=>{
    const f=fixture();await f.store.getServiceOrder(id)
    assert.deepEqual(f.calls[0].args,[owner,'stripe','sandbox',id])
    assert.match(f.calls[0].sql,/owner_id=\$1 and provider=\$2 and environment=\$3 and id=\$4 for update/)
    await assert.rejects(f.store.getServiceOrder('malformed'),/INVALID_ID/)
  })
  test('payment references cannot change an existing checkout or payment intent',async()=>{
    const f=fixture()
    await assert.rejects(f.store.saveServicePayment(id,{providerCheckoutId:'cs_other',paymentIntentId:'pi_order',status:'paid'}),/SERVICE_ORDER_CONFLICT/)
    await assert.rejects(f.store.saveServicePayment(id,{providerCheckoutId:'cs_test_order',paymentIntentId:'pi_other',status:'paid'}),/SERVICE_ORDER_CONFLICT/)
    assert.ok(f.calls.every(({sql})=>!sql.startsWith('update')))
  })
  test('refund and dispute holds cannot be cleared by a later paid snapshot',async()=>{
    for(const status of ['refunded','disputed','payment_review']){
      const f=fixture(status)
      const result=await f.store.saveServicePayment(id,{providerCheckoutId:'cs_test_order',paymentIntentId:'pi_order',status:'paid',refundedMinor:0})
      assert.equal(result.status,status)
      assert.ok(f.calls.every(({sql})=>!sql.startsWith('update')))
    }
  })
  test('paid evidence cannot regress to unpaid or reduce cumulative refunded amount',async()=>{
    const f=fixture('paid');f.row.refunded_minor=1000
    for(const snapshot of [{status:'processing',refundedMinor:0},{status:'payment_review',refundedMinor:0}]){
      await f.store.saveServicePayment(id,{providerCheckoutId:'cs_test_order',paymentIntentId:'pi_order',...snapshot})
    }
    assert.ok(f.calls.every(({sql})=>!sql.startsWith('update')))
  })
  test('schema is an execution-guarded proposal with billing-only grants, forced scope RLS and no health cascade',()=>{
    const sql=readFileSync(new URL('../docs/billing/proposed-service-commerce-schema.sql',import.meta.url),'utf8')
    assert.match(sql,/RAISE EXCEPTION 'UNAPPLIED SERVICE COMMERCE PROPOSAL/)
    assert.match(sql,/FORCE ROW LEVEL SECURITY/)
    for(const scope of ['hh.billing_owner','hh.billing_provider','hh.billing_environment']) assert.ok(sql.includes(scope))
    assert.match(sql,/REVOKE ALL ON billing_private.service_orders FROM PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox/)
    assert.match(sql,/GRANT SELECT,INSERT,UPDATE ON billing_private.service_orders TO hh_billing_backend/)
    assert.match(sql,/WHERE status IN \('pending','open','processing'\)/)
    assert.doesNotMatch(sql,/ON DELETE CASCADE|GRANT .* ON app\./)
  })
}
