import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {verifiedTelegramSubject} from '../lib/app/telegram-business-identity.mjs'
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('Only the official Supabase Telegram OIDC identity can supply the peer subject',()=>{
 const okay=[{provider:'custom:telegram',identity_data:{sub:'123456789'}}]
 assert.equal(verifiedTelegramSubject(okay),'123456789')
 for(const identities of [
  null,[],[{}],[{provider:'google',identity_data:{sub:'123456789'}}],
  [{provider:'custom:telegram',identity_data:{sub:'@alice'}}],
  [{provider:'custom:telegram',identity_data:{sub:'0'}}],
  [{provider:'custom:telegram',identity_data:{sub:123456789}}],
  [{provider:'custom:telegram',user_metadata:{sub:'123456789'}}],
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
test('Cabinet pairing is explicit, session-gated, unlinkable, RLS and OIDC-scoped',()=>{
 const app=src('app/api/app/[...path]/route.js')
 const ui=src('components/app/account-login-methods.jsx')
 const sql=src('supabase/migrations/20261114012134_hh_tg_business_crm_cabinet_link_v1.sql')
 for(const route of ['auth/telegram-business-link','auth/telegram-business-unlink',
   'auth/telegram-business-enquiries'])assert.ok(app.includes(route),route)
 assert.match(app,/verifiedTelegramSubject\(data\?\.identities\)/)
 assert.match(app,/body\.confirm!==true/)
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
})
