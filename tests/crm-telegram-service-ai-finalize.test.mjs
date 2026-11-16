import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('Client confirmation commits CRM transcript before service finalization and acknowledgement',()=>{
 const v3=source('lib/crm/telegram-ai-diagnostic-v3-service.js')
 const webhook=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
 assert.ok(v3.indexOf("if(action==='send')")<v3.indexOf('serviceFinalize:'))
 assert.match(v3,/ai_review_consent_at=now\(\)/)
 assert.match(v3,/serviceCopy&&raw==='\/retry_request'/)
 assert.ok(webhook.indexOf('await finalizeTelegramV3Service(config,aiIntake.serviceFinalize)')<
   webhook.indexOf('if(aiIntake.reply)'))
 assert.ok(webhook.indexOf('if(finished.saved)')<
   webhook.indexOf('notifyOwnerTelegramV3Service(config,finished)'))
 assert.match(webhook,/HH_TG_V3_SERVICE_FINALIZE_NOT_CONFIRMED/)
})

test('Existing public enquiry enforces practitioner identity, exact V3 consent, STOP and one HH reference',()=>{
 const code=source('lib/practitioners/public-service-enquiry.js')
 assert.match(code,/v3ServiceTelegram=linkedTelegram\?\.purpose==='v3_service'/)
 assert.match(code,/linkedTelegram.businessHash\+':'\+linkedTelegram.userHash/)
 assert.match(code,/ai_context_id=\$3::uuid and flow_version=3/)
 assert.match(code,/ai_review_consent_at is not null/)
 assert.match(code,/const id = v3ServiceTelegram\?operationId:randomUUID\(\)/)
 assert.match(code,/replyConsent:'telegram_v3_service_request_v1'/)
 assert.match(code,/if\(contact\|\|v3ServiceTelegram\)/)
 assert.match(code,/hh.public_enquiry_operation/)
 assert.match(code,/linkedTelegram.ownerId !== practitioner.owner_id/)
 assert.match(code,/select contact_id from app.crm_msg_threads/)
})

test('Finalizer decrypts only the confirmed V3 session and uses verified existing CRM thread',()=>{
 const code=source('lib/crm/telegram-v3-service-finalizer.js')
 assert.match(code,/row.stage!=='done'/)
 assert.match(code,/row.ai_context_id!==intent.contextId/)
 assert.match(code,/v3Context\(openSealed\(row.ai_context_ciphertext/)
 assert.match(code,/select id from app.crm_msg_threads/)
 assert.match(code,/and not suppressed limit 1/)
 assert.match(code,/sourcePath:'\/'\+selected.locale\+'\/services'/)
 assert.match(code,/purpose:'v3_service'/)
 assert.match(code,/operationId:selected.contextId/)
 assert.match(code,/createPublicServiceEnquiry\(config/)
 assert.match(code,/if\(!enquiry\?\.saved/)
})

test('Owner Dot notice is consent-gated, contains no private client content, and uses existing sender',()=>{
 const code=source('lib/crm/telegram-v3-service-finalizer.js')
 assert.match(code,/telegramOwnerPilotReady\(env\)/)
 assert.match(code,/andydotbot/)
 assert.match(code,/await verifyClientBot\(env\)/)
 assert.match(code,/dispatchPublicServiceEnquiryTelegram\(config,/)
 assert.doesNotMatch(code,/sendMessage\(|sendPhoto\(|\.summary\s*,\s*env/)
 assert.match(code,/not_confirmed/)
})
