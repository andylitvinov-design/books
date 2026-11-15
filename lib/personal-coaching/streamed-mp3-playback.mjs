import {speechPcmEnvelope,speechRms} from '../coaching/living-portrait-motion.mjs'

// Browser-only MP3 player. No vendor key or cloud state in the client.
// Progressive MediaSource playback where audio/mpeg MSE exists; complete
// Blob fallback on iPhone/Safari/Firefox when MSE MP3 is not supported.
// The calling coaching session owns cancellation and its current generation.
export function startCoachingMp3Playback(response,{environment,onStart,onEnd,onError,onBlocked,onLevel}={}){
  const w=environment||window
  const audio=new w.Audio()
  let reader=null,objectUrl=null,cancelled=false,completed=false
  const isActive=()=>!cancelled&&!completed
  // A meter never changes the audio output path: captureStream is analysed
  // independently where supported; iPhone uses its already-buffered MP3.
  let levelFrame=0,lastLevelFrame=0,pcmLevels=null
  let meterContext=null,meterSource=null,meterAnalyser=null,meterSamples=null
  let hasAudibleSamples=false,meterStarted=false
  const emitLevel=level=>{try{onLevel?.(level)}catch{}}
  const stopMeter=()=>{
    if(levelFrame&&typeof w.cancelAnimationFrame==='function')w.cancelAnimationFrame(levelFrame)
    levelFrame=0
    try{meterSource?.disconnect()}catch{}
    try{meterAnalyser?.disconnect()}catch{}
    if(meterContext)void meterContext.close().catch(()=>{})
    meterSource=null;meterAnalyser=null;meterContext=null
    emitLevel(null)
  }
  const paintLevel=now=>{
    if(!isActive())return
    levelFrame=w.requestAnimationFrame(paintLevel)
    if(now-lastLevelFrame<48)return
    lastLevelFrame=now
    let amplitude=null
    if(meterAnalyser&&meterContext?.state==='running'){
      try{
        meterSamples.fill(128) // Silence until the captured audio graph supplies samples.
        meterAnalyser.getByteTimeDomainData(meterSamples)
        const rms=speechRms(meterSamples)
        if(rms>0.01)hasAudibleSamples=true
        if(hasAudibleSamples)amplitude=Math.min(1,rms*4)
      }catch{}
    }
    if(amplitude===null&&pcmLevels&&Number.isFinite(audio.currentTime)){
      const slot=Math.floor(Math.max(0,audio.currentTime)*20)
      if(slot<pcmLevels.length)amplitude=pcmLevels[slot]
    }
    if(amplitude!==null)emitLevel(amplitude)
  }
  const startMeter=()=>{
    if(typeof onLevel!=='function'||meterStarted)return
    meterStarted=true
    // A captured playback stream is optional and never connected to speakers,
    // avoiding echo and preserving the original HTMLAudioElement volume.
    try{
      const Context=w.AudioContext||w.webkitAudioContext
      const stream=audio.captureStream?.()
      if(Context&&stream?.getAudioTracks?.().length){
        meterContext=new Context()
        meterSource=meterContext.createMediaStreamSource(stream)
        meterAnalyser=meterContext.createAnalyser()
        meterAnalyser.fftSize=256
        meterSamples=new Uint8Array(meterAnalyser.fftSize)
        meterSource.connect(meterAnalyser)
        if(meterContext.state==='suspended')void meterContext.resume().catch(()=>{})
      }
    }catch{
      try{meterSource?.disconnect()}catch{}
      if(meterContext)void meterContext.close().catch(()=>{})
      meterSource=null;meterContext=null;meterAnalyser=null
    }
    if(typeof w.requestAnimationFrame==='function')
      levelFrame=w.requestAnimationFrame(paintLevel)
  }
  const decodeEnvelope=async blob=>{
    if(typeof onLevel!=='function'||blob.size>2000000)return
    const Offline=w.OfflineAudioContext||w.webkitOfflineAudioContext
    if(!Offline||typeof blob.arrayBuffer!=='function')return
    try{
      const ctx=new Offline(1,1,44100)
      const audioBuffer=await ctx.decodeAudioData(await blob.arrayBuffer())
      if(isActive())pcmLevels=speechPcmEnvelope(
        audioBuffer.getChannelData(0),audioBuffer.sampleRate)
    }catch{/* Unsupported decoder: preserve the existing speech-phase pulses. */}
  }
  const revoke=()=>{
    if(objectUrl){try{w.URL.revokeObjectURL(objectUrl)}catch{}objectUrl=null}
  }
  const cancel=()=>{
    if(cancelled)return
    cancelled=true
    stopMeter()
    if(reader)void reader.cancel().catch(()=>{})
    try{audio.pause();audio.removeAttribute('src');audio.load()}catch{}
    audio.onended=null;audio.onerror=null;audio.onplaying=null
    revoke()
  }
  audio.onplaying=()=>{if(isActive()){onStart?.();startMeter()}}
  audio.onended=()=>{
    if(!isActive())return
    completed=true
    stopMeter()
    revoke()
    onEnd?.()
  }
  const fail=()=>{
    if(!isActive())return
    completed=true
    stopMeter()
    try{audio.pause()}catch{}
    revoke()
    onError?.()
  }
  audio.onerror=fail
  // Safari keeps the same buffered MP3 after a gesture/autoplay denial.
  // The following direct click calls audio.play() synchronously, without
  // a second chargeable synthesis request.
  const resume=()=>{
    if(!isActive())return Promise.resolve(false)
    let attempt
    try{attempt=audio.play()}
    catch(error){
      if(error?.name==='NotAllowedError'){onBlocked?.();return Promise.resolve(false)}
      fail();return Promise.resolve(false)
    }
    return Promise.resolve(attempt).then(()=>true,error=>{
      if(!isActive())return false
      if(error?.name==='NotAllowedError'){onBlocked?.();return false}
      fail();return false
    })
  }

  const run=(async()=>{
    const progressive=Boolean(response.body &&
      typeof w.MediaSource==='function' &&
      w.MediaSource.isTypeSupported?.('audio/mpeg'))
    if(!progressive){
      const blob=await response.blob()
      if(!isActive())return
      objectUrl=w.URL.createObjectURL(blob)
      audio.src=objectUrl
      void decodeEnvelope(blob) // no extra network request; never delays playback
      await resume()
      return
    }
    const source=new w.MediaSource()
    objectUrl=w.URL.createObjectURL(source)
    audio.src=objectUrl
    await new Promise((resolve,reject)=>{
      const onOpen=()=>{source.removeEventListener('error',onErr);resolve()}
      const onErr=()=>{source.removeEventListener('sourceopen',onOpen);reject(Error('MSE_OPEN_FAILED'))}
      source.addEventListener('sourceopen',onOpen,{once:true})
      source.addEventListener('error',onErr,{once:true})
    })
    if(!isActive())return
    const buffer=source.addSourceBuffer('audio/mpeg')
    reader=response.body.getReader()
    let played=false
    for(;;){
      const chunk=await reader.read()
      if(!isActive()||chunk.done)break
      if(!chunk.value?.byteLength)continue
      await new Promise((resolve,reject)=>{
        const updated=()=>{buffer.removeEventListener('error',failed);resolve()}
        const failed=()=>{buffer.removeEventListener('updateend',updated);reject(Error('MSE_APPEND_FAILED'))}
        buffer.addEventListener('updateend',updated,{once:true})
        buffer.addEventListener('error',failed,{once:true})
        try{buffer.appendBuffer(chunk.value)}
        catch(error){buffer.removeEventListener('updateend',updated);buffer.removeEventListener('error',failed);reject(error)}
      })
      if(!played&&isActive()){
        played=true
        await resume()
      }
    }
    if(isActive() && source.readyState==='open' && !buffer.updating)
      try{source.endOfStream()}catch{}
    if(!played&&isActive())throw Error('NO_AUDIO_CHUNKS')
  })()
  void run.catch(fail)
  return {cancel,resume,run,audio}
}
