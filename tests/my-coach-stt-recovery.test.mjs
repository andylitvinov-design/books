import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {coachRecordingFailureCode,createCoachVoiceGate} from '../lib/personal-coaching/coach-recorded-turn.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('recorded iPhone STT distinguishes quota, auth, provider and microphone failures',()=>{
  assert.equal(coachRecordingFailureCode(Error('AUDIO_STT_429')),'STT_RATE_LIMIT')
  assert.equal(coachRecordingFailureCode(Error('AUDIO_STT_401')),'STT_SIGN_IN')
  assert.equal(coachRecordingFailureCode(Error('AUDIO_STT_503')),'STT_UNAVAILABLE')
  assert.equal(coachRecordingFailureCode(Error('AUDIO_STT_INVALID_FILE')),'MIC_CAPTURE')
  assert.equal(coachRecordingFailureCode(Error('AUDIO_STT_EMPTY')),'MIC_NO_SIGNAL')
  assert.equal(coachRecordingFailureCode({name:'NotAllowedError'}),'MIC_PERMISSION')
})

test('coach recorded speech uses signed-in free STT quota independent of Video Studio',()=>{
  const recorded=read('lib/personal-coaching/coach-recorded-turn.mjs')
  const route=read('app/api/holistic-support/audio-storyboard/route.js')
  assert.match(recorded,/body\.set\('purpose',purpose==='ali_chat'\?'ali_chat':'my_coach'\)/)
  assert.match(recorded,/body\.set\('consent','yes'\)/)
  assert.match(route,/if\(purpose==="my_coach"\)\{/)
  assert.match(route,/createRequestAuth\(request,config\)\.verified\(\)/)
  assert.match(route,/op:"my-coach-stt-free-user-minute",userId:actor\.id\},8,60/)
  assert.match(route,/op:"my-coach-stt-free-global-minute"\},12,60/)
  assert.match(route,/op:"my-coach-stt-free-user-day",userId:actor\.id\},120,86400/)
  assert.match(route,/op:"my-coach-stt-free-global-day"\},240,86400/)
  assert.match(route,/op:"audio-stt-free-global-minute"\},3,60/)
  assert.match(route,/op:"audio-stt-free-global-day"\},20,86400/)
  assert.match(route,/HH_AUDIO_STT_FREE_CONFIRMED/)
  assert.match(route,/HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED/)
  assert.doesNotMatch(route,/GROQ_PAID|GEMINI_PAID|STRIPE|PAYMENT/)
})

test('Safari STT failures are never permanently latched or falsely called Listening',()=>{
  const ui=read('components/my-coach-speech-loop.jsx')
  assert.doesNotMatch(ui,/recordedSttUnavailableRef/)
  assert.match(ui,/function recoverRecordedStt\(code,generation\)/)
  assert.match(ui,/code==='STT_RATE_LIMIT'\?61000:2200/)
  assert.match(ui,/if\(recovery\.retries>=1\)/)
  assert.match(ui,/phaseRef\.current==='starting'\)startListening\(\)/)
  assert.match(ui,/\['STT_UNAVAILABLE','STT_RATE_LIMIT','STT_SIGN_IN'\]\.includes\(code\)/)
  assert.match(ui,/code==='STT_SIGN_IN'/)
  assert.match(ui,/if\(ios27&&coachRecordedSupported\(window\)\)/)
  assert.match(ui,/sttCooling:/)
  assert.match(ui,/sttRecovering:/)
})

import {createCoachBargeGate} from '../lib/personal-coaching/coach-barge-in.mjs'
import {setCoachIos27DuplexRoute} from '../lib/personal-coaching/coach-ios-audio-route.mjs'

test('Basic faster endpoints leave longer pauses for extended reflections',()=>{
  const gate=createCoachVoiceGate({silenceMs:750,longSilenceMs:1050,longSpeechAfterMs:6500,resetAfterMs:6000})
  for(const [t,v,e] of [[0,0,'silence'],[50,.1,'silence'],[100,.1,'speech'],[300,.1,'speech'],[1000,0,'speech'],[1050,0,'finish']])assert.equal(gate.update(t,v),e)
  const long=createCoachVoiceGate({silenceMs:750,longSilenceMs:1050,longSpeechAfterMs:6500})
  long.update(0,.1);long.update(50,.1);long.update(7000,.1)
  assert.equal(long.update(7800,0),'speech');assert.equal(long.update(8050,0),'finish')
  const silent=createCoachVoiceGate({resetAfterMs:6000})
  silent.update(0,0);assert.equal(silent.update(6000,0),'rotate');assert.equal(silent.heard,false)
})
test('Basic barge gate rejects brief leakage and confirms sustained human voice',()=>{
  const gate=createCoachBargeGate({threshold:.019,candidateTicks:3,confirmTicks:3,releaseTicks:5})
  assert.deepEqual([.04,.04,.04].map(v=>gate.update(v)),['idle','idle','candidate'])
  assert.equal([0,0,0,0,0].map(v=>gate.update(v)).at(-1),'restore')
  assert.deepEqual([.04,.04,.04,.04,.04,.04].map(v=>gate.update(v)),['idle','idle','candidate','pending','pending','interrupt'])
})
test('Basic iOS duplex route has truthful capability detection',()=>{
  const navigator={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 Version/27.0 Mobile Safari/604.1',audioSession:{type:'playback'}}
  assert.equal(setCoachIos27DuplexRoute(navigator),true);assert.equal(navigator.audioSession.type,'play-and-record')
  assert.equal(setCoachIos27DuplexRoute({userAgent:navigator.userAgent}),false)
  assert.equal(setCoachIos27DuplexRoute({userAgent:navigator.userAgent,audioSession:{get type(){return 'playback'},set type(value){throw Error(value)}}}),false)
})
test('Basic fast STT retains same-origin, authenticated free quota and language check',()=>{
  const ui=read('components/my-coach-speech-loop.jsx')
  const rec=read('lib/personal-coaching/coach-recorded-turn.mjs')
  const api=read('app/api/holistic-support/audio-storyboard/route.js')
  assert.ok(ui.includes('if(!setCoachIos27DuplexRoute(window.navigator))'))
  assert.ok(ui.includes("result?.mode!=='intro'&&!recordedTurnRef.current"))
  assert.ok(ui.includes('generationRef.current=monitorGeneration'))
  assert.ok(rec.includes('const plainText=fastCoach||'))
  assert.ok(rec.includes('fastCoach?50:100'))
  assert.ok(api.includes('purpose!=="ali_chat"&&purpose!=="my_coach"'))
  assert.ok(api.includes('purpose==="my_coach"&&isSpeechTranscriptLanguageMismatch'))
  assert.ok(api.includes('AbortSignal.any([request.signal,AbortSignal.timeout(12000)])'))
  assert.ok(api.includes('whisper-large-v3-turbo'))
})

import {createCoachLocalPcm,encodeCoachPcmWav} from '../lib/personal-coaching/coach-local-pcm.mjs'
import {coachGroqReasoningEffort} from '../lib/coaching/groq-coach-provider.mjs'
test('Basic short WAV is mono 16k PCM and preserves pre-roll, with bounded fallback',()=>{
  const encoder=encodeCoachPcmWav(new Int16Array([-32768,0,32767]))
  const view=new DataView(encoder.buffer)
  assert.equal(view.getUint32(24,true),16000)
  assert.equal(view.getUint16(22,true),1)
  assert.equal(view.getUint32(40,true),6)
  assert.equal(view.getInt16(44,true),-32768)
  assert.equal(view.getInt16(48,true),32767)
  const capture=createCoachLocalPcm(48000)
  const pre=new Float32Array(4800).fill(.25),after=new Float32Array(4800).fill(.5)
  for(let t=100;t<=400;t+=100)capture.push(pre,t)
  capture.begin(400)
  for(let t=500;t<=1000;t+=100)capture.push(after,t)
  const wav=capture.finish(1000),v=new DataView(wav.buffer)
  assert.equal(v.getUint32(40,true),32000)
  assert.equal(v.getInt16(44,true),8192)
  assert.equal(v.getInt16(44+6400*2,true),16384)
  assert.equal(capture.finish(1000),null)
  capture.begin(1000);capture.push(after,1500)
  assert.equal(capture.finish(1500),null)
  capture.reset();capture.begin(1500)
  assert.equal(capture.finish(1500),null)
})
test('Basic coalesces fast final replies and uses low reasoning for ordinary narration',()=>{
  const turn=content=>[{role:'user',content}]
  assert.equal(coachGroqReasoningEffort(turn('Сегодня я заметил, что мне легче говорить о работе, когда я заранее выделяю время и спокойно записываю свои мысли.'),false,true),'low')
  assert.equal(coachGroqReasoningEffort(turn('Помоги понять, почему я постоянно откладываю решение.'),false,true),'medium')
  assert.equal(coachGroqReasoningEffort(turn('Я рассказываю о происходящем. '.repeat(15)),false,true),'medium')
  const ui=read('components/my-coach-speech-loop.jsx')
  assert.ok(ui.includes('},120)'))
  assert.ok(ui.includes('early.generation===generation&&!early.started'))
  const rec=read('lib/personal-coaching/coach-recorded-turn.mjs')
  assert.ok(rec.includes("if(wav)void transcribe([wav],'audio/wav','wav')"))
  assert.ok(rec.includes('else void transcribe(parts,format,ext)'))
  assert.ok(rec.includes("if(recorderMode==='discard'&&recorder)return"))
})

import {coachBasicListeningMode,createCoachBasicEndpointPolicy,coachBasicDeliveryProfile,coachBasicBackchannel,coachBasicPromptContext} from '../lib/personal-coaching/coach-basic-dialogue-policy.mjs'
test('Basic endpoint policy respects eight coach styles, closed questions, practice and observed pauses',()=>{
 const ids=['mira','max','sofia','alex','merlin','harry','genie','caesar']
 assert.equal(new Set(ids.map(id=>coachBasicDeliveryProfile(id).style)).size,8)
 const p=createCoachBasicEndpointPolicy()
 assert.equal(p.endpoint({mode:'quick'}),650)
 assert.equal(p.endpoint({mode:'normal'}),900)
 assert.equal(p.endpoint({mode:'reflective'}),1500)
 assert.equal(p.endpoint({mode:'practice'}),3000)
 assert.equal(coachBasicListeningMode({personaId:'mira'}),'reflective')
 assert.equal(coachBasicListeningMode({personaId:'max',question:'Правильно ли я понял?'}),'quick')
 assert.equal(coachBasicListeningMode({personaId:'max',question:'Is that correct?',pace:'slow'}),'normal')
 assert.equal(coachBasicListeningMode({personaId:'max',question:'¿En una escala del 1 al 10?',pace:'fast'}),'quick')
 assert.equal(coachBasicListeningMode({personaId:'max',practiceActive:true}),'practice')
 p.observe(1200);assert.equal(p.endpoint({mode:'quick'}),1450)
 p.reset();assert.equal(p.endpoint({mode:'quick'}),650)
 const gate=createCoachVoiceGate({endpointMs:()=>1500,onPause:ms=>p.observe(ms)})
 gate.update(0,.1);gate.update(50,.1);gate.update(400,0)
 assert.equal(gate.update(1000,0),'speech')
 gate.update(1200,.1);assert.equal(p.endpoint({mode:'normal'}),1400)
 assert.equal(gate.update(2699,0),'speech');assert.equal(gate.update(2700,0),'finish')
})
test('Basic backchannels never swallow a response to a question or explicit yes/no',()=>{
 const context={duringOutput:true,questionPending:false}
 for(const s of ['угу','ага','uh-huh','ajá'])assert.equal(coachBasicBackchannel(s,context),true)
 for(const s of ['да','нет','подожди','ага, но я хотел другое','yes','no'])assert.equal(coachBasicBackchannel(s,context),false)
 assert.equal(coachBasicBackchannel('угу',{...context,questionPending:true}),false)
 assert.deepEqual(coachBasicPromptContext([{role:'user',content:'моя цель'}],['моя цель','не советуй','не советуй']),['не советуй'])
})
test('Basic implementation fences output and uses same-mic handoff and reviewed draft',()=>{
 const ui=read('components/my-coach-speech-loop.jsx')
 assert.ok(ui.includes('outputEpochRef.current===outputEpoch'))
 assert.ok(ui.includes('endpointMs:endpointForTurn,onPause:observeSpeechPause'))
 assert.ok(ui.includes('if(audioStarted)'))
 assert.ok(ui.includes('holdRecognizedDraft(value)'))
 const held=ui.slice(ui.indexOf('function holdRecognizedDraft(value)'),ui.indexOf('function startListening(){'))
 assert.ok(held.includes('uncertainSpeechDraftRef.current={visible:candidate,prior:draftAtStartRef.current}'))
})

import {coachSpeechReviewGlossary} from '../lib/coaching/coach-speech-review-glossary.mjs'
test('public speech review glossary is gated, localized and never passed to other lanes',()=>{
 const options={purpose:'my_coach',textOnly:true,filename:'coach-review.wav',language:'ru',enabled:true}
 assert.match(coachSpeechReviewGlossary(options),/психосоматика/)
 assert.match(coachSpeechReviewGlossary({...options,language:'en'}),/psychosomatic/)
 assert.match(coachSpeechReviewGlossary({...options,language:'es'}),/psicosomática/)
 for(const patch of [{enabled:false},{purpose:'ali_chat'},{purpose:null},{textOnly:false},{filename:'dictation.wav'},{language:'auto'},{language:'toString'}])assert.equal(coachSpeechReviewGlossary({...options,...patch}),'')
 for(const language of ['ru','en','es'])assert.ok(coachSpeechReviewGlossary({...options,language}).length<250)
 const route=read('app/api/holistic-support/audio-storyboard/route.js')
 assert.match(route,/enabled:process.env.HH_MY_COACH_STT_GLOSSARY_ENABLED==="true"/)
 assert.match(route,/if\(glossary\)multipart.set\("prompt",glossary\)/)
 assert.doesNotMatch(route,/form.get\("prompt"\)/)
 assert.ok(route.indexOf('createRequestAuth(request,config).verified()')<route.indexOf('const glossary=coachSpeechReviewGlossary'))
})

import {useCoachLargeV3} from '../lib/coaching/coach-stt-model.mjs'
test('Large V3 is independently free-gated and cannot change Ali or Studio',()=>{
  const review={purpose:'my_coach',textOnly:true,fileName:'coach-review.wav'}
  const basic={...review,fileName:'coach-turn.wav'}
  assert.equal(useCoachLargeV3(review),false)
  assert.equal(useCoachLargeV3({...review,freeConfirmed:true}),false)
  assert.equal(useCoachLargeV3({...review,freeConfirmed:'true'}),true)
  assert.equal(useCoachLargeV3({...basic,freeConfirmed:'true'}),false)
  assert.equal(useCoachLargeV3({...basic,basicEnabled:'true'}),false)
  assert.equal(useCoachLargeV3({...basic,freeConfirmed:'true',basicEnabled:'true'}),true)
  assert.equal(useCoachLargeV3({...review,purpose:'ali_chat',freeConfirmed:'true',basicEnabled:'true'}),false)
  assert.equal(useCoachLargeV3({...review,purpose:null,freeConfirmed:'true',basicEnabled:'true'}),false)
  assert.equal(useCoachLargeV3({...review,textOnly:false,freeConfirmed:'true'}),false)
  const api=read('app/api/holistic-support/audio-storyboard/route.js')
  assert.ok(api.indexOf('HH_AUDIO_STT_FREE_CONFIRMED')<api.indexOf('if(useCoachLargeV3('))
  assert.ok(api.indexOf('createRequestAuth(request,config).verified()')<api.indexOf('if(useCoachLargeV3('))
  assert.ok(api.includes('multipart.set("model","whisper-large-v3")'))
  assert.ok(api.includes('freeConfirmed:process.env.HH_MY_COACH_STT_LARGE_V3_FREE_CONFIRMED'))
  assert.ok(api.includes('basicEnabled:process.env.HH_MY_COACH_STT_LARGE_V3_BASIC_ENABLED'))
})
