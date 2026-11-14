import test from 'node:test'
import assert from 'node:assert/strict'
import {telegramAiIntent,aiCopy,classifyTelegramUpdate,AI_LANES} from '../lib/crm/telegram-ai-lanes.mjs'
import {readFileSync} from 'node:fs'

test('three independent worker lanes; friendly greetings do not become video orders',()=>{
 assert.deepEqual(AI_LANES,['message','video','delivery'])
 for(const x of ['привет','Приветствую!','Ау','hello','hola','/ai','/start'])
  assert.equal(telegramAiIntent(x).kind,'hello',x)
 assert.equal(telegramAiIntent('/start hhreview_ru').kind,'diagnostic')
})
test('opt in, STOP and video goal are explicit',()=>{
 assert.equal(telegramAiIntent('Согласен').kind,'agree')
 assert.equal(telegramAiIntent('Acepto').kind,'agree')
 assert.equal(telegramAiIntent('/stop').kind,'stop')
 assert.deepEqual(telegramAiIntent('Создай видео про утренний лес'),{kind:'video',goal:'утренний лес'})
 assert.equal(telegramAiIntent('хочу видео').kind,'video_prompt')
 assert.deepEqual(telegramAiIntent('рассвет над морем',true),{kind:'video',goal:'рассвет над морем'})
 assert.equal(telegramAiIntent('привет',true).kind,'hello')
})
test('language copy and input boundary',()=>{
 for(const locale of ['ru','en','es']){
  assert.ok(aiCopy(locale,'hello').length>60)
  assert.ok(aiCopy(locale,'queued').length>10)
  assert.ok(aiCopy(locale,'videoUnavailable').length>10)
 }
 assert.equal(classifyTelegramUpdate({type:'incoming',userId:'12345',eventId:'tg:123',rawText:'hello'}),true)
 assert.equal(classifyTelegramUpdate({type:'incoming',userId:'12345',eventId:'tg:123',rawText:'hello',callbackId:'x'}),false)
 assert.equal(classifyTelegramUpdate({type:'incoming',userId:'12345',eventId:'tg:123',rawText:'hi'.repeat(601)}),false)
 assert.equal(classifyTelegramUpdate({type:'receipt',userId:'12345',eventId:'tg:123',rawText:'hello'}),false)
})


test('verified source catalogue only supports portrait, no false landscape source contract',()=>{
 const catalogue=JSON.parse(readFileSync(new URL('../data/video-catalog/scene-taxonomy.json',import.meta.url),'utf8'))
 assert.ok(catalogue.scenes.length>=4)
 assert.ok(catalogue.scenes.every(scene=>scene.allowedAspects?.includes('portrait')))
 const renderer=readFileSync(new URL('../lib/app/telegram-ai-video-render.js',import.meta.url),'utf8')
 assert.match(renderer,/requireAspect:'portrait'/)
 const mux=readFileSync(new URL('../lib/crm/telegram-ai-audio.mjs',import.meta.url),'utf8')
 assert.match(mux,/scale=360:640/)
 assert.match(renderer,/compileTelegramAiMuxArgs/)
 assert.doesNotMatch(renderer,/requireAspect:'landscape'/)
})