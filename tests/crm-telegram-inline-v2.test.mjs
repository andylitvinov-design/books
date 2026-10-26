import test from 'node:test'
import assert from 'node:assert/strict'
import { transitionTelegramDiagnostic } from '../lib/crm/telegram-diagnostic.mjs'
import { buildTelegramInlineKeyboard, parseTelegramInlineCallback } from '../lib/crm/telegram-inline-keyboard.mjs'
import { normalizeMessengerUpdates } from '../lib/crm/messenger-webhook.js'
import { sendTelegramDiagnosticPrompt, acknowledgeTelegramDiagnosticButton } from '../lib/crm/messenger-provider.js'

const localeCases=['en','ru','es']
const peer='1234567890'
const botId='123456789'
const botToken=botId+':ABCdefGHijkLMNopQRstuVWxYZ_0123456789'
const callback='https://holistichouse.vercel.app/api/app/crm/messenger/webhook/telegram'
const makeEnv=()=>({
  VERCEL_ENV:'production',
  HH_CRM_MSG_TELEGRAM_ENABLED:'true',
  HH_CRM_MSG_TELEGRAM_TOKEN:botToken,
  HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'safe_test_secret',
  HH_CRM_MSG_PRODUCTION_APPROVED:'false',
  HH_CRM_MSG_TELEGRAM_PILOT_ENABLED:'true',
  HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:peer,
})

test('3-language V2 consent/focus/photo/drawing buttons are attached to the originating stage',()=>{
  for(const locale of localeCases){
    const start=transitionTelegramDiagnostic(null,{rawText:'/start hhreview_'+locale,locale})
    assert.equal(start.flowVersion,2)
    const first=buildTelegramInlineKeyboard(start.keyboard,{stage:start.stage,locale,flowVersion:2})
    assert.equal(first.length,1)
    assert.equal(first[0].length,2)
    const yes=parseTelegramInlineCallback(first[0][0].callback_data)
    assert.equal(yes?.locale,locale)
    assert.equal(yes?.stage,'consent')
    assert.equal(yes?.flowVersion,2)
    assert.equal(yes?.rawText,first[0][0].text)
    const topic=transitionTelegramDiagnostic({stage:'consent',locale,flowVersion:2}, {
      rawText:yes.rawText,locale,
    })
    assert.equal(topic.stage,'focus')
    const choices=buildTelegramInlineKeyboard(topic.keyboard,{stage:'focus',locale,flowVersion:2})
    assert.equal(choices.length,2)
    assert.equal(choices.flat().length,4)
    const business=parseTelegramInlineCallback(choices[0][0].callback_data)
    assert.equal(business?.stage,'focus')
    const photo=transitionTelegramDiagnostic({stage:'focus',locale,flowVersion:2,consentAt:'2026-10-26'}, {
      rawText:business.rawText,locale,
    })
    assert.equal(photo.stage,'photo')
    const photoSkip=buildTelegramInlineKeyboard(photo.keyboard,{stage:photo.stage,locale,flowVersion:2})[0][0]
    const parsedSkip=parseTelegramInlineCallback(photoSkip.callback_data)
    assert.equal(parsedSkip?.rawText,photoSkip.text)
    const drawing=transitionTelegramDiagnostic({stage:'question',locale,flowVersion:2,consentAt:'2026-10-26'},{
      rawText:'My goal is to resolve this situation without pressure.',locale,
    })
    assert.equal(drawing.stage,'drawing')
    const drawingSkip=buildTelegramInlineKeyboard(drawing.keyboard,{stage:'drawing',locale,flowVersion:2})[0][0]
    assert.equal(parseTelegramInlineCallback(drawingSkip.callback_data)?.rawText,drawingSkip.text)
    assert.equal(JSON.stringify(choices).includes('health record'),false)
    assert.equal(JSON.stringify(choices).includes('chat_id'),false)
  }
})

test('legacy V1 commands remain valid inline without creating a second CRM channel',()=>{
  const keys=buildTelegramInlineKeyboard([['/agree','/stop']], {
    stage:'consent',locale:'ru',flowVersion:1,
  })
  assert.deepEqual(parseTelegramInlineCallback(keys[0][0].callback_data),{
    stage:'consent',locale:'ru',flowVersion:1,rawText:'/agree',stop:false,
  })
  assert.deepEqual(parseTelegramInlineCallback(keys[0][1].callback_data),{
    stage:'consent',locale:'ru',flowVersion:1,rawText:'/stop',stop:true,
  })
})

test('invalid action, forged topic, old stage and malformed callback fail closed',()=>{
  for(const value of ['hhdiag:2:focus:yes:ru','hhdiag:1:drawing:skip:ru',
    'hhdiag:2:drawing:business:en','hhdiag:2:focus:business:xyz',
    'hhdiag:2:photo:skipPhoto:ru:extra','/stop',null,42,'x'.repeat(65)])
    assert.equal(parseTelegramInlineCallback(value),null,String(value))
  assert.throws(()=>buildTelegramInlineKeyboard([['/agree']],{
    stage:'consent',locale:'ru',flowVersion:2,
  }),/INVALID_KEYBOARD/)
  assert.throws(()=>buildTelegramInlineKeyboard([['Стоп']],{
    stage:'focus',locale:'ru',flowVersion:2,
  }),/INVALID_KEYBOARD/)
})

test('same-user private Telegram callback normalizes once; foreign or forged messages are dropped',()=>{
  const callbackData=buildTelegramInlineKeyboard([['Да, начинаем']],{
    stage:'consent',locale:'ru',flowVersion:2,
  })[0][0].callback_data
  const packet={
    update_id:9000,
    callback_query:{
      id:'AbcDEF_123',
      from:{id:1234567890,is_bot:false,first_name:'Test',language_code:'ru'},
      message:{from:{id:123456789,is_bot:true},chat:{id:1234567890,type:'private'}},
      data:callbackData,
    },
  }
  const [evt]=normalizeMessengerUpdates('telegram',packet)
  assert.equal(evt.callbackStage,'consent')
  assert.equal(evt.callbackFlowVersion,2)
  assert.equal(evt.callbackLocale,'ru')
  assert.equal(evt.rawText,'Да, начинаем')
  assert.equal(evt.callbackQueryId,'AbcDEF_123')
  assert.equal(normalizeMessengerUpdates('telegram',{
    ...packet,callback_query:{...packet.callback_query,from:{...packet.callback_query.from,id:999999999}},
  }).length,0)
  assert.equal(normalizeMessengerUpdates('telegram',{
    ...packet,callback_query:{...packet.callback_query,data:'hhdiag:2:focus:yes:ru'},
  }).length,0)
  assert.equal(normalizeMessengerUpdates('telegram',{
    ...packet,callback_query:{...packet.callback_query,message:{...packet.callback_query.message,chat:{id:1234567890,type:'group'}}},
  }).length,0)
})

async function fakeBot(fetchMock,callbackEnabled=true){
  const old=globalThis.fetch
  const body=[]
  globalThis.fetch=async (url,options={})=>{
    if(String(url).includes('/getWebhookInfo')){
      return new Response(JSON.stringify({ok:true,result:{
        url:callback,allowed_updates:callbackEnabled?['message','callback_query']:['message'],
      }}),{status:200,headers:{'Content-Type':'application/json'}})
    }
    if(String(url).includes('/sendMessage')){
      const payload=JSON.parse(options.body)
      body.push(payload)
      return new Response(JSON.stringify({ok:true,result:{message_id:100+body.length}}),{status:200})
    }
    if(String(url).includes('/answerCallbackQuery')){
      const payload=JSON.parse(options.body)
      body.push({callbackAck:payload})
      return new Response(JSON.stringify({ok:true,result:true}),{status:200})
    }
    throw new Error('Unexpected provider endpoint')
  }
  try {await fetchMock(body)}
  finally {globalThis.fetch=old}
}

test('official provider: inline consent appears above composer only after webhook subscribes callbacks',async()=>{
  const env=makeEnv()
  await fakeBot(async body=>{
    const sent=await sendTelegramDiagnosticPrompt({
      to:peer,text:'A personal intro from Andrey.',
      keyboard:[['Да, начинаем','Не сейчас']],stage:'consent',locale:'ru',
      flowVersion:2,clearReplyKeyboard:true,
    },env)
    assert.equal(sent.status,'accepted')
    assert.equal(sent.buttons,'inline')
    assert.equal(body.length,2)
    assert.equal(body[0].reply_markup.remove_keyboard,true)
    assert.deepEqual(body[1].reply_markup.inline_keyboard[0][0].text,'Да, начинаем')
    assert.equal(body[1].reply_markup.inline_keyboard[0][0].callback_data,'hhdiag:2:consent:yes:ru')
  },true)
  await fakeBot(async body=>{
    const sent=await sendTelegramDiagnosticPrompt({
      to:peer,text:'A personal intro from Andrey.',
      keyboard:[['Да, начинаем','Не сейчас']],stage:'consent',locale:'ru',
      flowVersion:2,
    },env)
    assert.equal(sent.buttons,'legacy')
    assert.equal(body.length,1)
    assert.equal(body[0].reply_markup.keyboard[0][0].text,'Да, начинаем')
    assert.equal(body[0].reply_markup.inline_keyboard,undefined)
  },false)
})

test('signed second account needs explicit owner-verified pilot approval for messages and callback acknowledgement',async()=>{
  const env=makeEnv()
  await fakeBot(async body=>{
    await assert.rejects(sendTelegramDiagnosticPrompt({
      to:'9999999999',text:'A personal intro from Andrey.',
    },env),e=>e.code==='TEST_RECIPIENT_ONLY')
    const sent=await sendTelegramDiagnosticPrompt({
      to:'9999999999',text:'A personal intro from Andrey.',approvedPilotGuest:true,
      stage:'consent',locale:'en',flowVersion:2,keyboard:[['Yes, let\'s begin','Not now']],
    },env)
    assert.equal(sent.status,'accepted')
    assert.equal(body.length,1)
    await assert.rejects(acknowledgeTelegramDiagnosticButton({
      to:'9999999999',id:'Abc_123',
    },env),e=>e.code==='TEST_RECIPIENT_ONLY')
    assert.equal(await acknowledgeTelegramDiagnosticButton({
      to:'9999999999',id:'Abc_123',approvedPilotGuest:true,
    },env),true)
    assert.equal(body.length,2)
    assert.equal(body[1].callbackAck.callback_query_id,'Abc_123')
  })
})
