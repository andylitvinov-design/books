import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {joinOggOpus,OWNER_AUDIO_COMBINE_MAX_PARTS,OWNER_AUDIO_COMBINE_MAX_BYTES}
  from '../lib/practitioners/owner-telegram-audio-join.mjs'
import {parseOwnerAudioCommand,parseOwnerAudioCallback,ownerAudioHelpMessage}
  from '../lib/practitioners/owner-telegram-audio-model.mjs'

const CRC=Uint32Array.from({length:256},(_,i)=>{
  let n=i<<24
  for(let j=0;j<8;j++)n=((n<<1)^((n&0x80000000)?0x04c11db7:0))>>>0
  return n
})
function checksum(page){
  let crc=0
  for(let i=0;i<page.length;i++)crc=((crc<<8)^CRC[((crc>>>24)^page[i])&255])>>>0
  return crc>>>0
}
function page(text,flag,serial,seq){
  const payload=Buffer.from(text)
  const buf=new Uint8Array(28+payload.length)
  buf.set(Buffer.from('OggS'),0)
  buf[5]=flag
  const view=new DataView(buf.buffer)
  view.setUint32(14,serial,true)
  view.setUint32(18,seq,true)
  buf[26]=1;buf[27]=payload.length;buf.set(payload,28)
  view.setUint32(22,checksum(buf),true)
  return buf
}
function clip(serial){
  const pages=[page('OpusHead',2,serial,0),page('OpusTags',0,serial,1),
    page('encoded Opus bytes',4,serial,2)]
  const output=new Uint8Array(pages.reduce((n,p)=>n+p.length,0))
  let offset=0;for(const part of pages){output.set(part,offset);offset+=part.length}
  return output
}
const NOW=1793001600000
function message(text){
  return {update_id:101,message:{date:NOW/1000,chat:{id:555555,type:'private'},
    from:{id:555555,is_bot:false},text}}
}
function callback(data){
  return {update_id:111,callback_query:{id:'callback-111',data,
    message:{chat:{id:555555,type:'private'},from:{is_bot:true,username:'Andydotbot'}},
    from:{id:555555,is_bot:false}}}
}
test('owner-only commands and legitimate private callback buttons',()=>{
  for(const command of ['combine','done','cancel']){
    assert.equal(parseOwnerAudioCommand(message('/'+command),NOW)?.action,command)
    assert.equal(parseOwnerAudioCommand(message('/'+command+'@Andydotbot'),NOW)?.action,command)
    assert.equal(parseOwnerAudioCallback(callback('hh-audio:'+command))?.action,
      command==='combine'?'combine':'legacy-batch-button')
  }
  const bad=message('/combine');bad.message.from.id=999
  assert.equal(parseOwnerAudioCommand(bad,NOW),null)
  const fake=callback('hh-audio:done');fake.callback_query.message.from.username='NotDot'
  assert.equal(parseOwnerAudioCallback(fake),null)
  assert.match(ownerAudioHelpMessage().text,/\/combine.*\/done/)
  assert.match(ownerAudioHelpMessage().text,/\/cancel/)
})
test('lossless Ogg chain preserves order and rewrites repeated serial numbers',()=>{
  const first=clip(123),second=clip(456)
  const result=joinOggOpus([first,second,first])
  assert.equal(result.length,first.length*2+second.length)
  assert.deepEqual(result.slice(0,first.length),first)
  assert.deepEqual(result.slice(first.length,first.length+second.length),second)
  const third=result.slice(first.length+second.length)
  assert.notDeepEqual(third,first)
  const view=new DataView(third.buffer,third.byteOffset)
  assert.notEqual(view.getUint32(14,true),123)
  const rewrittenSerial=view.getUint32(14,true)
  const secondPage=28+Buffer.byteLength('OpusHead')
  const thirdPage=secondPage+28+Buffer.byteLength('OpusTags')
  assert.equal(rewrittenSerial,new DataView(third.buffer,third.byteOffset+secondPage).getUint32(14,true))
  assert.equal(rewrittenSerial,new DataView(third.buffer,third.byteOffset+thirdPage).getUint32(14,true))
  assert.deepEqual(joinOggOpus([first,second]),joinOggOpus([first,second]))
})
test('12 Ogg/Opus voice messages can join losslessly, while 13 are rejected',()=>{
  const sources=Array.from({length:12},(_,index)=>clip(index%3===0?123:index+100))
  const joined=joinOggOpus(sources)
  assert.equal(joined.length,sources.reduce((size,part)=>size+part.length,0))
  assert.deepEqual(joined.slice(0,sources[0].length),sources[0])
  assert.throws(()=>joinOggOpus([...sources,clip(987)]),/PART_COUNT/)
})
test('reject damaged Ogg pages, fake audio, oversize and extra parts',()=>{
  const sample=clip(777)
  assert.equal(OWNER_AUDIO_COMBINE_MAX_PARTS,12)
  assert.equal(OWNER_AUDIO_COMBINE_MAX_BYTES,20_000_000)
  assert.throws(()=>joinOggOpus([sample]),/PART_COUNT/)
  assert.throws(()=>joinOggOpus(Array.from({length:13},()=>sample)),/PART_COUNT/)
  const tampered=new Uint8Array(sample);tampered[29]^=1
  assert.throws(()=>joinOggOpus([sample,tampered]),/INVALID_OPUS/)
  const notOpus=new Uint8Array(sample);notOpus[31]^=1
  assert.throws(()=>joinOggOpus([notOpus,sample]),/INVALID_OPUS/)
  assert.throws(()=>joinOggOpus([sample,sample.slice(0,-5)]),/INVALID_OPUS/)
  assert.throws(()=>joinOggOpus([new Uint8Array(20),sample]),/INVALID_OPUS/)
})
test('private PostgreSQL session, ordered storage and Telegram sender are wired before AI',()=>{
  const file=readFileSync(new URL('../lib/practitioners/owner-telegram-audio-service.js',import.meta.url),'utf8')
  const schema=readFileSync(new URL('../supabase/migrations/20261026131500_hh_telegram_owner_audio_combine.sql',import.meta.url),'utf8')
  const expansion=readFileSync(new URL('../supabase/migrations/20261026191612_hh_telegram_audio_combine_12_parts.sql',import.meta.url),'utf8')
  assert.match(file,/appendAudioCombine\(config,event,claimed\.row\.id\)/)
  assert.match(file,/result_audio_id/)
  assert.match(file,/where practitioner_id=\$1 for update/)
  assert.match(file,/items\.sort\(\(a,b\)=>a\.updateId-b\.updateId\)/)
  assert.match(file,/sendCombinedDocument\(credentials,bytes,batch\.parts\.length,saved\.folder,fetcher\)/)
  assert.match(file,/form\.set\('document'/)
  assert.match(file,/event\.chatId!==credentials\.chat\|\|event\.userId!==credentials\.chat/)
  assert.match(schema,/force row level security/i)
  assert.match(schema,/revoke all.*app_private\.telegram_owner_audio_combine[\s\S]*anon, authenticated, hh_app_inbox/)
  assert.match(schema,/hh\.owner_audio_manager/)
  assert.match(schema,/jsonb_array_length\(items\)<=8/)
  assert.match(expansion,/drop constraint if exists telegram_owner_audio_combine_items_check/i)
  assert.match(expansion,/jsonb_array_length\(items\)<=12/)
})
