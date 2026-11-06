import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseTelegramVideoClientIngress as parse} from '../lib/app/telegram-ai-client-ingress.mjs'
import {telegramAiIntent,aiCopy} from '../lib/crm/telegram-ai-lanes.mjs'
const NOW=Date.parse('2026-11-06T22:28:00Z')
const msg=(text,extra={})=>({update_id:199,message:{chat:{id:123456,type:'private'},from:{id:123456,is_bot:false,language_code:'ru'},message_id:20,date:NOW/1000,text,...(extra.message||{})},...Object.fromEntries(Object.entries(extra).filter(([key])=>key!=='message'))})
test('explicit first-party video commands only, unrelated client bot traffic preserved',()=>{
 for(const input of ['/video лес на рассвете','/video','/hhvideo_agree','/hhvideo_confirm','/hhvideo_cancel']){
  const item=parse(msg(input),'andydotbot',NOW)
  assert.equal(item?.rawText,input)
  assert.equal(item?.eventId,'tg:199')
  assert.equal(item?.clientVideoIntent,true)
 }
 for(const text of ['/ai','/start','привет','Согласен','/tests','/voice','/confirm','/cancel'])
  assert.equal(parse(msg(text),'andydotbot',NOW),null,text)
})
test('same verified bot, sender, private chat, replay age and STOP are strict',()=>{
 assert.equal(parse(msg('/video@andydotbot лес'),'andydotbot',NOW)?.rawText,'/video лес')
 assert.equal(parse(msg('/video@otherbot лес'),'andydotbot',NOW),null)
 assert.equal(parse(msg('/video лес',{message:{from:{id:654321}}}),'andydotbot',NOW),null)
 assert.equal(parse(msg('/video лес',{message:{chat:{id:123456,type:'group'}}}),'andydotbot',NOW),null)
 assert.equal(parse(msg('/video лес',{update_id:-1}),'andydotbot',NOW),null)
 assert.equal(parse(msg('/video лес',{message:{date:NOW/1000-601}}),'andydotbot',NOW),null)
 assert.equal(parse(msg('/video лес',{message:{date:NOW/1000+121}}),'andydotbot',NOW),null)
 for(const text of ['/stop','/unsubscribe','/stop@andydotbot']){
  const stop=parse(msg(text),'andydotbot',NOW)
  assert.equal(stop?.stop,true)
  assert.equal(stop?.rawText,'/stop')
 }
})
test('video opt-in and explicit namespace do not grant automatic delivery',()=>{
 assert.deepEqual(telegramAiIntent('/hhvideo_agree'),{kind:'agree'})
 assert.equal(telegramAiIntent('/hhvideo_confirm').kind,'message')
 assert.match(aiCopy('ru','videoConsent'),/hhvideo_agree/)
 assert.match(aiCopy('en','videoReady'),/cabinet/)
 const flow=readFileSync(new URL('../lib/app/telegram-ai-video-flow.js',import.meta.url),'utf8')
 assert.match(flow,/hhvideo_confirm/)
 assert.match(flow,/verifyAiVideoBoundAccount/)
 assert.match(flow,/currentAiVideoAccount/)
 const route=readFileSync(new URL('../app/api/app/notification-channels/telegram/webhook/route.js',import.meta.url),'utf8')
 assert.ok(route.indexOf('receiveOwnerTelegramVideoWebhook')<route.indexOf('parseTelegramVideoClientIngress'))
 assert.ok(route.indexOf('parseTelegramVideoClientIngress')<route.indexOf('receiveSubscriberAiTelegramUpdate(config,update)'))
 assert.match(route,/if\(videoIngress\?\.stop&&receiveVideoAi\)await receiveVideoAi\(config,videoIngress\)/)
 assert.match(route,/aiVideoBotIdentityReady\(\)/)
 assert.match(route,/runTelegramAiQueues\(config,\{messages:2,videos:0,deliveries:3\}\)/)
 assert.doesNotMatch(route,/setWebhook\(/)
})