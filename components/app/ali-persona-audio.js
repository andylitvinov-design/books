'use client'
import {aliPersonaGreeting,getAliPersona} from '@/lib/holistic-support/ali-personas.mjs'

// The cloud endpoint serves only fixed editorial greetings and retains its
// existing rate/cost caps. A HEAD never synthesizes paid audio.
let current=null
const voiceUrl=(personaId,locale)=>'/api/ali/voice/'+encodeURIComponent(locale)+'/'+encodeURIComponent(getAliPersona(personaId).id)

// Readiness is advisory. Never cache a failure or delay a real Play gesture.
/** @param {string} personaId @param {'en'|'ru'|'es'} locale */
export async function prepareAliNaturalVoice(personaId,locale){
 if(typeof window==='undefined')return false
 const url=voiceUrl(personaId,locale)
 for(let attempt=0;attempt<2;attempt++){
  const controller=new AbortController()
  const timeout=window.setTimeout(()=>controller.abort(),4000)
  try{
   const response=await fetch(url,{method:'HEAD',credentials:'same-origin',cache:'no-store',signal:controller.signal})
   if(response.ok)return true
  }catch{/* A transient failure must not poison the next Play. */}
  finally{window.clearTimeout(timeout)}
 }
 return false
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
 const voices=(speech.getVoices?.()||[]).filter(voice=>voice.lang?.toLowerCase().replace('_','-').startsWith(locale))
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
 void prepareAliNaturalVoice(persona.id,locale)
 let active=true,timer=null,stopDevice=()=>{},audio=null,attemptId=0,started=false,retries=0
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
 const releaseAudio=()=>{
  clear()
  if(!audio)return
  audio.onplaying=null;audio.onended=null;audio.onerror=null
  try{audio.pause();audio.removeAttribute('src');audio.load?.()}catch{}
 }
 const fallback=()=>{
  if(!active)return
  attemptId++
  releaseAudio()
  // Retry only before audible start, avoiding duplicate greetings.
  if(started){finish('error');return}
  if(retries===0&&audio){retries++;startAudio();return}
  // iOS is eligible too; if speech fails, the watchdog exposes Retry.
  if(hasDevice)startDevice()
  else finish('error')
 }
 const startAudio=()=>{
  const id=++attemptId
  const fail=()=>{if(active&&id===attemptId)fallback()}
  audio.onplaying=()=>{if(!active||id!==attemptId)return;started=true;clear();onPlaying(true,'playing')}
  audio.onended=()=>{if(active&&id===attemptId)finish('ended')}
  audio.onerror=fail
  audio.src=voiceUrl(persona.id,locale)
  timer=window.setTimeout(fail,24000)
  try{
   const attempt=audio.play()
   if(attempt&&typeof attempt.catch==='function')void attempt.catch(fail)
  }catch{fail()}
 }
 // Never await HEAD before native media Play; iOS needs user activation.
 try{
  audio=new window.Audio()
  audio.preload='auto'
  audio.autoplay=false
  audio.playsInline=true
  audio.muted=false
  audio.volume=1
  startAudio()
 }catch{fallback()}
 return ()=>{if(current===session)stopAliPersonaAudio()}
}
