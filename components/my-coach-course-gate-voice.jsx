'use client'
import {useEffect,useRef,useState} from 'react'
import {courseGateVoiceDecision,courseGateVoiceNext} from '@/lib/coaching/coach-course-gate-voice.mjs'
const copy={
 ru:{continuous:'Непрерывный голосовой режим',interrupt:'Перебить / остановить',paused:'Голосовой режим остановлен. Можно ответить текстом или продолжить голосом.',saving:'Сохраняю ответ…',listen:'Прослушать вопрос',answer:'Ответить голосом',stop:'Остановить',privacy:'Непрерывный режим запускается только по нажатию: каждый вопрос озвучивается перед диктовкой. Браузер может передать звук своему сервису распознавания. Мы не записываем аудио. Озвучивание — локальным голосом устройства.',review:'Проверьте распознанный текст перед отправкой.',unsupported:'Голосовой ввод недоступен. Используйте диктовку клавиатуры или текст.',noVoice:'Локальный голос недоступен. Вопрос можно прочитать.',listening:'Слушаю…',speaking:'Озвучиваю вопрос…'},
 en:{continuous:'Continuous voice mode',interrupt:'Interrupt / stop',paused:'Voice paused. Type your reply or restart voice.',saving:'Saving your answer…',listen:'Hear the question',answer:'Answer by voice',stop:'Stop',privacy:'Continuous mode starts only when you tap: each question is read before dictation. Your browser may send audio to its recognition service. We do not record audio. Playback uses a local device voice.',review:'Review the recognized text before sending.',unsupported:'Voice input is unavailable. Use keyboard dictation or text.',noVoice:'Local speech playback is unavailable. Read the question.',listening:'Listening…',speaking:'Reading the question…'},
 es:{continuous:'Modo de voz continuo',interrupt:'Interrumpir / detener',paused:'Voz en pausa. Escribe o reinicia la voz.',saving:'Guardando tu respuesta…',listen:'Escuchar la pregunta',answer:'Responder por voz',stop:'Detener',privacy:'El modo continuo empieza solo al pulsar: se lee cada pregunta antes del dictado. El navegador puede enviar audio a su servicio de reconocimiento. No grabamos audio. La voz es local del dispositivo.',review:'Revisa el texto reconocido antes de enviarlo.',unsupported:'La entrada de voz no está disponible. Usa el dictado del teclado o texto.',noVoice:'No hay voz local. Lee la pregunta.',listening:'Escuchando…',speaking:'Leyendo la pregunta…'}
}

export default function MyCoachCourseGateVoice({prompt,locale='en',disabled=false,waiting=false,onDraft,onSubmit}){
 const t=copy[locale]||copy.en
 const current=useRef(null),run=useRef(null),spoken=useRef(null)
 const mode=useRef(false),submitted=useRef(null),mounted=useRef(false)
 const [continuous,setContinuous]=useState(false),[status,setStatus]=useState(''),[active,setActive]=useState(false),[speaking,setSpeaking]=useState(false)
 current.current={prompt,disabled,waiting,onDraft,onSubmit,locale,t}
 function stopIO(){
  const r=run.current;run.current=null
  if(r){r.onresult=null;r.onerror=null;r.onend=null;try{r.abort()}catch{}}
  const u=spoken.current;spoken.current=null
  if(u){u.onend=null;u.onerror=null;try{window.speechSynthesis?.cancel()}catch{}}
 }
 function halt(message=''){
  mode.current=false;stopIO()
  if(mounted.current){setContinuous(false);setActive(false);setSpeaking(false);setStatus(message)}
 }
 function eligible(id){
  const p=current.current
  return mounted.current&&p?.prompt?.id===id&&!p.disabled&&!p.waiting&&document.visibilityState!=='hidden'
 }
 function hear(auto=false){
  const p=current.current,id=p?.prompt?.id
  if(!id||!eligible(id)||run.current||spoken.current)return
  const synth=window.speechSynthesis,Utterance=window.SpeechSynthesisUtterance
  const voice=(synth?.getVoices?.()||[]).find(v=>v.localService===true&&String(v.lang).toLowerCase().startsWith(p.locale))
  if(!voice||!Utterance||!synth?.speak){halt(p.t.noVoice);return}
  const u=new Utterance(p.prompt.text);u.voice=voice;u.lang=voice.lang;u.rate=0.94
  spoken.current=u;setSpeaking(true);setStatus(p.t.speaking)
  const done=failed=>{
   if(spoken.current!==u)return
   spoken.current=null;setSpeaking(false)
   if(failed){halt(p.t.noVoice);return}
   setStatus('')
   if(auto&&mode.current&&eligible(id))listen(true,id,true)
  }
  u.onend=()=>done(false);u.onerror=()=>done(true)
  try{synth.speak(u)}catch{done(true)}
 }
 function listen(auto=false,id=current.current?.prompt?.id,playbackCompleted=false){
  const p=current.current
  if(!id||!eligible(id)||run.current||spoken.current)return
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition
  if(!Recognition){halt(p.t.unsupported);return}
  let r
  try{r=new Recognition()}catch{halt(p.t.unsupported);return}
  r.lang={ru:'ru-RU',en:'en-US',es:'es-ES'}[p.locale]||'en-US'
  r.continuous=false;r.interimResults=false;r.maxAlternatives=1
  let final=false,failed=false,phrase='',confidence=1
  run.current=r;setActive(true);setStatus(p.t.listening)
  r.onresult=event=>{
   if(run.current!==r)return
   const rows=Array.from(event.results||[])
   if(!rows.length||rows.some(x=>!x.isFinal||!x[0])){final=false;return}
   final=true;phrase=rows.map(x=>x[0].transcript).join(' ').trim()
   confidence=Math.min(...rows.map(x=>typeof x[0].confidence==='number'?x[0].confidence:0))
  }
  r.onerror=()=>{if(run.current===r){failed=true;setStatus(p.t.unsupported)}}
  r.onend=()=>{
   if(run.current!==r)return
   run.current=null;setActive(false)
   const latest=current.current
   if(!eligible(id)||(auto&&!mode.current))return
   const result=courseGateVoiceDecision({promptId:id,currentPromptId:latest.prompt.id,final,text:phrase,confidence,failed,
    spokenPrompt:p.prompt.text,continuous:auto,playbackCompleted})
   if(result.action==='ignore'){halt(failed?p.t.unsupported:p.t.review);return}
   if(result.action==='review'){halt(p.t.review);latest.onDraft?.(result.text);return}
   submitted.current=id;setStatus(p.t.saving)
   const failedSave=()=>{
    if(!mounted.current||current.current?.prompt?.id!==id)return
    halt(p.t.review);current.current.onDraft?.(result.text)
   }
   Promise.resolve().then(()=>latest.onSubmit?.(id,result.text)).then(ok=>{if(ok!==true)failedSave()}).catch(failedSave)
  }
  try{r.start()}catch{halt(p.t.unsupported)}
 }
 useEffect(()=>{
  mounted.current=true
  const hidden=()=>{if(document.visibilityState==='hidden')halt(current.current.t.paused)}
  document.addEventListener('visibilitychange',hidden)
  return ()=>{mounted.current=false;mode.current=false;stopIO();document.removeEventListener('visibilitychange',hidden)}
 },[])
 useEffect(()=>{
  stopIO();setActive(false);setSpeaking(false)
  if(disabled){halt();return}
  if(waiting){setStatus(t.saving);return}
  setStatus('')
  if(courseGateVoiceNext({enabled:mode.current,waiting,blocked:disabled,promptId:prompt?.id,submittedPromptId:submitted.current}))hear(true)
  return stopIO
 },[prompt?.id,locale,waiting,disabled])
 function startContinuous(){
  if(disabled||waiting||!prompt||active||speaking)return
  submitted.current=null;mode.current=true;setContinuous(true);hear(true)
 }
 const blocked=disabled||waiting
 return <div data-coach-course-gate-voice data-continuous={continuous?'true':undefined}>
  <small>{t.privacy}</small>
  <div>
   {!continuous&&<button type="button" disabled={blocked||active||speaking} onClick={startContinuous}>{t.continuous}</button>}
   <button type="button" disabled={blocked||continuous||active||speaking} onClick={()=>hear(false)}>{t.listen}</button>
   <button type="button" disabled={blocked||continuous||active||speaking} onClick={()=>listen(false)}>{t.answer}</button>
   {(continuous||active||speaking)&&<button type="button" onClick={()=>halt(t.paused)}>{t.interrupt}</button>}
  </div>
  {status&&<p role="status">{status}</p>}
 </div>
}
