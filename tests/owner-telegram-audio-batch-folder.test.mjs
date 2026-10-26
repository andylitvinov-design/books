import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  OWNER_AUDIO_FOLDERS,ownerAudioCombineKeyboard,parseOwnerAudioCallback,
  parseOwnerAudioCommand,ownerAudioHelpMessage,
} from '../lib/practitioners/owner-telegram-audio-model.mjs'

const ID='550e8400-e29b-41d4-a716-446655440000'
const OLD='550e8400-e29b-41d4-a716-446655440001'
const NOW=1793035200000
const source=relative=>readFileSync(new URL(relative,import.meta.url),'utf8')
function callback(data,owner=123456){
  return {update_id:815,callback_query:{
    id:'cb-owner-audio-815',data,
    from:{id:owner,is_bot:false},
    message:{chat:{type:'private',id:123456},
      from:{is_bot:true,username:'Andydotbot'}},
  }}
}
function command(body){
  return {update_id:813,message:{
    date:Math.floor(NOW/1000),text:body,
    chat:{type:'private',id:123456},from:{id:123456,is_bot:false},
  }}
}

test('selected output folder is independent, seven owner folders, <=64-byte callbacks',()=>{
  const keyboard=ownerAudioCombineKeyboard(ID,'meditations',2)
  const buttons=keyboard.inline_keyboard.flat()
  const byFolder=buttons.filter(item=>item.callback_data?.startsWith('hh-audio:bf:'))
  assert.deepEqual(byFolder.map(item=>item.callback_data).sort(),
    OWNER_AUDIO_FOLDERS.map(item=>'hh-audio:bf:'+ID+':'+item.id).sort())
  assert.ok(byFolder.find(item=>item.callback_data.endsWith(':meditations')).text.startsWith('✅'))
  assert.ok(byFolder.find(item=>item.callback_data.endsWith(':inbox')))
  assert.ok(buttons.some(item=>item.callback_data==='hh-audio:done:'+ID))
  assert.ok(buttons.some(item=>item.callback_data==='hh-audio:cancel:'+ID))
  assert.ok(buttons.every(item=>!item.callback_data||
    Buffer.byteLength(item.callback_data,'utf8')<=64))
  assert.throws(()=>ownerAudioCombineKeyboard('bad-batch','inbox',2))
  assert.throws(()=>ownerAudioCombineKeyboard(ID,'client-reports',2))
})
test('no premature finish button; finish appears after two saved clips',()=>{
  for(const count of [0,1]){
    const keyboard=ownerAudioCombineKeyboard(ID,'reiki',count)
    assert.equal(keyboard.inline_keyboard.flat().some(b=>b.callback_data?.startsWith('hh-audio:done:')),false)
  }
  const ready=ownerAudioCombineKeyboard(ID,'reiki',2)
  assert.ok(ready.inline_keyboard.flat().some(b=>b.text.includes('Готово')))
  assert.ok(ownerAudioCombineKeyboard(ID,'reiki',12).inline_keyboard.flat().some(b=>b.text.includes('12 аудио')))
  assert.ok(ownerAudioCombineKeyboard(ID,'reiki',13).inline_keyboard.flat().some(b=>b.text.includes('12 аудио')))
})
test('batch-specific folder/finish/cancel callbacks validate owner, bot and batch ID',()=>{
  const folder=parseOwnerAudioCallback(callback('hh-audio:bf:'+ID+':reiki'))
  assert.equal(folder.action,'combine-folder')
  assert.equal(folder.batchId,ID)
  assert.equal(folder.folder,'reiki')
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:done:'+ID)).action,'done')
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:cancel:'+ID)).action,'cancel')
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:resend:'+ID)).action,'resend')
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:resend:'+ID)).batchId,ID)
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:resend:'+ID+':reiki')),null)
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:bf:'+OLD+':greek')).batchId,OLD)
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:bf:'+ID+':private-client')),null)
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:bf:not-an-id:reiki')),null)
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:done:'+ID+':reiki')),null)
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:done')).action,'legacy-batch-button')
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:cancel')).action,'legacy-batch-button')
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:done:'+ID,999999)),null)
  const bot=callback('hh-audio:bf:'+ID+':reiki')
  bot.callback_query.message.from.username='FakeBot'
  assert.equal(parseOwnerAudioCallback(bot),null)
})
test('private Telegram deep link starts combine and previous audio flows remain',()=>{
  assert.equal(parseOwnerAudioCommand(command('/start combine'),NOW)?.action,'combine')
  assert.equal(parseOwnerAudioCommand(command('/combine'),NOW)?.action,'combine')
  assert.equal(parseOwnerAudioCommand(command('/start audio'),NOW)?.action,'help')
  assert.equal(parseOwnerAudioCommand(command('/audio'),NOW)?.action,'help')
  assert.equal(parseOwnerAudioCommand(command('/done'),NOW)?.action,'done')
  const spoof=command('/start combine');spoof.message.from.id=999999
  assert.equal(parseOwnerAudioCommand(spoof,NOW),null)
  assert.match(ownerAudioHelpMessage().text,/папку для ИТОГОВОГО файла/)
})
test('source contract: folder is used at save, retries and owner-only callbacks',()=>{
  const service=source('../lib/practitioners/owner-telegram-audio-service.js')
  const schema=source('../supabase/migrations/20261026145000_hh_telegram_audio_batch_folder.sql')
  const ui=source('../components/admin-telegram-audio.jsx')
  assert.match(service,/selectAudioCombineFolder\(config,event\)/)
  assert.match(service,/session\.batch_id!==event\.batchId/)
  assert.match(service,/result_folder=\$2,last_command_update_id=\$3/)
  assert.match(service,/status!=='collecting'\|\|session\.result_audio_id/)
  assert.match(service,/folder:session\.result_folder,parts:ordered/)
  assert.match(service,/title,batch\.folder/)
  assert.doesNotMatch(service,/title,batch\.parts\[0\]\.folder/)
  assert.match(service,/sendCombinedDocument\(credentials,bytes,batch\.parts\.length,saved\.folder,fetcher\)/)
  assert.match(service,/sendOwner\(credentials,'✅ Один файл из '/)
  assert.match(service,/combineImportReply\(combine,ready\.id\)/)
  assert.ok(service.indexOf("const ready=await markAudio(config,row.id,'ready'")<
    service.indexOf("const combine=await appendAudioCombine(config,event,row.id)"))
  assert.match(service,/combinedDeliveryKeyboard\(saved\.id\)/)
  assert.match(service,/if\(batch\.state==='ready'\)return resendSavedCombined/)
  assert.match(service,/if\(event\.action==='resend'\)return resendSavedCombined/)
  assert.match(service,/\[button\('inbox'\)\]/)
  assert.match(service,/upsert:false/)
  assert.match(service,/event\.chatId!==credentials\.chat\|\|event\.userId!==credentials\.chat/)
  assert.match(schema,/add column if not exists result_folder text not null default 'inbox'/i)
  assert.match(schema,/check \(result_folder in/)
  assert.doesNotMatch(schema,/grant .* to (anon|authenticated|service_role)/i)
  assert.match(ui,/https:\/\/t\.me\/Andydotbot\?start=combine/)
  assert.match(ui,/data-owner-telegram-combine/)
  assert.match(ui,/join:'Объединить аудио'/)
  assert.match(ui,/join:'Combine audio'/)
  assert.match(ui,/join:'Unir audios'/)
  assert.equal((ui.match(/2–12/g)||[]).length,3)
})
