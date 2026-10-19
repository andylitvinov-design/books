import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { getSmsConfig,smsSetupStatus,smsSegments,validateSmsBody,
  smsRecipientFingerprint,sendTwilioSms,verifyTwilioWebhook,SMS_WEBHOOK_URL } from '../lib/crm/sms.js'
import { CRM_CHANNELS,marketingEligibility } from '../lib/crm/consent.js'
import { smsMessageEstimate,formatSmsText } from '../lib/crm/sms-text.js'
import { probeTwilioSmsConnection } from '../lib/crm/sms-setup.js'

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const sid='AC'+'a'.repeat(32), service='MG'+'b'.repeat(32), token='c'.repeat(32)
const env={VERCEL_ENV:'production',HH_CRM_SMS_ENABLED:'true',
 HH_CRM_SMS_PRODUCTION_APPROVED:'true',HH_CRM_SMS_SENDER_VERIFIED:'true',
 HH_CRM_SMS_CONTACT_DETAILS_VERIFIED:'true',HH_CRM_SMS_ADVANCED_OPTOUT_VERIFIED:'true',
 HH_CRM_SMS_PILOT_APPROVED:'true',HH_CRM_SMS_TEST_PHONE:'+14165550123',
 HH_CRM_TWILIO_ACCOUNT_SID:sid,HH_CRM_TWILIO_MESSAGING_SERVICE_SID:service,
 HH_CRM_TWILIO_AUTH_TOKEN:token}

test('SMS disabled by default; credential and explicit pilot gates',()=>{
 assert.equal(getSmsConfig({}).enabled,false)
 for(const key of ['HH_CRM_SMS_ENABLED','HH_CRM_SMS_PRODUCTION_APPROVED',
 'HH_CRM_SMS_SENDER_VERIFIED','HH_CRM_SMS_CONTACT_DETAILS_VERIFIED','HH_CRM_SMS_ADVANCED_OPTOUT_VERIFIED','HH_CRM_TWILIO_ACCOUNT_SID',
 'HH_CRM_TWILIO_AUTH_TOKEN','HH_CRM_TWILIO_MESSAGING_SERVICE_SID',
 'HH_CRM_SMS_PILOT_APPROVED','HH_CRM_SMS_TEST_PHONE']){
  assert.equal(getSmsConfig({...env,[key]:''}).enabled,false,key)
 }
 assert.equal(getSmsConfig(env).enabled,true)
 assert.equal(getSmsConfig(env).live,false)
 assert.equal(getSmsConfig({...env,HH_CRM_SMS_LIVE_APPROVED:'true'}).live,true)
 const setup=smsSetupStatus({})
 assert.equal(setup.enabled,false)
 assert.equal(setup.webhookUrl,SMS_WEBHOOK_URL)
 assert.equal(JSON.stringify(setup).includes(token),false)
})
test('GSM-7 and UCS-2 segment estimates account for extended and emoji',()=>{
 assert.deepEqual(smsSegments('Hello'),{encoding:'GSM-7',segments:1})
 assert.equal(smsSegments('€'.repeat(90)).segments,2)
 assert.deepEqual(smsSegments('Привет'),{encoding:'UCS-2',segments:1})
 assert.equal(smsSegments('🌞'.repeat(36)).segments,2)
})
test('SMS identifies sender, includes STOP and rejects private/oversized content',()=>{
 const hello=validateSmsBody({body:'Hello, which day works for a call?'})
 assert.match(hello.formatted,/^Holistic House: /)
 assert.match(hello.formatted,/Reply STOP to unsubscribe\.$/)
 assert.match(hello.formatted,/https:\/\/holistichouse\.vercel\.app/)
 assert.equal(smsMessageEstimate('Hello, which day works for a call?').segments,hello.segments)
 assert.equal(formatSmsText('Hello, which day works for a call?'),hello.formatted)
 assert.ok(hello.segments>=1&&hello.segments<=4)
 assert.throws(()=>validateSmsBody({body:'My diagnosis is here'}),/PRIVATE_CONTENT_BLOCKED/)
 assert.throws(()=>validateSmsBody({body:'See https://holistichouse.vercel.app/en/client/session/secret#token1234567890'}),/PRIVATE_CONTENT_BLOCKED/)
 assert.throws(()=>validateSmsBody({body:'hello',phone:'+14165550123'}),/INVALID_SMS_MESSAGE/)
 assert.throws(()=>validateSmsBody({body:'a'.repeat(241)}),/INVALID_SMS_MESSAGE/)
 assert.throws(()=>validateSmsBody({body:' '}),/INVALID_SMS_MESSAGE/)
 const hash=smsRecipientFingerprint('+14165550123',Buffer.from('key'))
 assert.equal(hash.length,64)
 assert.notEqual(hash,smsRecipientFingerprint('+14165550124',Buffer.from('key')))
})
test('Twilio request is one-to-one and pilot-only; provider errors do not retry',async()=>{
 const config=getSmsConfig(env)
 let seen
 const result=await sendTwilioSms({config,to:env.HH_CRM_SMS_TEST_PHONE,text:'Holistic House: Test\nReply STOP to unsubscribe.'},
 async(url,options)=>{
  seen={url,options}
  return {ok:true,json:async()=>({sid:'SM'+'1'.repeat(32),account_sid:sid,status:'queued'})}
 })
 assert.equal(result.accepted,true)
 assert.equal(seen.url,'https://api.twilio.com/2010-04-01/Accounts/'+sid+'/Messages.json')
 const form=new URLSearchParams(seen.options.body)
 assert.equal(form.get('To'),env.HH_CRM_SMS_TEST_PHONE)
 assert.equal(form.get('MessagingServiceSid'),service)
 assert.equal(form.get('StatusCallback'),SMS_WEBHOOK_URL)
 assert.equal(form.get('ValidityPeriod'),'3600')
 assert.equal(form.get('Body').includes('STOP'),true)
 assert.equal(seen.options.headers.Authorization,
  'Basic '+Buffer.from(sid+':'+token).toString('base64'))
 await assert.rejects(sendTwilioSms({config,to:'+14165550124',text:'test'},
  async()=>{throw new Error('SHOULD_NOT_SEND')}),/SMS_NOT_CONFIGURED/)
 await assert.rejects(sendTwilioSms({config,to:env.HH_CRM_SMS_TEST_PHONE,text:'test'},
  async()=>({ok:true,json:async()=>({status:'queued'})})),/SMS_DELIVERY_UNCONFIRMED/)
})
test('Twilio webhook validates HMAC on all form params, URL and SID',()=>{
 const params=new URLSearchParams({
  MessageSid:'SM'+'2'.repeat(32),MessageStatus:'delivered',AccountSid:sid,
  MessagingServiceSid:service,To:'+14165550123',ErrorCode:'',
 })
 const canonical=SMS_WEBHOOK_URL+[...params.entries()]
  .sort(([a],[b])=>a<b?-1:a>b?1:0).map(([a,b])=>a+b).join('')
 const sig=createHmac('sha1',token).update(canonical).digest('base64')
 const headers=new Headers({'x-twilio-signature':sig})
 assert.equal(verifyTwilioWebhook(params.toString(),headers,token).get('MessageStatus'),'delivered')
 assert.throws(()=>verifyTwilioWebhook(params.toString()+'&extra=evil',headers,token),/INVALID_SMS_WEBHOOK/)
 assert.throws(()=>verifyTwilioWebhook(params.toString(),headers,token,'https://other.example/'),/INVALID_SMS_WEBHOOK/)
 assert.throws(()=>verifyTwilioWebhook(params.toString(),new Headers(),token),/INVALID_SMS_WEBHOOK/)
 assert.throws(()=>verifyTwilioWebhook(params.toString()+'&MessageStatus=sent',headers,token),/INVALID_SMS_WEBHOOK/)
})
test('SMS consent is scoped and withdrawal wins an equal-time conflict',()=>{
 assert.ok(CRM_CHANNELS.includes('sms'))
 const id='48c218a4-617e-42f2-bff2-799dc7a30fe0'
 const contact='7e210a31-01ee-434f-9a50-41805f27a8b0'
 const event=decision=>({id,contactId:contact,channel:'sms',purpose:'product_updates',
  decision,occurredAt:'2026-10-18T16:00:00.000Z',
  source:'synthetic_test_opt_in',textVersion:'crm-sms-v1',actorKind:'owner_recorded'})
 assert.equal(marketingEligibility({contactId:contact,channel:'sms',
  events:[event('granted')],verifiedAddress:true}).allowed,true)
 assert.equal(marketingEligibility({contactId:contact,channel:'sms',
  events:[event('granted'),event('withdrawn')],verifiedAddress:true}).allowed,false)
 assert.equal(marketingEligibility({contactId:contact,channel:'sms',
  events:[event('granted')],verifiedAddress:false}).allowed,false)
 assert.equal(marketingEligibility({contactId:contact,channel:'sms',
  events:[event('granted')],verifiedAddress:true,suppressed:true}).allowed,false)
})
test('owner route, privacy, pilot and signature controls are enforced in source',()=>{
 const route=source('app/api/app/crm/route.js')
 assert.match(route,/createRequestAuth/)
 assert.match(route,/requireSameOrigin/)
 assert.match(route,/practitionerEmailAllowed/)
 assert.match(route,/sendCrmSms/)
 assert.match(route,/listSmsMessages/)
 const store=source('lib/crm/sms-store.js')
 assert.match(store,/pg_advisory_xact_lock/)
 assert.match(store,/SMS_RECENT_DUPLICATE/)
 assert.match(store,/SMS_PILOT_ONLY/)
 assert.match(store,/crm_sms_is_opted_out/)
 const dispatch=source('lib/crm/sms-dispatch.js')
 assert.match(dispatch,/if\(!provider.enabled\)/)
 assert.match(dispatch,/reserved.duplicate/)
 assert.doesNotMatch(dispatch,/retry\(|setInterval\(/)
 const webhook=source('app/api/app/crm/sms/webhook/route.js')
 assert.match(webhook,/verifyTwilioWebhook/)
 assert.match(webhook,/crm_sms_record_stop/)
 assert.match(webhook,/crm_sms_status_receipt/)
 assert.doesNotMatch(webhook,/console\.log/)
})
test('SQL schema isolates owner records, STOP and provider callbacks',()=>{
 const schema=source('supabase/migrations/20261019162351_hh_crm_sms_delivery_20261019.sql')
 assert.match(schema,/alter table app\.crm_consent_ledger add constraint/)
 assert.match(schema,/alter table app\.crm_sms_jobs force row level security/)
 assert.match(schema,/revoke all on app\.crm_sms_jobs from public,anon,authenticated/)
 assert.match(schema,/crm_sms_jobs_read/)
 assert.match(schema,/crm_sms_is_opted_out/)
 assert.match(schema,/crm_sms_record_stop/)
 assert.match(schema,/crm_sms_reconcile/)
 assert.match(schema,/foreign key\(consent_event_id,owner_id,contact_id\)/)
 assert.match(schema,/crm_sms_status_receipt/)
 assert.doesNotMatch(schema,/grant.*(select|insert|update).*authenticated/i)
})


test('read-only Twilio readiness probe never dispatches and checks service, webhook and sender',async()=>{
 const called=[]
 const sender={
  sid:service,account_sid:sid,
  inbound_request_url:SMS_WEBHOOK_URL,inbound_method:'POST',
  use_inbound_webhook_on_number:false,status_callback:SMS_WEBHOOK_URL,
 }
 const getter=async(url,options)=>{
  called.push({url,method:options.method,hasAuth:options.headers.Authorization.startsWith('Basic ')})
  return{status:200,ok:true,json:async()=>url.endsWith('/PhoneNumbers?PageSize=1')
    ?{phone_numbers:[{sid:'PN'+'1'.repeat(32)}]}:sender}
 }
 const probe=await probeTwilioSmsConnection(env,getter)
 assert.equal(probe.status,'connected')
 assert.equal(probe.providerVerified,true)
 assert.equal(probe.senderAttached,true)
 assert.equal(probe.inboundWebhookVerified,true)
 assert.equal(probe.statusCallbackVerified,true)
 assert.equal(probe.optOutManuallyVerified,true)
 assert.equal(called.length,2)
 assert.ok(called.every(x=>x.method==='GET'&&x.hasAuth))
 assert.ok(called.every(x=>x.url.startsWith('https://messaging.twilio.com/v1/Services/'+service)))
 assert.equal(JSON.stringify(probe).includes(token),false)
 let hits=0
 const noKey=await probeTwilioSmsConnection({},async()=>{hits++;throw Error('must not call')})
 assert.equal(noKey.status,'missing_credentials')
 assert.equal(hits,0)
 const badAuth=await probeTwilioSmsConnection(env,async()=>({status:401,ok:false,json:async()=>({})}))
 assert.equal(badAuth.status,'invalid_credentials')
 const wrongAccount=await probeTwilioSmsConnection(env,async()=>({status:200,ok:true,
   json:async()=>({...sender,account_sid:'AC'+'f'.repeat(32)})}))
 assert.equal(wrongAccount.status,'account_mismatch')
 const wrongWebhook=await probeTwilioSmsConnection(env,async url=>({status:200,ok:true,json:async()=>url.includes('PhoneNumbers')
  ?{phone_numbers:[]}:({...sender,inbound_request_url:'https://wrong.example'})}))
 assert.equal(wrongWebhook.status,'needs_configuration')
 assert.equal(wrongWebhook.inboundWebhookVerified,false)
 assert.equal(wrongWebhook.senderAttached,false)
})

test('SMS onboarding is owner-only, never exposes Twilio tokens or sends on page load',()=>{
 const route=source('app/api/app/crm/route.js')
 assert.match(route,/smsSetup:smsSetupStatus\(\)/)
 assert.match(route,/check_sms_connection/)
 assert.match(route,/probeTwilioSmsConnection/)
 assert.match(route,/requireSameOrigin/)
 assert.match(route,/practitionerEmailAllowed/)
 const ui=source('components/app/crm-sms-setup.jsx')
 assert.match(ui,/onAction\('check_sms_connection',\{\}\)/)
 assert.doesNotMatch(ui,/NEXT_PUBLIC_|HH_CRM_TWILIO_AUTH_TOKEN/)
 const manager=source('components/app/crm-manager.jsx')
 assert.match(manager,/<CrmSmsSetup/)
 assert.match(source('components/app/crm-sms-tools.jsx'),/smsMessageEstimate/)
 assert.match(source('lib/crm/sms-store.js'),/:sms:owner_quota/)
 assert.doesNotMatch(source('lib/crm/sms-store.js'),/:sms:quota/)
})
