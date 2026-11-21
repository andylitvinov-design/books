/**
 * Browser-only Gemini Live PCM/WebSocket framing. No key or stored audio.
 * Input: mono signed little-endian PCM16 16 kHz. Output: mono PCM16 24 kHz.
 * Keep small bounded buffers; interruption silences all scheduled samples.
 */
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
    sessionResumption:{}}}
}
export function geminiLivePcmMessage(pcm){
  if(!(pcm instanceof Uint8Array)||!pcm.length||pcm.length>16000||
    pcm.length%2!==0)throw Error('GEMINI_LIVE_PCM_INVALID')
  return {realtimeInput:{audio:{data:bytesToBase64(pcm),
    mimeType:'audio/pcm;rate=16000'}}}
}
export function geminiLiveTextMessage(text){
  if(typeof text!=='string'||!text.trim()||text.length>1200)
    throw Error('GEMINI_LIVE_TEXT_INVALID')
  return {clientContent:{turns:[{role:'user',parts:[{text:text.trim()}]}],
    turnComplete:true}}
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
    if(blob.mimeType&&!/^audio\/pcm(?:;rate=24000)?$/i.test(blob.mimeType))continue
    if(blob.data.length>320000)throw Error('GEMINI_LIVE_AUDIO_INVALID')
    audio.push(blob.data)
  }
  const transcript=value=>typeof value?.text==='string'?
    value.text.slice(0,1800):null
  return {
    setupComplete:Boolean(message.setupComplete),
    audio,
    input:transcript(content.inputTranscription),
    interim:transcript(content.interimInputTranscription),
    output:transcript(content.outputTranscription),
    interrupted:content.interrupted===true,
    turnComplete:content.turnComplete===true,
    goAway:message.goAway||null,
    resumable:message.sessionResumptionUpdate?.resumable===true,
    resumeHandle:typeof message.sessionResumptionUpdate?.newHandle==='string'?
      message.sessionResumptionUpdate.newHandle.slice(0,8192):null,
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
export class GeminiLiveBargeGate{
  constructor(){this.blocked=false}
  interrupt(){this.blocked=true}
  accept(frame){
    const allowed=!this.blocked&&frame?.interrupted!==true
    if(frame?.interrupted===true||frame?.turnComplete===true)this.blocked=false
    return allowed
  }
}

export class GeminiLivePcmPlayer{
  constructor(audioContext,{onStart,onEnd,onLevel}={}){
    if(!audioContext||typeof audioContext.createBufferSource!=='function')
      throw Error('GEMINI_LIVE_AUDIO_OUTPUT_UNAVAILABLE')
    this.context=audioContext;this.cursor=0;this.sources=new Set()
    this.onStart=onStart;this.onEnd=onEnd;this.onLevel=onLevel
  }
  get playing(){return this.sources.size>0}
  append(base64){
    const frame=base64ToPcmFloats(base64)
    const ctx=this.context
    if(ctx.state!=='running')return false
    if(this.cursor-ctx.currentTime>2.5){this.stop();return false}
    const buffer=ctx.createBuffer(1,frame.length,GEMINI_LIVE_OUTPUT_RATE)
    buffer.getChannelData(0).set(frame)
    const source=ctx.createBufferSource()
    source.buffer=buffer
    source.connect(ctx.destination)
    const start=Math.max(this.cursor,ctx.currentTime+0.035)
    this.cursor=start+buffer.duration
    source.onended=()=>{
      if(!this.sources.has(source))return
      this.sources.delete(source)
      try{source.disconnect()}catch{}
      if(!this.sources.size){this.cursor=0;this.onEnd?.()}
    }
    this.sources.add(source)
    try{source.start(start)}catch{this.sources.delete(source);return false}
    this.onStart?.()
    // Only actual decoded PCM drives the live status, never fake mouth glyphs.
    this.onLevel?.(Math.max(0,Math.min(1,geminiLiveAudioRms(frame)*3)))
    return true
  }
  stop(){
    for(const source of this.sources){
      source.onended=null
      try{source.stop(0);source.disconnect()}catch{}
    }
    this.sources.clear()
    this.cursor=0
    this.onLevel?.(null)
  }
}
