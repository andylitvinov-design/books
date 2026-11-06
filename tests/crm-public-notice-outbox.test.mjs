import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('a customer enquiry commits an owner notice intent before optional provider work',()=>{
 const insert=read('lib/practitioners/public-service-enquiry.js')
 const route=read('app/api/service-enquiries/route.js')
 const coaching=read('app/api/coaching-diagnostic/route.js')
 assert.ok(insert.indexOf('insert into app.public_service_enquiries')<
   insert.indexOf('insert into app_private.notification_public_enquiry_intents'))
 assert.match(insert,/notification_public_enquiry_intents \(enquiry_id,owner_id\)/)
 assert.match(insert,/CRM_NOTICE_INTENT_FAILED/)
  assert.match(insert,/if\s*\(contact\)\s*\{/)
  // A contactless Telegram handoff has no contact ciphertext and cannot insert
  // an owner alert intent without its verified production RLS precondition.
  assert.doesNotMatch(insert,/if\s*\(\s*contact\s*\|\|\s*linkedTelegram\s*\)/)
 for(const handler of [route,coaching]){
   assert.match(handler,/result\.saved === true/)
   assert.match(handler,/after\(async \(\) => \{/)
   assert.match(handler,/dispatchPublicServiceEnquiryTelegram/)
 }
 assert.doesNotMatch(insert,/sendOneMessengerMessage\(|sendOwnerTelegramEventMessage\(/)
})

test('private schema limits intent creation to original operation and owner-only manual inspection',()=>{
 const sql=read('supabase/migrations/20261104155712_hh_crm_public_enquiry_durable_notification_intents_v1.sql')
 assert.match(sql,/FORCE ROW LEVEL SECURITY/i)
 assert.match(sql,/for insert to hh_app_backend/i)
 assert.match(sql,/current_setting\('hh\.public_enquiry_operation',true\)/)
 assert.match(sql,/for select to hh_app_backend using/i)
 assert.match(sql,/app_private\.session_active\(\)/)
 assert.match(sql,/notification_public_dispatch_owner_lookup/)
 assert.match(sql,/grant select \(enquiry_id,account_id\)/)
 assert.doesNotMatch(sql,/grant .* to (?:public|anon|authenticated)/i)
})

test('manual recovery is owner authenticated and never retries a claimed result',()=>{
 const handler=read('app/api/app/crm/notification-recovery/route.js')
 const sender=read('lib/app/public-enquiry-telegram.js')
 const view=read('components/app/crm-messenger.jsx')
 assert.match(handler,/requireSameOrigin\(request, config\)/)
 assert.match(handler,/actor = await auth\.verified\(\)/)
 assert.match(handler,/practitionerEmailAllowed\(actor\)/)
 assert.match(handler,/consumeRate\(/)
 assert.match(handler,/not exists \(/)
 assert.match(handler,/notification_telegram_public_dispatch/)
 assert.match(handler,/limit 3/)
 assert.match(handler,/dispatchPublicServiceEnquiryTelegram\(config,item\.enquiryId,item\.operationId\)/)
 assert.match(sender,/notification_tg_public_enquiry_claim/)
 assert.match(view,/recoverPendingNotices\(/)
 assert.match(view,/mode|Recover unsent enquiry alerts/)
 assert.doesNotMatch(handler,/setInterval|cron|sendBulk|campaign|sendOneMessengerMessage/i)
})

test('recovers at most three unclaimed alerts and preserves verified service offering',()=>{
 const handler=read('app/api/app/crm/notification-recovery/route.js')
 const insert=read('lib/practitioners/public-service-enquiry.js')
 const ui=read('components/app/crm-messenger.jsx')
 assert.match(handler,/limit 3/)
 assert.match(handler,/not exists \(/)
 assert.match(insert,/serviceOfferingId:verifiedOfferingId/)
 assert.match(insert,/buildPublicEnquiryInsert\(/)
 assert.match(insert,/CRM_LINK_FAILED/)
 assert.match(insert,/CRM_NOTICE_INTENT_FAILED/)
 assert.match(ui,/BellRing/)
 assert.match(ui,/noticeBusy\|\|!data/)
 assert.match(ui,/role="status"/)
})
