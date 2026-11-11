'use client';

import {useEffect, useId, useReducer, useRef, useState} from 'react';
import {Volume2, VolumeX} from 'lucide-react';
import {classifyAvatarEmotion} from '@/lib/assistant-avatar/emotion-policy.mjs';
import {initialAvatarState, reduceAvatar, type AvatarState} from '@/lib/assistant-avatar/avatar-machine';
import {createDeviceSpeech, type SpeechController} from '@/lib/assistant-avatar/device-speech';
import styles from './emotional-avatar.module.css';

type ChatMessage = {role:'user'|'assistant';text:string};
type Locale = 'ru'|'en'|'es';
type AvatarProps = {messages:ChatMessage[];busy:boolean;status:string;locale:Locale;compact:boolean;iconOnly?:boolean};
const copy = {
  ru:{name:'Визуальный помощник',idle:'Я рядом',reacting:'Слушаю',thinking:'Готовлю ответ',speaking:'Озвучиваю',error:'Ответ недоступен',
    show:'Показать лицо',hide:'Скрыть лицо',expand:'Увеличить портрет',collapse:'Уменьшить портрет',listen:'Озвучить ответ',stop:'Остановить озвучку',voice:'Голос устройства',defaultVoice:'По умолчанию',noLocalVoice:'Нет локальных голосов для этого языка',
    unavailable:'Системная озвучка недоступна. Ответ можно прочитать.',otherAudio:'Сейчас звучит другое аудио. Попробуйте после него.'},
  en:{name:'Visual companion',idle:'Here with you',reacting:'Listening',thinking:'Preparing a reply',speaking:'Reading aloud',error:'Reply unavailable',
    show:'Show face',hide:'Hide face',expand:'Expand portrait',collapse:'Collapse portrait',listen:'Read response aloud',stop:'Stop reading',voice:'Device voice',defaultVoice:'Default',noLocalVoice:'No local voices for this language',
    unavailable:'System speech is unavailable. You can still read the answer.',otherAudio:'Another audio session is active. Try again when it ends.'},
  es:{name:'Asistente visual',idle:'Estoy aquí',reacting:'Te escucho',thinking:'Preparando respuesta',speaking:'Leyendo en voz alta',error:'Respuesta no disponible',
    show:'Mostrar rostro',hide:'Ocultar rostro',expand:'Ampliar retrato',collapse:'Reducir retrato',listen:'Escuchar respuesta',stop:'Detener lectura',voice:'Voz del dispositivo',defaultVoice:'Predeterminada',noLocalVoice:'No hay voces locales para este idioma',
    unavailable:'La voz del dispositivo no está disponible. Puedes leer la respuesta.',otherAudio:'Ya se reproduce otro audio. Inténtalo al terminar.'},
} as const;

export default function EmotionalAvatar({messages,busy,status,locale,compact,iconOnly=false}:AvatarProps) {
  const t=copy[locale]||copy.en;
  const faceId=useId();
  const shirtId=useId();
  const [state,dispatch]=useReducer(reduceAvatar,compact,initialAvatarState);
  const [expanded,setExpanded]=useState(false);
  const [keyboardOpen,setKeyboardOpen]=useState(false);
  const [speechAvailable,setSpeechAvailable]=useState(false);
  const [deviceVoices,setDeviceVoices]=useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI,setSelectedVoiceURI]=useState('');
  const [voiceNotice,setVoiceNotice]=useState('');
  const speech=useRef<SpeechController|null>(null);
  const turnId=useRef(0);
  const speechId=useRef(0);
  const lastMessage=useRef<ChatMessage|null>(null);
  const lastUser=useRef<ChatMessage|null>(null);
  const localeSeen=useRef(locale);
  const latest=messages[messages.length-1];
  const latestReply=latest?.role==='assistant'&&!busy?latest.text:'';

  useEffect(()=>{
    const controller=createDeviceSpeech(()=>window);
    speech.current=controller;
    setSpeechAvailable(controller.available());
    const unwatch=controller.watchVoices(voices=>{
      setSpeechAvailable(controller.available());
      const local=voices.filter(voice=>voice.localService===true&&voice.lang?.toLowerCase().startsWith(locale));
      setDeviceVoices(local);
      setSelectedVoiceURI(current=>local.some(voice=>voice.voiceURI===current)?current:'');
    });
    const stopHidden=()=>{if(document.hidden)controller.stop();};
    const stopPage=()=>controller.stop();
    document.addEventListener('visibilitychange',stopHidden);
    window.addEventListener('pagehide',stopPage);
    return()=>{document.removeEventListener('visibilitychange',stopHidden);
      window.removeEventListener('pagehide',stopPage);unwatch();controller.destroy();speech.current=null;};
  },[locale]);

  // One view of existing chat events: handles network replies AND batched local replies.
  useEffect(()=>{
    const current=messages[messages.length-1]||null;
    if(current===lastMessage.current)return;
    lastMessage.current=current;
    if(!current){
      speech.current?.stop();lastUser.current=null;dispatch({type:'RESET',turnId:++turnId.current});
      return;
    }
    const candidate=current.role==='user'?current:messages[messages.length-2]?.role==='user'?messages[messages.length-2]:null;
    if(candidate&&candidate!==lastUser.current){
      lastUser.current=candidate;
      speech.current?.stop();setVoiceNotice('');
      const visual=classifyAvatarEmotion(candidate.text,locale);
      dispatch({type:'TURN_START',turnId:++turnId.current,emotion:visual.emotion,intensity:visual.intensity});
    }
    if(current.role==='assistant'){
      speech.current?.stop();
      dispatch({type:'TURN_DONE',turnId:turnId.current});
    }
  },[messages,locale]);

  useEffect(()=>{
    if(busy)dispatch({type:'THINKING',turnId:turnId.current});
    else if(!status&&latest?.role==='user')dispatch({type:'TURN_DONE',turnId:turnId.current});
  },[busy,status,latest]);
  useEffect(()=>{
    if(status&&!busy&&latest?.role==='user')dispatch({type:'TURN_ERROR',turnId:turnId.current});
  },[status,busy,latest]);
  useEffect(()=>{
    if(localeSeen.current===locale)return;
    localeSeen.current=locale;
    speech.current?.stop();setVoiceNotice('');
    dispatch({type:'LOCALE_CHANGE'});
  },[locale]);
  useEffect(()=>{
    if(!compact)return;
    const viewport=window.visualViewport;
    const baseline=Math.max(window.innerHeight,viewport?.height||0);
    const measure=()=>{
      const focused=document.activeElement;
      const editing=focused instanceof HTMLElement&&(/^(TEXTAREA|INPUT)$/).test(focused.tagName);
      const shrunk=baseline-(viewport?.height||window.innerHeight)>120;
      setKeyboardOpen(Boolean(editing&&shrunk));
    };
    viewport?.addEventListener('resize',measure);
    window.addEventListener('resize',measure);
    document.addEventListener('focusin',measure);
    document.addEventListener('focusout',measure);
    return()=>{viewport?.removeEventListener('resize',measure);window.removeEventListener('resize',measure);
      document.removeEventListener('focusin',measure);document.removeEventListener('focusout',measure);};
  },[compact]);

  function toggleVoice(){
    if(state.speaking){speech.current?.stop();return;}
    if(!latestReply)return;
    const ownerTurn=turnId.current;
    const ownerSpeech=Math.max(++speechId.current,state.speechId+1);
    speechId.current=ownerSpeech;
    const result=speech.current?.speak(latestReply,locale,{voiceURI:selectedVoiceURI||undefined,
      onStart:()=>{setVoiceNotice('');dispatch({type:'SPEECH_START',turnId:ownerTurn,speechId:ownerSpeech});},
      onEnd:reason=>{dispatch({type:'SPEECH_END',turnId:ownerTurn,speechId:ownerSpeech});
        if(ownerTurn===turnId.current&&(reason==='error'||reason==='timeout'))setVoiceNotice(t.unavailable);},
    });
    if(!result?.ok)setVoiceNotice(result?.reason==='busy'?t.otherAudio:t.unavailable);
  }
  function hide(){speech.current?.stop();setExpanded(false);dispatch({type:'HIDE'});}
  const phase=state.phase as AvatarState['phase'];
  const statusText=t[phase==='hidden'?'idle':phase];
  const voiceSelector=<label className={styles.voiceSelector}><span>{t.voice}</span><select aria-label={t.voice} value={selectedVoiceURI} onChange={event=>setSelectedVoiceURI(event.target.value)}>
    <option value="">{t.defaultVoice}</option>{deviceVoices.map(voice=><option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>)}
  </select>{deviceVoices.length===0&&<small>{t.noLocalVoice}</small>}</label>;
  if(iconOnly)return <div className={styles.iconVoiceControls}>
    <button type="button" className={styles.iconOnly}
      data-hh-speech-control aria-label={state.speaking?t.stop:t.listen}
      title={state.speaking?t.stop:t.listen} aria-pressed={state.speaking}
      disabled={!speechAvailable||!latestReply||busy} onClick={toggleVoice}>
      {state.speaking?<VolumeX size={21} aria-hidden="true"/>:<Volume2 size={21} aria-hidden="true"/>}
    </button>
    <details className={styles.voiceDetails}><summary aria-label={t.voice} title={t.voice}>Aa</summary>{voiceSelector}</details>
  </div>;
  if(!state.visible)return <div className={styles.hidden} data-hh-emotional-avatar-hidden>
    <button type="button" onClick={()=>dispatch({type:'SHOW'})}>{t.show}</button>
  </div>;
  return <section className={styles.root} data-hh-emotional-avatar data-phase={phase}
      data-emotion={state.emotion} data-compact={compact||undefined} data-expanded={expanded||undefined}
      data-keyboard-hidden={keyboardOpen||undefined} aria-label={t.name}>
    <svg className={styles.portrait} viewBox="0 0 160 180" focusable="false" aria-hidden="true">
      <defs>
        <linearGradient id={faceId} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#f9d9b9"/><stop offset="1" stopColor="#dbad8c"/></linearGradient>
        <linearGradient id={shirtId} x1="0" x2="1"><stop offset="0" stopColor="#4d968a"/><stop offset="1" stopColor="#1d5d60"/></linearGradient>
      </defs>
      <ellipse cx="80" cy="170" rx="63" ry="24" fill={`url(#${shirtId})`}/>
      <g className={styles.head}>
        <path d="M66 131h28v26q-14 18-28 0z" fill="#dbac8c"/>
        <ellipse cx="33" cy="90" rx="9" ry="17" fill="#e7b594"/>
        <ellipse cx="127" cy="90" rx="9" ry="17" fill="#e7b594"/>
        <ellipse cx="80" cy="87" rx="51" ry="67" fill={`url(#${faceId})`}/>
        <path d="M31 76 Q20 22 68 18 Q118 0 132 53 L126 80 Q123 52 112 46 Q90 51 72 43 Q51 56 37 55Z" fill="#594438"/>
        <path d="M36 57 Q51 24 75 25 Q98 38 123 39" fill="none" stroke="#785849" strokeWidth="6" strokeLinecap="round"/>
        <g className={styles.brows} fill="none" stroke="#61483e" strokeWidth="3.5" strokeLinecap="round">
          <path className={styles.browLeft} d="M47 75 Q58 70 68 76"/>
          <path className={styles.browRight} d="M92 76 Q103 70 114 75"/>
        </g>
        <g className={styles.eyes}>
          <ellipse cx="59" cy="89" rx="11" ry="6" fill="#fff8ef"/>
          <ellipse cx="101" cy="89" rx="11" ry="6" fill="#fff8ef"/>
          <circle cx="60" cy="89" r="5" fill="#5d7263"/><circle cx="100" cy="89" r="5" fill="#5d7263"/>
          <circle cx="61" cy="87" r="2" fill="white"/><circle cx="101" cy="87" r="2" fill="white"/>
        </g>
        <path d="M79 91 Q76 106 73 113 Q81 119 87 113" stroke="#b78169" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path className={styles.mouthNeutral} d="M68 130 Q80 134 92 130" stroke="#945d59" strokeWidth="3.2" strokeLinecap="round" fill="none"/>
        <path className={styles.mouthSmile} d="M66 128 Q80 146 94 128" stroke="#945d59" strokeWidth="3.2" strokeLinecap="round" fill="none"/>
        <path className={styles.mouthConcern} d="M68 135 Q80 126 92 135" stroke="#945d59" strokeWidth="3.2" strokeLinecap="round" fill="none"/>
        <ellipse className={styles.mouthSpeaking} cx="80" cy="133" rx="8" ry="5" fill="#7d4e4e"/>
      </g>
    </svg>
    <div className={styles.info}>
      <div className={styles.heading}><strong>{t.name}</strong><span aria-live="off">{statusText}</span></div>
      <div className={styles.controls}>
        <button type="button" onClick={toggleVoice} disabled={!speechAvailable||!latestReply}
          aria-pressed={state.speaking}>{state.speaking?t.stop:t.listen}</button>
        <button type="button" onClick={()=>{if(!compact||(window.visualViewport?.height||window.innerHeight)>760)setExpanded(value=>!value);}}
          aria-expanded={expanded} className={styles.expand}>
          {expanded?t.collapse:t.expand}</button>
        <button type="button" onClick={hide}>{t.hide}</button>
      </div>
      {voiceSelector}
      {voiceNotice&&<small role="status">{voiceNotice}</small>}
    </div>
  </section>;
}
