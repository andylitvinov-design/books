"use client";

import {useEffect,useRef,useState} from "react";
import type {ChangeEvent} from "react";
import type {PublicLocale} from "@/lib/public-locales";
import {prepareMessengerAudio,stageMessengerAudio} from "@/lib/mandala/messenger-audio-video-handoff.mjs";
import {requestConsentedTimedTranscript} from "@/lib/mandala/consented-audio-stt";
import {stageVoiceStudioHandoff} from "@/lib/mandala/voice-studio-handoff.mjs";
import css from "./messenger-audio-video.module.css";

type Prepared = {file:File;seconds:number;duration:10|15|20|30|60};
type Recording = {recorder:MediaRecorder;stream:MediaStream;timeout:ReturnType<typeof setTimeout>};
const copy = {
  ru: {
    title:"🎙 Аудиозапись → видеоролик",
    explanation:"Запишите голос или загрузите аудио. После разовой расшифровки режиссёр сможет подобрать видеоряд по смыслу речи.",
    upload:"Выбрать аудиозапись",record:"Записать голос",stop:"Завершить запись",
    manual:"Открыть студию без расшифровки",
    autoConsent:"Используйте только свою запись или запись с разрешением. Кнопка подбора разрешает один раз передать аудио внешнему сервису распознавания речи для выбора видеоряда.",
    autoLimit:"Автоматическая расшифровка доступна для файлов до 4 МБ. Вы можете открыть студию без неё.",
    sttUnavailable:"Бесплатная расшифровка сейчас не подключена. Аудио не передано внешнему сервису; можно открыть студию без неё.",
    sttFailed:"Не получилось распознать речь. Проверьте запись или откройте студию без расшифровки.",
    transcribing:"Расшифровываем голос…",
    create:"Подобрать видеоряд по голосу",ready:"Запись готова",duration:"Видеоролик до",
    privacy:"До выбора автоматической расшифровки аудио остаётся в браузере. Студия получает запись через одноразовую локальную передачу.",
    invalid:"Выберите MP3, M4A, WAV, AAC, WebM или аудиосообщение Telegram (OGG) до 15 МБ. Запись должна длиться не более 60 секунд.",
    unsupported:"Не удалось прочитать запись на этом устройстве. Для Telegram OGG попробуйте M4A или MP3.",
    microphone:"Нужен доступ к микрофону в защищённом браузере; можно выбрать готовую запись.",
    failure:"Не получилось передать аудио в студию. Проверьте разрешение на локальное хранение браузера и повторите.",
    recording:"Идёт запись…",preparing:"Проверяем аудиозапись…",sending:"Передаём в студию…",
  },
  en: {
    title:"🎙 Audio recording → video",
    explanation:"Record or upload audio. With your one-time consent to transcription, the director can match approved footage to your actual words.",
    upload:"Choose an audio file",record:"Record my voice",stop:"Stop recording",
    manual:"Open Studio without transcription",
    autoConsent:"Use only audio you own or have permission to use. Choosing automatic matching authorizes a one-time transfer to an external speech-to-text provider to select footage.",
    autoLimit:"Automatic transcription accepts files up to 4 MB. You can still open Studio without it.",
    sttUnavailable:"Free transcription is not configured. No audio was sent to the external provider; open Studio without transcription instead.",
    sttFailed:"Speech recognition failed. Check the recording or open Studio without transcription.",
    transcribing:"Transcribing your voice…",
    create:"Match footage to my voice",ready:"Audio ready",duration:"Video length up to",
    privacy:"Audio stays in this browser until you choose automatic transcription. The recording is handed to Studio through one-use local storage.",
    invalid:"Choose MP3, M4A, WAV, AAC, WebM or Telegram OGG audio, up to 15 MB and 60 seconds.",
    unsupported:"Could not decode this recording on your device. For Telegram OGG, try M4A or MP3.",
    microphone:"Microphone access is needed in a secure browser. You can upload a recording instead.",
    failure:"Could not transfer the audio to Studio. Check browser local storage permissions and try again.",
    recording:"Recording…",preparing:"Checking audio…",sending:"Opening Studio…",
  },
  es: {
    title:"🎙 Audio grabado → vídeo",
    explanation:"Graba o sube audio. Con tu permiso para una transcripción única, el director puede elegir escenas según tus palabras.",
    upload:"Elegir audio",record:"Grabar mi voz",stop:"Terminar grabación",
    manual:"Abrir el estudio sin transcripción",
    autoConsent:"Utiliza solo grabaciones propias o autorizadas. El botón de selección automática permite enviar el audio una sola vez a un proveedor externo de transcripción para elegir las escenas.",
    autoLimit:"La transcripción automática admite archivos de hasta 4 MB. Puedes abrir el estudio sin ella.",
    sttUnavailable:"La transcripción gratuita no está configurada. No se envió audio al proveedor externo; puedes abrir el estudio sin transcripción.",
    sttFailed:"No se pudo reconocer la voz. Comprueba el audio o abre el estudio sin transcripción.",
    transcribing:"Transcribiendo la voz…",
    create:"Elegir escenas según mi voz",ready:"Audio preparado",duration:"Duración máxima",
    privacy:"El audio permanece en este navegador hasta que elijas transcripción automática. El estudio lo recibe mediante una transferencia local de un solo uso.",
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
  const [state,setState] = useState<"idle"|"checking"|"transcribing"|"sending">("idle");
  const [recording,setRecording] = useState(false);
  const [error,setError] = useState("");
  const [preview,setPreview] = useState("");
  const micRef = useRef<Recording|null>(null);
  const rootRef = useRef<HTMLDetailsElement|null>(null);
  const transcriptionAbortRef = useRef<AbortController|null>(null);
  const mountedRef = useRef(true);
  const revision = useRef(0);
  useEffect(()=>{
    mountedRef.current = true;
    return ()=>{
      mountedRef.current = false;
      revision.current++;
      transcriptionAbortRef.current?.abort();
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
  // The mobile voice card is internally scrollable above the pinned composer.
  // Reveal the lower playback and continuation actions as soon as audio is ready.
  useEffect(()=>{
    if(!prepared)return;
    const frame=window.requestAnimationFrame(()=>{
      const root=rootRef.current;
      if(root&&root.scrollHeight>root.clientHeight)
        root.scrollTo({top:root.scrollHeight-root.clientHeight,behavior:"smooth"});
    });
    return ()=>window.cancelAnimationFrame(frame);
  },[prepared]);

  async function chooseFile(file:File|undefined){
    if(!file||disabled)return;
    const current=++revision.current;
    transcriptionAbortRef.current?.abort();
    setState("checking");setError("");setPrepared(null);
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
  async function continueToVideo(mode:"auto"|"manual"){
    if(!prepared||state!=="idle"||disabled||recording)return;
    const current=++revision.current;
    const controller=new AbortController();
    transcriptionAbortRef.current=controller;
    setState(mode==="auto"?"transcribing":"sending");setError("");
    try{
      if(mode==="auto"){
        if(prepared.file.size>4*1024*1024)throw Error("AUDIO_STT_INVALID_FILE");
        // This explicit button is the user's one-time external-STT consent.
        // The original audio and timed transcript then move to Studio locally.
        const transcript=await requestConsentedTimedTranscript(
          prepared.file,locale,true,controller.signal);
        if(!mountedRef.current||revision.current!==current)return;
        if(!await stageVoiceStudioHandoff(prepared.file,transcript))
          throw Error("AUDIO_STORAGE_UNAVAILABLE");
      }else{
        // No STT request and no guessing the words in a private recording.
        // The user intentionally opens manual editing without transcription.
        await stageMessengerAudio({...prepared,locale,
          goal:initialGoal.trim().slice(0,160),rights:true});
      }
      if(!mountedRef.current||revision.current!==current)return;
      setState("sending");
      window.location.assign("/"+locale+"/holistic-support/mandala"+
        (mode==="auto"?"#video-audio":"#video-director-chat"));
    }catch(reason){
      if(mountedRef.current&&revision.current===current&&!controller.signal.aborted){
        const code=reason instanceof Error?reason.message:"";
        setError(code==="AUDIO_STT_FREE_PROVIDER_NOT_CONFIGURED"?t.sttUnavailable:
          code.startsWith("AUDIO_STT_")?t.sttFailed:t.failure);
        setState("idle");
      }
    }finally{
      if(transcriptionAbortRef.current===controller)
        transcriptionAbortRef.current=null;
    }
  }
  return <details ref={rootRef} open={autoOpen} className={css.root} data-hh-messenger-audio-video>
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
        <small className={css.autoNote}>{t.autoConsent}</small>
        {prepared.file.size>4*1024*1024?<small role="status">{t.autoLimit}</small>:null}
        <div className={css.readyActions}>
          <button type="button" className={css.primary} data-hh-audio-video-continue
            disabled={prepared.file.size>4*1024*1024||disabled||recording||state!=="idle"}
            onClick={()=>void continueToVideo("auto")}>
            {state==="transcribing"?t.transcribing:state==="sending"?t.sending:t.create}
          </button>
          <button type="button" className={css.secondary} data-hh-audio-video-manual
            disabled={disabled||recording||state!=="idle"}
            onClick={()=>void continueToVideo("manual")}>{t.manual}</button>
        </div>
      </div>}
      {error&&<p className={css.error} role="alert">{error}</p>}
      <small className={css.privacy}>{t.privacy}</small>
    </div>
  </details>;
}
