import test from 'node:test'
import assert from 'node:assert/strict'
import {createSpeechReviewBuffer,encodeSpeechReviewWav,createSpeechReviewRequest} from '../lib/coaching/coach-speech-review.mjs'
import {isSuspectShortRussianSpeech,speechEvidenceCandidate,speechWordErrors} from '../lib/coaching/coach-speech-evidence.mjs'
test('review audio is bounded, excludes playback, and writes 16k PCM WAV',()=>{
 const b=createSpeechReviewBuffer(),frame=new Uint8Array(6400);for(let i=0;i<frame.length;i+=2)frame[i]=12;
 b.append(frame,true);const frames=b.take();assert.equal(frames.length,1)
 const wav=new DataView(encodeSpeechReviewWav(frames));assert.equal(wav.getUint32(24,true),16000);assert.equal(wav.getInt16(44,true),12)
 b.append(frame,true);b.append(frame,false,true);assert.equal(b.take(),null)
 b.append(frame,false);assert.equal(b.take(),null)
 for(let i=0;i<70;i++)b.append(frame,true);assert.equal(b.take(),null)
})
test('wrong-script example and semantic disagreement require review',()=>{
 assert.equal(isSuspectShortRussianSpeech('postawszym','ru'),true)
 assert.equal(isSuspectShortRussianSpeech('уставшим','ru'),false)
 assert.equal(speechEvidenceCandidate({raw:'Я хочу',candidate:'Я не хочу',locale:'ru',revision:1,currentRevision:1}).state,'uncertain')
 assert.deepEqual(speechWordErrors('Я не хочу','Я хочу'),{errors:1,words:3})
})
test('secondary requests run after submit; cancellation prevents upload',()=>{
 let fn,calls=0;const q=createSpeechReviewRequest({fetcher:()=>{calls++;throw Error('unexpected')},delay:f=>{fn=f;return 1},cancelDelay:()=>{}})
 assert.equal(q.submit([new Uint8Array(6400)],'ru',()=>{}),true)
 assert.equal(q.submit([new Uint8Array(6400)],'ru',()=>{}),false)
 q.cancel();fn();assert.equal(calls,0)
})
