import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {
  GeminiLivePcmPlayer,GeminiLiveBargeGate,GeminiLiveBargeDetector,bytesToBase64,
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
  section('  function interrupt(){','  function sendSocket('),
  section('  function commitInput(','  // Deliver server-rechecked references'),
  section('  function finishAudibleTurn(','  function capture('),
].join('\n')
const limits=component.match(/^const MAX_PENDING_AUDIO_(?:CHUNKS|CHARS)=.+$/gm).join('\n')
// Execute the real component callback wiring, including asynchronous player
// errors and completion; do not replace the behavior under test with a stub.
const playerFactory='function makePlayer(r,context){\n'+
  section('    r.player=new GeminiLivePcmPlayer(context,{','    runtime.current=r')+
  '\nreturn r.player\n}'
const pcm=seconds=>bytesToBase64(new Uint8Array(Math.round(seconds*24000)*2))

function audioClock(){
  const sources=[]
  let heardSamples=0
  const context={state:'running',currentTime:0,destination:{},failStart:false,
    resume:()=>Promise.resolve(),
    createGain:()=>({gain:{value:1},connect(){}}),
    createBuffer:(_channels,size,rate)=>{
      const samples=new Float32Array(size)
      return {length:size,duration:size/rate,getChannelData:()=>samples}
    },
    createBufferSource(){
      const source={onended:null,started:false,stopped:false,finished:false,
        connect(){},disconnect(){},stop(){this.stopped=true},
        start(time){
          if(context.failStart)throw Error('synthetic playback failure')
          this.started=true;this.end=time+this.buffer.duration
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

function session(){
  const clock=audioClock(),events={final:[],interim:[],notices:[],phases:[],gestures:[],input:[],interruptions:[]}
  let stops=0,socketCloses=0,micStops=0
  const track={readyState:'live',stop(){micStops++;this.readyState='ended'}}
  const socket={readyState:1,close(){socketCloses++;this.readyState=3}}
  const r={context:clock.context,socket,stream:{active:true,getTracks:()=>[track]},
    ready:true,ended:false,sessionStarted:true,introSent:true,firstAudio:false,greetingTimer:null,
    history:[],openingHistory:[],inputText:'',outputText:'',speaking:false,interrupted:false,
    modelTurnComplete:false,hadAudio:false,outputWithoutAudio:false,lastAssistantTurnFinished:false,
    pendingAudio:[],pendingAudioChars:0,audioResuming:false,audioNoticeShown:false,playbackNoticeShown:false,
    audioGate:new GeminiLiveBargeGate(),bargeDetector:{userActive:false},reconnectSoon:false}
  const runtime={current:r}
  const propsRef={current:{
    onOutputInterim:text=>events.interim.push(text),
    onOutputFinal:(text,options)=>events.final.push({text,interrupted:options.interrupted}),
    onInputFinal:text=>events.input.push(text),
    onInterrupted:text=>events.interruptions.push(text),
  }}
  const methods=runInNewContext(limits+'\n'+helpers+'\n'+playerFactory+
    '\n({handleAudio,flushPendingAudio,discardAudioTurn,interrupt,makePlayer})',{
    GeminiLivePcmPlayer,readGeminiLiveServerMessage,appendGeminiLiveTranscript,
    propsRef,runtime,
    phaseChange:phase=>events.phases.push(phase),
    notify:notice=>events.notices.push(notice),
    setNotice:notice=>events.notices.push(notice),
    setAudioNeedsGesture:value=>events.gestures.push(value),
    t:{failure:'unavailable',audioRoute:'paused',playbackInterrupted:'reply interrupted',reconnecting:'reconnecting'},
    checkpoint:()=>{},flushSideband:()=>{},
    stop:()=>{stops++;r.ended=true;track.stop();socket.close();r.player?.stop()},
    setTimeout:()=>1,clearTimeout:()=>{},
    sendSocket:()=>{assert.fail('playback must not send another start or provider request')},
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
    assert.equal(track.readyState,'live')
    assert.ok(!events.notices.includes('unavailable'))
  }
  return {r,clock,events,receive,assertLive,...methods}
}

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


test('socket rollover drains a completed reply and resumes the original credential and handle',()=>{
  const timers=new Map(),sockets=[],sent=[],final=[]
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
  const code=section('  function finishAudibleTurn(','  // A local playback fault')+
    section('  function connect(','  async function getToken(')
  const methods=runInNewContext(code+'\n({connect,finishAudibleTurn,maybeReconnectOnGoAway})',{
    WebSocket:MockSocket,geminiLiveSetupMessage,geminiLiveSocketUrl,
    GeminiLiveBargeGate,GeminiLiveBargeDetector,LIVE_START_TIMEOUT_MS:10000,
    notify(){},phaseChange(){},stop(){stops++},flushSideband(){},
    propsRef:{current:{onInputInterim(){}}},
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
})
