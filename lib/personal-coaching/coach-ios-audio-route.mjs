import {ios27NeedsSpeechRecovery} from './my-coach-dictation.mjs'

// iOS 27 WebKit can route speech to the receiver or mute output when a
// simultaneous microphone capture opens a competing PlayAndRecord session.
// Switch only our legacy half-duplex TTS route; direct Gemini Live owns its
// independent full-duplex WebAudio session and is unaffected.
export function setCoachIos27AudioSession(navigatorLike={},mode='auto'){
  if(!ios27NeedsSpeechRecovery(navigatorLike)||!['auto','playback'].includes(mode))
    return false
  const session=navigatorLike?.audioSession
  if(!session)return false
  try{
    session.type=mode
    return session.type===mode
  }catch{return false}
}

/**
 * Recovery for WebKit's cached audio category / GPU-side route mismatch:
 * reasserting "playback" on an already-broken category is a no-op.
 * One 0ms hop through "ambient" forces two distinct category updates.
 * Do this only before starting output, never while capturing a microphone.
 * A concurrent stop/auto transition wins: the deferred restore will not
 * switch a stopped session back into playback.
 */
export function refreshCoachIos27PlaybackRoute(
  navigatorLike={},defer=callback=>setTimeout(callback,0)
){
  if(!ios27NeedsSpeechRecovery(navigatorLike))return false
  const session=navigatorLike?.audioSession
  if(!session)return false
  try{
    session.type='ambient'
    if(session.type!=='ambient'){
      return setCoachIos27AudioSession(navigatorLike,'playback')
    }
    defer(()=>{
      try{
        if(session.type==='ambient')session.type='playback'
      }catch{/* Audio output still has the no-session fallback. */}
    })
    return true
  }catch{
    return setCoachIos27AudioSession(navigatorLike,'playback')
  }
}

// Keep the Basic microphone and playback in the same iOS audio category.
// This is capability detection, not proof that the device is listening.
export function setCoachIos27DuplexRoute(navigatorLike={}){
  if(!ios27NeedsSpeechRecovery(navigatorLike))return true
  const session=navigatorLike?.audioSession
  if(!session)return false
  try{
    if(session.type!=='play-and-record')session.type='play-and-record'
    return session.type==='play-and-record'
  }catch{return false}
}
