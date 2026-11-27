"use client";

import {useEffect,useId,useRef,useState} from "react";
import {Mic,Pause,Phone,PhoneOff,Volume2} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import type {VoiceCompanion} from "./voice-companion-controls";
import {aliOwnerAudioAvailable} from "@/lib/voice-companion/ali-owner-audio.mjs";
import styles from "./ali-audio-call.module.css";

const copy={
 ru:{title:"Аудиозвонок",free:"Бесплатно · в пределах квот",start:"Начать звонок",resume:"Продолжить звонок",end:"Завершить",pause:"Пауза",interrupt:"Перебить",speaking:"Говорит…",listening:"Слушаю вас…",thinking:"Готовлю ответ…",connecting:"Подключаю аудио…",paused:"Звонок на паузе",ready:"Готов к звонку",unavailable:"Аудио недоступно на этом устройстве. Продолжите в чате.",hint:"Говорите обычным голосом. После ответа микрофон включится автоматически.",recorded:"Короткие реплики обрабатывает Groq Whisper Free. Записи на сайте не сохраняются.",browser:"Распознавание речи может выполняться поставщиком браузера.",privacy:"Голос устройства может использовать облако производителя. Не сообщайте конфиденциальные медицинские или психологические данные.",text:"Вернуться в чат"},
 en:{title:"Audio call",free:"Free · subject to limits",start:"Start call",resume:"Resume call",end:"End call",pause:"Pause",interrupt:"Interrupt",speaking:"Speaking…",listening:"Listening to you…",thinking:"Preparing a reply…",connecting:"Connecting audio…",paused:"Call paused",ready:"Ready to call",unavailable:"Audio is unavailable on this device. Continue in chat.",hint:"Speak normally. The microphone will listen again after each reply.",recorded:"Short speech clips are processed by Groq Whisper Free. The site does not retain audio recordings.",browser:"Your browser provider may process speech recognition.",privacy:"Device speech may use its manufacturer's cloud. Do not share private medical or therapy information.",text:"Return to chat"},
 es:{title:"Llamada de audio",free:"Gratis · sujeto a límites",start:"Iniciar llamada",resume:"Reanudar llamada",end:"Terminar",pause:"Pausa",interrupt:"Interrumpir",speaking:"Hablando…",listening:"Te escucho…",thinking:"Preparando respuesta…",connecting:"Conectando audio…",paused:"Llamada en pausa",ready:"Listo para llamar",unavailable:"El audio no está disponible en este dispositivo. Continúa en el chat.",hint:"Habla con naturalidad. El micrófono volverá a escuchar después de cada respuesta.",recorded:"Groq Whisper Free procesa frases breves. El sitio no guarda grabaciones.",browser:"El proveedor del navegador puede procesar el reconocimiento de voz.",privacy:"La voz del dispositivo puede utilizar la nube del fabricante. No compartas información médica o psicológica privada.",text:"Volver al chat"},
} as const;

type Props={locale:PublicLocale;name:string;image:string;voice:VoiceCompanion;
 ready:boolean;busy:boolean;recorded:boolean;notice?:string;onStart:()=>void;onEnd:()=>void;ownerTestEligible?:boolean;onOwnerStart?:()=>void};

export default function AliAudioCall({locale,name,image,voice,ready,busy,recorded,notice,onStart,onEnd,ownerTestEligible=false,onOwnerStart}:Props){
 const t=copy[locale];
 const dialog=useRef<HTMLDialogElement|null>(null);
 const titleId=useId();
 const [seconds,setSeconds]=useState(0);
 const [ownerReady,setOwnerReady]=useState(false);
 useEffect(()=>{
  setOwnerReady(false);
  if(!ownerTestEligible||voice.conversing||voice.paused)return;
  const ac=new AbortController();
  void aliOwnerAudioAvailable(window,ac.signal).then(ok=>{if(!ac.signal.aborted)setOwnerReady(ok)});
  return()=>ac.abort();
 },[ownerTestEligible,voice.conversing,voice.paused]);
 useEffect(()=>{
  const element=dialog.current;
  if(!element)return;
  // Native modal makes the message composer and video controls inert.
  if(!element.open){try{element.showModal();}catch{element.setAttribute("open","");}}
  return()=>{if(element.open)element.close();};
 },[]);
 useEffect(()=>{
  if(!voice.conversing)return;
  const started=Date.now();
  let counted=0;
  const id=window.setInterval(()=>{
   const elapsed=Math.floor((Date.now()-started)/1000);
   if(elapsed>counted){const delta=elapsed-counted;counted=elapsed;setSeconds(value=>value+delta);}
  },250);
  return()=>window.clearInterval(id);
 },[voice.conversing]);
 const clock=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
 const phase=voice.paused?"paused":!voice.conversing?"idle":voice.speaking?"speaking":voice.recording?"listening":busy?"thinking":"connecting";
 const status=voice.notice||notice||(phase==="idle"&&!ready?t.unavailable:t[phase==="idle"?"ready":phase]);
 return <dialog ref={dialog} className={styles.call} data-hh-ali-audio-call data-call-phase={phase}
  aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onEnd();}}>
  <div className={styles.content}>
   <header className={styles.header}>
    <span id={titleId}>{t.title}</span><small>{t.free}</small>
   </header>
   <div className={styles.identity}>
    <div className={styles.portrait} data-speaking={voice.speaking||undefined} data-listening={voice.recording||undefined}>
     <img src={image} alt="" width={176} height={176}/>
    </div>
    <h2>{name}</h2>
    <span className={styles.clock} aria-label={clock}>{clock}</span>
    <p className={styles.status} role="status" aria-live="polite" data-hh-ai-voice-status>
     {voice.speaking?<Volume2 size={20} aria-hidden="true"/>:voice.recording?<Mic size={20} aria-hidden="true"/>:null}
     {status}
    </p>
    {voice.conversing&&!voice.notice&&<p className={styles.hint}>{t.hint}</p>}
    {voice.conversing&&voice.phoneReplayAvailable&&!busy&&<button type="button" data-hh-ali-replay-audio onClick={voice.replayPhoneReply}
      style={{marginTop:12,border:'1px solid currentColor',borderRadius:18,padding:'10px 18px',color:'inherit',background:'transparent'}}>
      {voice.ownerAudioActive()?(locale==='ru'?'Повторить голосом устройства':locale==='es'?'Repetir con voz del dispositivo':'Replay with device voice'):(locale==='ru'?'Повторить звук':locale==='es'?'Repetir audio':'Replay audio')}</button>}
   </div>
   {!voice.conversing&&!voice.paused&&<div className={styles.disclosure} data-hh-ai-voice-disclosure>
    <p>{recorded?t.recorded:t.browser}</p><p>{t.privacy}</p>
    {ownerReady&&ownerTestEligible&&onOwnerStart&&<div data-hh-ali-owner-audio-test>
     <p>{locale==='ru'?'Тест владельца: разрешаю отправить текст ответов в бесплатный Gemini TTS (возможно использование для обучения). Только новая беседа без личных, медицинских данных и истории клиентов.':locale==='es'?'Prueba del propietario: autorizo enviar respuestas a Gemini TTS gratis (posible entrenamiento). Solo conversación nueva sin datos personales, médicos ni historial de clientes.':'Owner test: I allow reply text to free Gemini TTS (possible training use). New non-sensitive conversation only; no personal, health or customer history data.'}</p>
     <button type="button" data-hh-ali-owner-audio-start disabled={!ready||busy} onClick={onOwnerStart} style={{border:'1px solid currentColor',padding:'10px 14px',borderRadius:14,background:'transparent',color:'inherit'}}>{locale==='ru'?'Согласен · тест настоящего аудио':locale==='es'?'Acepto · probar audio real':'Agree · test natural audio'}</button>
    </div>}
   </div>}
   <div className={styles.controls}>
    {voice.conversing?<><button type="button" data-hh-ai-pause-voice onClick={voice.pauseDialogue}><Pause aria-hidden="true"/>{t.pause}</button>
     {voice.speaking&&<button type="button" data-hh-ai-interrupt-voice onClick={voice.interruptReply}><Mic aria-hidden="true"/>{t.interrupt}</button>}</>:
     <button type="button" className={styles.start} data-hh-ai-start-voice data-hh-ai-resume-voice={voice.paused||undefined}
      disabled={!ready||busy} onClick={onStart}><Phone aria-hidden="true"/>{voice.paused?t.resume:t.start}</button>}
    <button type="button" className={styles.end} data-hh-ai-stop-voice onClick={onEnd}><PhoneOff aria-hidden="true"/>{voice.conversing||voice.paused?t.end:t.text}</button>
   </div>
  </div>
 </dialog>;
}
