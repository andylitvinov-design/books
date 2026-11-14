import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseTelegramVideoClientIngress as parse} from '../lib/app/telegram-ai-client-ingress.mjs'
import {telegramAiIntent,aiCopy} from '../lib/crm/telegram-ai-lanes.mjs'
const NOW=Date.parse('2026-11-06T22:28:00Z')
const msg=(text,extra={})=>({update_id:extra.update_id??199,
 message:{chat:{id:123456,type:'private'},from:{id:123456,is_bot:false,language_code:'ru'},
 message_id:20,date:NOW/1000,text,...(extra.message||{})}})
test('new namespace does not hijack /video /start or Subscriber AI',()=>{
 for(const x of ['/hhvideo forest sunrise','/hhvideo','/hhvideo_agree','/hhvideo_confirm','/hhvideo_cancel']){
  assert.equal(parse(msg(x),'andydotbot',NOW)?.rawText,x)
 }
 for(const x of ['/video forest','/video','/ai','/start','/tests','/voice','привет','hello'])
  assert.equal(parse(msg(x),'andydotbot',NOW),null,x)
 assert.deepEqual(telegramAiIntent('/hhvideo forest'),{kind:'video',goal:'forest'})
 assert.deepEqual(telegramAiIntent('/hhvideo_agree'),{kind:'agree'})
 for(const locale of ['ru','en','es'])assert.match(aiCopy(locale,'videoConsent'),/hhvideo/)
})
test('signed private bot sender, mention, replay age, forwards and replies',()=>{
 assert.equal(parse(msg('/hhvideo@andydotbot forest'),'andydotbot',NOW)?.rawText,'/hhvideo forest')
 assert.equal(parse(msg('/hhvideo@wrong_bot forest'),'andydotbot',NOW),null)
 for(const m of [{forward_origin:{type:'user'}},{forward_date:NOW/1000},
  {reply_to_message:{message_id:4}},{is_automatic_forward:true},
  {via_bot:{id:123}},{external_reply:{origin:{type:'hidden_user'}}}])
  assert.equal(parse(msg('/hhvideo forest',{message:m}),'andydotbot',NOW),null)
 assert.equal(parse(msg('/hhvideo forest',{update_id:-1}),'andydotbot',NOW),null)
 assert.equal(parse(msg('/hhvideo forest',{message:{date:NOW/1000-601}}),'andydotbot',NOW),null)
 assert.equal(parse(msg('/hhvideo forest',{message:{from:{id:999}}}),'andydotbot',NOW),null)
})
test('keyboard replies only become state-gated candidates',()=>{
 for(const x of ['0','10','Да','No','Sí','Так себе','/watched','/stop_checkin']){
  const e=parse(msg(x),'andydotbot',NOW)
  assert.equal(e?.feedbackOnly,true,x)
  assert.equal(e?.clientVideoIntent,false,x)
 }
 assert.equal(parse(msg('11'),'andydotbot',NOW),null)
 for(const x of ['/stop','/unsubscribe'])assert.equal(parse(msg(x),'andydotbot',NOW)?.stop,true)
 const source=readFileSync(new URL('../lib/app/telegram-ai-queue.js',import.meta.url),'utf8')
 assert.match(source,/feedbackForActiveVideoState\(saved,raw\)/)
 assert.match(source,/verifyAiVideoBoundAccount\(db,config,thread,user,env\)/)
})
test('no competing CRM AI queue; keep all existing client bot and media protections',()=>{
 const f=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 const crm=f('app/api/app/crm/messenger/webhook/[provider]/route.js')
 const client=f('app/api/app/notification-channels/telegram/webhook/route.js')
 assert.doesNotMatch(crm,/receiveTelegramAiUpdate/)
 assert.match(crm,/processTelegramDiagnostic\(event,config\)/)
 assert.match(client,/aiVideoBotIdentityReady\(\)/)
 assert.match(client,/runTelegramAiQueues\(config,\{messages:2,videos:0,deliveries:3\}\)/)
 assert.match(client,/receiveSubscriberAiTelegramUpdate/)
 assert.doesNotMatch(client,/setWebhook\(/)
})
test('pending video topic cannot steal confirm, cancel or finished-media check-in',()=>{
 for(const raw of ['/hhvideo_confirm','/hhvideo_cancel','/watched','/stop_checkin','/skip_checkin'])
  assert.deepEqual(telegramAiIntent(raw,true),{kind:'message',text:raw})
 assert.deepEqual(telegramAiIntent('лес над озером',true),{kind:'video',goal:'лес над озером'})
 const source=readFileSync(new URL('../lib/app/telegram-ai-queue.js',import.meta.url),'utf8')
 assert.match(source,/event\.feedbackOnly===true\?\{kind:'message',text:raw\}/)
 assert.match(source,/awaiting_video_goal=false/)
})