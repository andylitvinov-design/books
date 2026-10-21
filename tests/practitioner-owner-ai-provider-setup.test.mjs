import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('owner-only free-model settings are encrypted and verified',()=>{
  const code=read('lib/practitioners/owner-ai-provider-settings.js')
  assert.ok(code.includes("field:'owner_council_mistral_api_key'"))
  assert.ok(code.includes('seal({apiKey},MISTRAL_CONTEXT,config)'))
  assert.ok(code.includes('openSealed(row.mistral_key_ciphertext'))
  assert.ok(code.includes('gemini_free_confirmed_at'))
  assert.ok(code.includes('mistral_free_confirmed_at'))
  assert.ok(!code.includes('console.log'))
})
test('private model settings use forced RLS and deny public reads',()=>{
  const sql=read('supabase/migrations/20261021152656_hh_owner_ai_provider_free_setup_20261021.sql')
  assert.ok(sql.includes('force row level security'))
  assert.ok(sql.includes('from public,anon,authenticated,hh_app_inbox'))
  assert.ok(sql.includes('to hh_app_backend'))
  assert.ok(sql.includes('mistral_key_ciphertext text'))
})
test('owner consent is required before free model activation',()=>{
  const actions=read('app/admin/telegram-setup/actions.js')
  assert.ok(actions.includes("get('free_confirmed')==='yes'"))
  assert.ok(actions.includes("get('no_paid_billing')==='yes'"))
  assert.ok(actions.includes("if(!await requireAdminRequest())"))
  assert.ok(actions.includes('saveOwnerMistralFreeKey(config,key)'))
  assert.ok(actions.includes('confirmOwnerGeminiFreeTier(config)'))
})
test('daily and private Telegram AI chat consume the same protected settings',()=>{
  const daily=read('lib/practitioners/council-telegram-delivery.js')
  const chat=read('lib/practitioners/owner-ai-telegram-service.js')
  assert.ok(daily.includes('resolvedOwnerAiEnvironment(config,env)'))
  assert.ok(daily.includes('reviewDailyCouncil(report,aiEnv,fetcher)'))
  assert.ok(chat.includes('resolvedOwnerAiEnvironment(config,effective)'))
  assert.ok(chat.includes('askCouncilTelegram(event.question,event.mode,aiEnv,fetcher)'))
})
