import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError} from '../assessments/contracts.js'
import {transaction} from '../app/database.js'
import {operationHash,seal} from '../app/crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {verifiedReikiGoogleEmail} from '../academy/reiki-registration-proof.mjs'
import {courseCheckoutEnabled,quoteCourseCart,COURSE_CHECKOUT_NOTICE} from './course-cart.mjs'
import {PERSONAL_PAYPAL_ME_BASE} from './paypal-personal.js'

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
  const prior=(await db.query('select id,total_minor,status from app_private.course_purchase_orders where account_id=$1 and cart_hash=$2 and status in (\'awaiting_payment\',\'receipt_submitted\')',[actor.id,fingerprint])).rows[0]
  if(prior)return {order:{id:prior.id,status:prior.status,totalMinor:Number(prior.total_minor)},redirectUrl:payPalUrl(Number(prior.total_minor))}
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
  return {order:{id,status:'awaiting_payment',totalMinor:cart.totalMinor},redirectUrl:payPalUrl(cart.totalMinor)}
 })
}
function payPalUrl(minor){
 if(!Number.isSafeInteger(minor)||minor<=0)throw new AppError('INVALID_COURSE_CART',400)
 const whole=Math.floor(minor/100), cents=minor%100
 return PERSONAL_PAYPAL_ME_BASE+'/'+whole+(cents?'.'+String(cents).padStart(2,'0'):'')+'EUR'
}
