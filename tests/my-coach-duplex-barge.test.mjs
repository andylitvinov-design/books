import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {startCoachRecordedTurn} from '../lib/personal-coaching/coach-recorded-turn.mjs'
import {createCoachBargeGate,isCoachBargeEcho} from '../lib/personal-coaching/coach-barge-in.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

function fakeAudioEnvironment({userAgent='Desktop Chromium',muteFirstCapture=false}={}){
 let clock=0,energy=0,tick=null,stopped=0,uploads=0,captures=0;
 class Recorder{
  static isTypeSupported(m){return m==='audio/mp4'}
  state='inactive';mimeType='audio/mp4'
  start(){this.state='recording'}
  stop(){
   if(this.state!=='recording')return
   this.state='inactive'
   this.ondataavailable?.({data:new Blob([new Uint8Array(2000)])})
   this.onstop?.()
  }
 }
 class Context{
  state='running'
  createMediaStreamSource(){return {connect(){},disconnect(){}}}
  createAnalyser(){return {fftSize:0,getByteTimeDomainData(arr){arr.fill(128+Math.round(energy*128))}}}
  resume(){return Promise.resolve()}
  close(){return Promise.resolve()}
 }
 const environment={
  navigator:{userAgent,mediaDevices:{getUserMedia:async()=>{
   captures++
   const track={kind:'audio',muted:muteFirstCapture&&captures===1,
     readyState:'live',stop(){stopped++}}
   return {getTracks:()=>[track],getAudioTracks:()=>[track]}
  }}},
  MediaRecorder:Recorder,AudioContext:Context,File,FormData,Blob,
  fetch:async(url,init)=>{
   assert.equal(url,'/api/holistic-support/audio-storyboard')
   assert.equal(init.method,'POST')
   assert.equal(init.body.get('locale'),'ru')
   uploads++
   return {ok:true,json:async()=>({transcript:{text:'Я хочу уточнить вашу мысль'}})}
  },
  setInterval(fn){tick=fn;return 1},
  clearInterval(){tick=null},
  performance:{now:()=>clock},
 }
 return {environment,pulse(rms,ms=100){clock+=ms;energy=rms;tick?.()},get uploading(){return uploads},
  get stopped(){return stopped},get ticker(){return tick},
  get captureRequests(){return captures}}
}

test('voice monitor ducks then restores after playback echo disappears without any STT request',async()=>{
 const sound=fakeAudioEnvironment(),calls=[]
 const c=startCoachRecordedTurn({locale:'ru',environment:sound.environment,monitorPlayback:true,
  onCandidate:()=>calls.push('duck'),onCandidateExpired:()=>calls.push('restore'),
  onSpeechDetected:()=>calls.push('interrupt'),onFailure:code=>assert.fail(code)})
 for(let i=0;i<20&&!sound.ticker;i++)await new Promise(r=>setImmediate(r))
 sound.pulse(.1);sound.pulse(.1);assert.deepEqual(calls,['duck'])
 sound.pulse(0);sound.pulse(0);assert.deepEqual(calls,['duck','restore'])
 assert.equal(sound.uploading,0,'candidate audio never leaves the browser')
 c.cancel();assert.equal(sound.uploading,0);assert.ok(sound.stopped>0)
})
test('iPhone low-energy user speech triggers a local interrupt while audio plays',async()=>{
 const sound=fakeAudioEnvironment({userAgent:'iPhone Safari/27.2'}),calls=[]
 const monitor=startCoachRecordedTurn({locale:'ru',environment:sound.environment,
   monitorPlayback:true,onCandidate:()=>calls.push('duck'),
   onCandidateExpired:()=>calls.push('restore'),
   onSpeechDetected:()=>calls.push('interrupt'),onFailure:code=>assert.fail(code)})
 for(let i=0;i<20&&!sound.ticker;i++)await new Promise(r=>setImmediate(r))
 for(let i=0;i<4;i++)sound.pulse(.023)
 assert.deepEqual(calls,['duck','interrupt'])
 assert.equal(sound.uploading,0,'no Whisper request until a human utterance ends')
 monitor.cancel()
})
test('confirmed speech stops coach before recording ends and transcribes once',async()=>{
 const sound=fakeAudioEnvironment(),calls=[]
 let transcript=''
 const c=startCoachRecordedTurn({locale:'ru',environment:sound.environment,monitorPlayback:true,
  onCandidate:()=>calls.push('duck'),onCandidateExpired:()=>calls.push('restore'),
  onSpeechDetected:()=>calls.push('interrupt'),onResult:x=>{transcript=x},
  onFailure:code=>assert.fail(code)})
 for(let i=0;i<20&&!sound.ticker;i++)await new Promise(r=>setImmediate(r))
 sound.pulse(.1);sound.pulse(.1)
 sound.pulse(.1);sound.pulse(.1);sound.pulse(.1)
 assert.deepEqual(calls,['duck','interrupt'])
 assert.equal(sound.uploading,0,'TTS must stop before one confirmed phrase is uploaded')
 for(let j=0;j<12;j++)sound.pulse(0)
 for(let i=0;i<30&&!transcript;i++)await new Promise(r=>setImmediate(r))
 assert.equal(sound.uploading,1)
 assert.equal(transcript,'Я хочу уточнить вашу мысль')
 c.cancel()
})
test('uninterrupted coach handoff reuses mic track without a second permission request',async()=>{
 const sound=fakeAudioEnvironment();let replies=0
 const c=startCoachRecordedTurn({environment:sound.environment,locale:'ru',monitorPlayback:true,
   onResult:()=>replies++,onFailure:code=>assert.fail(code)})
 for(let i=0;i<20&&!sound.ticker;i++)await new Promise(r=>setImmediate(r))
 assert.equal(c.continueAfterCoach(),true)
 assert.equal(c.continueAfterCoach(),false)
 sound.pulse(.09);sound.pulse(.09)
 for(let j=0;j<20;j++)sound.pulse(0)
 for(let i=0;i<20&&!replies;i++)await new Promise(r=>setImmediate(r))
 assert.equal(replies,1)
 assert.equal(sound.uploading,1)
 c.cancel()
})
test('voice loop truly cancels one outgoing stream but preserves the captured client utterance',()=>{
 const ui=source('components/my-coach-speech-loop.jsx')
 const recorder=source('lib/personal-coaching/coach-recorded-turn.mjs')
 const player=source('lib/personal-coaching/streamed-mp3-playback.mjs')
 const codec=source('lib/personal-coaching/streamed-mp3-webcodecs.mjs')
 for(const marker of ['beginVoiceBargeMonitor(generation)','monitorPlayback:true','onCandidate:()=>',
   'onSpeechDetected:()=>','cancelOutgoingCoachSpeech()',
   'recordedTurnRef.current?.continueAfterCoach?.()','interruptCoachToListen()',
   'isCoachBargeEcho(value,lastSpokenCoachRef.current)'])
   assert.ok(ui.includes(marker),marker)
 assert.match(recorder,/monitorPlayback=false/)
 assert.match(recorder,/continueAfterCoach\(\)/)
 assert.match(recorder,/onSpeechDetected\(\)/)
 assert.match(player,/setVolume=volume=>/)
 assert.match(codec,/destination\|\|audioContext.destination/)
 assert.doesNotMatch(ui,/new WebSocket|MediaRecorder\(|sendBeacon/)
})
test('voice reasoning adapts to complexity while Director guard remains authoritative',()=>{
 const form=source('lib/coaching/generative-persona.mjs')
 const server=source('lib/app/coaching-brain.js')
 const groq=source('lib/coaching/groq-coach-provider.mjs')
 const ui=source('components/my-coach-live-dialogue.jsx')
 assert.match(ui,/voiceTurn:voiceTurn===true/)
 assert.match(form,/voiceTurn:body.voiceTurn===true/)
 assert.match(server,/voiceMode:persona!==null&&input.voiceTurn===true/)
 assert.match(server,/enforceCoachSessionDirective\(parsed,directive\)/)
 assert.match(groq,/if\(voiceMode\)\{/)
 assert.match(groq,/return substantive\|\|\(asksToCompare&&\!declinesComparison\)\?'medium':'low'/)
 assert.match(groq,/response_format:COACH_RESPONSE_FORMAT/)
 assert.doesNotMatch(groq,/stream:true/)
})
test('iPhone defaults to already-guarded WebCodecs while 0 disables it',async()=>{
 const {coachingWebCodecsOptIn}=await import('../lib/personal-coaching/streamed-mp3-webcodecs.mjs')
 const w={AudioDecoder:class{},EncodedAudioChunk:class{},location:{search:''},navigator:{userAgent:'iPhone Safari/27.2',platform:'iPhone'}}
 assert.equal(coachingWebCodecsOptIn(w),true)
 w.location.search='?coachStream=0'
 assert.equal(coachingWebCodecsOptIn(w),false)
 w.location.search='?coachStream=1'
 assert.equal(coachingWebCodecsOptIn(w),true)
 w.location.search=''
 w.navigator.userAgent='Desktop Chrome/132';w.navigator.platform='Win32'
 assert.equal(coachingWebCodecsOptIn(w),false)
})

test('iOS Safari reset cue failure preserves the live coach and offers microphone retry',()=>{
 const ui=source('components/my-coach-speech-loop.jsx')
 assert.match(ui,/iosCueBrokenRef\.current=true/)
 assert.match(ui,/iosCueBrokenRef\.current&&recordedSttUnavailableRef\.current/)
 assert.match(ui,/recognition\.onstart=null;recognition\.onresult=null/)
 assert.match(ui,/changePhase\('ready'\);setNotice\(t\.iosCueFailed\)/)
 assert.doesNotMatch(ui,/silence\(\);changePhase\('idle'\);setNotice\(t\.iosCueFailed\)/)
 assert.match(ui,/final\?500:1900/)
})
test('live voice conversational policy favors direct brief responses without dropping the Director',()=>{
 const prompt=source('lib/coaching/conversational-persona.mjs')
 const brain=source('lib/app/coaching-brain.js')
 assert.match(prompt,/LIVE VOICE: reply with one or two brief spoken sentences/)
 assert.match(prompt,/input\.voiceTurn===true/)
 assert.match(brain,/enforceCoachSessionDirective\(parsed,directive\)/)
})

test('iPhone silent microphone recovers once locally, never uploads silence or fakes listening',async()=>{
 let time=0,timer=null,requested=0,stopped=0,uploads=0;
 const states=[],failures=[],levels=[];
 class Recorder{
  static isTypeSupported(type){return type==='audio/mp4'}
  state='inactive';mimeType='audio/mp4';
  start(){this.state='recording'}
  stop(){if(this.state!=='recording')return;this.state='inactive';this.onstop?.()}
 }
 class Context{
  state='running'
  createMediaStreamSource(){return {connect(){},disconnect(){}}}
  createAnalyser(){return {fftSize:1024,getByteTimeDomainData(buffer){buffer.fill(128)}}}
  resume(){return Promise.resolve()}
  close(){return Promise.resolve()}
 }
 const env={
  navigator:{mediaDevices:{getUserMedia:async()=>{
   requested++;
   const track={kind:'audio',muted:requested===1,readyState:'live',stop(){stopped++}}
   return {getTracks:()=>[track],getAudioTracks:()=>[track]}
  }}},
  MediaRecorder:Recorder,AudioContext:Context,
  fetch:async()=>{uploads++;throw Error('SILENCE_MUST_NOT_UPLOAD')},
  setInterval(fn){timer=fn;return 1},clearInterval(){timer=null},
  performance:{now:()=>time},
 }
 const capture=startCoachRecordedTurn({locale:'ru',environment:env,
   onLevel:level=>levels.push(level),onState:state=>states.push(state),
   onFailure:code=>failures.push(code)})
 for(let i=0;i<30&&!timer;i++)await new Promise(resolve=>setImmediate(resolve))
 for(let i=0;i<12;i++){time+=100;timer?.()}
 for(let i=0;i<30&&(requested<2||!timer);i++)await new Promise(resolve=>setImmediate(resolve))
 assert.equal(requested,2,'first muted input causes exactly one local reacquisition')
 assert.equal(typeof timer,'function','new microphone stream has a working sample timer')
 assert.ok(states.includes('recovering'))
 for(let i=0;i<60;i++){time+=100;timer?.()}
 assert.deepEqual(failures,[],
   'a genuinely quiet but unmuted replacement mic must remain usable')
 assert.equal(requested,2,'the app must not spin on new microphone permission requests')
 assert.equal(uploads,0,'no Whisper request for silence or health recovery')
 capture.cancel()
 assert.ok(stopped>=2)
 assert.equal(levels.at(-1),0)
})

test('ordinary quiet environment remains listening and does not spend a provider request',async()=>{
 let now=0,tick=null,requested=0,uploads=0,quiet=0,failed=0;
 class Recorder{
  static isTypeSupported(type){return type==='audio/mp4'}
  state='inactive';mimeType='audio/mp4'
  start(){this.state='recording'}
  stop(){this.state='inactive';this.onstop?.()}
 }
 class Context{
  state='running'
  createMediaStreamSource(){return {connect(){},disconnect(){}}}
  createAnalyser(){return {fftSize:1024,getByteTimeDomainData(b){b.fill(129)}}}
  resume(){return Promise.resolve()}
  close(){return Promise.resolve()}
 }
 const env={
  navigator:{mediaDevices:{getUserMedia:async()=>{requested++;
    const track={kind:'audio',muted:false,readyState:'live',stop(){}}
    return {getTracks:()=>[track],getAudioTracks:()=>[track]}}}},
  MediaRecorder:Recorder,AudioContext:Context,
  fetch:async()=>{uploads++;throw Error('NO_SILENCE_UPLOAD')},
  setInterval(fn){tick=fn;return 1},clearInterval(){tick=null},
  performance:{now:()=>now},
 }
 const capture=startCoachRecordedTurn({environment:env,
  onState:state=>{if(state==='quiet')quiet++},onFailure:()=>failed++})
 for(let i=0;i<30&&!tick;i++)await new Promise(resolve=>setImmediate(resolve))
 for(let i=0;i<92;i++){now+=100;tick?.()}
 assert.equal(requested,1,'ambient quiet does not restart the microphone')
 assert.equal(uploads,0)
 assert.equal(failed,0)
 assert.equal(quiet,1,'quiet is a truthful status, not a capture failure')
 capture.cancel()
})

test('recorded microphone failure leaves coach in ready with localized retry and no fake Listening',()=>{
 const speech=source('components/my-coach-speech-loop.jsx');
 assert.match(speech,/if\(code==='MIC_NO_SIGNAL'\)/);
 assert.match(speech,/changePhase\('ready'\);setNotice\(t\.audioNoSignal\)/);
 assert.match(speech,/if\(status==='recovering'\)/);
})

test('persistently muted iPhone audio track stops after one bounded recovery, no paid STT',async()=>{
 let clock=0,tick=null,acquires=0,uploads=0;const errors=[];
 class Recorder{
  static isTypeSupported(type){return type==='audio/mp4'}
  state='inactive';mimeType='audio/mp4';
  start(){this.state='recording'}
  stop(){if(this.state!=='recording')return;this.state='inactive';this.onstop?.()}
 }
 class Context{
  state='running'
  createMediaStreamSource(){return {connect(){},disconnect(){}}}
  createAnalyser(){return {fftSize:1024,getByteTimeDomainData(buf){buf.fill(128)}}}
  resume(){return Promise.resolve()}
  close(){return Promise.resolve()}
 }
 const environment={
  navigator:{mediaDevices:{getUserMedia:async()=>{
   acquires++;
   const track={kind:'audio',muted:true,readyState:'live',stop(){}}
   return {getTracks:()=>[track],getAudioTracks:()=>[track]}
  }}},
  MediaRecorder:Recorder,AudioContext:Context,
  setInterval(fn){tick=fn;return 1},clearInterval(){tick=null},
  performance:{now:()=>clock},
  fetch:async()=>{uploads++;throw Error('NO_STT_FOR_SILENCE')}
 }
 const capture=startCoachRecordedTurn({environment,onFailure:code=>errors.push(code)})
 for(let i=0;i<30&&!tick;i++)await new Promise(resolve=>setImmediate(resolve))
 for(let i=0;i<8;i++){clock+=100;tick?.()}
 for(let i=0;i<30&&(acquires<2||!tick);i++)await new Promise(resolve=>setImmediate(resolve))
 for(let i=0;i<8;i++){clock+=100;tick?.()}
 assert.equal(acquires,2)
 assert.deepEqual(errors,['MIC_NO_SIGNAL'])
 assert.equal(uploads,0)
 capture.cancel()
})

test('iPhone barge monitor reacquires a muted output track and still interrupts locally',async()=>{
 const sound=fakeAudioEnvironment({userAgent:'iPhone Safari/27.2',muteFirstCapture:true})
 const states=[],failures=[],calls=[]
 const monitor=startCoachRecordedTurn({locale:'ru',environment:sound.environment,
  monitorPlayback:true,onState:state=>states.push(state),onFailure:code=>failures.push(code),
  onSpeechDetected:()=>calls.push('interrupt')})
 for(let i=0;i<30&&!sound.ticker;i++)await new Promise(resolve=>setImmediate(resolve))
 for(let i=0;i<9;i++)sound.pulse(0)
 for(let i=0;i<30&&(sound.captureRequests<2||!sound.ticker);i++)
   await new Promise(resolve=>setImmediate(resolve))
 assert.equal(sound.captureRequests,2,'WebKit muted monitor is reacquired once')
 assert.ok(states.includes('recovering'),'user sees a recovery state before unavailable')
 assert.deepEqual(failures,[],'transient muted monitor is not immediately disabled')
 for(let i=0;i<4;i++)sound.pulse(.045)
 assert.deepEqual(calls,['interrupt'])
 assert.equal(sound.uploading,0,'no model/STT call before user utterance finishes')
 monitor.cancel()
})

test('iPhone digitally silent barge monitor reacquires once, without retrying forever',async()=>{
 const sound=fakeAudioEnvironment({userAgent:'iPhone Safari/27.2'})
 const failures=[]
 const monitor=startCoachRecordedTurn({locale:'ru',environment:sound.environment,
  monitorPlayback:true,onFailure:code=>failures.push(code)})
 for(let i=0;i<30&&!sound.ticker;i++)await new Promise(resolve=>setImmediate(resolve))
 for(let i=0;i<46;i++)sound.pulse(0)
 for(let i=0;i<30&&(sound.captureRequests<2||!sound.ticker);i++)
   await new Promise(resolve=>setImmediate(resolve))
 assert.equal(sound.captureRequests,2)
 for(let i=0;i<80;i++)sound.pulse(0)
 assert.equal(sound.captureRequests,2,'quiet room must not cause an endless reset loop')
 assert.deepEqual(failures,[])
 assert.equal(sound.uploading,0,'no ambient silence is uploaded')
 monitor.cancel()
})

test('Safari capture loss must not permanently disable Groq STT or require the cue fallback',()=>{
 const ui=source('components/my-coach-speech-loop.jsx')
 assert.match(ui,/if\(code==='MIC_CAPTURE'\)/)
 assert.match(ui,/const recovery=captureRetryRef\.current/)
 assert.match(ui,/if\(code==='STT_UNAVAILABLE'\)/)
 assert.doesNotMatch(ui,/\['STT_UNAVAILABLE','MIC_CAPTURE'\]\.includes\(code\)/)
 assert.match(ui,/changePhase\('ready'\);setNotice\(t\.captureFailed\)/)
})
