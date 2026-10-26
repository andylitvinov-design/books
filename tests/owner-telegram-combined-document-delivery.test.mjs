import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseOwnerAudioCallback} from '../lib/practitioners/owner-telegram-audio-model.mjs'

const service=readFileSync(
  new URL('../lib/practitioners/owner-telegram-audio-service.js',import.meta.url),'utf8')
const sent=service.match(/async function sendCombinedDocument\([\s\S]*?\n}\nasync function resendSavedCombined/)
assert.ok(sent,'exact real Telegram binary sender must exist')
const source=sent[0].replace(/\nasync function resendSavedCombined$/,'')
const sendCombinedDocument=new Function('TELEGRAM','folderLabel','failure',
  source+'\nreturn sendCombinedDocument')(
    'https://api.telegram.org/bot',value=>value,
    code=>{throw new Error(code)})

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
    assert.match(options.body.get('caption'),/Рейки/)
    assert.equal(options.body.get('document').name,'combined-voice.ogg')
    assert.equal(options.body.get('document').type,'audio/ogg')
    const bytes=new Uint8Array(await options.body.get('document').arrayBuffer())
    assert.deepEqual(bytes,BYTES)
    assert.ok(!options.body.has('parse_mode'))
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
test('resend reads only the completed owner-private result, never another chat',()=>{
  assert.match(service,/if\(batch\.state==='ready'\)return resendSavedCombined\(config,event,credentials,fetcher\)/)
  assert.match(service,/if\(event\.action==='resend'\)return resendSavedCombined\(config,event,credentials,fetcher\)/)
  assert.match(service,/event\.chatId!==credentials\.chat\|\|event\.userId!==credentials\.chat/)
  assert.match(service,/event\.batchId&&row\.batch_id!==event\.batchId/)
  assert.match(service,/where session\.practitioner_id=\$1/)
  assert.match(service,/session\.result_audio_id/)
  assert.match(service,/audio\.status='ready'/)
  assert.match(service,/storage\.download\(row\.storage_path\)/)
  assert.match(service,/data\.size!==Number\(row\.bytes\)/)
  assert.match(service,/audioMatchesMagic\(bytes,'audio\/ogg'\)/)
  assert.match(service,/sendCombinedDocument\(credentials,bytes,row\.parts,row\.folder,fetcher\)/)
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
