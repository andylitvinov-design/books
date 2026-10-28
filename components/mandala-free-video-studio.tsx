"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Film, Pause, Play, Sparkles, Square, X } from "lucide-react";
import { moneyScenes, paintMoneyScene } from "@/lib/mandala/money-flow-effects";
import type { MoneySceneId } from "@/lib/mandala/money-flow-effects";

import type { PublicLocale } from "@/lib/public-locales";
import styles from "./mandala-meditation.module.css";

type Effect = "glow" | "energy" | "prosperity" | "temple";
type Aspect = "square" | "portrait";
type Result = { url: string; extension: "mp4" | "webm"; bytes: number };
type Job = {
  recorder: MediaRecorder;
  stream: MediaStream;
  animation: number;
  timeout: number;
  cancelled: boolean;
};

const translations = {
  en: {
    heading: "Your free personal video",
    description: "Animate this mandala and your photo without an AI subscription.",
    moneyHeading: "Money flow · 12 visual stories", moneyIntro: "Choose a symbolic flow around your own photograph. Four favourites first.",
    allMoney: "See all 12 looks", lessMoney: "Show four favourites", moneyNote: "A creative attention exercise, not a promise of income.",
    previewPlay: "Preview movement", previewPause: "Pause preview",
    effect: "Animation", effects: ["Golden light", "Energy flow", "Prosperity symbols", "Temple glow"],
    aspect: "Format", square: "Square · 1:1", portrait: "Vertical · 9:16",
    duration: "Duration", seconds: "sec",
    generate: "Create my free video", creating: "Recording on this device…",
    preparing: "Preparing your image…", ready: "Video ready. Save it to your device.",
    download: "Save video", cancel: "Cancel recording",
    imagePending: "The mandala image is being prepared. Choose your photo and wait for the preview.",
    unsupported: "This browser cannot record a canvas video. You can still save the PNG above. Try an updated Safari or Chrome for video.",
    failed: "Video creation failed or there was not enough memory. Try 10 seconds or a different browser.",
    privacy: "Free · processed only in your browser · no upload or account storage. Silent video; original guided recordings remain separate. Only use client photos with their permission.",
    formatHint: "MP4 or WebM depending on browser. On iPhone you can open the result and use Share → Save to Files.",
    preparingResult: "Recording…",
  },
  ru: {
    heading: "Ваше бесплатное личное видео",
    description: "Оживите мандалу и фотографию без подписки на нейросеть.",
    moneyHeading: "Денежный поток · 12 сюжетов", moneyIntro: "Выберите движение золотого света вокруг своего фото. Сначала четыре популярных.",
    allMoney: "Показать все 12 вариантов", lessMoney: "Свернуть до четырёх", moneyNote: "Образная практика внимания, не обещание заработка.",
    previewPlay: "Посмотреть движение", previewPause: "Пауза",
    effect: "Эффект", effects: ["Золотой свет", "Поток энергии", "Символы процветания", "Сияние храма"],
    aspect: "Формат", square: "Квадрат · 1:1", portrait: "Вертикальный · 9:16",
    duration: "Длительность", seconds: "сек",
    generate: "Создать видео бесплатно", creating: "Запись на вашем устройстве…",
    preparing: "Подготавливаем изображение…", ready: "Видео готово. Сохраните его на устройство.",
    download: "Сохранить видео", cancel: "Отменить запись",
    imagePending: "Мандала ещё подготавливается. Выберите фото и дождитесь изображения.",
    unsupported: "Этот браузер не умеет записывать видео с холста. PNG можно сохранить выше. Для видео попробуйте обновлённый Safari или Chrome.",
    failed: "Не удалось создать видео или не хватило памяти. Попробуйте 10 секунд или другой браузер.",
    privacy: "Бесплатно · только в вашем браузере · без загрузки и сохранения в аккаунт. Видео без звука; авторские медитации отдельно. Используйте фото клиента только с его разрешения.",
    formatHint: "MP4 или WebM в зависимости от браузера. На iPhone откройте результат и выберите «Поделиться» → «Сохранить в Файлы».",
    preparingResult: "Запись…",
  },
  es: {
    heading: "Tu vídeo personal gratis",
    description: "Anima el mandala y tu foto sin pagar una suscripción de IA.",
    moneyHeading: "Flujo de prosperidad · 12 escenas", moneyIntro: "Elige un movimiento simbólico alrededor de tu foto. Cuatro favoritos primero.",
    allMoney: "Ver las 12 escenas", lessMoney: "Mostrar cuatro favoritos", moneyNote: "Una práctica simbólica, no una promesa de ingresos.",
    previewPlay: "Ver movimiento", previewPause: "Pausar vista previa",
    effect: "Animación", effects: ["Luz dorada", "Flujo de energía", "Símbolos de prosperidad", "Luz del templo"],
    aspect: "Formato", square: "Cuadrado · 1:1", portrait: "Vertical · 9:16",
    duration: "Duración", seconds: "seg",
    generate: "Crear vídeo gratis", creating: "Grabando en este dispositivo…",
    preparing: "Preparando la imagen…", ready: "Vídeo listo. Guárdalo en tu dispositivo.",
    download: "Guardar vídeo", cancel: "Cancelar grabación",
    imagePending: "Se está preparando el mandala. Elige una foto y espera la vista previa.",
    unsupported: "Este navegador no permite grabar vídeo desde el lienzo. Puedes guardar la imagen PNG arriba. Prueba Safari o Chrome actualizado.",
    failed: "No se pudo crear el vídeo o falta memoria. Prueba 10 segundos u otro navegador.",
    privacy: "Gratis · procesado solo en tu navegador · sin subir ni guardar en tu cuenta. Vídeo sin sonido; las meditaciones están aparte. Usa fotos de clientes solo con su permiso.",
    formatHint: "MP4 o WebM según tu navegador. En iPhone abre el resultado y usa Compartir → Guardar en Archivos.",
    preparingResult: "Grabando…",
  },
} as const;

const effects: Effect[] = ["glow", "energy", "prosperity", "temple"];
const durations = [10, 20, 30] as const;

function chooseMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const supported = [
    "video/mp4;codecs=avc1.42E01E", "video/mp4",
    "video/webm;codecs=vp8", "video/webm",
  ];
  return supported.find(mime => MediaRecorder.isTypeSupported(mime)) || "";
}

function loadLocalImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => image.naturalWidth ? resolve(image) : reject(new Error("Invalid image"));
    image.onerror = () => reject(new Error("Image not available"));
    image.src = url;
  });
}

// Fixed deterministic geometry gives motion without network imagery, AI credits,
// external services or third-party assets. The original user photograph is
// already composited in the local mandala PNG; no pixel is transmitted.
function paint(
  ctx: CanvasRenderingContext2D, art: HTMLImageElement,
  effect: Effect, time: number, aspect: Aspect, moneyScene: MoneySceneId | null,
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const size = width * 0.96;
  const left = centerX - size / 2;
  const top = centerY - size / 2;
  const gold = effect === "energy" ? "116,222,187" : "246,205,130";

  ctx.fillStyle = "#1d302b";
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, height * 0.68);
  glow.addColorStop(0, "rgba(202,171,111,.32)");
  glow.addColorStop(1, "rgba(15,29,26,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Calm motion is outside the central portrait and does not alter identity.
  ctx.save();
  ctx.shadowColor = "rgba(" + gold + ",.45)";
  ctx.shadowBlur = 15;
  ctx.drawImage(art, left, top, size, size);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 48; i++) {
    const orbit = i * 2.399963 + time * (effect === "energy" ? 0.17 : 0.08);
    const radius = width * (0.23 + 0.22 * ((i * 17) % 13) / 13);
    const drift = Math.sin(time * 0.8 + i * 1.3) * 14;
    const x = centerX + Math.cos(orbit) * (radius + drift);
    const y = centerY + Math.sin(orbit) * (radius + drift);
    const alpha = 0.28 + 0.4 * (0.5 + 0.5 * Math.sin(time * 1.8 + i));
    ctx.fillStyle = "rgba(" + gold + "," + alpha.toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 2.2;
  if (effect === "energy" || effect === "glow") {
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = "rgba(" + gold + "," + (0.14 + i * 0.07) + ")";
      ctx.beginPath();
      const radius = width * (0.35 + i * 0.045) + Math.sin(time * 0.65 + i) * 11;
      ctx.ellipse(centerX, centerY, radius, radius, time * 0.07, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (effect === "prosperity") {
    const symbols = ["✧", "€", "✦", "✧"];
    for (let i = 0; i < 13; i++) {
      const x = width * (0.07 + (i * 0.193) % 0.86);
      const y = ((i * 157 + time * (20 + i % 5 * 3)) % (height + 100)) - 50;
      ctx.font = (18 + i % 4 * 5) + "px Georgia,serif";
      ctx.fillStyle = "rgba(250,215,146,.55)";
      ctx.fillText(symbols[i % symbols.length], x, y);
    }
  }
  if (effect === "temple") {
    ctx.strokeStyle = "rgba(247,220,168,.45)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const opening = width * (0.44 + i * 0.045);
      ctx.beginPath();
      ctx.moveTo(centerX - opening, height * 0.9);
      ctx.lineTo(centerX - opening, height * 0.14);
      ctx.quadraticCurveTo(centerX, -height * 0.08 + i * 12, centerX + opening, height * 0.14);
      ctx.lineTo(centerX + opening, height * 0.9);
      ctx.stroke();
    }
  }
  ctx.restore();
  if (moneyScene) paintMoneyScene(ctx, moneyScene, time);
  if (aspect === "portrait") {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(244,219,169,.85)";
    ctx.font = "32px Georgia,serif";
    ctx.fillText("✧  H O L I S T I C   H O U S E  ✧", centerX, height * 0.19, width - 40);
    ctx.fillStyle = "rgba(253,243,221,.65)";
    ctx.font = "24px Georgia,serif";
    ctx.fillText("✦   ✦   ✦", centerX, height * 0.86);
  }
}

function stopJob(job: Job, cancelled: boolean) {
  job.cancelled = cancelled;
  window.cancelAnimationFrame(job.animation);
  window.clearTimeout(job.timeout);
  if (job.recorder.state !== "inactive") job.recorder.stop();
  else job.stream.getTracks().forEach(track => track.stop());
}

export function MandalaFreeVideoStudio({ locale, frameUrl }: {
  locale: PublicLocale; frameUrl: string | null;
}) {
  const t = translations[locale];
  const [effect, setEffect] = useState<Effect>("glow");
  const [moneyScene, setMoneyScene] = useState<MoneySceneId | null>(null);
  const [showAllMoney, setShowAllMoney] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [aspect, setAspect] = useState<Aspect>("portrait");
  const [duration, setDuration] = useState<(typeof durations)[number]>(10);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jobRef = useRef<Job | null>(null);
  const aliveRef = useRef(false);
  const sourceRef = useRef(frameUrl);
  sourceRef.current = frameUrl;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      const job = jobRef.current;
      if (job) {
        stopJob(job, true);
        job.stream.getTracks().forEach(track => track.stop());
        jobRef.current = null;
      }
    };
  }, []);

  useEffect(() => () => {
    if (result?.url) URL.revokeObjectURL(result.url);
  }, [result]);

  // Invalidate the result when the client photo, composition or preset changes.
  // Never leave a previous client's exported video visible after replacement.
  useEffect(() => {
    const job = jobRef.current;
    if (job) stopJob(job, true);
    setResult(null);
    setNotice("");
  }, [frameUrl, effect, moneyScene, aspect, duration]);

  // No autoplay: paint a still scene, and animate only while a visitor
  // deliberately chooses preview. Throttle to ~12 fps on mobile Safari.
  useEffect(() => {
    if (!frameUrl || jobRef.current) return;
    let cancelled = false;
    let animation = 0;
    let startedAt = 0;
    let lastFrame = -1000;
    void loadLocalImage(frameUrl).then(image => {
      if (cancelled || jobRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = aspect === "portrait" ? 540 : 540;
      canvas.height = aspect === "portrait" ? 960 : 540;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;
      paint(ctx, image, effect, 0, aspect, moneyScene);
      if (!previewPlaying) return;
      const draw = (now: number) => {
        if (cancelled || jobRef.current) return;
        if (!startedAt) startedAt = now;
        if (now - lastFrame >= 80 && !document.hidden) {
          paint(ctx, image, effect, (now - startedAt) / 1000, aspect, moneyScene);
          lastFrame = now;
        }
        animation = window.requestAnimationFrame(draw);
      };
      animation = window.requestAnimationFrame(draw);
    }).catch(() => { /* PNG preparation can be retried in the parent editor. */ });
    return () => { cancelled = true; window.cancelAnimationFrame(animation); };
  }, [frameUrl, effect, moneyScene, aspect, previewPlaying]);

  async function createVideo() {
    if (!frameUrl || jobRef.current || recording) return;
    const snapshot = frameUrl;
    setNotice(t.preparing);
    setResult(null);
    let stream: MediaStream | null = null;
    try {
      const image = await loadLocalImage(snapshot);
      if (sourceRef.current !== snapshot || !aliveRef.current) return;
      setPreviewPlaying(false);
      const canvas = canvasRef.current;
      if (!canvas || typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined") {
        setNotice(t.unsupported);
        return;
      }
      canvas.width = 540;
      canvas.height = aspect === "portrait" ? 960 : 540;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Canvas unsupported");
      paint(ctx, image, effect, 0, aspect, moneyScene);
      stream = canvas.captureStream(15);
      if (!stream.getVideoTracks().length) throw new Error("Canvas stream unavailable");

      const mimeType = chooseMime();
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 1_400_000,
      });
      const chunks: Blob[] = [];
      const job: Job = { recorder, stream, animation: 0, timeout: 0, cancelled: false };
      jobRef.current = job;

      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        job.cancelled = true;
        if (aliveRef.current) setNotice(t.failed);
      };
      recorder.onstop = () => {
        job.stream.getTracks().forEach(track => track.stop());
        if (jobRef.current === job) jobRef.current = null;
        if (!aliveRef.current) return;
        setRecording(false);
        if (job.cancelled) return;
        const type = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunks, { type });
        if (!blob.size) {
          setNotice(t.failed);
          return;
        }
        setResult({
          url: URL.createObjectURL(blob),
          extension: type.includes("mp4") ? "mp4" : "webm",
          bytes: blob.size,
        });
        setNotice(t.ready);
      };

      // This user-triggered browser recorder never contacts a backend.
      recorder.start(500);
      const start = performance.now();
      let lastFrame = -1000;
      const animate = (now: number) => {
        if (jobRef.current !== job || job.recorder.state !== "recording") return;
        if (now - lastFrame >= 1000 / 15) {
          paint(ctx, image, effect, Math.min(duration, (now - start) / 1000), aspect, moneyScene);
          lastFrame = now;
        }
        job.animation = requestAnimationFrame(animate);
      };
      job.animation = requestAnimationFrame(animate);
      job.timeout = window.setTimeout(() => stopJob(job, false), duration * 1000);
      setRecording(true);
      setNotice(t.creating);
    } catch {
      if (stream) stream.getTracks().forEach(track => track.stop());
      jobRef.current = null;
      setRecording(false);
      setNotice(t.failed);
    }
  }

  return (
    <section className={styles.freeVideoPanel} data-mandala-free-video aria-label={t.heading}>
      <h2><Film size={21} aria-hidden="true" />{t.heading}<span className={styles.freeVideoBadge}>$0</span></h2>
      <p className={styles.freeVideoIntro}>{t.description}</p>
      <div className={styles.freeVideoPreview}>
        <canvas ref={canvasRef} width={540} height={960} aria-label={t.heading}
          style={{ aspectRatio: aspect === "portrait" ? "9 / 16" : "1 / 1", display: result ? "none" : "block" }} />
        {result && <video src={result.url} controls playsInline preload="metadata" data-mandala-video-preview />}
      </div>
      <section className={styles.moneyFlowSection} data-mandala-money-effects aria-label={t.moneyHeading}>
        <h3>{t.moneyHeading}</h3>
        <p>{t.moneyIntro}</p>
        <div className={styles.moneyFlowGrid}>
          {moneyScenes.slice(0, showAllMoney ? moneyScenes.length : 4).map((scene, index) => (
            <button type="button" key={scene.id} data-mandala-money-option={scene.id}
              disabled={recording} aria-pressed={moneyScene === scene.id}
              onClick={() => { setMoneyScene(scene.id); setPreviewPlaying(false); }}>
              <span className={styles.moneyFlowIcon} aria-hidden="true">
                <span>{scene.symbol}</span><small>{index + 1}</small>
              </span>
              <span>{scene.label[locale]}</span>
            </button>
          ))}
        </div>
        <div className={styles.moneyFlowToolbar}>
          <button type="button" className={styles.moneyFlowExpand}
            disabled={recording} aria-expanded={showAllMoney} onClick={() => setShowAllMoney(value => !value)}>
            {showAllMoney ? t.lessMoney : t.allMoney}
          </button>
          <button type="button" className={styles.moneyFlowPreviewButton}
            data-mandala-money-preview disabled={recording || !frameUrl}
            aria-pressed={previewPlaying}
            onClick={() => setPreviewPlaying(value => !value)}>
            {previewPlaying ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            {previewPlaying ? t.previewPause : t.previewPlay}
          </button>
        </div>
        <p className={styles.moneyFlowNote}>{t.moneyNote}</p>
      </section>
      <fieldset className={styles.freeVideoFieldset} disabled={recording}>
        <legend>{t.effect}</legend>
        <div className={styles.freeVideoOptions}>
          {effects.map((option, index) => (
            <button type="button" key={option} aria-pressed={effect === option}
              onClick={() => { setMoneyScene(null); setEffect(option); setPreviewPlaying(false); }}>{t.effects[index]}</button>
          ))}
        </div>
      </fieldset>
      <div className={styles.freeVideoSettings}>
        <fieldset className={styles.freeVideoFieldset} disabled={recording}>
          <legend>{t.aspect}</legend>
          <div className={styles.freeVideoOptions}>
            <button type="button" aria-pressed={aspect === "square"} onClick={() => setAspect("square")}><Square size={14} aria-hidden="true" />{t.square}</button>
            <button type="button" aria-pressed={aspect === "portrait"} onClick={() => setAspect("portrait")}>{t.portrait}</button>
          </div>
        </fieldset>
        <fieldset className={styles.freeVideoFieldset} disabled={recording}>
          <legend>{t.duration}</legend>
          <div className={styles.freeVideoOptions}>
            {durations.map(seconds => <button type="button" key={seconds} aria-pressed={duration === seconds}
              onClick={() => setDuration(seconds)}>{seconds} {t.seconds}</button>)}
          </div>
        </fieldset>
      </div>
      {recording ? (
        <button type="button" className={styles.freeVideoAction} onClick={() => {
          const job = jobRef.current;
          if (job) stopJob(job, true);
          setNotice("");
        }}><X size={17} aria-hidden="true" />{t.cancel}</button>
      ) : (
        <button type="button" className={styles.freeVideoAction} disabled={!frameUrl}
          onClick={createVideo} data-mandala-video-generate>
          <Sparkles size={17} aria-hidden="true" />{t.generate}
        </button>
      )}
      {!frameUrl ? <p className={styles.freeVideoNotice}>{t.imagePending}</p> : null}
      {notice ? <p className={styles.freeVideoNotice} role="status" aria-live="polite">{notice}</p> : null}
      {result && <a href={result.url} className={styles.freeVideoDownload}
        download={"holistic-house-personal-mandala." + result.extension} data-mandala-video-download>
        <Download size={18} aria-hidden="true" />{t.download} · {Math.max(1, Math.round(result.bytes / 1024))} KB
      </a>}
      <p className={styles.freeVideoPrivacy}>{t.privacy}</p>
      <p className={styles.freeVideoPrivacy}>{t.formatHint}</p>
    </section>
  );
}
