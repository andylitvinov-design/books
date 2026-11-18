'use client'
import {aliPersonaGreeting,getAliPersona} from '@/lib/holistic-support/ali-personas.mjs'

// Natural voice uses the already-licensed public My Coach greeting backend.
// Preflight is a cached HEAD with no synthesis charge. If disabled, local
// speech starts in the SAME tap handler (iOS/Safari gesture requirement).
let current=null
let naturalStatus='unknown'
let inFlight=null
export function prepareAliNaturalVoice(){
 if(inFlight)return inFlight
 inFlight=fetch('/api/ali/voice/en/alex',{method:'HEAD',credentials:'same-origin'})
  .then(r=>{naturalStatus=r.ok?'available':'unavailable';return naturalStatus==='available'})
  .catch(()=>{naturalStatus='unavailable';return false})
 return inFlight
}
export function stopAliPersonaAudio(){
 if(!current)return
 const item=current;current=null
 item.stop()
}
function deviceSpeech(persona,locale,finish){
 const speech=window.speechSynthesis
 if(!speech||!window.SpeechSynthesisUtterance){finish(false);return ()=>{}}
 speech.cancel()
 const utterance=new window.SpeechSynthesisUtterance(aliPersonaGreeting(persona.id,locale))
 utterance.lang={en:'en-US',ru:'ru-RU',es:'es-ES'}[locale]||'en-US'
 utterance.rate=persona.voice.rate
 utterance.pitch=persona.voice.pitch
 const voices=speech.getVoices().filter(v=>v.lang?.toLowerCase().startsWith(locale.toLowerCase()))
  .sort((a,b)=>a.name.localeCompare(b.name))
 if(voices.length)utterance.voice=voices[persona.voice.slot%voices.length]
 utterance.onend=()=>finish(true)
 utterance.onerror=()=>finish(false)
 speech.speak(utterance)
 return ()=>{utterance.onend=null;utterance.onerror=null;speech.cancel()}
}
export function playAliPersonaAudio(personaId,locale,onPlaying=()=>{}){
 stopAliPersonaAudio()
 const persona=getAliPersona(personaId)
 if(typeof window==='undefined')return ()=>{}
 let active=true,stopDevice=()=>{},timeout=null,usingDevice=false
 const audio=new Audio()
 audio.preload='none'
 const finish=()=>{if(!active)return;active=false;if(timeout)window.clearTimeout(timeout);onPlaying(false);
  if(current?.audio===audio)current=null}
 const fallback=()=>{
  if(!active||usingDevice)return
  usingDevice=true
  // A transient natural provider error falls back on this device until next visit.
  naturalStatus='unavailable'
  audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load()
  if(timeout)window.clearTimeout(timeout)
  stopDevice=deviceSpeech(persona,locale,finish)
 }
 audio.onended=finish
 audio.onerror=fallback
 current={audio,stop:()=>{active=false;if(timeout)window.clearTimeout(timeout);
  audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load();stopDevice();onPlaying(false)}}
 onPlaying(true)
 if(naturalStatus!=='available'){fallback();return ()=>{if(current?.audio===audio)stopAliPersonaAudio()}}
 audio.src='/api/ali/voice/'+encodeURIComponent(locale)+'/'+persona.id
 // Request starts only after user Play. A slow natural voice never hangs the UI.
 timeout=window.setTimeout(fallback,4500)
 void audio.play().catch(fallback)
 return ()=>{if(current?.audio===audio)stopAliPersonaAudio()}
}
