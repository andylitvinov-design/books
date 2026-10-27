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
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:voice:'+ID)).action,'voice')
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:voice:'+ID)).batchId,ID)
  assert.equal(parseOwnerAudioCallback(callback('hh-audio:voice:'+ID+':reiki')),null)
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
  assert.equal(parseOwnerAudioCommand(command('/track'),NOW)?.action,'track')
  assert.equal(parseOwnerAudioCommand(command('/track@Andydotbot'),NOW)?.action,'track')
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
  assert.match(service,/folder:session\.result_folder,promptMessageId:session\.prompt_message_id,parts:ordered/)
  assert.match(service,/title,batch\.folder/)
  assert.doesNotMatch(service,/title,batch\.parts\[0\]\.folder/)
  assert.match(service,/sendCombinedDocument\(credentials,bytes,batch\.parts\.length,saved\.folder,fetcher,saved\.id\)/)
  assert.match(service,/sendCombinedVoice\(credentials,bytes,fetcher\)/)
  assert.doesNotMatch(service,/sendOwner\(credentials,'✅ Один файл из '/)
  assert.match(service,/updateAudioCombineProgress\(credentials,combine,fetcher\)/)
  assert.ok(service.indexOf("const ready=await markAudio(config,row.id,'ready'")<
    service.indexOf("const combine=await appendAudioCombine(config,\n        {...event,batchId:claimed.batch.batchId},row.id)"))
  assert.match(service,/combinedDeliveryKeyboard\(saved\.id\)/)
  assert.match(service,/if\(batch\.state==='ready'\)return resendSavedCombined/)
  assert.match(service,/if\(\['resend','track','voice'\]\.includes\(event\.action\)\)/)
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


test('batch inputs produce ZERO per-file messages; one editable progress receipt',async()=>{
  const service=source('../lib/practitioners/owner-telegram-audio-service.js')
  const matched=service.match(/async function importAudio\([\s\S]*?\n}\n\nconst COMBINE_MINUTES/)
  assert.ok(matched,'actual importer source must be extracted')
  const importerSource=matched[0].replace(/\n\nconst COMBINE_MINUTES$/,'')
  const create=(claim)=>{
    const events={sent:[],progress:[],append:[],uploads:[],downloads:0}
    const importer=new Function(
      'claimAudio','appendAudioCombine','telegramAudioBytes','checkedAudioStorage',
      'markAudio','updateAudioCombineProgress','editAudioCombinePrompt','sendOwner','combineImportReply',
      'folderLabel','itemLink','NO_RETRIES',
      importerSource+'\nreturn importAudio')(
      async()=>claim,
      async(_config,event,id)=>{
        events.append.push({event,id})
        return {state:'added',batchId:event.batchId,folder:'reiki',count:1,promptMessageId:42}
      },
      async()=>{events.downloads++;const bytes=new Uint8Array(128);bytes.set([79,103,103,83]);return bytes},
      async()=>({
        info:async()=>({error:{statusCode:'404',message:'Not found'}}),
        upload:async(path)=>{events.uploads.push(path);return {error:null}},
      }),
      async(_config,id)=>({id,title:'Voice',folder:'inbox'}),
      async(_credentials,batch)=>{events.progress.push(batch)},
      async(_credentials,batch)=>{events.progress.push(batch)},
      async(_credentials,msg)=>{events.sent.push(msg)},
      ()=>({extra:'',keyboard:null}),
      folder=>folder,id=>'https://example.invalid/'+id,3,
    )
    return {importer,events}
  }
  const base={id:ID,status:'processing',attempts:1,title:'Voice',folder:'inbox'}
  const event={updateId:900,bytes:128,mime:'audio/ogg',ext:'ogg'}
  const batch={batchId:ID,folder:'reiki',promptMessageId:42,count:0}
  const first=create({claimed:true,row:{...base,combine_batch_id:ID},batch})
  assert.deepEqual(await first.importer({},event,{}),{handled:true})
  assert.deepEqual(first.events.uploads,['telegram-inbox/'+ID+'.ogg'])
  assert.equal(first.events.downloads,1)
  assert.equal(first.events.append.length,1)
  assert.equal(first.events.append[0].event.batchId,ID)
  assert.equal(first.events.progress.length,1)
  assert.equal(first.events.sent.length,0,'no per-audio Telegram sendMessage')

  // Forwarding the same file again must not create a duplicate bubble.
  const duplicate=create({claimed:false,reason:'ready',row:{...base,status:'ready'},batch})
  assert.deepEqual(await duplicate.importer({},event,{}),{handled:true})
  assert.equal(duplicate.events.downloads,0)
  assert.equal(duplicate.events.sent.length,0)
  assert.equal(duplicate.events.progress.length,1)
  assert.equal(duplicate.events.append[0].event.batchId,ID)

  const regular=create({claimed:true,row:base,batch:null})
  assert.deepEqual(await regular.importer({},event,{}),{handled:true})
  assert.equal(regular.events.sent.length,1,'standalone audio stays supported')
  assert.equal(regular.events.append.length,0,'ordinary audio cannot join a newer batch')

  const rejected=create({claimed:false,reason:'batch_full',batch})
  assert.deepEqual(await rejected.importer({},event,{}),{handled:true})
  assert.equal(rejected.events.downloads,0)
  assert.equal(rejected.events.sent.length,0)
  assert.equal(rejected.events.progress.length,1)
  assert.match(service,/batch_full.*batch_too_large/s)
  assert.match(service,/editAudioCombinePrompt\(credentials,\{/)
})

test('exact two-chat-item UX and private temporary material contract',()=>{
  const service=source('../lib/practitioners/owner-telegram-audio-service.js')
  const model=source('../lib/practitioners/owner-telegram-audio-model.mjs')
  const schema=source('../supabase/migrations/20261026200720_hh_telegram_audio_private_batch_staging.sql')
  const p=service.match(/function audioCombinePrompt\([\s\S]*?\n}\nasync function editAudioCombinePrompt/)
  assert.ok(p)
  const prompt=new Function('OWNER_AUDIO_COMBINE_MAX_PARTS','folderLabel',
    p[0].replace(/\nasync function editAudioCombinePrompt$/,'')+
    '\nreturn audioCombinePrompt')(12,()=> 'Рейки')
  const initial=prompt({folder:'reiki',count:0})
  const nine=prompt({folder:'reiki',count:9})
  assert.match(initial,/0\/12/)
  assert.match(nine,/9\/12/)
  assert.match(nine,/Аудио принято/)
  assert.match(nine,/появятся отдельно в кабинете/)
  assert.match(service,/editMessageText/)
  assert.match(service,/rememberAudioCombinePrompt\(config,state\.batchId,messageId,event\.updateId\)/)
  assert.match(service,/showAudioCombinePrompt\(config,credentials,event,state,fetcher\)/)
  assert.match(service,/if\(claimed\.batch\)\{\s*\/\/ No per-file save acknowledgments/)
  assert.match(service,/const receipt=combineImportReply\(null,ready\.id\)/)
  assert.doesNotMatch(service,/await sendOwner\(credentials,'✅ Один файл из '/)
  assert.match(service,/await sendCombinedDocument\(credentials,bytes,batch\.parts\.length,saved\.folder,fetcher,saved\.id\)/)
  assert.match(service,/await deleteTemporaryAudioParts\(config,batch\.batchId,storage\)/)
  assert.match(service,/combine_batch_id is null/)
  assert.match(service,/where practitioner_id=\$1 and combine_batch_id=\$2/)
  assert.match(service,/where practitioner_id=\$1 and status='ready' and combine_batch_id is null/)
  assert.match(schema,/add column if not exists combine_batch_id uuid/)
  assert.match(schema,/add column if not exists prompt_message_id bigint/)
  assert.doesNotMatch(schema,/grant .* (anon|authenticated|service_role)/i)
  assert.match(model,/Исходные части не появляются в библиотеке/)
});

test('Combine callback exposes the tapped owner bot message ID',()=>{
  const update={update_id:992,callback_query:{
    id:'cb-992',data:'hh-audio:combine',from:{id:123456,is_bot:false},
    message:{message_id:112,chat:{id:123456,type:'private'},
      from:{is_bot:true,username:'Andydotbot'}},
  }}
  assert.equal(parseOwnerAudioCallback(update).messageId,112)
  update.callback_query.from.id=777
  assert.equal(parseOwnerAudioCallback(update),null)
})
test('old 9-note session opens visibly and failed Telegram edits never silently swallow callback',()=>{
  const service=source('../lib/practitioners/owner-telegram-audio-service.js')
  assert.ok(service.includes('event.callbackId?event.messageId:null,state.promptMessageId'))
  assert.ok(service.includes('if(id!==Number(state.promptMessageId))'))
  assert.ok(service.includes('showAudioCombinePrompt(config,credentials,event,state,fetcher)'))
  assert.ok(service.includes('rememberAudioCombinePrompt(config,state.batchId,messageId,event.updateId)'))
  assert.ok(service.includes('show_alert:!shown'))
  assert.ok(service.includes('set last_command_update_id=$2,updated_at=now()'))
  assert.ok(service.includes('and last_command_update_id=$4'))
})

test('old 12 batch entries with three re-forwarded duplicates become exactly nine originals',()=>{
  const service=source('../lib/practitioners/owner-telegram-audio-service.js')
  const match=service.match(/function combineItems\([\s\S]*?\n}\nasync function startAudioCombine/)
  assert.ok(match,'private batch reader is required')
  const combineItems=new Function(match[0].replace(/\nasync function startAudioCombine$/,'')+
    '\nreturn combineItems')()
  const originals=Array.from({length:9},(_,i)=>({
    id:'file-'+i,updateId:400+i,bytes:1000+i,
  }))
  const recovered=[...originals,
    ...originals.slice(0,3).map((item,i)=>({...item,updateId:900+i}))]
  assert.equal(recovered.length,12)
  assert.deepEqual(combineItems(recovered),originals)
  const invalid=[...recovered,{id:'file-99',updateId:'1000',bytes:1}]
  assert.deepEqual(combineItems(invalid),originals)
  assert.match(service,/part\.updateId===event\.updateId\|\|part\.id===audioId/)
  assert.match(service,/set status='building',items=\$3::jsonb,last_command_update_id=\$2/)
  assert.match(service,/console\.error\('HH_OWNER_AUDIO_COMBINE_FAILED',reason,stage\)/)
  assert.match(service,/Код: '\+reason/)
})
