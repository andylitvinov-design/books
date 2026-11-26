// Live audio uses an open mic and Web Audio at the same time. Safari can
// retain a stale output route even while the audio clock is running.
const pendingRefreshes=new WeakMap()

function iosAudioSession(navigatorLike){
 try{
   const ua=String(navigatorLike?.userAgent||'')
   const ios=/(?:iPhone|iPad|iPod)/i.test(ua)||
     (navigatorLike?.platform==='MacIntel'&&Number(navigatorLike?.maxTouchPoints)>1)
   // Home Screen apps can omit Version/ and report a frozen OS version.
   if(!ios||!/AppleWebKit\//i.test(ua)||/(?:CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Firefox|Edg)\//i.test(ua))return null
   const session=navigatorLike.audioSession
   return session&&typeof session==='object'?session:null
 }catch{return null}
}

function cancelRefresh(session){
 clearTimeout(pendingRefreshes.get(session))
 pendingRefreshes.delete(session)
}

export function prepareCoachIos27LiveDuplex(navigatorLike={}){
 const session=iosAudioSession(navigatorLike)
 if(!session)return false
 cancelRefresh(session)
 try{
   // Reset the category left behind by the preceding greeting MP3.
   session.type='auto'
   return session.type==='auto'
 }catch{return false}
}

export function activateCoachIos27LiveDuplex(navigatorLike={}){
 const session=iosAudioSession(navigatorLike)
 if(!session)return false
 cancelRefresh(session)
 try{
   // Select duplex after getUserMedia has acquired the current microphone.
   session.type='play-and-record'
   return session.type==='play-and-record'
 }catch{return false}
}

export function refreshCoachLiveDuplex(navigatorLike,stillCurrent,reselect=true){
 const session=iosAudioSession(navigatorLike)
 if(!session||!stillCurrent())return false
 if(pendingRefreshes.has(session))return true
 try{
   if(session.type!=='play-and-record')return activateCoachIos27LiveDuplex(navigatorLike)
   if(!reselect)return true
   // WebKit can discard an unchanged category write while the OS route is
   // stale (bug 323104). Give it a task boundary between distinct categories.
   // Both categories permit capture. The browser still owns the output device.
   session.type='auto'
   if(session.type!=='auto')return false
   const timer=setTimeout(()=>{
     pendingRefreshes.delete(session)
     if(!stillCurrent())return
     try{if(session.type==='auto')session.type='play-and-record'}catch{}
   },0)
   pendingRefreshes.set(session,timer)
   return true
 }catch{return false}
}

export function restoreCoachIos27LiveDuplex(navigatorLike={}){
 const session=iosAudioSession(navigatorLike)
 if(!session)return false
 cancelRefresh(session)
 try{
   // The caller has released the microphone before this playback transition.
   session.type='playback'
   session.type='auto'
   return session.type==='auto'
 }catch{return false}
}
