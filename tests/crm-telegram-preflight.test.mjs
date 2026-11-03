import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  telegramBotBusinessId, telegramCredentialPreflightReady, channelTransportReady,
} from '../lib/crm/messenger-policy.js'
import { inspectTelegramBotIdentity } from '../lib/crm/messenger-provider.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const CALLBACK = 'https://holistichouse.vercel.app/api/app/crm/messenger/webhook/telegram'
const env = Object.freeze({
  VERCEL_ENV:'production',
  HH_CRM_MSG_TELEGRAM_ENABLED:'true',
  HH_CRM_MSG_TELEGRAM_TOKEN:'12345678:TEST_FAKE_BOTFATHER_TOKEN_FOR_UNIT_ONLY',
  HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'TEST_SECRET_UNIT_20261026',
  HH_CRM_MSG_TELEGRAM_USERNAME:'holistichouse_bot',
  HH_CRM_TG_DIAGNOSTIC_ENABLED:'true',
})
const reply = result => new Response(JSON.stringify({ok:true,result}),{
  status:200,headers:{'Content-Type':'application/json'},
})
async function simulatedProvider({id=12345678,isBot=true,username='holistichouse_bot',
  webhookUrl='',failWebhook=false}={},run){
  const calls=[]
  const original=globalThis.fetch
  globalThis.fetch=async (url,options={})=>{
    calls.push({url:String(url),method:options.method||'GET'})
    if(String(url).endsWith('/getMe'))
      return reply({id,is_bot:isBot,username})
    if(String(url).endsWith('/getWebhookInfo')){
      if(failWebhook) throw new Error('Synthetic transport offline')
      return reply({url:webhookUrl,pending_update_count:0})
    }
    throw new Error('UNEXPECTED_PROVIDER_OPERATION')
  }
  try {return await run(calls)}
  finally {globalThis.fetch=original}
}

test('private Telegram BotFather credentials can be verified BEFORE pilot without opening sends',()=>{
  assert.equal(telegramBotBusinessId(env),'12345678')
  assert.equal(telegramCredentialPreflightReady(env),true)
  assert.equal(channelTransportReady('telegram',env),false)
  for(const input of [
    {...env,HH_CRM_MSG_TELEGRAM_TOKEN:'invalid'},
    {...env,HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:''},
    {...env,HH_CRM_MSG_TELEGRAM_USERNAME:'attacker.com'},
    {...env,HH_CRM_MSG_TELEGRAM_ENABLED:'false'},
    {...env,HH_CRM_MSG_TELEGRAM_BOT_ID:'87654321'},
  ]) assert.equal(telegramCredentialPreflightReady(input),false)
})

test('preflight verifies exact getMe username and ID, reads webhook without installing it',async()=>{
  await simulatedProvider({webhookUrl:''},async calls=>{
    const actual=await inspectTelegramBotIdentity(env)
    assert.deepEqual(actual,{
      verified:true,username:'holistichouse_bot',webhookState:'not_set',
      webhookDeliveryError:false,pilotReady:false,publicSendingEnabled:false,
    })
    assert.deepEqual(calls.map(x=>x.method),['GET','GET'])
    assert.ok(calls[0].url.endsWith('/getMe'))
    assert.ok(calls[1].url.endsWith('/getWebhookInfo'))
    assert.equal(calls.some(x=>/sendMessage|setWebhook|deleteWebhook|file\//i.test(x.url)),false)
  })
})

test('existing correct webhook is reported without provider changes',async()=>{
  await simulatedProvider({webhookUrl:CALLBACK},async calls=>{
    const result=await inspectTelegramBotIdentity(env)
    assert.equal(result.webhookState,'connected')
    assert.equal(calls.length,2)
  })
})
test('foreign webhook is a conflict, NEVER silently hijacked',async()=>{
  await simulatedProvider({webhookUrl:'https://other.example/webhook'},async calls=>{
    const result=await inspectTelegramBotIdentity(env)
    assert.equal(result.webhookState,'in_use_elsewhere')
    assert.equal(calls.every(x=>x.method==='GET'),true)
  })
})
test('getMe mismatch rejects a wrong bot token without reading provider webhook',async()=>{
  for(const sample of [
    {id:87654321},
    {username:'another_bot'},
    {isBot:false},
    {username:''},
  ]) await simulatedProvider(sample,async calls=>{
    await assert.rejects(inspectTelegramBotIdentity(env),
      {code:'TELEGRAM_BOT_IDENTITY_MISMATCH',status:409})
    assert.equal(calls.length,1)
  })
})
test('a network error does not turn an unknown webhook into a connected one',async()=>{
  await simulatedProvider({failWebhook:true},async ()=>{
    const result=await inspectTelegramBotIdentity(env)
    assert.equal(result.verified,true)
    assert.equal(result.webhookState,'unknown')
  })
})
test('owner API and UI require verified sign-in and explicit action; all real delivery gates remain',()=>{
  const route=read('app/api/app/crm/messenger/route.js')
  const ui=read('components/app/crm-messenger.jsx')
  const provider=read('lib/crm/messenger-provider.js')
  const webhook=read('lib/crm/messenger-webhook.js')
  assert.match(route,/auth\.verified\(\)/)
  assert.match(route,/practitionerEmailAllowed\(actor\)/)
  assert.match(route,/requireSameOrigin/)
  assert.match(route,/x-hh-account-id/)
  assert.match(route,/action==='verify_telegram'/)
  assert.match(route,/onlyKeys\(payload,\['channel'\]\)/)
  assert.match(route,/inspectTelegramBotIdentity\(\)/)
  assert.match(ui,/action\('verify_telegram',\{channel:'telegram'\}\)/)
  assert.match(ui,/botCheck\.webhookState/)
  assert.match(provider,/channelTransportReady\('telegram',env\)/)
  assert.match(provider,/TELEGRAM_WEBHOOK_ALREADY_IN_USE/)
  assert.match(webhook,/verifyMessengerWebhook/)
  assert.doesNotMatch(provider.slice(provider.indexOf('export async function inspectTelegramBotIdentity'),
    provider.indexOf('// Called ONLY on explicit owner action; never infer')),
    /setWebhook|sendMessage|deleteWebhook|databasePool/)
})
