import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const sql=read('supabase/migrations/20261106150000_hh_consultation_verified_messenger_guard.sql')
const store=read('lib/practitioners/client-messages.js')
const media=read('lib/practitioners/request-media.js')
const ui=read('components/app/practice-request-conversation.jsx')
const api=read('app/api/app/practitioner-client-messages/route.js')

test('consultation sender verifies exact provider, CRM identity, consent and master account',()=>{
 for(const pattern of [
  /app_private.session_active\(\)/,
  /auth.uid\(\) IN \(r.account_id,p.trusted_auth_user_id\)/,
  /crm_google_telegram_links l/,
  /l.account_id = r.account_id/,
  /l.crm_owner_id = p.trusted_auth_user_id/,
  /notification_telegram_links verified/,
  /verified.chat_hash = l.chat_hash/,
  /bot.external_hash = l.crm_bot_hash/,
  /bot.enabled IS TRUE/,
  /t.user_hash = l.crm_user_hash/,
  /t.suppressed IS FALSE/,
  /c.suppressed IS FALSE/,
  /s.consent_at IS NOT NULL/,
  /s.stage <> 'stopped'/,
  /r.id = p_request/,
 ])assert.match(sql,pattern)
 const executable=sql.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n')
 assert.doesNotMatch(executable,/phone_hash|email_hash|username|user_metadata/i)
})

test('private read/decision function has no anonymous, browser, CRM or service-role grants',()=>{
 assert.match(sql,/SECURITY DEFINER SET search_path = ''/)
 assert.match(sql,/REVOKE ALL ON FUNCTION app_private.hh_consultation_messenger_verified\(uuid\)/)
 assert.match(sql,/FROM PUBLIC,anon,authenticated,service_role,hh_app_inbox,hh_crm_backend/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION app_private.hh_consultation_messenger_verified\(uuid\)\s+TO hh_app_backend/)
 assert.doesNotMatch(sql,/GRANT SELECT|GRANT EXECUTE ON .* TO authenticated|CREATE POLICY .* USING \(true\)/i)
})

test('consultation reads old history but disables unverified composer and all new participant sends',()=>{
 assert.match(store,/canReply:scope.canReply&&messengerVerified/)
 assert.match(store,/requiresMessengerVerification:scope.canReply&&!messengerVerified/)
 assert.match(store,/app_private.hh_consultation_messenger_verified\(\$1\) as verified/)
 assert.match(store,/to_regprocedure\('app_private.hh_consultation_messenger_verified\(uuid\)'\)/)
 assert.match(store,/if\(visibility==='participants'\)\s+await requireVerifiedConsultationMessenger/)
 assert.match(store,/if\(visibility==='practitioner_note'&&!scope.canNote\)/)
 assert.match(api,/data=await store.list\(actor/)
 assert.match(api,/data=await store.send\(actor,body\)/)
 assert.match(ui,/data-messenger-first-consultation/)
 assert.match(ui,/view.actorRole==='client'/)
 assert.match(ui,/app\/settings#hh-telegram-connect/)
 for(const l of ['en','ru','es'])assert.match(ui,new RegExp('\\b'+l+':\\{'))
})

test('media intent, upload and complete cannot bypass verified messenger; old media remains readable',()=>{
 assert.match(media,/if\(ready\)await requireVerifiedConsultationMessenger\(db,scope.requestId\)/)
 assert.ok((media.match(/await requireVerifiedConsultationMessenger\(db,scope.requestId\)/g)||[]).length>=3)
 assert.match(media,/async read\(actor,assetId\)/)
 assert.match(media,/await authorizedRequestParticipant\(db,actor,a.request_id\)/)
})
