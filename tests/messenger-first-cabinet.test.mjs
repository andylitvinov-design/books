import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const sql=source('supabase/migrations/20261105154500_hh_verified_messenger_cabinet_bridge_v1.sql')
const bridge=source('lib/practitioners/direct-verified-crm-cabinet.js')
const route=source('app/api/app/direct-messages/route.js')
const ui=source('components/app/direct-message-inbox.jsx')

test('signed provider + session + explicit CRM pairing are mandatory before Cabinet conversation',()=>{
 for(const pattern of [
  /l.account_id=auth.uid\(\)/,
  /app_private.session_active\(\)/,
  /notification_telegram_links verified/,
  /verified.chat_hash=l.chat_hash/,
  /crm_google_telegram_links l/,
  /t.user_hash=l.crm_user_hash/,
  /s.consent_at IS NOT NULL/,
  /s.stage <> 'stopped'/,
  /t.suppressed IS FALSE/,
  /p.trusted_auth_user_id=l.crm_owner_id/,
  /bot.channel='telegram'/,
 ])assert.match(sql,pattern)
 assert.doesNotMatch(sql,/where.*?email\s*=|where.*?username\s*=/i)
 assert.match(bridge,/MESSENGER_VERIFICATION_REQUIRED/)
 assert.match(bridge,/MESSENGER_REPLY_CONSENT_REQUIRED/)
 assert.match(bridge,/MASTER_MESSENGER_NOT_CONNECTED/)
})

test('security definer functions are private and explicitly deny browser roles',()=>{
 assert.equal((sql.match(/SECURITY DEFINER SET search_path = ''/g)||[]).length,3)
 for(const name of ['hh_messenger_self_thread','hh_messenger_self_messages','hh_messenger_self_send']){
  assert.match(sql,new RegExp('CREATE FUNCTION app_private\\.'+name+'\\('))
  assert.match(sql,new RegExp('REVOKE ALL ON FUNCTION app_private\\.'+name+'\\([\\s\\S]*?FROM PUBLIC,anon,authenticated,service_role,hh_app_inbox,hh_crm_backend'))
  assert.match(sql,new RegExp('GRANT EXECUTE ON FUNCTION app_private\\.'+name+'\\([\\s\\S]*?TO hh_app_backend'))
 }
 assert.doesNotMatch(sql,/GRANT (?:SELECT|INSERT|UPDATE|DELETE) ON app\.crm_msg_/i)
 assert.doesNotMatch(sql,/TO (?:PUBLIC|anon|authenticated)\s*;/i)
})

test('only one existing provider-backed CRM thread is shown, with no CRM notes or unconfirmed replies',()=>{
 assert.match(sql,/JOIN app.crm_msg_threads t/)
 assert.match(sql,/JOIN app.crm_msg_items i/)
 assert.match(sql,/i.direction IN \('in','out'\)/)
 assert.match(sql,/i.status IN \('accepted','delivered','read'\)/)
 assert.match(bridge,/openSealed\(m.body_ciphertext,CONTEXT\(linked.owner_id,m.message_id\),config\)/)
 assert.match(bridge,/providerBacked:true,channel:'telegram'/)
 assert.match(bridge,/attachmentsSupported:false/)
 assert.doesNotMatch(bridge,/m\.user_ciphertext|m\.contact_ciphertext|telegramPhotoFileId/)
})

test('browser write is idempotent in the same encrypted CRM thread and never reopens provider windows',()=>{
 assert.match(sql,/app_private.hh_messenger_self_send\(/)
 assert.match(sql,/v_prior.request_hash IS DISTINCT FROM p_request_hash/)
 assert.match(sql,/IF v_count>=40 THEN/)
 assert.match(sql,/VALUES\(p_message_id,v_owner,p_thread,'in','received'/)
 assert.match(sql,/unread_count=unread_count\+1/)
 assert.doesNotMatch(sql,/last_inbound_at\s*=/)
 assert.match(bridge,/seal\(\{text\},CONTEXT\(linked.owner_id,input.operationId\),config\)/)
 assert.match(bridge,/operationHash\(\{scope:'hh-crm-cabinet-inbound-v1'/)
 assert.match(bridge,/duplicate:!saved/)
 assert.match(bridge,/if\(input.assetId!==undefined\)/)
})

test('direct-message route denies new independent client chats and preserves readable legacy history',()=>{
 assert.match(route,/const verified=createVerifiedCrmCabinet\(config\)/)
 assert.match(route,/data=await verified.start\(actor,body.slug\)/)
 assert.match(route,/data=await verified.send\(actor,body\)/)
 assert.doesNotMatch(route,/data=await store.start\(actor,body.slug\)/)
 assert.doesNotMatch(route,/data=await store.send\(actor,body\)/)
 assert.match(route,/legacyReadOnly:true,requiresMessengerVerification:true/)
 assert.match(route,/data.providerBacked!==true/)
 assert.match(route,/MESSENGER_MEDIA_NOT_AVAILABLE/)
})

test('mobile Cabinet shows honest messenger verification instead of a hidden Chat or fake WhatsApp success',()=>{
 for(const locale of ['en','ru','es'])assert.match(ui,new RegExp('\\b'+locale+':\\{'))
 assert.match(ui,/data-messenger-first-verification/)
 assert.match(ui,/data-messenger-verification-required/)
 assert.match(ui,/hh-telegram-connect/)
 assert.match(ui,/current.requiresMessengerVerification\|\|current.legacyReadOnly/)
 assert.match(ui,/\{!current.providerBacked&&<>/)
 assert.match(ui,/current.providerBacked\?t.providerTextOnly:t.warning/)
 assert.match(ui,/WhatsApp/)
})
