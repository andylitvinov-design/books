import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {verifiedTelegramSubject} from '../lib/app/telegram-business-identity.mjs'
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('Only provider-verified Telegram OIDC profile ID may match a Bot API peer',()=>{
 // Telegram OIDC sub (authentication subject) differs from its numeric id
 // (Bot API from.id). Never hash sub into a Business-chat linkage.
 const okay=[{provider:'custom:telegram',identity_data:{sub:'1234123412341234123',id:987654321}}]
 assert.equal(verifiedTelegramSubject(okay),'987654321')
 assert.equal(verifiedTelegramSubject([{provider:'custom:telegram',identity_data:{sub:'opaque-oidc-subject',id:'4503599627370495'}}]),'4503599627370495')
 for(const identities of [
  null,[],[{}],[{provider:'google',identity_data:{sub:'1234',id:987654321}}],
  [{provider:'custom:telegram',identity_data:{sub:'1234123412341234123'}}],
  [{provider:'custom:telegram',identity_data:{id:987654321}}],
  [{provider:'custom:telegram',identity_data:{sub:'1234123412341234123',id:'@alice'}}],
  [{provider:'custom:telegram',identity_data:{sub:'s',id:0}}],
  [{provider:'custom:telegram',identity_data:{sub:'s',id:-1}}],
  [{provider:'custom:telegram',identity_data:{sub:'s',id:1.25}}],
  [{provider:'custom:telegram',identity_data:{sub:'s',id:'000987654321'}}],
  [{provider:'custom:telegram',identity_data:{sub:'s',id:'4503599627370496'}}],
  [{provider:'custom:telegram',identity_data:{sub:'s',id:Number.MAX_SAFE_INTEGER}}],
  [{provider:'custom:telegram',user_metadata:{sub:'s',id:987654321}}],
  [okay[0],okay[0]],
 ])assert.equal(verifiedTelegramSubject(identities),null)
})
test('Confirmed Telegram Business request atomically saves one CRM contact and evidence link',()=>{
 const code=src('lib/crm/telegram-business-service.js')
 assert.match(code,/state\.telegram_peer_hash!==intent\.peer/)
 assert.match(code,/assertHolisticBusinessConnection/)
 assert.match(code,/telegram_peer_hash=excluded\.telegram_peer_hash/)
 assert.match(code,/if\(!inserted\)throw/)
 assert.match(code,/insert into app\.crm_contacts/)
 assert.match(code,/on conflict\(owner_id,email_hash\) do nothing/)
 assert.match(code,/verified_telegram_business_enquiry/)
 assert.match(code,/return finalize\(id,ref,contactId\)/)
 assert.match(code,/contact_id=\$5/)
 assert.match(code,/transaction\(config,null,async db=>/)
 assert.doesNotMatch(code,/auth\.admin\.createUser|email_otp|phone_otp/)
})
test('Cabinet autosync is verified, revocable, opt-out-safe and RLS-scoped',()=>{
 const app=src('app/api/app/[...path]/route.js')
 const ui=src('components/app/account-login-methods.jsx')
 const sql=src('supabase/migrations/20261114012134_hh_tg_business_crm_cabinet_link_v1.sql')
 const autoSql=src('supabase/migrations/20261116223413_hh_tg_business_cabinet_autolink_optout.sql')
 for(const route of ['auth/telegram-business-link','auth/telegram-business-unlink',
   'auth/telegram-business-enquiries'])assert.ok(app.includes(route),route)
 assert.match(app,/verifiedTelegramSubject\(data\?\.identities\)/)
 assert.match(app,/await syncVerifiedTelegramBusinessEnquiries\(config,actor,verifiedIdentities\.identities\)/)
 assert.match(app,/authChoice==='telegram'&&!native/)
 assert.match(app,/auth\.client\.auth\.linkIdentity\(\{/)
 assert.match(app,/createIdentityLinkProof\(existingActor\.id,TELEGRAM_OIDC_PROVIDER,config\)/)
 assert.match(app,/await disableVerifiedTelegramBusinessSync\(config,actor\)/)
 assert.match(app,/if\(stopped\.rowCount\)return \{verified:true,linked:0,disabled:true\}/)
 assert.match(app,/hh-tg-cabinet-autolink:/)
 assert.match(autoSql,/force row level security/i)
 assert.match(autoSql,/to hh_app_backend/i)
 assert.match(autoSql,/account_id\s*=\s*\(select auth\.uid\(\)\)/)
 assert.doesNotMatch(autoSql,/grant\s+all\s+on\s+app_private\./i)
 assert.doesNotMatch(app,/auth\.admin\.createUser|email_otp|phone_otp/)
 assert.match(app,/x-hh-account-id/)
 assert.match(app,/hh\.telegram_verified_peer_hash/)
 assert.match(sql,/verified_telegram_business_enquiry/)
 assert.match(sql,/hh\.telegram_verified_peer_hash/)
 assert.match(sql,/to hh_app_backend/i)
 assert.match(sql,/account_id\s*=\s*\(select auth\.uid\(\)\)/)
 assert.doesNotMatch(sql,/grant\s+all\s+on\s+app_private\./i)
 for(const locale of ['en','ru','es'])assert.match(ui,new RegExp(' '+locale+':\\{'))
 assert.match(ui,/view\.telegram&&/)
 assert.match(ui,/syncRequests\('detach'\)/)
 assert.match(ui,/syncRequests\('resume'\)/)
 assert.match(ui,/appFetch\('auth\/telegram-business-link',\{\},'POST'/)
 assert.doesNotMatch(ui,/t\.attach|syncRequests\('attach'\)/)
})
