import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {clarityApprovedRepeatPrice,verifyClarityRepeatPayment,CLARITY_REPEAT_SKU} from '../lib/coaching/clarity-repeat-payment.mjs'
const ownerId='10000000-0000-4000-8000-000000000001',orderId='10000000-0000-4000-8000-000000000002'
const price={amountMinor:900,currency:'EUR'} // synthetic fixture, NOT an approved product price
const context={ownerId,orderId,provider:'paypal',environment:'sandbox',price}
const item={serviceId:CLARITY_REPEAT_SKU,quantity:1,amountMinor:900,currency:'EUR'}
const order={id:orderId,status:'paid',refundStatus:'none',refundedMinor:0,providerCheckoutId:'order-1',paymentIntentId:'capture-1',items:[item],currency:'EUR',totalMinor:900}
test('no price is invented or enabled without explicit owner configuration',()=>{
 assert.equal(clarityApprovedRepeatPrice({}),null)
 for(const amount of ['0','-1','9.99','1e3','0009','100000000',900])assert.equal(clarityApprovedRepeatPrice({HH_CLARITY_REPEAT_PRICE_APPROVED:'true',HH_CLARITY_REPEAT_PRICE_MINOR:amount}),null)
 assert.equal(clarityApprovedRepeatPrice({HH_CLARITY_REPEAT_PRICE_MINOR:'900'}),null)
 assert.deepEqual(clarityApprovedRepeatPrice({HH_CLARITY_REPEAT_PRICE_APPROVED:'true',HH_CLARITY_REPEAT_PRICE_MINOR:'900'}),price)
})
test('only one exact captured PayPal repeat product with zero refund qualifies',()=>{
 assert.deepEqual(verifyClarityRepeatPayment(order,context),{accountId:ownerId,id:orderId,provider:'paypal',environment:'sandbox',sku:CLARITY_REPEAT_SKU,status:'settled',...price})
 for(const status of ['open','pending','processing','refunded','disputed','payment_review','failed','settled'])assert.throws(()=>verifyClarityRepeatPayment({...order,status},context),/NOT_SETTLED/)
 for(const change of [{refundStatus:'partial'},{refundedMinor:1},{providerCheckoutId:null},{paymentIntentId:null},{id:ownerId}])assert.throws(()=>verifyClarityRepeatPayment({...order,...change},context),/NOT_SETTLED/)
 for(const change of [{currency:'CAD'},{totalMinor:1},{items:[item,item]},{items:[]},{items:[{...item,serviceId:'personal-session-60'}]},{items:[{...item,quantity:2}]},{items:[{...item,amountMinor:1}]},{items:[{...item,currency:'USD'}]}])assert.throws(()=>verifyClarityRepeatPayment({...order,...change},context),/MISMATCH/)
 for(const change of [{ownerId:'unknown'},{orderId:'unverified'},{provider:'stripe'},{environment:'other'},{price:null},{price:{amountMinor:0,currency:'EUR'}}])assert.throws(()=>verifyClarityRepeatPayment(order,{...context,...change}),/CONFIG_INVALID/)
})
test('private adapter obtains order from canonical owner repository, and grant stays gated',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 const adapter=read('lib/app/clarity-repeat-payment.js'),store=read('lib/app/clarity-course-runs.js')
 assert.match(adapter,/import 'server-only'/)
 assert.match(adapter,/repository.withOwner\(actor,async store=>/)
 assert.match(adapter,/await store.getServiceOrder\(orderId\)/)
 assert.match(adapter,/commerce.environment!==config.billingEnvironment/)
 assert.match(store,/VERIFIED_CHECKOUT_ADAPTER_READY=false/)
 assert.match(store,/await readVerifiedClarityRepeatPayment\(config,actor,orderId\)/)
})
