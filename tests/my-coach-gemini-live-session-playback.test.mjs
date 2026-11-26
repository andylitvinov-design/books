import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {
  GeminiLivePcmPlayer,GeminiLiveBargeGate,GeminiLiveBargeDetector,bytesToBase64,
  GeminiLiveReplyWatchdog,geminiLiveCanResumeStalledReply,
  GeminiLivePcmResampler,geminiLiveAudioRms,geminiLivePcmMessage,base64ToPcmFloats,
  geminiLiveSetupMessage,geminiLiveSocketUrl,
  readGeminiLiveServerMessage,appendGeminiLiveTranscript,
} from '../lib/coaching/gemini-live-transport.mjs'

const component=readFileSync(new URL('../components/my-coach-gemini-live.jsx',import.meta.url),'utf8')
const section=(start,end)=>{
  const from=component.indexOf(start),to=component.indexOf(end,from)
  assert.ok(from>=0&&to>from,'component helper boundaries: '+start)
  return component.slice(from,to)
}
const helpers=[
  section('function audioTranscription(','\n\n'),
  section('  function interrupt(){','  async function checkpoint('),
  section('  function commitInput(','  // Deliver server-rechecked references'),
  section('  function finishAudibleTurn(','  async function installCapture('),
].join('\n')
const limits=component.match(/^const MAX_.*$/gm).join('\n')
// Execute the real component callback wiring, including asynchronous player
// errors and completion; do not replace the behavior under test with a stub.
const playerFactory='function makePlayer(r,context){\n'+
  section('    r.player=new GeminiLivePcmPlayer(context,{','    runtime.current=r')+
  '\nreturn r.player\n}'
const pcm=seconds=>bytesToBase64(new Uint8Array(Math.round(seconds*24000)*2))

function audioClock(sampleRate=48000){
  const sources=[]
  let heardSamples=0
  const context={state:'running',currentTime:0,sampleRate,destination:{},failStart:false,
    resume:()=>Promise.resolve(),
    createGain:()=>{
      const changes=[{at:0,value:1,timeConstant:0}]
      function valueAt(time){
        const change=changes.findLast(entry=>entry.at<=time)
        if(!change)return 1
        if(!change.timeConstant)return change.value
        return change.value+(change.previous-change.value)*Math.exp(-(time-change.at)/change.timeConstant)
      }
      return {gain:{
        get value(){return changes.at(-1).value},
        set value(value){changes.push({at:context.currentTime,value,timeConstant:0})},
        cancelScheduledValues(){}, // the player schedules gains only at the current time
        setTargetAtTime(value,at,timeConstant){changes.push({at,value,timeConstant,previous:valueAt(at)})},
        valueAt,
      },connect(){}}
    },
    createBuffer:(_channels,size,rate)=>{
      const samples=new Float32Array(size)
      return {length:size,duration:size/rate,getChannelData:()=>samples}
    },
    createBufferSource(){
      const source={onended:null,started:false,stopped:false,finished:false,
        connect(){},disconnect(){},stop(){this.stopped=true;this.stoppedAt=context.currentTime},
        start(time){
          if(context.failStart)throw Error('synthetic playback failure')
          this.started=true;this.startTime=time;this.end=time+this.buffer.duration
        },
      }
      sources.push(source)
      return source
    },
  }
  function advanceTo(time){
    assert.ok(time>=context.currentTime)
    if(context.state!=='running')return
    while(true){
      const next=sources.filter(s=>s.started&&!s.stopped&&!s.finished&&s.end<=time+1e-9)
        .sort((a,b)=>a.end-b.end)[0]
      if(!next)break
      context.currentTime=next.end
      next.finished=true
      heardSamples+=next.buffer.length
      next.onended?.()
    }
    context.currentTime=time
  }
  return {context,sources,advanceTo,get heardSamples(){return heardSamples}}
}

function session(sampleRate=48000){
  const clock=audioClock(sampleRate),events={final:[],interim:[],notices:[],phases:[],gestures:[],input:[],interruptions:[]}
  let stops=0,socketCloses=0,micStops=0
  const track={readyState:'live',stop(){micStops++;this.readyState='ended'}}
  const sent=[],credential={token:'auth_tokens/synthetic-existing-session'}
  const socket={readyState:1,bufferedAmount:0,send:raw=>sent.push(JSON.parse(raw)),
    close(){socketCloses++;this.readyState=3}}
  const r={context:clock.context,socket,stream:{active:true,getTracks:()=>[track]},
    ready:true,ended:false,sessionStarted:true,introSent:true,firstAudio:false,greetingTimer:null,
    history:[],openingHistory:[],inputText:'',outputText:'',speaking:false,interrupted:false,
    modelTurnComplete:false,hadAudio:false,outputWithoutAudio:false,lastAssistantTurnFinished:false,
    pendingAudio:[],pendingAudioChars:0,audioResuming:false,audioNoticeShown:false,playbackNoticeShown:false,
    audioGate:new GeminiLiveBargeGate(),bargeDetector:new GeminiLiveBargeDetector(),pendingMic:[],
    resampler:new GeminiLivePcmResampler(clock.context.sampleRate),liveToken:credential,reconnectSoon:false}
  const runtime={current:r}
  const propsRef={current:{
    onOutputInterim:text=>events.interim.push(text),
    onOutputFinal:(text,options)=>events.final.push({text,interrupted:options.interrupted}),
    onInputFinal:text=>events.input.push(text),
    onInterrupted:text=>events.interruptions.push(text),
  }}
  const methods=runInNewContext(limits+'\n'+helpers+'\n'+playerFactory+
    '\n({handleAudio,capture,flushPendingAudio,discardAudioTurn,interrupt,makePlayer,handleAudioContextState})',{
    GeminiLivePcmPlayer,readGeminiLiveServerMessage,appendGeminiLiveTranscript,geminiLiveCanResumeStalledReply,
    geminiLiveAudioRms,geminiLivePcmMessage,Float32Array,Uint8Array,
    Date:class extends Date{static now(){return 100000+clock.context.currentTime*1000}},
    propsRef,runtime,
    phaseChange:phase=>events.phases.push(phase),
    notify:notice=>events.notices.push(notice),
    setNotice:notice=>events.notices.push(notice),
    setAudioNeedsGesture:value=>events.gestures.push(value),
    t:{failure:'unavailable',audioRoute:'paused',playbackInterrupted:'reply interrupted',reconnecting:'reconnecting',
      resumedEarlier:'resumed from previous checkpoint',noReplyAudio:'missing audio'},
    checkpoint:()=>{},flushSideband:()=>{},
    stop:()=>{stops++;r.ended=true;track.stop();socket.close();r.player?.stop()},
    setTimeout:()=>1,clearTimeout:()=>{},
    getToken:()=>assert.fail('a turn must not mint a credential'),
    connect:()=>assert.fail('a turn must not open a connection'),
    loadApprovedContext:()=>{assert.fail('playback must not request private context')},
  },{timeout:1000})
  methods.makePlayer(r,clock.context)
  function receive({audio=[],output,input,turnComplete=false,interrupted=false}={}){
    methods.handleAudio(r,JSON.stringify({serverContent:{
      modelTurn:{parts:audio.map(data=>({inlineData:{mimeType:'audio/pcm;rate=24000',data}}))},
      ...(output?{outputTranscription:{text:output}}:{}),
      ...(input?{inputTranscription:{text:input}}:{}),turnComplete,interrupted,
    }}))
  }
  function assertLive(){
    assert.equal(stops,0,'output recovery must not stop the live session')
    assert.equal(socketCloses,0,'the same WebSocket remains open')
    assert.equal(micStops,0,'the existing microphone track remains live')
    assert.equal(r.ended,false)
    assert.equal(r.ready,true)
    assert.equal(socket.readyState,1)
    assert.equal(r.socket,socket)
    assert.equal(r.liveToken,credential)
    assert.ok(sent.every(packet=>packet.realtimeInput?.audio),'only mic PCM can be sent during these turns')
    assert.equal(track.readyState,'live')
    assert.ok(!events.notices.includes('unavailable'))
  }
  return {r,clock,events,receive,assertLive,sent,...methods}
}

// Drive the same ~32 ms blocks that the capture worklet delivers. Echo
// is sampled from the buffers the real player scheduled, with a room/device
// delay and attenuation. The two synthetic voices have independent pitches.
function coachVoicePcm(seconds){
  const samples=new Int16Array(24000*seconds)
  for(let i=0;i<samples.length;i++){
    const t=i/24000,phase=2*Math.PI*(171*t+13*t*t)
    const envelope=.65+.25*Math.sin(2*Math.PI*4*t)
    samples[i]=Math.round(32767*envelope*(.22*Math.sin(phase)+.09*Math.sin(3*phase)+.04*Math.sin(5*phase)))
  }
  return bytesToBase64(new Uint8Array(samples.buffer))
}
function browserGreetingPcm(seconds){
  const samples=new Int16Array(24000*seconds)
  for(let i=0;i<samples.length;i++){
    const t=i/24000,phase=2*Math.PI*(163*t+15*t*t+.3*Math.sin(6*t))
    const envelope=.65+.25*Math.sin(22*t)
    samples[i]=Math.round(32767*envelope*(.22*Math.sin(phase)+.09*Math.sin(3*phase)+.04*Math.sin(5*phase)))
  }
  return bytesToBase64(new Uint8Array(samples.buffer))
}
const directEcho=[[.07,.48]]
const roomEcho=[...directEcho,[.079,.155],[.093,.085]]
function captureBlock(h,{echo=false,paths=echo?directEcho:[],person=()=>0}={}){
  const {context,sources}=h.clock,rate=context.sampleRate,from=context.currentTime
  const audio=new Float32Array(128*Math.max(1,Math.round(rate*.032/128)))
  for(let i=0;i<audio.length;i++){
    for(const [delay,attenuation] of paths){
      const emittedAt=from+i/rate-delay
      const source=sources.find(s=>s.started&&s.startTime<=emittedAt&&
        emittedAt<Math.min(s.end,s.stoppedAt??Infinity))
      if(!source)continue
      const samples=source.buffer.getChannelData(0)
      // A volume change or stop reaches the mic after the acoustic delay.
      const gain=h.r.player.output.gain.valueAt(emittedAt)
      audio[i]+=attenuation*gain*samples[Math.min(samples.length-1,Math.floor((emittedAt-source.startTime)*24000))]
    }
    audio[i]+=person(i/rate)
  }
  h.clock.advanceTo(from+audio.length/rate)
  h.capture(h.r,audio)
}
function transmittedFrames(h){
  return h.sent.map(packet=>base64ToPcmFloats(packet.realtimeInput.audio.data))
}
function toneAmplitude(frame,frequency){
  let sine=0,cosine=0
  for(let i=0;i<frame.length;i++){
    const phase=2*Math.PI*frequency*i/16000
    sine+=frame[i]*Math.sin(phase)
    cosine+=frame[i]*Math.cos(phase)
  }
  return 2*Math.hypot(sine,cosine)/frame.length
}

test('speaker loopback and an isolated sound leave the full greeting audible and out of Gemini input',()=>{
  const h=session()
  h.receive({audio:[coachVoicePcm(2)],output:'Full greeting',turnComplete:true})
  for(let i=0;i<42;i++)captureBlock(h,{echo:true})
  captureBlock(h,{echo:true,person:t=>t<.006 ? .5*Math.sin(2*Math.PI*1243*t) : 0})
  for(let i=0;i<10;i++)captureBlock(h)
  assert.deepEqual(h.events.interruptions,[])
  assert.equal(h.events.phases.at(-1),'speaking')
  assert.equal(h.r.player.output.gain.value,1,'the full volume returns after incidental noise')
  // The last samples still reach the microphone after the player drains.
  for(let i=0;i<20;i++)captureBlock(h,{echo:true})
  assert.ok(transmittedFrames(h).every(frame=>geminiLiveAudioRms(frame)<.005),
    'false microphone activity, including the audible tail, must not reach the provider VAD')
  h.clock.advanceTo(3)
  assert.equal(h.clock.heardSamples,48000)
  assert.deepEqual(h.events.final,[{text:'Full greeting',interrupted:false}])
  assert.equal(h.events.phases.at(-1),'listening')
  h.assertLive()
})

test('real overlapping speech retains its first mic block and the next answer uses the original Gemini connection',()=>{
  const h=session()
  h.receive({audio:[coachVoicePcm(2)],output:'Reply in progress'})
  for(let i=0;i<18;i++)captureBlock(h,{echo:true})
  assert.deepEqual(h.events.interruptions,[])
  const startOfSpeech=h.sent.length
  // Give the first block a different pitch, so forwarding only confirmed
  // later blocks cannot pass as having captured the onset of the utterance.
  for(let i=0;i<8;i++){
    const frequency=i===0?656.25:375
    captureBlock(h,{echo:true,person:t=>.27*Math.sin(2*Math.PI*frequency*t)})
  }
  assert.deepEqual(h.events.interruptions,['Reply in progress'])
  assert.equal(h.r.player.playing,false)
  const transmitted=transmittedFrames(h).slice(startOfSpeech)
  assert.ok(transmitted.some(frame=>toneAmplitude(frame,656.25)>.15),
    'the first syllable survives local confirmation')
  h.receive({interrupted:true,input:'I meant next week.'})
  h.receive({turnComplete:true})
  for(let i=0;i<18;i++)captureBlock(h)
  h.receive({audio:[pcm(.5)],output:'Understood, next week.',turnComplete:true})
  h.clock.advanceTo(3)
  assert.deepEqual(h.events.input,['I meant next week.'])
  assert.deepEqual(h.events.final,[
    {text:'Reply in progress',interrupted:true},
    {text:'Understood, next week.',interrupted:false},
  ])
  h.assertLive()
})

test('a quiet caller can interrupt stronger speakerphone echo without losing the first syllable',()=>{
  const h=session()
  h.receive({audio:[coachVoicePcm(2)],output:'Reply on speakerphone'})
  for(let i=0;i<18;i++)captureBlock(h,{echo:true})
  assert.deepEqual(h.events.interruptions,[])
  assert.ok(transmittedFrames(h).every(frame=>geminiLiveAudioRms(frame)<.005))
  const beforeSpeech=h.sent.length
  // The louder loudspeaker plays throughout the onset. Only the caller has
  // the 1125 Hz component, and only in the first 32 ms block.
  for(let i=0;i<18;i++){
    const frequency=i===0?1125:375
    captureBlock(h,{echo:true,person:t=>.025*Math.sin(2*Math.PI*frequency*t)})
  }
  assert.deepEqual(h.events.interruptions,['Reply on speakerphone'])
  assert.equal(h.r.player.playing,false)
  const onset=transmittedFrames(h)[beforeSpeech]
  assert.ok(onset&&toneAmplitude(onset,1125)>.012,'the quiet first syllable reached the original socket')
  h.assertLive()
})

test('multiple loudspeaker reflections do not interrupt the coach or hide the quieter caller',()=>{
  const h=session()
  h.receive({audio:[coachVoicePcm(2)],output:'Whole greeting',turnComplete:true})
  for(let i=0;i<75;i++)captureBlock(h,{paths:roomEcho})
  assert.deepEqual(h.events.interruptions,[],'the direct path and its two reflections are all coach audio')
  assert.equal(h.clock.heardSamples,48000)
  assert.deepEqual(h.events.final,[{text:'Whole greeting',interrupted:false}])
  assert.ok(transmittedFrames(h).every(frame=>geminiLiveAudioRms(frame)<.005))

  h.receive({audio:[coachVoicePcm(2)],output:'Second reply'})
  for(let i=0;i<18;i++)captureBlock(h,{paths:roomEcho})
  const beforeSpeech=h.sent.length
  for(let i=0;i<12;i++){
    const frequency=i===0?1125:625
    captureBlock(h,{paths:roomEcho,person:t=>.025*Math.sin(2*Math.PI*frequency*t)})
  }
  assert.deepEqual(h.events.interruptions,['Second reply'])
  assert.equal(h.r.player.playing,false)
  const onset=transmittedFrames(h)[beforeSpeech]
  assert.ok(onset&&toneAmplitude(onset,1125)>.012,'the quieter caller retained the onset over room reflections')
  h.assertLive()
})

for(const sampleRate of [48000,96000])test('full browser greeting survives room reflections at '+sampleRate+' Hz',()=>{
  const h=session(sampleRate)
  for(let i=0;i<3;i++)captureBlock(h)
  h.receive({audio:[browserGreetingPcm(1.5)],output:'Full browser greeting',turnComplete:true})
  for(let i=0;i<61;i++)captureBlock(h,{paths:roomEcho})
  assert.deepEqual(h.events.interruptions,[])
  assert.deepEqual(h.events.final,[{text:'Full browser greeting',interrupted:false}])
  assert.equal(h.clock.heardSamples,36000)
  assert.ok(transmittedFrames(h).every(frame=>geminiLiveAudioRms(frame)<.005))
  h.assertLive()
})

test('a ten-second provider burst completes only after the audible FIFO tail, without closing voice',()=>{
  const h=session()
  for(let i=0;i<20;i++){
    h.clock.advanceTo(i*.1)
    h.receive({audio:[pcm(.5)],...(i===0?{output:'A complete spoken reply'}:{})})
  }
  h.receive({turnComplete:true})
  assert.ok(h.r.player.pending.length>0)
  assert.equal(h.r.player.playing,true)
  assert.deepEqual(h.events.final,[],'server completion is not audible completion')
  h.assertLive()
  h.clock.advanceTo(12)
  assert.equal(h.clock.heardSamples,10*24000)
  assert.deepEqual(h.events.final,[{text:'A complete spoken reply',interrupted:false}])
  assert.equal(h.events.phases.at(-1),'listening')
  assert.equal(h.r.player.playing,false)
  h.assertLive()
})

test('Safari resumes existing scheduled speech and a held tail without dropping words or ending voice',()=>{
  const h=session()
  h.receive({audio:[pcm(2)],output:'The full Safari reply'})
  h.clock.context.state='suspended'
  h.receive({audio:[pcm(.5),pcm(.5)],turnComplete:true})
  assert.equal(h.r.pendingAudio.length,2)
  assert.deepEqual(h.events.final,[])
  assert.ok(h.events.gestures.includes(true))
  h.clock.context.state='running'
  assert.equal(h.flushPendingAudio(h.r),true)
  assert.equal(h.r.pendingAudio.length,0)
  assert.equal(h.r.pendingAudioChars,0)
  assert.deepEqual(h.events.final,[])
  h.clock.advanceTo(5)
  assert.equal(h.clock.heardSamples,3*24000)
  assert.deepEqual(h.events.final,[{text:'The full Safari reply',interrupted:false}])
  assert.equal(h.events.gestures.at(-1),false)
  h.assertLive()
})

test('Safari can hold a normal reply with more than twenty-four small network packets',()=>{
  const h=session()
  h.clock.context.state='suspended'
  h.receive({audio:Array.from({length:40},()=>pcm(.1)),output:'Held complete reply',turnComplete:true})
  assert.equal(h.r.pendingAudio.length,40)
  assert.deepEqual(h.events.final,[])
  h.clock.context.state='running'
  assert.equal(h.flushPendingAudio(h.r),true)
  h.clock.advanceTo(5)
  assert.equal(h.clock.heardSamples,4*24000)
  assert.deepEqual(h.events.final,[{text:'Held complete reply',interrupted:false}])
  h.assertLive()
})

for(const failure of ['false','throw']){
  test('a '+failure+' append during Safari flush marks the reply incomplete and permits the next turn',()=>{
    const h=session()
    h.clock.context.state='suspended'
    h.receive({audio:[pcm(.5),pcm(.5)],output:'Not completely heard',turnComplete:true})
    const append=h.r.player.append.bind(h.r.player)
    let calls=0
    h.r.player.append=part=>{
      if(++calls!==2)return append(part)
      if(failure==='throw')throw Error('synthetic output failure')
      return false
    }
    h.clock.context.state='running'
    assert.equal(h.flushPendingAudio(h.r),false)
    assert.equal(calls,2)
    assert.deepEqual(h.events.final,[{text:'Not completely heard',interrupted:true}])
    assert.equal(h.r.player.playing,false)
    assert.equal(h.r.pendingAudio.length,0)
    h.assertLive()
    h.r.player.append=append
    h.receive({audio:[pcm(.5)],output:'Next reply',turnComplete:true})
    h.clock.advanceTo(1)
    assert.deepEqual(h.events.final.at(-1),{text:'Next reply',interrupted:false})
    h.assertLive()
  })
}

test('an asynchronous playback failure after provider completion releases the next reply without reconnecting',()=>{
  const h=session()
  h.receive({audio:[pcm(5)],output:'The unfinished reply',turnComplete:true})
  assert.equal(h.r.modelTurnComplete,true)
  assert.ok(h.r.player.pending.length>0)
  h.clock.context.failStart=true
  h.clock.advanceTo(1)
  assert.deepEqual(h.events.final,[{text:'The unfinished reply',interrupted:true}])
  assert.equal(h.r.player.playing,false)
  assert.equal(h.r.audioGate.blocked,false,'the old provider turn boundary was already received')
  h.assertLive()
  h.clock.context.failStart=false
  h.receive({audio:[pcm(.5)],output:'Recovered reply',turnComplete:true})
  assert.equal(h.r.player.playing,true)
  h.clock.advanceTo(2)
  assert.deepEqual(h.events.final.at(-1),{text:'Recovered reply',interrupted:false})
  h.assertLive()
})

test('a failure within an audio plus turnComplete frame stops its remaining parts and preserves the next reply',()=>{
  const h=session(),append=h.r.player.append.bind(h.r.player)
  let calls=0
  h.r.player.append=part=>++calls===2?false:append(part)
  h.receive({audio:[pcm(.5),pcm(.5),pcm(.5)],output:'Partly scheduled reply',turnComplete:true})
  assert.equal(calls,2,'do not append subsequent parts of a discarded reply')
  assert.equal(h.r.speaking,false)
  assert.equal(h.r.player.playing,false)
  assert.equal(h.r.audioGate.blocked,false)
  assert.deepEqual(h.events.final,[{text:'Partly scheduled reply',interrupted:true}])
  assert.equal(h.events.phases.at(-1),'listening')
  h.assertLive()
  h.r.player.append=append
  h.receive({audio:[pcm(.5)],output:'Fresh reply',turnComplete:true})
  h.clock.advanceTo(1)
  assert.deepEqual(h.events.final.at(-1),{text:'Fresh reply',interrupted:false})
  h.assertLive()
})

test('a failed flush of an already complete held turn cannot requeue new PCM into a running context',()=>{
  const h=session(),append=h.r.player.append.bind(h.r.player)
  h.clock.context.state='suspended'
  h.receive({audio:[pcm(.5)],output:'Held reply',turnComplete:true})
  h.clock.context.state='running'
  h.r.player.append=()=>false
  h.receive({audio:[pcm(.5)],turnComplete:true})
  assert.equal(h.r.pendingAudio.length,0,'failed output must not be held again after completion resets flags')
  assert.equal(h.r.player.playing,false)
  assert.equal(h.r.speaking,false)
  assert.equal(h.events.phases.at(-1),'listening')
  assert.deepEqual(h.events.final,[{text:'Held reply',interrupted:true}])
  h.assertLive()
  h.r.player.append=append
})

test('barge-in after provider completion clears the audible tail and accepts the next reply without another acknowledgement',()=>{
  const h=session()
  h.receive({audio:[pcm(5)],output:'A reply the user interrupts',turnComplete:true})
  assert.ok(h.r.player.pending.length>0)
  h.interrupt()
  assert.equal(h.r.player.playing,false)
  assert.equal(h.r.pendingAudio.length,0)
  assert.deepEqual(h.events.final,[{text:'A reply the user interrupts',interrupted:true}])
  h.receive({audio:[pcm(.5)],output:'Answer to the interruption',turnComplete:true})
  assert.equal(h.r.player.playing,true,'the completed old network turn cannot gate the next reply')
  h.clock.advanceTo(1)
  assert.deepEqual(h.events.final.at(-1),{text:'Answer to the interruption',interrupted:false})
  h.assertLive()
})

test('provider interrupted acknowledges a locally discarded reply and enables fresh audio',()=>{
  const h=session(),append=h.r.player.append.bind(h.r.player)
  h.r.player.append=()=>false
  h.receive({audio:[pcm(.5)],output:'A discarded reply'})
  assert.equal(h.r.outputWithoutAudio,true)
  h.receive({interrupted:true})
  assert.equal(h.r.outputWithoutAudio,false,'acknowledged interruption ends the discard state')
  h.r.player.append=append
  h.receive({audio:[pcm(.5)],output:'Reply after acknowledgement',turnComplete:true})
  assert.equal(h.r.player.playing,true)
  h.clock.advanceTo(1)
  assert.deepEqual(h.events.final.at(-1),{text:'Reply after acknowledgement',interrupted:false})
  h.assertLive()
})


test('planned rollover waits for a fresh resumable checkpoint after Google marks the turn nonresumable',()=>{
  const h=session()
  h.r.lastAssistantTurnFinished=true
  const update=value=>h.handleAudio(h.r,JSON.stringify({sessionResumptionUpdate:value}))
  update({resumable:true,newHandle:'first-checkpoint'})
  h.receive({input:'part of a sentence'})
  assert.equal(h.r.checkpointCurrent,true,'unrelated frames preserve the checkpoint')
  h.r.inputText=''
  update({resumable:false})
  h.handleAudio(h.r,JSON.stringify({goAway:{timeLeft:'30s'}}))
  assert.equal(h.r.socket.readyState,1)
  assert.equal(h.r.resumeHandle,'first-checkpoint','a forced drop can still recover the prior checkpoint')
  update({resumable:true,newHandle:'x'.repeat(8193)})
  assert.equal(h.r.checkpointCurrent,false,'a truncated handle would identify the wrong session')
  assert.equal(h.r.socket.readyState,1)
  update({resumable:true,newHandle:'current-checkpoint'})
  assert.equal(h.r.resumeHandle,'current-checkpoint')
  assert.equal(h.r.socket.readyState,3,'proactive rollover starts only after the fresh checkpoint')
})

test('after an abrupt drop outside a checkpoint, a resumed connection surfaces the possible speech gap',()=>{
  const h=session()
  h.r.checkpointCurrent=false
  h.handleAudio(h.r,JSON.stringify({setupComplete:{}}))
  assert.equal(h.events.notices.at(-1),'resumed from previous checkpoint')
  assert.equal(h.events.phases.at(-1),'listening')
  h.assertLive()
})

test('socket rollover drains a completed reply and resumes the original credential and handle',()=>{
  const timers=new Map(),sockets=[],sent=[],final=[],drafts=[]
  let timerId=0,stops=0
  class MockSocket{
    constructor(url){this.url=url;this.readyState=1;sockets.push(this)}
    close(code){this.readyState=3;this.onclose?.({code})}
  }
  const token={token:'auth_tokens/synthetic-resume',model:'gemini-3.1-flash-live-preview',
    expiresAt:new Date(Date.now()+20*60000).toISOString()}
  const r={voiceName:'Orus',ready:true,ended:false,reconnects:0,resumeHandle:'prior-handle',
    lastAssistantTurnFinished:false,modelTurnComplete:true,hadAudio:true,outputText:'Full reply',
    player:{playing:true,setVolume(){}},stream:{active:true},
    pendingAudio:[],inputText:'incomplete fragment',bargeDetector:{userActive:false},
    audioGate:new GeminiLiveBargeGate()}
  const code=section('function audioTranscription(','\n\n')+'\n'+
    section('  function preserveUnconfirmedInput(','  function commitInput(')+
    section('  function finishAudibleTurn(','  // A local playback fault')+
    section('  function connect(','  async function getToken(')
  const methods=runInNewContext(code+'\n({connect,finishAudibleTurn,maybeReconnectOnGoAway})',{
    WebSocket:MockSocket,geminiLiveSetupMessage,geminiLiveSocketUrl,
    GeminiLiveBargeGate,GeminiLiveBargeDetector,LIVE_START_TIMEOUT_MS:10000,
    notify(){},phaseChange(){},stop(){stops++},flushSideband(){},
    propsRef:{current:{onInputInterim(){},onUnconfirmedInput:text=>drafts.push(text)}},
    t:{reconnecting:'reconnect',connection:'failure',providerAccess:'denied'},
    commitOutput(state){final.push(state.outputText);state.outputText=''},
    interrupt(){assert.fail('complete PCM must not be interrupted by reconnect')},
    sendSocket(_state,packet){sent.push(packet);return true},
    setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id},
    clearTimeout(id){timers.delete(id)},Date,
  })
  methods.connect(r,token)
  r.ready=true
  sockets[0].close(1011)
  assert.equal(r.resumeAfterDrain,true)
  assert.equal(r.reconnects,0)
  assert.equal(r.inputText,'')
  assert.deepEqual(drafts,['incomplete fragment'])
  assert.deepEqual(final,[])
  r.player.playing=false
  methods.finishAudibleTurn(r)
  assert.deepEqual(final,['Full reply'])
  assert.equal(r.reconnects,1)
  const timer=timers.get(r.reconnectTimer)
  assert.ok(timer)
  timer.fn()
  assert.equal(sockets.length,2)
  sockets[1].onopen()
  assert.equal(sockets[1].url,sockets[0].url)
  assert.equal(sent.at(-1).setup.sessionResumption.handle,'prior-handle')
  assert.equal(r.audioGate.blocked,false)
  assert.equal(stops,0)
  r.resumeHandle=null
  methods.connect(r,token,{resume:true})
  assert.equal(sockets.length,2,'a failed resumption cannot silently open a fresh session')
  assert.equal(stops,1)
})


test('cold microphone startup connects only after the worklet or fallback can consume frames',async()=>{
  for(const outcome of ['loaded','unavailable','ended-while-loading','ended-then-rejected']){
    const events=[]
    let release,reject
    const loading=new Promise((resolve,fail)=>{release=resolve;reject=fail})
    const node=id=>({id,connect:target=>events.push(id+' → '+target.id)})
    class WorkletNode{constructor(){events.push('worklet node');Object.assign(this,node('worklet'),{port:{}})}}
    const context={
      sampleRate:48000,destination:{id:'destination'},
      audioWorklet:{addModule:()=>{events.push('load');return loading}},
      createMediaStreamSource:()=>{events.push('attach track');return node('mic')},
      createScriptProcessor:()=>{events.push('fallback node');return node('fallback')},
      createGain:()=>Object.assign(node('sink'),{gain:{value:1}}),
    }
    const r={context,stream:{},ended:false}
    const install=runInNewContext('('+section('  async function installCapture(','  function connect(')+')',
      {window:{AudioWorkletNode:WorkletNode},capture(){}})
    const ready=install(r)
    assert.deepEqual(events,['load'],'the mic never backs up during the worklet fetch')
    r.ended=outcome.startsWith('ended')
    if(outcome==='unavailable'||outcome==='ended-then-rejected')reject(Error('worklet load failed'))
    else release()
    await ready
    if(r.ended){
      assert.deepEqual(events,['load'],'no capture resources can outlive a stopped session')
      continue
    }
    const kind=outcome==='loaded'?'worklet':'fallback'
    assert.deepEqual(events,['load',kind+' node','sink → destination',kind+' → sink','attach track','mic → '+kind])
    assert.equal(r.sink.gain.value,0)
    assert.equal(r.source.id,'mic')
    assert.equal(r.processor.id,kind)
  }
})

test('the reply watchdog is idle until a response is expected and defers during active speech or playback',()=>{
  let time=0,id=0,stalls=0,blocked=false
  const timers=new Map()
  const watch=new GeminiLiveReplyWatchdog({
    now:()=>time,schedule:(fn,ms)=>{const key=++id;timers.set(key,{fn,at:time+ms});return key},
    cancel:key=>timers.delete(key),canFire:()=>!blocked,onStall:()=>stalls++,
  })
  function advance(to){
    while(true){
      const next=[...timers].filter(([,v])=>v.at<=to).sort((a,b)=>a[1].at-b[1].at)[0]
      if(!next)break
      time=next[1].at;timers.delete(next[0]);next[1].fn()
    }
    time=to
  }
  advance(20000);assert.equal(stalls,0)
  watch.touch();advance(30000);watch.touch();advance(38000);assert.equal(stalls,0)
  blocked=true;advance(50000);assert.equal(stalls,0)
  blocked=false;advance(51000);assert.equal(stalls,1)
  advance(90000);assert.equal(stalls,1,'no automatic retry loop')
  watch.touch();watch.clear();advance(120000);assert.equal(stalls,1)
})
test('a stalled reply can attempt only one recovery of a valid existing Gemini session',()=>{
  const now=Date.parse('2026-11-25T01:44:00Z')
  const r={ready:true,ended:false,socket:{readyState:1},reconnects:0,
    resumeHandle:'synthetic-checkpoint',liveToken:{expiresAt:'2026-11-25T02:00:00Z'}}
  assert.equal(geminiLiveCanResumeStalledReply(r,now),true)
  for(const patch of [{resumeHandle:null},{stallRecoveryUsed:true},{reconnects:3},
    {ended:true},{socket:{readyState:3}},{liveToken:{expiresAt:'2026-11-25T01:00:00Z'}}]){
    assert.equal(geminiLiveCanResumeStalledReply({...r,...patch},now),false)
  }
  const notices=[],phases=[],closes=[]
  r.socket.close=(...args)=>closes.push(args)
  const recover=runInNewContext(section('  function recoverStalledReply(','  // A local playback fault')+'\nrecoverStalledReply',{
    runtime:{current:r},geminiLiveCanResumeStalledReply:state=>geminiLiveCanResumeStalledReply(state,now),
    notify:notice=>notices.push(notice),phaseChange:phase=>phases.push(phase),
    t:{reconnecting:'resume',replyStalled:'delayed'},
    getToken:()=>assert.fail('no new credential'),connect:()=>assert.fail('no fresh session'),
  })
  recover(r)
  assert.deepEqual(closes,[[1000,'session-resume']])
  assert.equal(r.checkpointCurrent,false,'recovery must disclose the possible speech gap')
  assert.equal(r.stallRecoveryUsed,true)
  recover(r)
  assert.equal(closes.length,1)
  assert.equal(notices.at(-1),'delayed')
  assert.equal(phases.at(-1),'listening')
  assert.equal(r.liveToken.expiresAt,'2026-11-25T02:00:00Z')
})
test('watchdog follows real reply boundaries without minting another credential',()=>{
  const h=session(),events=[]
  h.r.replyWatch={touch:()=>events.push('touch'),clear:()=>events.push('clear')}
  h.receive({input:'Test user input'})
  assert.equal(events.at(-1),'touch')
  h.receive({audio:[pcm(.5)],output:'Reply',turnComplete:true})
  assert.equal(events.at(-1),'touch')
  h.clock.advanceTo(2)
  assert.equal(events.at(-1),'clear')
  h.assertLive()
  assert.match(component,/r\.replyWatch\?\.clear\(\)\s+try\{r\.abort/)
  assert.match(component,/r\.ready=false\s+r\.replyWatch\?\.clear\(\)/)
  assert.match(component,/!r\.bargeDetector\.userActive&&Date\.now\(\)-\(r\.lastHumanAudioAt\|\|0\)>900/)
})

test('background capture and playback are gated while the same session is paused',()=>{
  const h=session()
  h.r.paused=true
  h.clock.context.state='suspended'
  h.capture(h.r,new Float32Array(1536).fill(.2))
  assert.equal(h.sent.length,0)
  h.receive({audio:[pcm(.5)],output:'A held reply',turnComplete:true})
  assert.equal(h.r.pendingAudio.length,1)
  assert.equal(h.events.final.length,0)
  assert.equal(h.events.gestures.length,0)
  assert.equal(h.r.liveToken.token,'auth_tokens/synthetic-existing-session')
  h.r.paused=false
  h.clock.context.state='running'
  assert.equal(h.flushPendingAudio(h.r),true)
  h.clock.advanceTo(1)
  assert.deepEqual(h.events.final,[{text:'A held reply',interrupted:false}])
  h.assertLive()
})
test('visibility pause parks microphone and preserves same socket, token and history; pagehide closes only transport',()=>{
  const track={enabled:true,readyState:'live',stop(){this.readyState='ended'}}
  const sent=[],closed=[],phases=[],notices=[]
  const token={token:'auth_tokens/existing',expiresAt:'2099-01-01T00:00:00Z'}
  const socket={close:(...args)=>closed.push(args)}
  const history=[{role:'user',content:'My name is Jane'}]
  const r={ready:true,ended:false,introSent:true,liveToken:token,resumeHandle:'checkpoint',
    reconnects:0,history,socket,stream:{getAudioTracks:()=>[track],getTracks:()=>[track]},
    context:{suspend:()=>Promise.resolve()},player:{setVolume(){}},pendingMic:[1],
    replyWatch:{clear(){}},modelTurnComplete:true}
  const methods=runInNewContext(section('  function pauseSession(','  function interrupt(){')+
    '\n({pauseSession,parkPausedSocket})',{
    runtime:{current:r},propsRef:{current:{}},GeminiLiveBargeDetector,Date,
    phaseChange:value=>phases.push(value),notify:value=>notices.push(value),
    t:{resumeUnavailable:'unavailable'},sendSocket:(_r,p)=>sent.push(p),
    preserveUnconfirmedInput(){},setAudioNeedsGesture(){},clearTimeout(){},
    interrupt(){assert.fail('complete reply must not be discarded')}
  })
  assert.equal(methods.pauseSession(),true)
  assert.equal(r.paused,true)
  assert.equal(track.enabled,false)
  assert.equal(r.socket,socket)
  assert.equal(r.liveToken,token)
  assert.equal(r.history,history)
  assert.equal(sent.length,1)
  assert.equal(sent[0].realtimeInput.audioStreamEnd,true)
  methods.pauseSession()
  assert.equal(sent.length,1)
  assert.equal(closed.length,0)
  methods.pauseSession({disconnect:true})
  assert.equal(track.readyState,'ended')
  assert.equal(r.socket,null)
  assert.equal(r.resumePending,true)
  assert.equal(r.resumeUnavailable,false)
  assert.equal(r.liveToken,token)
  assert.equal(r.resumeHandle,'checkpoint')
  assert.equal(r.history,history)
  assert.equal(closed.length,1)
  assert.equal(phases.at(-1),'paused')
})
test('Play resumes a paused session on its existing connection without minting or greeting',async()=>{
  const track={enabled:false,readyState:'live'}
  const token={token:'auth_tokens/existing',expiresAt:'2099-01-01T00:00:00Z'}
  const socket={readyState:1},history=[{role:'user',content:'My name is Jane'}]
  const r={paused:true,pauseEpoch:1,ready:true,stream:{getAudioTracks:()=>[track]},
    context:{state:'running',resume:()=>Promise.resolve()},player:{setVolume(){}},
    socket,liveToken:token,history,pausedPhase:'listening'}
  const phases=[],notices=[]
  const methods=runInNewContext(section('  async function resumePausedSession(','  function interrupt(){')+
    '\n({resumePausedSession})',{
    propsRef:{current:{enabled:true,canStart:true}},document:{visibilityState:'visible'},
    navigator:{},prepareCoachIos27LiveDuplex(){},activateCoachIos27LiveDuplex(){},
    phaseChange:value=>phases.push(value),notify:value=>notices.push(value),
    flushPendingAudio(){},flushSideband(){},t:{resumeUnavailable:'unavailable'},
    scheduleReconnect(){assert.fail('healthy socket must not reconnect')},
    getToken(){assert.fail('resume must never mint a token')},
    handleAudio(){assert.fail('greeting must not replay')}
  })
  assert.equal(await methods.resumePausedSession(r),true)
  assert.equal(r.paused,false)
  assert.equal(track.enabled,true)
  assert.equal(r.socket,socket)
  assert.equal(r.liveToken,token)
  assert.equal(r.history,history)
  assert.equal(phases.at(-1),'listening')
  r.paused=true;r.resumePending=true;r.resumeUnavailable=true;track.enabled=false
  assert.equal(await methods.resumePausedSession(r),false)
  assert.equal(r.paused,true)
  assert.equal(track.enabled,false)
  assert.equal(notices.at(-1),'unavailable')
})
test('page lifecycle routes visibility and pagehide to pause, retaining explicit stop on unmount',()=>{
  const lifecycle=section('  useEffect(()=>{\n    const onHidden=', '  useEffect(()=>{\n    const r=runtime.current')
  assert.match(lifecycle,/visibilityState==='hidden'\)pauseSession\(\)/)
  assert.match(lifecycle,/onPageHide=\(\)=>pauseSession\(\{disconnect:true\}\)/)
  assert.match(lifecycle,/removeEventListener\('pagehide',onPageHide\)[\s\S]*stop\(\)/)
  assert.match(component,/if\(runtime\.current\?\.paused\)\{[\s\S]*?void resumePausedSession\(runtime\.current\)/)
})

test('expired parked credential remains paused and enables explicit text fallback',async()=>{
  const notices=[]
  const r={paused:true,ended:false,resumePending:true,resumeHandle:'checkpoint',reconnects:0,
    liveToken:{expiresAt:'2000-01-01T00:00:00Z'}}
  const resume=runInNewContext(section('  async function resumePausedSession(','  function interrupt(){')+
    '\nresumePausedSession',{
    propsRef:{current:{enabled:true,canStart:true}},document:{visibilityState:'visible'},Date,
    notify:text=>notices.push(text),t:{resumeUnavailable:'unavailable'}
  })
  assert.equal(await resume(r),false)
  assert.equal(r.resumeUnavailable,true)
  assert.equal(r.paused,true)
  assert.equal(notices.at(-1),'unavailable')
})


test('text-only completed live reply is not silently treated as spoken',()=>{
  const h=session()
  h.receive({output:'This reply has no PCM',turnComplete:true})
  assert.equal(h.events.final.at(-1).interrupted,true)
  assert.equal(h.events.notices.at(-1),'missing audio')
  h.assertLive()
  h.receive({audio:[pcm(.5)],output:'Next reply',turnComplete:true})
  h.clock.advanceTo(h.clock.context.currentTime+1)
  assert.equal(h.events.final.at(-1).interrupted,false)
  h.assertLive()
})
test('standard MIME whitespace does not discard 24 kHz PCM',()=>{
  const data=pcm(.1)
  const read=mimeType=>readGeminiLiveServerMessage(JSON.stringify({serverContent:{modelTurn:{parts:[{inlineData:{mimeType,data}}]}}})).audio
  assert.deepEqual(read('audio/pcm; rate=24000'),[data])
  assert.deepEqual(read('audio/pcm; rate = 24000'),[data])
  assert.deepEqual(read('audio/pcm; rate=16000'),[])
  assert.deepEqual(read('audio/mp3'),[])
})


test('automatic route recovery handles running WebAudio without another button',()=>{
  const calls=[]
  const navigator={audioSession:{type:'ambient'}},document={visibilityState:'visible'}
  const r={context:{state:'running'},paused:false,ended:false}
  const runtime={current:r}
  const refresh=runInNewContext(section('  function refreshLiveAudioRoute(','  function requestAudioResume(')+'\nrefreshLiveAudioRoute',{
    runtime,document,navigator,activateCoachIos27LiveDuplex:()=>{calls.push('route');navigator.audioSession.type='play-and-record'}
  })
  refresh(r);assert.deepEqual(calls,['route'])
  refresh(r);assert.equal(calls.length,1)
  refresh(r,true);assert.equal(calls.length,2)
  document.visibilityState='hidden';refresh(r,true);assert.equal(calls.length,2)
  document.visibilityState='visible';r.paused=true;refresh(r,true);assert.equal(calls.length,2)
  r.paused=false;runtime.current=null;refresh(r,true);assert.equal(calls.length,2)
  assert.match(component,/if\(!r\.hadAudio&&!r\.pendingAudio\.length\)refreshLiveAudioRoute\(r,true\)/)
  assert.doesNotMatch(component,/data-coach-live-resume-audio|resumeAudioByTap/)
})

test('suspended PCM is resumed automatically on the existing live session',async()=>{
  const h=session()
  h.clock.context.state='suspended'
  h.clock.context.resume=()=>{h.clock.context.state='running';return Promise.resolve()}
  h.receive({audio:[pcm(.5)],output:'Automatic audio',turnComplete:true})
  await Promise.resolve();await Promise.resolve()
  h.clock.advanceTo(2)
  assert.equal(h.clock.heardSamples,12000)
  assert.equal(h.events.final.at(-1).interrupted,false)
  h.assertLive()
})
