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
