// A first-party, fixed-introduction MP3 starts inside the original user Play
// gesture. Browsers can then stream audio as bytes arrive, rather than waiting
// for an asynchronous fetch + full Blob + decodeAudioData (slow on iOS).
// This helper never touches the microphone or stores recorded audio.
const PUBLIC_INTRO=/^\/api\/coaching\/intro\/(en|ru|es)\/(mira|max|sofia|alex|merlin|harry|genie|lea|noah|iris|ray)\?v=2$/

export function coachIntroAudioPath(coach,locale){
  const c=String(coach||''),l=String(locale||'')
  const url=`/api/coaching/intro/${l}/${c}?v=2`
  return PUBLIC_INTRO.test(url)?url:null
}

export function startDirectCoachIntroAudio(url,{environment,onStart,onEnd,onError,onBlocked}={}){
  const w=environment||(typeof window!=='undefined'?window:null)
  if(!PUBLIC_INTRO.test(url)||!w?.Audio)throw new Error('COACH_INTRO_AUDIO_INVALID')
  const audio=new w.Audio()
  let cancelled=false,finished=false,started=false,timer=null
  const clear=()=>{if(timer!==null){(w.clearTimeout||clearTimeout)(timer);timer=null}}
  const detach=()=>{audio.onplaying=null;audio.onended=null;audio.onerror=null;audio.onstalled=null}
  const cancel=()=>{
    if(cancelled)return
    cancelled=true;clear();detach()
    try{audio.pause()}catch{}
    try{audio.removeAttribute('src');audio.load()}catch{}
  }
  const fail=error=>{
    if(cancelled||finished)return
    finished=true;clear()
    if(error?.name==='NotAllowedError')onBlocked?.()
    else onError?.(error)
    cancel()
  }
  audio.preload='auto'
  audio.playsInline=true
  audio.muted=false
  audio.volume=1
  audio.onplaying=()=>{
    if(cancelled||finished||started)return
    started=true;clear();onStart?.()
  }
  audio.onended=()=>{
    if(cancelled||finished)return
    finished=true;clear();onEnd?.()
    cancel()
  }
  audio.onerror=()=>fail(new Error('COACH_INTRO_AUDIO_ERROR'))
  // MediaElement can buffer and play progressively on iOS. Crucially play()
  // happens in this very call stack, while the browser user gesture is active.
  audio.src=url
  try{
    const result=audio.play()
    if(result?.catch)void result.catch(fail)
  }catch(error){fail(error)}
  const setTimeoutFn=w.setTimeout||setTimeout
  if(!cancelled&&!started)timer=setTimeoutFn(()=>{
    if(!cancelled&&!started)fail(new Error('COACH_INTRO_AUDIO_TIMEOUT'))
  },19000)
  return {audio,cancel}
}
