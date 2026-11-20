// Opt-in browser-only progressive MP3 -> WebCodecs -> an already-unlocked WebAudio context.
// No microphone, worker, media upload, second TTS request, or persistent storage.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024
const BITRATE_MPEG1_L3 = [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]
const BITRATE_MPEG2_L3 = [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160]
const SAMPLING = [44100,48000,32000]

export function mp3FrameHeader(data,offset=0){
  if(!data||data.length-offset<4)return null
  const a=data[offset],b=data[offset+1],c=data[offset+2],d=data[offset+3]
  const version=(b>>3)&3,layer=(b>>1)&3,bitrateIndex=c>>4,samplingIndex=(c>>2)&3
  if(a!==255||(b&224)!==224||version===1||layer!==1||
     bitrateIndex===0||bitrateIndex===15||samplingIndex===3)return null
  const rate=Math.floor(SAMPLING[samplingIndex]/(version===3?1:version===2?2:4))
  const kbps=(version===3?BITRATE_MPEG1_L3:BITRATE_MPEG2_L3)[bitrateIndex]
  const frameLength=Math.floor((version===3?144000:72000)*kbps/rate)+((c>>1)&1)
  if(frameLength<24||frameLength>2048)return null
  return {frameLength,sampleRate:rate,channels:(d>>6)===3?1:2,samples:version===3?1152:576}
}

export class Mp3FrameStream{
  constructor(){this.pending=new Uint8Array(0);this.id3Checked=false;this.skip=0;this.frames=0;this.dropped=0}
  push(chunk){
    if(!(chunk instanceof Uint8Array))throw Error('MP3_STREAM_INVALID_CHUNK')
    const next=new Uint8Array(this.pending.length+chunk.length)
    next.set(this.pending);next.set(chunk,this.pending.length)
    let pos=0
    if(!this.id3Checked){
      if(next.length<10){this.pending=next;return []}
      this.id3Checked=true
      if(next[0]===73&&next[1]===68&&next[2]===51){
        if([next[6],next[7],next[8],next[9]].some(v=>v>127))throw Error('MP3_STREAM_BAD_ID3')
        const len=(next[6]<<21)|(next[7]<<14)|(next[8]<<7)|next[9]
        this.skip=10+len+((next[5]&16)?10:0)
        if(this.skip>256*1024)throw Error('MP3_STREAM_BAD_ID3')
      }
    }
    if(this.skip){
      const count=Math.min(next.length,this.skip)
      this.skip-=count;pos=count
      if(this.skip){this.pending=new Uint8Array(0);return []}
    }
    const frames=[]
    while(pos+4<=next.length){
      const meta=mp3FrameHeader(next,pos)
      if(!meta){pos++;this.dropped++;if(this.dropped>2048)throw Error('MP3_STREAM_NO_SYNC');continue}
      if(pos+meta.frameLength>next.length)break
      frames.push({...meta,bytes:next.slice(pos,pos+meta.frameLength)})
      pos+=meta.frameLength;this.frames++
    }
    this.pending=next.slice(pos)
    if(this.pending.length>8192)throw Error('MP3_STREAM_UNBOUNDED_FRAGMENT')
    return frames
  }
  validEnd(){return this.frames>=2&&this.skip===0&&this.pending.length<=256}
}

export function coachingWebCodecsOptIn(environment){
  const w=environment||(typeof window!=='undefined'?window:null)
  if(!w?.AudioDecoder||!w?.EncodedAudioChunk||!w?.location)return false
  // On iPhone, use supported WebCodecs by default for fast first audio.
  // ?coachStream=0 is an immediate safe escape hatch. The decoder probes
  // actual MP3 codec support and falls back to the same MP3 on errors.
  const mode=new URLSearchParams(w.location.search).get('coachStream')
  if(mode==='0')return false
  if(mode==='1')return true
  const nav=w.navigator||{}
  return /iPhone|iPad|iPod/i.test(String(nav.userAgent||''))||
    (nav.platform==='MacIntel'&&Number(nav.maxTouchPoints)>1)
}

export function startProgressiveMp3WebCodecs(response,{environment,audioContext,destination,onStart,onEnd,onError,onLevel,isActive=()=>true}={}){
  const w=environment||(typeof window!=='undefined'?window:null)
  let reader=null,decoder=null,closed=false,streamFinished=false,started=false,ended=false
  let cursor=0,bytes=0,outputCount=0,decodeError=null,bufferedSeconds=0
  const scheduled=new Set(),pending=[],raw=[]
  const live=()=>!closed&&isActive()
  const stop=()=>{
    if(closed)return
    closed=true
    try{void reader?.cancel?.().catch?.(()=>{})}catch{}
    try{decoder?.close?.()}catch{}
    for(const node of scheduled){node.onended=null;try{node.stop()}catch{}try{node.disconnect()}catch{}}
    scheduled.clear();pending.length=0
    try{onLevel?.(null)}catch{}
  }
  const complete=()=>{
    if(!live()||ended||!streamFinished||scheduled.size||pending.length)return
    ended=true
    try{onLevel?.(null)}catch{}
    onEnd?.()
  }
  const schedule=(force=false)=>{
    if(!live()||(!started&&bufferedSeconds<0.14&&!force))return
    if(audioContext?.state!=='running')throw Error('MP3_STREAM_AUDIO_CONTEXT_SUSPENDED')
    for(const buffer of pending.splice(0)){
      const source=audioContext.createBufferSource()
      source.buffer=buffer
      source.connect(destination||audioContext.destination)
      const when=Math.max(audioContext.currentTime+0.045,cursor||0)
      cursor=when+buffer.duration
      source.onended=()=>{
        scheduled.delete(source)
        try{source.disconnect()}catch{}
        complete()
      }
      scheduled.add(source)
      source.start(when)
      if(!started){started=true;onStart?.()}
    }
    bufferedSeconds=0
  }
  const output=sample=>{
    try{
      if(!live())return
      const channels=sample.numberOfChannels,frames=sample.numberOfFrames,rate=sample.sampleRate
      if(!Number.isInteger(channels)||channels<1||channels>2||
         !Number.isInteger(frames)||frames<1||frames>8192||
         !Number.isFinite(rate)||rate<8000||rate>96000)throw Error('MP3_STREAM_BAD_PCM')
      const buffer=audioContext.createBuffer(channels,frames,rate)
      for(let channel=0;channel<channels;channel++){
        const pcm=new Float32Array(frames)
        sample.copyTo(pcm,{planeIndex:channel,format:'f32-planar'})
        buffer.getChannelData(channel).set(pcm)
      }
      pending.push(buffer);bufferedSeconds+=buffer.duration;outputCount++
      schedule()
    }catch(error){decodeError=error;if(started){try{onError?.()}finally{stop()}}}
    finally{try{sample.close()}catch{}}
  }
  const run=(async()=>{
    if(!w?.AudioDecoder||!w?.EncodedAudioChunk||!audioContext||!response?.body?.getReader)
      return {fallback:true,blob:await response.blob()}
    // Check the actual runtime codec, not just the existence of AudioDecoder.
    let supported=false
    try{supported=(await w.AudioDecoder.isConfigSupported({codec:'mp3',sampleRate:44100,numberOfChannels:2}))?.supported===true}
    catch{}
    if(!supported||!live())return {fallback:true,blob:await response.blob()}
    if(audioContext.state!=='running'){
      try{await audioContext.resume?.()}catch{}
      if(audioContext.state!=='running')return {fallback:true,blob:await response.blob()}
    }
    const parsed=new Mp3FrameStream()
    reader=response.body.getReader()
    let frameNumber=0,configured=false
    try{
      while(live()){
        const {done,value}=await reader.read()
        if(done)break
        if(!live())return {cancelled:true}
        if(!(value instanceof Uint8Array)||!value.byteLength)continue
        bytes+=value.byteLength
        if(bytes>MAX_AUDIO_BYTES)throw Error('MP3_STREAM_TOO_LARGE')
        raw.push(value.slice())
        if(decodeError)continue
        for(const frame of parsed.push(value)){
          if(!configured){
            decoder=new w.AudioDecoder({output,error:error=>{
              decodeError=error||Error('MP3_STREAM_DECODE_FAILED')
              if(started){try{onError?.()}finally{stop()}}
            }})
            decoder.configure({codec:'mp3',sampleRate:frame.sampleRate,numberOfChannels:frame.channels})
            configured=true
          }
          if(!live()||decodeError)break
          const duration=Math.round(frame.samples*1e6/frame.sampleRate)
          decoder.decode(new w.EncodedAudioChunk({type:'key',timestamp:Math.round(frameNumber*duration),duration,data:frame.bytes}))
          frameNumber++
          if(decoder.decodeQueueSize>72)await decoder.flush()
        }
      }
      if(!live())return {cancelled:true}
      if(!decodeError&&decoder&&parsed.validEnd())await decoder.flush()
      if(!live())return {cancelled:true}
      if(decodeError||!decoder||!parsed.validEnd()||outputCount===0){
        if(started)throw Error('MP3_STREAM_INTERRUPTED')
        return {fallback:true,blob:new w.Blob(raw,{type:'audio/mpeg'})}
      }
      schedule(true)
      streamFinished=true
      complete()
      return {streaming:true,frames:frameNumber,bytes}
    }catch(error){
      if(!live())return {cancelled:true}
      if(started){try{onError?.()}finally{stop()}return {handled:true}}
      // Same vendor response only: drain remaining bytes for the original full-MP3 fallback.
      try{for(;;){const part=await reader.read();if(part.done||!live())break
        bytes+=part.value?.byteLength||0
        if(bytes>MAX_AUDIO_BYTES)break
        if(part.value?.byteLength)raw.push(part.value.slice())
      }}catch{}
      return bytes<=MAX_AUDIO_BYTES&&live()?{fallback:true,blob:new w.Blob(raw,{type:'audio/mpeg'})}:{cancelled:true}
    }finally{
      try{decoder?.close()}catch{}
      try{reader?.releaseLock()}catch{}
    }
  })()
  return {run,cancel:stop,get started(){return started}}
}
