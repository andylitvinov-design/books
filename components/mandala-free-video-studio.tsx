"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Film, Pause, Play, Sparkles, Square, X } from "lucide-react";
import { moneyScenes } from "@/lib/mandala/money-flow-effects";
import { paintCinematicMoneyFrame } from "@/lib/mandala/cinematic-money-video";
import type { MoneySceneId } from "@/lib/mandala/money-flow-effects";

import type { PublicLocale } from "@/lib/public-locales";
import styles from "./mandala-meditation.module.css";

type Effect = "glow" | "energy" | "prosperity" | "temple";
type Aspect = "square" | "portrait" | "landscape";
type Quality = "hd" | "fullhd";
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
    heading: "Your cinematic personal video",
    description: "A large personal portrait, golden coins with depth and luminous moving scenery. Record a real video locally without AI fees.",
    photoNote: "Your photograph stays still; coins and scenery move. A clear portrait or transparent PNG looks best.",
    quality: "Video quality", hd: "HD · 720p (faster)", fullhd: "Full HD · 1080p",
    landscape: "Wide · 16:9",
    moneyHeading: "12 moving money-flow video templates", moneyIntro: "Tap a video card to watch it move and apply that exact scene to your personal clip. Swipe for other looks.",
    allMoney: "See all 12 looks", lessMoney: "Show four favourites", moneyNote: "A creative attention exercise, not a promise of income.",
    previewPlay: "Preview movement", previewPause: "Pause preview",
    clipPlay: "Tap to play scene", clipPause: "Pause scene", clipReady: "Moving preview",
    renderMode: "Video template format", withPortrait: "With my photo", backgroundOnly: "Background video only",
    backgroundHint: "Save a moving scene without a portrait to place behind your own footage in any editor.",
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
    heading: "Ваше кинематографичное личное видео",
    description: "Крупный портрет, объёмные золотые монеты, светящиеся пейзажи и настоящее движение в видео. Бесплатная запись на устройстве.",
    photoNote: "Фото остаётся неподвижным, движутся монеты и окружение. Лучше подходит портрет или PNG без фона.",
    quality: "Качество видео", hd: "HD · 720p (быстрее)", fullhd: "Full HD · 1080p",
    landscape: "Горизонтальный · 16:9",
    moneyHeading: "12 видеошаблонов «Денежный поток»", moneyIntro: "Нажмите на видеокарточку: начнётся движение, а выбранная сцена попадёт в ваш ролик. Листайте варианты свайпом.",
    allMoney: "Показать все 12 вариантов", lessMoney: "Свернуть до четырёх", moneyNote: "Образная практика внимания, не обещание заработка.",
    previewPlay: "Посмотреть движение", previewPause: "Пауза",
    clipPlay: "Нажмите для видео", clipPause: "Пауза видео", clipReady: "Видео в движении",
    renderMode: "Формат видеошаблона", withPortrait: "С моей фотографией", backgroundOnly: "Только видеофон",
    backgroundHint: "Сохраните движущийся фон без портрета, чтобы подложить его под своё видео в редакторе.",
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
    heading: "Tu vídeo personal cinematográfico",
    description: "Retrato grande, monedas doradas con profundidad y paisajes luminosos en movimiento. Graba un vídeo real gratis en tu dispositivo.",
    photoNote: "Tu foto permanece inmóvil; se mueven las monedas y el entorno. Usa un retrato claro o un PNG sin fondo.",
    quality: "Calidad de vídeo", hd: "HD · 720p (más rápido)", fullhd: "Full HD · 1080p",
    landscape: "Horizontal · 16:9",
    moneyHeading: "12 plantillas de vídeo en movimiento", moneyIntro: "Toca una tarjeta para ver movimiento y aplicar esa escena a tu vídeo. Desliza para ver más.",
    allMoney: "Ver las 12 escenas", lessMoney: "Mostrar cuatro favoritos", moneyNote: "Una práctica simbólica, no una promesa de ingresos.",
    previewPlay: "Ver movimiento", previewPause: "Pausar vista previa",
    clipPlay: "Toca para ver el vídeo", clipPause: "Pausar vídeo", clipReady: "Vista en movimiento",
    renderMode: "Formato de plantilla", withPortrait: "Con mi foto", backgroundOnly: "Solo fondo de vídeo",
    backgroundHint: "Guarda un fondo animado sin retrato para colocarlo detrás de tu propio vídeo en un editor.",
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

function formatDimensions(aspect: Aspect, quality: Quality): [number, number] {
  const edge = quality === "fullhd" ? 1080 : 720;
  if (aspect === "square") return [edge, edge];
  if (aspect === "landscape") return [Math.round(edge * 16 / 9), edge];
  return [edge, Math.round(edge * 16 / 9)];
}

// Every selectable scene is a *real, animated* preview of the very same
// Canvas footage used in the downloaded file. Only one selected card runs,
// after an explicit user tap. The other cards remain rich cinematic stills.
// This avoids twelve simultaneous decoders, battery drain and autoplay.
function CinematicSceneThumbnail({ scene, photo, title, playing }: {
  scene: MoneySceneId; photo: HTMLImageElement | null; title: string; playing: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof IntersectionObserver === "undefined") {
      // Older WebViews can still display and play an animation.
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.05, rootMargin: "100px" },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d", { alpha: false });
    if (!ctx) return;
    paintCinematicMoneyFrame(ctx, photo, scene, 3.2, "landscape", title);
    if (!playing || !visible) return;
    let raf = 0;
    let stopped = false;
    let startedAt = 0;
    let lastFrame = 0;
    const draw = (now: number) => {
      if (stopped) return;
      if (!startedAt) startedAt = now;
      // Seven frames per second looks like a video loop without slowing iOS.
      if (!document.hidden && now - lastFrame >= 140) {
        paintCinematicMoneyFrame(ctx, photo, scene, 3.2 + ((now - startedAt) / 1000) % 6, "landscape", title);
        lastFrame = now;
      }
      raf = window.requestAnimationFrame(draw);
    };
    raf = window.requestAnimationFrame(draw);
    return () => { stopped = true; window.cancelAnimationFrame(raf); };
  }, [scene, photo, title, playing, visible]);
  return <canvas className={styles.moneyFlowThumb} width={320} height={192}
    data-mandala-scene-preview={scene} data-scene-playing={playing && visible ? "true" : "false"} aria-hidden="true" ref={canvasRef} />;
}

function chooseMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const supported = [
    "video/mp4;codecs=avc1.42E01E", "video/mp4",
    "video/webm;codecs=vp8", "video/webm",
  ];
  return supported.find(mime => MediaRecorder.isTypeSupported(mime)) || "";
}

const BACKGROUND_CLIP = "local-money-background-only";

function loadSceneImage(url: string): Promise<HTMLImageElement | null> {
  return url === BACKGROUND_CLIP ? Promise.resolve(null) : loadLocalImage(url);
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
  ctx: CanvasRenderingContext2D, art: HTMLImageElement | null,
  effect: Effect, time: number, aspect: Aspect, moneyScene: MoneySceneId | null, title: string,
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  if (moneyScene) {
    paintCinematicMoneyFrame(ctx, art, moneyScene, time, aspect, title);
    return;
  }
  if (!art) return;
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

export function MandalaFreeVideoStudio({ locale, frameUrl, photoUrl }: {
  locale: PublicLocale; frameUrl: string | null; photoUrl?: string | null;
}) {
  const t = translations[locale];
  const [effect, setEffect] = useState<Effect>("glow");
  const [moneyScene, setMoneyScene] = useState<MoneySceneId | null>("golden-rain");
  const [showAllMoney, setShowAllMoney] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [aspect, setAspect] = useState<Aspect>("portrait");
  const [quality, setQuality] = useState<Quality>("hd");
  const [backgroundOnly, setBackgroundOnly] = useState(false);
  const [duration, setDuration] = useState<(typeof durations)[number]>(10);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jobRef = useRef<Job | null>(null);
  const aliveRef = useRef(false);
  const source = moneyScene && backgroundOnly ? BACKGROUND_CLIP : moneyScene && photoUrl ? photoUrl : frameUrl;
  const signature = JSON.stringify([source, frameUrl, photoUrl, moneyScene, effect, aspect, duration, quality, backgroundOnly]);
  const sourceRef = useRef(signature);
  sourceRef.current = signature;
  // Decode a user's photo once for all 12 preview cards. This avoids 12
  // duplicate high-resolution photo decodes and private portrait copies on iOS.
  const [thumbnailPhoto, setThumbnailPhoto] = useState<{ url: string; image: HTMLImageElement } | null>(null);
  const sharedThumbnailPhoto = thumbnailPhoto && thumbnailPhoto.url === photoUrl ? thumbnailPhoto.image : null;
  useEffect(() => {
    let disposed = false;
    if (!photoUrl) return;
    void loadLocalImage(photoUrl).then(image => {
      if (!disposed) setThumbnailPhoto({ url: photoUrl, image });
    }).catch(() => {
      if (!disposed) setThumbnailPhoto(null);
    });
    return () => { disposed = true; };
  }, [photoUrl]);

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
  }, [frameUrl, photoUrl, effect, moneyScene, aspect, duration, quality, backgroundOnly]);

  // No autoplay: paint a still scene, and animate only while a visitor
  // deliberately chooses preview. Throttle to ~12 fps on mobile Safari.
  useEffect(() => {
    if (!source || jobRef.current) return;
    let cancelled = false;
    let animation = 0;
    let startedAt = 0;
    let lastFrame = -1000;
    void loadSceneImage(source).then(image => {
      if (cancelled || jobRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = aspect === "landscape" ? 960 : 540;
      canvas.height = aspect === "portrait" ? 960 : 540;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;
      const caption = moneyScene ? moneyScenes.find(item => item.id === moneyScene)?.label[locale] || "" : "";
      paint(ctx, image, effect, 0, aspect, moneyScene, caption);
      if (!previewPlaying) return;
      const draw = (now: number) => {
        if (cancelled || jobRef.current) return;
        if (!startedAt) startedAt = now;
        if (now - lastFrame >= 80 && !document.hidden) {
          paint(ctx, image, effect, (now - startedAt) / 1000, aspect, moneyScene, caption);
          lastFrame = now;
        }
        animation = window.requestAnimationFrame(draw);
      };
      animation = window.requestAnimationFrame(draw);
    }).catch(() => { /* PNG preparation can be retried in the parent editor. */ });
    return () => { cancelled = true; window.cancelAnimationFrame(animation); };
  }, [source, effect, moneyScene, locale, aspect, previewPlaying]);

  async function createVideo() {
    if (!source || jobRef.current || recording) return;
    const snapshot = source;
    const snapshotKey = signature;
    setNotice(t.preparing);
    setResult(null);
    let stream: MediaStream | null = null;
    try {
      const image = await loadSceneImage(snapshot);
      if (sourceRef.current !== snapshotKey || !aliveRef.current) return;
      setPreviewPlaying(false);
      const canvas = canvasRef.current;
      if (!canvas || typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined") {
        setNotice(t.unsupported);
        return;
      }
      const [outputWidth, outputHeight] = formatDimensions(aspect, quality);
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Canvas unsupported");
      const caption = moneyScene ? moneyScenes.find(item => item.id === moneyScene)?.label[locale] || "" : "";
      paint(ctx, image, effect, 0, aspect, moneyScene, caption);
      const framesPerSecond = quality === "fullhd" ? 12 : 15;
      stream = canvas.captureStream(framesPerSecond);
      if (!stream.getVideoTracks().length) throw new Error("Canvas stream unavailable");

      const mimeType = chooseMime();
      if (!mimeType) throw new Error("Recording format unsupported");
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: quality === "fullhd" ? 5_000_000 : 3_000_000,
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
        if (now - lastFrame >= 1000 / framesPerSecond) {
          paint(ctx, image, effect, Math.min(duration, (now - start) / 1000), aspect, moneyScene, caption);
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
      <section className={styles.moneyFlowSection} data-mandala-money-effects aria-label={t.moneyHeading}>
        <h3>{t.moneyHeading}</h3>
        <p>{t.moneyIntro}</p>
        <div className={styles.moneyFlowGrid}>
          {moneyScenes.slice(0, showAllMoney ? moneyScenes.length : 4).map((scene, index) => (
            <button type="button" key={scene.id} data-mandala-money-option={scene.id}
              disabled={recording} aria-pressed={moneyScene === scene.id}
              onClick={() => {
                if (moneyScene === scene.id && previewPlaying) {
                  setPreviewPlaying(false);
                } else {
                  setMoneyScene(scene.id);
                  // Selecting a video is an explicit gesture to watch its
                  // moving client-local thumbnail and full-size preview.
                  setPreviewPlaying(true);
                }
              }}>
              <span className={styles.moneyFlowMedia}>
                <CinematicSceneThumbnail scene={scene.id} title={scene.label[locale]}
                  photo={backgroundOnly ? null : sharedThumbnailPhoto}
                  playing={moneyScene === scene.id && previewPlaying && !recording} />
                <span className={styles.moneyFlowPlayBadge} aria-hidden="true">
                  {moneyScene === scene.id && previewPlaying
                    ? <Pause size={18} fill="currentColor" />
                    : <Play size={18} fill="currentColor" />}
                </span>
                <span className={styles.moneyFlowClipLabel}>
                  {moneyScene === scene.id && previewPlaying ? t.clipReady : t.clipPlay}
                </span>
              </span>
              <span className={styles.moneyFlowText}>
                <strong>{scene.label[locale]}</strong>
                <small>{String(index + 1).padStart(2, "0")} · {moneyScene === scene.id && previewPlaying ? t.clipPause : "VIDEO"}</small>
              </span>
            </button>
          ))}
        </div>
        <div className={styles.moneyFlowToolbar}>
          <button type="button" className={styles.moneyFlowExpand}
            disabled={recording} aria-expanded={showAllMoney} onClick={() => setShowAllMoney(value => !value)}>
            {showAllMoney ? t.lessMoney : t.allMoney}
          </button>
          <button type="button" className={styles.moneyFlowPreviewButton}
            data-mandala-money-preview disabled={recording || !source}
            aria-pressed={previewPlaying}
            onClick={() => setPreviewPlaying(value => !value)}>
            {previewPlaying ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            {previewPlaying ? t.previewPause : t.previewPlay}
          </button>
        </div>
        <p className={styles.moneyFlowNote}>{t.moneyNote}</p>
      </section>
      <div className={styles.freeVideoPreview}>
        <canvas ref={canvasRef} width={540} height={960} aria-label={t.heading} data-mandala-cinematic-canvas
          style={{ aspectRatio: aspect === "portrait" ? "9 / 16" : aspect === "landscape" ? "16 / 9" : "1 / 1", display: result ? "none" : "block" }} />
        {result && <video src={result.url} controls playsInline preload="metadata" data-mandala-video-preview />}
      </div>
      <fieldset className={styles.freeVideoFieldset} disabled={recording} data-mandala-output-mode>
        <legend>{t.renderMode}</legend>
        <div className={styles.freeVideoOptions}>
          <button type="button" aria-pressed={!backgroundOnly} onClick={() => setBackgroundOnly(false)}>{t.withPortrait}</button>
          <button type="button" aria-pressed={backgroundOnly}
            onClick={() => { setBackgroundOnly(true); if (!moneyScene) setMoneyScene("golden-rain"); }}>{t.backgroundOnly}</button>
        </div>
        {backgroundOnly ? <p className={styles.freeVideoPrivacy}>{t.backgroundHint}</p> : null}
      </fieldset>
      <p className={styles.freeVideoPrivacy}>{t.photoNote}</p>
      <fieldset className={styles.freeVideoFieldset} disabled={recording}>
        <legend>{t.effect}</legend>
        <div className={styles.freeVideoOptions}>
          {effects.map((option, index) => (
            <button type="button" key={option} aria-pressed={effect === option}
              onClick={() => { setBackgroundOnly(false); setMoneyScene(null); setEffect(option); setPreviewPlaying(false); }}>{t.effects[index]}</button>
          ))}
        </div>
      </fieldset>
      <div className={styles.freeVideoSettings}>
        <fieldset className={styles.freeVideoFieldset} disabled={recording}>
          <legend>{t.aspect}</legend>
          <div className={styles.freeVideoOptions}>
            <button type="button" aria-pressed={aspect === "square"} onClick={() => setAspect("square")}><Square size={14} aria-hidden="true" />{t.square}</button>
            <button type="button" aria-pressed={aspect === "portrait"} onClick={() => setAspect("portrait")}>{t.portrait}</button>
            <button type="button" aria-pressed={aspect === "landscape"} onClick={() => setAspect("landscape")}>{t.landscape}</button>
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
      <fieldset className={styles.freeVideoFieldset} disabled={recording}>
        <legend>{t.quality}</legend>
        <div className={styles.freeVideoOptions} data-mandala-quality>
          <button type="button" aria-pressed={quality === "hd"} onClick={() => setQuality("hd")}>{t.hd}</button>
          <button type="button" aria-pressed={quality === "fullhd"} onClick={() => setQuality("fullhd")}>{t.fullhd}</button>
        </div>
      </fieldset>
      {recording ? (
        <button type="button" className={styles.freeVideoAction} onClick={() => {
          const job = jobRef.current;
          if (job) stopJob(job, true);
          setNotice("");
        }}><X size={17} aria-hidden="true" />{t.cancel}</button>
      ) : (
        <button type="button" className={styles.freeVideoAction} disabled={!source}
          onClick={createVideo} data-mandala-video-generate>
          <Sparkles size={17} aria-hidden="true" />{t.generate}
        </button>
      )}
      {!source ? <p className={styles.freeVideoNotice}>{t.imagePending}</p> : null}
      {notice ? <p className={styles.freeVideoNotice} role="status" aria-live="polite">{notice}</p> : null}
      {result && <a href={result.url} className={styles.freeVideoDownload}
        download={"holistic-house-" + (backgroundOnly ? "money-background" : "personal-mandala") + "." + result.extension} data-mandala-video-download>
        <Download size={18} aria-hidden="true" />{t.download} · {Math.max(1, Math.round(result.bytes / 1024))} KB
      </a>}
      <p className={styles.freeVideoPrivacy}>{t.privacy}</p>
      <p className={styles.freeVideoPrivacy}>{t.formatHint}</p>
    </section>
  );
}
