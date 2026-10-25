import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  OWNER_AUDIO_MAX_BYTES,ownerAudioFolder,ownerAudioType,
  parseOwnerAudioMessage,parseOwnerAudioCommand,parseOwnerAudioCallback,
  ownerAudioHelpMessage,ownerAudioMaterialsMessage,audioMatchesMagic,
} from '../lib/practitioners/owner-telegram-audio-model.mjs'

const NOW=1792936800000
function voice(){
  return {update_id:612,message:{
    message_id:44,date:Math.floor(NOW/1000),
    chat:{id:123456,type:'private'},from:{id:123456,is_bot:false},
    voice:{file_id:'AgACB_A12',file_unique_id:'AABBC123',
      mime_type:'audio/ogg',file_size:3000,duration:13}
  }}
}
test('owner forwarded Telegram voice is a private inbox candidate',()=>{
  const parsed=parseOwnerAudioMessage(voice(),NOW)
  assert.equal(parsed.action,'import')
  assert.equal(parsed.mime,'audio/ogg')
  assert.equal(parsed.ext,'ogg')
  assert.equal(parsed.duration,13)
  assert.equal(parsed.fileUniqueId,'AABBC123')
  assert.match(parsed.title,/^Telegram · /)
})
test('audio, documents and formats are allowlisted',()=>{
  assert.equal(ownerAudioType('audio/opus').ext,'ogg')
  assert.equal(ownerAudioType('audio/mpeg').ext,'mp3')
  assert.equal(ownerAudioType('audio/x-m4a').ext,'m4a')
  assert.equal(ownerAudioType('application/octet-stream','memo.ogg').mime,'audio/ogg')
  assert.equal(ownerAudioType('application/pdf','memo.ogg'),null)
  assert.equal(ownerAudioType('','photo.jpg'),null)
  const withDoc=voice()
  withDoc.message.document={file_id:'AgACB_A12',file_unique_id:'AABBC123',
    mime_type:'application/pdf',file_size:3000,file_name:'report.pdf'}
  delete withDoc.message.voice
  assert.equal(parseOwnerAudioMessage(withDoc,NOW),null)
})
test('unauthorized, stale, wrong-sized and bot messages are ignored or rejected',()=>{
  const spoof=voice();spoof.message.from.id=999999
  assert.equal(parseOwnerAudioMessage(spoof,NOW),null)
  const stale=voice();stale.message.date-=1200
  assert.equal(parseOwnerAudioMessage(stale,NOW),null)
  const bot=voice();bot.message.from.is_bot=true
  assert.equal(parseOwnerAudioMessage(bot,NOW),null)
  const publicChat=voice();publicChat.message.chat.type='supergroup'
  assert.equal(parseOwnerAudioMessage(publicChat,NOW),null)
  const huge=voice();huge.message.voice.file_size=OWNER_AUDIO_MAX_BYTES+1
  assert.equal(parseOwnerAudioMessage(huge,NOW).reason,'size')
  const missing=voice();delete missing.message.voice.file_unique_id
  assert.equal(parseOwnerAudioMessage(missing,NOW).reason,'format')
})
test('Telegram callback accepts only owner private BotFather button and known folder',()=>{
  const callback={update_id:615,callback_query:{
    id:'callback321',data:'hh-audio:550e8400-e29b-41d4-a716-446655440000:meditations',
    from:{id:123456,is_bot:false},
    message:{chat:{type:'private',id:123456},from:{is_bot:true,username:'Andydotbot'}}}}
  assert.equal(parseOwnerAudioCallback(callback).folder,'meditations')
  assert.equal(ownerAudioFolder('greek'),'greek')
  assert.equal(ownerAudioFolder('reports'),null)
  callback.callback_query.data=callback.callback_query.data.replace(':meditations',':reports')
  assert.equal(parseOwnerAudioCallback(callback),null)
  callback.callback_query.data='hh-audio:550e8400-e29b-41d4-a716-446655440000:reiki'
  callback.callback_query.from.id=1111
  assert.equal(parseOwnerAudioCallback(callback),null)
})

test('private owner /audio, /materials and Telegram deep link show safe instructions',()=>{
  const audio=voice()
  delete audio.message.voice
  audio.message.text='/audio'
  assert.equal(parseOwnerAudioCommand(audio,NOW).action,'help')
  audio.message.text='/materials'
  assert.equal(parseOwnerAudioCommand(audio,NOW).action,'materials')
  audio.message.text='/start audio'
  assert.equal(parseOwnerAudioCommand(audio,NOW).action,'help')
  audio.message.text='/start '+ 'a'.repeat(32)
  assert.equal(parseOwnerAudioCommand(audio,NOW),null)
  audio.message.text='/ai'
  assert.equal(parseOwnerAudioCommand(audio,NOW),null)
  audio.message.text='/audio'
  audio.message.chat.type='supergroup'
  assert.equal(parseOwnerAudioCommand(audio,NOW),null)
  audio.message.chat.type='private'
  audio.message.from.id=90000
  assert.equal(parseOwnerAudioCommand(audio,NOW),null)
  const prompt=ownerAudioHelpMessage()
  assert.match(prompt.text,/Переслать.*Dot.*Отправить/)
  assert.match(prompt.text,/✅/)
  assert.match(prompt.text,/20 МБ/)
  assert.doesNotMatch(prompt.text,/файл уже сохранён/)
  assert.match(ownerAudioMaterialsMessage().text,/admin\/materials\/telegram/)
  assert.equal(prompt.reply_markup.inline_keyboard[0][0].url,
    'https://holistichouse.vercel.app/admin/materials/telegram')
})
test('in-chat audio entry button is owner-only and cannot alter folders by itself',()=>{
  const query={update_id:730,callback_query:{
    id:'audio-help-callback',data:'hh-audio:help',
    from:{id:123456,is_bot:false},
    message:{chat:{type:'private',id:123456},from:{is_bot:true,username:'Andydotbot'}}}}
  assert.equal(parseOwnerAudioCallback(query).action,'help')
  query.callback_query.data='hh-audio:materials'
  assert.equal(parseOwnerAudioCallback(query).action,'materials')
  query.callback_query.message.from.username='EvilBot'
  assert.equal(parseOwnerAudioCallback(query),null)
  query.callback_query.message.from.username='Andydotbot'
  query.callback_query.from.id=111111
  assert.equal(parseOwnerAudioCallback(query),null)
})
test('audio importer includes command UX, self-healing menu and owner-only website guide',()=>{
  const service=readFileSync(new URL('../lib/practitioners/owner-telegram-audio-service.js',import.meta.url),'utf8')
  const ui=readFileSync(new URL('../components/admin-telegram-audio.jsx',import.meta.url),'utf8')
  const ai=readFileSync(new URL('../lib/practitioners/owner-ai-telegram.mjs',import.meta.url),'utf8')
  const transport=readFileSync(new URL('../lib/app/client-telegram-transport.js',import.meta.url),'utf8')
  assert.match(service,/parseOwnerAudioCommand\(update,now\)/)
  assert.match(service,/ownerAudioHelpMessage\(\)/)
  assert.match(service,/registerClientTelegramWebhook\(env,\{config\}\)/)
  assert.match(service,/event.chatId!==credentials.chat\|\|event.userId!==credentials.chat/)
  assert.match(ui,/https:\/\/t\.me\/Andydotbot\?start=audio/)
  assert.match(ui,/data-owner-telegram-forward-guide/)
  assert.match(ai,/callback_data:'hh-audio:help'/)
  assert.match(transport,/scope:\{type:'chat',chat_id:chatNumber\}/)
  assert.match(service,/OWNER_AUDIO_BUCKET/)
})

test('magic-byte checks reject non-audio content with a claimed audio MIME',()=>{
  const ogg=new Uint8Array(128)
  ogg.set([79,103,103,83],0)
  assert.equal(audioMatchesMagic(ogg,'audio/ogg'),true)
  ogg[0]=60
  assert.equal(audioMatchesMagic(ogg,'audio/ogg'),false)
  assert.equal(audioMatchesMagic(new Uint8Array(128),'audio/mpeg'),false)
})
test('webhook retains secret verification, handles audio before AI and never makes drafts public',()=>{
  const route=readFileSync(new URL('../app/api/app/notification-channels/telegram/webhook/route.js',import.meta.url),'utf8')
  assert.ok(route.indexOf('if(!verifyClientTelegramSecret(')<route.indexOf('const audio=await receiveOwnerTelegramAudioWebhook(config,update)'))
  assert.ok(route.indexOf('receiveOwnerTelegramAudioWebhook(config,update)')<
    route.indexOf('receiveOwnerAiTelegramWebhook(config,update)'))
  const service=readFileSync(new URL('../lib/practitioners/owner-telegram-audio-service.js',import.meta.url),'utf8')
  assert.match(service,/data\?\.public!==false/)
  assert.match(service,/upsert:false/)
  assert.match(service,/practitioner_id=\$1/)
  const sql=readFileSync(new URL('../supabase/migrations/20261025140000_hh_telegram_owner_audio_inbox.sql',import.meta.url),'utf8')
  assert.match(sql,/force row level security/)
  assert.match(sql,/unique/)
  assert.match(sql,/hh.owner_audio_manager/)
})
