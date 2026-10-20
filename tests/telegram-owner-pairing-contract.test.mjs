import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('private owner chat pairing uses application encryption and fixed AAD',()=>{
  const source=file('lib/practitioners/telegram-owner-pairing.js')
  assert.match(source,/import \{seal,openSealed\} from/)
  assert.match(source,/PRACTITIONER_ID/)
  assert.match(source,/field:'telegram_owner_chat'/)
  assert.match(source,/chat_ciphertext/)
  assert.match(source,/seal\(\{chatId:found.chatId\}/)
  assert.match(source,/openSealed\(found.chat_ciphertext/)
  assert.match(source,/\{server:true\}/)
  assert.doesNotMatch(source,/console\.log\(|TELEGRAM_BOT_TOKEN.*insert|setWebhook\(|deleteWebhook\(/)
})
test('pairing schema uses FORCE RLS and grants no reads to public roles',()=>{
  const sql=file('supabase/migrations/20261020160856_hh_telegram_owner_verified_private_pairing_20261020.sql')
  assert.match(sql,/enable row level security/i)
  assert.match(sql,/force row level security/i)
  assert.match(sql,/revoke all.*from public,anon,authenticated,hh_app_inbox/i)
  assert.match(sql,/grant select,insert,update.*hh_app_backend/i)
  assert.match(sql,/check \(/i)
  assert.doesNotMatch(sql,/TELEGRAM_BOT_TOKEN|chat_id bigint|message_text|username/)
})
test('both daily crons may pair but never send with opt-in OFF',()=>{
  const practice=file('app/api/internal/practice-telegram-digest/route.js')
  const council=file('app/api/internal/council-archive-telegram/route.js')
  for(const source of [practice,council]){
    assert.match(source,/cronAuthorized\(request,process.env\)/)
    assert.match(source,/ensureOwnerTelegramPairing\(config\)/)
    assert.match(source,/resolvedOwnerTelegramEnv\(config\)/)
    assert.match(source,/practiceTelegramConfigured\(env\)/)
    assert.match(source,/delivery_enabled:false/)
  }
})
test('Council relay and admin status cannot leak raw chat ID',()=>{
  const route=file('app/api/internal/telegram-hub/route.js')
  const pairing=file('app/api/internal/telegram-owner-discovery/route.js')
  assert.match(route,/matchGatewayKey\(request.headers.get/)
  assert.match(route,/resolvedOwnerTelegramEnv\(config\)/)
  assert.match(route,/ensureOwnerTelegramPairing\(config\)/)
  assert.match(pairing,/cronAuthorized\(request,process.env\)/)
  assert.match(pairing,/ensureOwnerTelegramPairing/)
  assert.doesNotMatch(pairing,/chat_id:|chatId:|\.chatId/)
})
