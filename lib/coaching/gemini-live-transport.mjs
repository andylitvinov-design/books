/**
 * Browser-only Gemini Live PCM/WebSocket framing. No key or stored audio.
 * Input: mono signed little-endian PCM16 16 kHz. Output: mono PCM16 24 kHz.
 * Keep small bounded buffers; interruption silences all scheduled samples.
 */
import {GeminiLiveEchoReference} from './gemini-live-echo.mjs'

export const GEMINI_LIVE_WEBSOCKET='wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained'
export const GEMINI_LIVE_INPUT_RATE=16000
export const GEMINI_LIVE_OUTPUT_RATE=24000

export function geminiLiveSocketUrl(token){
  if(typeof token!=='string'||token.length<12||token.length>8192||
    !/^[A-Za-z0-9_.:/-]+$/.test(token))throw Error('GEMINI_LIVE_TOKEN_INVALID')
  return GEMINI_LIVE_WEBSOCKET+'?access_token='+encodeURIComponent(token)
}
export function geminiLiveSetupMessage(model,voiceName){
  // Full locked model, voice and system policy are in server-issued token.
  // The browser only asks to start the preapproved configured session.
  if(model!=='gemini-3.1-flash-live-preview'||
    typeof voiceName!=='string'||!/^[A-Za-z]{3,24}$/.test(voiceName))
    throw Error('GEMINI_LIVE_SETUP_INVALID')
  // Gemini 3.1 Live Preview can ignore a prebuilt voice set only in the
  // ephemeral-token constraints. Mirror the same reviewed name in the
  // initial client setup; the model itself stays server-token-locked.
  // The raw BidiGenerateContentSetup proto accepts responseModalities ONLY
  // inside generationConfig. SDK LiveConnectConfig uses a different shape.
  return {setup:{model:'models/'+model,
    generationConfig:{responseModalities:['AUDIO'],speechConfig:{
      voiceConfig:{prebuiltVoiceConfig:{voiceName}},
    }},
    // Mirror server-constrained VAD/transcription options into the real socket
    // setup. An ephemeral token does not imply the browser requested them.
    inputAudioTranscription:{},outputAudioTranscription:{},
    realtimeInputConfig:{automaticActivityDetection:{
      startOfSpeechSensitivity:'START_SENSITIVITY_HIGH',
      endOfSpeechSensitivity:'END_SENSITIVITY_LOW',
      prefixPaddingMs:160,silenceDurationMs:900},
      activityHandling:'START_OF_ACTIVITY_INTERRUPTS'},
    sessionResumption:{}}}
}
export function geminiLivePcmMessage(pcm){
  if(!(pcm instanceof Uint8Array)||!pcm.length||pcm.length>16000||
    pcm.length%2!==0)throw Error('GEMINI_LIVE_PCM_INVALID')
  return {realtimeInput:{audio:{data:bytesToBase64(pcm),
    mimeType:'audio/pcm;rate=16000'}}}
}
// Non-spoken reference data enters the existing Live history, but does not
// claim to be the client's utterance and must not trigger a phantom reply.
export function geminiLiveContextMessage(note){
  if(typeof note!=='string'||note.length>2400||
    !note.startsWith('CLIENT-APPROVED REFERENCE DATA ('))
    throw Error('GEMINI_LIVE_CONTEXT_INVALID')
  return {clientContent:{turns:[{role:'user',parts:[{text:note}]}],turnComplete:false}}
}
// Read-only Director checkpoint for the *next* voice turn. Sent only when
// both speech and user input are idle, with turnComplete:false; the server
// still owns the authoritative progress and milestone evidence.
export function geminiLiveDirectorMessage(guidance){
  if(typeof guidance!=='string'||!guidance.trim()||guidance.length>620||
     /[\u0000-\u001f\u007f]/u.test(guidance))
    throw Error('GEMINI_LIVE_DIRECTOR_INVALID')
  return {clientContent:{turns:[{role:'user',parts:[{text:
    '[APPLICATION DIRECTOR CHECKPOINT — NOT HUMAN SPEECH OR CONSENT] '+
    guidance+'. Only the actual human can confirm stage completion. Never read this checkpoint aloud.'
  }]}],turnComplete:false}}
}
export function geminiLiveTextMessage(text){
  if(typeof text!=='string'||!text.trim()||text.length>1200)
    throw Error('GEMINI_LIVE_TEXT_INVALID')
  return {clientContent:{turns:[{role:'user',parts:[{text:text.trim()}]}],
    turnComplete:true}}
}
// Single application-owned Play cue, NEVER an attributed user utterance or
// evidence of client consent. Google requires a turnComplete to begin audio.
export function geminiLiveStartMessage(){
  return {clientContent:{turns:[{role:'user',parts:[{text:
    '[APPLICATION START EVENT — NOT HUMAN SPEECH OR CONSENT] Play was tapped to start this AI coaching conversation. Introduce yourself briefly in the selected character voice and ask only the first invitation question. Wait for an actual human reply. Never mention or quote this app event.'
  }]}],turnComplete:true}}
}
// A fresh transport after a user-initiated restart is not a new meeting.
// This cue is constant: no previous utterance, name, profile or identifier
// is sent to Google by the recovery mechanism.
export function geminiLiveContinueMessage(){
  return {clientContent:{turns:[{role:'user',parts:[{text:
    '[APPLICATION CONTINUATION EVENT — NOT HUMAN SPEECH OR CONSENT] The person resumed an existing coaching conversation after an interruption. Retain the selected character, voice and latest authorized delivery style. Do not introduce yourself again or repeat the opening questionnaire. Briefly welcome the person back and invite them to continue where they left off. Never claim to remember facts you cannot access. Follow subsequent Director checkpoints. Wait for the actual human reply.'
  }]}],turnComplete:true}}
}
// Previous in-tab, completed turns support only the same-origin Director.
// Never use these as provider replay packets or include interrupted replies.
export function geminiLiveLocalRecovery(turns){
  const rows=Array.isArray(turns)?turns:[];
  const complete=rows.filter(row=>row&&['user','assistant'].includes(row.role)&&
    typeof row.content==='string'&&row.content.trim()&&row.interrupted!==true&&
    row.unanswered!==true);
  return {
    continuing:complete.some(row=>row.role==='user'||row.role==='assistant'),
    history:complete.slice(-20).map(row=>({role:row.role,content:row.content.trim().slice(0,1200)})),
    openingHistory:complete.filter(row=>row.role==='user').slice(0,32)
      .map(row=>row.content.trim().slice(0,160)),
  };
}
export function bytesToBase64(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length>256000)throw Error('GEMINI_LIVE_AUDIO_INVALID')
  let text=''
  for(let i=0;i<bytes.length;i+=8192)
    text+=String.fromCharCode(...bytes.subarray(i,Math.min(i+8192,bytes.length)))
  return btoa(text)
}
export function base64ToPcmFloats(data){
  if(typeof data!=='string'||data.length<4||data.length>320000||
     data.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(data))
    throw Error('GEMINI_LIVE_AUDIO_INVALID')
  let raw
  try{raw=atob(data)}catch{throw Error('GEMINI_LIVE_AUDIO_INVALID')}
  if(!raw.length||raw.length%2||raw.length>240000)
    throw Error('GEMINI_LIVE_AUDIO_INVALID')
  const floats=new Float32Array(raw.length/2)
  for(let i=0;i<floats.length;i++){
    const lo=raw.charCodeAt(i*2),hi=raw.charCodeAt(i*2+1)
    const value=(hi<<8)|lo
    floats[i]=(value&32768?value-65536:value)/32768
  }
  return floats
}

export class GeminiLivePcmResampler{
  constructor(inputRate=48000){
    if(!Number.isFinite(inputRate)||inputRate<16000||inputRate>192000)
      throw Error('GEMINI_LIVE_SAMPLE_RATE_INVALID')
    this.ratio=inputRate/GEMINI_LIVE_INPUT_RATE
    this.offset=0
    this.previous=null
  }
  push(frame){
    if(!(frame instanceof Float32Array)||!frame.length||frame.length>16384)
      throw Error('GEMINI_LIVE_FRAME_INVALID')
    const stride=this.ratio
    const extended=new Float32Array(frame.length+1)
    extended[0]=this.previous===null?frame[0]:this.previous
    extended.set(frame,1)
    const samples=[]
    let pos=this.offset
    while(pos<frame.length){
      const before=Math.floor(pos),fraction=pos-before
      const sample=extended[before]*(1-fraction)+extended[before+1]*fraction
      samples.push(Number.isFinite(sample)?Math.max(-1,Math.min(1,sample)):0)
      pos+=stride
    }
    this.offset=pos-frame.length
    this.previous=frame[frame.length-1]
    const pcm=new Uint8Array(samples.length*2)
    const view=new DataView(pcm.buffer)
    for(let i=0;i<samples.length;i++)view.setInt16(i*2,
      Math.round(samples[i]<0?samples[i]*32768:samples[i]*32767),true)
    return pcm
  }
}
export function geminiLiveAudioRms(frame){
  if(!(frame instanceof Float32Array)||!frame.length)return 0
  let power=0
  for(let i=0;i<frame.length;i++)power+=(Number.isFinite(frame[i])?frame[i]*frame[i]:0)
  return Math.sqrt(power/frame.length)
}

/** Never trust arbitrary websocket payloads or log audio/transcriptions. */
export function readGeminiLiveServerMessage(raw){
  if(raw instanceof ArrayBuffer){
    if(raw.byteLength>600000)throw Error('GEMINI_LIVE_FRAME_INVALID')
    try{raw=new TextDecoder('utf-8',{fatal:true}).decode(raw)}
    catch{throw Error('GEMINI_LIVE_FRAME_INVALID')}
  }
  if(typeof raw!=='string'||raw.length>600000)throw Error('GEMINI_LIVE_FRAME_INVALID')
  let message
  try{message=JSON.parse(raw)}catch{throw Error('GEMINI_LIVE_FRAME_INVALID')}
  if(!message||typeof message!=='object'||Array.isArray(message))
    throw Error('GEMINI_LIVE_FRAME_INVALID')
  const content=message.serverContent||{}
  const audio=[]
  const parts=Array.isArray(content.modelTurn?.parts)?content.modelTurn.parts:[]
  for(const part of parts){
    const blob=part?.inlineData
    if(!blob||typeof blob.data!=='string')continue
    if(blob.mimeType&&(typeof blob.mimeType!=='string'||!/^audio\/pcm(?:\s*;\s*rate\s*=\s*24000)?\s*$/i.test(blob.mimeType)))continue
    if(blob.data.length>320000)throw Error('GEMINI_LIVE_AUDIO_INVALID')
    audio.push(blob.data)
  }
  const transcript=value=>typeof value?.text==='string'?
    value.text.slice(0,1800):null
  const update=message.sessionResumptionUpdate
  const handle=update?.newHandle
  const validHandle=typeof handle==='string'&&handle.length>0&&handle.length<=8192
  return {
    setupComplete:Boolean(message.setupComplete),
    audio,
    input:transcript(content.inputTranscription),
    interim:transcript(content.interimInputTranscription),
    output:transcript(content.outputTranscription),
    interrupted:content.interrupted===true,
    turnComplete:content.turnComplete===true,
    goAway:message.goAway||null,
    // An empty update is a protobuf default false. An ordinary server message
    // has no update and must leave the current checkpoint state alone.
    resumable:update?update.resumable===true&&validHandle:null,
    resumeHandle:update?.resumable===true&&validHandle?handle:null,
  }
}
export function appendGeminiLiveTranscript(existing,chunk,max=1200){
  if(typeof chunk!=='string'||!chunk.trim())return existing||''
  const earlier=String(existing||''),incoming=chunk.trim()
  if(incoming===earlier||earlier.endsWith(incoming))return earlier.slice(-max)
  if(incoming.startsWith(earlier)&&earlier.length)return incoming.slice(-max)
  return (earlier+(earlier&& !/^[,.!?…]/u.test(incoming)?' ':'')+incoming).trim().slice(-max)
}

// A local barge-in must also suppress stale network audio already in flight.
// A new turn becomes audible only after Gemini acknowledges interruption or
// completes the old turn. Acknowledgment frames themselves are never played.
// A watchdog is armed only for an expected response, not idle listening.
export class GeminiLiveReplyWatchdog {
  constructor({canFire,onStall,now=Date.now,
    schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),timeoutMs=18000}){
    this.canFire=canFire;this.onStall=onStall;this.now=now
    this.schedule=schedule;this.cancel=cancel;this.timeoutMs=timeoutMs
    this.deadline=null;this.timer=null
  }
  touch(){
    this.deadline=this.now()+this.timeoutMs
    if(this.timer===null)this.arm(this.timeoutMs)
  }
  arm(ms){
    this.timer=this.schedule(()=>this.tick(),ms)
  }
  tick(){
    this.timer=null
    if(this.deadline===null)return
    const remaining=this.deadline-this.now()
    if(remaining>0){this.arm(remaining);return}
    if(!this.canFire()){this.arm(1000);return}
    // Clear before invoking recovery. Never retry a silent turn in a loop.
    this.clear()
    this.onStall()
  }
  clear(){
    if(this.timer!==null)this.cancel(this.timer)
    this.timer=null;this.deadline=null
  }
}

export function geminiLiveCanResumeStalledReply(r,now=Date.now()){
  return Boolean(r?.ready&&!r.ended&&r.socket?.readyState===1&&
    !r.stallRecoveryUsed&&r.reconnects<3&&r.resumeHandle&&
    Date.parse(r.liveToken?.expiresAt)>now)
}

export class GeminiLiveBargeGate{
  constructor(){this.blocked=false}
  interrupt(){this.blocked=true}
  accept(frame){
    const allowed=!this.blocked&&frame?.interrupted!==true
    if(frame?.interrupted===true||frame?.turnComplete===true)this.blocked=false
    return allowed
  }
}

/**
 * Adaptive, browser-local voice-onset detector. The microphone is sampled even
 * during playback. Duck the coach on the first plausible speech frame, then
 * interrupt only after a sustained 240 ms onset survives ducking. Keep the
 * sensitive listening path separate so a quiet or short answer after playback
 * is still forwarded without a 240 ms restriction.
 * Remember a user's already-active utterance: Gemini 3.1 may omit the server
 * interruption event if user speech began before the model's audio turn.
 */
export class GeminiLiveBargeDetector{
  constructor(){
    this.noiseFloor=.003
    this.candidateMs=0
    this.quietMs=0
    this.userActive=false
  }
  sample(level,protectedPlayback=false,frameMs=32,speechThreshold=.013){
    const rms=Number.isFinite(level)?Math.max(0,Math.min(1,level)):0
    if(!protectedPlayback&&rms<.013)
      this.noiseFloor=Math.min(.012,this.noiseFloor*.96+rms*.04)
    const threshold=Math.max(speechThreshold,this.noiseFloor*2.6 * (speechThreshold/.013))
    if(rms>=threshold){
      this.quietMs=0
      const first=this.candidateMs===0
      this.candidateMs=Math.min(250,this.candidateMs+frameMs)
      // Only the transition into an active utterance can cut playback.
      // A sneeze/click or short echo burst must not destroy the queued reply.
      // Preserve a lower onset threshold when the person has the floor.
      if(this.userActive)return 'active'
      if(this.candidateMs>=(protectedPlayback?240:80)){
        this.userActive=true
        return protectedPlayback?'interrupt':'active'
      }
      return protectedPlayback&&first?'duck':'candidate'
    }
    this.quietMs+=frameMs
    if(this.quietMs>=190)this.userActive=false
    if(this.quietMs>=55&&this.candidateMs>0){
      this.candidateMs=0
      return 'restore'
    }
    return 'none'
  }
}

export class GeminiLivePcmPlayer{
  constructor(audioContext,{onStart,onEnd,onLevel,onError,onScheduledPcm,onPlaybackClear}={}){
    if(!audioContext||typeof audioContext.createBufferSource!=='function')
      throw Error('GEMINI_LIVE_AUDIO_OUTPUT_UNAVAILABLE')
    this.reference=new GeminiLiveEchoReference()
    this.context=audioContext;this.cursor=0;this.sources=new Set()
    this.pending=[];this.bufferedSamples=0;this.generation=0
    this.onStart=onStart;this.onEnd=onEnd;this.onLevel=onLevel;this.onError=onError
    this.onScheduledPcm=onScheduledPcm;this.onPlaybackClear=onPlaybackClear
    this.output=typeof audioContext.createGain==='function'?audioContext.createGain():null
    if(this.output){this.output.gain.value=1;this.output.connect(audioContext.destination)}
  }
  setVolume(value){
    if(!this.output)return
    const gain=this.output.gain,target=Math.max(0,Math.min(1,Number(value)||0))
    if(gain.setTargetAtTime){
      gain.cancelScheduledValues(this.context.currentTime)
      gain.setTargetAtTime(target,this.context.currentTime,.012)
    }else gain.value=target
  }
  get playing(){return this.sources.size>0||this.pending.length>0}
  append(base64){
    const frame=base64ToPcmFloats(base64)
    if(this.context.state!=='running')return false
    // Gemini may generate an entire reply faster than real-time. The short
    // Web Audio scheduling horizon is not a limit on a valid spoken reply.
    // Bound queued samples to 60 seconds (5.76 MB before Web Audio copies,
    // limited to the short horizon below). Separately cap tiny packet objects
    // without rejecting normal 20ms PCM.
    if(this.bufferedSamples+frame.length>GEMINI_LIVE_OUTPUT_RATE*60||
       this.pending.length+this.sources.size>=4096)
      throw Error('GEMINI_LIVE_AUDIO_BUFFER_LIMIT')
    this.pending.push({frame,offset:0})
    this.bufferedSamples+=frame.length
    this.resume()
    return true
  }
  resume(){
    const ctx=this.context
    if(ctx.state!=='running')return false
    const generation=this.generation
    while(this.pending.length&&generation===this.generation){
      const start=Math.max(this.cursor,ctx.currentTime+0.035)
      const capacity=Math.floor((ctx.currentTime+2.5-start)*GEMINI_LIVE_OUTPUT_RATE)
      if(capacity<1)break
      const next=this.pending[0]
      // Split a large network chunk so a single source cannot exceed the
      // scheduling horizon. Only the played slice is copied into Web Audio.
      const count=Math.min(next.frame.length-next.offset,GEMINI_LIVE_OUTPUT_RATE/2,capacity)
      const samples=next.frame.subarray(next.offset,next.offset+count)
      let source,buffer
      try{
        buffer=ctx.createBuffer(1,count,GEMINI_LIVE_OUTPUT_RATE)
        buffer.getChannelData(0).set(samples)
        source=ctx.createBufferSource()
        source.buffer=buffer
        source.connect(this.output||ctx.destination)
        source.onended=()=>{
          if(generation!==this.generation||!this.sources.has(source))return
          this.sources.delete(source)
          this.bufferedSamples-=count
          try{source.disconnect()}catch{}
          try{this.resume()}catch{
            // A failure while refilling occurs outside append's caller.
            // Retire the unusable reply once and let the session recover.
            this.stop()
            this.onError?.('GEMINI_LIVE_AUDIO_PLAYBACK_FAILED')
            return
          }
          if(generation===this.generation&&!this.playing){
            this.cursor=0
            this.onEnd?.()
          }
        }
        this.sources.add(source)
        source.start(start)
        this.reference.schedule(samples,start,GEMINI_LIVE_OUTPUT_RATE)
      }catch{
        if(source){
          source.onended=null
          this.sources.delete(source)
          try{source.disconnect()}catch{}
        }
        // Do not advance the cursor or consume this slice on failed start.
        throw Error('GEMINI_LIVE_AUDIO_PLAYBACK_FAILED')
      }
      // Video is an optional mirror of successfully scheduled assistant speech.
      // A renderer error must never interrupt the existing voice path.
      try{this.onScheduledPcm?.(samples,start,ctx)}catch{}
      this.cursor=start+buffer.duration
      next.offset+=count
      if(next.offset===next.frame.length)this.pending.shift()
      this.onStart?.()
      if(generation!==this.generation)return true
      // Only actual scheduled PCM drives the live level, never queued text.
      this.onLevel?.(Math.max(0,Math.min(1,geminiLiveAudioRms(samples)*3)))
    }
    return true
  }
  stop(){
    this.reference.stop(this.context.currentTime)
    try{this.onPlaybackClear?.()}catch{}
    this.generation++
    for(const source of this.sources){
      source.onended=null
      try{source.stop(0)}catch{}
      try{source.disconnect()}catch{}
    }
    this.sources.clear()
    this.pending=[]
    this.bufferedSamples=0
    this.cursor=0
    this.setVolume(1)
    this.onLevel?.(null)
  }
}
