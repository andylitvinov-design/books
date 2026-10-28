"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Mic, MicOff, ShieldCheck, Upload, Video } from "lucide-react";

import { MandalaFreeVideoStudio } from "@/components/mandala-free-video-studio";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./personal-video-studio.module.css";

type MicSession = {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  timer: number;
  cancelled: boolean;
};

const translations = {
  en: {
    badge: "FREE · NO BOT · NO AI CREDITS",
    title: "Your photo. Your voice. Your video.",
    intro: "Open this link from any Telegram chat, add a photo and a voice recording, choose a moving scene and save your own short video. No account required.",
    stepPhoto: "1 · Add your photo", choosePhoto: "Choose a photo", replacePhoto: "Change photo", photoHint: "JPG, PNG or WebP · up to 10 MB", photoAlt: "Private photo preview",
    photoError: "Choose a valid JPG, PNG or WebP image up to 10 MB. Large or damaged images are not supported.",
    preparingPhoto: "Preparing your image on this device…", photoRights: "Use your own photograph, or one you have permission to use.",
    stepVoice: "2 · Add your own voice", voiceFile: "Choose an audio file", voiceHint: "MP3, M4A, WAV, AAC, OGG, Opus or WebM · up to 15 MB · maximum 60 seconds",
    record: "Record voice now", stop: "Stop and use recording", voiceReady: "Selected voice recording", voiceError: "Choose an audio file under 15 MB.",
    micError: "Cannot record on this device. Open the link in Safari/Chrome and allow microphone access, or upload an audio file.",
    voiceNote: "Telegram voice notes often use OGG/Opus, which iPhone Safari may not decode. If creation fails, record your voice here or export as MP3/M4A.",
    stepVideo: "3 · Choose a scene and create your video", help: "After recording finishes, use Share to select Telegram, or save the video and attach it in your chat.",
    privacy: "Everything is processed locally in this browser. No photo or voice is sent to Holistic House, AI services, CRM or Telegram without you taking an explicit action.",
    explore: "Prefer a mandala around your photo?",
  },
  ru: {
    badge: "БЕСПЛАТНО · БЕЗ БОТА · БЕЗ AI-КРЕДИТОВ",
    title: "Ваше фото. Ваш голос. Ваш видеоролик.",
    intro: "Откройте ссылку из любого Telegram-чата, добавьте фото и голос, выберите эффект и сохраните свой ролик. Регистрация не нужна.",
    stepPhoto: "1 · Добавьте своё фото", choosePhoto: "Выбрать фото", replacePhoto: "Заменить фото", photoHint: "JPG, PNG или WebP · до 10 МБ", photoAlt: "Приватный предпросмотр фотографии",
    photoError: "Выберите JPG, PNG или WebP до 10 МБ. Повреждённые или очень большие изображения не поддерживаются.",
    preparingPhoto: "Подготавливаем изображение на вашем устройстве…", photoRights: "Используйте собственное фото или фото с разрешения человека.",
    stepVoice: "2 · Добавьте собственный голос", voiceFile: "Выбрать аудиофайл", voiceHint: "MP3, M4A, WAV, AAC, OGG, Opus или WebM · до 15 МБ · максимум 60 секунд",
    record: "Записать голос здесь", stop: "Остановить и использовать запись", voiceReady: "Выбранная голосовая запись", voiceError: "Выберите аудиофайл размером до 15 МБ.",
    micError: "Не удаётся записать звук. Откройте ссылку в Safari/Chrome, разрешите микрофон или загрузите аудиофайл.",
    voiceNote: "Голосовые Telegram часто используют OGG/Opus, который Safari на iPhone может не читать. Если появится ошибка, запишите голос здесь или используйте MP3/M4A.",
    stepVideo: "3 · Выберите эффект и создайте ролик", help: "Когда запись завершится, нажмите «Поделиться» и выберите Telegram. Или сохраните видео и прикрепите его в чате.",
    privacy: "Всё обрабатывается в вашем браузере. Фото и голос не отправляются на Holistic House, в AI, CRM или Telegram без вашего отдельного действия.",
    explore: "Хотите мандалу вокруг фотографии?",
  },
  es: {
    badge: "GRATIS · SIN BOT · SIN CRÉDITOS DE IA",
    title: "Tu foto. Tu voz. Tu vídeo.",
    intro: "Abre este enlace desde cualquier chat de Telegram, añade tu foto y tu voz, elige una escena y guarda tu vídeo. No hace falta registrarse.",
    stepPhoto: "1 · Añade tu foto", choosePhoto: "Elegir foto", replacePhoto: "Cambiar foto", photoHint: "JPG, PNG o WebP · hasta 10 MB", photoAlt: "Vista privada de la foto",
    photoError: "Elige una imagen JPG, PNG o WebP de hasta 10 MB. No se aceptan archivos dañados o enormes.",
    preparingPhoto: "Preparando la imagen en este dispositivo…", photoRights: "Usa tu foto o una fotografía que tengas permiso para utilizar.",
    stepVoice: "2 · Añade tu voz", voiceFile: "Elegir audio", voiceHint: "MP3, M4A, WAV, AAC, OGG, Opus o WebM · hasta 15 MB · máximo 60 segundos",
    record: "Grabar voz ahora", stop: "Detener y usar grabación", voiceReady: "Grabación seleccionada", voiceError: "Elige un archivo de audio de hasta 15 MB.",
    micError: "No se puede grabar aquí. Abre Safari/Chrome y permite el micrófono o carga un archivo de audio.",
    voiceNote: "Telegram suele usar OGG/Opus, que Safari en iPhone a veces no decodifica. Si falla, graba aquí o usa MP3/M4A.",
    stepVideo: "3 · Elige una escena y crea tu vídeo", help: "Al terminar, toca Compartir y elige Telegram, o guarda el vídeo y adjúntalo a tu chat.",
    privacy: "Todo se procesa en este navegador. No se envía tu foto ni voz a Holistic House, IA, CRM o Telegram sin una acción explícita tuya.",
    explore: "¿Prefieres un mandala alrededor de tu foto?",
  },
} as const;

function audioMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"]
    .find(type => MediaRecorder.isTypeSupported(type)) ?? "";
}

function endMic(session: MicSession, cancel: boolean) {
  session.cancelled = cancel;
  window.clearTimeout(session.timer);
  if (session.recorder.state !== "inactive") session.recorder.stop();
  else session.stream.getTracks().forEach(track => track.stop());
}

export function PersonalVideoStudio({ locale }: { locale: PublicLocale }) {
  const t = translations[locale];
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoIdentity, setPhotoIdentity] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [voice, setVoice] = useState<File | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const [micRecording, setMicRecording] = useState(false);
  const requestRef = useRef(0);
  const aliveRef = useRef(false);
  const micRef = useRef<MicSession | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      requestRef.current++;
      if (micRef.current) endMic(micRef.current, true);
    };
  }, []);

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  useEffect(() => {
    if (!voice) { setVoiceUrl(null); return; }
    const url = URL.createObjectURL(voice);
    setVoiceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [voice]);

  async function choosePhoto(file: File | null) {
    const request = ++requestRef.current;
    setPhotoUrl(null);
    setPhotoIdentity(null);
    setPhotoName("");
    setPhotoError("");
    if (!file) { setPhotoBusy(false); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        !file.size || file.size > 10_000_000) { setPhotoError(t.photoError); return; }
    setPhotoBusy(true);
    let image: ImageBitmap | null = null;
    try {
      image = await createImageBitmap(file);
      if (image.width < 100 || image.height < 100 ||
          image.width > 10000 || image.height > 10000) throw new Error("invalid");
      const canvas = document.createElement("canvas");
      canvas.width = 900;
      canvas.height = 900;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("canvas");
      ctx.fillStyle = "#213a31";
      ctx.fillRect(0, 0, 900, 900);
      const cover = Math.max(900 / image.width, 900 / image.height);
      ctx.globalAlpha = 0.3;
      ctx.drawImage(image, (900 - image.width * cover) / 2,
        (900 - image.height * cover) / 2, image.width * cover, image.height * cover);
      ctx.globalAlpha = 1;
      const contain = Math.min(840 / image.width, 840 / image.height);
      const w = image.width * contain;
      const h = image.height * contain;
      ctx.drawImage(image, (900 - w) / 2, (900 - h) / 2, w, h);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.87));
      if (!blob) throw new Error("canvas");
      const url = URL.createObjectURL(blob);
      if (request !== requestRef.current || !aliveRef.current) {
        URL.revokeObjectURL(url);
        return;
      }
      setPhotoUrl(url);
      setPhotoIdentity(crypto.randomUUID());
      setPhotoName(file.name);
    } catch {
      if (request === requestRef.current && aliveRef.current) setPhotoError(t.photoError);
    } finally {
      image?.close();
      if (request === requestRef.current && aliveRef.current) setPhotoBusy(false);
    }
  }

  function chooseVoice(file: File | null) {
    setVoiceError("");
    setVoice(null);
    if (!file) return;
    if (!file.size || file.size > 15_000_000 ||
        !(/\.(mp3|m4a|wav|aac|ogg|opus|webm|mp4)$/i.test(file.name) || file.type.startsWith("audio/"))) {
      setVoiceError(t.voiceError);
      return;
    }
    setVoice(file);
  }

  function stopVoice(cancel = false) {
    const session = micRef.current;
    if (session) endMic(session, cancel);
  }

  async function startVoice() {
    if (micRef.current) return;
    setVoiceError("");
    setVoice(null);
    let stream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
        throw new Error("unsupported");
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true }, video: false });
      if (!aliveRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      const mimeType = audioMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const session: MicSession = { recorder, stream, chunks: [], cancelled: false, timer: 0 };
      micRef.current = session;
      recorder.ondataavailable = event => { if (event.data.size) session.chunks.push(event.data); };
      recorder.onerror = () => { setVoiceError(t.micError); stopVoice(true); };
      recorder.onstop = () => {
        window.clearTimeout(session.timer);
        session.stream.getTracks().forEach(track => track.stop());
        if (micRef.current === session) micRef.current = null;
        if (!aliveRef.current) return;
        setMicRecording(false);
        if (!session.cancelled && session.chunks.length) {
          const type = recorder.mimeType || mimeType || "audio/webm";
          const extension = type.includes("mp4") ? "m4a" : "webm";
          chooseVoice(new File(session.chunks, "my-voice." + extension, { type }));
        }
      };
      recorder.start(250);
      setMicRecording(true);
      session.timer = window.setTimeout(() => endMic(session, false), 60_000);
    } catch {
      stream?.getTracks().forEach(track => track.stop());
      setMicRecording(false);
      setVoiceError(t.micError);
    }
  }

  return (
    <div className={styles.studio} data-personal-video-studio>
      <header className={styles.hero}>
        <p className={styles.eyebrow}><Video size={16} aria-hidden="true" />{t.badge}</p>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </header>
      <div className={styles.inputs}>
        <section className={styles.panel} aria-label={t.stepPhoto}>
          <h2><ImagePlus size={20} aria-hidden="true" />{t.stepPhoto}</h2>
          <label className={styles.fileButton}>
            <Upload size={18} aria-hidden="true" />{photoUrl ? t.replacePhoto : t.choosePhoto}
            <input type="file" accept="image/jpeg,image/png,image/webp"
              disabled={photoBusy} data-personal-video-photo
              onChange={event => {
                const selected = event.currentTarget.files?.[0] ?? null;
                event.currentTarget.value = "";
                void choosePhoto(selected);
              }} />
          </label>
          <small>{t.photoHint}</small>
          {photoBusy && <p role="status">{t.preparingPhoto}</p>}
          {photoUrl && <figure className={styles.photoPreview}>
            <Image src={photoUrl} alt={t.photoAlt} width={900} height={900} unoptimized />
            <figcaption>{photoName}</figcaption>
          </figure>}
          {photoError && <p className={styles.error} role="alert">{photoError}</p>}
          <p className={styles.hint}><ShieldCheck size={15} aria-hidden="true" />{t.photoRights}</p>
        </section>
        <section className={styles.panel} aria-label={t.stepVoice}>
          <h2><Mic size={20} aria-hidden="true" />{t.stepVoice}</h2>
          <label className={styles.fileButton}>
            <Upload size={18} aria-hidden="true" />{t.voiceFile}
            <input type="file" accept="audio/*,.ogg,.opus,.m4a,.mp3,.wav,.aac,.webm"
              disabled={micRecording} data-personal-video-voice
              onChange={event => {
                const selected = event.currentTarget.files?.[0] ?? null;
                event.currentTarget.value = "";
                chooseVoice(selected);
              }} />
          </label>
          <button type="button" className={styles.micButton} data-personal-video-mic
            onClick={() => micRecording ? stopVoice(false) : void startVoice()}>
            {micRecording ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
            {micRecording ? t.stop : t.record}
          </button>
          <small>{t.voiceHint}</small>
          {voice && <div className={styles.voicePreview}>
            <strong>{t.voiceReady}:</strong> {voice.name}
            {voiceUrl && <audio controls preload="metadata" src={voiceUrl} />}
          </div>}
          {voiceError && <p className={styles.error} role="alert">{voiceError}</p>}
          <p className={styles.hint}>{t.voiceNote}</p>
        </section>
      </div>
      <div className={styles.videoArea}>
        <h2 className={styles.videoHeading}>{t.stepVideo}</h2>
        <MandalaFreeVideoStudio locale={locale} frameUrl={photoUrl}
          photoIdentity={photoIdentity} audioFile={voice} standalone />
        <p className={styles.afterHelp}>{t.help}</p>
      </div>
      <footer className={styles.footer}>
        <p><ShieldCheck size={17} aria-hidden="true" />{t.privacy}</p>
        <Link href={`/${locale}/holistic-support/mandala`}>{t.explore}</Link>
      </footer>
    </div>
  );
}
