import test from 'node:test'
import assert from 'node:assert/strict'
import {recordingUpload,saveRecording} from '../lib/clients/recording-upload.js'
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
 for(const file of [{type:'video/webm',size:512},{type:'audio/mp4',size:20_000_001},{type:'video/mp4',size:45_000_001},{type:'audio/mp4',size:0}]){
 const job=make();job.file=file
 await assert.rejects(saveRecording(job,{post:()=>assert.fail('must not request upload'),upload:()=>assert.fail('must not upload')}))
 }
})
test('MP4 video is accepted only within existing cap',async()=>{
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
