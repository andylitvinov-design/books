"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import type {PublicLocale} from "@/lib/public-locales";
import {createDeviceSpeech,type SpeechController} from "@/lib/assistant-avatar/device-speech";
import {browserSpeechLanguage,speechSegments,chooseVoiceRoute,createRecognitionGate} from "@/lib/voice-companion/browser-voice.mjs";
import {normalizeDeviceVoiceId,normalizeSpeechRate,publicPreviewText} from "@/lib/voice-companion/voice-catalog.mjs";
import {startCoachRecordedTurn,coachRecordedSupported} from "@/lib/personal-coaching/coach-recorded-turn.mjs";
import {ios27NeedsSpeechRecovery} from "@/lib/personal-coaching/my-coach-dictation.mjs";
import {setCoachIos27AudioSession,refreshCoachIos27PlaybackRoute} from "@/lib/personal-coaching/coach-ios-audio-route.mjs";

type RecognitionResult={results:ArrayLike<ArrayLike<{transcript:string}>>};
type VoiceRecognition={lang:string;continuous:boolean;interimResults:boolean;
  onresult:((event:RecognitionResult)=>void)|null;onerror:((event:{error:string})=>void)|null;
  onend:(()=>void)|null;onstart?:(()=>void)|null;start:()=>void;abort:()=>void};
type RecognitionConstructor=new()=>VoiceRecognition;
type SpeechWindow=Window & {SpeechRecognition?:RecognitionConstructor;webkitSpeechRecognition?:RecognitionConstructor};
type MicPolicyDocument=Document & {permissionsPolicy?:{allowsFeature:(feature:string)=>boolean};
  featurePolicy?:{allowsFeature:(feature:string)=>boolean}};

type VoiceCopy={play:string;welcome:string;repeat:string;stop:string;dictate:string;
  recording:string;settings:string;playConsent:string;sttConsent:string;auto:string;
  rate:string;voice:string;language:string;none:string;unavailable:string;permission:string;
  inputUnavailable:string;captured:string;error:string;transcribing:string;micDenied:string;sttQuota:string;sttSignIn:string;micSilent:string;recordedConsent:string};
const COPY:Record<PublicLocale,VoiceCopy>={
  ru:{play:"Прослушать",welcome:"Слушать приветствие",repeat:"Повторить ответ",stop:"Остановить",
    dictate:"Задать голосом",recording:"Слушаю…",settings:"Голос и конфиденциальность",
    playConsent:"Разрешаю озвучивание на устройстве. Системный голос браузера иногда обрабатывается облачным сервисом производителя.",
    sttConsent:"Разрешаю отдельное распознавание речи браузером (возможно, с передачей записи поставщику браузера). Не диктуйте личные медицинские или психологические сведения.",
    auto:"Автоматически читать новые ответы (после моего разрешения)",rate:"Скорость",voice:"Голос",language:"Язык речи",
    none:"Системный голос",unavailable:"На этом устройстве нет доступного синтезатора речи. Текст остаётся доступным.",
    permission:"Сначала разрешите озвучивание ниже.",inputUnavailable:"Голосовой ввод здесь недоступен. Напишите вопрос.",
    captured:"Распознано. Проверьте текст и нажмите «Отправить».",error:"Голосовая функция недоступна. Используйте текст.",
  transcribing:"Распознаю речь…",micDenied:"Микрофон заблокирован. Разрешите доступ для сайта в Safari.",
  sttQuota:"Достигнут бесплатный лимит распознавания. Повторите позднее.",
  sttSignIn:"Войдите в аккаунт для голосового распознавания.",
  micSilent:"Не слышу голос. Нажмите микрофон и повторите.",
  recordedConsent:"Для голосового разговора на этом iPhone нужны вход и согласие на распознавание речи."},
  en:{play:"Listen",welcome:"Hear welcome",repeat:"Repeat reply",stop:"Stop",
    dictate:"Ask by voice",recording:"Listening…",settings:"Voice and privacy",
    playConsent:"I allow playback on this device. My browser's system voice may sometimes use the device provider's cloud.",
    sttConsent:"I separately allow browser speech recognition, which may transmit audio to the browser vendor. Do not dictate private health or therapy details.",
    auto:"Read new replies automatically (after I opt in)",rate:"Speed",voice:"Voice",language:"Speech language",
    none:"System voice",unavailable:"Speech playback is unavailable on this device. Text remains available.",
    permission:"Enable speech playback below first.",inputUnavailable:"Speech input is unavailable here. Please type your question.",
    captured:"Recognized. Check the text and press Send.",error:"Voice is unavailable. Please use text.",
  transcribing:"Transcribing speech…",micDenied:"Microphone blocked. Allow access for this site in Safari.",
  sttQuota:"Free recognition quota reached. Try later.",sttSignIn:"Sign in for voice recognition.",
  micSilent:"I couldn't hear you. Tap the mic and try again.",
  recordedConsent:"Voice on this iPhone requires sign-in and separate consent to speech recognition."},
  es:{play:"Escuchar",welcome:"Escuchar bienvenida",repeat:"Repetir respuesta",stop:"Detener",
    dictate:"Preguntar por voz",recording:"Escuchando…",settings:"Voz y privacidad",
    playConsent:"Autorizo la reproducción de voz en este dispositivo. La voz del navegador puede usar la nube del fabricante.",
    sttConsent:"Autorizo por separado el reconocimiento de voz del navegador; puede enviar audio al proveedor. No dictes datos de salud o terapia privados.",
    auto:"Leer automáticamente respuestas nuevas (con mi permiso)",rate:"Velocidad",voice:"Voz",language:"Idioma de voz",
    none:"Voz del sistema",unavailable:"La lectura de voz no está disponible. El texto sigue accesible.",
    permission:"Primero autoriza la lectura abajo.",inputUnavailable:"La entrada de voz no está disponible. Escribe tu pregunta.",
    captured:"Texto reconocido. Revísalo y pulsa Enviar.",error:"La voz no está disponible. Usa el texto.",
  transcribing:"Transcribiendo voz…",micDenied:"Micrófono bloqueado. Permite el acceso en Safari.",
  sttQuota:"Límite gratuito de reconocimiento alcanzado. Inténtalo más tarde.",
  sttSignIn:"Inicia sesión para usar voz.",micSilent:"No te oí. Toca el micrófono y prueba de nuevo.",
  recordedConsent:"La voz en este iPhone requiere acceso y permiso separado."},
};

export function useVoiceCompanion(locale:PublicLocale,enabled=false){
 const t=COPY[locale];
 const [supported,setSupported]=useState(false);
 const [recognitionSupported,setRecognitionSupported]=useState(false);
 const [recordedSupported,setRecordedSupported]=useState(false);
 const [prefersRecorded,setPrefersRecorded]=useState(false);
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
 const [paused,setPaused]=useState(false);
 const pauseOnHide=useRef(false);
 const phoneCall=useRef(false);
 const emptyListenRetries=useRef(0);
 const idleTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const dialogueActive=useRef(false);
 const dialogueOnTurn=useRef<((text:string)=>void)|null>(null);
 const resumeDialogue=useRef<(()=>void)|null>(null);
 const resumeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [notice,setNotice]=useState('');
 const generation=useRef(0);
 const recognition=useRef<VoiceRecognition|null>(null);
 const recordedTurn=useRef<{cancel:()=>void}|null>(null);
 const useRecordedDialogue=useRef(false);
 const recordedPurpose=useRef<'ali_chat'|'public'>('ali_chat');
 const speaker=useRef<SpeechController|null>(null);
 const lastSpoken=useRef('');
 const phoneRetryVoice=useRef(false);
 const [phoneReplayAvailable,setPhoneReplayAvailable]=useState(false);
 const mounted=useRef(true);
 const stop=useCallback(()=>{
  if(resumeTimer.current!==null){clearTimeout(resumeTimer.current);resumeTimer.current=null;}
  if(idleTimer.current!==null){clearTimeout(idleTimer.current);idleTimer.current=null;}
  generation.current++;
  // Reuse Emotional Avatar's single browser speech adapter. It only cancels
  // utterances that it actually owns, never unrelated coaching/site audio.
  speaker.current?.stop();
  recordedTurn.current?.cancel();recordedTurn.current=null;
  recognition.current?.abort();recognition.current=null;
  if(mounted.current){setSpeaking(false);setRecording(false)}
 },[]);
 const stopDialogue=useCallback(()=>{
  dialogueActive.current=false;dialogueOnTurn.current=null;useRecordedDialogue.current=false;
  pauseOnHide.current=false;
  const wasPhone=phoneCall.current;phoneCall.current=false;phoneRetryVoice.current=false;lastSpoken.current='';
  if(mounted.current){setConversing(false);setPaused(false);setNotice('');setPhoneReplayAvailable(false);}
  stop();
  if(wasPhone&&typeof navigator!=='undefined')setCoachIos27AudioSession(navigator,'auto');
 },[stop]);
 const pauseDialogue=useCallback(()=>{
  if(!dialogueActive.current)return;
  // Retire every capture/playback callback, retaining only the UI pause state.
  dialogueActive.current=false;dialogueOnTurn.current=null;useRecordedDialogue.current=false;
  if(mounted.current){setConversing(false);setPaused(true);setNotice('');setPhoneReplayAvailable(false);}
  stop();
  if(phoneCall.current&&typeof navigator!=='undefined')setCoachIos27AudioSession(navigator,'auto');
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
  setRecordedSupported(microphoneAllowed&&coachRecordedSupported(window));
  setPrefersRecorded(ios27NeedsSpeechRecovery(window.navigator));
  const unwatch=controller.watchVoices(list=>
    setVoices(list.filter(v=>v.lang.toLowerCase().startsWith(speechLocale))));
  const suspend=()=>{
   if(pauseOnHide.current){pauseDialogue();stop();}else stopDialogue();
  };
  const hide=()=>{if(document.hidden)suspend();};
  document.addEventListener('visibilitychange',hide);
  window.addEventListener('pagehide',suspend);
  window.addEventListener('hh:voice-companion-stop',stopDialogue);
  return ()=>{
   mounted.current=false;stopDialogue();unwatch();controller.destroy();
   if(speaker.current===controller)speaker.current=null;
   document.removeEventListener('visibilitychange',hide);
   window.removeEventListener('pagehide',suspend);
   window.removeEventListener('hh:voice-companion-stop',stopDialogue);
  };
 },[enabled,speechLocale,stopDialogue,pauseDialogue]);
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
 const speak=useCallback((text:string,explicitPlay=false,openingConsent=false)=>{
  if(!enabled)return;
  // Explicit Read aloud is an immediate user gesture, not automatic playback.
  if(chooseVoiceRoute({channel:'web',playbackConsent:playbackConsent||explicitPlay||openingConsent})!=='browser-speech'){
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
  if(explicitPlay){setPlaybackConsent(true);stopDialogue();}
  else stop();
  setNotice('');lastSpoken.current=text;
  const seq=generation.current;
  const phone=phoneCall.current&&dialogueActive.current;
  const retryVoice=phoneRetryVoice.current;phoneRetryVoice.current=false;
  if(phone)setPhoneReplayAvailable(true);
  const outputFailed=()=>{
   setSpeaking(false);
   if(phone&&dialogueActive.current){
    // Keep the exact canonical reply available for a real user-gesture retry.
    // Never re-send the message or auto-open the microphone on failed output.
    setPhoneReplayAvailable(true);
    setNotice(speechLocale==='ru'?'Нет звука? Нажмите «Повторить звук».':speechLocale==='es'?'¿Sin sonido? Pulsa Repetir audio.':'No sound? Tap Replay audio.');
   }else{if(dialogueActive.current)stopDialogue();setNotice(t.error);}
  };
  let index=0,busyRetries=0;
  const playNext=()=>{
   if(seq!==generation.current)return;
   if(index>=parts.length){
    setSpeaking(false);
    if(dialogueActive.current&&resumeDialogue.current){
     resumeTimer.current=setTimeout(()=>{
      resumeTimer.current=null;
      if(dialogueActive.current&&!document.hidden)resumeDialogue.current?.();
     },phone?160:450);
    }
    return;
   }
   let segmentStarted=false;
   const result=speaker.current?.speak(parts[index++],speechLocale,{
    onStart:()=>{if(seq===generation.current){segmentStarted=true;setSpeaking(true);}},
    onEnd:(reason)=>{
     if(seq!==generation.current)return;
     if(reason==='ended'&&(!phone||segmentStarted)){
      busyRetries=0;
      // Safari can keep speechSynthesis.speaking true until after onend.
      // Leave the event stack before scheduling the next spoken segment.
      resumeTimer.current=setTimeout(()=>{resumeTimer.current=null;playNext();},phone?60:100);
      return;
     }
     // Our own explicit stop increments generation before cancelling.
     outputFailed();
    },
   },{rate:normalizeSpeechRate(rate),voiceURI:retryVoice?'':normalizeDeviceVoiceId(voiceId,voices,speechLocale)});
   if(!result?.ok&&seq===generation.current){
    // iOS can briefly retain the old synthesis queue between spoken chunks.
    if(phone&&result?.reason==='busy'&&busyRetries++<2){
     index--;resumeTimer.current=setTimeout(()=>{resumeTimer.current=null;playNext();},180);return;
    }
    if(!phone&&dialogueActive.current)stopDialogue();
    outputFailed();
   }
  };
  // Release the capture route before output. A newly opened call speaks
  // on the original user gesture; subsequent iOS replies reset its route.
  if(phone&&ios27NeedsSpeechRecovery(window.navigator)){
   if(openingConsent){setCoachIos27AudioSession(window.navigator,'playback');playNext();}
   else{
    refreshCoachIos27PlaybackRoute(window.navigator);
    resumeTimer.current=setTimeout(()=>{resumeTimer.current=null;playNext();},50);
   }
  }else playNext();
 },[enabled,speechLocale,playbackConsent,rate,stop,stopDialogue,supported,t,voiceId,voices]);
 const replayPhoneReply=useCallback(()=>{
  if(!phoneCall.current||!dialogueActive.current||!phoneReplayAvailable||document.hidden||!lastSpoken.current)return;
  // Safari's direct tap permits a fresh audio route and default local voice.
  phoneRetryVoice.current=true;
  setCoachIos27AudioSession(window.navigator,'playback');
  speak(lastSpoken.current,false,true);
 },[phoneReplayAvailable,speak]);
 const dictate=useCallback((onTranscript:(text:string)=>void,consentOnStart=false)=>{
  if(!enabled)return;
  if(!sttConsent&&!consentOnStart){setNotice(t.sttConsent);return;}
  const Ctor=(window as SpeechWindow).SpeechRecognition||(window as SpeechWindow).webkitSpeechRecognition;
  if(!Ctor){stopDialogue();setNotice(t.inputUnavailable);return;}
  stop();setNotice('');
  if(phoneCall.current)setCoachIos27AudioSession(window.navigator,'auto');
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
    if(text){hadSpeech=true;emptyListenRetries.current=0;setPhoneReplayAvailable(false);
    if(idleTimer.current!==null){clearTimeout(idleTimer.current);idleTimer.current=null;}
    const live=dialogueActive.current;
    setRecording(false);setNotice(live?'':t.captured);onTranscript(text);}
   };
   instance.onerror=event=>{if(!capture.isActive()||hadSpeech)return;
     // A quiet browser capture ends normally; the call gets one local
     // restart, not an endless cloud recognition retry loop.
     if(phoneCall.current&&event.error==='no-speech')return;
     stopDialogue();setNotice(event.error==='not-allowed'?t.micDenied:t.error);setRecording(false);recognition.current=null;};
   instance.onend=()=>{if(!capture.isActive())return;
     setRecording(false);recognition.current=null;
     if(dialogueActive.current&&!hadSpeech){
      if(phoneCall.current&&emptyListenRetries.current++<1){
       resumeTimer.current=setTimeout(()=>{resumeTimer.current=null;if(dialogueActive.current&&!document.hidden)resumeDialogue.current?.();},600);
      }else{stopDialogue();setNotice(t.micSilent);}
     }
   };
   instance.onstart=()=>{
    if(!capture.isActive()||hadSpeech)return;
    setRecording(true);
    if(phoneCall.current){
     if(idleTimer.current!==null)clearTimeout(idleTimer.current);
     idleTimer.current=setTimeout(()=>{if(capture.isActive()){stopDialogue();setNotice(t.micSilent);}},90000);
    }
   };
   if(phoneCall.current)idleTimer.current=setTimeout(()=>{if(capture.isActive()){stopDialogue();setNotice(t.inputUnavailable);}},30000);
   instance.start();if(!phoneCall.current)setRecording(true);
  }catch{stopDialogue();recognition.current=null;setRecording(false);setNotice(t.inputUnavailable);}
 },[enabled,speechLocale,sttConsent,stop,stopDialogue,t]);
 // iOS Safari 27 can report a live WebSpeech session without delivering text.
 // Reuse My Coach's ephemeral capture, with its own signed-in, free-tier quota.
 const dictateRecorded=useCallback((onTranscript:(text:string)=>void)=>{
  if(!enabled||!recordedSupported){stopDialogue();setNotice(t.inputUnavailable);return;}
  stop();setNotice('');
  if(phoneCall.current)setCoachIos27AudioSession(window.navigator,'auto');
  const epoch=generation.current;
  const capture=startCoachRecordedTurn({
   locale:speechLocale,environment:window,purpose:recordedPurpose.current,textOnly:true,fastConversation:phoneCall.current,
   onState:state=>{
    if(epoch!==generation.current)return;
    if(state==='listening'||state==='hearing'){
     setRecording(true);setNotice(state==='hearing'?t.recording:'');
     if(phoneCall.current&&state==='listening'){
      if(idleTimer.current!==null)clearTimeout(idleTimer.current);
      idleTimer.current=setTimeout(()=>{if(epoch===generation.current){stopDialogue();setNotice(t.micSilent);}},90000);
     }
    }else if(state==='transcribing'){
     if(idleTimer.current!==null){clearTimeout(idleTimer.current);idleTimer.current=null;}
     setRecording(false);setNotice(t.transcribing);
    }else if(state==='recovering')setNotice(t.recording);
   },
   onResult:text=>{
    if(epoch!==generation.current)return;
    recordedTurn.current=null;emptyListenRetries.current=0;setRecording(false);setNotice('');setPhoneReplayAvailable(false);
    if(dialogueActive.current)onTranscript(text);
   },
   onFailure:code=>{
    if(epoch!==generation.current)return;
    recordedTurn.current=null;stopDialogue();
    setNotice(code==='MIC_PERMISSION'?t.micDenied:
      code==='STT_RATE_LIMIT'?t.sttQuota:code==='STT_SIGN_IN'?t.sttSignIn:
      code==='MIC_NO_SIGNAL'?t.micSilent:t.error);
   },
  });
  if(capture){recordedTurn.current=capture;
   if(!phoneCall.current)setRecording(true);
   else if(idleTimer.current===null)idleTimer.current=setTimeout(()=>{if(epoch===generation.current){stopDialogue();setNotice(t.inputUnavailable);}},30000);
  }
  else{stopDialogue();setNotice(t.inputUnavailable);}
 },[enabled,recordedSupported,stop,stopDialogue,speechLocale,t]);
 const startDialogue=useCallback((onTurn:(text:string)=>void,options:{allowRecorded?:boolean;recordedPurpose?:'ali_chat'|'public';consentOnStart?:boolean;pauseOnHide?:boolean;phoneCall?:boolean;opening?:string}={})=>{
  if(!enabled||document.hidden)return false;
  const consentOnStart=options.consentOnStart===true;
  if(!supported||(!consentOnStart&&(!playbackConsent||!sttConsent))){setNotice(t.permission);return false;}
  const recordedNeeded=prefersRecorded||!recognitionSupported;
  if(recordedNeeded&&(!recordedSupported||options.allowRecorded!==true)){
   setNotice(t.recordedConsent);return false;
  }
  if(!recordedNeeded&&!recognitionSupported){setNotice(t.inputUnavailable);return false;}
  // An informed Start talking click is the single activation. Set session-only
  // device playback and STT consent without losing Safari's user gesture.
  // Native browser microphone permission is still requested separately.
  if(consentOnStart){setPlaybackConsent(true);setSttConsent(true);}
  useRecordedDialogue.current=recordedNeeded;
  recordedPurpose.current=options.recordedPurpose==='public'?'public':'ali_chat';
  pauseOnHide.current=options.pauseOnHide===true;
  phoneCall.current=options.phoneCall===true;emptyListenRetries.current=0;
  dialogueActive.current=true;dialogueOnTurn.current=onTurn;setPaused(false);setConversing(true);
  const receive=(text:string)=>{if(dialogueActive.current)dialogueOnTurn.current?.(text);};
  // Opening speech is local and audible before capture begins. The normal
  // completion path automatically starts listening, without a Send action.
  if(phoneCall.current&&options.opening?.trim())speak(options.opening,false,consentOnStart);
  else if(recordedNeeded)dictateRecorded(receive);
  else dictate(receive,consentOnStart);
  return true;
 },[enabled,dictate,dictateRecorded,playbackConsent,recognitionSupported,
   recordedSupported,prefersRecorded,sttConsent,supported,t,speak]);
 resumeDialogue.current=()=>{
  if(dialogueActive.current&&dialogueOnTurn.current){
   const receive=(text:string)=>{if(dialogueActive.current)dialogueOnTurn.current?.(text);};
   if(useRecordedDialogue.current)dictateRecorded(receive);
   else dictate(receive);
  }
 };
 const markExternalSpeaking=useCallback(()=>{
  // External renderer owns audio. Do not capture its output.
  stop();if(mounted.current)setSpeaking(true);
 },[stop]);
 const resumeAfterExternalReply=useCallback(()=>{
  stop();
  if(!dialogueActive.current||document.hidden)return;
  const epoch=generation.current;
  resumeTimer.current=setTimeout(()=>{
   resumeTimer.current=null;
   if(epoch===generation.current&&dialogueActive.current&&!document.hidden)resumeDialogue.current?.();
  },450);
 },[stop]);
 const interruptReply=()=>{
  if(!dialogueActive.current||!speaking||document.hidden)return;
  setPhoneReplayAvailable(false);stop();
  resumeDialogue.current?.();
 };
 return {t,supported,recognitionSupported,recordedSupported,prefersRecorded,voices,playbackConsent,sttConsent,autoRead,
  setAutoRead,voiceId,setVoiceId,rate,setRate,speechLocale,setSpeechLocale,speaking,recording,notice,lastSpoken,paused,pauseDialogue,
  setPlayback,setRecognitionConsent,speak,dictate,stop,phoneReplayAvailable,replayPhoneReply,conversing,startDialogue,stopDialogue,interruptReply,markExternalSpeaking,resumeAfterExternalReply};
}
export type VoiceCompanion=ReturnType<typeof useVoiceCompanion>;

export function VoiceCompanionControls({voice,locale,greeting,latestReply,onTranscript,onConversationTurn,privacyOnly=false}:{
 voice:VoiceCompanion;locale:PublicLocale;greeting:string;latestReply?:string;onTranscript:(text:string)=>void;
 onConversationTurn:(text:string)=>void;privacyOnly?:boolean;
}){
 const t=voice.t;
 // iHelp only requests consent. It does not expose browser voice choices.
 if(privacyOnly)return <div data-hh-voice-companion data-hh-voice-permissions-only
   aria-label={t.settings} style={{display:'grid',gap:9,padding:'8px 2px',minWidth:0}}>
   <label style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:13,overflowWrap:'anywhere'}}>
    <input type="checkbox" checked={voice.playbackConsent}
      onChange={e=>voice.setPlayback(e.target.checked)}/> {t.playConsent}
   </label>
   <label style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:13,overflowWrap:'anywhere'}}>
    <input type="checkbox" checked={voice.sttConsent}
      onChange={e=>voice.setRecognitionConsent(e.target.checked)}/> {t.sttConsent}
   </label>
   {voice.notice&&<small role="status">{voice.notice}</small>}
   <span hidden data-hh-voice-language={browserSpeechLanguage(voice.speechLocale)}/>
 </div>;
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
