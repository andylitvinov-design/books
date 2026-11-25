import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  telegramBotBusinessId, telegramCredentialPreflightReady, channelTransportReady,
} from '../lib/crm/messenger-policy.js'
import { inspectTelegramBotIdentity,ensureTelegramWebhook } from '../lib/crm/messenger-provider.js'

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
  webhookUrl='',failWebhook=false,businessCapable=false,allowedUpdates=null}={},run){
  const calls=[]
  let registeredUrl=webhookUrl
  let subscribedUpdates=allowedUpdates
  const original=globalThis.fetch
  globalThis.fetch=async (url,options={})=>{
    calls.push({url:String(url),method:options.method||'GET'})
    if(String(url).endsWith('/getMe'))
      return reply({id,is_bot:isBot,username,can_connect_to_business:businessCapable})
    if(String(url).endsWith('/getWebhookInfo')){
      if(failWebhook) throw new Error('Synthetic transport offline')
      return reply({url:registeredUrl,pending_update_count:0,
        ...(Array.isArray(subscribedUpdates)?{allowed_updates:subscribedUpdates}:{})})
    }
    if(String(url).endsWith('/setWebhook')){
      const body=JSON.parse(options.body||'{}')
      assert.equal(body.url,CALLBACK)
      assert.equal(body.drop_pending_updates,false)
      assert.equal(body.secret_token,env.HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET)
      assert.deepEqual(body.allowed_updates,
        ['message','callback_query','business_connection','business_message'])
      registeredUrl=body.url
      subscribedUpdates=body.allowed_updates
      return reply(true)
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
      webhookDeliveryError:false,businessCapable:false,businessUpdatesReady:null,
      businessAutoReplyServerEnabled:false,pilotReady:false,publicSendingEnabled:false,
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
test('owner preflight distinguishes BotFather Secretary capability and real Business subscription',async()=>{
  await simulatedProvider({webhookUrl:CALLBACK,businessCapable:true,
    allowedUpdates:['message','callback_query','business_connection','business_message']},async calls=>{
    const result=await inspectTelegramBotIdentity({...env,HH_CRM_TG_CHAT_AUTOMATION_ENABLED:'false'})
    assert.equal(result.businessCapable,true)
    assert.equal(result.businessUpdatesReady,true)
    assert.equal(result.businessAutoReplyServerEnabled,false)
    assert.deepEqual(calls.map(x=>x.method),['GET','GET'])
  })
  await simulatedProvider({webhookUrl:CALLBACK,businessCapable:true,
    allowedUpdates:['message','callback_query']},async()=>{
    const result=await inspectTelegramBotIdentity(env)
    assert.equal(result.businessCapable,true)
    assert.equal(result.businessUpdatesReady,false)
  })
  await simulatedProvider({webhookUrl:CALLBACK,businessCapable:true},async()=>{
    assert.equal((await inspectTelegramBotIdentity(env)).businessUpdatesReady,null,
      'Unknown subscription does not become a false verified green status')
  })
  await simulatedProvider({webhookUrl:'https://foreign.example',businessCapable:true,
    allowedUpdates:['business_message','business_connection']},async()=>{
    assert.equal((await inspectTelegramBotIdentity(env)).businessUpdatesReady,null,
      'A foreign webhook is NEVER repair-ready')
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
  assert.match(route,/action==='sync_telegram_business_updates'/)
  assert.match(route,/preflight.webhookState!=='connected'/)
  assert.match(route,/preflight.businessCapable!==true/)
  assert.match(route,/await ensureTelegramWebhook\(process\.env,\{ownerVerifiedSync:true\}\)/)
  assert.match(route,/if\(preflight\.webhookState!=='connected'\)/)
  assert.match(route,/if\(preflight\.businessCapable!==true\)/)
  assert.match(route,/checked.businessUpdatesReady!==true/)
  assert.match(route,/onlyKeys\(payload,\['channel'\]\)/)
  assert.match(route,/inspectTelegramBotIdentity\(\)/)
  assert.match(ui,/action\('verify_telegram',\{channel:'telegram'\}\)/)
  assert.match(ui,/action\('sync_telegram_business_updates',\{channel:'telegram'\}\)/)
  assert.match(ui,/botCheck.businessCapable===true&&\s*botCheck.businessUpdatesReady!==true/)
  assert.match(ui,/botCheck\.webhookState/)
  assert.match(provider,/channelTransportReady\('telegram',env\)/)
  assert.match(provider,/TELEGRAM_WEBHOOK_ALREADY_IN_USE/)
  assert.match(webhook,/verifyMessengerWebhook/)
  assert.doesNotMatch(provider.slice(provider.indexOf('export async function inspectTelegramBotIdentity'),
    provider.indexOf('// Called ONLY on explicit owner action; never infer')),
    /setWebhook|sendMessage|deleteWebhook|databasePool/)
})

test('only owner-verified existing Business webhook can synchronize while public transport is OFF',async()=>{
 assert.equal(channelTransportReady('telegram',env),false)
 await assert.rejects(ensureTelegramWebhook(env),{code:'CHANNEL_NOT_CONNECTED',status:503})
 await simulatedProvider({webhookUrl:CALLBACK,businessCapable:true,
   allowedUpdates:['message','callback_query']},async calls=>{
   // The owner route performs this official read-only verification before sync.
   const proof=await inspectTelegramBotIdentity(env)
   assert.equal(proof.verified,true)
   assert.equal(proof.businessCapable,true)
   assert.equal(proof.webhookState,'connected')
   assert.equal(proof.businessUpdatesReady,false)
   const result=await ensureTelegramWebhook(env,{ownerVerifiedSync:true})
   assert.equal(result.connected,true)
   const after=await inspectTelegramBotIdentity(env)
   assert.equal(after.businessUpdatesReady,true)
   assert.equal(after.businessAutoReplyServerEnabled,false,
     'Subscription repair never activates customer-facing chat automation')
   assert.equal(calls.filter(x=>x.url.endsWith('/setWebhook')).length,1)
   assert.equal(calls.some(x=>/sendMessage|sendPhoto|deleteWebhook/i.test(x.url)),false)
 })
})
test('preflight sync rejects wrong credentials, wrong environment and foreign callback',async()=>{
 const invalid=[
   {...env,HH_CRM_MSG_TELEGRAM_TOKEN:'invalid'},
   {...env,HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:''},
   {...env,HH_CRM_MSG_TELEGRAM_USERNAME:'wrong'},
   {...env,HH_CRM_MSG_TELEGRAM_ENABLED:'false'},
   {...env,VERCEL_ENV:'preview'},
 ]
 for(const sample of invalid)
   await assert.rejects(ensureTelegramWebhook(sample,{ownerVerifiedSync:true}),
     {code:'CHANNEL_NOT_CONNECTED',status:503})
 await simulatedProvider({webhookUrl:'https://attacker.example/hook',businessCapable:true},
   async calls=>{
    await assert.rejects(ensureTelegramWebhook(env,{ownerVerifiedSync:true}),
      {code:'TELEGRAM_WEBHOOK_ALREADY_IN_USE',status:409})
    assert.equal(calls.some(x=>x.method==='POST'),false)
   })
 const src=read('lib/crm/messenger-provider.js')
 assert.match(src,/ownerVerifiedSync===true&&telegramCredentialPreflightReady\(env\)/)
 assert.match(src,/\(!channelTransportReady\('telegram',env\)&&!safeOwnerSync\)/)
})

test('direct Telegram Business settings route bypasses embedded My Clients view and preserves owner-only provider actions',()=>{
 const page=read('app/[locale]/app/messages/telegram-settings/page.tsx')
 const view=read('components/app/telegram-business-setup.jsx')
 const inbox=read('components/app/messages-hub.jsx')
 const css=read('components/app/telegram-business-setup.module.css')
 const route=read('app/api/app/crm/messenger/route.js')
 assert.match(page,/TelegramBusinessSetup/)
 assert.match(page,/notFound\(\)/)
 assert.match(page,/robots:\{index:false,follow:false\}/)
 assert.doesNotMatch(page,/MessagesOrdersClients|MessagesSimpleInbox/)
 assert.match(view,/fetch\('\/api\/app\/messages\/requests\?view=owner'/)
 assert.match(view,/result\.ownerMessenger!==true/)
 assert.match(view,/UUID\.test\(result\?\.accountId/)
 assert.match(view,/access!=='ready'/)
 assert.match(view,/credentials:'same-origin'/)
 assert.match(view,/X-HH-Account-Id':accountId/)
 assert.match(view,/body:JSON\.stringify\(\{action,payload:\{channel:'telegram'\}\}\)/)
 assert.match(view,/perform\('verify_telegram'\)/)
 assert.match(view,/perform\('sync_telegram_business_updates'\)/)
 assert.match(view,/check\?\.businessCapable===true/)
 assert.match(view,/check\?\.webhookState==='connected'/)
 assert.match(view,/check\?\.businessUpdatesReady!==true/)
 assert.doesNotMatch(view,/HH_CRM_TG_CHAT_AUTOMATION_ENABLED=true|setWebhook|sendMessage|TELEGRAM_TOKEN/)
 assert.match(inbox,/data-owner-telegram-settings-shortcut/)
 assert.match(inbox,/if\(embedded&&requestData\?\.accountId\)return/)
 assert.match(inbox,/app\/messages\/telegram-settings/)
 assert.match(inbox,/if\(ownerAccountId\)\{[\s\S]*?const ownerInbox=<MessagesSimpleInbox/)
 assert.match(inbox,/data-embedded-owner-messages[\s\S]*?data-owner-telegram-settings-shortcut/)
 const member=inbox.slice(inbox.indexOf('if(embedded&&requestData?.accountId)'),inbox.indexOf('if(embedded)return'))
 assert.doesNotMatch(member,/data-owner-telegram-settings-shortcut|app\/messages\/telegram-settings/)
 assert.match(css,/min-height:48px/)
 assert.match(route,/practitionerEmailAllowed\(actor\)/)
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.match(route,/request\.headers\.get\('x-hh-account-id'\)!==actor\.id/)
});
