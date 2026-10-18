import test from 'node:test'
import assert from 'node:assert/strict'
import {recordingUpload,saveRecording} from '../lib/clients/recording-upload.js'
import {normalizePhoneAudioFile} from '../lib/clients/phone-audio-file.js'
import {canProxyOwnerAudio} from '../lib/clients/owner-audio-upload.js'
const make=()=>recordingUpload({file:{type:'audio/mp4',size:512},clientId:'client-a',sessionId:'session-a',scope:'practitioner',durationSeconds:12.5})
test('finalize retry preserves private scope and destination and does not upload twice',async()=>{
 const job=make(),calls=[];let uploads=0,finalizes=0
 const deps={post:async(url,body)=>{calls.push({url,body});if(body.action==='intent')return {assetId:'asset-a'};if(++finalizes===1)throw Error('offline')},upload:async()=>{uploads++}}
 await assert.rejects(saveRecording(job,deps),/offline/)
 await saveRecording(job,deps)
 assert.equal(uploads,1);assert.equal(calls.filter(x=>x.body.action==='intent').length,1)
 assert.equal(calls[0].body.scope,'practitioner');assert.ok(calls.every(x=>x.url.includes('/client-a/sessions/session-a/')))
 assert.ok(calls.filter(x=>x.body.action==='complete').every(x=>x.body.assetId==='asset-a'&&x.body.durationSeconds===12))
})
test('lost upload success response is recovered using same asset finalization',async()=>{
 const job=make();let intents=0
 await saveRecording(job,{post:async(_,b)=>{if(b.action==='intent'){intents++;return {assetId:'same'}}},upload:async()=>{throw Error('connection lost')}})
 assert.equal(job.uploaded,true);assert.equal(intents,1)
})
test('failed upload retains file and intent without reporting success',async()=>{
 const job=make();let intents=0,uploads=0
 const deps={post:async(_,b)=>{if(b.action==='intent'){intents++;return {assetId:'same'}};throw Error('not uploaded')},upload:async()=>{uploads++;throw Error('offline')}}
 await assert.rejects(saveRecording(job,deps),/offline/);await assert.rejects(saveRecording(job,deps),/offline/)
 assert.equal(intents,2);assert.equal(uploads,2);assert.equal(job.uploaded,false);assert.equal(job.file.size,512)
})
test('unsupported, oversized and empty files do not create an intent',async()=>{
 for(const file of [{type:'video/webm',size:512},{type:'audio/mp4',size:20_000_001},{type:'video/mp4',size:200_000_001},{type:'audio/mp4',size:0}]){
 const job=make();job.file=file
 await assert.rejects(saveRecording(job,{post:()=>assert.fail('must not request upload'),upload:()=>assert.fail('must not upload')}))
 }
})
test('MP4 video requests are allowed up to the optional external limit; server enforces backend cap',async()=>{
 const job=make();job.file={type:'video/mp4',size:1024};const calls=[]
 await saveRecording(job,{post:async(_,b)=>{calls.push(b);return {assetId:'video'}},upload:async()=>{}})
 assert.equal(calls[0].kind,'video');assert.equal(calls[0].mime,'video/mp4')
})

test('lost intent response retries same idempotency key',async()=>{
 const job=make(),ids=[];let first=true
 const deps={post:async(_,body)=>{if(body.action==='intent'){ids.push(body.intentId);if(first){first=false;throw Error('lost response')}return {assetId:'same'}}},upload:async()=>{}}
 await assert.rejects(saveRecording(job,deps),/lost response/);await saveRecording(job,deps)
 assert.equal(ids.length,2);assert.equal(ids[0],ids[1])
})


test('an extra private PDF can be attached, but never as HTML or beyond 15 MB',async()=>{
 const job=make();job.file={type:'application/pdf',size:1024}
 let intent
 await saveRecording(job,{post:async(_,data)=>{if(data.action==='intent'){intent=data;return {assetId:'pdf-asset'}}},upload:async()=>{}})
 assert.equal(intent.kind,'pdf')
 assert.equal(intent.mime,'application/pdf')
 for(const file of [{type:'application/pdf',size:15_000_001},{type:'text/html',size:1024}]){
   const attempt=make();attempt.file=file
   await assert.rejects(saveRecording(attempt,{post:()=>assert.fail('must not issue'),upload:()=>assert.fail('must not upload')}))
 }
})

test('an unusable partial video gets a new key on explicit retry, never overwriting old bytes',async()=>{
  const job=make()
  job.file={type:'video/mp4',size:1024}
  const firstId=job.intentId,ids=[]
  let uploads=0,finalizes=0
  const deps={
    post:async(_url,data)=>{
      if(data.action==='intent'){ids.push(data.intentId);return {assetId:'video-'+ids.length,provider:'external'}}
      if(data.action==='complete'&&++finalizes===1)throw Error('MEDIA_SIZE_NOT_ALLOWED')
    },
    upload:async()=>{if(++uploads===1)throw Error('412 PreconditionFailed')},
  }
  await assert.rejects(saveRecording(job,deps),/412 PreconditionFailed/)
  assert.notEqual(job.intentId,firstId)
  assert.equal(job.file.size,1024)
  assert.equal(job.uploaded,false)
  await saveRecording(job,deps)
  assert.equal(ids.length,2)
  assert.notEqual(ids[0],ids[1])
  assert.equal(job.uploaded,true)
})
test('transient finalize error keeps the same intent on retry',async()=>{
  const job=make(),initialId=job.intentId,ids=[]
  let finalized=0,uploads=0
  const deps={
    post:async(_url,data)=>{
      if(data.action==='intent'){ids.push(data.intentId);return {assetId:'same'} }
      if(data.action==='complete'&&++finalized===1)throw Error('MEDIA_STORAGE_UNAVAILABLE')
    },
    upload:async()=>{if(++uploads===1)throw Error('network timeout')},
  }
  await assert.rejects(saveRecording(job,deps),/network timeout/)
  assert.equal(job.intentId,initialId)
  await saveRecording(job,deps)
  assert.equal(ids.length,2)
  assert.equal(ids[0],ids[1])
  assert.equal(job.uploaded,true)
})

class SyntheticAudioFile {
 constructor(parts,name,options){
   this.parts=parts
   this.name=name
   this.type=options.type
   this.lastModified=options.lastModified
   this.size=parts.reduce((sum,part)=>sum+part.size,0)
 }
}
const phoneAudio=(name,type,size=1024)=>({name,type,size,lastModified:12345})

test('iPhone Voice Memos exports from Files normalize only known M4A/MP3/WebM aliases without changing bytes',()=>{
 const cases=[
   ['Консультация.M4A','', 'audio/mp4'],
   ['Memo.m4a','application/octet-stream','audio/mp4'],
   ['Memo.m4a','audio/x-m4a','audio/mp4'],
   ['Memo.m4a','application/x-m4a','audio/mp4'],
   ['Memo.MP3','audio/mp3','audio/mpeg'],
   ['Memo.mp3','', 'audio/mpeg'],
   ['Memo.webm','application/octet-stream','audio/webm'],
 ]
 for(const [name,type,expected] of cases){
   const original=phoneAudio(name,type)
   const imported=normalizePhoneAudioFile(original,SyntheticAudioFile)
   assert.notEqual(imported,original)
   assert.equal(imported.name,name)
   assert.equal(imported.type,expected)
   assert.equal(imported.size,original.size)
   assert.equal(imported.lastModified,original.lastModified)
   assert.equal(imported.parts[0],original,'original bytes stay unchanged, no transcoding')
   assert.equal(canProxyOwnerAudio(imported),true)
 }
})

test('do not relabel mismatched video or unsupported audio; already-canonical audio is unchanged',()=>{
 for(const original of [
   phoneAudio('Memo.m4a','video/mp4'),
   phoneAudio('Memo.m4a','audio/wav'),
   phoneAudio('Memo.wav','audio/wav'),
   phoneAudio('Memo.constructor',''),
   phoneAudio('Memo.mov','video/quicktime'),
   phoneAudio('Memo.webm','video/webm'),
   phoneAudio('Memo.m4a','audio/mp4'),
 ]){
   assert.equal(normalizePhoneAudioFile(original,SyntheticAudioFile),original,original.name+' / '+original.type)
 }
 assert.equal(normalizePhoneAudioFile(null,SyntheticAudioFile),null)
 const noConstructor=phoneAudio('Memo.m4a','')
 assert.equal(normalizePhoneAudioFile(noConstructor,null),noConstructor)
})

test('normalized Voice Memos M4A attaches to the correct private consultation via existing upload intent',async()=>{
 const file=normalizePhoneAudioFile(phoneAudio('My Voice.m4a',''),SyntheticAudioFile)
 const job=recordingUpload({file,clientId:'client-one',sessionId:'session-one',scope:'client'})
 const actions=[],uploads=[]
 await saveRecording(job,{
   post:async(url,body)=>{
     actions.push({url,body})
     if(body.action==='intent')return {assetId:'asset-one',provider:'supabase'}
     return {attached:true}
   },
   upload:async(intent,selected,mime)=>uploads.push({intent,selected,mime}),
 })
 assert.equal(actions[0].body.action,'intent')
 assert.equal(actions[0].body.mime,'audio/mp4')
 assert.equal(actions[0].body.kind,'audio')
 assert.equal(actions[0].body.scope,'client')
 assert.equal(actions[0].body.bytes,file.size)
 assert.equal(actions[1].body.assetId,'asset-one')
 assert.ok(actions.every(item=>item.url==='/api/admin/clients/client-one/sessions/session-one/media'))
 assert.equal(uploads.length,1)
 assert.equal(uploads[0].selected,file)
 assert.equal(uploads[0].mime,'audio/mp4')
})

test('imported audio too large is refused before private upload intent',async()=>{
 const file=normalizePhoneAudioFile(phoneAudio('Huge.m4a','application/octet-stream',20_000_001),SyntheticAudioFile)
 const job=recordingUpload({file,clientId:'c',sessionId:'s',scope:'client'})
 await assert.rejects(saveRecording(job,{
   post:()=>assert.fail('no oversized audio intent'),
   upload:()=>assert.fail('no oversized audio upload'),
 }),/MEDIA_SIZE_NOT_ALLOWED/)
})
