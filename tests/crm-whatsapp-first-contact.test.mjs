import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {whatsappCrmInboundCandidate} from '../lib/crm/whatsapp-lead-capture-policy.mjs'

const env={HH_CRM_MSG_WHATSAPP_PHONE_ID:'12345678901'}
const now=Date.UTC(2026,10,18,21,0)
const event={
  type:'incoming',userId:'14165550199',accountId:'12345678901',
  eventId:'wa:wamid.HBgNNDE2NTU1MDE5OQ',messageId:'wa:wamid.HBgNNDE2NTU1MDE5OQ',
  sentAt:now,rawText:'Hello, how do I book?'
}
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('a signed, correctly scoped customer WhatsApp message qualifies without diagnostic consent',()=>{
  assert.equal(whatsappCrmInboundCandidate(event,env,now),true)
  assert.equal(whatsappCrmInboundCandidate({...event,rawText:'',photoFileId:'1234567890123'},env,now),true)
  assert.equal(whatsappCrmInboundCandidate({...event,sentAt:now-22*3600_000},env,now),true)
  assert.equal(whatsappCrmInboundCandidate({...event,sentAt:now-5*86400_000},env,now),true)
  for(const changed of [
    {type:'receipt'},{userId:'invalid'},{accountId:'12345678902'},
    {eventId:'bad'},{messageId:'bad'},{sentAt:now-8*86400_000},
    {sentAt:now+70_000},{stop:true},{rawText:'STOP'},
    {rawText:'стоп'},{rawText:'unsubscribe'},
  ])assert.equal(whatsappCrmInboundCandidate({...event,...changed},env,now),false,
    JSON.stringify(changed))
})
test('verified WhatsApp webhook persists contact before Secretary and consent-first intake',()=>{
  const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
  const service=source('lib/crm/whatsapp-lead-capture.js')
  const signed=route.indexOf('if(!verifyMessengerWebhook(provider,raw,request.headers))')
  const capture=route.indexOf('captureWhatsAppFirstContact(event,config)')
  const proof=route.indexOf('processWhatsAppAccountLink(event,config)')
  const secretary=route.indexOf('processWhatsAppSecretary(event,config)')
  const intake=route.indexOf('processWhatsAppDiagnostic(event,config)')
  assert.ok(signed>=0&&signed<capture&&capture<proof&&proof<secretary&&secretary<intake)
  assert.match(route,/throw new AppError\('WHATSAPP_CRM_CONTACT_UNCONFIRMED',503\)/)
  assert.match(route,/HH_CRM_WA_FIRST_CONTACT_UNAVAILABLE/)
  assert.match(service,/app_private\.crm_msg_resolve/)
  assert.match(service,/ingestMessengerEventInTransaction\(db,'whatsapp'/)
  assert.match(service,/crm_wa_diagnostic_sessions/)
  assert.match(service,/stage='stopped'/)
  assert.match(service,/pg_advisory_xact_lock/)
  assert.match(service,/ingestMessengerUpdate\('whatsapp'/)
  assert.match(service,/eventId:'wa:first-contact:'\+event.userId/)
  assert.match(service,/messageId:'wa:first-contact:'\+event.userId/)
  assert.match(service,/body:'WhatsApp conversation started'/)
  assert.match(service,/body:'WhatsApp message received'/)
  assert.doesNotMatch(service,/insert into app\.crm_contacts|insert into app\.crm_opportunities/)
  assert.doesNotMatch(service,/body:event\.body|body:event\.rawText/)
  assert.doesNotMatch(service,/marketing_opt_in_at|sendOneMessengerMessage/)
  // Three original branches plus the signed, owner-paused manual inbox receipt.
  assert.equal((route.match(/recordWhatsAppInboundReceipt\(event,config\)/g)||[]).length,4)
  assert.match(route,/waCaptureSuppressed/)
  assert.match(route,/first.suppressed===true/)
})
test('retries of signed Meta events are safely deduplicated in the existing CRM ingest',()=>{
  const db=source('lib/crm/messenger-webhook.js')
  const sourceSql=source('supabase/migrations/20261026193500_hh_crm_whatsapp_diagnostic_intake_20261026.sql')
  assert.match(db,/providerMessageHash\(provider,event.messageId,config\)/)
  assert.match(db,/scope:'crm-msg-event'/)
  assert.match(db,/app_private\.crm_msg_ingest/)
  assert.match(sourceSql,/force row level security/i)
})
