import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {coachBargeInMode,canInterruptCoach} from '../lib/personal-coaching/coach-barge-in.mjs'
import {createCoachVoiceGate} from '../lib/personal-coaching/coach-recorded-turn.mjs'
import {verifiedGroqCoachingReply,GROQ_COACH_MODEL} from '../lib/coaching/groq-coach-provider.mjs'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {chooseDictationLanguage,coachSpokenTurnLocale,readDictationResults,
  detectedSpeechLocale,ios27NeedsSpeechRecovery,hasCoachSpokenAnswer} from '../lib/personal-coaching/my-coach-dictation.mjs'
import {appendSpokenAnswer} from '../lib/personal-coaching/speech-text.js'

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('automatic hands-free barge-in protects iPhone 27 audio without blocking one-tap interrupt',()=>{
 const iphone={navigator:{userAgent:'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/27.2 Mobile Safari/604.1'},
   location:{search:''}}
 assert.equal(coachBargeInMode(iphone,true),'tap')
 iphone.location.search='?coachBarge=1'
 assert.equal(coachBargeInMode(iphone,true),'voice')
 iphone.location.search='?coachBarge=0'
 assert.equal(coachBargeInMode(iphone,true),'tap')
 assert.equal(coachBargeInMode({navigator:{userAgent:'Android Chrome'},location:{search:''}},true),'voice')
 assert.equal(coachBargeInMode({navigator:{userAgent:'Macintosh Safari'},location:{search:'?coachBarge=1'}},false),'tap')
 assert.equal(canInterruptCoach('speaking'),true)
 assert.equal(canInterruptCoach('loading'),true)
 assert.equal(canInterruptCoach('thinking'),true)
 for(const state of ['idle','ready','listening','starting'])assert.equal(canInterruptCoach(state),false)
})
test('echo-resistant local VAD requires several sustained ticks and shortens post-speech silence',()=>{
 const g=createCoachVoiceGate({silenceMs:1050,minRms:0.052,noiseRatio:3.8,minTicks:4,warmupMs:450})
 for(const t of [0,100,200,300,400])assert.equal(g.update(t,0.02),'silence')
 assert.equal(g.update(500,0.13),'silence')
 assert.equal(g.update(600,0.13),'silence')
 assert.equal(g.update(700,0.13),'silence')
 assert.equal(g.update(800,0.13),'speech')
 assert.equal(g.heard,true)
 assert.equal(g.update(900,0.002),'speech')
 assert.equal(g.update(1850,0.002),'finish')
})
test('iPhone recorded turn monitoring does not send the coach prelude as an audio upload',()=>{
 const capture=src('lib/personal-coaching/coach-recorded-turn.mjs')
 assert.match(capture,/monitorDuringPlayback=false/)
 assert.match(capture,/onSpeech=\(\)=>\{\}/)
 assert.match(capture,/if\(!seenSpeech\)\{preSpeechChunk=e\.data;return;\}/)
 assert.match(capture,/silenceMs,minRms:0\.052,noiseRatio:3\.8,minTicks:4,warmupMs:450/)
 assert.match(capture,/if\(!monitorDuringPlayback\)onState\('listening'\)/)
 assert.match(capture,/controller\.abort\(\);closeCapture\(\);chunks=\[\]/)
})
test('spoken turns use the existing gated model once, with concise voice-only response policy',()=>{
 const ui=src('components/my-coach-live-dialogue.jsx')
 const input=src('lib/coaching/generative-persona.mjs')
 const provider=src('lib/coaching/groq-coach-provider.mjs')
 const brain=src('lib/app/coaching-brain.js')
 assert.match(ui,/voiceTurn:voiceTurn===true/)
 assert.match(input,/voiceTurn:body\.voiceTurn===true/)
 assert.match(brain,/fastVoice:Boolean\(persona&&input\.voiceTurn\)/)
 assert.match(provider,/normalEffort==='medium'\?'low'/)
 assert.match(provider,/max_completion_tokens:probe\?512:fastVoice\?1400:1800/)
 assert.match(src('lib/coaching/conversational-persona.mjs'),/VOICE TURN: respond like a real conversation/)
})

test('a single live Play survives cutting off the intro and a dynamically synthesized coach answer',async()=>{
 const source=src('components/my-coach-speech-loop.jsx')
 const start=source.indexOf('const words={'),end=source.indexOf("  const active=phase!=='idle'",start)
 assert.ok(start>=0&&end>start)
 const executable=source.slice(start,end)+'\n  return null\n})\nMyCoachSpeechLoop'
 const phones=[],phases=[],cancelled={intro:0,cloud:0},inputs=[]
 class Recognition{
  start(){this.started=true;this.onstart?.()}
  abort(){this.aborted=true}
  hear(text){this.onresult?.({results:[{isFinal:true,0:{transcript:text}}]});this.onend?.()}
 }
 const fakeWindow={navigator:{
   userAgent:'Mozilla/5.0 Android Chrome',languages:['ru-RU'],language:'ru-RU',
   mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})},
  },SpeechRecognition:class extends Recognition{constructor(){super();phones.push(this)}},
   speechSynthesis:{cancel(){}},location:{search:''}}
 const fakeDocument={visibilityState:'visible',addEventListener(){},removeEventListener(){}}
 const useRef=v=>({current:v})
 const sandbox={
  forwardRef:f=>f,useRef,useState:v=>[v,()=>{}],useEffect:f=>{f()},
  useImperativeHandle:(ref,f)=>{ref.current=f()},
  window:fakeWindow,document:fakeDocument,AbortController,setTimeout,clearTimeout,
  chooseDictationLanguage,coachSpokenTurnLocale,readDictationResults,detectedSpeechLocale,
  ios27NeedsSpeechRecovery,hasCoachSpokenAnswer,appendSpokenAnswer,
  coachBargeInMode,canInterruptCoach,
  coachRecordedSupported:()=>false,startCoachRecordedTurn:()=>null,
  coachVoiceFragmentNeedsReview:()=>false,coachDraftWithoutUncertainSpeech:x=>x,
  coachSpokenText:text=>({text}),
  coachIntroAudioPath:(persona,locale)=>'/api/coaching/intro/'+locale+'/'+persona,
  startDirectCoachIntroAudio:(_url,{onStart})=>{
    onStart?.()
    return {cancel(){cancelled.intro++}}
  },
  primeCoachingAudioGesture:()=>({}),unlockCoachingAudioContext:()=>null,
  shouldUseCoachingWebAudio:()=>false,
  fetch:async()=>({ok:true,body:{}}),
  startCoachingMp3Playback:(_res,{onStart})=>{
    onStart?.()
    return {cancel(){cancelled.cloud++}}
  },
 }
 const Component=runInNewContext(executable,sandbox,{timeout:1200})
 const ref={current:null};Component({
  locale:'ru',speechLocale:'ru',initialDraft:'',enabled:true,canStart:true,
  cloudAvailable:true,cloudAgreed:true,cloudProvider:'fish_free',personaId:'mira',
  introduction:'Привет, я Мира.',onSessionStart(){},
  onTurn:async text=>{inputs.push(text);return {reply:'Я понимаю. Как вы хотите продолжить?',locale:'ru',mode:'ai'}},
  onCancelTurn(){},onVoiceStateChange:s=>phases.push(s.phase),onVoiceLevel(){},onMicLevel(){},onTranscript(){},onDraft(){},
 },ref)
 assert.equal(ref.current.startSession('Привет, я Мира.',{naturalVoice:true}),true)
 assert.equal(phases.at(-1),'speaking')
 assert.equal(ref.current.interrupt(),true)
 await new Promise(r=>setImmediate(r))
 assert.ok(phones[0]?.started,'the next microphone starts without another Play')
 assert.equal(cancelled.intro,1)
 assert.equal(phases.at(-1),'listening')
 phones[0].hear('Мне важно разобраться')
 for(let i=0;i<20&&phases.at(-1)!=='speaking';i++)await new Promise(r=>setImmediate(r))
 assert.deepEqual(inputs,['Мне важно разобраться'])
 assert.equal(phases.at(-1),'speaking')
 assert.equal(ref.current.interrupt(),true)
 await new Promise(r=>setImmediate(r))
 assert.equal(cancelled.cloud,1)
 assert.ok(phones[1]?.started,'the second microphone re-arms without another Play')
 assert.equal(phases.at(-1),'listening')
 ref.current.stop()
 assert.equal(phases.at(-1),'idle')
})

test('explicit voice flag is bounded and Groq uses low effort without skipping JSON output schema',async()=>{
 const base={personaId:'mira',locale:'ru',settings:{},message:'Мне тревожно перед встречей и я хочу поговорить.',turns:[],consent:true};
 assert.equal(normalizeGenerativeCoachInput({...base,voiceTurn:true}).input.voiceTurn,true);
 assert.equal(normalizeGenerativeCoachInput(base).input.voiceTurn,false);
 assert.throws(()=>normalizeGenerativeCoachInput({...base,voiceTurn:'true'}),/COACHING_BRAIN_INPUT_INVALID/);
 let calls=0,body;
 const fetcher=async (_url,options)=>{
  calls++;body=JSON.parse(options.body)
  return {ok:true,status:200,text:async()=>JSON.stringify({model:GROQ_COACH_MODEL,
   choices:[{finish_reason:'stop',message:{content:JSON.stringify({message:'Это важная встреча. Что сейчас тревожит больше всего?',planSuggestion:'',evidenceQuote:'',clientEvidence:{kind:'none',quote:''}})}}]})}
 }
 const config={provider:'groq',preferredModel:GROQ_COACH_MODEL,apiKey:'gsk_'+'x'.repeat(32)};
 const messages=[{role:'user',content:base.message}];
 const result=await verifiedGroqCoachingReply(config,{messages,fastVoice:true},fetcher)
 assert.equal(calls,1)
 assert.equal(body.stream,false,'strict server-reviewed response still required')
 assert.equal(body.reasoning_effort,'low')
 assert.equal(body.max_completion_tokens,1400)
 assert.equal(body.response_format.json_schema.strict,true)
 assert.equal(result.reasoningEffort,'low')
});
