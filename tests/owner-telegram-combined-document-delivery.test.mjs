import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseOwnerAudioCallback} from '../lib/practitioners/owner-telegram-audio-model.mjs'

const service=readFileSync(
  new URL('../lib/practitioners/owner-telegram-audio-service.js',import.meta.url),'utf8')
const sent=service.match(/async function sendCombinedDocument\([\s\S]*?\n}\nasync function resendSavedCombined/)
assert.ok(sent,'exact real Telegram binary sender must exist')
const source=sent[0].replace(/\nasync function resendSavedCombined$/,'')
const sendCombinedDocument=new Function('TELEGRAM','folderLabel','failure','OWNER_AUDIO_MATERIALS_URL','ownerAudioIdValid',
  source+'\nreturn sendCombinedDocument')(
    'https://api.telegram.org/bot',value=>value,
    code=>{throw new Error(code)},'https://holistichouse.vercel.app/admin/materials/telegram',
    value=>/^[0-9a-f-]{36}$/.test(value))

const BYTES=new Uint8Array([79,103,103,83,0,2,3,4,5,6,7,8,9])
const credentials={token:'FAKE_TOKEN_FOR_LOCAL_TESTS',chat:'123456'}
const valid=(bytes=BYTES)=>({
  ok:true,
  json:async()=>({ok:true,result:{
    message_id:42,chat:{id:123456},
    document:{file_id:'123_test_document_file_id',file_size:bytes.length},
  }})
})

test('actual OGG bytes are posted as a Telegram document, not as a URL',async()=>{
  let calls=0
  const fetcher=async(url,options)=>{
    calls++
    assert.equal(url,'https://api.telegram.org/botFAKE_TOKEN_FOR_LOCAL_TESTS/sendDocument')
    assert.equal(options.method,'POST')
    assert.equal(options.redirect,'error')
    assert.equal(options.body.get('chat_id'),'123456')
    assert.match(options.body.get('caption'),/reiki|Рейки/)
    assert.equal(options.body.get('document').name,'combined-voice.ogg')
    assert.equal(options.body.get('document').type,'audio/ogg')
    const bytes=new Uint8Array(await options.body.get('document').arrayBuffer())
    assert.deepEqual(bytes,BYTES)
    assert.ok(!options.body.has('parse_mode'))
    assert.deepEqual(JSON.parse(options.body.get('reply_markup')),{
      inline_keyboard:[[{
        text:'📁 Мои материалы',
        url:'https://holistichouse.vercel.app/admin/materials/telegram',
      }]],
    })
    return valid()
  }
  const result=await sendCombinedDocument(credentials,BYTES,2,'reiki',fetcher)
  assert.deepEqual(result,{messageId:42})
  assert.equal(calls,1)
})
test('a missing or incorrect Telegram document receipt is NOT reported as sent',async()=>{
  const result={ok:true,result:{message_id:42,chat:{id:123456}}}
  await assert.rejects(
    sendCombinedDocument(credentials,BYTES,2,'inbox',async()=>({
      ok:true,json:async()=>result})),
    /OWNER_AUDIO_COMBINE_TELEGRAM_SEND/)
  await assert.rejects(
    sendCombinedDocument(credentials,BYTES,2,'inbox',async()=>({
      ok:true,json:async()=>({ok:true,result:{
        message_id:42,chat:{id:987654},
        document:{file_id:'valid',file_size:BYTES.length}}})})),
    /OWNER_AUDIO_COMBINE_TELEGRAM_SEND/)
  await assert.rejects(
    sendCombinedDocument(credentials,BYTES,2,'inbox',async()=>({
      ok:true,json:async()=>({ok:true,result:{
        message_id:42,chat:{id:123456},
        document:{file_id:'valid',file_size:BYTES.length+1}}})})),
    /OWNER_AUDIO_COMBINE_TELEGRAM_SEND/)
  await assert.rejects(
    sendCombinedDocument(credentials,BYTES,2,'inbox',async()=>({ok:false})),
    /OWNER_AUDIO_COMBINE_TELEGRAM_SEND/)
})

const voiceSourceMatch=service.match(/async function sendCombinedVoice\([\s\S]*?\n}\nasync function sendCombinedDocument/)
assert.ok(voiceSourceMatch,'exact Ogg/Opus sendVoice sender must exist before document sender')
const sendCombinedVoice=new Function('TELEGRAM','OWNER_AUDIO_COMBINE_MAX_BYTES','audioMatchesMagic','failure',
  voiceSourceMatch[0].replace(/\nasync function sendCombinedDocument$/,'')+
  '\nreturn sendCombinedVoice')(
    'https://api.telegram.org/bot',20_000_000,
    bytes=>bytes instanceof Uint8Array&&bytes.length>=128&&
      [79,103,103,83].every((v,i)=>bytes[i]===v),
    code=>{throw new Error(code)})

const playableBytes=new Uint8Array(128)
playableBytes.set([79,103,103,83],0)
const validVoice=(bytes=playableBytes)=>({
  ok:true,
  json:async()=>({ok:true,result:{
    message_id:143,chat:{id:123456},voice:{file_id:'telegram_voice_id',file_size:bytes.length},
  }}),
})

test('native Telegram sendVoice produces a standalone forwardable player with no text or keyboard',async()=>{
  let calls=0
  const result=await sendCombinedVoice(credentials,playableBytes,async(url,options)=>{
    calls++
    assert.equal(url,'https://api.telegram.org/botFAKE_TOKEN_FOR_LOCAL_TESTS/sendVoice')
    assert.equal(options.method,'POST')
    assert.equal(options.redirect,'error')
    assert.equal(options.body.get('chat_id'),'123456')
    assert.equal(options.body.get('voice').name,'combined-voice.ogg')
    assert.equal(options.body.get('voice').type,'audio/ogg')
    assert.deepEqual(new Uint8Array(await options.body.get('voice').arrayBuffer()),playableBytes)
    for(const forbidden of ['caption','parse_mode','reply_markup','reply_to_message_id','text','title'])
      assert.equal(options.body.has(forbidden),false,forbidden+' must not leak into shareable voice')
    assert.equal(options.body.has('document'),false)
    return validVoice()
  })
  assert.equal(calls,1)
  assert.deepEqual(result,{messageId:143})
})

test('sendVoice checks provider voice receipt, chat and media bytes; never accepts a document',async()=>{
  const tries=[
    {ok:false},
    {ok:true,json:async()=>({ok:true,result:{message_id:143,chat:{id:123456},document:{file_id:'doc'}}})},
    {ok:true,json:async()=>({ok:true,result:{message_id:143,chat:{id:2222},voice:{file_id:'v'}}})},
    {ok:true,json:async()=>({ok:true,result:{message_id:143,chat:{id:123456},voice:{file_id:'v',file_size:9999}}})},
    {ok:true,json:async()=>({ok:false,result:{message_id:143,chat:{id:123456},voice:{file_id:'v'}}})},
  ]
  for(const reply of tries)
    await assert.rejects(sendCombinedVoice(credentials,playableBytes,async()=>reply),
      /OWNER_AUDIO_COMBINE_VOICE_SEND/)
  await assert.rejects(sendCombinedVoice(credentials,new Uint8Array(129),async()=>validVoice()),
    /OWNER_AUDIO_COMBINE_VOICE_INVALID/)
})

test('the detailed document can offer a strictly batch-scoped clean voice action',async()=>{
  const id='550e8400-e29b-41d4-a716-446655440000'
  await sendCombinedDocument(credentials,BYTES,9,'meditations',async(url,options)=>{
    const keyboard=JSON.parse(options.body.get('reply_markup'))
    assert.deepEqual(keyboard.inline_keyboard[0],[{
      text:'▶️ Голосовое для пересылки',callback_data:'hh-audio:voice:'+id,
    }])
    assert.equal(keyboard.inline_keyboard[1][0].url,
      'https://holistichouse.vercel.app/admin/materials/telegram')
    return valid()
  },id)
})

test('resend reads only the completed owner-private result, never another chat',()=>{
  assert.match(service,/if\(batch\.state==='ready'\)return resendSavedCombined\(config,event,credentials,fetcher\)/)
  assert.match(service,/if\(\['resend','track','voice'\]\.includes\(event\.action\)\)/)
  assert.match(service,/event\.chatId!==credentials\.chat\|\|event\.userId!==credentials\.chat/)
  assert.match(service,/event\.batchId&&session\.batch_id!==event\.batchId/)
  assert.match(service,/where practitioner_id=\$1 for update/)
  assert.match(service,/session\.result_audio_id/)
  assert.match(service,/where id=\$1 and practitioner_id=\$2 and status='ready'/)
  assert.match(service,/last_command_update_id<\$2/)
  assert.match(service,/if\(row\?\.state==='duplicate'\)return \{handled:true\}/)
  assert.match(service,/storage\.download\(row\.storage_path\)/)
  assert.match(service,/data\.size!==Number\(row\.bytes\)/)
  assert.match(service,/audioMatchesMagic\(bytes,'audio\/ogg'\)/)
  assert.match(service,/sendCombinedDocument\(credentials,bytes,row\.parts,row\.folder,fetcher,id\)/)
  assert.match(service,/if\(voiceOnly\)/)
  assert.match(service,/sendCombinedVoice\(credentials,bytes,fetcher\)/)
  assert.match(service,/combinedDeliveryKeyboard\(id\)/)
  assert.match(service,/callback_data:'hh-audio:resend:'\+id/)
  assert.doesNotMatch(service,/storage\.upload\(row\.storage_path/)
})
test('resend button is only valid for a real Dot callback in its owner chat',()=>{
  const id='550e8400-e29b-41d4-a716-446655440000'
  const update={update_id:980,callback_query:{
    id:'callback',data:'hh-audio:resend:'+id,
    from:{id:123456,is_bot:false},
    message:{chat:{type:'private',id:123456},
      from:{username:'Andydotbot',is_bot:true}},
  }}
  assert.equal(parseOwnerAudioCallback(update)?.action,'resend')
  assert.equal(parseOwnerAudioCallback(update)?.batchId,id)
  update.callback_query.from.id=11
  assert.equal(parseOwnerAudioCallback(update),null)
  update.callback_query.from.id=123456
  update.callback_query.message.from.username='FakeBot'
  assert.equal(parseOwnerAudioCallback(update),null)
})

const savedResend=service.match(/async function resendSavedCombined\([\s\S]*?\n}\nasync function finishAudioCombine/)
assert.ok(savedResend,'owner-only resend helper must exist')
const resendSource=savedResend[0].replace(/\nasync function finishAudioCombine$/,'')

function simulatedSavedResend(row,{corrupt=false,providerFails=false,voiceFails=false}={}){
  const events={downloads:0,binaries:[],voices:[],messages:[],claims:0,cleanups:0,lastUpdate:100}
  const bytes=new Uint8Array(128)
  bytes.set([79,103,103,83],0)
  const run=new Function(
    'ownerTransaction','PRACTITIONER_ID','checkedAudioStorage',
    'sendCombinedDocument','sendCombinedVoice','sendOwner','combinedDeliveryKeyboard',
    'failure','OWNER_AUDIO_COMBINE_MAX_BYTES','OWNER_AUDIO_COMBINE_MAX_PARTS',
    'audioMatchesMagic','folderLabel','itemLink','deleteTemporaryAudioParts',
    resendSource+'\nreturn resendSavedCombined')(
    async(_,callback)=>callback({query:async(sql,values)=>{
      if(sql.includes('select batch_id,status,result_audio_id,last_command_update_id'))
        return {rows:[{...row,last_command_update_id:events.lastUpdate}]}
      if(sql.includes("set last_command_update_id=$2")){
        if(values[1]<=events.lastUpdate)return {rowCount:0,rows:[]}
        events.lastUpdate=values[1]
        events.claims++
        return {rowCount:1,rows:[{result_audio_id:row.result_audio_id}]}
      }
      if(sql.includes('select mime,bytes,storage_path,folder'))
        return {rows:[row]}
      throw Error('UNEXPECTED_SQL')
    }}),
    'owner-practitioner',
    async()=>({download:async()=>{events.downloads++;return {
      data:{size:bytes.length,arrayBuffer:async()=>bytes.buffer},
      error:null,
    }}}),
    async(_credentials,sent,parts,folder)=>{
      events.binaries.push({data:sent,parts,folder})
      if(providerFails)throw Error('TELEGRAM_FAILURE')
      return {messageId:444}
    },
    async(_credentials,sent)=>{
      events.voices.push({data:sent})
      if(voiceFails)throw Error('VOICE_PROVIDER_FAILED')
      return {messageId:445}
    },
    async(_credentials,text,keyboard)=>{
      events.messages.push({text,keyboard})
    },
    id=>({inline_keyboard:[[
      {text:'Voice',callback_data:'hh-audio:voice:'+id},
      {text:'Resend',callback_data:'hh-audio:resend:'+id},
    ]]}),
    code=>{throw new Error(code)},
    20_000_000,12,
    bytes=>!corrupt&&[79,103,103,83].every((value,i)=>bytes[i]===value),
    folder=>folder,
    id=>'https://holistichouse.vercel.app/admin/materials/telegram?item='+id,
    async()=>{events.cleanups++},
  )
  return {run,events}
}
test('finished file is resent from private Storage to Telegram with its selected folder',async()=>{
  const id='550e8400-e29b-41d4-a716-446655440000'
  const row={batch_id:id,result_audio_id:id,status:'ready',
    parts:2,mime:'audio/ogg',bytes:128,folder:'meditations',
    storage_path:'telegram-inbox/'+id+'.ogg'}
  const {run,events}=simulatedSavedResend(row)
  assert.deepEqual(await run({},{batchId:id,updateId:101},credentials),{handled:true})
  assert.equal(events.downloads,1)
  assert.equal(events.binaries.length,1)
  assert.equal(events.binaries[0].parts,2)
  assert.equal(events.binaries[0].folder,'meditations')
  assert.equal(events.binaries[0].data.length,128)
  assert.equal(events.voices.length,1,'the detailed document has a separate playable voice twin')
  assert.equal(events.messages.length,0,'successful binary delivery must be the sole final Telegram message')
  assert.equal(events.cleanups,1,'a confirmed resend also clears hidden staged sources')
})
test('stale batch button never downloads or transmits another saved audio',async()=>{
  const id='550e8400-e29b-41d4-a716-446655440000'
  const row={batch_id:id,result_audio_id:id,status:'ready',
    parts:2,mime:'audio/ogg',bytes:128,folder:'inbox',
    storage_path:'telegram-inbox/'+id+'.ogg'}
  const {run,events}=simulatedSavedResend(row)
  await run({},{batchId:'550e8400-e29b-41d4-a716-446655440001',updateId:101},credentials)
  assert.equal(events.downloads,0)
  assert.equal(events.binaries.length,0)
})
test('uncertain Telegram sending exposes only explicit resend; no fake success',async()=>{
  const id='550e8400-e29b-41d4-a716-446655440000'
  const row={batch_id:id,result_audio_id:id,status:'ready',
    parts:2,mime:'audio/ogg',bytes:128,folder:'inbox',
    storage_path:'telegram-inbox/'+id+'.ogg'}
  const {run,events}=simulatedSavedResend(row,{providerFails:true})
  await run({},{batchId:id,updateId:101},credentials)
  assert.equal(events.binaries.length,1)
  assert.match(events.messages.at(-1).text,/не подтвердил отправку/)
  assert.equal(events.messages.at(-1).keyboard.inline_keyboard[0][0].callback_data,
    'hh-audio:voice:'+id)
  assert.equal(events.messages.at(-1).keyboard.inline_keyboard[0][1].callback_data,
    'hh-audio:resend:'+id)
  assert.doesNotMatch(events.messages.at(-1).text,/повторно отправлен/)
  const corrupted=simulatedSavedResend(row,{corrupt:true})
  await corrupted.run({},{batchId:id,updateId:101},credentials)
  assert.equal(corrupted.events.binaries.length,0)
})

test('a repeated webhook update never delivers a duplicate file, a NEW owner click can',async()=>{
  const id='550e8400-e29b-41d4-a716-446655440000'
  const row={batch_id:id,result_audio_id:id,status:'ready',
    parts:2,mime:'audio/ogg',bytes:128,folder:'reiki',
    storage_path:'telegram-inbox/'+id+'.ogg'}
  const {run,events}=simulatedSavedResend(row)
  await run({},{batchId:id,updateId:101},credentials)
  await run({},{batchId:id,updateId:101},credentials)
  assert.equal(events.binaries.length,1)
  assert.equal(events.downloads,1)
  assert.equal(events.claims,1)
  await run({},{batchId:id,updateId:102},credentials)
  assert.equal(events.binaries.length,2)
  assert.equal(events.voices.length,2)
  assert.equal(events.downloads,2)
  assert.equal(events.claims,2)
})


test('an owner /track or scoped voice button sends only clean playable media, never another report',async()=>{
  const id='550e8400-e29b-41d4-a716-446655440000'
  const row={batch_id:id,result_audio_id:id,status:'ready',
    parts:9,mime:'audio/ogg',bytes:128,folder:'meditations',
    storage_path:'telegram-inbox/'+id+'.ogg'}
  const {run,events}=simulatedSavedResend(row)
  assert.deepEqual(await run({},{action:'track',updateId:101},credentials),{handled:true})
  assert.equal(events.voices.length,1)
  assert.equal(events.binaries.length,0)
  assert.equal(events.messages.length,0)
  assert.equal(events.cleanups,0,'voice replay must not change the saved master')
  await run({},{action:'track',updateId:101},credentials)
  assert.equal(events.voices.length,1,'same Telegram update never sends a duplicate')
  await run({},{action:'voice',batchId:id,updateId:102},credentials)
  assert.equal(events.voices.length,2)
  await run({},{action:'voice',batchId:'550e8400-e29b-41d4-a716-446655440001',
    updateId:103},credentials)
  assert.equal(events.voices.length,2,'stale batch cannot send another voice')
})

test('an optional sendVoice failure never retracts a delivered document or loses saved master',async()=>{
  const id='550e8400-e29b-41d4-a716-446655440000'
  const row={batch_id:id,result_audio_id:id,status:'ready',
    parts:9,mime:'audio/ogg',bytes:128,folder:'meditations',
    storage_path:'telegram-inbox/'+id+'.ogg'}
  const {run,events}=simulatedSavedResend(row,{voiceFails:true})
  await run({},{action:'resend',batchId:id,updateId:101},credentials)
  assert.equal(events.binaries.length,1,'report document succeeded')
  assert.equal(events.voices.length,1,'clean voice attempted once')
  assert.equal(events.cleanups,1,'temporary source cleanup is independent of optional voice')
  assert.equal(events.messages.length,1,'only an optional-delivery warning follows')
  assert.match(events.messages[0].text,/голосовое/)
  assert.equal(events.messages[0].keyboard.inline_keyboard[0][0].callback_data,
    'hh-audio:voice:'+id)
})
