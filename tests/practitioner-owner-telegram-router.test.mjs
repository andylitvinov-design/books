import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseOwnerRouterUpdate,ownerRouterButtons,ownerRouterReceipt,ownerRouterTask}
 from '../lib/practitioners/owner-telegram-router.mjs'
import {sanitizeTask} from '../lib/command-center/contracts.mjs'

const NOW=1794078000000
const owner={id:123456789,username:'AndyTherapist',is_bot:false}
const msg={update_id:501,message:{message_id:77,date:NOW/1000,
 chat:{type:'private',id:owner.id},from:owner,
 text:'Исправь ошибку записи и проверь CI перед публикацией на сайте'}}
const parse=x=>parseOwnerRouterUpdate(x,NOW)
const id='a1191900-11aa-4afa-8afa-111111111111'
test('plain text is accepted as a draft with exactly two destination choices',()=>{
 const intake=parse(msg)
 assert.equal(intake.kind,'text')
 assert.equal(intake.action,'intake')
 const receipt=ownerRouterReceipt(intake.kind,id)
 assert.match(receipt.text,/Спасибо, сообщение принято\. Кому отправить\?/)
 const buttons=receipt.reply_markup.inline_keyboard.flat()
 assert.equal(buttons.length,2)
 assert.deepEqual(buttons.map(x=>x.text),['🧠 Совет ИИ','🛠 Agent Commander'])
 assert.deepEqual(buttons.map(x=>x.callback_data),['hh-route:c:'+id,'hh-route:a:'+id])
 assert.ok(buttons.every(x=>x.callback_data.length<=64))
})
test('Telegram native voice captures metadata, defers STT until explicit selection',()=>{
 const event=parse({...msg,update_id:502,message:{...msg.message,text:undefined,
  voice:{file_id:'AwACAgIAAxkBAAAB0123456789VOICE0123456789',file_size:25000,duration:23}}})
 assert.equal(event.kind,'voice')
 assert.equal(event.payload.note.mime,'audio/ogg')
 assert.equal(event.payload.note.locale,'ru')
 const notice=ownerRouterReceipt('voice',id)
 assert.match(notice.text,/Google Gemini Free Tier/)
 assert.equal(notice.reply_markup.inline_keyboard.flat().length,2)
})
test('callback requires verified owner private chat, authentic bot and exact draft UUID',()=>{
 const update={update_id:503,callback_query:{
  id:'cb-001',data:'hh-route:a:'+id,from:owner,
  message:{chat:msg.message.chat,from:{username:'Andydotbot',is_bot:true},message_id:51,date:NOW/1000}}}
 assert.equal(parse(update).target,'commander')
 assert.equal(parse({...update,callback_query:{...update.callback_query,data:'hh-route:c:'+id}}).target,'council')
 assert.equal(parse({...update,callback_query:{...update.callback_query,data:'hh-route:a:wrong'}}),null)
 assert.equal(parse({...update,callback_query:{...update.callback_query,message:{
  ...update.callback_query.message,from:{username:'EvilBot',is_bot:true}}}}),null)
 assert.equal(parse({...update,callback_query:{...update.callback_query,from:{...owner,id:1}}}),null)
})
test('existing Council, audio, video, /start and ForceReply never enter new routing',()=>{
 for(const cmd of ['/all мой вопрос','/ai','/audio','/combine','/start video','/done','/status']){
  assert.equal(parse({...msg,message:{...msg.message,text:cmd}}),null,cmd)
 }
 assert.equal(parse({...msg,message:{...msg.message,reply_to_message:{
  from:{is_bot:true,username:'Andydotbot'},text:'AI Console · Спросить всех'}}}),null)
 assert.equal(parse({...msg,message:{...msg.message,text:'/compose'}}).action,'help')
 assert.equal(parse({...msg,message:{...msg.message,text:'/task Новая задача в Commander'}}).action,'intake')
})
test('owner identity, short, long and sensitive content fail closed',()=>{
 assert.equal(parse({...msg,message:{...msg.message,date:100}}),null)
 assert.equal(parse({...msg,message:{...msg.message,from:{...owner,id:9}}}),null)
 assert.equal(parse({...msg,message:{...msg.message,chat:{id:owner.id,type:'group'}}}),null)
 assert.equal(parse({...msg,message:{...msg.message,text:'X'}}).action,'too_short')
 assert.equal(parse({...msg,message:{...msg.message,text:'X'.repeat(2001)}}).action,'too_long')
 assert.equal(parse({...msg,message:{...msg.message,text:'Контакт test@example.com'}}).action,'sensitive')
})
test('Commander task retains long text without enabling source-writing workers',()=>{
 const text='Исправь ошибку кнопки и проверь публикацию. '+'Проверить CI и выполнение в браузере. '.repeat(25)
 const draft=ownerRouterTask(text)
 assert.ok(draft)
 assert.equal(draft.kind,'code_change')
 assert.equal(draft.description,text.trim())
 assert.equal(draft.autoAllowed,false)
 assert.equal(draft.sourceRef,null)
 assert.ok(sanitizeTask(draft))
 assert.equal(ownerRouterTask('Подготовь концепцию бизнес-проекта').kind,'product_spec')
 assert.equal(ownerRouterTask('abc'),null)
})
test('signed webhook checks router after video but before legacy audio inbox',()=>{
 const src=readFileSync(new URL('../app/api/app/notification-channels/telegram/webhook/route.js',import.meta.url),'utf8')
 assert.match(src,/verifyClientTelegramSecret/)
 assert.ok(src.indexOf('receiveOwnerTelegramVideoWebhook(config,update')<
  src.indexOf('if(parseOwnerRouterUpdate(update))'))
 assert.ok(src.indexOf('if(parseOwnerRouterUpdate(update))')<
  src.indexOf('const audio=await receiveOwnerTelegramAudioWebhook(config,update)'))
 assert.match(src,/after\(async\(\)=>/)
})
test('server encrypts one-time private drafts, writes real tasks only after owner callback',()=>{
 const src=readFileSync(new URL('../lib/practitioners/owner-telegram-router-service.js',import.meta.url),'utf8')
 const sql=readFileSync(new URL('../supabase/migrations/20261107210000_hh_owner_telegram_router_to_commander_v1.sql',import.meta.url),'utf8')
 assert.match(src,/ownerBotCredentials\(effective\)/)
 assert.match(src,/event.chatId!==credentials.chat\|\|event.userId!==credentials.chat/)
 assert.match(src,/seal\(event.payload/)
 assert.match(src,/openSealed\(row.payload_ciphertext/)
 assert.match(src,/on conflict\(source_update_id\) do nothing/)
 assert.match(src,/row.status!=='pending'/)
 assert.match(src,/await createTask\(db,safe,event.draftId\)/)
 assert.match(src,/await runOwnerCouncilFive\(text,aiEnv,fetcher\)/)
 assert.match(src,/transcribeSubscriberVoice\(note/)
 assert.match(src,/payload_ciphertext=null/)
 assert.match(sql,/FORCE ROW LEVEL SECURITY/)
 assert.match(sql,/current_setting\('hh\.owner_router',true\)='1'/)
 assert.match(sql,/REVOKE ALL[\s\S]*PUBLIC,anon,authenticated/)
 assert.match(sql,/length\(description\) BETWEEN 10 AND 2000/)
})
