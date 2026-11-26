'use client'
import {useEffect,useRef,useState} from 'react'
import {courseGateVoiceDecision} from '@/lib/coaching/coach-course-gate-voice.mjs'
const copy={
 ru:{listen:'Прослушать вопрос',answer:'Ответить голосом',stop:'Остановить',privacy:'Диктовка запускается только по нажатию. Браузер может передать звук своему сервису распознавания. Мы не записываем аудио. Озвучивание — локальным голосом устройства.',review:'Проверьте распознанный текст перед отправкой.',unsupported:'Голосовой ввод недоступен. Используйте диктовку клавиатуры или текст.',noVoice:'Локальный голос недоступен. Вопрос можно прочитать.',listening:'Слушаю…',speaking:'Озвучиваю вопрос…'},
 en:{listen:'Hear the question',answer:'Answer by voice',stop:'Stop',privacy:'Dictation starts only when you tap. Your browser may send audio to its recognition service. We do not record audio. Playback uses a local device voice.',review:'Review the recognized text before sending.',unsupported:'Voice input is unavailable. Use keyboard dictation or text.',noVoice:'Local speech playback is unavailable. Read the question.',listening:'Listening…',speaking:'Reading the question…'},
 es:{listen:'Escuchar la pregunta',answer:'Responder por voz',stop:'Detener',privacy:'El dictado empieza solo al pulsar. El navegador puede enviar audio a su servicio de reconocimiento. No grabamos audio. La voz es local del dispositivo.',review:'Revisa el texto reconocido antes de enviarlo.',unsupported:'La entrada de voz no está disponible. Usa el dictado del teclado o texto.',noVoice:'No hay voz local. Lee la pregunta.',listening:'Escuchando…',speaking:'Leyendo la pregunta…'}
}
export default function MyCoachCourseGateVoice({prompt,locale='en',disabled=false,onDraft,onSubmit}){
 const t=copy[locale]||copy.en
 const current=useRef(null),run=useRef(null),spoken=useRef(null)
 const [status,setStatus]=useState(''),[active,setActive]=useState(false),[speaking,setSpeaking]=useState(false)
 current.current={prompt,disabled,onDraft,onSubmit}
 function stop(){
  const r=run.current;run.current=null
  if(r){r.onresult=null;r.onerror=null;r.onend=null;try{r.abort()}catch{}}
  const u=spoken.current;spoken.current=null
  if(u){u.onend=null;u.onerror=null;try{window.speechSynthesis?.cancel()}catch{}}
 }
 useEffect(()=>{setActive(false);setSpeaking(false);setStatus('');return stop},[prompt?.id])
 useEffect(()=>{if(disabled){stop();setActive(false);setSpeaking(false)}},[disabled])
 function hear(){
  if(disabled||active||speaking||!prompt)return
  const synth=window.speechSynthesis,Utterance=window.SpeechSynthesisUtterance
  const voice=(synth?.getVoices?.()||[]).find(v=>v.localService===true&&String(v.lang).toLowerCase().startsWith(locale))
  if(!voice||!Utterance){setStatus(t.noVoice);return}
  const u=new Utterance(prompt.text);u.voice=voice;u.lang=voice.lang;u.rate=0.94
  spoken.current=u;setSpeaking(true);setStatus(t.speaking)
  const done=failed=>{if(spoken.current!==u)return;spoken.current=null;setSpeaking(false);setStatus(failed?t.noVoice:'')}
  u.onend=()=>done(false);u.onerror=()=>done(true)
  try{synth.speak(u)}catch{done(true)}
 }
 function listen(){
  if(disabled||active||speaking||!prompt)return
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition
  if(!Recognition){setStatus(t.unsupported);return}
  const r=new Recognition(),id=prompt.id
  r.lang={ru:'ru-RU',en:'en-US',es:'es-ES'}[locale]||'en-US'
  r.continuous=false;r.interimResults=false;r.maxAlternatives=1
  let final=false,failed=false,phrase='',confidence=1
  run.current=r;setActive(true);setStatus(t.listening)
  r.onresult=event=>{
   if(run.current!==r)return
   const rows=Array.from(event.results||[])
   if(!rows.length||rows.some(x=>!x.isFinal||!x[0])){final=false;return}
   final=true;phrase=rows.map(x=>x[0].transcript).join(' ').trim()
   confidence=Math.min(...rows.map(x=>typeof x[0].confidence==='number'?x[0].confidence:0))
  }
  r.onerror=()=>{if(run.current===r){failed=true;setStatus(t.unsupported)}}
  r.onend=()=>{
   if(run.current!==r)return
   run.current=null;setActive(false)
   const p=current.current
   if(p?.disabled)return
   const result=courseGateVoiceDecision({promptId:id,currentPromptId:p?.prompt?.id,final,text:phrase,confidence,failed})
   if(result.action==='ignore'){setStatus(t.review);return}
   p.onDraft?.(result.text)
   if(result.action==='submit'){setStatus('');p.onSubmit?.(id,result.text)}
   else setStatus(t.review)
  }
  try{r.start()}catch{stop();setActive(false);setStatus(t.unsupported)}
 }
 return <div data-coach-course-gate-voice>
  <small>{t.privacy}</small>
  <div>
   <button type="button" disabled={disabled||active||speaking} onClick={hear}>{t.listen}</button>
   <button type="button" disabled={disabled||active||speaking} onClick={listen}>{t.answer}</button>
   {(active||speaking)&&<button type="button" onClick={()=>{stop();setActive(false);setSpeaking(false);setStatus('')}}>{t.stop}</button>}
  </div>
  {status&&<p role="status">{status}</p>}
 </div>
}
