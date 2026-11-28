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
 assert.equal(q.offer({id:2,parts:[new Uint8Array(3200)]}),true)
 q.cancel();await new Promise(r=>setTimeout(r,10));assert.equal(calls,0);assert.deepEqual(results,[[1,''],[2,'']])
})

test('stale and discontinuous audio is never offered as a candidate',()=>{
 const b=createSpeechReviewBuffer();b.append(new Uint8Array(6400),true,1000);assert.equal(b.take(3600),null)
 b.append(new Uint8Array(6400),true,5000);b.append(new Uint8Array(6400),true,6700);assert.equal(b.take(6800),null)
 b.append(new Uint8Array(6400),true,7000);b.invalidate();b.append(new Uint8Array(6400),true,7100);assert.equal(b.take(7200),null)
})

function fakeReviewClock(){
 let now=0,seq=0;const timers=new Map()
 return {now:()=>now,schedule:(fn,ms)=>{const id=++seq;timers.set(id,{fn,due:now+ms});return id},unschedule:id=>timers.delete(id),
  advance(ms){const end=now+ms;for(;;){const next=[...timers].filter(([,x])=>x.due<=end).sort((a,b)=>a[1].due-b[1].due||a[0]-b[0])[0];if(!next)break;now=next[1].due;timers.delete(next[0]);next[1].fn()}now=end}}
}
test('bounded queue prioritizes explicit important clips without parallel requests',async()=>{
 const clock=fakeReviewClock(),calls=[],results=[],resolvers=[]
 const q=createSpeechReviewQueue({...clock,request:job=>{calls.push(job.id);return new Promise(resolve=>resolvers.push(resolve))},onResult:(...x)=>results.push(x)})
 const offer=(id,priority=false)=>q.offer({id,priority,parts:[new Uint8Array(3200)]})
 assert.equal(offer(1),true);clock.advance(0);assert.deepEqual(calls,[1])
 assert.equal(offer(2),true);assert.equal(offer(3),true);assert.equal(offer(4),true);assert.equal(offer(5),false)
 assert.equal(offer(6,true),true);assert.deepEqual(results,[[4,'']]);assert.equal(offer(2),false)
 resolvers[0]('a');await Promise.resolve();clock.advance(0);assert.deepEqual(calls,[1,6])
 q.cancel();resolvers[1]('late');await Promise.resolve()
 assert.deepEqual(results,[[4,''],[1,'a'],[6,''],[2,''],[3,'']])
})
test('waiting audio expires during slow request and timeout reports once',async()=>{
 const clock=fakeReviewClock(),calls=[],results=[];let complete,signal
 const q=createSpeechReviewQueue({...clock,request:(job,s)=>{calls.push(job.id);signal=s;return new Promise(resolve=>{complete=resolve})},onResult:(...x)=>results.push(x)})
 const offer=id=>q.offer({id,parts:[new Uint8Array(3200)]})
 assert.equal(offer(1),true);clock.advance(0);assert.equal(offer(2),true);clock.advance(8000)
 assert.deepEqual(results,[[2,'']]);assert.deepEqual(calls,[1])
 clock.advance(4000);assert.equal(signal.aborted,true);assert.deepEqual(results,[[2,''],[1,'']])
 assert.equal(offer(3),true);clock.advance(8000);assert.deepEqual(results,[[2,''],[1,''],[3,'']])
 complete('late');await Promise.resolve();assert.deepEqual(results,[[2,''],[1,''],[3,'']]);assert.deepEqual(calls,[1])
})

import './coach-gemini-speech-review.test.mjs'

import {coachSpeechReviewEnabled,isCoachSpeechReviewRequest} from '../lib/coaching/coach-speech-review-config.mjs'
test('optional review has independent default-off server gate',()=>{
 const env={HH_MY_COACH_SPEECH_REVIEW_ENABLED:'true',HH_AUDIO_STT_FREE_CONFIRMED:'true',HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED:'true',HH_FIRST_VIDEO_GROQ_API_KEY:'synthetic'}
 assert.equal(coachSpeechReviewEnabled(env),true)
 for(const key of Object.keys(env))assert.equal(coachSpeechReviewEnabled({...env,[key]:''}),false)
 assert.equal(coachSpeechReviewEnabled({}),false)
 assert.equal(isCoachSpeechReviewRequest({purpose:'my_coach',filename:'coach-review.wav'}),true)
 assert.equal(isCoachSpeechReviewRequest({purpose:'my_coach',filename:'other.wav',review:'yes'}),true)
 assert.equal(isCoachSpeechReviewRequest({purpose:'my_coach',filename:'dictation.wav'}),false)
 assert.equal(isCoachSpeechReviewRequest({purpose:'ali_chat',filename:'coach-review.wav',review:'yes'}),false)
})
