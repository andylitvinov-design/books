import {speechPcmEnvelope,speechRms} from '../coaching/living-portrait-motion.mjs'
import {coachingWebCodecsOptIn,startProgressiveMp3WebCodecs} from './streamed-mp3-webcodecs.mjs'

// MIME type is the authoritative transport discriminator: Gemini speech is WAV,
// never an MP3 WebCodecs or MP3 MediaSource input, even on iOS 27 with
// the fast-voice opt-in. Retain the one-download Web Audio/blob playback path.
const isMp3SpeechResponse=response=>
  (response?.headers?.get?.('content-type')||'').toLowerCase().startsWith('audio/mpeg')

// Browser-only MP3 player. No vendor key or cloud state in the client.
// Progressive MediaSource playback where audio/mpeg MSE exists; complete
// Blob fallback on iPhone/Safari/Firefox when MSE MP3 is not supported.
// The calling coaching session owns cancellation and its current generation.
export function startCoachingMp3Playback(response,{environment,audioElement,audioContext,onStart,onEnd,onError,onBlocked,onLevel,muted=false}={}){
  const w=environment||window
  const audio=audioElement||new w.Audio()
  let reader=null,objectUrl=null,cancelled=false,completed=false
  let progressivePlayer=null
  let outputGain=null
  let graphSource=null,graphStartedAt=null
  const isActive=()=>!cancelled&&!completed
  // Only the coach output runs through this node; the microphone analyser is
  // never muted. Short ducking confirms human barge-in over playback echo.
  if(audioContext?.createGain){
    try{outputGain=audioContext.createGain();outputGain.connect(audioContext.destination)}catch{outputGain=null}
  }
  let userMuted=Boolean(muted),requestedVolume=1
  const setVolume=volume=>{
    requestedVolume=Math.min(1,Math.max(0.08,Number.isFinite(volume)?volume:1))
    const value=userMuted?0:requestedVolume
    try{audio.muted=userMuted;audio.volume=requestedVolume}catch{}
    try{if(outputGain?.gain)outputGain.gain.value=value}catch{}
  }
  const setMuted=value=>{userMuted=Boolean(value);setVolume(requestedVolume)}
  setVolume(1)
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
    const elapsed=graphSource&&audioContext?
      audioContext.currentTime-graphStartedAt:audio.currentTime
    if(amplitude===null&&pcmLevels&&Number.isFinite(elapsed)){
      const slot=Math.floor(Math.max(0,elapsed)*20)
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
    progressivePlayer?.cancel()
    progressivePlayer=null
    try{outputGain?.disconnect()}catch{}
    outputGain=null
    if(reader)void reader.cancel().catch(()=>{})
    if(graphSource){
      graphSource.onended=null
      try{graphSource.stop()}catch{}
      try{graphSource.disconnect()}catch{}
      graphSource=null
    }
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

  const playDownloaded=async blob=>{
    if(!isActive())return
    // A context unlocked by the first Play can emit audio after the server
    // response arrives. Safari's HTMLAudioElement may otherwise resolve
    // onplaying without audible sound after its user activation has expired.
    if(audioContext&&blob.size>0&&blob.size<=4*1024*1024&&
       typeof audioContext.decodeAudioData==='function'&&
       typeof audioContext.createBufferSource==='function'){
      try{
        const decoded=await audioContext.decodeAudioData(await blob.arrayBuffer())
        if(!isActive())return
        if(audioContext.state!=='running')
          await audioContext.resume?.().catch(()=>{})
        if(!isActive())return
        if(audioContext.state==='running'){
          const source=audioContext.createBufferSource()
          source.buffer=decoded
          source.connect(outputGain||audioContext.destination)
          source.onended=()=>{
            if(!isActive()||graphSource!==source)return
            completed=true;graphSource=null
            try{source.disconnect()}catch{}
            stopMeter();onEnd?.()
          }
          graphStartedAt=audioContext.currentTime
          graphSource=source
          if(typeof onLevel==='function')
            pcmLevels=speechPcmEnvelope(decoded.getChannelData(0),decoded.sampleRate)
          source.start(0)
          onStart?.()
          startMeter()
          return
        }
      }catch{/* Use the same downloaded bytes with the existing HTML audio route. */}
    }
    if(!isActive())return
    objectUrl=w.URL.createObjectURL(blob)
    audio.src=objectUrl
    void decodeEnvelope(blob)
    await resume()
  }
  const run=(async()=>{
    // Explicit hardware acceptance: ?coachStream=1. Uses the SAME authorized
    // TTS response and existing iPhone audio context; never retries the vendor.
    if(audioContext&&isMp3SpeechResponse(response)&&coachingWebCodecsOptIn(w)&&response.body?.getReader){
      progressivePlayer=startProgressiveMp3WebCodecs(response,{
        environment:w,audioContext,isActive,destination:outputGain||audioContext.destination,
        onStart:()=>{if(isActive())onStart?.()},
        onLevel:level=>{if(isActive())emitLevel(level)},
        onEnd:()=>{
          if(!isActive())return
          completed=true;stopMeter();onEnd?.()
        },
        onError:fail,
      })
      const outcome=await progressivePlayer.run
      if(outcome?.fallback&&isActive())await playDownloaded(outcome.blob)
      return
    }
    if(audioContext&&typeof response.blob==='function'){
      // Exactly one downloaded MP3; no second Fish/Google request on failure.
      const blob=await response.blob()
      await playDownloaded(blob)
      return
    }
    const progressive=Boolean(isMp3SpeechResponse(response)&&
      response.body && typeof w.MediaSource==='function' &&
      w.MediaSource.isTypeSupported?.('audio/mpeg'))
    if(!progressive){
      const blob=await response.blob()
      if(!isActive())return
      await playDownloaded(blob)
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
  return {cancel,resume,run,audio,setVolume,setMuted}
}


// Quiet local PCM speech-output priming within a real Play gesture.
// It reuses the same audio element after an asynchronous MP3 arrives,
// without capturing, uploading or storing microphone audio.
export function primeCoachingAudioGesture(environment){
  const w=environment||(typeof window==='undefined'?null:window)
  if(!w?.Audio||!w?.URL?.createObjectURL||!w?.Blob)return null
  let url=null
  try{
    const samples=800,bytes=new Uint8Array(44+samples)
    const view=new DataView(bytes.buffer)
    const ascii=(at,word)=>{for(let i=0;i<word.length;i++)bytes[at+i]=word.charCodeAt(i)}
    ascii(0,'RIFF');view.setUint32(4,36+samples,true);ascii(8,'WAVE')
    ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true)
    view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,8000,true)
    view.setUint16(32,1,true);view.setUint16(34,8,true)
    ascii(36,'data');view.setUint32(40,samples,true);bytes.fill(128,44)
    const audio=new w.Audio()
    audio.preload='auto'
    audio.playsInline=true
    url=w.URL.createObjectURL(new w.Blob([bytes],{type:'audio/wav'}))
    audio.src=url
    const release=()=>{
      try{
        // Do not erase a real MP3 that has replaced the priming WAV.
        if(audio.src===url){audio.pause();audio.removeAttribute('src');audio.load()}
      }catch{}
      try{w.URL.revokeObjectURL(url)}catch{}
    }
    const result=audio.play() // synchronous in Play's user-activation handler
    void Promise.resolve(result).then(release,release)
    return audio
  }catch{
    if(url)try{w.URL.revokeObjectURL(url)}catch{}
    return null
  }
}

// Keep progressive HTML/MSE speech on desktop. Every iOS browser uses
// WebKit, where the later HTMLAudio.play can be silently blocked.
export function shouldUseCoachingWebAudio(device){
  const nav=device||(typeof navigator==='undefined'?null:navigator)
  const ua=String(nav?.userAgent||'')
  return /iPhone|iPad|iPod/i.test(ua)||
    (nav?.platform==='MacIntel'&&Number(nav.maxTouchPoints)>1)
}

/**
 * Prepare Web Audio within the user's first Play/Send gesture.
 * The persistent context plays the SAME already downloaded MP3 later,
 * independent of a new HTMLMediaElement autoplay permission.
 * No microphone track, upload, audio recording or extra provider request.
 */
export function unlockCoachingAudioContext(environment){
  const w=environment||(typeof window==='undefined'?null:window)
  const AudioContext=w?.AudioContext||w?.webkitAudioContext
  if(!AudioContext)return null
  let context=null
  try{
    context=new AudioContext()
    const source=context.createBufferSource()
    source.buffer=context.createBuffer(1,128,22050)
    source.connect(context.destination)
    source.start(0) // silent buffer: unlock on the actual user gesture
    const resuming=context.resume?.()
    if(resuming?.catch)void resuming.catch(()=>{})
    return context
  }catch{
    if(context)try{void context.close?.()}catch{}
    return null
  }
}
