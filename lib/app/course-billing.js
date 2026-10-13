import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { transaction } from './database.js'
import { AppError } from '../assessments/contracts.js'
import { PAID_COURSE_TIERS } from '../inner-growth/course-plans.js'

function error(code,status=503){throw new AppError(code,status)}
const prices=()=>({
  start:process.env.HH_STRIPE_PRICE_START,
  advanced:process.env.HH_STRIPE_PRICE_ADVANCED,
  premium:process.env.HH_STRIPE_PRICE_PREMIUM,
})
function key(){
  const secret=process.env.HH_STRIPE_SECRET_KEY||''
  if(!/^sk_(test|live)_[A-Za-z0-9]+$/.test(secret))error('CHECKOUT_UNAVAILABLE')
  if(process.env.VERCEL_ENV==='production'&&!secret.startsWith('sk_live_'))
    error('LIVE_BILLING_NOT_CONFIGURED')
  return secret
}
async function stripePost(endpoint,params){
  const response=await fetch('https://api.stripe.com/v1/'+endpoint,{
    method:'POST',headers:{
      Authorization:'Bearer '+key(),
      'Content-Type':'application/x-www-form-urlencoded',
    },
    body:new URLSearchParams(params).toString(),cache:'no-store',signal:AbortSignal.timeout(12000),
  })
  const data=await response.json().catch(()=>({}))
  if(!response.ok||typeof data.url!=='string'||!data.url.startsWith('https://'))
    error('PAYMENT_PROVIDER_UNAVAILABLE')
  const host=new URL(data.url).hostname
  if(!['checkout.stripe.com','billing.stripe.com'].includes(host)&&!host.endsWith('.stripe.com'))
    error('PAYMENT_PROVIDER_UNAVAILABLE')
  return data.url
}
function localePath(origin,locale){
  return origin+'/'+(locale==='ru'?'ru':'en')+'/app/course'
}
export async function createCourseCheckout(config,actor,{tier,locale},origin){
  if(!PAID_COURSE_TIERS.includes(tier))error('INVALID_BILLING_PLAN',400)
  const price=prices()[tier]
  if(!/^price_[A-Za-z0-9]+$/.test(price||''))error('CHECKOUT_UNAVAILABLE')
  const existing=await transaction(config,actor,async(db)=>{
    const account=(await db.query(
      'select stripe_customer_id,stripe_subscription_id,stripe_status,current_period_end from app_private.course_billing where account_id=$1',
      [actor.id],
    )).rows[0]
    return account||{}
  })
  const redirect=localePath(origin,locale)
  if(existing.stripe_customer_id&&existing.stripe_subscription_id &&
     ['active','trialing','past_due'].includes(existing.stripe_status)){
    return {url:await stripePost('billing_portal/sessions',{
      customer:existing.stripe_customer_id,return_url:redirect,
    }),type:'portal'}
  }
  const params={
    mode:'subscription',
    'line_items[0][price]':price,
    'line_items[0][quantity]':'1',
    'client_reference_id':actor.id,
    'subscription_data[metadata][hh_account_id]':actor.id,
    'metadata[hh_account_id]':actor.id,
    'metadata[hh_plan]':tier,
    'success_url':redirect+'?checkout=returned',
    'cancel_url':redirect+'?checkout=cancelled',
  }
  if(existing.stripe_customer_id)params.customer=existing.stripe_customer_id
  return {url:await stripePost('checkout/sessions',params),type:'checkout'}
}
export function verifyStripeSignature(payload,header,secret,now=Math.floor(Date.now()/1000)){
  if(typeof payload!=='string'||typeof header!=='string'||!secret||payload.length>2000000)return false
  const kv=header.split(',').map(v=>v.trim().split('='))
  const timestamp=kv.find(([k])=>k==='t')?.[1]
  const signatures=kv.filter(([k,v])=>k==='v1'&&/^[a-f0-9]{64}$/i.test(v||'')).map(([,v])=>v)
  if(!timestamp||!/^\d{9,12}$/.test(timestamp)||Math.abs(Number(timestamp)-now)>300||!signatures.length)return false
  const expected=createHmac('sha256',secret).update(timestamp+'.'+payload,'utf8').digest()
  return signatures.some(signature=>timingSafeEqual(expected,Buffer.from(signature,'hex')))
}
const validUuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
export async function syncCourseStripeWebhook(config,event){
  if(!event||!/^evt_[A-Za-z0-9_]+$/.test(event.id||'') ||
      !Number.isSafeInteger(event.created)||event.created<1) error('INVALID_PAYMENT_EVENT',400)
  if(!['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type))
    return {ignored:true}
  const subscription=event.data?.object
  const accountId=subscription?.metadata?.hh_account_id
  if(!validUuid.test(accountId||'')||!/^sub_[A-Za-z0-9_]+$/.test(subscription.id||''))
    error('INVALID_PAYMENT_EVENT',400)
  const price=subscription.items?.data?.[0]?.price?.id || null
  const tier=Object.entries(prices()).find(([,value])=>value && value===price)?.[0] || 'free'
  const status=event.type==='customer.subscription.deleted'?'canceled':subscription.status
  const acceptable=new Set(['active','trialing','past_due','unpaid','canceled','incomplete','incomplete_expired','paused','inactive'])
  if(!acceptable.has(status))error('INVALID_PAYMENT_EVENT',400)
  const customer=typeof subscription.customer==='string'?subscription.customer:subscription.customer?.id
  if(!/^cus_[A-Za-z0-9_]+$/.test(customer||''))error('INVALID_PAYMENT_EVENT',400)
  const period=subscription.items?.data?.[0]?.current_period_end || subscription.current_period_end
  const periodEnd=Number.isSafeInteger(period)&&period>0 ? new Date(period*1000).toISOString() : null
  // The database function has no public grants and scopes its effects to this
  // signature-validated account; all ordinary user tables retain owner RLS.
  const applied=await transaction(config,null,async db=>{
    const row=(await db.query(
      'select app_private.apply_course_billing_event($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) as applied',
      [accountId,event.id,event.type,event.created,tier,status,customer,subscription.id,price,periodEnd,
       subscription.cancel_at_period_end===true],
    )).rows[0]
    return row?.applied===true
  },{server:true})
  return {applied}
}
