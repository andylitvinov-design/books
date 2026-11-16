import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {whatsappEnquiryUrl} from '../lib/whatsapp-enquiry.js'
import {whatsappIntakeEvent} from '../lib/crm/whatsapp-intake.mjs'
import {whatsappSecretaryQuery,whatsappSecretaryPublicAnswer} from '../lib/crm/whatsapp-secretary-catalog.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

for(const locale of ['en','ru','es']){
 test('verified WhatsApp service selection and consented CRM stages: '+locale,()=>{
  const title={ru:'Сеанс Рейки',en:'Reiki session',es:'Sesión de Reiki'}[locale]
  const link=whatsappEnquiryUrl({locale,service:title,
   request:'Interested in this published service.',pagePath:'/'+locale+'/services'})
  const message=new URL(link).searchParams.get('text')
  assert.ok(message.endsWith('[HH-REQ:reiki:'+locale+']'))
  const first=whatsappIntakeEvent(null,{rawText:message})
  assert.equal(first.stage,'consent')
  assert.equal(first.serviceKey,'reiki')
  assert.equal(first.locale,locale)
  assert.equal(first.body,null)
  assert.equal(first.consent,false)
  const agree=whatsappIntakeEvent({stage:'consent',locale,serviceKey:'reiki'},{
   rawText:{en:"Yes, let's begin",ru:'Да, начинаем',es:'Sí, empezamos'}[locale],
  })
  assert.equal(agree.stage,'focus')
  assert.equal(agree.consent,true)
  assert.match(agree.body,/One-time WhatsApp CRM reply consent/)
  const format=whatsappIntakeEvent({
   stage:'focus',locale,serviceKey:'reiki',consentAt:'2026-11-16T22:00:00Z',
  },{rawText:{en:'Online',ru:'Онлайн',es:'En línea'}[locale]})
  assert.equal(format.stage,'question')
  assert.equal(format.deliveryFormat,'online')
  const done=whatsappIntakeEvent({
   stage:'question',locale,serviceKey:'reiki',deliveryFormat:'online',
   consentAt:'2026-11-16T22:00:00Z',
  },{rawText:'I want to explore a meaningful personal goal together.'})
  assert.equal(done.stage,'done')
  assert.match(done.body,/Service:/)
  assert.match(done.body,/format: online/)
  assert.ok(done.reply)
  const stopped=whatsappIntakeEvent({
   stage:'done',locale,serviceKey:'reiki',deliveryFormat:'online',
   consentAt:'2026-11-16T22:00:00Z',
  },{rawText:'STOP'})
  assert.equal(stopped.stage,'stopped')
  assert.equal(stopped.stop,true)
  assert.equal(stopped.body,'/stop')
  const blocked=whatsappIntakeEvent({stage:'stopped',locale,serviceKey:'reiki'},
   {rawText:message})
  assert.equal(blocked.reply,null)
 })
}
test('arbitrary visitor-provided services do not gain a privileged service code',()=>{
 const url=whatsappEnquiryUrl({locale:'en',service:'Unpublished user request',
  request:'Write to the team'})
 assert.doesNotMatch(new URL(url).searchParams.get('text'),/\[HH-REQ:/)
})
test('generic WhatsApp six-stage express review is preserved',()=>{
 const first=whatsappIntakeEvent(null,{rawText:'Hello',locale:'en'})
 assert.equal(first.stage,'consent')
 assert.equal(first.serviceKey,undefined)
 assert.equal(first.body,null)
})
test('WhatsApp shares approved Telegram catalogue, not an invented link',()=>{
 const query=whatsappSecretaryQuery('Could you show me a stress course?','en')
 assert.ok(query)
 const reply=whatsappSecretaryPublicAnswer(query,[])
 assert.ok(reply)
 assert.match(reply.text,/holistichouse\.vercel\.app\/en\//)
 assert.ok(reply.text.length<=1200)
})
test('signed WhatsApp secretary may not intercept consent, require AI, or bypass STOP',()=>{
 const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
 const handler=source('lib/crm/whatsapp-secretary-service.js')
 const hook=source('lib/crm/messenger-webhook.js')
 const migration=source('supabase/migrations/20261116232444_hh_wa_service_intake_choice_20261116.sql')
 assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/)
 assert.match(route,/processWhatsAppSecretary\(event,config\)/)
 assert.match(route,/processWhatsAppDiagnostic\(event,config\)/)
 assert.match(handler,/session\.stage!=='done'/)
 assert.match(handler,/HH_CRM_WA_SECRETARY_ENABLED/)
 assert.match(handler,/crm_wa_diagnostic_receipts/)
 assert.doesNotMatch(handler,/generateOwnedOllama|OpenRouter|api\.openai\.com/)
 assert.match(hook,/service_key,delivery_format/)
 assert.match(hook,/crm_wa_suppress_existing/)
 assert.match(migration,/add column if not exists service_key/)
})
