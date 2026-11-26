// A first-party, fixed-introduction MP3 starts inside the original user Play
// gesture. Browsers can then stream audio as bytes arrive, rather than waiting
// for an asynchronous fetch + full Blob + decodeAudioData (slow on iOS).
// This helper never touches the microphone or stores recorded audio.
const PUBLIC_INTRO=/^\/api\/coaching\/intro\/(?:(?:en|ru|es)\/(?:mira|max|sofia|alex|merlin|harry|genie|caesar|lea|noah|iris|ray)\?v=2|(?:en|ru)\/genie\?v=3|en\/(?:mira|max|sofia|alex|merlin|harry|genie)\?v=4|ru\/(?:alex|max)\?v=4|(?:en|ru)\/caesar\?v=5)$/

export function coachIntroAudioPath(coach,locale){
  const c=String(coach||''),l=String(locale||'')
  const version=c==='caesar'&&['ru','en'].includes(l)?5:(l==='en'&&/^(?:mira|max|sofia|alex|merlin|harry|genie)$/.test(c)||l==='ru'&&/^(?:alex|max)$/.test(c))?4:c==='genie'&&l==='ru'?3:2
  const url=`/api/coaching/intro/${l}/${c}?v=${version}`
  return PUBLIC_INTRO.test(url)?url:null
}

export function startDirectCoachIntroAudio(url,{environment,onStart,onEnd,onError,onBlocked,fallbackText,locale}={}){
  const w=environment||(typeof window!=='undefined'?window:null)
  if(!PUBLIC_INTRO.test(url)||!w?.Audio)throw new Error('COACH_INTRO_AUDIO_INVALID')
  const audio=new w.Audio()
  let cancelled=false,finished=false,started=false,timer=null,attemptId=0,retries=0,utterance=null
  const clear=()=>{if(timer!==null){(w.clearTimeout||clearTimeout)(timer);timer=null}}
  const detach=()=>{audio.onplaying=null;audio.onended=null;audio.onerror=null;audio.onstalled=null}
  const cancel=()=>{
    if(cancelled)return
    cancelled=true;clear();detach();attemptId++
    if(utterance){utterance.onstart=null;utterance.onend=null;utterance.onerror=null;utterance=null;try{w.speechSynthesis?.cancel()}catch{}}
    try{audio.pause()}catch{}
    try{audio.removeAttribute('src');audio.load()}catch{}
  }
  const terminal=error=>{
    if(cancelled||finished)return
    finished=true;clear()
    if(error?.name==='NotAllowedError')onBlocked?.()
    else onError?.(error)
    cancel()
  }
  const deviceFallback=error=>{
    if(/\?v=[45]$/.test(url)||!fallbackText||!w.speechSynthesis?.speak||!w.SpeechSynthesisUtterance){terminal(error);return}
    try{
      const speech=w.speechSynthesis
      const voice=new w.SpeechSynthesisUtterance(fallbackText)
      utterance=voice
      voice.lang={en:'en-US',ru:'ru-RU',es:'es-ES'}[locale]||'en-US'
      const voices=(speech.getVoices?.()||[]).filter(item=>String(item.lang||'').toLowerCase().startsWith(locale||'en'))
      if(voices.length)voice.voice=voices.find(item=>item.localService)||voices[0]
      voice.onstart=()=>{
        if(cancelled||finished||started)return
        started=true;clear();onStart?.()
      }
      voice.onend=()=>{
        if(cancelled||finished)return
        finished=true;clear();utterance=null;onEnd?.();cancel()
      }
      voice.onerror=()=>terminal(error)
      timer=(w.setTimeout||setTimeout)(()=>{if(!started)terminal(error)},5000)
      if(speech.speaking||speech.pending)speech.cancel()
      speech.speak(voice)
      if(speech.paused)speech.resume()
    }catch{terminal(error)}
  }
  const fail=error=>{
    if(cancelled||finished)return
    clear();detach();attemptId++
    try{audio.pause();audio.removeAttribute('src');audio.load()}catch{}
    if(started){terminal(error);return}
    if(retries===0){retries++;play();return}
    deviceFallback(error)
  }
  audio.preload='auto'
  audio.playsInline=true
  audio.muted=false
  audio.volume=1
  const play=()=>{
    const id=++attemptId
    const failure=error=>{if(!cancelled&&!finished&&id===attemptId)fail(error)}
    audio.onplaying=()=>{
      if(cancelled||finished||started||id!==attemptId)return
      started=true;clear();onStart?.()
    }
    audio.onended=()=>{
      if(cancelled||finished||id!==attemptId)return
      finished=true;clear();onEnd?.();cancel()
    }
    audio.onerror=()=>failure(new Error('COACH_INTRO_AUDIO_ERROR'))
    // First play stays synchronous in the original user gesture.
    const setTimeoutFn=w.setTimeout||setTimeout
    timer=setTimeoutFn(()=>{if(!started)failure(new Error('COACH_INTRO_AUDIO_TIMEOUT'))},/\?v=[345]$/.test(url)?60000:30000)
    try{
      audio.src=url
      const result=audio.play()
      if(result?.catch)void result.catch(failure)
    }catch(error){failure(error)}
  }
  play()
  return {audio,cancel}
}
