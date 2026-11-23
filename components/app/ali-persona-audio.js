'use client'
import {aliPersonaGreeting,getAliPersona} from '@/lib/holistic-support/ali-personas.mjs'

// The cloud endpoint serves only fixed editorial greetings and retains its
// existing rate/cost caps. A HEAD never synthesizes paid audio.
let current=null
let naturalStatus='unknown'
let inFlight=null

export function prepareAliNaturalVoice(){
 if(typeof window==='undefined')return Promise.resolve(false)
 if(naturalStatus==='available')return Promise.resolve(true)
 if(naturalStatus==='unavailable')return Promise.resolve(false)
 if(inFlight)return inFlight
 inFlight=fetch('/api/ali/voice/en/alex',{method:'HEAD',credentials:'same-origin'})
  .then(response=>{naturalStatus=response.ok?'available':'unavailable';return response.ok})
  .catch(()=>{naturalStatus='unavailable';return false})
  .finally(()=>{inFlight=null})
 return inFlight
}

export function stopAliPersonaAudio(){
 if(!current)return
 const item=current
 current=null
 item.stop()
}

function deviceSpeech(persona,locale,onStart,onFinish){
 const speech=window.speechSynthesis
 const Utterance=window.SpeechSynthesisUtterance
 if(!speech||typeof Utterance!=='function'){onFinish('error');return ()=>{}}
 const utterance=new Utterance(aliPersonaGreeting(persona.id,locale))
 utterance.lang={en:'en-US',ru:'ru-RU',es:'es-ES'}[locale]||'en-US'
 utterance.rate=persona.voice.rate
 utterance.pitch=persona.voice.pitch
 const voices=speech.getVoices().filter(voice=>voice.lang?.toLowerCase().replace('_','-').startsWith(locale))
  .sort((a,b)=>a.name.localeCompare(b.name))
 if(voices.length)utterance.voice=voices[persona.voice.slot%voices.length]
 let stopped=false,started=false
 let nudge=null,watchdog=null
 const clear=()=>{
  if(nudge!==null)window.clearTimeout(nudge)
  if(watchdog!==null)window.clearTimeout(watchdog)
 }
 const done=result=>{
  if(stopped)return
  stopped=true
  clear()
  utterance.onstart=null;utterance.onend=null;utterance.onerror=null
  if(result==='error'&&(speech.speaking||speech.pending))speech.cancel()
  onFinish(result)
 }
 utterance.onstart=()=>{
  if(stopped)return
  started=true
  clear()
  onStart()
 }
 utterance.onend=()=>done('ended')
 utterance.onerror=()=>done('error')
 try{
  // iPhone WebKit can silently discard a new utterance if cancel() is called
  // immediately before speak() while the synthesizer was already idle.
  if(speech.speaking||speech.pending)speech.cancel()
  speech.speak(utterance)
  if(speech.paused)speech.resume()
  nudge=window.setTimeout(()=>{if(!started&&!stopped&&speech.paused)speech.resume()},1200)
  watchdog=window.setTimeout(()=>{if(!started)done('error')},5000)
 }catch{done('error')}
 return ()=>{
  if(stopped)return
  stopped=true
  clear()
  utterance.onstart=null;utterance.onend=null;utterance.onerror=null
  if(speech.speaking||speech.pending)speech.cancel()
 }
}

/** One explicit user tap triggers one greeting; never autoplay or send chat text.
 * @param {string} personaId
 * @param {'en'|'ru'|'es'} locale
 * @param {(isPlaying:boolean,phase?:string)=>void} [onPlaying]
 */
export function playAliPersonaAudio(personaId,locale,onPlaying=()=>{}){
 stopAliPersonaAudio()
 if(typeof window==='undefined')return ()=>{}
 const persona=getAliPersona(personaId)
 let active=true,timer=null,stopDevice=()=>{},audio=null
 let session=null
 const clear=()=>{if(timer!==null){window.clearTimeout(timer);timer=null}}
 const finish=result=>{
  if(!active)return
  active=false;clear()
  if(current===session)current=null
  onPlaying(false,result)
 }
 const stop=()=>{
  if(!active)return
  active=false;clear()
  if(audio){audio.onplaying=null;audio.onended=null;audio.onerror=null;audio.pause();audio.removeAttribute('src')}
  stopDevice()
  if(current===session)current=null
  onPlaying(false,'stopped')
 }
 session={stop}
 current=session
 onPlaying(true,'loading')
 const startDevice=()=>{
  if(!active)return
  stopDevice=deviceSpeech(persona,locale,
   ()=>{if(active)onPlaying(true,'playing')},finish)
 }
 const hasDevice=Boolean(window.speechSynthesis&&window.SpeechSynthesisUtterance)
 const isIos=/iPad|iPhone|iPod/.test(window.navigator?.userAgent||'')||
  (window.navigator?.platform==='MacIntel'&&window.navigator?.maxTouchPoints>1)
 // iOS SpeechSynthesis can claim "started" while producing no sound.
 // Even after a HEAD failure, ALWAYS attempt native media on iPhone so a
 // later recovered cloud greeting can play from the user's next tap.
 if(naturalStatus==='unavailable'&&hasDevice&&!isIos){
  startDevice()
  return ()=>{if(current===session)stopAliPersonaAudio()}
 }
 const fallback=()=>{
  if(!active)return
  // Transient errors must never permanently switch every subsequent Listen
  // to a potentially silent device voice. Retry the cloud source on next tap.
  naturalStatus='unknown'
  clear()
  if(audio){audio.onplaying=null;audio.onended=null;audio.onerror=null;audio.pause();audio.removeAttribute('src')}
  // After the original iPhone gesture has expired, speechSynthesis can be
  // silently blocked. Show retry instead of a false "playing" state.
  if(hasDevice&&!isIos)startDevice()
  else finish('error')
 }
 // Native HTMLAudioElement respects an iOS user gesture and plays through
 // iPhone's media audio route, unlike the sometimes silent Web Speech API.
 try{audio=new Audio()}catch{fallback();return ()=>{if(current===session)stopAliPersonaAudio()}}
 audio.preload='auto'
 audio.autoplay=false
 audio.muted=false
 audio.volume=1
 audio.onplaying=()=>{if(!active)return;clear();onPlaying(true,'playing')}
 audio.onended=()=>finish('ended')
 audio.onerror=fallback
 audio.src='/api/ali/voice/'+encodeURIComponent(locale)+'/'+encodeURIComponent(persona.id)
 timer=window.setTimeout(fallback,24000)
 try{
  const attempt=audio.play()
  if(attempt&&typeof attempt.catch==='function')void attempt.catch(fallback)
 }catch{fallback()}
 return ()=>{if(current===session)stopAliPersonaAudio()}
}
