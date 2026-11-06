"use client";

import {useEffect,useRef,useState} from "react";
import type {ChangeEvent} from "react";
import type {PublicLocale} from "@/lib/public-locales";
import {prepareMessengerAudio,stageMessengerAudio} from "@/lib/mandala/messenger-audio-video-handoff.mjs";
import css from "./messenger-audio-video.module.css";

type Prepared = {file:File;seconds:number;duration:10|15|20|30|60};
type Recording = {recorder:MediaRecorder;stream:MediaStream;timeout:ReturnType<typeof setTimeout>};
const copy = {
  ru: {
    title:"🎙 Аудиозапись → видеоролик",
    explanation:"Загрузите запись или запишите голос. AI-режиссёр предложит видеоряд, а студия соберёт ролик с вашим звуком после проверки сценария.",
    upload:"Выбрать аудиозапись",record:"Записать голос",stop:"Завершить запись",
    goal:"Тема или идея ролика (необязательно)",placeholder:"Например, медитация о спокойствии",
    rights:"Подтверждаю, что имею право использовать эту запись в ролике.",
    create:"Продолжить создание видео",ready:"Запись готова",duration:"Видеоролик до",
    privacy:"Запись остаётся в этом браузере. Она не отправляется в AI и удаляется из временной передачи после открытия студии.",
    invalid:"Выберите MP3, M4A, WAV, AAC, WebM или аудиосообщение Telegram (OGG) до 15 МБ. Запись должна длиться не более 60 секунд.",
    unsupported:"Не удалось прочитать запись на этом устройстве. Для Telegram OGG попробуйте M4A или MP3.",
    microphone:"Нужен доступ к микрофону в защищённом браузере; можно выбрать готовую запись.",
    failure:"Не получилось передать аудио в студию. Проверьте разрешение на локальное хранение браузера и повторите.",
    recording:"Идёт запись…",preparing:"Проверяем аудиозапись…",sending:"Передаём в студию…",
  },
  en: {
    title:"🎙 Audio recording → video",
    explanation:"Upload audio or record your voice. The AI director suggests footage; the Studio adds your sound after you review the story.",
    upload:"Choose an audio file",record:"Record my voice",stop:"Stop recording",
    goal:"Video topic or idea (optional)",placeholder:"For example, a calming meditation",
    rights:"I have permission to use this recording in my video.",
    create:"Continue creating video",ready:"Audio ready",duration:"Video length up to",
    privacy:"Your audio stays in this browser. It is not sent to AI and is removed from temporary transfer when Studio opens.",
    invalid:"Choose MP3, M4A, WAV, AAC, WebM or Telegram OGG audio, up to 15 MB and 60 seconds.",
    unsupported:"Could not decode this recording on your device. For Telegram OGG, try M4A or MP3.",
    microphone:"Microphone access is needed in a secure browser. You can upload a recording instead.",
    failure:"Could not transfer the audio to Studio. Check browser local storage permissions and try again.",
    recording:"Recording…",preparing:"Checking audio…",sending:"Opening Studio…",
  },
  es: {
    title:"🎙 Audio grabado → vídeo",
    explanation:"Sube un audio o graba tu voz. El director IA sugiere escenas; el Estudio añade tu sonido tras revisar la historia.",
    upload:"Elegir audio",record:"Grabar mi voz",stop:"Terminar grabación",
    goal:"Tema o idea (opcional)",placeholder:"Por ejemplo, una meditación calmante",
    rights:"Tengo permiso para utilizar esta grabación en mi vídeo.",
    create:"Continuar creando vídeo",ready:"Audio preparado",duration:"Duración máxima",
    privacy:"El audio permanece en este navegador. No se envía a la IA y se borra de la transferencia al abrir el Estudio.",
    invalid:"Elige MP3, M4A, WAV, AAC, WebM u OGG de Telegram, hasta 15 MB y 60 segundos.",
    unsupported:"No se pudo descodificar el audio en este dispositivo. Para OGG, prueba M4A o MP3.",
    microphone:"Necesitas permitir el micrófono en un navegador seguro. También puedes subir un audio.",
    failure:"No se pudo pasar el audio al Estudio. Comprueba el almacenamiento local e inténtalo de nuevo.",
    recording:"Grabando…",preparing:"Comprobando audio…",sending:"Abriendo el Estudio…",
  },
} as const;

export function MessengerAudioVideo({locale,initialGoal="",disabled=false,autoOpen=false}:{
  locale:PublicLocale; initialGoal?:string; disabled?:boolean; autoOpen?:boolean;
}) {
  const t = copy[locale];
  const [prepared,setPrepared] = useState<Prepared|null>(null);
  const [goal,setGoal] = useState(initialGoal.slice(0,160));
  const [rights,setRights] = useState(false);
  const [state,setState] = useState<"idle"|"checking"|"sending">("idle");
  const [recording,setRecording] = useState(false);
  const [error,setError] = useState("");
  const [preview,setPreview] = useState("");
  const micRef = useRef<Recording|null>(null);
  const mountedRef = useRef(true);
  const revision = useRef(0);
  useEffect(()=>{
    mountedRef.current = true;
    return ()=>{
      mountedRef.current = false;
      revision.current++;
      const current = micRef.current;
      micRef.current = null;
      if(current){
        clearTimeout(current.timeout);
        current.recorder.onstop = null;
        try {if(current.recorder.state!=="inactive")current.recorder.stop();} catch {}
        current.stream.getTracks().forEach(track=>track.stop());
      }
    };
  },[]);
  useEffect(()=>{
    if(!prepared)return;
    const url=URL.createObjectURL(prepared.file);
    setPreview(url);
    return ()=>{URL.revokeObjectURL(url);setPreview("");};
  },[prepared]);
  useEffect(()=>{
    if(!goal&&initialGoal)setGoal(initialGoal.slice(0,160));
  },[initialGoal,goal]);

  async function chooseFile(file:File|undefined){
    if(!file||disabled)return;
    const current=++revision.current;
    setState("checking");setError("");setPrepared(null);setRights(false);
    try{
      const checked=await prepareMessengerAudio(file) as Prepared;
      if(mountedRef.current&&revision.current===current)setPrepared(checked);
    }catch(reason){
      if(mountedRef.current&&revision.current===current)
        setError(reason instanceof Error&&
          (reason.message==="AUDIO_INVALID_FILE"||reason.message==="AUDIO_TOO_LONG")?t.invalid:t.unsupported);
    }finally{
      if(mountedRef.current&&revision.current===current)setState("idle");
    }
  }
  function stopVoice(){
    const session=micRef.current;
    if(!session)return;
    clearTimeout(session.timeout);
    try {if(session.recorder.state!=="inactive")session.recorder.stop();}
    catch {session.stream.getTracks().forEach(track=>track.stop());setRecording(false);}
  }
  async function startVoice(){
    if(disabled||state!=="idle"||micRef.current)return;
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
      setError(t.microphone);return;
    }
    let stream:MediaStream|null=null;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!mountedRef.current){stream.getTracks().forEach(track=>track.stop());return;}
      const formats=["audio/mp4","audio/webm;codecs=opus","audio/webm"];
      const mime=formats.find(type=>MediaRecorder.isTypeSupported(type));
      const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
      const chunks:Blob[]=[];
      const session:Recording={recorder,stream,timeout:setTimeout(stopVoice,59000)};
      micRef.current=session;
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onerror=()=>{if(mountedRef.current)setError(t.microphone);};
      recorder.onstop=()=>{
        clearTimeout(session.timeout);
        stream?.getTracks().forEach(track=>track.stop());
        if(micRef.current!==session)return;
        micRef.current=null;setRecording(false);
        if(!mountedRef.current||!chunks.length){setError(t.microphone);return;}
        const mediaType=recorder.mimeType||mime||"audio/mp4";
        const extension=mediaType.includes("webm")?"webm":"m4a";
        void chooseFile(new File(chunks,"my-voice."+extension,{type:mediaType}));
      };
      recorder.start(250);
      setError("");setRecording(true);
    }catch{
      stream?.getTracks().forEach(track=>track.stop());
      if(mountedRef.current)setError(t.microphone);
    }
  }
  async function continueToVideo(){
    if(!prepared||!rights||state!=="idle"||disabled||recording)return;
    setState("sending");setError("");
    try{
      await stageMessengerAudio({...prepared,locale,goal,rights:true});
      // Same-tab navigation keeps the one-use session token and the private
      // IndexedDB File. The existing Video Studio alone renders/charges.
      window.location.assign("/"+locale+"/holistic-support/mandala#video-director-chat");
    }catch{
      if(mountedRef.current){setError(t.failure);setState("idle");}
    }
  }
  return <details open={autoOpen} className={css.root} data-hh-messenger-audio-video>
    <summary>{t.title}</summary>
    <div className={css.content}>
      <p>{t.explanation}</p>
      <div className={css.tools}>
        <label className={css.upload}>{t.upload}
          <input data-hh-audio-video-file type="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/aac,audio/webm,audio/ogg,.mp3,.m4a,.wav,.aac,.webm,.ogg,.oga,.opus"
            disabled={disabled||state!=="idle"||recording}
            onChange={(event:ChangeEvent<HTMLInputElement>)=>{
              const selected=event.currentTarget.files?.[0];
              event.currentTarget.value="";
              void chooseFile(selected);
            }}/>
        </label>
        <button type="button" data-hh-audio-video-record disabled={disabled||state!=="idle"}
          onClick={()=>recording?stopVoice():void startVoice()}>
          {recording?t.stop:t.record}</button>
      </div>
      {recording&&<p role="status">{t.recording}</p>}
      {state==="checking"&&<p role="status">{t.preparing}</p>}
      {prepared&&<div className={css.ready} data-hh-audio-video-ready>
        <strong>{t.ready}: {prepared.file.name}</strong>
        <small>{Math.ceil(prepared.seconds)} s · {t.duration} {prepared.duration} s</small>
        {preview&&<audio controls preload="metadata" src={preview} aria-label={prepared.file.name}/>}
        <label className={css.field}>{t.goal}
          <input type="text" maxLength={160} value={goal} placeholder={t.placeholder}
            onChange={event=>setGoal(event.currentTarget.value)}/></label>
        <label className={css.consent}><input type="checkbox" checked={rights}
          onChange={event=>setRights(event.currentTarget.checked)}/>{t.rights}</label>
        <button type="button" className={css.primary} data-hh-audio-video-continue
          disabled={!rights||disabled||recording||state!=="idle"}
          onClick={()=>void continueToVideo()}>{state==="sending"?t.sending:t.create}</button>
      </div>}
      {error&&<p className={css.error} role="alert">{error}</p>}
      <small className={css.privacy}>{t.privacy}</small>
    </div>
  </details>;
}
