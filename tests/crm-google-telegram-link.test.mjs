import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {CRM_ACCOUNT_LINK_NOTICE_VERSION,validateMessengerNotificationInput} from '../lib/app/messenger-notification-policy.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('Google CRM identity link is explicit and separately revocable',()=>{
 assert.equal(validateMessengerNotificationInput({
   action:'link_crm',channel:'telegram',permissionAccepted:true,
   noticeVersion:CRM_ACCOUNT_LINK_NOTICE_VERSION,
 }).action,'link_crm')
 assert.deepEqual(validateMessengerNotificationInput({action:'unlink_crm',channel:'telegram'}),
   {action:'unlink_crm',channel:'telegram'})
 for(const data of [
  {action:'link_crm',channel:'telegram',permissionAccepted:false,noticeVersion:CRM_ACCOUNT_LINK_NOTICE_VERSION},
  {action:'link_crm',channel:'telegram',permissionAccepted:true,noticeVersion:'old'},
  {action:'link_crm',channel:'whatsapp',permissionAccepted:true,noticeVersion:CRM_ACCOUNT_LINK_NOTICE_VERSION},
  {action:'link_crm',channel:'telegram',permissionAccepted:true,noticeVersion:CRM_ACCOUNT_LINK_NOTICE_VERSION,accountId:'injected'},
  {action:'unlink_crm',channel:'telegram',accountId:'injected'},
 ])assert.throws(()=>validateMessengerNotificationInput(data))
})
test('server links only account-owned verified Telegram and bound Google account',()=>{
 const source=read('lib/app/messenger-notification-repository.js')
 assert.match(source,/notification_telegram_links where account_id=\$1 for update/)
 assert.match(source,/openSealed\(verified\.chat_ciphertext/)
 assert.match(source,/hh-client-tg-chat/)
 assert.match(source,/crm-msg-user/)
 assert.match(source,/telegramPublicDiagnosticReady/)
 assert.match(source,/crm_google_link_verified_self/)
 assert.match(source,/CRM_IDENTITY_LINK_CONFLICT/)
 assert.match(source,/delete from app_private\.crm_google_telegram_links where account_id=\$1/)
})
test('identity mapping uses RLS, authenticated grant and revocation on re-pair',()=>{
 const sql=read('supabase/migrations/20261104165824_hh_crm_verified_google_telegram_link.sql')
 assert.match(sql,/FORCE ROW LEVEL SECURITY/)
 assert.match(sql,/ON DELETE CASCADE/)
 assert.match(sql,/UNIQUE\(crm_bot_hash,crm_user_hash\)/)
 assert.match(sql,/notification_telegram_links link/)
 assert.match(sql,/app_private\.session_active\(\)/)
 assert.match(sql,/account_id=\(select auth\.uid\(\)\)/)
 assert.match(sql,/crm_owner_id=\(select auth\.uid\(\)\)/)
 assert.match(sql,/REVOKE ALL ON FUNCTION app_private\.crm_google_link_verified_self/)
 assert.match(sql,/TO hh_app_backend/)
 assert.match(sql,/CREATE TRIGGER crm_google_verified_chat_changed/)
 assert.doesNotMatch(sql,/GRANT (?:SELECT|INSERT|UPDATE|DELETE).* TO (?:anon|authenticated)/i)
})
test('CRM shows only verification, not Telegram identifiers',()=>{
 const store=read('lib/crm/messenger-store.js')
 const ui=read('components/app/crm-messenger.jsx')
 assert.match(store,/crm_google_telegram_links verified/)
 assert.match(store,/verified\.crm_owner_id=t\.owner_id/)
 assert.match(store,/linkedGoogleAccount:r\.google_account_linked===true/)
 assert.match(ui,/verifiedGoogleLabel/)
 assert.doesNotMatch(ui,/chat_ciphertext|crm_user_hash|crm_bot_hash/)
})
test('cabinet offers link/unlink only after Telegram verification',()=>{
 const ui=read('components/app/messenger-notification-settings.jsx')
 assert.match(ui,/isTelegram&&connected&&view\.crmLinkAvailable/)
 assert.match(ui,/CRM_ACCOUNT_LINK_NOTICE_VERSION/)
 assert.match(ui,/view\.crmLinked\?'unlink_crm':'link_crm'/)
 assert.match(ui,/не подписка на новости/)
})

test('optional Google Telegram CRM identity schema is guarded before any relation/function read',()=>{
 const client=read('lib/app/messenger-notification-repository.js')
 const owner=read('lib/crm/messenger-store.js')
 assert.match(client,/const crmIdentitySchemaReady=async db/)
 assert.match(client,/pg_catalog[.]to_regclass/)
 assert.match(client,/pg_catalog[.]to_regprocedure/)
 assert.match(client,/crmReady=crmBotAvailable\(\)&&await crmIdentitySchemaReady\(db\)/)
 assert.match(client,/if\(!\(await crmIdentitySchemaReady\(db\)\)\)throw new AppError\('CRM_LINK_NOT_READY',503\)/)
 assert.match(client,/if\(await crmIdentitySchemaReady\(db\)\)/)
 assert.match(owner,/const googleLinkSchemaReady=/)
 assert.match(owner,/const googleLinkProjection=googleLinkSchemaReady/)
 assert.match(owner,/\?\x60exists\(select 1 from app_private[.]crm_google_telegram_links verified/)
 assert.match(owner,/:'false'/)
 assert.match(owner,/\$\{googleLinkProjection\} as google_account_linked/)
})
