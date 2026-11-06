import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
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
  const payload=text==='OpusHead'
    ?Buffer.concat([Buffer.from('OpusHead'),Buffer.from([1,1,0x38,1,0,0,0,0,0,0,0])])
    :Buffer.from(text)
  const buf=new Uint8Array(28+payload.length)
  buf.set(Buffer.from('OggS'),0)
  buf[5]=flag
  const view=new DataView(buf.buffer)
  view.setUint32(14,serial,true)
  view.setUint32(18,seq,true)
  view.setBigUint64(6,seq===2?48000n:0n,true)
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
  assert.equal(parseOwnerAudioCommand(message('/start combine'),NOW)?.action,'combine')
  assert.equal(parseOwnerAudioCommand(message('/start@Andydotbot combine'),NOW)?.action,'combine')
  assert.equal(parseOwnerAudioCommand(message('/start invalid'),NOW),null)
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
function pages(bytes){
  const result=[]
  let pos=0
  while(pos<bytes.length){
    assert.deepEqual(Array.from(bytes.subarray(pos,pos+4)),[79,103,103,83])
    const n=bytes[pos+26]
    let payload=0
    for(let i=0;i<n;i++)payload+=bytes[pos+27+i]
    const size=27+n+payload,part=bytes.subarray(pos,pos+size)
    const view=new DataView(part.buffer,part.byteOffset)
    result.push({flags:part[5],sequence:view.getUint32(18,true),
      serial:view.getUint32(14,true),body:part.subarray(27+n)})
    pos+=size
  }
  assert.equal(pos,bytes.length)
  return result
}
test('one playable Ogg logical stream has one identification header and one EOS',()=>{
  const first=clip(123),second=clip(456)
  const result=joinOggOpus([first,second,first]),p=pages(result)
  assert.equal(p.length,5)
  assert.equal(p.filter(x=>x.flags&2).length,1)
  assert.equal(p.filter(x=>x.flags&4).length,1)
  assert(p.every(x=>x.serial===p[0].serial))
  p.forEach((x,i)=>assert.equal(x.sequence,i))
  assert.deepEqual(p.slice(2).map(x=>Buffer.from(x.body)),
    Array.from({length:3},()=>Buffer.from('encoded Opus bytes')))
  assert(result.length<first.length*2+second.length)
})
test('12 notes remux into one continuous Ogg stream and 13 are rejected',()=>{
  const sources=Array.from({length:12},(_,i)=>clip(i%3===0?123:i+100))
  const merged=pages(joinOggOpus(sources))
  assert.equal(merged.length,14)
  assert.equal(merged.filter(page=>page.flags&4).length,1)
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
  assert.match(file,/appendAudioCombine\(config,\{\.\.\.event,batchId:claimed\.batch\.batchId\},claimed\.row\.id\)/)
  assert.match(file,/result_audio_id/)
  assert.match(file,/where practitioner_id=\$1 for update/)
  assert.match(file,/items\.sort\(\(a,b\)=>a\.updateId-b\.updateId\)/)
  assert.match(file,/sendCombinedDocument\(credentials,bytes,batch\.parts\.length,saved\.folder,fetcher,saved\.id\)/)
  assert.match(file,/sendCombinedVoice\(credentials,bytes,fetcher\)/)
  assert.match(file,/form\.set\('document'/)
  assert.match(file,/event\.chatId!==credentials\.chat\|\|event\.userId!==credentials\.chat/)
  assert.match(schema,/force row level security/i)
  assert.match(schema,/revoke all.*app_private\.telegram_owner_audio_combine[\s\S]*anon, authenticated, hh_app_inbox/)
  assert.match(schema,/hh\.owner_audio_manager/)
  assert.match(schema,/jsonb_array_length\(items\)<=8/)
  assert.match(expansion,/drop constraint if exists telegram_owner_audio_combine_items_check/i)
  assert.match(expansion,/jsonb_array_length\(items\)<=12/)
})

test('real encoded Ogg/Opus clips remux into one fully decodable recording',t=>{
  for(const binary of ['ffmpeg','ffprobe']){
    try{execFileSync(binary,['-version'],{stdio:'ignore'})}
    catch{t.skip(binary+' not installed in runner');return}
  }
  const dir=mkdtempSync(join(tmpdir(),'hh-ogg-combine-'))
  try{
    const recordings=[]
    for(const [index,duration] of [[0,0.55],[1,0.72]]){
      const filename=join(dir,'part-'+index+'.ogg')
      execFileSync('ffmpeg',[
        '-nostdin','-hide_banner','-loglevel','error',
        '-f','lavfi','-i','sine=frequency='+(330+110*index)+':duration='+duration,
        '-c:a','libopus','-b:a','24k','-y',filename,
      ],{stdio:'pipe'})
      recordings.push(new Uint8Array(readFileSync(filename)))
    }
    const bytes=joinOggOpus(recordings)
    const output=join(dir,'result.ogg')
    writeFileSync(output,bytes)
    const duration=Number(execFileSync('ffprobe',[
      '-v','error','-show_entries','format=duration',
      '-of','default=noprint_wrappers=1:nokey=1',output,
    ],{encoding:'utf8'}).trim())
    assert(duration>1.20&&duration<1.36,'merged duration includes both recordings')
    execFileSync('ffmpeg',[
      '-nostdin','-v','error','-i',output,'-f','null','-',
    ],{stdio:'pipe'})
    const stream=pages(bytes)
    assert.equal(stream.filter(page=>page.flags&2).length,1)
    assert.equal(stream.filter(page=>page.flags&4).length,1)
  }finally{rmSync(dir,{recursive:true,force:true})}
})


// Telegram/iOS can forward Ogg Opus with validated packets but no EOS flag.
const crcTable=Uint32Array.from({length:256},(_,index)=>{
  let n=index<<24
  for(let i=0;i<8;i++)n=((n<<1)^((n&0x80000000)?0x04c11db7:0))>>>0
  return n
})
function crc(page){
  let result=0
  for(const byte of page)result=((result<<8)^crcTable[((result>>>24)^byte)&255])>>>0
  return result
}
function oggPages(bytes){
  const pages=[]
  let pos=0
  while(pos<bytes.length){
    assert.equal(Buffer.from(bytes.subarray(pos,pos+4)).toString(),'OggS')
    const n=bytes[pos+26]
    let content=0
    for(let i=0;i<n;i++)content+=bytes[pos+27+i]
    const size=27+n+content
    assert(pos+size<=bytes.length)
    pages.push({offset:pos,size,n,flags:bytes[pos+5]})
    pos+=size
  }
  assert.equal(pos,bytes.length)
  return pages
}
function mutateLastPage(source,{clearEOS=false,zeroGranule=false}={}){
  const bytes=new Uint8Array(source)
  const pages=oggPages(bytes)
  const last=pages.at(-1)
  assert(last.flags&4)
  if(clearEOS)bytes[last.offset+5]&=~4
  if(zeroGranule)bytes.fill(0,last.offset+6,last.offset+14)
  bytes.fill(0,last.offset+22,last.offset+26)
  const view=new DataView(bytes.buffer,bytes.byteOffset+last.offset,last.size)
  view.setUint32(22,crc(bytes.subarray(last.offset,last.offset+last.size)),true)
  return bytes
}
test('EOS-less Telegram-style voice clips remux to one fully decodable OGG',t=>{
  for(const bin of ['ffmpeg','ffprobe']) {
    try{execFileSync(bin,['-version'],{stdio:'ignore'})}
    catch{t.skip(bin+' unavailable');return}
  }
  const tmp=mkdtempSync(join(tmpdir(),'hh-eosless-'))
  try{
    const inputs=[]
    const durations=[0.47,0.72,0.56]
    durations.forEach((sec,i)=>{
      const file=join(tmp,'voice-'+i+'.ogg')
      execFileSync('ffmpeg',['-nostdin','-loglevel','error','-f','lavfi',
        '-i','sine=frequency='+(360+i*140)+':duration='+sec,
        '-c:a','libopus','-b:a','24k','-y',file])
      inputs.push(new Uint8Array(readFileSync(file)))
    })
    const eosless=inputs.map(x=>mutateLastPage(x,{clearEOS:true}))
    assert(eosless.every(x=>!(oggPages(x).at(-1).flags&4)))
    for(const parts of [[...eosless],[inputs[0],eosless[1],eosless[2]]]){
      const result=joinOggOpus(parts)
      const pages=oggPages(result)
      assert.equal(pages.filter(x=>x.flags&2).length,1)
      assert.equal(pages.filter(x=>x.flags&4).length,1)
      const final=join(tmp,'joined.ogg')
      writeFileSync(final,result)
      const reported=Number(execFileSync('ffprobe',['-v','error',
        '-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',final],
        {encoding:'utf8'}).trim())
      assert(reported>1.6&&reported<1.9,'all three recordings are present')
      execFileSync('ffmpeg',['-nostdin','-v','error','-i',final,'-f','null','-'],{stdio:'pipe'})
    }
  }finally{rmSync(tmp,{recursive:true,force:true})}
})
test('bad checksums, packet truncation and missing final granule remain rejected',t=>{
  try{execFileSync('ffmpeg',['-version'],{stdio:'ignore'})}
  catch{t.skip('ffmpeg unavailable');return}
  const tmp=mkdtempSync(join(tmpdir(),'hh-eosless-reject-'))
  try{
    const file=join(tmp,'valid.ogg')
    execFileSync('ffmpeg',['-nostdin','-loglevel','error','-f','lavfi',
      '-i','sine=frequency=400:duration=0.6','-c:a','libopus','-y',file])
    const source=new Uint8Array(readFileSync(file))
    const valid=mutateLastPage(source,{clearEOS:true})
    assert.doesNotThrow(()=>joinOggOpus([valid,valid]))
    const broken=new Uint8Array(valid);broken[broken.length-4]^=1
    assert.throws(()=>joinOggOpus([valid,broken]),/INVALID_OPUS/)
    assert.throws(()=>joinOggOpus([valid,valid.subarray(0,valid.length-1)]),/INVALID_OPUS/)
    const noGranule=mutateLastPage(source,{clearEOS:true,zeroGranule:true})
    assert.throws(()=>joinOggOpus([valid,noGranule]),/INVALID_OPUS/)
  }finally{rmSync(tmp,{recursive:true,force:true})}
})
