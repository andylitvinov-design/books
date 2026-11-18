'use client'
import {aliPersonaGreeting,getAliPersona} from '@/lib/holistic-support/ali-personas.mjs'

// Only fixed, public greetings are sent to the approved natural voice endpoint.
// Browser speech is an offline-capable fallback and never sends chat content.
let current=null
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
 let active=true,stopDevice=()=>{},timeout=null
 const audio=new Audio('/api/ali/voice/'+encodeURIComponent(locale)+'/'+persona.id)
 audio.preload='none'
 const finish=()=>{if(!active)return;active=false;if(timeout)window.clearTimeout(timeout);onPlaying(false);
  if(current?.audio===audio)current=null}
 const fallback=()=>{if(!active||stopDevice.started)return
  audio.pause();audio.removeAttribute('src');audio.load()
  if(timeout)window.clearTimeout(timeout)
  stopDevice=deviceSpeech(persona,locale,finish)
  stopDevice.started=true
 }
 audio.onended=finish
 audio.onerror=fallback
 current={audio,stop:()=>{active=false;if(timeout)window.clearTimeout(timeout);
  audio.pause();audio.removeAttribute('src');audio.load();stopDevice();onPlaying(false)}}
 onPlaying(true)
 // A missing provider must not leave the client waiting indefinitely.
 timeout=window.setTimeout(fallback,4500)
 void audio.play().catch(fallback)
 return ()=>{if(current?.audio===audio)stopAliPersonaAudio()}
}
