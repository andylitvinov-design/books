// iPhone Safari 27 can keep its WebAudio PCM output in an ambient/ringer-
// muted category even when AudioContext.state is "running". This is NOT a
// Gemini API problem. Real-time coach calls must explicitly use simultaneous
// mic + speaker routing and restore the previous category after releasing mic.
//
// No extra model call, media permission, network request or audio recording.
import {ios27NeedsSpeechRecovery} from './my-coach-dictation.mjs'

function audioSessionForIos27(navigatorLike){
 if(!ios27NeedsSpeechRecovery(navigatorLike))return null
 const session=navigatorLike?.audioSession
 return session&&typeof session==='object'?session:null
}

export function prepareCoachIos27LiveDuplex(navigatorLike={}){
 const session=audioSessionForIos27(navigatorLike)
 if(!session)return false
 try{
   // Reset a stale category left behind by the preceding greeting MP3.
   session.type='auto'
   return session.type==='auto'
 }catch{return false}
}

export function activateCoachIos27LiveDuplex(navigatorLike={}){
 const session=audioSessionForIos27(navigatorLike)
 if(!session)return false
 try{
   // Set AFTER getUserMedia resolves so Safari routes current audio hardware.
   // Never set playback alone while mic is open: Safari may drop mic capture.
   session.type='play-and-record'
   return session.type==='play-and-record'
 }catch{return false}
}

export function restoreCoachIos27LiveDuplex(navigatorLike={}){
 const session=audioSessionForIos27(navigatorLike)
 if(!session)return false
 try{
   // Restore only AFTER stopping tracks. Explicit transition through playback
   // helps WebKit recover from a stale PlayAndRecord/ambient category cache.
   session.type='playback'
   session.type='auto'
   return session.type==='auto'
 }catch{return false}
}
