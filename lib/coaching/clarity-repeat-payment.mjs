// Only a committed server-read PayPal order may become a paid repeat-course
// candidate. No client return URL, screenshot, claimed status or price grants access.
export const CLARITY_REPEAT_SKU='clarity-express-repeat'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const providerRef=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v)
const fail=code=>{throw Error(code)}
export function clarityApprovedRepeatPrice(env={}){
 if(env.HH_CLARITY_REPEAT_PRICE_APPROVED!=='true'||typeof env.HH_CLARITY_REPEAT_PRICE_MINOR!=='string'||!/^[1-9][0-9]{0,7}$/.test(env.HH_CLARITY_REPEAT_PRICE_MINOR))return null
 const amountMinor=Number(env.HH_CLARITY_REPEAT_PRICE_MINOR)
 return {amountMinor,currency:'EUR'}
}
export function verifyClarityRepeatPayment(order,{ownerId,orderId,provider,environment,price}={}){
 if(!uuid.test(ownerId||'')||!uuid.test(orderId||'')||provider!=='paypal'||!['sandbox','live'].includes(environment)||!Number.isSafeInteger(price?.amountMinor)||price.amountMinor<=0||price.currency!=='EUR')fail('CLARITY_PAYMENT_CONFIG_INVALID')
 if(!order||order.id!==orderId||order.status!=='paid'||order.refundStatus!=='none'||order.refundedMinor!==0||!providerRef(order.providerCheckoutId)||!providerRef(order.paymentIntentId))fail('CLARITY_PAYMENT_NOT_SETTLED')
 if(order.currency!==price.currency||order.totalMinor!==price.amountMinor||!Array.isArray(order.items)||order.items.length!==1)fail('CLARITY_PAYMENT_MISMATCH')
 const item=order.items[0]
 if(item?.serviceId!==CLARITY_REPEAT_SKU||item.quantity!==1||item.amountMinor!==price.amountMinor||item.currency!==price.currency)fail('CLARITY_PAYMENT_MISMATCH')
 return Object.freeze({accountId:ownerId,id:orderId,provider,environment,sku:CLARITY_REPEAT_SKU,status:'settled',amountMinor:price.amountMinor,currency:price.currency})
}
