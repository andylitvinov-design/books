// Browser-only MP3 player. No vendor key or cloud state in the client.
// Progressive MediaSource playback where audio/mpeg MSE exists; complete
// Blob fallback on iPhone/Safari/Firefox when MSE MP3 is not supported.
// The calling coaching session owns cancellation and its current generation.
export function startCoachingMp3Playback(response,{environment,onStart,onEnd,onError,onBlocked}={}){
  const w=environment||window
  const audio=new w.Audio()
  let reader=null,objectUrl=null,cancelled=false,completed=false
  const isActive=()=>!cancelled&&!completed
  const revoke=()=>{
    if(objectUrl){try{w.URL.revokeObjectURL(objectUrl)}catch{}objectUrl=null}
  }
  const cancel=()=>{
    if(cancelled)return
    cancelled=true
    if(reader)void reader.cancel().catch(()=>{})
    try{audio.pause();audio.removeAttribute('src');audio.load()}catch{}
    audio.onended=null;audio.onerror=null;audio.onplaying=null
    revoke()
  }
  audio.onplaying=()=>{if(isActive())onStart?.()}
  audio.onended=()=>{
    if(!isActive())return
    completed=true
    revoke()
    onEnd?.()
  }
  const fail=()=>{
    if(!isActive())return
    completed=true
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
