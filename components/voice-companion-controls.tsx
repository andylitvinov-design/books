"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import type {PublicLocale} from "@/lib/public-locales";
import {createDeviceSpeech,type SpeechController} from "@/lib/assistant-avatar/device-speech";
import {browserSpeechLanguage,speechSegments,chooseVoiceRoute,createRecognitionGate} from "@/lib/voice-companion/browser-voice.mjs";
import {normalizeDeviceVoiceId,normalizeSpeechRate,publicPreviewText} from "@/lib/voice-companion/voice-catalog.mjs";

type RecognitionResult={results:ArrayLike<ArrayLike<{transcript:string}>>};
type VoiceRecognition={lang:string;continuous:boolean;interimResults:boolean;
  onresult:((event:RecognitionResult)=>void)|null;onerror:((event:{error:string})=>void)|null;
  onend:(()=>void)|null;start:()=>void;abort:()=>void};
type RecognitionConstructor=new()=>VoiceRecognition;
type SpeechWindow=Window & {SpeechRecognition?:RecognitionConstructor;webkitSpeechRecognition?:RecognitionConstructor};
type MicPolicyDocument=Document & {permissionsPolicy?:{allowsFeature:(feature:string)=>boolean};
  featurePolicy?:{allowsFeature:(feature:string)=>boolean}};

type VoiceCopy={play:string;welcome:string;repeat:string;stop:string;dictate:string;
  recording:string;settings:string;playConsent:string;sttConsent:string;auto:string;
  rate:string;voice:string;language:string;none:string;unavailable:string;permission:string;
  inputUnavailable:string;captured:string;error:string};
const COPY:Record<PublicLocale,VoiceCopy>={
  ru:{play:"Прослушать",welcome:"Слушать приветствие",repeat:"Повторить ответ",stop:"Остановить",
    dictate:"Задать голосом",recording:"Слушаю…",settings:"Голос и конфиденциальность",
    playConsent:"Разрешаю озвучивание на устройстве. Системный голос браузера иногда обрабатывается облачным сервисом производителя.",
    sttConsent:"Разрешаю отдельное распознавание речи браузером (возможно, с передачей записи поставщику браузера). Не диктуйте личные медицинские или психологические сведения.",
    auto:"Автоматически читать новые ответы (после моего разрешения)",rate:"Скорость",voice:"Голос",language:"Язык речи",
    none:"Системный голос",unavailable:"На этом устройстве нет доступного синтезатора речи. Текст остаётся доступным.",
    permission:"Сначала разрешите озвучивание ниже.",inputUnavailable:"Голосовой ввод здесь недоступен. Напишите вопрос.",
    captured:"Распознано. Проверьте текст и нажмите «Отправить».",error:"Голосовая функция недоступна. Используйте текст."},
  en:{play:"Listen",welcome:"Hear welcome",repeat:"Repeat reply",stop:"Stop",
    dictate:"Ask by voice",recording:"Listening…",settings:"Voice and privacy",
    playConsent:"I allow playback on this device. My browser's system voice may sometimes use the device provider's cloud.",
    sttConsent:"I separately allow browser speech recognition, which may transmit audio to the browser vendor. Do not dictate private health or therapy details.",
    auto:"Read new replies automatically (after I opt in)",rate:"Speed",voice:"Voice",language:"Speech language",
    none:"System voice",unavailable:"Speech playback is unavailable on this device. Text remains available.",
    permission:"Enable speech playback below first.",inputUnavailable:"Speech input is unavailable here. Please type your question.",
    captured:"Recognized. Check the text and press Send.",error:"Voice is unavailable. Please use text."},
  es:{play:"Escuchar",welcome:"Escuchar bienvenida",repeat:"Repetir respuesta",stop:"Detener",
    dictate:"Preguntar por voz",recording:"Escuchando…",settings:"Voz y privacidad",
    playConsent:"Autorizo la reproducción de voz en este dispositivo. La voz del navegador puede usar la nube del fabricante.",
    sttConsent:"Autorizo por separado el reconocimiento de voz del navegador; puede enviar audio al proveedor. No dictes datos de salud o terapia privados.",
    auto:"Leer automáticamente respuestas nuevas (con mi permiso)",rate:"Velocidad",voice:"Voz",language:"Idioma de voz",
    none:"Voz del sistema",unavailable:"La lectura de voz no está disponible. El texto sigue accesible.",
    permission:"Primero autoriza la lectura abajo.",inputUnavailable:"La entrada de voz no está disponible. Escribe tu pregunta.",
    captured:"Texto reconocido. Revísalo y pulsa Enviar.",error:"La voz no está disponible. Usa el texto."},
};

export function useVoiceCompanion(locale:PublicLocale,enabled=false){
 const t=COPY[locale];
 const [supported,setSupported]=useState(false);
 const [recognitionSupported,setRecognitionSupported]=useState(false);
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
 const [playbackConsent,setPlaybackConsent]=useState(false);
 const [sttConsent,setSttConsent]=useState(false);
 const [autoRead,setAutoRead]=useState(false);
 const [voiceId,setVoiceIdState]=useState('');
 const [prefsLoaded,setPrefsLoaded]=useState(false);
 const [rate,setRate]=useState(1);
 const [speechLocale,setSpeechLocale]=useState<PublicLocale>(locale);
 const [speaking,setSpeaking]=useState(false);
 const [recording,setRecording]=useState(false);
 const [conversing,setConversing]=useState(false);
 const dialogueActive=useRef(false);
 const dialogueOnTurn=useRef<((text:string)=>void)|null>(null);
 const resumeDialogue=useRef<(()=>void)|null>(null);
 const resumeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [notice,setNotice]=useState('');
 const generation=useRef(0);
 const recognition=useRef<VoiceRecognition|null>(null);
 const speaker=useRef<SpeechController|null>(null);
 const lastSpoken=useRef('');
 const mounted=useRef(true);
 const stop=useCallback(()=>{
  if(resumeTimer.current!==null){clearTimeout(resumeTimer.current);resumeTimer.current=null;}
  generation.current++;
  // Reuse Emotional Avatar's single browser speech adapter. It only cancels
  // utterances that it actually owns, never unrelated coaching/site audio.
  speaker.current?.stop();
  recognition.current?.abort();recognition.current=null;
  if(mounted.current){setSpeaking(false);setRecording(false)}
 },[]);
 const stopDialogue=useCallback(()=>{
  dialogueActive.current=false;dialogueOnTurn.current=null;
  if(mounted.current)setConversing(false);
  stop();
 },[stop]);
 const setVoiceId=useCallback((value:string)=>{
  stopDialogue();setVoiceIdState(value);
 },[stopDialogue]);
 useEffect(()=>{
  if(!enabled)return;
  mounted.current=true;
  const controller=createDeviceSpeech(()=>window);
  speaker.current=controller;
  setSupported(controller.available());
  // Detect modern Permissions-Policy before offering a dead microphone button.
  // Unsupported policy detection stays conservative and still requires a real
  // user gesture + separate consent; Safari may have no policy introspection.
  const policyDocument=document as MicPolicyDocument;
  const micPolicy=policyDocument.permissionsPolicy||policyDocument.featurePolicy;
  let microphoneAllowed=true;
  try{if(micPolicy)microphoneAllowed=micPolicy.allowsFeature('microphone');}
  catch{microphoneAllowed=false;}
  setRecognitionSupported(microphoneAllowed&&Boolean(
    (window as SpeechWindow).SpeechRecognition||
    (window as SpeechWindow).webkitSpeechRecognition));
  const unwatch=controller.watchVoices(list=>
    setVoices(list.filter(v=>v.lang.toLowerCase().startsWith(speechLocale))));
  const hide=()=>{if(document.hidden)stopDialogue();};
  document.addEventListener('visibilitychange',hide);
  window.addEventListener('pagehide',stopDialogue);
  window.addEventListener('hh:voice-companion-stop',stopDialogue);
  return ()=>{
   mounted.current=false;stopDialogue();unwatch();controller.destroy();
   if(speaker.current===controller)speaker.current=null;
   document.removeEventListener('visibilitychange',hide);
   window.removeEventListener('pagehide',stopDialogue);
   window.removeEventListener('hh:voice-companion-stop',stopDialogue);
  };
 },[enabled,speechLocale,stopDialogue]);
 useEffect(()=>{
  if(!enabled)return;
  try{
   const value=JSON.parse(window.localStorage.getItem('hh-voice-companion-prefs-v1')||'{}') as {voiceId?:string;rate?:number};
   if(typeof value.voiceId==='string')setVoiceIdState(value.voiceId.slice(0,200));
   if(typeof value.rate==='number')setRate(normalizeSpeechRate(value.rate));
  }catch{}
  setPrefsLoaded(true);
 },[enabled]);
 useEffect(()=>{
  if(!enabled||!prefsLoaded)return;
  try{window.localStorage.setItem('hh-voice-companion-prefs-v1',JSON.stringify({voiceId,rate}));}catch{}
 },[enabled,voiceId,rate,prefsLoaded]);
 const setPlayback=useCallback((value:boolean)=>{
  if(!value){stopDialogue();setAutoRead(false);}setPlaybackConsent(value);setNotice('');
 },[stopDialogue]);
 const setRecognitionConsent=useCallback((value:boolean)=>{
  if(!value)stopDialogue();setSttConsent(value);setNotice('');
 },[stopDialogue]);
 const speak=useCallback((text:string)=>{
  if(!enabled)return;
  if(chooseVoiceRoute({channel:'web',playbackConsent})!=='browser-speech'){
   setNotice(t.permission);return;
  }
  if(document.hidden)return;
  if(!supported||!speaker.current){
   if(dialogueActive.current)stopDialogue();
   setNotice(t.unavailable);return;
  }
  const parts=speechSegments(text);
  if(!parts.length){if(dialogueActive.current)stopDialogue();return;}
  // No background synthesis and no new AI turn. A client gesture (or prior
  // explicit opt-in to auto-read) starts one existing browser voice session.
  stop();setNotice('');lastSpoken.current=text;
  const seq=generation.current;
  let index=0;
  const playNext=()=>{
   if(seq!==generation.current)return;
   if(index>=parts.length){
    setSpeaking(false);
    if(dialogueActive.current&&resumeDialogue.current){
     resumeTimer.current=setTimeout(()=>{
      resumeTimer.current=null;
      if(dialogueActive.current&&!document.hidden)resumeDialogue.current?.();
     },450);
    }
    return;
   }
   const result=speaker.current?.speak(parts[index++],speechLocale,{
    onStart:()=>{if(seq===generation.current)setSpeaking(true);},
    onEnd:(reason)=>{
     if(seq!==generation.current)return;
     if(reason==='ended'){playNext();return;}
     setSpeaking(false);
     if(dialogueActive.current)stopDialogue();
     if(reason!=='cancelled')setNotice(t.error);
    },
   },{rate:normalizeSpeechRate(rate),voiceURI:normalizeDeviceVoiceId(voiceId,voices,speechLocale)});
   if(!result?.ok){
    setSpeaking(false);
    if(dialogueActive.current)stopDialogue();
    setNotice(t.error);
   }
  };
  playNext();
 },[enabled,speechLocale,playbackConsent,rate,stop,stopDialogue,supported,t,voiceId,voices]);
 const dictate=useCallback((onTranscript:(text:string)=>void)=>{
  if(!enabled)return;
  if(!sttConsent){setNotice(t.sttConsent);return;}
  const Ctor=(window as SpeechWindow).SpeechRecognition||(window as SpeechWindow).webkitSpeechRecognition;
  if(!Ctor){stopDialogue();setNotice(t.inputUnavailable);return;}
  stop();setNotice('');
  try{
   const instance=new Ctor();recognition.current=instance;
   // Safari can deliver a final result/error after abort, route change or
   // a second recording. Only the currently owned capture may edit the composer.
   const captureGeneration=generation.current;
   const capture=createRecognitionGate(()=>
     captureGeneration===generation.current&&recognition.current===instance);
   let hadSpeech=false;
   instance.lang=browserSpeechLanguage(speechLocale);instance.continuous=false;instance.interimResults=false;
   instance.onresult=event=>{
    const text=capture.accept(event.results?.[0]?.[0]?.transcript);
    if(text){hadSpeech=true;onTranscript(text);setNotice(t.captured);}
   };
   instance.onerror=()=>{if(!capture.isActive())return;
     stopDialogue();setNotice(t.error);setRecording(false);recognition.current=null;};
   instance.onend=()=>{if(!capture.isActive())return;
     setRecording(false);recognition.current=null;
     if(dialogueActive.current&&!hadSpeech){
      stopDialogue();setNotice(t.inputUnavailable);
     }
   };
   instance.start();setRecording(true);
  }catch{stopDialogue();recognition.current=null;setRecording(false);setNotice(t.inputUnavailable);}
 },[enabled,speechLocale,sttConsent,stop,stopDialogue,t]);
 const startDialogue=useCallback((onTurn:(text:string)=>void)=>{
  if(!enabled)return;
  if(!supported||!recognitionSupported||!playbackConsent||!sttConsent){
   setNotice(t.inputUnavailable);return;
  }
  dialogueActive.current=true;dialogueOnTurn.current=onTurn;setConversing(true);
  dictate(text=>{if(dialogueActive.current)dialogueOnTurn.current?.(text);});
 },[enabled,dictate,playbackConsent,recognitionSupported,sttConsent,supported,t]);
 resumeDialogue.current=()=>{
  if(dialogueActive.current&&dialogueOnTurn.current){
   dictate(text=>{if(dialogueActive.current)dialogueOnTurn.current?.(text);});
  }
 };
 return {t,supported,recognitionSupported,voices,playbackConsent,sttConsent,autoRead,
  setAutoRead,voiceId,setVoiceId,rate,setRate,speechLocale,setSpeechLocale,speaking,recording,notice,lastSpoken,
  setPlayback,setRecognitionConsent,speak,dictate,stop,conversing,startDialogue,stopDialogue};
}
export type VoiceCompanion=ReturnType<typeof useVoiceCompanion>;

export function VoiceCompanionControls({voice,locale,greeting,latestReply,onTranscript,onConversationTurn}:{
 voice:VoiceCompanion;locale:PublicLocale;greeting:string;latestReply?:string;onTranscript:(text:string)=>void;
 onConversationTurn:(text:string)=>void;
}){
 const t=voice.t;
 const controlStyle={minHeight:44,minWidth:44,border:"1px solid #E9DFD1",borderRadius:12,
   background:"#FFFCF7",color:"#143D3A",padding:"8px 12px"};
 return <div data-hh-voice-companion style={{display:'grid',gap:6,padding:'6px 0'}}>
  {!voice.playbackConsent&&<label style={{fontSize:13}} data-hh-voice-first-consent>
   <input type="checkbox" checked={voice.playbackConsent} onChange={e=>voice.setPlayback(e.target.checked)}/> {t.playConsent}
  </label>}
  <div role="group" aria-label={t.settings} style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
   <label style={{display:'inline-flex',gap:6,alignItems:'center',fontSize:14}}>{t.voice}
    <select data-hh-voice-selector aria-label={t.voice} style={{minHeight:44,maxWidth:'min(58vw,220px)'}}
     value={normalizeDeviceVoiceId(voice.voiceId,voice.voices,voice.speechLocale)}
     onChange={e=>voice.setVoiceId(e.target.value)}>
     <option value="">{t.none}</option>
     {voice.voices.map(item=><option value={item.voiceURI} key={item.voiceURI}>{item.name} · {item.lang}</option>)}
    </select>
   </label>
   <button type="button" data-hh-voice-preview style={controlStyle}
    disabled={!voice.supported||!voice.playbackConsent}
    onClick={()=>voice.speak(publicPreviewText(voice.speechLocale))}>
    {locale==='ru'?'Послушать голос':locale==='es'?'Probar voz':'Preview voice'}</button>
   <button type="button" data-hh-voice-welcome style={controlStyle} disabled={!voice.supported||!voice.playbackConsent}
    onClick={()=>voice.speak(greeting)}>{t.welcome}</button>
   <button type="button" data-hh-voice-repeat style={controlStyle} disabled={!voice.supported||!voice.playbackConsent||!latestReply}
    onClick={()=>voice.speak(latestReply||'')}>{t.repeat}</button>
   <button type="button" data-hh-voice-mic style={controlStyle} disabled={!voice.recognitionSupported||!voice.sttConsent||voice.conversing}
    onClick={()=>voice.recording?voice.stop():voice.dictate(onTranscript)}>{voice.recording?t.recording:t.dictate}</button>
   <button type="button" data-hh-voice-conversation aria-pressed={voice.conversing} style={controlStyle}
    disabled={!voice.conversing&&(!voice.recognitionSupported||!voice.supported||!voice.sttConsent||!voice.playbackConsent)}
    onClick={()=>voice.conversing?voice.stopDialogue():voice.startDialogue(onConversationTurn)}>
    {voice.conversing?(locale==='ru'?'Завершить разговор':locale==='es'?'Terminar charla':'End conversation'):
      (locale==='ru'?'Разговор голосом':locale==='es'?'Conversación por voz':'Voice conversation')}
   </button>
   <button type="button" data-hh-voice-stop style={controlStyle} disabled={!voice.speaking&&!voice.recording&&!voice.conversing}
    onClick={voice.conversing?voice.stopDialogue:voice.stop}>{t.stop}</button>
  </div>
  <details data-hh-voice-preferences>
   <summary>{t.settings}</summary>
   <div style={{display:'grid',gap:8,padding:'6px 2px',fontSize:13}}>
    <label><input type="checkbox" checked={voice.playbackConsent} onChange={e=>voice.setPlayback(e.target.checked)}/> {t.playConsent}</label>
    <label><input type="checkbox" checked={voice.sttConsent} onChange={e=>voice.setRecognitionConsent(e.target.checked)}/> {t.sttConsent}</label>
    <label><input type="checkbox" checked={voice.autoRead} disabled={!voice.playbackConsent}
     onChange={e=>voice.setAutoRead(e.target.checked)}/> {t.auto}</label>
    <label>{t.language} <select value={voice.speechLocale} onChange={e=>{voice.stopDialogue();voice.setSpeechLocale(e.target.value as PublicLocale);voice.setVoiceId('');}}>
     <option value="ru">Русский</option><option value="en">English</option><option value="es">Español</option>
    </select></label>
    <label>{t.rate} <select value={String(voice.rate)} onChange={e=>voice.setRate(Number(e.target.value))}>
     {[0.75,0.85,1,1.1,1.25].map(speed=><option value={speed} key={speed}>{speed}×</option>)}
    </select></label>
    <small>{locale==='ru'?'Фирменные голоса София, Майя, Алиса, Марк, Александр и Леон сейчас доступны для озвучки видео, но не для приватного диалога.':locale==='es'?'Las seis voces de Studio solo están disponibles para vídeo, no para conversaciones privadas.':'The six named Studio voices are for videos, not private chat replies.'}
      {' '}<a href={'/'+locale+'/holistic-support/mandala#voice-studio'}>
      {locale==='ru'?'Открыть голоса Studio':locale==='es'?'Voces de Studio':'Studio voices'}</a>
    </small>
   </div>
  </details>
  {voice.conversing&&<small role="status" data-hh-voice-dialogue-active>{locale==='ru'?'После паузы голос отправляется автоматически. Остановить разговор можно в любой момент.':locale==='es'?'Tras una pausa, su voz se envía automáticamente. Puede detener la conversación.':'After a pause, recognized speech sends automatically. You can stop anytime.'}</small>}
  {voice.notice&&<small role="status">{voice.notice}</small>}
  <span hidden data-hh-voice-language={browserSpeechLanguage(voice.speechLocale)}/>
 </div>;
}
