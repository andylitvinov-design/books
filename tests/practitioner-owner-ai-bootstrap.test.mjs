import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ownerAiBootstrapAuthorized} from '../lib/practitioners/owner-ai-bootstrap.mjs'

const url='https://holistichouse.vercel.app/api/internal/owner-ai-bootstrap'
const now=1792500000000
const secret='a'.repeat(64)
const env={
  VERCEL_ENV:'production',HH_OWNER_AI_TG_ENABLED:'true',
  HH_OWNER_AI_BOOTSTRAP_EXPIRES:String(now+45*60*1000),
  HH_OWNER_AI_BOOTSTRAP_SECRET:secret
}
test('temporary operator handoff only works with the exact entropy, host, path and bounded TTL',()=>{
  assert.equal(ownerAiBootstrapAuthorized(url+'?proof='+secret,env,now),true)
  for(const bad of [
    [url+'?proof='+'b'.repeat(64),env,now],
    [url+'?proof='+secret+'&x=1',env,now],
    ['https://evil.example/api/internal/owner-ai-bootstrap?proof='+secret,env,now],
    [url.replace('owner-ai-bootstrap','owner-ai-bootstrap/')+'?proof='+secret,env,now],
    [url+'?proof='+secret,{...env,VERCEL_ENV:'preview'},now],
    [url+'?proof='+secret,{...env,HH_OWNER_AI_TG_ENABLED:'false'},now],
    [url+'?proof='+secret,{...env,HH_OWNER_AI_BOOTSTRAP_SECRET:'short'},now],
    [url+'?proof='+secret,{...env,HH_OWNER_AI_BOOTSTRAP_EXPIRES:String(now+3*60*60*1000)},now],
    [url+'?proof='+secret,env,now+46*60*1000],
  ])assert.equal(ownerAiBootstrapAuthorized(...bad),false)
})
test('one-time setup is same-bot, verified owner, idempotent and not a message send',()=>{
 const route=readFileSync(new URL('../app/api/internal/owner-ai-bootstrap/route.js',import.meta.url),'utf8')
 const transport=readFileSync(new URL('../lib/app/client-telegram-transport.js',import.meta.url),'utf8')
 const service=readFileSync(new URL('../lib/practitioners/owner-ai-telegram-service.js',import.meta.url),'utf8')
 const cron=readFileSync(new URL('../app/api/internal/practice-telegram-digest/route.js',import.meta.url),'utf8')
 assert.match(route,/ownerAiBootstrapAuthorized\(request.url,process.env\)/)
 assert.match(route,/getAppConfig\(\)/)
 assert.match(route,/registerClientTelegramWebhook\(process.env,\{config\}\)/)
 assert.match(route,/result\.ownerAiCommandsReady!==true/)
 assert.match(route,/PRIVATE_HEADERS/)
 assert.doesNotMatch(route,/sendOwnerDocument|sendClientTelegramMessage|console\.(log|error)|getUpdates/)
 assert.match(transport,/existing\?\.url&&existing\.url!==expected/)
 assert.match(transport,/verifyOwnerTelegram\(paired\)/)
 assert.match(transport,/setMyCommands/)
 assert.match(transport,/getMyCommands/)
 assert.match(transport,/allowed_updates:\['message','callback_query'\]/)
 assert.match(transport,/drop_pending_updates:false/)
 assert.match(service,/if\(event.action==='menu'&&!event.callbackId\)/)
 assert.match(service,/verifyClientBot\(env,\{requireWebhook:true\}\)/)
 assert.match(service,/registerClientTelegramWebhook\(env,\{config\}\)/)
 assert.match(cron,/cronAuthorized\(request,process.env\)/)
 assert.match(cron,/registerClientTelegramWebhook\(env,\{config\}\)/)
 assert.match(cron,/deliverDailyPracticeDigest\(config,\{env\}\)/)
})
