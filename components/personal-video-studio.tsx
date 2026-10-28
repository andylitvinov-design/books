"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, ShieldCheck, UploadCloud } from "lucide-react";
import { MandalaFreeVideoStudio } from "@/components/mandala-free-video-studio";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./personal-video-studio.module.css";

type MicJob = {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  timer: number;
  cancelled: boolean;
};

const copy = {
  en: {
    badge: "FREE · NO BOT · NO AI CREDITS", title: "Your photo. Your voice. Your video.",
    intro: "Open this link from any Telegram chat. Choose your photo, record your voice or add an audio file, then create a moving personal video in the editor below.",
    audioTitle: "Your own voice", file: "Choose a voice note / audio file",
    record: "Record voice here", stop: "Finish voice recording", selected: "Selected recording",
    audioHelp: "Audio up to 15 MB and 1–60 seconds. MP3, M4A, WAV, OGG, Opus, AAC or WebM; Safari may not support Telegram OGG voice notes.",
    microphoneError: "Microphone not available. Open this page in Safari or Chrome, allow microphone permission or upload an audio file.",
    audioError: "Choose an audio recording smaller than 15 MB, or record it here.",
    photoError: "Choose JPG/PNG/WebP photo up to 10 MB. No upload to any server.",
    privacy: "Your original photo and voice stay on this device. Nothing is uploaded to Holistic House, an AI provider, a Telegram bot or a client record. Use only photos and voices you have permission to use.",
    share: "When your video is ready, choose Share to Telegram or save the file and attach it to any chat. This website never posts into groups automatically.",
    mandala: "Want a personal mandala and an original guided meditation instead?",
  },
  ru: {
    badge: "БЕСПЛАТНО · БЕЗ БОТА · БЕЗ AI-КРЕДИТОВ", title: "Ваше фото. Ваш голос. Ваш видеоролик.",
    intro: "Откройте эту ссылку из любого Telegram-чата. Выберите своё фото, запишите голос или добавьте аудио, затем создайте видеоролик в редакторе ниже.",
    audioTitle: "Ваш оригинальный голос", file: "Выбрать голосовое / аудиофайл",
    record: "Записать голос здесь", stop: "Завершить запись", selected: "Выбранная запись",
    audioHelp: "Аудио до 15 МБ, длительность 1–60 секунд. MP3, M4A, WAV, OGG, Opus, AAC или WebM. Safari может не поддерживать OGG-голосовые из Telegram.",
    microphoneError: "Микрофон недоступен. Откройте эту страницу в Safari или Chrome, разрешите запись или загрузите файл.",
    audioError: "Выберите аудиофайл до 15 МБ или запишите голос здесь.",
    photoError: "Выберите фото JPG/PNG/WebP до 10 МБ. Оно не загружается на сервер.",
    privacy: "Фото и голос остаются на устройстве. Ничего не загружается на Holistic House, к AI-провайдеру, в Telegram-бот или в клиентское досье. Используйте только разрешённые фото и голоса.",
    share: "Готовый ролик можно отправить через «Поделиться → Telegram» или сохранить файл и прикрепить его в любом чате. Сайт ничего не публикует в группы автоматически.",
    mandala: "Предпочитаете личную мандалу и авторскую видеомедитацию?",
  },
  es: {
    badge: "GRATIS · SIN BOT · SIN CRÉDITOS DE IA", title: "Tu foto. Tu voz. Tu vídeo.",
    intro: "Abre este enlace desde cualquier chat de Telegram. Elige tu foto, graba tu voz o añade audio y crea un vídeo animado en el editor de abajo.",
    audioTitle: "Tu voz original", file: "Elegir nota de voz / audio",
    record: "Grabar voz aquí", stop: "Terminar la grabación", selected: "Grabación elegida",
    audioHelp: "Audio de 1–60 segundos y hasta 15 MB. MP3, M4A, WAV, OGG, Opus, AAC o WebM. Safari puede no abrir notas OGG de Telegram.",
    microphoneError: "Micrófono no disponible. Abre Safari o Chrome, permite el micrófono o sube un archivo.",
    audioError: "Elige audio de hasta 15 MB o graba aquí.",
    photoError: "Elige JPG/PNG/WebP de hasta 10 MB. No se sube al servidor.",
    privacy: "Tu foto y voz permanecen en el dispositivo. No se envían a Holistic House, proveedores de IA, bots de Telegram o expedientes de clientes. Utiliza solo contenido con permiso.",
    share: "Cuando esté listo, comparte el vídeo a Telegram o guarda el archivo para adjuntarlo a cualquier chat. No se publica automáticamente en grupos.",
    mandala: "¿Prefieres un mandala personal y una meditación original?",
  },
} as const;

function micFormat(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
  return ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"]
    .find(mime => MediaRecorder.isTypeSupported(mime)) || "";
}

function finishMic(job: MicJob, cancelled: boolean) {
  job.cancelled = cancelled;
  window.clearTimeout(job.timer);
  if (job.recorder.state !== "inactive") job.recorder.stop();
  else job.stream.getTracks().forEach(track => track.stop());
}

export function PersonalVideoStudio({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const fileInput = useRef<HTMLInputElement>(null);
  const mic = useRef<MicJob | null>(null);
  const alive = useRef(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [voice, setVoice] = useState<File | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (mic.current) finishMic(mic.current, true);
    };
  }, []);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  useEffect(() => {
    if (!voice) { setVoiceUrl(null); return; }
    const url = URL.createObjectURL(voice);
    setVoiceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [voice]);

  function choosePhoto(file: File | null) {
    setPhotoError("");
    setPhoto(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        !file.size || file.size > 10_000_000) { setPhotoError(t.photoError); return; }
    setPhoto(URL.createObjectURL(file));
  }

  function chooseVoice(file: File | null) {
    setVoiceError("");
    setVoice(null);
    if (!file) return;
    if (!file.size || file.size > 15_000_000 ||
        !(/\.(mp3|m4a|mp4|wav|aac|ogg|opus|webm)$/i.test(file.name) || file.type.startsWith("audio/"))) {
      setVoiceError(t.audioError); return;
    }
    setVoice(file);
  }

  async function startMic() {
    if (mic.current) return;
    setVoice(null);
    setVoiceError("");
    let stream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw Error("unsupported");
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true }, video: false });
      if (!alive.current) { stream.getTracks().forEach(track => track.stop()); return; }
      const mimeType = micFormat();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const job: MicJob = { recorder, stream, chunks: [], cancelled: false, timer: 0 };
      mic.current = job;
      recorder.ondataavailable = event => {
        if (event.data.size) job.chunks.push(event.data);
        if (job.chunks.reduce((total, item) => total + item.size, 0) > 15_000_000)
          finishMic(job, true);
      };
      recorder.onerror = () => { setVoiceError(t.microphoneError); finishMic(job, true); };
      recorder.onstop = () => {
        window.clearTimeout(job.timer);
        job.stream.getTracks().forEach(track => track.stop());
        if (mic.current === job) mic.current = null;
        if (!alive.current) return;
        setRecording(false);
        if (job.cancelled || !job.chunks.length) return;
        const type = recorder.mimeType || mimeType || "audio/webm";
        const suffix = type.includes("mp4") ? "m4a" : "webm";
        chooseVoice(new File(job.chunks, "my-voice." + suffix, { type }));
      };
      recorder.start(200);
      setRecording(true);
      job.timer = window.setTimeout(() => finishMic(job, false), 60_000);
    } catch {
      stream?.getTracks().forEach(track => track.stop());
      if (mic.current && mic.current.stream === stream) mic.current = null;
      setRecording(false);
      setVoiceError(t.microphoneError);
    }
  }

  return <article className={styles.studio} data-personal-video-studio lang={locale}>
    <header className={styles.intro}>
      <small>{t.badge}</small><h1>{t.title}</h1><p>{t.intro}</p>
    </header>
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp"
      data-personal-video-photo className={styles.hiddenInput}
      onChange={e => { const file=e.currentTarget.files?.[0] || null; e.currentTarget.value=""; choosePhoto(file); }}/>
    <MandalaFreeVideoStudio locale={locale} frameUrl={photo} photoUrl={photo}
      onPickPhoto={() => fileInput.current?.click()} photoError={photoError}
      audioFile={voice} standalone
      voiceControls={
        <section className={styles.voicePanel} aria-label={t.audioTitle} data-personal-video-voice-panel>
          <h3><Mic size={20} aria-hidden="true"/>{t.audioTitle}</h3>
          <div className={styles.voiceButtons}>
            <label className={styles.upload}><UploadCloud size={17} aria-hidden="true"/>{t.file}
              <input type="file" accept="audio/*,.ogg,.opus,.m4a,.mp3,.wav,.aac,.webm"
                disabled={recording} data-personal-video-voice
                onChange={event => {
                  const file=event.currentTarget.files?.[0] || null;
                  event.currentTarget.value=""; chooseVoice(file);
                }}/>
            </label>
            <button type="button" data-personal-video-mic
              onClick={() => recording ? (mic.current && finishMic(mic.current,false)) : void startMic()}>
              {recording?<MicOff size={18} aria-hidden="true"/>:<Mic size={18} aria-hidden="true"/>}
              {recording?t.stop:t.record}
            </button>
          </div>
          <small>{t.audioHelp}</small>
          {voice && <div className={styles.voicePreview}>
            <strong>{t.selected}:</strong> {voice.name}
            {voiceUrl && <audio controls preload="metadata" src={voiceUrl}/>}
          </div>}
          {voiceError && <p className={styles.error} role="alert">{voiceError}</p>}
        </section>
      }/>
    <footer className={styles.footer}>
      <p><ShieldCheck size={18} aria-hidden="true"/>{t.privacy}</p>
      <p>{t.share}</p>
      <Link href={`/${locale}/holistic-support/mandala`}>{t.mandala}</Link>
    </footer>
  </article>;
}
