import test from 'node:test'
import assert from 'node:assert/strict'
import {createSpeechReviewBuffer,speechReviewWav,createSpeechReviewQueue} from '../lib/coaching/coach-speech-review.mjs'
test('WAV uses 16k mono PCM and preserves bounded onset',()=>{
 const b=createSpeechReviewBuffer();b.append(new Uint8Array(3200),false);b.append(new Uint8Array(6400).fill(7),true)
 const wav=speechReviewWav(b.take()),v=new DataView(wav.buffer)
 assert.equal(v.getUint32(24,true),16000);assert.equal(v.getUint32(40,true),9600);assert.equal(wav[3244],7);assert.equal(b.take(),null)
})
test('overflow and separated speech never yield an ambiguous clip',()=>{
 const b=createSpeechReviewBuffer();for(let i=0;i<30;i++)b.append(new Uint8Array(16000),true);assert.equal(b.take(),null)
 b.append(new Uint8Array(6400),true);for(let i=0;i<4;i++)b.append(new Uint8Array(16000),false);b.append(new Uint8Array(6400),true);assert.equal(b.take(),null)
})
test('one in-flight, cancellation suppresses results',async()=>{
 const results=[];let calls=0
 const q=createSpeechReviewQueue({request:async()=>{calls++;return 'test'},onResult:(...r)=>results.push(r)})
 assert.equal(q.offer({id:1,parts:[new Uint8Array(3200)]}),true)
 assert.equal(q.offer({id:2,parts:[new Uint8Array(3200)]}),false)
 q.cancel();await new Promise(r=>setTimeout(r,10));assert.equal(calls,0);assert.deepEqual(results,[])
})
