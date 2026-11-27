// Pure rules for a manual PayPal.Me payment. A buyer reference is a claim only.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function courseReceiptReference(raw){
 if(typeof raw!=='string'||! /^[A-Za-z0-9][A-Za-z0-9_.:/-]{5,119}$/.test(raw.trim()))throw Error('INVALID_RECEIPT')
 return raw.trim().toUpperCase()
}
export function coursePurchaseView(row){
 return {id:row.id,items:row.items,currency:row.currency,totalMinor:Number(row.total_minor),status:row.status==='awaiting_payment'&&row.receipt_submitted?'receipt_submitted':row.status,revision:row.revision,createdAt:row.created_at}
}
export function courseReviewPlan(order,input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['orderId','action','expectedRevision','amountMinor','currency','reference','source','confirmed'].includes(k)))throw Error('INVALID_REVIEW')
 if(!UUID.test(input.orderId)||input.orderId!==order.id||input.confirmed!==true||input.source!=='paypal_statement'||input.currency!=='EUR'||order.currency!=='EUR'||!Number.isSafeInteger(input.amountMinor)||input.amountMinor!==Number(order.total_minor)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision!==order.revision)throw Error('REVIEW_MISMATCH')
 const reference=courseReceiptReference(input.reference)
 if(input.action==='verify'&&order.status==='awaiting_payment')return {status:'paid',reference}
 if(input.action==='refund'&&order.status==='paid')return {status:'refunded',reference}
 throw Error('INVALID_REVIEW_TRANSITION')
}
export function courseReviewEnabled(env=process.env){
 return env.HH_COURSE_CHECKOUT_SCHEMA_APPROVED==='true'&&env.HH_COURSE_PAYPAL_REVIEW_APPROVED==='true'
}
