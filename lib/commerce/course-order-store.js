import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError} from '../assessments/contracts.js'
import {transaction} from '../app/database.js'
import {operationHash,seal,openSealed} from '../app/crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {verifiedReikiGoogleEmail} from '../academy/reiki-registration-proof.mjs'
import {courseCheckoutEnabled,quoteCourseCart,COURSE_CHECKOUT_NOTICE} from './course-cart.mjs'
import {PERSONAL_PAYPAL_ME_BASE} from './paypal-personal.js'
import {courseReceiptReference,coursePurchaseView,courseReviewPlan,courseReviewEnabled} from './course-payment-lifecycle.mjs'
import {requireUUID,onlyKeys} from '../assessments/contracts.js'

export async function prepareCourseOrder(config,actor,identities,input,{transact=transaction,env=process.env}={}){
 if(!courseCheckoutEnabled(env))throw new AppError('COURSE_CHECKOUT_UNAVAILABLE',503)
 let cart
 try{cart=quoteCourseCart(input.items,input.locale)}catch{throw new AppError('COURSE_NOT_FOR_SALE',400)}
 const email=verifiedReikiGoogleEmail(actor,identities)
 if(!email||input.confirmed!==true)throw new AppError('VERIFIED_GOOGLE_REQUIRED',403)
 const fingerprint=operationHash({scope:'course-checkout-v1',account:actor.id,items:cart.items.map(({id,amountMinor})=>({id,amountMinor})),currency:cart.currency},config)
 return transact(config,actor,async db=>{
  const account=(await db.query('select status,onboarding_state from app.accounts where id=$1 for update',[actor.id])).rows[0]
  if(account?.status!=='active'||account.onboarding_state!=='active')throw new AppError('CONSENT_REQUIRED',403)
  const prior=(await db.query("select o.id,o.items,o.currency,o.total_minor,o.status,o.revision,o.created_at,exists(select 1 from app_private.course_purchase_receipts r where r.order_id=o.id) as receipt_submitted from app_private.course_purchase_orders o where o.account_id=$1 and o.cart_hash=$2 and o.status in ('awaiting_payment','paid','payment_review') order by o.created_at desc limit 1",[actor.id,fingerprint])).rows[0]
  // Never automatically provide a second payment URL for an existing order.
  if(prior)return {order:coursePurchaseView(prior),redirectUrl:null}
  const owner=(await db.query("select trusted_auth_user_id as id from app.practitioners where id=$1 and active and public_profile<>'{}'::jsonb and status in ('approved','submitted','changes_requested') and trusted_auth_user_id is not null",[PRACTITIONER_ID])).rows[0]?.id
  if(!owner)throw new AppError('COURSE_CHECKOUT_UNAVAILABLE',503)
  const emailHash=operationHash({scope:'crm-email',owner,email},config)
  await db.query("select set_config('hh.course_checkout_hash',$1,true)",[emailHash])
  const contactId=randomUUID()
  const encrypted=seal({displayName:String(actor.displayName||'').trim().slice(0,120)||email,email,phone:'',registration:{noticeVersion:COURSE_CHECKOUT_NOTICE}}, {accountId:owner,recordId:contactId,field:'crm.contact'},config)
  await db.query("insert into app.crm_contacts(id,owner_id,contact_ciphertext,email_hash,locale,lifecycle,source) values($1,$2,$3,$4,$5,'lead','academy') on conflict(owner_id,email_hash) do nothing",[contactId,owner,encrypted,emailHash,input.locale])
  const contact=(await db.query('select id from app.crm_contacts where owner_id=$1 and email_hash=$2',[owner,emailHash])).rows[0]
  if(!contact)throw new AppError('CRM_LINK_FAILED',503)
  const id=randomUUID()
  await db.query("insert into app_private.course_purchase_orders(id,account_id,owner_id,contact_id,cart_hash,items,currency,total_minor,locale,notice_version) values($1,$2,$3,$4,$5,$6::jsonb,'EUR',$7,$8,$9)",
   [id,actor.id,owner,contact.id,fingerprint,JSON.stringify(cart.items.map(({id,amountMinor})=>({id,amountMinor}))),cart.totalMinor,input.locale,COURSE_CHECKOUT_NOTICE])
  return {order:{id,items:cart.items.map(({id,amountMinor})=>({id,amountMinor})),currency:'EUR',status:'awaiting_payment',totalMinor:cart.totalMinor,revision:0},redirectUrl:payPalUrl(cart.totalMinor)}
 })
}
function payPalUrl(minor){
 if(!Number.isSafeInteger(minor)||minor<=0)throw new AppError('INVALID_COURSE_CART',400)
 const whole=Math.floor(minor/100), cents=minor%100
 return PERSONAL_PAYPAL_ME_BASE+'/'+whole+(cents?'.'+String(cents).padStart(2,'0'):'')+'EUR'
}

const receiptContext=(owner,order)=>({accountId:owner,recordId:order,field:'course.purchase.receipt'})
const receiptDigest=(config,reference)=>operationHash({scope:'course-paypal-reference-v1',reference},config)
function requireSchema(env=process.env){if(env.HH_COURSE_CHECKOUT_SCHEMA_APPROVED!=='true')throw new AppError('COURSE_CHECKOUT_UNAVAILABLE',503)}
export async function listCoursePurchases(config,actor,{transact=transaction,env=process.env}={}){
 requireSchema(env)
 return transact(config,actor,async db=>({orders:(await db.query("select o.id,o.items,o.currency,o.total_minor,o.status,o.revision,o.created_at,exists(select 1 from app_private.course_purchase_receipts r where r.order_id=o.id) as receipt_submitted from app_private.course_purchase_orders o where o.account_id=$1 order by o.created_at desc limit 30",[actor.id])).rows.map(coursePurchaseView)}))
}
export async function submitCourseReceipt(config,actor,input,{transact=transaction,env=process.env}={}){
 requireSchema(env);onlyKeys(input,['orderId','reference'])
 const id=requireUUID(input.orderId)
 let reference;try{reference=courseReceiptReference(input.reference)}catch{throw new AppError('INVALID_RECEIPT',400)}
 return transact(config,actor,async db=>{
  // Serialize against duplicate buyer actions without granting buyer order UPDATE.
  const account=(await db.query('select status,onboarding_state from app.accounts where id=$1 for update',[actor.id])).rows[0]
  if(account?.status!=='active'||account.onboarding_state!=='active')throw new AppError('ACCOUNT_UNAVAILABLE',403)
  const row=(await db.query("select id,account_id,owner_id,status from app_private.course_purchase_orders where id=$1 and account_id=$2",[id,actor.id])).rows[0]
  if(!row||row.status!=='awaiting_payment')throw new AppError('ORDER_NOT_PENDING',409)
  const digest=receiptDigest(config,reference)
  const prior=(await db.query('select reference_digest from app_private.course_purchase_receipts where order_id=$1 and account_id=$2',[id,actor.id])).rows[0]
  if(prior&&prior.reference_digest!==digest)throw new AppError('RECEIPT_ALREADY_SUBMITTED',409)
  if(!prior)await db.query('insert into app_private.course_purchase_receipts(order_id,account_id,reference_digest,reference_ciphertext) values($1,$2,$3,$4)',[id,actor.id,digest,seal({reference},receiptContext(row.owner_id,id),config)])
  return {id,status:'receipt_submitted'}
 })
}
export async function listCourseReview(config,actor,{transact=transaction,env=process.env}={}){
 if(!courseReviewEnabled(env))throw new AppError('COURSE_REVIEW_UNAVAILABLE',503)
 return transact(config,actor,async db=>{
  const rows=(await db.query("select o.id,o.items,o.currency,o.total_minor,o.status,o.revision,o.created_at,o.contact_id,o.account_id,r.reference_ciphertext from app_private.course_purchase_orders o left join app_private.course_purchase_receipts r on r.order_id=o.id where o.owner_id=$1 order by o.created_at desc limit 60",[actor.id])).rows
  return {orders:rows.map(row=>({...coursePurchaseView({...row,receipt_submitted:!!row.reference_ciphertext}),accountId:row.account_id,contactId:row.contact_id,claimedReference:row.reference_ciphertext?openSealed(row.reference_ciphertext,receiptContext(actor.id,row.id),config).reference:null})),verificationEnabled:courseCheckoutEnabled(env)}
 },{moderator:true})
}
export async function reviewCoursePurchase(config,actor,input,{transact=transaction,env=process.env}={}){
 if(!courseReviewEnabled(env))throw new AppError('COURSE_REVIEW_UNAVAILABLE',503)
 // No acceptance while the real course-entitlement integration is not approved.
 if(input?.action==='verify'&&!courseCheckoutEnabled(env))throw new AppError('COURSE_FULFILLMENT_UNAVAILABLE',503)
 const id=requireUUID(input.orderId)
 return transact(config,actor,async db=>{
  const row=(await db.query("select id,items,currency,total_minor,status,revision,created_at,verified_receipt_digest from app_private.course_purchase_orders where id=$1 and owner_id=$2 for update",[id,actor.id])).rows[0]
  if(!row)throw new AppError('ORDER_NOT_FOUND',404)
  let plan;try{plan=courseReviewPlan(row,input)}catch{throw new AppError('INVALID_PAYMENT_REVIEW',409)}
  const digest=receiptDigest(config,plan.reference)
  if(plan.status==='refunded'&&digest===row.verified_receipt_digest)throw new AppError('REFUND_REFERENCE_DUPLICATE',409)
  // Unique verified references across this course ledger. An independent
  // merchant statement, not a browser claim, is required for either transition.
  await db.query('insert into app_private.course_purchase_verified_references(reference_digest,order_id,owner_id,kind) values($1,$2,$3,$4)',[digest,id,actor.id,plan.status])
  const updated=(await db.query("update app_private.course_purchase_orders set status=$3,revision=revision+1,verified_receipt_digest=case when $3='paid' then $4 else verified_receipt_digest end,reviewed_at=now() where id=$1 and owner_id=$2 returning id,items,currency,total_minor,status,revision,created_at",[id,actor.id,plan.status,digest])).rows[0]
  return {order:coursePurchaseView(updated)}
 },{moderator:true})
}
