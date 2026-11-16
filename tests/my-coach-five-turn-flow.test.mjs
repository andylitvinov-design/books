// Execute the REAL MyCoachSpeechLoop callbacks in an isolated synthetic browser
// environment. No external AI, speech vendor, audio recording or browser permission.
// This checks five consecutive speech -> AI -> natural-TTS -> speech transitions;
// it is NOT physical iOS Safari microphone/audio evidence.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {chooseDictationLanguage,detectedSpeechLocale,coachSpokenTurnLocale,ios27NeedsSpeechRecovery,
  readDictationResults,hasCoachSpokenAnswer} from '../lib/personal-coaching/my-coach-dictation.mjs'
import {appendSpokenAnswer} from '../lib/personal-coaching/speech-text.js'

const source=readFileSync(new URL('../components/my-coach-speech-loop.jsx',import.meta.url),'utf8')
const start=source.indexOf('const words={')
const end=source.indexOf("  const active=phase!=='idle'",start)
assert.ok(start>=0&&end>start,'the tested slice is the real voice controller, not a replica')
const executable=source.slice(start,end)+'\n  return null\n})\nMyCoachSpeechLoop'

function createSession({ttsFailures=[],respond}={}){
  const voices=[],inputs=[],phases=[],timers=new Map()
  let id=0,starts=0,intros=0,ttsCalls=0,cues=0,spoken=0
  class Recognition{
    constructor(){this.started=false;this.aborted=false;voices.push(this)}
    start(){this.started=true;this.onstart?.()}
    abort(){this.aborted=true}
    hear(text){
      assert.equal(this.started,true,'only an already-started recognizer can hear speech')
      assert.equal(this.aborted,false,'never deliver from an aborted recognizer')
      this.onresult?.({results:[{isFinal:true,0:{transcript:text}}]})
      this.onend?.() // Safari's own natural end; NEVER stop() or abort() recognized words
    }
  }
  const navigator={
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1',
    platform:'iPhone',maxTouchPoints:5,languages:['ru-RU'],language:'ru-RU',
    mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})},
  }
  const fakeWindow={
    navigator,SpeechRecognition:Recognition,webkitSpeechRecognition:Recognition,
    SpeechSynthesisUtterance:class{constructor(text){this.text=text}},
    speechSynthesis:{
      cancel(){},
      speak(cue){cues++;queueMicrotask(()=>cue.onend?.())},
    },
  }
  const fakeDocument={visibilityState:'visible',addEventListener(){},removeEventListener(){}}
  const hooks={
    forwardRef:fn=>fn,
    useRef:value=>({current:value}),
    useState:value=>[value,()=>{}],
    useEffect:callback=>{callback()},
    useImperativeHandle:(reference,factory)=>{reference.current=factory()},
  }
  const schedule=(fn,ms)=>{const current=++id;timers.set(current,{fn,ms});return current}
  const cancel=id=>timers.delete(id)
  const sandbox={
    ...hooks,window:fakeWindow,document:fakeDocument,
    setTimeout:schedule,clearTimeout:cancel,queueMicrotask,AbortController,
    chooseDictationLanguage,detectedSpeechLocale,coachSpokenTurnLocale,ios27NeedsSpeechRecovery,
    readDictationResults,appendSpokenAnswer,hasCoachSpokenAnswer,
    coachSpokenText:text=>({text}),
    coachIntroAudioPath:(persona,locale)=>'/api/coaching/intro/'+locale+'/'+persona,
    startDirectCoachIntroAudio:(_path,{onStart,onEnd})=>{
      intros++
      queueMicrotask(()=>{onStart?.();onEnd?.()})
      return {cancel(){}}
    },
    primeCoachingAudioGesture:()=>({}),unlockCoachingAudioContext:()=>null,
    shouldUseCoachingWebAudio:()=>false,
    fetch:async()=>{
      const current=++ttsCalls
      return {ok:!ttsFailures.includes(current),body:{}}
    },
    startCoachingMp3Playback:(_response,{onStart,onEnd})=>{
      spoken++
      queueMicrotask(()=>{onStart?.();onEnd?.()})
      return {cancel(){}}
    },
  }
  const Component=runInNewContext(executable,sandbox,{timeout:1500})
  const ref={current:null}
  const reply=respond||((text,index)=>({reply:'Мира отвечает на ход '+index,mode:'ai'}))
  Component({
    locale:'ru',speechLocale:'ru',initialDraft:'',enabled:true,canStart:true,
    cloudAvailable:true,cloudAgreed:true,cloudProvider:'fish_free',
    personaId:'mira',introduction:'Здравствуйте! Я Мира.',
    onSessionStart:()=>{starts++},
    onTurn:async (text,spoken)=>{assert.equal(spoken?.locale,'ru','manual RU remains authoritative for synthetic turns');inputs.push(text);return reply(text,inputs.length)},
    onCancelTurn(){},onVoiceStateChange:state=>phases.push(state.phase),
    onVoiceLevel(){},onTranscript(){},onDraft(){},
  },ref)
  return {
    ref,voices,inputs,phases,
    get starts(){return starts},
    get intros(){return intros},
    get ttsCalls(){return ttsCalls},
    get spoken(){return spoken},
    get cues(){return cues},
    flushShortTimers(){
      for(const [key,t] of [...timers])if(t.ms<=500){timers.delete(key);t.fn()}
    },
    flushDelay(ms){
      for(const [key,t] of [...timers])if(t.ms===ms){timers.delete(key);t.fn()}
    },
  }
}
async function nextMic(session,count){
  for(let attempt=0;attempt<80;attempt++){
    await new Promise(resolve=>setImmediate(resolve))
    const mic=session.voices[count-1]
    if(mic?.started)return mic
  }
  assert.fail('mic '+count+' did not re-arm automatically without a user tap')
}
test('one Play sustains five iOS 27 synthetic turns and recovers one failed natural voice',async()=>{
  const session=createSession({ttsFailures:[3]})
  assert.equal(session.ref.current.startSession('Здравствуйте! Я Мира.',{naturalVoice:true}),true)
  let mic=await nextMic(session,1)
  const phrases=['Я хочу обсудить тревогу','Мне важно быть услышанным',
    'У меня это связано с работой','Я часто останавливаю дыхание',
    'Я готов выбрать небольшой шаг']
  for(let turn=0;turn<phrases.length;turn++){
    mic.hear(phrases[turn])
    mic=await nextMic(session,turn+2)
  }
  assert.equal(session.starts,1,'only the FIRST portrait Play authorizes the entire session')
  assert.equal(session.intros,1,'the original introduction is not played repeatedly')
  assert.deepEqual(session.inputs,phrases,'all five user turns reach the model exactly once')
  assert.equal(session.ttsCalls,5,'one synthesis attempt per answer, no paid retry')
  assert.equal(session.spoken,4,'one failed TTS cannot stop later turns')
  assert.equal(session.cues,5,'a short completed WebKit reset cue precedes every follow-up STT')
  assert.ok(session.phases.includes('listening'))
  assert.ok(session.phases.includes('speaking'))
  session.ref.current.stop()
  assert.equal(mic.aborted,true,'explicit End releases microphone immediately')
  assert.equal(session.phases.at(-1),'idle')
})
test('temporary speech-network errors auto-rearm; permission denial and End stop',async()=>{
  const session=createSession()
  session.ref.current.startSession('Здравствуйте! Я Мира.',{naturalVoice:true})
  const mic=await nextMic(session,1)
  mic.onerror?.({error:'network'})
  assert.equal(mic.aborted,true,'old silent recognizer detached before bounded retry')
  session.flushShortTimers()
  const recovered=await nextMic(session,2)
  recovered.hear('Это вторая попытка без новой кнопки')
  await nextMic(session,3)
  assert.deepEqual(session.inputs,['Это вторая попытка без новой кнопки'])
  session.voices.at(-1).onerror?.({error:'not-allowed'})
  assert.equal(session.phases.at(-1),'idle','permission denial always stops')
  assert.equal(session.voices.at(-1).aborted,true)
})
test('safety reply stops the speech loop rather than prompting for another user turn',async()=>{
  const session=createSession({respond:()=>({reply:'Please seek human support.',mode:'safety'})})
  session.ref.current.startSession('Здравствуйте! Я Мира.',{naturalVoice:true})
  const mic=await nextMic(session,1)
  mic.hear('Мне сейчас небезопасно')
  for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve))
  assert.equal(session.voices.length,1,'no automatic listening after safety stop')
  assert.equal(session.phases.at(-1),'idle')
  assert.deepEqual(session.inputs,['Мне сейчас небезопасно'])
})

test('iOS 27 naturally ends short yes/no turns without poisoning the next mic',async()=>{
 const session=createSession()
 session.ref.current.startSession('Здравствуйте! Я Мира.',{naturalVoice:true})
 const noiseMic=await nextMic(session,1)
 noiseMic.onresult?.({results:[{isFinal:false,0:{transcript:'а'}}]})
 session.flushDelay(6500)
 assert.equal(noiseMic.aborted,false,'one-letter interim must not abort a heard iOS recognizer')
 noiseMic.onend?.()
 session.flushShortTimers()
 let mic=await nextMic(session,2)
 for(const [index,answer] of ['Да','No','Sí','42'].entries()){
  mic.hear(answer)
  mic=await nextMic(session,index+3)
 }
 assert.deepEqual(session.inputs,['Да','No','Sí','42'])
 assert.equal(session.starts,1,'one Play starts all short utterances')
 assert.equal(session.ttsCalls,4,'four replies with no duplicate syntheses')
 assert.equal(session.cues,4,'short responses preserve WebKit recovery cues')
 session.ref.current.stop()
 assert.equal(mic.aborted,true)
})

test('one Play sustains TEN synthetic iOS 27 client/coach turns with bounded TTS failures',async()=>{
  const session=createSession({ttsFailures:[2,7]})
  assert.equal(session.ref.current.startSession('Здравствуйте! Я Мира.',{naturalVoice:true}),true)
  let mic=await nextMic(session,1)
  const phrases=Array.from({length:10},(_,index)=>'Ход клиента номер '+(index+1))
  for(let i=0;i<phrases.length;i++){
    mic.hear(phrases[i])
    mic=await nextMic(session,i+2)
  }
  assert.equal(session.starts,1,'no second Play after beginning')
  assert.equal(session.intros,1,'one authored introduction per session')
  assert.deepEqual(session.inputs,phrases,'all ten distinct user phrases delivered once')
  assert.equal(session.ttsCalls,10,'no hidden provider retries')
  assert.equal(session.spoken,8,'failed natural audio does not freeze later turns')
  assert.equal(session.cues,10,'each subsequent Safari mic start follows one recovery cue')
  session.ref.current.stop()
  assert.equal(mic.aborted,true)
  assert.equal(session.phases.at(-1),'idle')
})
test('The existing mobile timebox pauses with the deliberate Pause control',()=>{
  const source=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  assert.match(source,/document\.visibilityState==='visible'&&!paused/)
  assert.match(source,/\},\[sessionClockStarted,paused\]\)/)
})
