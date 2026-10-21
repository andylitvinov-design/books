import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  OWNER_AI_COMMANDS,parseOwnerAiUpdate,ownerAiMenu,ownerAiPrompt,ownerAiResponseItems
} from '../lib/practitioners/owner-ai-telegram.mjs'
import {askCouncilTelegram,ownerCouncilPrompt} from '../lib/practitioners/council-free-models.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const now=1792500000000
const base={update_id:311,message:{date:now/1000,
  chat:{id:999888777,type:'private'},
  from:{id:999888777,username:'AndyTherapist',is_bot:false},
  message_id:29,text:'/ai'
}}
const event=(text,overrides={})=>({...base,update_id:311,
  message:{...base.message,text,...overrides}})
test('only verified private Telegram owner commands are recognized',()=>{
  assert.equal(parseOwnerAiUpdate(event('/ai'),now).action,'menu')
  assert.equal(parseOwnerAiUpdate(event('/gemini Сайт медленно грузится'),now).mode,'gemini')
  assert.equal(parseOwnerAiUpdate(event('/council'),now).action,'prompt')
  assert.equal(parseOwnerAiUpdate(event('/mistral'),now).mode,'mistral')
  assert.equal(parseOwnerAiUpdate(event('/stop'),now),null)
  assert.equal(parseOwnerAiUpdate(event('/start '+'a'.repeat(32)),now),null)
  assert.equal(parseOwnerAiUpdate(event('/unknown'),now),null)
  assert.equal(parseOwnerAiUpdate(event('/ai',{chat:{id:-100,type:'supergroup'}}),now),null)
  assert.equal(parseOwnerAiUpdate(event('/ai',{from:{id:999888778,username:'AndyTherapist'}}),now),null)
  assert.equal(parseOwnerAiUpdate(event('/ai',{from:{id:999888777,username:'Attacker'}}),now),null)
  assert.equal(parseOwnerAiUpdate(event('/ai',{date:(now/1000)-3600}),now),null)
  assert.equal(parseOwnerAiUpdate({update_id:'not a number',message:base.message},now),null)
})
test('owner inline keyboard is bot-authored and a ForceReply selects the next model',()=>{
  assert.deepEqual(OWNER_AI_COMMANDS.map(x=>x.command),['ai','gemini','mistral','council','cancel'])
  const buttons=ownerAiMenu().reply_markup.inline_keyboard.flat().map(x=>x.callback_data)
  assert.deepEqual(buttons,['hh-ai:both','hh-ai:gemini','hh-ai:mistral'])
  assert.equal(ownerAiPrompt('mistral').reply_markup.force_reply,true)
  const callback=parseOwnerAiUpdate({update_id:312,callback_query:{
    id:'cb-313',data:'hh-ai:mistral',
    from:base.message.from,
    message:{chat:base.message.chat,from:{is_bot:true,username:'Andydotbot'}}
  }},now)
  assert.equal(callback.mode,'mistral')
  assert.equal(callback.action,'prompt')
  assert.equal(parseOwnerAiUpdate({update_id:313,callback_query:{
    id:'cb',data:'hh-ai:both',from:base.message.from,
    message:{chat:base.message.chat,from:{is_bot:true,username:'FakeBot'}}
  }},now),null)
  const reply=event('Как улучшить CRM?',{
    reply_to_message:{from:{is_bot:true,username:'Andydotbot'},text:ownerAiPrompt('mistral').text}
  })
  assert.equal(parseOwnerAiUpdate(reply,now).mode,'mistral')
  assert.equal(parseOwnerAiUpdate(event('Как улучшить CRM?'),now),null)
  assert.equal(parseOwnerAiUpdate(event('/ai Как улучшить CRM?'),now).mode,'both')
})
test('secret, contacts and oversized client content is stopped before any model request',()=>{
  assert.equal(parseOwnerAiUpdate(event('/ai Код 123456789:abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'),now).action,'sensitive')
  assert.equal(parseOwnerAiUpdate(event('/ai Напиши клиенту person@example.com'),now).action,'sensitive')
  assert.equal(parseOwnerAiUpdate(event('/ai Ваш телефон +1 647 555 0199'),now).action,'sensitive')
  assert.equal(parseOwnerAiUpdate(event('/ai '+ 'a'.repeat(2001)),now).action,'too_long')
  assert.throws(()=>ownerCouncilPrompt('x'.repeat(2001)),/INVALID_OWNER_COUNCIL_QUESTION/)
})
test('absent AI keys never generate fabricated advice or call outside providers',async()=>{
  const noNet=()=>{throw Error('No network calls authorized')}
  const reviews=await askCouncilTelegram('Как повысить конверсию воронки?','both',{},noNet)
  assert.equal(reviews.gemini.status,'unavailable')
  assert.equal(reviews.mistral.status,'unavailable')
  const replies=ownerAiResponseItems(reviews,'both')
  assert.equal(replies.length,2)
  assert.match(replies[0].text,/подтверждённого ответа пока нет/)
  assert.doesNotMatch(replies[0].text,/✅/)
  await assert.rejects(askCouncilTelegram('Привет','unknown',{},noNet))
})
test('actual independent free-only Gemini and Mistral replies retain their precise attribution',async()=>{
  const env={
    HH_COUNCIL_GEMINI_API_KEY:'synthetic-google',
    HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED:'true',
    HH_COUNCIL_OPENROUTER_API_KEY:'synthetic-openrouter'
  }
  const model='mistralai/mistral-nemo:free'
  const calls=[]
  const fetcher=async(url,options)=>{
    calls.push(String(url))
    if(String(url).endsWith('/models'))return Response.json({data:[
      {id:'mistralai/paid',pricing:{prompt:'0.5',completion:'0.5'}},
      {id:model,pricing:{prompt:'0',completion:'0'}}
    ]})
    const data=JSON.parse(options.body)
    if(String(url).includes('generativelanguage.googleapis.com')){
      assert.match(data.contents[0].parts[0].text,/Как улучшить услуги/)
      assert.doesNotMatch(data.contents[0].parts[0].text,/публичный HTML/)
      return Response.json({candidates:[{finishReason:'STOP',
        content:{parts:[{text:'Рекомендация: добавить компактное CTA. Проверить гипотезу до выпуска.'}]}}]})
    }
    assert.equal(data.model,model)
    assert.equal(data.provider.allow_fallbacks,false)
    assert.deepEqual(data.provider.max_price,{prompt:0,completion:0,request:0,image:0})
    assert.match(data.messages[1].content,/Как улучшить услуги/)
    return Response.json({model,usage:{cost:0},
      choices:[{finish_reason:'stop',message:{content:'Предлагаю упростить регистрацию и проверить заявки в CRM.'}}]})
  }
  const reviews=await askCouncilTelegram('Как улучшить услуги?','both',env,fetcher)
  assert.equal(reviews.gemini.status,'ok')
  assert.equal(reviews.mistral.status,'ok')
  assert.equal(reviews.mistral.model,model)
  assert.equal(calls.length,3)
  const result=ownerAiResponseItems(reviews,'both')
  assert.equal(result.length,2)
  assert.match(result[0].text,/✅ Gemini · gemini/)
  assert.match(result[1].text,/✅ Mistral · mistralai/)
})
test('provider with a nonzero cost is never described as an accepted Mistral answer',async()=>{
  const model='mistralai/mistral-nemo:free'
  const result=await askCouncilTelegram('Улучши меню','mistral',
    {HH_COUNCIL_OPENROUTER_API_KEY:'synthetic'},async url=>
      String(url).endsWith('/models')
       ?Response.json({data:[{id:model,pricing:{prompt:'0',completion:'0'}}]})
       :Response.json({model,usage:{cost:0.05},
          choices:[{finish_reason:'stop',message:{content:'Нет оплаты'}}]}))
  assert.equal(result.mistral.status,'error')
  assert.equal(result.mistral.reason,'FREE_COST_NOT_VERIFIED')
  assert.doesNotMatch(ownerAiResponseItems(result,'mistral')[0].text,/✅/)
})
test('signed existing webhook, DB dedup, owner isolation and private RLS are mandatory',()=>{
  const hook=read('app/api/app/notification-channels/telegram/webhook/route.js')
  const service=read('lib/practitioners/owner-ai-telegram-service.js')
  const transport=read('lib/app/client-telegram-transport.js')
  const setup=read('app/api/app/notification-channels/telegram/setup/route.js')
  const sql=read('supabase/migrations/20261020230000_hh_owner_ai_telegram_updates_20261020.sql')
  const ui=read('components/app/customer-telegram-bot-setup.jsx')
  assert.match(hook,/verifyClientTelegramSecret/)
  assert.ok(hook.indexOf('receiveOwnerAiTelegramWebhook')<hook.indexOf('receiveClientTelegramWebhook(config,update)'))
  assert.match(service,/resolvedOwnerTelegramEnv\(config,env\)/)
  assert.match(service,/event.chatId!==credentials.chat\|\|event.userId!==credentials.chat/)
  assert.match(service,/on conflict\(update_id\) do nothing/)
  assert.match(service,/consumeRate\(config,/)
  assert.match(service,/registerClientTelegramWebhook\(env,\{config\}\)/)
  assert.match(service,/verifyClientBot\(env,\{requireWebhook:true\}\)/)
  assert.match(service,/10,3600/)
  assert.match(service,/HH_OWNER_AI_TG_ENABLED!=='true'/)
  assert.doesNotMatch(service,/from app\.crm_contacts|from app\.assessment_results|console\.log/)
  assert.match(transport,/existing\?\.url&&existing\.url!==expected/)
  assert.match(transport,/allowed_updates:\['message','callback_query'\]/)
  assert.match(transport,/scope:\{type:'chat',chat_id:chatNumber\}/)
  assert.match(setup,/practitionerEmailAllowed/)
  assert.match(setup,/requireSameOrigin/)
  assert.match(ui,/t\.aiGuide/)
  assert.match(ui,/https:\/\/t\.me\/Andydotbot/)
  assert.match(sql,/force row level security/i)
  assert.match(sql,/revoke all .*public,anon,authenticated/i)
  assert.match(sql,/on conflict|primary key/i)
  assert.doesNotMatch(sql,/question_body|prompt_text|chat_id|api_key|bot_token/i)
})
