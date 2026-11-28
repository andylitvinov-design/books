import test from 'node:test'
import assert from 'node:assert/strict'
import {createSpeechReviewBuffer,speechReviewWav,createSpeechReviewQueue,normalizeSpeechReviewResult} from '../lib/coaching/coach-speech-review.mjs'
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

import {readFileSync} from 'node:fs'
test('typed input retires the review queue before committing the new turn',()=>{
 const live=readFileSync(new URL('../components/my-coach-gemini-live.jsx',import.meta.url),'utf8')
 const start=live.indexOf('r.inputText=\'\'\n    const previous=r.history.slice(-10)')
 assert.ok(start>=0)
 const end=live.indexOf("onInputFinal?.(body,{source:'typed'})",start)
 assert.ok(end>start)
 assert.match(live.slice(start,end),/speechReviewBuffer\?\.clear\(\);r\.speechReviewQueue\?\.cancel\(\);r\.speechReviewQueue=null/)
})

import {isBoundedCoachReviewWav} from '../lib/coaching/coach-speech-review-wav.mjs'
test('long review is opt-in, bounded and canonical, without slicing the utterance',()=>{
 const b=createSpeechReviewBuffer({long:true})
 for(let i=0;i<68;i++)b.append(new Uint8Array(16000).fill(i),true,1000+i*500)
 const parts=b.take(35000);assert.equal(parts.length,68)
 assert.throws(()=>speechReviewWav(parts),/INVALID/)
 const wav=speechReviewWav(parts,{long:true})
 assert.equal(wav.length,34*32000+44);assert.equal(isBoundedCoachReviewWav(wav),false);assert.equal(isBoundedCoachReviewWav(wav,{long:true}),true)
 const bad=wav.slice();bad[24]=0;assert.equal(isBoundedCoachReviewWav(bad,{long:true}),false)
 for(let i=0;i<71;i++)b.append(new Uint8Array(16000),true,1000+i*500)
 assert.equal(b.take(36500),null)
})
test('long candidate must not be silently truncated',async()=>{
 const results=[];const q=createSpeechReviewQueue({request:async()=>('a'.repeat(1201)),onResult:(...x)=>results.push(x)})
 assert.equal(q.offer({id:1,parts:[new Uint8Array(3200)]}),true)
 await new Promise(r=>setTimeout(r,20));assert.deepEqual(results,[[1,'']]);q.cancel()
})

test('capture timestamps retire stale pre-roll and reject resumed speech',()=>{
 const b=createSpeechReviewBuffer({long:true})
 b.append(new Uint8Array(3200).fill(1),false,1000)
 b.append(new Uint8Array(6400).fill(2),true,5000)
 const clip=b.takeClip(5100);assert.equal(clip.parts.length,1);assert.equal(clip.capturedAt,4800)
 b.append(new Uint8Array(6400),true,10000);b.append(new Uint8Array(6400),true,14000)
 assert.equal(b.takeClip(14100),null)
 b.append(new Uint8Array(6400),true,20000);assert.equal(b.takeClip(19000),null)
})
test('suspended scheduler cannot send expired audio or promote late responses',async()=>{
 let time=100000,next=0,calls=0,complete;const tasks=new Map(),results=[]
 const q=createSpeechReviewQueue({now:()=>time,schedule:(fn)=>{const id=++next;tasks.set(id,fn);return id},unschedule:id=>tasks.delete(id),request:()=>{calls++;return new Promise(resolve=>{complete=resolve})},onResult:(...x)=>results.push(x)})
 const parts=[new Uint8Array(3200)]
 assert.equal(q.offer({id:1,parts,capturedAt:time-49000}),false)
 assert.equal(q.offer({id:2,parts,capturedAt:time-35000}),true)
 time+=9000;for(const fn of [...tasks.values()])fn()
 assert.equal(calls,0);assert.deepEqual(results,[[2,'']])
 tasks.clear();assert.equal(q.offer({id:3,parts,capturedAt:time-35000}),true)
 for(const fn of [...tasks.values()])fn()
 assert.equal(calls,1);time+=13000;complete('late');await Promise.resolve()
 assert.deepEqual(results,[[2,''],[3,'']]);q.cancel()
})

import {observeSpeechCandidate,canObserveOrdinarySpeech,visibleSpeechReview} from '../lib/coaching/coach-speech-evidence.mjs'
import {coachOrdinarySpeechReviewEnabled} from '../lib/coaching/coach-speech-review-config.mjs'
test('ordinary observation is explicitly gated and excludes sensitive, typed and over-budget turns',()=>{
 const a={enabled:true,source:'speech',reviewAvailable:true,sensitive:false,raw:'Я не согласен',count:0}
 assert.equal(canObserveOrdinarySpeech(a),true)
 for(const patch of [{enabled:false},{source:'typed'},{reviewAvailable:false},{sensitive:true},{count:30},{raw:''},{raw:'a'.repeat(1201)}])assert.equal(canObserveOrdinarySpeech({...a,...patch}),false)
 const env={HH_MY_COACH_SPEECH_REVIEW_ENABLED:'true',HH_AUDIO_STT_FREE_CONFIRMED:'true',HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED:'true',HH_FIRST_VIDEO_GROQ_API_KEY:'mock'}
 assert.equal(coachOrdinarySpeechReviewEnabled(env),false)
 assert.equal(coachOrdinarySpeechReviewEnabled({...env,HH_MY_COACH_STT_ORDINARY_REVIEW_ENABLED:'true'}),true)
})
test('matching observation disappears; disagreement is only a candidate; edit wins',()=>{
 const row={observationOnly:true,raw:'Я не согласен',locale:'ru',edited:null,pending:true}
 assert.equal(observeSpeechCandidate(row,'Я не согласен.'),null)
 assert.equal(observeSpeechCandidate(row,''),null)
 const mismatch=observeSpeechCandidate(row,'Я согласен')
 assert.equal(mismatch.raw,row.raw);assert.equal(mismatch.candidate,'Я согласен');assert.equal(mismatch.pending,false)
 assert.equal(observeSpeechCandidate({...row,edited:'мой текст'},'Я согласен').edited,'мой текст')
 assert.equal(observeSpeechCandidate({...row,observationOnly:false},'').pending,false)
})

test('ordinary pending and matching results never open the correction surface',()=>{
 const row={observationOnly:true,raw:'Я устал',locale:'ru',pending:true,edited:null,candidate:''}
 assert.equal(visibleSpeechReview(row),false)
 assert.equal(visibleSpeechReview(observeSpeechCandidate(row,'Я устал.')),false)
 assert.equal(visibleSpeechReview(observeSpeechCandidate(row,'Я не устал')),true)
 assert.equal(visibleSpeechReview({...row,observationOnly:false}),true)
 assert.equal(visibleSpeechReview({...row,pending:false,candidate:''}),false)
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 assert.ok(ui.includes('speechReviews.filter(visibleSpeechReview)'))
 assert.ok(ui.includes('{visibleSpeechReviews.map(row=>'))
 assert.ok(ui.includes('{!row.observationOnly&&<button type="button" disabled={Boolean(draft.trim())||busy||row.pending}'))
})

test('ordinary review preserves original live history and Director checkpoint',()=>{
 const live=readFileSync(new URL('../components/my-coach-gemini-live.jsx',import.meta.url),'utf8')
 const input=live.slice(live.indexOf('function commitInput('),live.indexOf('function commitOutput('))
 assert.ok(input.includes('if(decision.observationOnly!==true)'))
 assert.ok(input.indexOf('if(decision.observationOnly!==true)')<input.indexOf("r.history.push({role:'user',content:value})"))
 assert.ok(input.includes('void checkpoint(r,value,preceding)'))
 const effect=live.slice(live.indexOf('const r=runtime.current;r?.speechReviewBuffer?.clear();r?.speechReviewQueue?.cancel();if(r){r.speechReviewQueue=null'),live.indexOf('[speechReviewConsent,speechReviewProvider,speechReviewAll]'))
 assert.ok(effect.includes('speechReviewQueue?.cancel()'))
 assert.ok(effect.includes('r.speechReviewBuffer=createSpeechReviewBuffer'))
})

import {projectSpeechDictionary,archivedSpeechSuggestion} from '../lib/personal-coaching/speech-dictionary.mjs'
test('archive speech dictionary uses short confirmed owner records and never guesses conflicts',()=>{
 const id='8afbf841-49a0-46e1-b5c1-124a116efa28',event={id:'8afbf841-49a0-46e1-b5c1-124a116efa29',sessionId:id,afterTurnCount:1,raw:'postawszym',text:'Уставшим',source:'client_confirmed',locale:'ru',confirmedAt:'2026-11-27T20:00:00.000Z'},turns=[{role:'assistant',content:'question'}]
 const record={id,turns,provenance:'client_reviewed_dialogue',speechAmendments:[event]}
 const archive=projectSpeechDictionary([record],'ru')
 assert.deepEqual(archive,[{raw:'postawszym',text:'Уставшим'}])
 assert.deepEqual(projectSpeechDictionary([record],'en'),[])
 assert.deepEqual(projectSpeechDictionary([{...record,provenance:'client_autosaved_unreviewed_draft'}],'ru'),[])
 assert.deepEqual(projectSpeechDictionary([{...record,speechAmendments:[{...event,text:'x'.repeat(81)}]}],'ru'),[])
 const conflicting={...event,id:'8afbf841-49a0-46e1-b5c1-124a116efa30',text:'Другим'}
 assert.deepEqual(projectSpeechDictionary([{...record,speechAmendments:[event,conflicting]}],'ru'),[])
 const options={current:[],turns,sessionId:id,raw:'POSTAWSZYM',locale:'ru',archive}
 assert.equal(archivedSpeechSuggestion(options),'Уставшим')
 assert.equal(archivedSpeechSuggestion({...options,raw:'different'}),'')
 assert.equal(archivedSpeechSuggestion({...options,current:[conflicting]}),'')
 assert.equal(archivedSpeechSuggestion({...options,archive:[]}), '')
 assert.equal(archivedSpeechSuggestion({...options,archive:[],current:[event]}),'Уставшим')
})

test('observed model metadata only follows a completed accepted review',async()=>{
 assert.deepEqual(normalizeSpeechReviewResult({text:' да ',model:'whisper-large-v3'}),{text:'да',model:'whisper-large-v3'})
 assert.deepEqual(normalizeSpeechReviewResult({text:'да',model:'unknown'}),{text:'да',model:''})
 assert.deepEqual(normalizeSpeechReviewResult({text:'',model:'whisper-large-v3'}),{text:'',model:''})
 const clock=fakeReviewClock(),results=[]
 const q=createSpeechReviewQueue({...clock,request:async()=>({text:'да',model:'whisper-large-v3-turbo'}),onResult:(...x)=>results.push(x)})
 assert.equal(q.offer({id:1,parts:[new Uint8Array(3200)]}),true);clock.advance(0);await Promise.resolve()
 assert.deepEqual(results,[[1,'да','whisper-large-v3-turbo']]);q.cancel()
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const route=readFileSync(new URL('../app/api/holistic-support/audio-storyboard/route.js',import.meta.url),'utf8')
 assert.ok(route.includes('model:multipart.get("model")'))
 assert.ok(ui.includes('data-coach-stt-observed-model={lastSpeechReviewModel}'))
 assert.ok(ui.includes('&&text&&actualModel)setLastSpeechReviewModel(actualModel)'))
})

test('review appears in transcript and optional consent before start',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const greeting=readFileSync(new URL('../components/my-coach-greeting-gate.jsx',import.meta.url),'utf8')
 const feed=ui.slice(ui.indexOf('data-coach-live-transcript'),ui.indexOf('data-coach-private-recall'))
 for(const value of ['data-coach-visible-speech-review','data-coach-unconfirmed-speech-candidate','data-coach-latest-confirmed-speech','confirmSpeechAmendment(row)'])assert.ok(feed.includes(value))
 assert.ok(ui.includes('data-coach-preplay-speech-review'))
 assert.ok(greeting.includes('{greetingStarted&&speechReviewControl}'))
 assert.ok(ui.includes('[turns,speechPreview,streamingPreview,speechReviewActivity,speechAmendments.length]'))
})
