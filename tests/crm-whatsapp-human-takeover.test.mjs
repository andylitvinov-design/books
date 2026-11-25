import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {whatsappHumanTakeoverCandidate} from '../lib/crm/whatsapp-human-takeover-policy.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const now=Date.UTC(2026,10,19,23,55)
const env={HH_CRM_MSG_WHATSAPP_PHONE_ID:'12345678901'}
const inbound={type:'incoming',userId:'14165550199',accountId:'12345678901',
  eventId:'wa:wamid.HBgNNDE2NTU1MDE5OQ',sentAt:now,rawText:'Please tell me about Reiki'}

test('WhatsApp takeover checks only signed, scoped, fresh customer replies',()=>{
 assert.equal(whatsappHumanTakeoverCandidate(inbound,env,now),true)
 for(const changed of [
   {type:'receipt'},{userId:'bad'},{accountId:'12345678902'},
   {eventId:'test'},{sentAt:now-11*60_000},{sentAt:now+11*60_000},
   {stop:true},{rawText:'STOP'},{rawText:'/stop'},{rawText:'стоп'},
   {rawText:'unsubscribe'},
 ]) assert.equal(whatsappHumanTakeoverCandidate({...inbound,...changed},env,now),false,
   JSON.stringify(changed))
})

test('owner takeover controls support WhatsApp without widening other channels',()=>{
 const store=source('lib/crm/messenger-store.js')
 const ui=source('components/app/crm-messenger.jsx')
 const sql=source('supabase/migrations/20261120000500_hh_crm_wa_owner_takeover_v1.sql')
 assert.match(store,/a\.channel in \('telegram','whatsapp'\) and a\.enabled is true/)
 assert.match(ui,/\['telegram','whatsapp'\]\.includes\(selected\.channel\)/)
 assert.match(sql,/a\.channel IN \('telegram','whatsapp'\)/)
 assert.match(sql,/c\.lifecycle<>'archived'/)
 assert.match(sql,/REVOKE ALL ON FUNCTION/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION[\s\S]*TO hh_app_inbox/)
 assert.doesNotMatch(sql,/a\.channel IN \([^)]*instagram|messenger/)
})

test('signed webhook respects STOP, captures CRM, and never auto-replies after manual takeover',()=>{
 const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
 const guard=source('lib/crm/whatsapp-human-takeover.js')
 const first=route.indexOf('captureWhatsAppFirstContact(event,config)')
 const proof=route.indexOf('processWhatsAppAccountLink(event,config)')
 const manual=route.indexOf('if(await whatsappHumanTakeoverActive(event,config))')
 const secretary=route.indexOf('processWhatsAppSecretary(event,config)')
 const diagnostic=route.indexOf('processWhatsAppDiagnostic(event,config)')
 assert.ok(first>=0&&first<proof&&proof<manual&&manual<secretary&&secretary<diagnostic)
 assert.match(route,/waCaptureSuppressed\)continue/)
 assert.match(route,/if\(secretary\.reply&&\!\(await whatsappHumanTakeoverActive/)
 assert.match(route,/if\(intake\.handled&&intake\.reply&&\!\(await whatsappHumanTakeoverActive/)
 assert.match(guard,/app_private\.crm_msg_human_takeover_active_v1/)
 assert.match(guard,/return true \/\/ Fail closed/)
 assert.match(guard,/whatsappHumanTakeoverCandidate/)
 assert.match(route,/recordWhatsAppInboundReceipt\(event,config\)/)
 assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/)
})
