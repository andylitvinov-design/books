"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {Mic, Square, X, Send, LoaderCircle} from "lucide-react";
import styles from "./messenger-voice-note.module.css";

type Locale = "ru" | "en" | "es";
type Phase = "idle" | "recording" | "ready" | "sending";
const LIMIT_BYTES = 4 * 1024 * 1024;
const LIMIT_SECONDS = 59;
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
}:{
  locale:Locale;
  disabled?:boolean;
  resetRevision?:number;
  accountAuthenticated?:boolean;
  onSendTranscript:(text:string,file:File,seconds:number)=>boolean;
  onBegin?:()=>void;
}) {
  const t = COPY[locale] || COPY.en;
  const [phase,setPhase] = useState<Phase>("idle");
  const [file,setFile] = useState<File|null>(null);
  const [seconds,setSeconds] = useState(0);
  const [error,setError] = useState("");
  const [preview,setPreview] = useState("");
  const recorderRef = useRef<MediaRecorder|null>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const previewRef = useRef("");
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const abortRef = useRef<AbortController|null>(null);
  const generationRef = useRef(0);
  const startedRef = useRef(0);
  const cancelledRef = useRef(false);

  const release = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    stopTracks(streamRef.current);
    streamRef.current = null;
  }, []);
  const discard = useCallback(() => {
    generationRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    cancelledRef.current = true;
    if (recorderRef.current) {
      const recorder = recorderRef.current;
      recorder.onstop = null;
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
    setPhase("idle");
    setError("");
  }, [release]);

  // Microphone tracks, pending uploads and blob URLs must never survive a
  // new conversation, language change, tab unmount or permission failure.
  useEffect(() => {
    discard();
  }, [locale,resetRevision,discard]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden && recorderRef.current?.state === "recording") {
        // Keep the audio captured so far but release the microphone.
        try { recorderRef.current.stop(); } catch { release(); }
      }
    };
    document.addEventListener("visibilitychange",hidden);
    return () => {
      document.removeEventListener("visibilitychange",hidden);
      generationRef.current++;
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
  }, [release]);

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
    if (disabled || phase !== "idle") return;
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(t.unsupported);
      return;
    }
    const generation = ++generationRef.current;
    let stream:MediaStream|null = null;
    try {
      onBegin?.();
      stream = await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:true,noiseSuppression:true},video:false,
      });
      if (generation !== generationRef.current) { stopTracks(stream); return; }
      streamRef.current = stream;
      cancelledRef.current = false;
      const mime = supportedType();
      const recorder = new MediaRecorder(stream,mime ? {mimeType:mime} : undefined);
      recorderRef.current = recorder;
      const chunks:Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        if (generation !== generationRef.current) return;
        cancelledRef.current = true;
        release(); recorderRef.current = null;
        setPhase("idle"); setError(t.failed);
      };
      recorder.onstop = () => {
        release(); recorderRef.current = null;
        if (cancelledRef.current || generation !== generationRef.current) return;
        const type = recorder.mimeType.split(";")[0] || mime.split(";")[0] || "audio/webm";
        const blob = new Blob(chunks,{type});
        const length = Math.max(1,Math.round((Date.now()-startedRef.current)/1000));
        const recording = new File([blob],"voice-"+Date.now()+"."+fileExtension(type),{type});
        showFile(recording,length);
      };
      startedRef.current = Date.now();
      recorder.start(300);
      setSeconds(0);setPhase("recording");
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now()-startedRef.current)/1000);
        setSeconds(Math.min(elapsed,LIMIT_SECONDS));
        if (elapsed >= LIMIT_SECONDS && recorder.state === "recording") {
          try { recorder.stop(); } catch { release(); }
        }
      },250);
    } catch (e) {
      stopTracks(stream);
      if (generation !== generationRef.current) return;
      release(); recorderRef.current = null;
      setPhase("idle");
      setError(e instanceof DOMException && ["NotAllowedError","PermissionDeniedError"].includes(e.name)
        ? t.denied : t.failed);
    }
  };
  const stop = () => {
    if (recorderRef.current?.state === "recording") {
      try { recorderRef.current.stop(); } catch { release(); setError(t.failed); setPhase("idle"); }
    }
  };
  const send = async () => {
    if (disabled || !file || phase !== "ready") return;
    if (seconds > LIMIT_SECONDS) { setError(t.tooLarge); return; }
    const generation = ++generationRef.current;
    const abort = new AbortController();
    abortRef.current = abort;
    setError("");setPhase("sending");
    try {
      const body = new FormData();
      body.append("file",file,file.name);
      body.append("locale",locale);
      // Authenticated Ali uses its own existing free STT quota; guests retain the no-login allowance.
      if (accountAuthenticated) body.append("purpose","ali_chat");
      body.append("consent","yes");
      const response = await fetch("/api/holistic-support/audio-storyboard",{
        method:"POST",credentials:"same-origin",cache:"no-store",body,signal:abort.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || typeof result?.transcript?.text !== "string" ||
          !result.transcript.text.trim()) throw Error("VOICE_TRANSCRIPT_UNAVAILABLE");
      if (generation !== generationRef.current) return;
      const text = result.transcript.text.trim().slice(0,2000);
      if (!onSendTranscript(text,file,seconds)) {
        setPhase("ready");setError(t.busy);return;
      }
      discard(); // The parent keeps a separate local-only blob URL for playback.
    } catch {
      if (generation !== generationRef.current || abort.signal.aborted) return;
      setPhase("ready");setError(t.transcription);
    } finally {
      if (abortRef.current === abort) abortRef.current = null;
    }
  };

  return <>
    <button type="button" onClick={phase === "recording" ? stop : start}
      disabled={disabled || phase === "ready" || phase === "sending"}
      className={styles.mic} data-hh-voice-note-mic
      data-recording={phase === "recording" || undefined}
      aria-pressed={phase === "recording"} aria-label={phase === "recording" ? t.stop : t.start}
      title={phase === "recording" ? t.stop : t.start}>
      {phase === "recording" ? <Square size={16} fill="currentColor" aria-hidden="true"/> :
        <Mic size={20} aria-hidden="true"/>}
    </button>
    {(phase !== "idle" || error) && <div className={styles.panel} data-hh-voice-note-panel
      role="group" aria-label={t.start}>
      {phase === "recording" ? <div className={styles.row}>
        <span className={styles.live}><i aria-hidden="true"/>{t.record} · {durationLabel(seconds)}</span>
        <button type="button" onClick={stop} className={styles.primary} aria-label={t.stop}><Square size={15}/></button>
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
