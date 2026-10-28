import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  telegramInlineMarkup,telegramInlineButtonForText,telegramInlineCallbackSelection,
  telegramInlineActionAllowed,
} from '../lib/crm/telegram-inline-buttons.mjs'
import { normalizeMessengerUpdates } from '../lib/crm/messenger-webhook.js'
import {
  sendTelegramDiagnosticPrompt,acknowledgeTelegramInlineCallback,
  ensureTelegramInlineWebhookUpdates,
} from '../lib/crm/messenger-provider.js'
import { transitionTelegramDiagnostic } from '../lib/crm/telegram-diagnostic.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const WEBHOOK='https://holistichouse.vercel.app/api/app/crm/messenger/webhook/telegram'
const env=Object.freeze({
  VERCEL_ENV:'production',
  HH_CRM_MSG_TELEGRAM_ENABLED:'true',HH_CRM_MSG_TELEGRAM_TOKEN:'12345678:TEST_TOKEN_NO_NETWORK',
  HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'SYNTHETIC_INLINE_WEBHOOK_SECRET',
  HH_CRM_MSG_TELEGRAM_USERNAME:'holistichouse_bot',
  HH_CRM_MSG_TELEGRAM_PILOT_ENABLED:'true',HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:'123456789',
})
const response=result=>new Response(JSON.stringify({ok:true,result}),{
  status:200,headers:{'Content-Type':'application/json'},
})
async function mockedBotApi(work){
  const oldFetch=globalThis.fetch
  const calls=[]
  let updates=['message']
  globalThis.fetch=async (url,options={})=>{
    const method=String(url).split('/').at(-1)
    const body=options.body?JSON.parse(options.body):null
    calls.push({method,body,httpMethod:options.method||'GET'})
    if(method==='getWebhookInfo')return response({url:WEBHOOK,allowed_updates:[...updates]})
    if(method==='setWebhook'){
      updates=body.allowed_updates
      return response(true)
    }
    if(method==='sendMessage')return response({message_id:86753})
    if(method==='answerCallbackQuery')return response(true)
    if(method==='editMessageReplyMarkup')return response(true)
    throw new Error('Unexpected external API '+method)
  }
  try{return await work(calls,()=>updates)}
  finally{globalThis.fetch=oldFetch}
}
const baseCallback=({
  update_id:983241,callback_query:{
    id:'90210304982342',data:'hhv2:ru:yes',
    from:{id:123456789,is_bot:false,first_name:'QA',language_code:'ru'},
    message:{message_id:77,date:1789000000,
      chat:{id:123456789,type:'private'},from:{id:12345678,is_bot:true}},
  },
})

test('message-attached V2 and legacy V1 buttons render above text composer without slash labels',()=>{
  assert.deepEqual(telegramInlineMarkup([['Да, начинаем']],'ru'),{
    inline_keyboard:[[{text:'Да, начинаем',callback_data:'hhv2:ru:yes'}]],
  })
  assert.deepEqual(telegramInlineMarkup([["Yes, let's begin"]],'en'),{
    inline_keyboard:[[{text:"Yes, let's begin",callback_data:'hhv2:en:yes'}]],
  })
  assert.deepEqual(telegramInlineMarkup([['Sí, empezamos']],'es'),{
    inline_keyboard:[[{text:'Sí, empezamos',callback_data:'hhv2:es:yes'}]],
  })
  // Older two-button messages must remain readable even though Not now is hidden.
  assert.equal(telegramInlineCallbackSelection('hhv2:ru:notNow')?.rawText,'Не сейчас')
  assert.deepEqual(telegramInlineMarkup([['деньги/ работа','энергия/ здоровье'],['отношения','другое']], 'ru'),{
    inline_keyboard:[
      [{text:'деньги/ работа',callback_data:'hhv2:ru:business'},
        {text:'энергия/ здоровье',callback_data:'hhv2:ru:wellbeing'}],
      [{text:'отношения',callback_data:'hhv2:ru:relationships'},
        {text:'другое',callback_data:'hhv2:ru:other'}],
    ],
  })
  assert.deepEqual(telegramInlineMarkup([['/agree','/stop']],'ru'),{
    inline_keyboard:[[
      {text:'Да, продолжаем',callback_data:'hhv1:agree'},
      {text:'Остановить диалог',callback_data:'hhv1:stop'},
    ]],
  })
  assert.deepEqual(telegramInlineMarkup([['Пропустить рисунок']],'ru'),{
    inline_keyboard:[[{
      text:'Пропустить рисунок',callback_data:'hhv2:ru:skipDrawing',
    }]],
  })
  for(const label of ['<script>alert(1)</script>','https://bad.example','/execute']){
    assert.equal(telegramInlineButtonForText(label,'ru'),null)
    assert.throws(()=>telegramInlineMarkup([[label]]),/INVALID_INLINE_KEYBOARD/)
  }
  assert.equal(telegramInlineCallbackSelection('hhv2:es:business')?.rawText,'Dinero / trabajo')
  assert.deepEqual(telegramInlineCallbackSelection('hhv1:agree'),{
    rawText:'/agree',inlineAction:'v1:agree',locale:null,
  })
  for(const bad of ['hhv2:ru:code','hhv2:evil:yes','hhv1:javascript',
    'hhv2:ru:yes\nInjected','a'.repeat(80),'']){
    assert.equal(telegramInlineCallbackSelection(bad),null)
  }
})

test('a genuine Telegram private callback becomes ONE bounded synthetic inbound event',()=>{
  const events=normalizeMessengerUpdates('telegram',baseCallback)
  assert.equal(events.length,1)
  const e=events[0]
  assert.equal(e.type,'incoming')
  assert.equal(e.userId,'123456789')
  assert.equal(e.eventId,'tg:983241')
  assert.equal(e.messageId,'tgcb:90210304982342')
  assert.equal(e.inlineAction,'v2:yes')
  assert.equal(e.rawText,'Да, начинаем')
  assert.equal(e.inlineLocale,'ru')
  assert.equal(e.callbackId,'90210304982342')
  assert.equal(e.callbackMessageId,77)
  assert.equal(e.photoFileId,null)
  const first=transitionTelegramDiagnostic({
    flowVersion:2,stage:'consent',locale:'ru',consentAt:null,
  },{...e,locale:'ru'})
  assert.equal(first.stage,'focus')
  assert.equal(first.consent,true)
  assert.deepEqual(first.keyboard,[
    ['деньги/ работа','энергия/ здоровье'],['отношения','другое'],
  ])
})

test('cross-chat, forwarded bot, automated sender and invalid updates never create CRM events',()=>{
  const mutate=(fn)=>{
    const data=structuredClone(baseCallback)
    fn(data)
    return normalizeMessengerUpdates('telegram',data)
  }
  for(const change of [
    o=>{o.callback_query.from.id=222222222},
    o=>{o.callback_query.message.chat.type='group'},
    o=>{o.callback_query.message.from.is_bot=false},
    o=>{o.callback_query.from.is_bot=true},
    o=>{o.callback_query.message.message_id=0},
    o=>{o.update_id='untrusted'},
    o=>{delete o.callback_query.message},
    o=>{o.callback_query.id='bad id'},
  ]) assert.deepEqual(mutate(change),[])
  const unknown=mutate(o=>{o.callback_query.data='hhv2:ru:delete'})
  assert.equal(unknown.length,1)
  assert.equal(unknown[0].type,'callback_ignored')
  assert.equal(unknown[0].rawText,undefined)
  assert.equal(normalizeMessengerUpdates('telegram',{
    callback_query:baseCallback.callback_query,update_id:983241,
  }).length,1)
  assert.equal(normalizeMessengerUpdates('whatsapp',baseCallback).length,0)
})

test('stale or wrong-locale buttons are refused before encrypted CRM changes',()=>{
  assert.equal(telegramInlineActionAllowed('v2:yes','consent',2),true)
  assert.equal(telegramInlineActionAllowed('v2:business','focus',2),true)
  assert.equal(telegramInlineActionAllowed('v2:business','done',2),false)
  assert.equal(telegramInlineActionAllowed('v2:yes','drawing',2),false)
  assert.equal(telegramInlineActionAllowed('v2:skipDrawing','drawing',2),true)
  assert.equal(telegramInlineActionAllowed('v2:skipDrawing','photo',2),false)
  assert.equal(telegramInlineActionAllowed('v1:agree','consent',1),true)
  assert.equal(telegramInlineActionAllowed('v1:skip','photo',1),true)
  assert.equal(telegramInlineActionAllowed('v1:agree','done',1),false)
  assert.equal(telegramInlineActionAllowed('v2:yes','consent',1),false)
  const webhook=source('lib/crm/messenger-webhook.js')
  assert.match(webhook,/telegramInlineActionAllowed\(event\.inlineAction/)
  assert.match(webhook,/event\.inlineLocale!==previous\.locale/)
  assert.match(webhook,/Number\(previous\.last_update_id\)>=updateId/)
  assert.match(webhook,/pg_catalog\.pg_advisory_xact_lock/)
})

test('first valid signed incoming update upgrades existing webhook once, without hijack or dropping updates',async()=>{
  await mockedBotApi(async(calls,allowed)=>{
    const once=await ensureTelegramInlineWebhookUpdates(env)
    assert.deepEqual(once,{ready:true,updated:true})
    assert.deepEqual(allowed(),['message','callback_query'])
    const set=calls.find(x=>x.method==='setWebhook')
    assert.equal(set.httpMethod,'POST')
    assert.equal(set.body.url,WEBHOOK)
    assert.equal(set.body.secret_token,env.HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET)
    assert.equal(set.body.drop_pending_updates,false)
    assert.equal(set.body.max_connections,4)
    assert.equal(set.body.allowed_updates.includes('callback_query'),true)
    const twice=await ensureTelegramInlineWebhookUpdates(env)
    assert.deepEqual(twice,{ready:true,updated:false})
    assert.equal(calls.filter(x=>x.method==='setWebhook').length,1)
  })
})

test('provider sends six owner text replies with INLINE markup, acknowledges buttons and never opens mass send',async()=>{
  await mockedBotApi(async calls=>{
    const pushed=await sendTelegramDiagnosticPrompt({
      to:'123456789',text:'Подходит, начинаем?',
      keyboard:[['Да, начинаем']],locale:'ru',
    },env)
    assert.equal(pushed.status,'accepted')
    const msg=calls.find(x=>x.method==='sendMessage')?.body
    assert.deepEqual(msg.reply_markup.inline_keyboard[0].map(x=>x.text),
      ['Да, начинаем'])
    assert.equal(msg.reply_markup.keyboard,undefined)
    assert.equal(JSON.stringify(msg).includes(env.HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET),false)
    assert.equal(JSON.stringify(msg).includes(env.HH_CRM_MSG_TELEGRAM_TOKEN),false)
    await acknowledgeTelegramInlineCallback({
      callbackId:'90210304982342',to:'123456789',messageId:77,
    },env)
    assert.equal(calls.filter(x=>x.method==='answerCallbackQuery').length,1)
    assert.deepEqual(calls.find(x=>x.method==='editMessageReplyMarkup').body.reply_markup,
      {inline_keyboard:[]})
    assert.throws(()=>telegramInlineMarkup([['evil']]))
  })
})
test('webhook route acknowledges signed private callback and catches zero unwanted sends',()=>{
  const src=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
  assert.ok(src.indexOf('verifyMessengerWebhook(provider,raw,request.headers)')<
    src.indexOf('normalizeMessengerUpdates(provider,body)'))
  assert.match(src,/ensureTelegramInlineWebhookUpdates/)
  assert.match(src,/acknowledgeTelegramInlineCallback/)
  assert.match(src,/approvedPilotGuest:intake\.approvedPilotGuest===true,locale:intake\.locale/)
  assert.doesNotMatch(src,/setInterval\(|sendCampaign|publishPublicBot/)
})
