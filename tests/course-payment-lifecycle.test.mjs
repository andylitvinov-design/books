import test from 'node:test'
import assert from 'node:assert/strict'
import {courseReceiptReference,coursePurchaseView,courseReviewPlan,courseReviewEnabled} from '../lib/commerce/course-payment-lifecycle.mjs'
const order={id:'b1738a0d-0742-42ab-91b0-52c7280131ed',status:'awaiting_payment',currency:'EUR',total_minor:1990,revision:0}
const input={orderId:order.id,action:'verify',expectedRevision:0,amountMinor:1990,currency:'EUR',reference:'AB12cd3456',source:'paypal_statement',confirmed:true}
test('buyer claim is not payment confirmation',()=>{
 assert.equal(coursePurchaseView({...order,receipt_submitted:true}).status,'receipt_submitted')
 assert.equal(coursePurchaseView({...order,status:'paid',receipt_submitted:true}).status,'paid')
 assert.equal(courseReceiptReference(' ab12cd3456 '),'AB12CD3456')
 assert.throws(()=>courseReceiptReference('a b c'))
})
test('review requires independent statement, exact amount, currency, revision and order',()=>{
 assert.deepEqual(courseReviewPlan(order,input),{status:'paid',reference:'AB12CD3456'})
 for(const change of [{confirmed:false},{source:'customer_screenshot'},{amountMinor:1900},{currency:'USD'},{expectedRevision:1},{orderId:'unknown'},{paid:true}])assert.throws(()=>courseReviewPlan(order,{...input,...change}))
 assert.throws(()=>courseReviewPlan({...order,status:'paid'},input))
})
test('refund only from paid and separate review approval',()=>{
 assert.throws(()=>courseReviewPlan(order,{...input,action:'refund'}))
 assert.equal(courseReviewPlan({...order,status:'paid'},{...input,action:'refund'}).status,'refunded')
 assert.equal(courseReviewEnabled({HH_COURSE_CHECKOUT_SCHEMA_APPROVED:'true'}),false)
 assert.equal(courseReviewEnabled({HH_COURSE_CHECKOUT_SCHEMA_APPROVED:'true',HH_COURSE_PAYPAL_REVIEW_APPROVED:'true'}),true)
})
