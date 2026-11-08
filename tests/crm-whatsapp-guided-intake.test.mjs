import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {channelTransportReady,whatsappPilotReady,canReply,messengerSetupStatus} from '../lib/crm/messenger-policy.js'
import {whatsappIntakeEvent,whatsappIntakeReady} from '../lib/crm/whatsapp-intake.mjs'
import {whatsappExpressReviewHandoff} from '../lib/crm/express-review-channel-handoff.mjs'

const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const env={
  VERCEL_ENV:'production',
  HH_CRM_MSG_WHATSAPP_ENABLED:'true',
  HH_CRM_MSG_WHATSAPP_PILOT_ENABLED:'true',
  HH_CRM_MSG_WHATSAPP_PILOT_WA_ID:'14375550123',
  HH_CRM_WA_DIAGNOSTIC_ENABLED:'true',
  HH_CRM_MSG_WHATSAPP_TOKEN:'dummy-token',
  HH_CRM_MSG_WHATSAPP_PHONE_ID:'12345678901',
  HH_CRM_MSG_META_APP_SECRET:'test-app-secret',
  HH_CRM_MSG_META_VERIFY_TOKEN:'test-verify-token',
  HH_CRM_MSG_META_API_VERSION:'v23.0',
}
test('WhatsApp stays off without Meta credentials and never reuses Telegram pilot',()=>{
  assert.equal(whatsappPilotReady({...env,HH_CRM_MSG_WHATSAPP_PILOT_WA_ID:''}),false)
  assert.equal(channelTransportReady('whatsapp',{VERCEL_ENV:'production',HH_CRM_MSG_WHATSAPP_ENABLED:'true'}),false)
  assert.equal(channelTransportReady('whatsapp',env),true)
  assert.equal(whatsappIntakeReady(env),true)
  assert.equal(whatsappIntakeReady({...env,HH_CRM_WA_DIAGNOSTIC_ENABLED:'false'}),false)
  assert.equal(channelTransportReady('whatsapp',{...env,HH_CRM_MSG_WHATSAPP_PILOT_ENABLED:'false'}),false)
  assert.equal(channelTransportReady('telegram',env),false)
  assert.equal(messengerSetupStatus('whatsapp',env).pilot,true)
})
test('WhatsApp six-stage first-person dialogue does not create a lead before consent',()=>{
  const input=(rawText,extra={})=>({rawText,locale:'ru',...extra})
  const first=whatsappIntakeEvent(null,input('Привет'))
  assert.equal(first.stage,'consent')
  assert.equal(first.body,null)
  assert.equal(first.consent,false)
  assert.match(first.reply,/WhatsApp/)
  assert.deepEqual(first.keyboard,[['Да, начинаем','Не сейчас']])
  const consent=whatsappIntakeEvent({stage:'consent',locale:'ru'},input('Да, начинаем'))
  assert.equal(consent.stage,'focus')
  assert.equal(consent.consent,true)
  assert.match(consent.body,/consent/i)
  assert.equal(consent.keyboard.flat().length,4)
  const topic=whatsappIntakeEvent({stage:'focus',locale:'ru',consentAt:'2026-10-26T12:00:00Z'},
    input('деньги/ работа'))
  assert.equal(topic.stage,'photo')
  assert.equal(topic.topic,'business')
  const portrait=whatsappIntakeEvent({stage:'photo',locale:'ru',topic:'business',consentAt:'2026-10-26T12:00:00Z'},
    input('',{photoFileId:'123456789012345'}))
  assert.equal(portrait.stage,'question')
  assert.equal(portrait.photoFileId,'123456789012345')
  assert.equal(portrait.photoPurpose,'portrait')
  const question=whatsappIntakeEvent({stage:'question',locale:'ru',topic:'business',consentAt:'2026-10-26T12:00:00Z'},
    input('Хочу увеличить доход, но трудно начать'))
  assert.equal(question.stage,'drawing')
  assert.match(question.body,/увеличить доход/)
  const drawing=whatsappIntakeEvent({stage:'drawing',locale:'ru',topic:'business',consentAt:'2026-10-26T12:00:00Z'},
    input('',{photoFileId:'987654321098765'}))
  assert.equal(drawing.stage,'done')
  assert.equal(drawing.photoPurpose,'drawing')
  assert.match(drawing.reply,/\/ru\/coaching\/intake\?topic=business/)
  const after=whatsappIntakeEvent({stage:'done',locale:'ru',topic:'business',consentAt:'2026-10-26T12:00:00Z'},
    input('Еще один вопрос'))
  assert.equal(after.stage,'done')
  assert.equal(after.body,'Еще один вопрос')
  assert.equal(after.reply,null)
})
test('STOP before consent creates no lead; STOP after consent is suppressible',()=>{
  const fresh=whatsappIntakeEvent(null,{rawText:'Стоп',locale:'ru'})
  assert.equal(fresh.stage,'stopped')
  assert.equal(fresh.body,null)
  const stop=whatsappIntakeEvent({
    stage:'question',locale:'ru',consentAt:'2026-10-26T12:00:00Z',
  },{rawText:'Стоп',locale:'ru'})
  assert.equal(stop.stage,'stopped')
  assert.equal(stop.stop,true)
  assert.equal(stop.body,'/stop')
  assert.equal(canReply({channel:'whatsapp',enabled:true,
    lastInboundAt:new Date(Date.now()-24*3600_000).toISOString()}).reason,'REPLY_WINDOW_CLOSED')
})
test('signed webhook routes WhatsApp to consent-first CRM, not a second inbox',()=>{
  const hook=source('lib/crm/messenger-webhook.js')
  const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
  const policy=source('lib/crm/messenger-policy.js')
  const db=source('supabase/migrations/20261026193500_hh_crm_whatsapp_diagnostic_intake_20261026.sql')
  assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/)
  assert.match(route,/processWhatsAppDiagnostic\(event,config\)/)
  assert.match(route,/sendWhatsAppDiagnosticPrompt/)
  assert.match(hook,/x-hub-signature-256/)
  assert.match(hook,/app_private\.crm_wa_diagnostic_sessions/)
  assert.match(hook,/ingestMessengerEventInTransaction\(db,'whatsapp'/)
  assert.match(hook,/crm_wa_suppress_existing/)
  assert.match(hook,/whatsappPilotReady\(env\)/)
  assert.match(policy,/HH_CRM_MSG_WHATSAPP_PILOT_WA_ID/)
  assert.match(db,/FORCE ROW LEVEL SECURITY/i)
  assert.match(db,/force row level security/i)
  assert.match(db,/to hh_app_inbox/)
  assert.doesNotMatch(db,/to authenticated;/)
})
test('WhatsApp photos are encrypted in the CRM and served only to the owner',()=>{
  const hook=source('lib/crm/messenger-webhook.js')
  const store=source('lib/crm/messenger-store.js')
  const photo=source('app/api/app/crm/messenger/photo/route.js')
  const provider=source('lib/crm/messenger-provider.js')
  assert.match(hook,/whatsappPhotoMediaId/)
  assert.match(hook,/interactive\?\.list_reply\?\.title/)
  assert.match(store,/readMessengerPhotoRef/)
  assert.match(photo,/practitionerEmailAllowed/)
  assert.match(photo,/readMessengerPhotoRef/)
  assert.match(photo,/retrievePrivateWhatsAppPhoto/)
  assert.match(provider,/location\.hostname!=='lookaside\.fbsbx\.com'/)
  assert.match(provider,/location\.pathname\.startsWith\('\/whatsapp_business\/attachments\/'\)/)
  assert.match(provider,/bytes\.length>5\*1024\*1024/)
  assert.match(source('components/app/crm-messenger.jsx'),/\['telegram','whatsapp'\]\.includes\(selected.channel\)/)
})

test('website EN RU ES WhatsApp marker selects approved six-step locale before consent',()=>{
  for(const locale of ['en','ru','es']){
    const message=new URL(whatsappExpressReviewHandoff(locale)).searchParams.get('text')
    const first=whatsappIntakeEvent(null,{rawText:message})
    assert.equal(first.locale,locale)
    assert.equal(first.stage,'consent')
    assert.equal(first.body,null)
    assert.equal(first.consent,false)
  }
})
