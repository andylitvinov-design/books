'use client';
import {useEffect,useRef,useState} from 'react';
import styles from './command-center-voice-button.module.css';

// Browser speech only, started by an explicit tap. If unsupported, use the
// device keyboard's dictation. We never upload audio to Holistic House.
const copy={
 ru:{start:'Надиктовать задачу',stop:'Остановить запись',fallback:'Диктовка доступна с клавиатуры телефона',disclosure:'Распознавание может использовать службу браузера. Нажмите для начала.',error:'Распознавание недоступно. Используйте диктовку клавиатуры.'},
 en:{start:'Dictate task',stop:'Stop dictation',fallback:'Use your phone keyboard to dictate',disclosure:'Recognition may use your browser’s speech service. Tap to start.',error:'Speech recognition unavailable. Use keyboard dictation.'},
 es:{start:'Dictar tarea',stop:'Detener dictado',fallback:'Usa el dictado del teclado',disclosure:'El reconocimiento puede utilizar el servicio de voz del navegador. Toca para empezar.',error:'Reconocimiento no disponible. Usa el dictado del teclado.'}
};
export default function CommandCenterVoiceButton({lang='ru',onTranscript}){
 const t=copy[lang]||copy.ru;
 const [supported,setSupported]=useState(false),[active,setActive]=useState(false),[failed,setFailed]=useState(false);
 const instance=useRef(null);
 useEffect(()=>{
   setSupported(Boolean(window.SpeechRecognition||window.webkitSpeechRecognition));
   return()=>{
     const recognition=instance.current;
     instance.current=null;
     if(recognition){
       recognition.onresult=null;recognition.onerror=null;recognition.onend=null;
       try{recognition.abort();}catch{/* browser-specific teardown */ }
     }
   };
 },[]);
 function toggle(){
   if(instance.current){
     try{instance.current.stop();}catch{/* may have ended */ }
     return;
   }
   const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
   if(!Speech)return;
   try{
     setFailed(false);
     const recognition=new Speech();
     instance.current=recognition;
     recognition.lang=lang==='en'?'en-US':lang==='es'?'es-ES':'ru-RU';
     recognition.continuous=false;
     recognition.interimResults=false;
     recognition.maxAlternatives=1;
     recognition.onresult=event=>{
       const transcript=Array.from(event.results||[])
         .filter(result=>result.isFinal!==false)
         .map(result=>result[0]?.transcript||'').join(' ').trim();
       if(transcript)onTranscript(transcript);
     };
     recognition.onerror=()=>{setFailed(true);setActive(false);instance.current=null;};
     recognition.onend=()=>{setActive(false);instance.current=null;};
     recognition.start();
     setActive(true);
   }catch{instance.current=null;setActive(false);setFailed(true);}
 }
 return <div className={styles.voiceRow}>
   {supported?<button type="button" className={styles.voiceButton} aria-pressed={active}
      onClick={toggle} title={t.disclosure}>{active?'■ '+t.stop:'◉ '+t.start}</button>:
      <span>{t.fallback}</span>}
   <small>{failed?t.error:t.disclosure}</small>
 </div>;
}
