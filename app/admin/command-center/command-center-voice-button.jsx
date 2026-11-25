'use client';
import {useEffect,useRef,useState} from 'react';
import styles from './command-center-voice-button.module.css';

// Explicit browser STT only. Audio is never uploaded by Holistic House;
// browsers MAY transmit speech to their own provider. No claim of local Whisper.
const copy={
 ru:{start:'Надиктовать задачу',stop:'Остановить запись',fallback:'Диктовка доступна с клавиатуры телефона',disclosure:'Распознавание может использовать службу браузера. Нажмите для начала.',error:'Распознавание недоступно или остановлено. Используйте диктовку клавиатуры.'},
 en:{start:'Dictate task',stop:'Stop dictation',fallback:'Use your phone keyboard to dictate',disclosure:'Recognition may use your browser’s speech service. Tap to start.',error:'Speech recognition unavailable or stopped. Use keyboard dictation.'},
 es:{start:'Dictar tarea',stop:'Detener dictado',fallback:'Usa el dictado del teclado',disclosure:'El reconocimiento puede utilizar el servicio de voz del navegador. Toca para empezar.',error:'Reconocimiento no disponible o detenido. Usa el dictado del teclado.'}
};
export default function CommandCenterVoiceButton({lang='ru',onTranscript}){
 const t=copy[lang]||copy.ru;
 const [supported,setSupported]=useState(false),[active,setActive]=useState(false),[failed,setFailed]=useState(false);
 const instance=useRef(null),timeout=useRef(null);
 function clearRecognition(abort=false){
  const recognition=instance.current;instance.current=null;
  if(timeout.current!==null){clearTimeout(timeout.current);timeout.current=null;}
  if(recognition){
   recognition.onresult=null;recognition.onerror=null;recognition.onend=null;
   if(abort){try{recognition.abort();}catch{/* browser-specific teardown */}}
  }
  setActive(false);
 }
 useEffect(()=>{
  setSupported(Boolean(window.SpeechRecognition||window.webkitSpeechRecognition));
  const hidden=()=>{if(document.hidden)clearRecognition(true);};
  const leave=()=>clearRecognition(true);
  document.addEventListener('visibilitychange',hidden);
  window.addEventListener('pagehide',leave);
  return()=>{document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',leave);clearRecognition(true);};
 },[]);
 function toggle(){
  if(instance.current){try{instance.current.stop();}catch{clearRecognition(true);}return;}
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech)return;
  try{
   setFailed(false);
   const recognition=new Speech();instance.current=recognition;
   recognition.lang=lang==='en'?'en-US':lang==='es'?'es-ES':'ru-RU';
   recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=1;
   recognition.onresult=event=>{
    if(instance.current!==recognition)return;
    const transcript=Array.from(event.results||[])
      .filter(result=>result.isFinal!==false).map(result=>result[0]?.transcript||'').join(' ').trim();
    if(transcript)onTranscript(transcript);
   };
   recognition.onerror=()=>{setFailed(true);clearRecognition(true);};
   recognition.onend=()=>clearRecognition(false);
   recognition.start();setActive(true);
   timeout.current=setTimeout(()=>{if(instance.current===recognition){setFailed(true);clearRecognition(true);}},45000);
  }catch{clearRecognition(true);setFailed(true);}
 }
 return <div className={styles.voiceRow}>
  {supported?<button type="button" className={styles.voiceButton} aria-pressed={active}
   onClick={toggle} title={t.disclosure}>{active?'■ '+t.stop:'◉ '+t.start}</button>:
   <span>{t.fallback}</span>}
  <small>{failed?t.error:t.disclosure}</small>
 </div>;
}
