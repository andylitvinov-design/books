import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {startCoachRecordedTurn} from '../lib/personal-coaching/coach-recorded-turn.mjs'
import {createCoachBargeGate,isCoachBargeEcho} from '../lib/personal-coaching/coach-barge-in.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

function fakeAudioEnvironment(){
 let clock=0,energy=0,tick=null,stopped=0,uploads=0;
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
  navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++}}]})}},
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
  get stopped(){return stopped},get ticker(){return tick}}
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
test('voice requests are low-effort and conversational but Director guard remains authoritative',()=>{
 const form=source('lib/coaching/generative-persona.mjs')
 const server=source('lib/app/coaching-brain.js')
 const groq=source('lib/coaching/groq-coach-provider.mjs')
 const ui=source('components/my-coach-live-dialogue.jsx')
 assert.match(ui,/voiceTurn:voiceTurn===true/)
 assert.match(form,/voiceTurn:body.voiceTurn===true/)
 assert.match(server,/voiceMode:persona!==null&&input.voiceTurn===true/)
 assert.match(server,/enforceCoachSessionDirective\(parsed,directive\)/)
 assert.match(groq,/if\(probe\|\|voiceMode\)return 'low'/)
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
