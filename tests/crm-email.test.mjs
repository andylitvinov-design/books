import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { getCrmEmailConfig, validateEmailMessage, createEmailToken, makeEmailLink,
 formatVerificationMail,formatMarketingMail,sendResendEmail,safeEmailIdempotency,verifyResendWebhook } from '../lib/crm/email.js'
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const env={ HH_CRM_EMAIL_ENABLED:'true',HH_CRM_EMAIL_PRODUCTION_APPROVED:'true',
 HH_CRM_FROM_EMAIL:'news@holistichouse.example',HH_CRM_VERIFIED_DOMAIN:'holistichouse.example',
 HH_CRM_REPLY_TO:'hello@holistichouse.example',HH_CRM_SENDER_NAME:'Holistic House',
 HH_CRM_POSTAL_ADDRESS:'100 Example Street, Toronto, ON, Canada',
 HH_CRM_RESEND_API_KEY:'re_synthetic',HH_CRM_RESEND_WEBHOOK_SECRET:'whsec_'+randomBytes(32).toString('base64'),
 HH_CRM_SENDER_VERIFIED:'true',VERCEL_ENV:'production' }
test('fail closed without all provider and verified domain controls',()=>{
 assert.equal(getCrmEmailConfig({}).enabled,false)
 assert.equal(getCrmEmailConfig({...env,HH_CRM_EMAIL_PRODUCTION_APPROVED:'false'}).enabled,false)
 assert.equal(getCrmEmailConfig({...env,HH_CRM_FROM_EMAIL:'test@vercel.app',HH_CRM_VERIFIED_DOMAIN:'vercel.app'}).enabled,false)
 assert.equal(getCrmEmailConfig({...env,HH_CRM_SENDER_VERIFIED:'false'}).enabled,false)
 assert.equal(getCrmEmailConfig(env).enabled,true)
})
test('mail messages reject unexpected fields, CRLF and empty bodies',()=>{
 assert.deepEqual(validateEmailMessage({subject:'Hello',body:'Warm hello'}),{subject:'Hello',body:'Warm hello'})
 assert.throws(()=>validateEmailMessage({subject:'Bad\nHeader',body:'Warm hello'}))
 assert.throws(()=>validateEmailMessage({subject:'ok',body:''}))
 assert.throws(()=>validateEmailMessage({subject:'ok',body:'hello',diagnosis:'private'}))
})
test('token links put secrets only in fragment and never in query/path',()=>{
 const {token,digest}=createEmailToken();assert.equal(digest.length,64)
 for(const kind of ['u','v']){const url=new URL(makeEmailLink('en',kind,token));assert.equal(url.search,'');assert.ok(!url.pathname.includes(token));assert.ok(url.hash.endsWith(token))}
 assert.throws(()=>makeEmailLink('en','v','invalid'))
})
test('verification is non-promotional and marketing has sender and unsubscribe',()=>{
 const config=getCrmEmailConfig(env);const {token}=createEmailToken()
 const verify=formatVerificationMail(config,'en',token)
 assert.match(verify.text,/confirm your email/i);assert.doesNotMatch(verify.text,/Buy now/i)
 const mail=formatMarketingMail(config,'ru',{subject:'Новости',body:'Новые материалы в библиотеке.'},token)
 assert.match(mail.text,/Toronto/);assert.match(mail.text,/#u=/);assert.match(mail.text,/Отписаться/)
})
test('Resend API is fixed destination and idempotent, accepts only provider receipt',async()=>{
 const config=getCrmEmailConfig(env);const id='48c218a4-617e-42f2-bff2-799dc7a30fe0'
 let observed
 const receipt=await sendResendEmail({config,to:'test@example.net',subject:'Hello',text:'Warm hello',idempotencyKey:safeEmailIdempotency(id,'message')},
 async(url,opts)=>{observed={url,opts};return {ok:true,json:async()=>({id:'example-provider-id'})}})
 assert.equal(receipt.accepted,true);assert.equal(observed.url,'https://api.resend.com/emails')
 assert.equal(observed.opts.headers['Idempotency-Key'],'hh-crm-message-'+id)
 assert.deepEqual(JSON.parse(observed.opts.body).to,['test@example.net'])
 await assert.rejects(sendResendEmail({config,to:'test@example.net',subject:'Hello',text:'Warm hello',idempotencyKey:safeEmailIdempotency(id,'message')},
 async()=>({ok:false,json:async()=>({message:'test-secret'})})),/EMAIL_DELIVERY_UNCONFIRMED/)
})
test('Svix event signature uses raw bytes and timestamps; forged/expired events rejected',()=>{
 const raw='{"type":"email.bounced","data":{"email_id":"test-12345"}}'
 const secret=env.HH_CRM_RESEND_WEBHOOK_SECRET, now=1792326000000,ts=String(now/1000),id='msg_test_12345'
 const sig=createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(id+'.'+ts+'.'+raw).digest('base64')
 const headers=new Headers({'svix-id':id,'svix-timestamp':ts,'svix-signature':'v1,'+sig})
 assert.equal(verifyResendWebhook(raw,headers,secret,now).event.type,'email.bounced')
 assert.throws(()=>verifyResendWebhook(raw+' ',headers,secret,now))
 assert.throws(()=>verifyResendWebhook(raw,headers,secret,now+700000))
})
test('schema enforces owner scoped records, no public grants, signed definer-only tokens',()=>{
 const schema=source('supabase/migrations/20261018131448_hh_crm_email_delivery_20261018.sql')
 for(const table of ['crm_email_tokens','crm_email_jobs','crm_email_webhook_events']) assert.match(schema,new RegExp('alter table app\\.'+table+' force row level security'))
 assert.match(schema,/revoke all on app\.crm_email_tokens,app\.crm_email_jobs,app\.crm_email_webhook_events from public,anon,authenticated/)
 assert.match(schema,/create function app_private\.crm_consume_email_token/)
 assert.match(schema,/create function app_private\.crm_suppress_provider_email/)
 assert.match(schema,/OLD\.suppressed|suppressed=true/)
 assert.doesNotMatch(schema,/grant.*(select|insert|update).*authenticated/i)
})
