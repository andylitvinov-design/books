import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeClientPhone,validateClientPhoneSave,validateClientPhoneRemoval,
 maskClientPhone,PHONE_STORAGE_CONSENT_VERSION} from '../lib/app/client-phone-policy.js'
import {businessContactFromEnquiry} from '../lib/business-consulting/contact-import.js'

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('client phone accepts explicit international number without inferring country',()=>{
 const valid=validateClientPhoneSave({action:'save',phone:' +1 (416) 555-1234 ',
   consentVersion:PHONE_STORAGE_CONSENT_VERSION,storageConsent:true})
 assert.equal(valid.phone,'+14165551234')
 assert.equal(normalizeClientPhone('+442071838750'),'+442071838750')
 assert.equal(maskClientPhone('1234'),'••• ••• 1234')
 assert.equal(maskClientPhone(''), '')
 for(const phone of ['4165551234','+014165551234','+1','+1234567890123456',
  '+14165551234;123', 'sms:+14165551234','+14165551234\nx']){
  assert.throws(()=>normalizeClientPhone(phone),/INVALID_CONTACT_PHONE/)
 }
})
test('saving phone requires independent storage consent; removal accepts no payload',()=>{
 for(const bad of [
  {action:'save',phone:'+14165551234',storageConsent:false,consentVersion:PHONE_STORAGE_CONSENT_VERSION},
  {action:'save',phone:'+14165551234',storageConsent:true,consentVersion:'marketing'},
  {action:'save',phone:'+14165551234',storageConsent:true,consentVersion:PHONE_STORAGE_CONSENT_VERSION,marketingSms:true},
  {action:'remove',phone:'+14165551234'},
  {},
 ]) assert.throws(()=>validateClientPhoneSave(bad))
 assert.equal(validateClientPhoneRemoval({action:'remove'}),true)
 for(const bad of [{action:'remove',phone:'+14165551234'},{action:'save'},null,[]])
  assert.throws(()=>validateClientPhoneRemoval(bad))
})
test('public enquiry contact becomes unverified reply-only CRM lead on explicit owner action',()=>{
 const payload={name:'Synthetic Lead',phone:'+14165551234',email:'lead@example.org',
  contactConsent:'business-reply-only-v1',question:'private request',
  attribution:{campaign:'synthetic'}}
 const value=businessContactFromEnquiry(payload,'en')
 assert.deepEqual(value,{displayName:'Synthetic Lead',email:'lead@example.org',
  phone:'+14165551234',locale:'en',lifecycle:'lead',source:'website'})
 assert.equal(JSON.stringify(value).includes('private request'),false)
 assert.equal(JSON.stringify(value).includes('marketing'),false)
 assert.throws(()=>businessContactFromEnquiry({...payload,contactConsent:'marketing'},'en'),
  /BUSINESS_CONTACT_NO_REPLY_PERMISSION/)
 assert.throws(()=>businessContactFromEnquiry({...payload,phone:'123'},'en'),/INVALID_PHONE/)
})
test('private phone route uses owner identity + CSRF, no SMS provider or plaintext database column',()=>{
 const route=source('app/api/app/contact-phone/route.js')
 assert.match(route,/createRequestAuth/)
 assert.match(route,/requireSameOrigin/)
 assert.match(route,/x-hh-account-id/)
 assert.match(route,/PRIVATE_HEADERS/)
 assert.doesNotMatch(route,/NEXT_PUBLIC_|TWILIO|sendTwilioSms|sendCrmSms/)
 const store=source('lib/app/client-phone-repository.js')
 assert.match(store,/seal\(\{phone:value\.phone\}/)
 assert.match(store,/operationHash/)
 assert.match(store,/actor\.id/)
 assert.match(store,/on conflict\(account_id\) do update/)
 assert.match(store,/delete from app_private\.client_contact_phones/)
 assert.match(store,/smsMarketingOptIn:false/)
 assert.match(store,/verified:false/)
 assert.doesNotMatch(store,/sendTwilioSms|crm_contacts|insert into app.crm_consent_ledger/)
 const migration=source('supabase/migrations/20261020162221_hh_client_phone_self_service_20261020.sql')
 assert.match(migration,/force row level security/)
 assert.match(migration,/revoke all on app_private\.client_contact_phones from public,anon,authenticated/)
 assert.match(migration,/create policy client_contact_phone_(read|insert)/)
 assert.match(migration,/session_active\(\)/)
 assert.doesNotMatch(migration,/grant.*(?:select|insert|update).*authenticated/i)
 assert.match(source('components/app/app-workspace.jsx'),/<ClientContactPhone/)
 const ui=source('components/app/client-contact-phone.jsx')
 assert.match(ui,/storageConsent:true/)
 assert.match(ui,/action:'remove'/)
 assert.doesNotMatch(ui,/sendSms|sendTwilio|marketingSms:true/)
})
test('owner-only explicit business enquiry import uses protected question-free source',()=>{
 const api=source('app/api/app/crm/route.js')
 assert.match(api,/import_business_contact/)
 assert.match(api,/store\.businessContactDraft/)
 assert.match(api,/store\.createContact\(draft\)/)
 const store=source('lib/business-consulting/enquiry-store.js')
 assert.match(store,/where id=\$1 and owner_id=\$2 for update/)
 assert.match(store,/businessContactFromEnquiry/)
 const ui=source('components/app/crm-business-enquiries.jsx')
 assert.match(ui,/onAction\("import_business_contact",\{id:item\.id\}\)/)
 assert.match(ui,/no marketing|marketing|реклам/i)
})
