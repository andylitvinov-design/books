import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('owner pilot cannot name an arbitrary recipient, message or channel',()=>{
 const route=read('app/api/app/notification-channels/telegram/test/route.js')
 assert.match(route,/export async function POST/)
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.match(route,/createRequestAuth\(request,config\)/)
 assert.match(route,/auth\.verified\(\)/)
 assert.match(route,/practitionerEmailAllowed\(actor\)/)
 assert.match(route,/x-hh-account-id/)
 assert.match(route,/reader\.read\(\)/)
 assert.match(route,/if\(!chunk\.done\)/)
 assert.doesNotMatch(route,/arrayBuffer\(\)/)
 assert.match(route,/PRIVATE_HEADERS/)
 assert.match(route,/sendOwnerTelegramPilot\(config,actor\)/)
 assert.doesNotMatch(route,/request\.json\(|chatId|recipientId|sendMessage/)
})

test('rate-limited manual pilot derives ONLY signed-in owner verified Telegram chat',()=>{
 const service=read('lib/app/client-telegram-owner-pilot.js')
 assert.match(service,/telegramClientLinkReady/)
 assert.match(service,/verifyClientBot\(env,\{requireWebhook:true\}\)/)
 assert.match(service,/transaction\(config,actor/)
 assert.match(service,/from app_private\.notification_telegram_links l/)
 assert.match(service,/l\.account_id=\$1/)
 assert.match(service,/n\.topics->>'messages'='true'/)
 assert.match(service,/l\.consent_version='hh-tg-message-alerts-v1'/)
 assert.match(service,/openSealed\(/)
 assert.match(service,/consumeRate\(config,\{scope:'hh-client-telegram-owner-test',ownerId:actor\.id\},1,600\)/)
 assert.match(service,/l\.chat_hash=\$2/)
 assert.match(service,/sendOwnerTelegramTestMessage\(/)
 assert.doesNotMatch(service,/HH_CLIENT_TG_SEND_APPROVED='true'|process\.env\.HH_CLIENT_TG_SEND_APPROVED\s*=/)
 assert.doesNotMatch(service,/from app\.crm_contacts|from app\.assessment_results/)
})

test('provider sends fixed neutral TEST text only after manual owner action',()=>{
 const provider=read('lib/app/client-telegram-transport.js')
 const portion=provider.slice(provider.indexOf('export async function sendOwnerTelegramTestMessage'))
 assert.match(portion,/telegramClientLinkReady/)
 assert.match(portion,/chat_id:chatId/)
 assert.match(portion,/sendMessage/)
 assert.match(portion,/disable_web_page_preview:true/)
 assert.match(portion,/test notification|тестовое уведомление/)
 assert.doesNotMatch(portion,/telegramClientSendReady\(/)
 assert.doesNotMatch(portion,/diagnosis|test score|health results|prescription/i)
})

test('CRM status and pilot action disclose neither chat ID nor bot secret',()=>{
 const setup=read('app/api/app/notification-channels/telegram/setup/route.js')
 const ui=read('components/app/customer-telegram-bot-setup.jsx')
 assert.match(setup,/createMessengerNotificationRepository\(config\)\.state\(actor\)/)
 assert.match(setup,/state\.ownerLinked=own\.channels\?\.telegram\?\.status==='connected'/)
 assert.match(ui,/notification-channels\/telegram\/test/)
 assert.match(ui,/state\?\.ownerLinked/)
 assert.match(ui,/state\?\.webhookVerified/)
 assert.match(ui,/providerAccepted/)
 assert.match(ui,/t\.testAccepted/)
 assert.match(ui,/t\.testRate/)
 assert.doesNotMatch(ui,/HH_CLIENT_TG_BOT_TOKEN=[A-Za-z0-9]/)
})

import {runInNewContext} from 'node:vm'
import {Readable} from 'node:stream'
import {NextRequestAdapter} from 'next/dist/server/web/spec-extension/adapters/next-request.js'
import {AppError} from '../lib/assessments/contracts.js'

const source=readFileSync('app/api/app/notification-channels/telegram/test/route.js','utf8')
 .replace(/^import .*$/gm,'').replace(/export /g,'')+'; POST'
function fixture(){
 let sent=0
 const post=runInNewContext(source,{
  NextResponse:{json:(body,{status=200}={})=>({body,status})},AppError,
  PRIVATE_HEADERS:{},getAppConfig:()=>({}),requestOrigin:()=>{},requireSameOrigin:()=>{},
  createRequestAuth:()=>({verified:async()=>({id:'owner'}),apply:r=>r}),
  practitionerEmailAllowed:()=>true,safeError:e=>({code:e.code||'SERVICE_UNAVAILABLE',status:e.status||503}),
  sendOwnerTelegramPilot:async()=>{sent++;return {providerAccepted:true,status:'accepted'}},
  setTimeout,clearTimeout,
 })
 return {post,get sent(){return sent}}
}
function request(body,headers={}){
 return NextRequestAdapter.fromNodeNextRequest({method:'POST',
  url:'https://holistichouse.vercel.app/api/app/notification-channels/telegram/test',
  headers:{'x-hh-account-id':'owner',...headers},body},new AbortController().signal)
}
test('real Next adapter empty POST stream permits exactly one owner pilot',async()=>{
 const f=fixture(),r=request(Readable.from([]),{'content-length':'0'})
 assert.notEqual(r.body,null,'Node runtime represents even empty POST as a stream')
 assert.equal((await f.post(r)).status,200)
 assert.equal(f.sent,1)
})
test('bodyless and empty chunked requests are accepted without a recipient parameter',async()=>{
 for(const body of [null,Readable.from([])]){
  const f=fixture();assert.equal((await f.post(request(body))).status,200);assert.equal(f.sent,1)
 }
})
test('nonempty declared or chunked bodies fail before any provider send',async()=>{
 for(const headers of [{'content-length':'1'},{}]){
  const f=fixture();const r=await f.post(request(Readable.from(['x']),headers))
  assert.equal(r.status,400);assert.equal(r.body.error,'INVALID_BODY');assert.equal(f.sent,0)
 }
})
test('forged account context fails before body validation or sending',async()=>{
 const f=fixture(),r=await f.post(request(Readable.from([]),{'x-hh-account-id':'other'}))
 assert.equal(r.status,409);assert.equal(f.sent,0)
})

test('stalled chunked body is cancelled within a bounded interval without sending',async()=>{
 const f=fixture();let cancelled=false
 const body=new ReadableStream({cancel(){cancelled=true}})
 const r=new Request('https://holistichouse.vercel.app/api/app/notification-channels/telegram/test',{
  method:'POST',headers:{'x-hh-account-id':'owner'},body,duplex:'half'})
 assert.equal((await f.post(r)).status,400)
 assert.equal(f.sent,0);assert.equal(cancelled,true)
})
