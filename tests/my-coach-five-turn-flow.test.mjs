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
import {setCoachIos27AudioSession,refreshCoachIos27PlaybackRoute} from '../lib/personal-coaching/coach-ios-audio-route.mjs'
import {coachVoiceFragmentNeedsReview,coachDraftWithoutUncertainSpeech} from '../lib/personal-coaching/coach-voice-turn-quality.mjs'
import {coachRecordingMime,createCoachVoiceGate,coachFallbackLocale,coachRecordedSupported,startCoachRecordedTurn} from '../lib/personal-coaching/coach-recorded-turn.mjs'

const source=readFileSync(new URL('../components/my-coach-speech-loop.jsx',import.meta.url),'utf8')
const start=source.indexOf('const words={')
const end=source.indexOf("  const active=phase!=='idle'",start)
assert.ok(start>=0&&end>start,'the tested slice is the real voice controller, not a replica')
const executable=source.slice(start,end)+'\n  return null\n})\nMyCoachSpeechLoop'

function createSession({ttsFailures=[],respond,stuckCue=false,skipSpeechStart=false}={}){
  const voices=[],inputs=[],phases=[],cueVolumes=[],timers=new Map()
  let id=0,starts=0,intros=0,ttsCalls=0,cues=0,spoken=0,deviceSpoken=0
  class Recognition{
    constructor(){this.started=false;this.aborted=false;voices.push(this)}
    start(){this.started=true;if(!skipSpeechStart)this.onstart?.()}
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
    audioSession:{type:'auto'},
    mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})},
  }
  const fakeWindow={
    navigator,SpeechRecognition:Recognition,webkitSpeechRecognition:Recognition,
    SpeechSynthesisUtterance:class{constructor(text){this.text=text}},
    speechSynthesis:{
      cancel(){},
      speak(utterance){
        // Distinguish Safari's short audio-session cue from the no-cost
        // device-narration fallback. The latter has real start/end events.
        const recoveryCue=typeof utterance.volume==='number'
        if(recoveryCue){cues++;cueVolumes.push(utterance.volume)}
        else deviceSpoken++
        if(!recoveryCue||!stuckCue)
          queueMicrotask(()=>{utterance.onstart?.();utterance.onend?.()})
      },
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
    setCoachIos27AudioSession,
    // Feed the real category-reset logic into the evaluated controller, while
    // using a synthetic browser microtask instead of touching real hardware.
    refreshCoachIos27PlaybackRoute:(nav)=>refreshCoachIos27PlaybackRoute(nav,fn=>queueMicrotask(fn)),
    readDictationResults,appendSpokenAnswer,hasCoachSpokenAnswer,
    // The VM runs the real controller body; inject its real pure imports.
    coachVoiceFragmentNeedsReview,coachDraftWithoutUncertainSpeech,
    // In Web Speech-only fixtures the new iPhone recorder is intentionally absent.
    coachRecordedSupported:()=>false,startCoachRecordedTurn:()=>null,
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
    get deviceSpoken(){return deviceSpoken},
    get cues(){return cues},
    get cueVolumes(){return cueVolumes},
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
  assert.equal(session.spoken,4,'natural TTS still streams on four successful turns')
  assert.equal(session.deviceSpoken,1,'the failed natural turn is spoken by device instead of going silent')
  assert.equal(session.cues,6,'first post-MP3 mic and all five follow-ups each get a real recovery cue')
  assert.ok(session.cueVolumes.every(volume=>volume>0&&volume<=0.3),'a muted cue does not reset iOS audio')
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
 assert.equal(session.cues,6,'the initial recognizer, noise end and four replies all get recovery cues')
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
  assert.equal(session.spoken,8,'successful natural audio remains primary')
  assert.equal(session.deviceSpoken,2,'two natural failures receive audible device fallback')
  assert.equal(session.cues,11,'the first Safari turn also follows a recovery cue')
  session.ref.current.stop()
  assert.equal(mic.aborted,true)
  assert.equal(session.phases.at(-1),'idle')
})

test('a deaf iOS recognizer retries a bounded number of times, then stops claiming to listen',async()=>{
  const session=createSession()
  session.ref.current.startSession('Здравствуйте! Я Мира.',{naturalVoice:true})
  for(let count=1;count<=4;count++){
    const mic=await nextMic(session,count)
    session.flushDelay(9000) // Safari fired onstart but no speech/results/end
    assert.equal(mic.aborted,true,'detach a failed silent Safari recognizer')
    if(count<4)session.flushShortTimers()
  }
  assert.equal(session.phases.at(-1),'ready','preserve the one-Play session without a fake Listening indicator')
  assert.equal(session.cues,4,'only bounded local reset cues, no paid STT/TTS retry')
  assert.deepEqual(session.inputs,[])
  assert.equal(session.ttsCalls,0)
})
test('iOS Safari no-onstart hang is watched before claiming the microphone works',async()=>{
  const session=createSession({skipSpeechStart:true})
  session.ref.current.startSession('Здравствуйте! Я Мира.',{naturalVoice:true})
  const first=await nextMic(session,1)
  session.flushDelay(14000)
  assert.equal(first.aborted,true)
  session.flushShortTimers()
  await nextMic(session,2)
  assert.equal(session.cues,2)
})
test('stuck Safari recovery cue does not start a deaf recognizer or silently continue',async()=>{
  const session=createSession({stuckCue:true})
  session.ref.current.startSession('Здравствуйте! Я Мира.',{naturalVoice:true})
  for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve))
  assert.equal(session.cues,1)
  assert.equal(session.voices[0].started,false,'a cancelled cue must not count as recovery')
  session.flushDelay(4000)
  assert.equal(session.phases.at(-1),'ready','stuck cue must not terminate the one-Play session')
  assert.equal(session.voices[0].started,false,'never start a deaf recognizer after a failed cue')
  assert.equal(session.voices[0].aborted,false,'do not abort the never-started WebKit recognizer')
  assert.equal(session.voices[0].onend,null,'detach unstarted Safari callbacks')
  session.ref.current.stop()
  assert.equal(session.phases.at(-1),'idle','only End actually closes the session')
})

test('iPhone fallback selects Safari audio/mp4 and refuses unsupported recording',()=>{
  assert.deepEqual(coachRecordingMime({isTypeSupported:type=>type==='audio/mp4'}),{mime:'audio/mp4',extension:'m4a'});
  assert.deepEqual(coachRecordingMime({isTypeSupported:type=>type==='audio/webm;codecs=opus'}),{mime:'audio/webm;codecs=opus',extension:'webm'});
  assert.equal(coachRecordingMime({isTypeSupported:()=>false}),null);
  assert.equal(coachFallbackLocale('ru'),'ru');
  assert.equal(coachFallbackLocale('auto'),'en');
  assert.equal(coachRecordedSupported({navigator:{mediaDevices:{getUserMedia(){}}},MediaRecorder:{isTypeSupported(){return true}},AudioContext(){}}),false,'MediaRecorder must be a constructor');
});
test('local voice gate is silent before speech; commits only after a spoken turn and pause',()=>{
  const gate=createCoachVoiceGate({silenceMs:900,resetAfterMs:15000});
  assert.equal(gate.update(0,0),'silence');
  assert.equal(gate.update(100,.08),'silence');
  assert.equal(gate.update(200,.08),'speech');
  assert.equal(gate.update(300,.07),'speech');
  assert.equal(gate.update(1100,0),'speech');
  assert.equal(gate.update(1400,0),'finish');
  const quiet=createCoachVoiceGate({resetAfterMs:1500});
  quiet.update(0,0);assert.equal(quiet.update(2000,0),'rotate');
  assert.equal(quiet.heard,false,'silence never uploads to STT');
});
test('recorded-turn fails closed when media capabilities are missing',()=>{
  assert.equal(startCoachRecordedTurn({environment:{navigator:{mediaDevices:{}},MediaRecorder:null}}),null);
});
test('one Play exposes informed free-only speech fallback without second consent dialog',()=>{
  const speech=readFileSync(new URL('../components/my-coach-speech-loop.jsx',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8');
  const provider=readFileSync(new URL('../app/api/holistic-support/audio-storyboard/route.js',import.meta.url),'utf8');
  assert.ok(speech.includes('startCoachRecordedTurn({locale:transcriptLocale'));
  assert.ok(speech.includes("void deliver(appendSpokenAnswer(draftAtStartRef.current,value,1200))"));
  assert.ok(ui.includes('data-coach-voice-consent-one-play'));
  assert.ok(ui.includes('Groq Whisper'));
  assert.match(provider,/HH_AUDIO_STT_FREE_CONFIRMED/);
  assert.match(provider,/form\.get\("consent"\)!=="yes"/);
});

test('recorded fallback completes one consented voice turn with a single STT call',async()=>{
  let time=0,tick=null,loud=false,uploads=0,stopped=0,answer='',phases=[],levels=[];
  class FakeRecorder{
    static isTypeSupported(type){return type==='audio/mp4';}
    constructor(){this.state='inactive';this.mimeType='audio/mp4';}
    start(){this.state='recording';}
    stop(){
      if(this.state!=='recording')return;
      this.state='inactive';
      this.ondataavailable?.({data:new Blob([new Uint8Array(3200)],{type:'audio/mp4'})});
      this.onstop?.();
    }
  }
  class FakeContext{
    createMediaStreamSource(){return {connect(){},disconnect(){}};}
    createAnalyser(){return {fftSize:1024,getByteTimeDomainData(buf){buf.fill(loud?164:128);}};}
    resume(){return Promise.resolve();}
    close(){return Promise.resolve();}
  }
  const environment={
    navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++;}}]})}},
    MediaRecorder:FakeRecorder,AudioContext:FakeContext,
    fetch:async(_url,options)=>{
      uploads++;
      assert.equal(options.body.get('consent'),'yes');
      assert.equal(options.body.get('locale'),'ru');
      assert.match(options.body.get('file').name,/\.m4a$/);
      return {ok:true,json:async()=>({transcript:{text:'Я хочу обсудить свою цель'}})};
    },
    performance:{now:()=>time},
    setInterval:fn=>{tick=fn;return 1;},
    clearInterval:()=>{tick=null;},
  };
  assert.equal(coachRecordedSupported(environment),true);
  const capture=startCoachRecordedTurn({locale:'ru',environment,onState:phase=>phases.push(phase),onLevel:level=>levels.push(level),onResult:text=>{answer=text;},onFailure:code=>assert.fail(code)});
  for(let i=0;i<12&&!tick;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(typeof tick,'function');
  time=200;loud=true;tick();time=350;tick();
  assert.ok(phases.includes('hearing'));
  assert.ok(levels.some(level=>level>0.15),'real microphone RMS drives the waveform');
  loud=false;time=2400;tick(); // 1.9s VAD hold preserves ordinary mid-sentence pauses
  for(let i=0;i<12&&!answer;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(answer,'Я хочу обсудить свою цель');
  assert.equal(uploads,1);
  assert.equal(stopped,1);
  assert.equal(levels.at(-1),0,'capture closure resets live waveform');
  assert.ok(phases.includes('transcribing'));
  capture.cancel();
});
test('End during a recorded turn stops the track without sending any speech',async()=>{
  let tick=null,stopped=0,requests=0;
  class FakeRecorder{
    static isTypeSupported(){return true;}
    constructor(){this.state='inactive';this.mimeType='audio/mp4';}
    start(){this.state='recording';}
    stop(){this.state='inactive';this.onstop?.();}
  }
  class FakeContext{
    createMediaStreamSource(){return {connect(){},disconnect(){}};}
    createAnalyser(){return {fftSize:1024,getByteTimeDomainData(b){b.fill(128);}};}
    resume(){return Promise.resolve();}
    close(){return Promise.resolve();}
  }
  const env={navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++;}}]})}},
    MediaRecorder:FakeRecorder,AudioContext:FakeContext,
    fetch:async()=>{requests++;return {ok:false};},
    setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{tick=null;},performance:{now:()=>0}};
  const active=startCoachRecordedTurn({environment:env,onFailure:code=>assert.fail(code)});
  for(let i=0;i<12&&!tick;i++)await new Promise(resolve=>setImmediate(resolve));
  active.cancel();
  assert.equal(requests,0,'cancel never uploads audio');
  assert.equal(stopped,1,'camera/mic track released immediately on End');
  assert.equal(active.active,false);
});
test('The existing mobile timebox pauses with the deliberate Pause control',()=>{
  const source=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
  assert.match(source,/document\.visibilityState==='visible'&&!paused/)
  assert.match(source,/\},\[sessionClockStarted,paused\]\)/)
})
