"use client";

import {useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent} from "react";
import {Mic, Square, X, Send, LoaderCircle, Check, ArrowUp} from "lucide-react";
import styles from "./messenger-voice-note.module.css";

type Locale = "ru" | "en" | "es";
type Phase = "idle" | "starting" | "recording" | "finishing" | "ready" | "sending";
type MicMarker = "data-hh-conversation-mic" | "data-home-intent-mic";
const LIMIT_BYTES = 4 * 1024 * 1024;
const LIMIT_SECONDS = 59;
const DICTATION_COPY = {
  ru:{mic:"Диктовать",starting:"Подключаю микрофон…",recording:"Запись речи",finish:"Распознать запись",processing:"Распознаю речь…",ready:"Запись готова",retry:"Повторить",cancel:"Отменить",privacy:"✓ — распознать через Groq Whisper Free. Только текст попадёт в поле сообщения.",quota:"Бесплатный лимит распознавания исчерпан. Повторите позже.",timeout:"Распознавание не ответило. Можно повторить.",unavailable:"Сервис распознавания недоступен. Попробуйте снова.",empty:"Речь не распознана. Запишите ещё раз."},
  en:{mic:"Dictate",starting:"Connecting microphone…",recording:"Recording speech",finish:"Transcribe recording",processing:"Transcribing…",ready:"Recording ready",retry:"Try again",cancel:"Cancel",privacy:"✓ transcribes via Groq Whisper Free. Only text goes into the message field.",quota:"Free transcription limit reached. Try later.",timeout:"Transcription timed out. You can retry.",unavailable:"Transcription is unavailable. Try again.",empty:"No speech recognized. Record again."},
  es:{mic:"Dictar",starting:"Conectando micrófono…",recording:"Grabando voz",finish:"Transcribir grabación",processing:"Transcribiendo…",ready:"Grabación lista",retry:"Reintentar",cancel:"Cancelar",privacy:"✓ transcribe con Groq Whisper Free. Solo el texto llega al campo de mensaje.",quota:"Se alcanzó el límite gratuito. Inténtalo más tarde.",timeout:"La transcripción tardó demasiado. Puedes reintentar.",unavailable:"Transcripción no disponible. Reintenta.",empty:"No se reconoció voz. Graba de nuevo."}
} as const;
const INSTANT_COPY = {
  ru:{send:"Отправить голосовое сообщение",stop:"Остановить запись",release:"Отпустите для отправки",cancelRelease:"Отпустите для отмены",hint:"Удерживайте для записи или нажмите один раз. Отправка распознаёт речь через Groq Whisper Free; в чат поступает только текст.",sent:"Распознаю и отправляю…",ready:"Запись готова к отправке",mic:"Записать голосовое сообщение"},
  en:{send:"Send voice message",stop:"Stop recording",release:"Release to send",cancelRelease:"Release to cancel",hint:"Hold to record or tap once. Sending transcribes via Groq Whisper Free; only text enters the chat.",sent:"Transcribing and sending…",ready:"Recording ready to send",mic:"Record voice message"},
  es:{send:"Enviar mensaje de voz",stop:"Detener grabación",release:"Suelta para enviar",cancelRelease:"Suelta para cancelar",hint:"Mantén pulsado para grabar o toca una vez. El envío transcribe con Groq Whisper Free; solo el texto llega al chat.",sent:"Transcribiendo y enviando…",ready:"Grabación lista para enviar",mic:"Grabar mensaje de voz"}
} as const;
const COPY = {
  ru: {
    start:"Записать голосовое сообщение", record:"Идёт запись", stop:"Остановить запись",
    cancel:"Удалить запись", send:"Распознать и отправить", sending:"Распознаю…",
    review:"Прослушайте запись перед отправкой", consent:"При отправке запись разово передаётся сервису распознавания. В чат попадёт только распознанный текст. Аудио не сохраняется в сообщениях.",
    denied:"Нет доступа к микрофону. Разрешите его в настройках Safari или браузера.",
    unsupported:"Запись недоступна в этом браузере. Попробуйте системную запись аудио.",
    failed:"Не удалось записать аудио. Попробуйте ещё раз.", empty:"Запись слишком короткая. Попробуйте ещё раз.",
    tooLarge:"Запись слишком большая. Ограничение: 4 МБ, до 59 секунд.",
    transcription:"Распознавание сейчас недоступно. Запись осталась здесь: можно прослушать и повторить отправку.",
    busy:"Дождитесь окончания предыдущего ответа.", native:"Записать через телефон",
  },
  en: {
    start:"Record a voice message", record:"Recording", stop:"Stop recording",
    cancel:"Discard recording", send:"Transcribe and send", sending:"Transcribing…",
    review:"Listen before sending", consent:"Sending shares audio once with the speech-to-text service. Only the transcribed text is sent to chat; audio is not saved in messages.",
    denied:"Microphone access is blocked. Allow access in Safari or browser settings.",
    unsupported:"Recording is unavailable in this browser. Try your phone's audio recorder.",
    failed:"Couldn't record audio. Please try again.", empty:"Recording was too short. Try again.",
    tooLarge:"Recording is too large. Limit: 4 MB and 59 seconds.",
    transcription:"Speech transcription is unavailable. Your recording is still here; you can listen and try again.",
    busy:"Please finish the previous response first.", native:"Record using phone",
  },
  es: {
    start:"Grabar mensaje de voz", record:"Grabando", stop:"Detener grabación",
    cancel:"Descartar grabación", send:"Transcribir y enviar", sending:"Transcribiendo…",
    review:"Escucha antes de enviar", consent:"Al enviar, el audio se comparte una vez con el servicio de transcripción. Solo el texto transcrito llega al chat; el audio no se guarda en los mensajes.",
    denied:"El micrófono está bloqueado. Actívalo en Safari o en el navegador.",
    unsupported:"La grabación no está disponible. Prueba la grabadora del teléfono.",
    failed:"No se pudo grabar. Inténtalo otra vez.", empty:"La grabación es demasiado corta.",
    tooLarge:"La grabación es demasiado grande. Límite: 4 MB y 59 segundos.",
    transcription:"La transcripción no está disponible. La grabación sigue aquí; puedes escucharla y reintentar.",
    busy:"Espera a que termine la respuesta anterior.", native:"Grabar con el teléfono",
  },
} as const;

function durationLabel(seconds:number) {
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}
function stopTracks(stream:MediaStream|null) {
  stream?.getTracks().forEach(track => track.stop());
}
function supportedType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
  return ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
    .find(type => MediaRecorder.isTypeSupported(type)) || "";
}
function fileExtension(mime:string) {
  return mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
}

export function MessengerVoiceNote({
  locale, disabled = false, resetRevision = 0, accountAuthenticated = false, onSendTranscript, onBegin,
  variant = "note", instantSend = false, micMarker, micClassName, micDescribedBy,
}:{
  locale:Locale;
  disabled?:boolean;
  resetRevision?:number;
  accountAuthenticated?:boolean;
  onSendTranscript:(text:string,file:File,seconds:number)=>boolean;
  onBegin?:()=>void;
  variant?:"note"|"dictation";
  instantSend?:boolean;
  micMarker?:MicMarker;
  micClassName?:string;
  micDescribedBy?:string;
}) {
  const t = COPY[locale] || COPY.en;
  const d = DICTATION_COPY[locale] || DICTATION_COPY.en;
  const dictation = variant === "dictation";
  const instant = dictation && instantSend;
  const v = INSTANT_COPY[locale] || INSTANT_COPY.en;
  const [phase,setPhase] = useState<Phase>("idle");
  const [readyToRecord,setReadyToRecord] = useState(false);
  const [file,setFile] = useState<File|null>(null);
  const [seconds,setSeconds] = useState(0);
  const [error,setError] = useState("");
  const [preview,setPreview] = useState("");
  const recorderRef = useRef<MediaRecorder|null>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const previewRef = useRef("");
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const abortRef = useRef<AbortController|null>(null);
  const generationRef = useRef(0);
  const startedRef = useRef(0);
  const cancelledRef = useRef(false);
  const sendAfterStop = useRef(false);
  const stoppingRef = useRef(false);
  const openingRef = useRef(false);
  const [levels,setLevels] = useState<number[]>(Array(18).fill(0));
  const audioContextRef = useRef<AudioContext|null>(null);
  const analyserRef = useRef<AnalyserNode|null>(null);
  const deliveryRef=useRef({disabled,onSendTranscript});
  useEffect(()=>{deliveryRef.current={disabled,onSendTranscript};},[disabled,onSendTranscript]);
  const gestureCleanup=useRef<(()=>void)|null>(null);
  const [gesture,setGesture]=useState<"hold"|"cancel"|null>(null);

  const release = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if(finishTimerRef.current!==null)clearTimeout(finishTimerRef.current);
    finishTimerRef.current=null;
    stopTracks(streamRef.current);
    streamRef.current = null;
    analyserRef.current = null;
    const context=audioContextRef.current;audioContextRef.current=null;
    if(context&&context.state!=="closed")void context.close().catch(()=>{});
  }, []);
  const discard = useCallback(() => {
    gestureCleanup.current?.();setGesture(null);
    generationRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    cancelledRef.current = true;
    sendAfterStop.current = false;stoppingRef.current=false;openingRef.current=false;
    if (recorderRef.current) {
      const recorder = recorderRef.current;
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;
      try { if (recorder.state !== "inactive") recorder.stop(); } catch { /* already closed */ }
    }
    recorderRef.current = null;
    release();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPreview("");
    setFile(null);
    setSeconds(0);
    setLevels(Array(18).fill(0));
    setPhase("idle");
    setError("");
  }, [release]);

  // Microphone tracks, pending uploads and blob URLs must never survive a
  // new conversation, language change, tab unmount or permission failure.
  useEffect(() => {
    discard();
    setReadyToRecord(true);
  }, [locale,resetRevision,discard]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) {
        // Never keep a microphone or upload active in a hidden tab.
        discard();
      }
    };
    document.addEventListener("visibilitychange",hidden);
    window.addEventListener("pagehide",discard);
    return () => {
      document.removeEventListener("visibilitychange",hidden);
      window.removeEventListener("pagehide",discard);
      gestureCleanup.current?.();
      generationRef.current++;openingRef.current=false;stoppingRef.current=false;sendAfterStop.current=false;
      abortRef.current?.abort();
      cancelledRef.current = true;
      if (recorderRef.current) {
        recorderRef.current.onstop = null;
        try { if (recorderRef.current.state !== "inactive") recorderRef.current.stop(); } catch { /* noop */ }
      }
      release();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = "";
    };
  }, [release,discard]);

  const showFile = (recording:File, length:number) => {
    if (!recording.size) { setPhase("idle"); setError(t.empty); return; }
    if (recording.size > LIMIT_BYTES || length > LIMIT_SECONDS) {
      setPhase("idle"); setError(t.tooLarge); return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(recording);
    previewRef.current = url;
    setPreview(url);
    setFile(recording);
    setSeconds(length);
    setError("");
    setPhase("ready");
  };
  const start = async () => {
    if (!readyToRecord || disabled || phase !== "idle" || openingRef.current) return;
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(t.unsupported);
      return;
    }
    const generation = ++generationRef.current;
    openingRef.current=true;sendAfterStop.current=false;stoppingRef.current=false;
    setPhase("starting");
    let stream:MediaStream|null = null;
    try {
      onBegin?.();
      stream = await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:true,noiseSuppression:true},video:false,
      });
      if (generation !== generationRef.current) { stopTracks(stream); return; }
      openingRef.current=false;streamRef.current = stream;
      cancelledRef.current = false;
      const mime = supportedType();
      const recorder = new MediaRecorder(stream,mime ? {mimeType:mime} : undefined);
      recorderRef.current = recorder;
      const chunks:Blob[] = [];
      recorder.ondataavailable = event => { if (generation===generationRef.current && event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        if (generation !== generationRef.current) return;
        cancelledRef.current = true;stoppingRef.current=false;sendAfterStop.current=false;
        recorder.onstop=null;
        try{if(recorder.state!=="inactive")recorder.stop();}catch{}
        release(); recorderRef.current = null;
        setPhase("idle"); setError(t.failed);
      };
      recorder.onstop = () => {
        if (cancelledRef.current || generation !== generationRef.current) return;
        const confirmed=sendAfterStop.current;
        gestureCleanup.current?.();setGesture(null);
        sendAfterStop.current=false;stoppingRef.current=false;
        release(); recorderRef.current = null;
        const type = (recorder.mimeType || chunks[0]?.type || mime || "audio/webm").split(";")[0];
        const blob = new Blob(chunks,{type});
        const length = Math.max(1,Math.min(LIMIT_SECONDS,Math.round((Date.now()-startedRef.current)/1000)));
        const recording = new File([blob],"voice-"+Date.now()+"."+fileExtension(type),{type});
        showFile(recording,length);
        // A deliberate checkmark is the upload consent. A timer or silence NEVER uploads.
        if (dictation && confirmed && recording.size>0 && recording.size<=LIMIT_BYTES) {
          void submitRecording(recording,length);
        }
      };
      startedRef.current = Date.now();
      recorder.start(300);
      setSeconds(0);setLevels(Array(18).fill(0));setPhase("recording");
      // Optional actual microphone meter. MediaRecorder does not depend on Web Audio.
      // If Safari suspends this context the timer/recording still work.
      if(dictation){
        try{
          const Context=window.AudioContext||(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
          if(Context){
            const context=new Context();audioContextRef.current=context;
            const analyser=context.createAnalyser();analyser.fftSize=256;
            context.createMediaStreamSource(stream).connect(analyser);analyserRef.current=analyser;
            void context.resume().catch(()=>{});
          }
        }catch{/* Recording must not fail due to an unavailable meter. */}
      }
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now()-startedRef.current)/1000);
        setSeconds(Math.min(elapsed,LIMIT_SECONDS));
        const analyser=analyserRef.current;
        if(analyser&&audioContextRef.current?.state==="running"){
          const values=new Uint8Array(analyser.fftSize);
          analyser.getByteTimeDomainData(values);
          let square=0;for(const value of values){const n=(value-128)/128;square+=n*n;}
          const amplitude=Math.min(1,Math.sqrt(square/values.length)*5);
          setLevels(old=>[...old.slice(1),amplitude]);
        }
        if (elapsed >= LIMIT_SECONDS && recorder.state === "recording"&&!stoppingRef.current) {
          stop(false);
        }
      },150);
    } catch (e) {
      stopTracks(stream);
      if (generation !== generationRef.current) return;
      openingRef.current=false;stoppingRef.current=false;
      release(); recorderRef.current = null;
      setPhase("idle");
      setError(e instanceof DOMException && ["NotAllowedError","PermissionDeniedError"].includes(e.name)
        ? t.denied : t.failed);
    }
  };
  const stop = (confirmed=false) => {
    if (recorderRef.current?.state === "recording"&&!stoppingRef.current) {
      const recorder=recorderRef.current;
      sendAfterStop.current=confirmed;stoppingRef.current=true;setPhase("finishing");
      // Safari must not leave a frozen composer when its stop event is lost.
      finishTimerRef.current=setTimeout(()=>{
        if(stoppingRef.current&&recorderRef.current===recorder){discard();setError(t.failed);}
      },5000);
      try { recorder.stop(); } catch { discard();setError(t.failed); }
    }
  };
  const submitRecording = async (recording:File,length:number) => {
    if (abortRef.current || !recording.size) return;
    if(deliveryRef.current.disabled){setPhase("ready");setError(t.busy);return;}
    if (length > LIMIT_SECONDS || recording.size > LIMIT_BYTES) { setError(t.tooLarge); return; }
    const generation = ++generationRef.current;
    const abort = new AbortController();
    abortRef.current = abort;
    let timedOut=false;
    const timeout=setTimeout(()=>{timedOut=true;abort.abort();},26000);
    setError("");setPhase("sending");
    try {
      const body = new FormData();
      body.append("file",recording,recording.name);
      body.append("locale",dictation?"auto":locale);
      if(dictation)body.append("output","text");
      // Authenticated Ali uses its own existing free STT quota; guests retain the no-login allowance.
      if (accountAuthenticated) body.append("purpose","ali_chat");
      body.append("consent","yes");
      const response = await fetch("/api/holistic-support/audio-storyboard",{
        method:"POST",credentials:"same-origin",cache:"no-store",body,signal:abort.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok)throw Error(response.status===429?"STT_QUOTA":response.status===422?"STT_EMPTY":"VOICE_TRANSCRIPT_UNAVAILABLE");
      const recognized=dictation?result?.text:result?.transcript?.text;
      if(typeof recognized!=="string"||!recognized.trim())throw Error("STT_EMPTY");
      if (generation !== generationRef.current) return;
      const text = recognized.trim().slice(0,2000);
      if (!deliveryRef.current.onSendTranscript(text,recording,length)) {
        setPhase("ready");setError(t.busy);return;
      }
      discard(); // Audio is never retained after accepted transcription.
    } catch (failure) {
      if (generation !== generationRef.current || (abort.signal.aborted&&!timedOut)) return;
      const reason=failure instanceof Error?failure.message:"";
      setPhase("ready");setError(dictation?(timedOut?d.timeout:reason==="STT_QUOTA"?d.quota:
        reason==="STT_EMPTY"?d.empty:d.unavailable):t.transcription);
    } finally {
      clearTimeout(timeout);
      if (abortRef.current === abort) abortRef.current = null;
    }
  };
  const send=()=>{if(file&&phase==="ready")void submitRecording(file,seconds);};
  // Keep the pointer listeners on the window because the mic button is
  // replaced by the recording tray. Tap and keyboard activation remain
  // available, including while waiting for first-use OS permission.
  const beginHold=(event:ReactPointerEvent<HTMLButtonElement>)=>{
    if(!instant||disabled||!readyToRecord||phase!=="idle"||openingRef.current||!event.isPrimary||event.button!==0)return;
    event.preventDefault();
    gestureCleanup.current?.();
    const pointer=event.pointerId, x=event.clientX, pressedAt=Date.now();
    // Safari may implicitly capture the touch on the soon-to-be-removed
    // mic. Transfer capture to the stable form before showing the tray.
    const capture=event.currentTarget.closest("form");
    try{capture?.setPointerCapture(pointer);}catch{/* window listeners remain the fallback */}
    let cancelling=false;
    const move=(e:PointerEvent)=>{
      if(e.pointerId!==pointer)return;
      cancelling=x-e.clientX>=72;
      setGesture(cancelling?"cancel":"hold");
    };
    const cleanup=()=>{
      window.removeEventListener("pointermove",move,true);
      window.removeEventListener("pointerup",up,true);
      window.removeEventListener("pointercancel",cancel,true);
      try{if(capture?.hasPointerCapture(pointer))capture.releasePointerCapture(pointer);}catch{/* pointer already released */}
      gestureCleanup.current=null;
    };
    const up=(e:PointerEvent)=>{
      if(e.pointerId!==pointer)return;
      cleanup();setGesture(null);
      if(cancelling||x-e.clientX>=72){discard();return;}
      // A quick tap keeps recording. Never submit an empty clip when the
      // permission dialog outlasts the hold.
      if(Date.now()-pressedAt>=300&&recorderRef.current?.state==="recording"&&Date.now()-startedRef.current>=250)stop(true);
    };
    const cancel=(e:PointerEvent)=>{if(e.pointerId===pointer){cleanup();discard();}};
    gestureCleanup.current=cleanup;
    window.addEventListener("pointermove",move,true);
    window.addEventListener("pointerup",up,true);
    window.addEventListener("pointercancel",cancel,true);
    setGesture("hold");void start();
  };

  if(dictation){
    const active=phase!=="idle"||Boolean(error);
    return !active?<button type="button" onClick={event=>{if(!instant||event.detail===0)void start();}}
      onPointerDown={instant?beginHold:undefined} onContextMenu={instant?event=>event.preventDefault():undefined}
      style={instant?{touchAction:"none",userSelect:"none",WebkitTouchCallout:"none"}:undefined}
      disabled={!readyToRecord||disabled} className={micClassName||styles.mic}
      aria-describedby={micDescribedBy} data-hh-dictation-ready={readyToRecord?"true":undefined}
      {...(micMarker?{[micMarker]:true}:{})} data-hh-composer-dictation-mic
      aria-label={instant?v.mic:d.mic} title={instant?v.hint:d.mic}><Mic size={22} aria-hidden="true"/></button>:
      <div className={styles.dictationPanel} data-hh-dictation-active="true" data-hh-dictation-phase={phase} data-hh-instant-voice={instant?"true":undefined} data-hh-voice-cancelling={gesture==="cancel"?"true":undefined}>
        {instant&&gesture&&<p className={styles.holdHint} role="status">{gesture==="cancel"?v.cancelRelease:v.release}</p>}
        <div className={styles.dictationRow}>
          <button type="button" className={styles.dictationCancel} onClick={discard}
            aria-label={d.cancel} title={d.cancel}><X size={21}/></button>
          <div className={styles.dictationSignal} role="status" aria-live="polite">
            {phase==="recording"?<><span className={styles.waveform} aria-hidden="true">
              {levels.map((value,index)=><i key={index} style={{height:Math.round(4+25*value)+"px"}}/>)}
            </span><span className={styles.dictationTime} aria-label={d.recording}>{durationLabel(seconds)}</span></>:
             <span>{phase==="starting"?d.starting:phase==="sending"||phase==="finishing"?(instant?v.sent:d.processing):
              phase==="ready"?(instant?v.ready:d.ready):t.failed}</span>}
          </div>
          {instant&&phase==="recording"&&<button type="button" className={styles.dictationStop}
            onClick={()=>stop(false)} aria-label={v.stop} title={v.stop}><Square size={17} fill="currentColor" aria-hidden="true"/></button>}
          <button type="button" className={styles.dictationConfirm}
            disabled={disabled||phase==="starting"||phase==="sending"||phase==="finishing"}
            aria-label={phase==="idle"?d.retry:phase==="ready"&&error?d.retry:instant?v.send:d.finish}
            title={phase==="idle"?d.retry:instant?v.send:d.finish}
            onClick={()=>{if(phase==="recording")stop(true);else if(phase==="ready")send();else void start();}}>
            {phase==="sending"||phase==="starting"||phase==="finishing"?
              <LoaderCircle size={20} className={styles.spinner}/>:instant?<ArrowUp size={22}/>:<Check size={22}/>}
          </button>
        </div>
        <p className={styles.dictationPrivacy}>{instant?v.hint:d.privacy}</p>
        {error&&<p className={styles.error} role="alert">{error}</p>}
      </div>;
  }

  return <>
    <button type="button" onClick={phase === "recording" ? ()=>stop() : ()=>void start()}
      disabled={!readyToRecord || disabled || phase === "starting" || phase === "finishing" || phase === "ready" || phase === "sending"}
      className={styles.mic} data-hh-voice-note-mic
      data-recording={phase === "recording" || undefined}
      aria-pressed={phase === "recording"} aria-label={phase === "recording" ? t.stop : t.start}
      title={phase === "recording" ? t.stop : t.start}>
      {phase === "recording" ? <Square size={16} fill="currentColor" aria-hidden="true"/> :
        <Mic size={20} aria-hidden="true"/>}
    </button>
    {(phase !== "idle" || error) && <div className={styles.panel} data-hh-voice-note-panel
      role="group" aria-label={t.start}>
      {phase === "starting"||phase === "finishing"?<div className={styles.row}><span>{phase==="starting"?d.starting:d.processing}</span><button type="button" onClick={discard} className={styles.small} aria-label={t.cancel}><X size={17}/></button></div>:phase === "recording" ? <div className={styles.row}>
        <span className={styles.live}><i aria-hidden="true"/>{t.record} · {durationLabel(seconds)}</span>
        <button type="button" onClick={()=>stop()} className={styles.primary} aria-label={t.stop}><Square size={15}/></button>
        <button type="button" onClick={discard} className={styles.small} aria-label={t.cancel}><X size={17}/></button>
      </div> : file && preview ? <>
        <div className={styles.row}>
          <span className={styles.label}>{t.review} · {seconds ? durationLabel(seconds) : "—"}</span>
          <button type="button" onClick={discard} className={styles.small}
            disabled={phase === "sending"} aria-label={t.cancel}><X size={17}/></button>
        </div>
        <audio controls preload="metadata" src={preview} className={styles.player}
          aria-label={t.review} onLoadedMetadata={event=>{
            if(seconds>0)return;
            const length=event.currentTarget.duration;
            if(!Number.isFinite(length)||length<=0)return;
            const rounded=Math.ceil(length);
            setSeconds(rounded);
            if(rounded>LIMIT_SECONDS)setError(t.tooLarge);
          }}/>
        <div className={styles.row}>
          <span className={styles.consent}>{t.consent}</span>
          <button type="button" onClick={() => void send()} disabled={disabled || phase === "sending" || seconds > LIMIT_SECONDS}
            className={styles.send} data-hh-voice-note-send aria-label={t.send}>
            {phase === "sending" ? <LoaderCircle size={18} className={styles.spinner}/> : <Send size={18}/>}
            <span>{phase === "sending" ? t.sending : t.send}</span>
          </button>
        </div>
      </> : null}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {error && phase === "idle" && <label className={styles.native}>
        {t.native}
        <input type="file" accept="audio/mp4,audio/mpeg,audio/webm,audio/ogg,.m4a,.mp3,.webm,.ogg"
          capture="user" onChange={event => {
            const recording = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!recording) return;
            showFile(recording,0);
          }}/>
      </label>}
    </div>}
  </>;
}
