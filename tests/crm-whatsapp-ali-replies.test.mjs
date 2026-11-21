import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {whatsappAliReplyArchiveCandidate} from '../lib/crm/whatsapp-ali-reply-archive-policy.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const env={HH_CRM_MSG_WHATSAPP_PHONE_ID:'12345678901'}
const event={type:'incoming',accountId:'12345678901',userId:'14165550199',
  eventId:'wa:wamid.HBgNNDE2NTU1MDE5OQ',rawText:'Hello',
  sentAt:Date.UTC(2026,10,20,23,30),stop:false}
const reply='Hello! I’m Ali. Which service can I help you with?'
const provider='wamid.HBgNNDE2NTU1MDE5OQ'

test('archive provider-boundary does not accept wrong account, STOP or unsent replies',()=>{
 assert.equal(whatsappAliReplyArchiveCandidate(event,reply,provider,env),true)
 for(const variant of [
  {type:'receipt'},{stop:true},{accountId:'12345678902'},
  {userId:'invalid'},{userId:''}
 ])assert.equal(whatsappAliReplyArchiveCandidate({...event,...variant},reply,provider,env),false)
 assert.equal(whatsappAliReplyArchiveCandidate(event,'',provider,env),false)
 assert.equal(whatsappAliReplyArchiveCandidate(event,reply,'unknown',env),false)
 assert.equal(whatsappAliReplyArchiveCandidate(event,'x'.repeat(1201),provider,env),false)
})

test('signed WhatsApp handler never archives before Meta confirms provider accepted',()=>{
 const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
 const first=route.indexOf('verifyMessengerWebhook(provider,raw,request.headers)')
 const capture=route.indexOf('captureWhatsAppFirstContact(event,config)')
 const send=route.indexOf('sendWhatsAppDiagnosticPrompt({to:secretary.to,text:secretary.reply')
 const archive=route.indexOf('archiveWhatsAppAliAcceptedReply(event,config,secretary.reply,accepted.providerId)')
 assert.ok(first>=0&&first<capture&&capture<send&&send<archive)
 assert.equal((route.match(/archiveWhatsAppAliAcceptedReply\(event,config,/g)||[]).length,2)
 assert.equal((route.match(/accepted\?\.status==='accepted'&&accepted\.providerId/g)||[]).length,2)
 assert.match(route,/if\(intake\.handled&&intake\.reply&&!\(await whatsappHumanTakeoverActive/)
 assert.match(route,/HH_CRM_WA_ALI_REPLY_ARCHIVE_UNCONFIRMED/)
 assert.doesNotMatch(route,/await archiveWhatsAppAliAcceptedReply\(event,config,event\.rawText/)
})

test('WhatsApp archive is owner-encrypted, server-only, consented, deduped and Meta-status accurate',()=>{
 const mod=source('lib/crm/whatsapp-ali-reply-archive.js')
 const sql=source('supabase/migrations/20261120234000_hh_crm_wa_ali_reply_archive_v1.sql')
 assert.match(mod,/import 'server-only'/)
 assert.match(mod,/businessHash\('whatsapp'/)
 assert.match(mod,/providerMessageHash\('whatsapp'/)
 assert.match(mod,/scope:'crm-msg-user'/)
 assert.match(mod,/app_private\.crm_msg_resolve/)
 assert.match(mod,/seal\(\{text,sender:'Ali'\}/)
 assert.match(mod,/app_private\.crm_msg_wa_archive_ali_reply_v1/)
 assert.match(mod,/\{inbox:true,practitionerId:PRACTITIONER_ID\}/)
 assert.doesNotMatch(mod,/insert into app\.crm_msg_items|console\.log|event\.rawText/)
 assert.match(sql,/a\.channel='whatsapp' AND a\.enabled IS TRUE/)
 assert.match(sql,/s\.consent_at IS NOT NULL/)
 assert.match(sql,/s\.stage IN \('focus','photo','question','drawing','done'\)/)
 assert.match(sql,/t\.human_takeover_at IS NULL/)
 assert.match(sql,/t\.suppressed IS FALSE/)
 assert.match(sql,/c\.suppressed IS FALSE/)
 assert.match(sql,/ON CONFLICT \(thread_id,provider_hash\) DO NOTHING/)
 assert.match(sql,/app\.crm_msg_receipts/)
 assert.match(sql,/r\.status IN \('delivered','read','failed'\)/)
 assert.match(sql,/SECURITY DEFINER SET search_path=''/)
 assert.match(sql,/REVOKE ALL ON FUNCTION/)
 assert.match(sql,/TO hh_app_inbox/)
 assert.doesNotMatch(sql,/GRANT .* TO anon|GRANT .* TO authenticated/)
})
