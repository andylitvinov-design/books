"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Film, Play, Pause, Share2, Sparkles, Square, X } from "lucide-react";
import { moneyScenes, paintMoneyScene } from "@/lib/mandala/money-flow-effects";
import type { MoneySceneId } from "@/lib/mandala/money-flow-effects";

import type { PublicLocale } from "@/lib/public-locales";
import styles from "./mandala-meditation.module.css";

type Effect = "glow" | "energy" | "prosperity" | "temple" | "tree" | "magnet" | "infinity" | "path";
type Purpose = "calm" | "energy" | "confidence" | "relationships" | "prosperity" | "goals";
type Aspect = "square" | "portrait" | "landscape";
type Pace = "slow" | "normal";
type Strength = "soft" | "bright";
type CaptionMode = "none" | "purpose" | "custom";
type Result = { url: string; extension: "mp4" | "webm"; bytes: number; blob: Blob; mimeType: string };
type VideoRenderOptions = { pace: Pace; strength: Strength; caption: string };
type Job = {
  recorder: MediaRecorder;
  stream: MediaStream;
  animation: number;
  timeout: number;
  cancelled: boolean;
  audioContext?: AudioContext;
  audioSource?: AudioBufferSourceNode;
};

const translations = {
  en: {
    moneyHeading: "Money flow · 12 visual stories", moneyIntro: "Choose a symbolic flow around your own photograph. Four favourites first.",
    allMoney: "See all 12 looks", lessMoney: "Show four favourites", moneyNote: "A creative attention exercise, not a promise of income.",
    previewPlay: "Preview movement", previewPause: "Pause preview",
    heading: "Your free personal video",
    description: "Animate this mandala and your photo without an AI subscription.",
    purpose: "1 · What would you like to focus on?",
    purposes: ["Calm & grounding", "More energy", "Self-confidence", "Relationships", "Prosperity & work", "My next goal"],
    scenario: "2 · Choose your video scene",
    effect: "Animation", effects: ["Golden glow", "Energy spiral", "Golden rain", "Temple light", "Tree of abundance", "Opportunity magnet", "Infinity flow", "Path to a goal"],
    motionTitle: "3 · Customize motion",
    pace: "Speed", paces: ["Slow and meditative", "Flowing"],
    strength: "Brightness", strengths: ["Soft", "Bright"],
    captionMode: "Text on video", captionModes: ["No text", "My chosen focus", "My own words"],
    caption: "Short message (optional)", captionPlaceholder: "A kind reminder for myself",
    aspect: "4 · Video format", square: "Square · 1:1", portrait: "Vertical · 9:16", landscape: "Wide · 16:9",
    consent: "I own this photo or have permission to use it in this video.",
    consentNeeded: "Confirm that you may use this photo before creating the video.",
    playPreview: "Preview motion", pausePreview: "Pause preview",
    photoLink: "Choose / change photo and mandala",
    share: "Share / Save to Files", shareUnavailable: "Your device cannot share this file directly. Use Save video below.",
    duration: "Duration", seconds: "sec",
    generate: "Create my free video", creating: "Recording on this device…",
    preparing: "Preparing your image…", ready: "Video ready. Save it to your device.",
    download: "Save video", cancel: "Cancel recording",
    imagePending: "The mandala image is being prepared. Choose your photo and wait for the preview.",
    unsupported: "This browser cannot record a canvas video. You can still save the PNG above. Try an updated Safari or Chrome for video.",
    failed: "Video creation failed or there was not enough memory. Try 10 seconds or a different browser.",
    interrupted: "Recording stopped when the page went into the background. Keep this tab open and try again.",
    privacy: "Free · processed only in your browser · no upload or account storage. Silent video; original guided recordings remain separate. Only use client photos with their permission.",
    formatHint: "MP4 or WebM depending on browser. On iPhone you can open the result and use Share → Save to Files.",
    personalIntro: "Add a photo and your own voice. Choose a scene, then create a video to share on Telegram — no bot or AI credits.",
    personalPrivacy: "Free. Your photo and voice stay on this device; no server uploads, AI provider or CRM. Nothing is posted to Telegram automatically.",
    personalAudio: "Audio length sets video duration (1–60 seconds). The original voice is embedded in the exported file.",
    audioMissing: "Add a voice recording to create a video with sound.",
    audioInvalid: "This audio could not be decoded or is longer than 60 seconds. Telegram OGG/Opus may not work in iPhone Safari. Record your voice here, or use MP3/M4A.",
    preparingResult: "Recording…",
  },
  ru: {
    moneyHeading: "Денежный поток · 12 сюжетов", moneyIntro: "Выберите движение золотого света вокруг своего фото. Сначала четыре популярных.",
    allMoney: "Показать все 12 вариантов", lessMoney: "Свернуть до четырёх", moneyNote: "Образная практика внимания, не обещание заработка.",
    previewPlay: "Посмотреть движение", previewPause: "Пауза",
    heading: "Ваше бесплатное личное видео",
    description: "Оживите мандалу и фотографию без подписки на нейросеть.",
    purpose: "1 · Для чего вам видео?",
    purposes: ["Спокойствие и опора", "Больше энергии", "Уверенность", "Отношения", "Процветание и работа", "Моя следующая цель"],
    scenario: "2 · Выберите видеосценарий",
    effect: "Эффект", effects: ["Золотое сияние", "Спираль энергии", "Золотой дождь", "Свет храма", "Древо изобилия", "Магнит возможностей", "Бесконечный поток", "Путь к цели"],
    motionTitle: "3 · Настройте движение",
    pace: "Скорость", paces: ["Медленно и спокойно", "Плавный поток"],
    strength: "Яркость", strengths: ["Нежная", "Яркая"],
    captionMode: "Надпись в видео", captionModes: ["Без текста", "Выбранная цель", "Мои слова"],
    caption: "Короткая фраза (необязательно)", captionPlaceholder: "Доброе напоминание для себя",
    aspect: "4 · Формат видео", square: "Квадрат · 1:1", portrait: "Вертикальный · 9:16", landscape: "Горизонтальный · 16:9",
    consent: "Это моё фото или у меня есть разрешение использовать его в видео.",
    consentNeeded: "Подтвердите разрешение на фото для создания видео.",
    playPreview: "Посмотреть движение", pausePreview: "Остановить предпросмотр",
    photoLink: "Выбрать / изменить фото и мандалу",
    share: "Поделиться / Сохранить в Файлы", shareUnavailable: "Устройство не поддерживает отправку этого файла. Используйте «Сохранить видео».",
    duration: "Длительность", seconds: "сек",
    generate: "Создать видео бесплатно", creating: "Запись на вашем устройстве…",
    preparing: "Подготавливаем изображение…", ready: "Видео готово. Сохраните его на устройство.",
    download: "Сохранить видео", cancel: "Отменить запись",
    imagePending: "Мандала ещё подготавливается. Выберите фото и дождитесь изображения.",
    unsupported: "Этот браузер не умеет записывать видео с холста. PNG можно сохранить выше. Для видео попробуйте обновлённый Safari или Chrome.",
    failed: "Не удалось создать видео или не хватило памяти. Попробуйте 10 секунд или другой браузер.",
    interrupted: "Запись остановлена при переходе в фон. Не закрывайте вкладку во время создания видео.",
    privacy: "Бесплатно · только в вашем браузере · без загрузки и сохранения в аккаунт. Видео без звука; авторские медитации отдельно. Используйте фото клиента только с его разрешения.",
    formatHint: "MP4 или WebM в зависимости от браузера. На iPhone откройте результат и выберите «Поделиться» → «Сохранить в Файлы».",
    personalIntro: "Загрузите фото и свой голос, выберите эффект и создайте ролик для Telegram — без бота и кредитов нейросети.",
    personalPrivacy: "Бесплатно. Фото и голос остаются на устройстве: без отправки на сервер, в AI или CRM. В Telegram ничего не публикуется автоматически.",
    personalAudio: "Длительность видео определяется аудиозаписью (1–60 секунд). Ваш голос попадёт в готовый файл.",
    audioMissing: "Добавьте голосовую запись, чтобы создать ролик со звуком.",
    audioInvalid: "Не удалось прочитать аудио либо оно длиннее 60 секунд. OGG/Opus из Telegram может не работать в Safari на iPhone. Запишите голос здесь или используйте MP3/M4A.",
    preparingResult: "Запись…",
  },
  es: {
    moneyHeading: "Flujo de prosperidad · 12 escenas", moneyIntro: "Elige un movimiento simbólico alrededor de tu foto. Cuatro favoritos primero.",
    allMoney: "Ver las 12 escenas", lessMoney: "Mostrar cuatro favoritos", moneyNote: "Una práctica simbólica, no una promesa de ingresos.",
    previewPlay: "Ver movimiento", previewPause: "Pausar vista previa",
    heading: "Tu vídeo personal gratis",
    description: "Anima el mandala y tu foto sin pagar una suscripción de IA.",
    purpose: "1 · ¿Cuál es tu intención?",
    purposes: ["Calma y equilibrio", "Más energía", "Confianza", "Relaciones", "Prosperidad y trabajo", "Mi próximo objetivo"],
    scenario: "2 · Elige la escena de vídeo",
    effect: "Animación", effects: ["Brillo dorado", "Espiral de energía", "Lluvia dorada", "Luz del templo", "Árbol de abundancia", "Imán de oportunidades", "Flujo infinito", "Camino a la meta"],
    motionTitle: "3 · Personaliza el movimiento",
    pace: "Velocidad", paces: ["Lenta y meditativa", "Fluida"],
    strength: "Brillo", strengths: ["Suave", "Luminoso"],
    captionMode: "Texto en el vídeo", captionModes: ["Sin texto", "Mi intención", "Mis palabras"],
    caption: "Frase corta (opcional)", captionPlaceholder: "Un recordatorio amable para mí",
    aspect: "4 · Formato del vídeo", square: "Cuadrado · 1:1", portrait: "Vertical · 9:16", landscape: "Horizontal · 16:9",
    consent: "Soy propietario de esta foto o tengo permiso para usarla en el vídeo.",
    consentNeeded: "Confirma que tienes permiso para usar esta foto.",
    playPreview: "Ver animación", pausePreview: "Pausar vista previa",
    photoLink: "Elegir / cambiar foto y mandala",
    share: "Compartir / Guardar en Archivos", shareUnavailable: "Tu dispositivo no permite compartir este archivo. Utiliza Guardar vídeo.",
    duration: "Duración", seconds: "seg",
    generate: "Crear vídeo gratis", creating: "Grabando en este dispositivo…",
    preparing: "Preparando la imagen…", ready: "Vídeo listo. Guárdalo en tu dispositivo.",
    download: "Guardar vídeo", cancel: "Cancelar grabación",
    imagePending: "Se está preparando el mandala. Elige una foto y espera la vista previa.",
    unsupported: "Este navegador no permite grabar vídeo desde el lienzo. Puedes guardar la imagen PNG arriba. Prueba Safari o Chrome actualizado.",
    failed: "No se pudo crear el vídeo o falta memoria. Prueba 10 segundos u otro navegador.",
    interrupted: "La grabación se detuvo al pasar a segundo plano. Mantén abierta esta pestaña y vuelve a intentarlo.",
    privacy: "Gratis · procesado solo en tu navegador · sin subir ni guardar en tu cuenta. Vídeo sin sonido; las meditaciones están aparte. Usa fotos de clientes solo con su permiso.",
    formatHint: "MP4 o WebM según tu navegador. En iPhone abre el resultado y usa Compartir → Guardar en Archivos.",
    personalIntro: "Sube tu foto y tu voz, elige un efecto y crea un vídeo para Telegram sin bot ni créditos de IA.",
    personalPrivacy: "Gratis. Foto y voz permanecen en este dispositivo; no se envían al servidor, a IA ni al CRM. Nada se publica automáticamente en Telegram.",
    personalAudio: "La duración sigue la voz (1–60 segundos). La grabación original se incluye en el archivo exportado.",
    audioMissing: "Añade tu grabación de voz para crear un vídeo con sonido.",
    audioInvalid: "No se pudo leer el audio o dura más de 60 segundos. OGG/Opus de Telegram puede fallar en Safari para iPhone. Graba aquí o usa MP3/M4A.",
    preparingResult: "Grabando…",
  },
} as const;

const effects: Effect[] = ["glow", "energy", "prosperity", "temple", "tree", "magnet", "infinity", "path"];
const purposes: Purpose[] = ["calm", "energy", "confidence", "relationships", "prosperity", "goals"];
const purposeScenes: Record<Purpose, Effect> = {
  calm: "glow", energy: "energy", confidence: "temple",
  relationships: "infinity", prosperity: "prosperity", goals: "path",
};
const durations = [10, 20, 30, 60] as const;
const paces: Pace[] = ["slow", "normal"];
const strengths: Strength[] = ["soft", "bright"];
const captionModes: CaptionMode[] = ["none", "purpose", "custom"];

function dimensions(aspect: Aspect) {
  if (aspect === "portrait") return { width: 720, height: 1280 };
  if (aspect === "landscape") return { width: 960, height: 540 };
  return { width: 720, height: 720 };
}

function chooseMime(hasAudio: boolean): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
  const supported = hasAudio
    ? ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp8,opus", "video/webm"]
    : ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp8", "video/webm"];
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
  effect: Effect, time: number, aspect: Aspect, options: VideoRenderOptions,
  moneyScene: MoneySceneId | null,
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const size = Math.min(width * 0.96, height * 0.94);
  const left = centerX - size / 2;
  const top = centerY - size / 2;
  const gold = effect === "energy" ? "116,222,187" : "246,205,130";
  const motionTime = time * (options.pace === "slow" ? 0.58 : 1.28);
  const power = options.strength === "soft" ? 0.52 : 1;

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
    const orbit = i * 2.399963 + motionTime * (effect === "energy" ? 0.17 : 0.08);
    const radius = width * (0.23 + 0.22 * ((i * 17) % 13) / 13);
    const drift = Math.sin(motionTime * 0.8 + i * 1.3) * 14;
    const x = centerX + Math.cos(orbit) * (radius + drift);
    const y = centerY + Math.sin(orbit) * (radius + drift);
    const alpha = (0.28 + 0.4 * (0.5 + 0.5 * Math.sin(motionTime * 1.8 + i))) * power;
    ctx.fillStyle = "rgba(" + gold + "," + alpha.toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 2.2;
  if (effect === "energy" || effect === "glow") {
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = "rgba(" + gold + "," + ((0.14 + i * 0.07) * power) + ")";
      ctx.beginPath();
      const radius = size * (0.35 + i * 0.045) + Math.sin(motionTime * 0.65 + i) * 11;
      ctx.ellipse(centerX, centerY, radius, radius, motionTime * 0.07, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (effect === "prosperity") {
    const symbols = ["✧", "€", "✦", "✧"];
    for (let i = 0; i < 13; i++) {
      const x = width * (0.07 + (i * 0.193) % 0.86);
      const y = ((i * 157 + motionTime * (20 + i % 5 * 3)) % (height + 100)) - 50;
      ctx.font = (18 + i % 4 * 5) + "px Georgia,serif";
      ctx.fillStyle = "rgba(250,215,146," + (0.55 * power) + ")";
      ctx.fillText(symbols[i % symbols.length], x, y);
    }
  }
  if (effect === "temple") {
    ctx.strokeStyle = "rgba(247,220,168," + (0.45 * power) + ")";
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
  // Additional motifs use the same local Canvas renderer. All are abstract,
  // intentionally outside the central client portrait, not fabricated face motion.
  if (effect === "tree") {
    ctx.strokeStyle = "rgba(241,204,129," + (0.8 * power) + ")";
    for (const side of [-1, 1]) {
      const startX = centerX + side * width * 0.43;
      const baseY = height * 0.77;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(startX, baseY);
      ctx.quadraticCurveTo(startX - side * 20, height * 0.38, startX - side * 5, height * 0.17);
      ctx.stroke();
      for (let j = 0; j < 5; j++) {
        const branchY = height * (0.63 - j * 0.09);
        const reach = 17 + j * 3 + Math.sin(motionTime + j) * 5;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(startX, branchY);
        ctx.quadraticCurveTo(startX + side * reach, branchY - 25, startX + side * reach, branchY - 45);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(startX + side * reach, branchY - 45, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255,222,150," + (0.55 * power) + ")";
        ctx.fill();
      }
    }
  }
  if (effect === "magnet") {
    for (let i = 0; i < 18; i++) {
      const angle = (i * Math.PI * 2) / 18;
      const approach = (Math.sin(motionTime * 0.9 + i * 0.33) + 1) / 2;
      const distance = size * (0.56 - approach * 0.06);
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(150,111,46," + (0.9 * power) + ")";
      ctx.fillStyle = "rgba(249,203,111," + (0.82 * power) + ")";
      ctx.beginPath(); ctx.arc(x, y, 5 + i % 4, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    }
  }
  if (effect === "infinity") {
    const yBase = aspect === "portrait" ? height * 0.83 : height * 0.92;
    const amp = Math.min(width * 0.33, 190);
    ctx.strokeStyle = "rgba(246,211,152," + (0.72 * power) + ")";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const p = (i / 100) * 2 * Math.PI + motionTime * 0.2;
      const x = centerX + Math.sin(p) * amp;
      const y = yBase + Math.sin(2 * p) * 30;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  if (effect === "path") {
    for (let i = 0; i < 12; i++) {
      const y = height * (0.78 + 0.22 * ((i + motionTime) % 12) / 12);
      const spread = (y - height * 0.7) * 0.6;
      ctx.strokeStyle = "rgba(251,219,159," + (power * 0.4) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - spread, y);
      ctx.lineTo(centerX + spread, y);
      ctx.stroke();
    }
  }
  ctx.restore();
  if (moneyScene) paintMoneyScene(ctx, moneyScene, motionTime);
  if (aspect === "portrait") {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(244,219,169,.85)";
    ctx.font = "32px Georgia,serif";
    ctx.fillText("✧  H O L I S T I C   H O U S E  ✧", centerX, height * 0.19, width - 40);
    ctx.fillStyle = "rgba(253,243,221,.65)";
    ctx.font = "24px Georgia,serif";
    ctx.fillText("✦   ✦   ✦", centerX, height * 0.86);
  }
  // Optional chosen words are capped and drawn locally; no personal data in
  // prompts, URLs, analytics, filenames or a third-party service.
  if (options.caption) {
    const fontSize = aspect === "landscape" ? 22 : 27;
    const caption = options.caption.slice(0, 72).replace(/[\n\r]+/g, " ");
    const lineWidth = width * 0.88;
    ctx.save();
    ctx.font = "600 " + fontSize + "px Arial,Helvetica,sans-serif";
    const words = caption.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    for (const word of words) {
      const current = lines[lines.length - 1] || "";
      const next = current ? current + " " + word : word;
      if (current && ctx.measureText(next).width > lineWidth && lines.length < 2) lines.push(word);
      else if (lines.length) lines[lines.length - 1] = next;
      else lines.push(next);
    }
    const footerHeight = lines.length > 1 ? 92 : 65;
    const footerY = height - footerHeight - 12;
    ctx.fillStyle = "rgba(24,40,34,.82)";
    ctx.fillRect(width * 0.05, footerY, width * 0.9, footerHeight);
    ctx.fillStyle = "#fff6e0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.slice(0, 2).forEach((line, index) =>
      ctx.fillText(line, centerX, footerY + (lines.length > 1 ? 31 + 32 * index : 34), lineWidth));
    ctx.restore();
  }
}

function releaseAudio(job: Job) {
  try { job.audioSource?.stop(); } catch { /* Already finished. */ }
  if (job.audioContext && job.audioContext.state !== "closed")
    void job.audioContext.close().catch(() => { /* Context was interrupted. */ });
}
function stopJob(job: Job, cancelled: boolean) {
  job.cancelled = cancelled;
  window.cancelAnimationFrame(job.animation);
  window.clearTimeout(job.timeout);
  if (job.recorder.state !== "inactive") job.recorder.stop();
  else { job.stream.getTracks().forEach(track => track.stop()); releaseAudio(job); }
}

export function MandalaFreeVideoStudio({ locale, frameUrl, photoIdentity, audioFile = null, standalone = false }: {
  locale: PublicLocale; frameUrl: string | null; photoIdentity: string | null;
  audioFile?: File | null; standalone?: boolean;
}) {
  const t = translations[locale];
  const [purpose, setPurpose] = useState<Purpose>("calm");
  const [effect, setEffect] = useState<Effect>("glow");
  const [moneyScene, setMoneyScene] = useState<MoneySceneId | null>(null);
  const [showAllMoney, setShowAllMoney] = useState(false);
  const [aspect, setAspect] = useState<Aspect>("portrait");
  const [duration, setDuration] = useState<(typeof durations)[number]>(10);
  const [pace, setPace] = useState<Pace>("slow");
  const [strength, setStrength] = useState<Strength>("soft");
  const [captionMode, setCaptionMode] = useState<CaptionMode>("none");
  const [customCaption, setCustomCaption] = useState("");
  const [photoConsent, setPhotoConsent] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jobRef = useRef<Job | null>(null);
  const aliveRef = useRef(false);
  const preparingRef = useRef(false);
  const captionText = captionMode === "purpose"
    ? t.purposes[purposes.indexOf(purpose)] : captionMode === "custom" ? customCaption.trim() : "";
  const settings = useMemo<VideoRenderOptions>(() => ({ pace, strength, caption: captionText }),
    [pace, strength, captionText]);
  const signature = JSON.stringify([frameUrl, photoIdentity, purpose, effect, moneyScene, aspect,
    duration, pace, strength, captionMode, captionText, audioFile?.name, audioFile?.size, audioFile?.lastModified]);
  const signatureRef = useRef(signature);
  signatureRef.current = signature;
  const sourceRef = useRef(frameUrl);
  sourceRef.current = frameUrl;
  const audioRef = useRef(audioFile);
  audioRef.current = audioFile;
  const canCreate = Boolean(frameUrl) && (!photoIdentity || photoConsent) && !preparing
    && (!standalone || Boolean(audioFile));

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

  // Each new photo requires fresh permission; do not reuse it for another client.
  useEffect(() => { setPhotoConsent(false); }, [photoIdentity]);

  useEffect(() => {
    if (!recording) return;
    const onHidden = () => {
      if (!document.hidden) return;
      const job = jobRef.current;
      if (job) stopJob(job, true);
      setNotice(t.interrupted);
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, [recording, t.interrupted]);

  // Invalidate the result when the client photo, composition or preset changes.
  // Never leave a previous client's exported video visible after replacement.
  useEffect(() => {
    const job = jobRef.current;
    if (job) stopJob(job, true);
    setPreviewing(false);
    setResult(null);
    setNotice("");
  }, [frameUrl, photoIdentity, purpose, effect, moneyScene, aspect, duration, pace, strength, captionMode, captionText, audioFile]);

  useEffect(() => {
    if (!frameUrl || jobRef.current) return;
    let cancelled = false;
    void loadLocalImage(frameUrl).then(image => {
      if (cancelled || jobRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const size = dimensions(aspect);
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx) paint(ctx, image, effect, 0, aspect, settings, moneyScene);
    }).catch(() => { /* PNG preparation can be retried in the parent editor. */ });
    return () => { cancelled = true; };
  }, [frameUrl, effect, moneyScene, aspect, settings]);

  // Motion preview is explicitly started by the visitor; no autoplay or
  // background recorder. Animation stops on unmount, parameter changes or record.
  useEffect(() => {
    if (!previewing || !frameUrl || recording) return;
    let cancelled = false;
    let animation = 0;
    void loadLocalImage(frameUrl).then(image => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", { alpha: false });
      if (!ctx || cancelled) return;
      let started = 0;
      let last = 0;
      const draw = (timestamp: number) => {
        if (cancelled) return;
        if (!started) started = timestamp;
        if (!document.hidden && timestamp - last >= 1000 / 15) {
          paint(ctx, image, effect, (timestamp - started) / 1000, aspect, settings, moneyScene);
          last = timestamp;
        }
        animation = requestAnimationFrame(draw);
      };
      animation = requestAnimationFrame(draw);
    }).catch(() => { /* Static preview remains usable. */ });
    return () => { cancelled = true; cancelAnimationFrame(animation); };
  }, [previewing, frameUrl, recording, effect, moneyScene, aspect, settings]);

  async function createVideo() {
    if (!canCreate || !frameUrl || jobRef.current || recording || preparingRef.current) return;
    const snapshot = frameUrl;
    const configSnapshot = signatureRef.current;
    preparingRef.current = true;
    setPreparing(true);
    setPreviewing(false);
    setNotice(t.preparing);
    setProgress(0);
    setResult(null);
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let audioSource: AudioBufferSourceNode | null = null;
    let renderSeconds: number = duration;
    try {
      // AudioContext is resumed directly from the user's click for iOS Safari.
      if (audioFile) {
        if (audioFile.size > 15_000_000 || audioFile.size === 0) throw new Error("audio_decode");
        audioContext = new AudioContext();
        await audioContext.resume();
      }
      const image = await loadLocalImage(snapshot);
      if (sourceRef.current !== snapshot || signatureRef.current !== configSnapshot || !aliveRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas || typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined") {
        setNotice(t.unsupported);
        return;
      }
      const size = dimensions(aspect);
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Canvas unsupported");
      paint(ctx, image, effect, 0, aspect, settings, moneyScene);
      stream = canvas.captureStream(15);
      if (!stream.getVideoTracks().length) throw new Error("Canvas stream unavailable");
      if (audioContext && audioFile) {
        let decoded: AudioBuffer;
        try { decoded = await audioContext.decodeAudioData(await audioFile.arrayBuffer()); }
        catch { throw new Error("audio_decode"); }
        if (!Number.isFinite(decoded.duration) || decoded.duration < 1 || decoded.duration > 60)
          throw new Error("audio_decode");
        if (standalone) renderSeconds = Math.ceil(decoded.duration);
        const destination = audioContext.createMediaStreamDestination();
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = decoded;
        audioSource.connect(destination);
        const track = destination.stream.getAudioTracks()[0];
        if (!track) throw new Error("audio_decode");
        stream.addTrack(track);
        // A changed participant's recording must not be added to the old export.
        if (audioRef.current !== audioFile || signatureRef.current !== configSnapshot || !aliveRef.current) {
          stream.getTracks().forEach(item => item.stop());
          return;
        }
      }

      const mimeType = chooseMime(Boolean(audioFile));
      if (!mimeType) {
        setNotice(t.unsupported);
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_400_000 });
      const chunks: Blob[] = [];
      const job: Job = { recorder, stream, animation: 0, timeout: 0, cancelled: false,
        ...(audioContext ? { audioContext } : {}), ...(audioSource ? { audioSource } : {}) };
      jobRef.current = job;

      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        stopJob(job, true);
        if (aliveRef.current) setNotice(t.failed);
      };
      recorder.onstop = () => {
        job.stream.getTracks().forEach(track => track.stop());
        releaseAudio(job);
        if (jobRef.current !== job || !aliveRef.current) return;
        jobRef.current = null;
        setRecording(false);
        if (job.cancelled) return;
        setProgress(100);
        const type = recorder.mimeType || mimeType;
        const blob = new Blob(chunks, { type });
        if (!blob.size) {
          setNotice(t.failed);
          return;
        }
        setResult({
          url: URL.createObjectURL(blob),
          extension: type.includes("mp4") ? "mp4" : "webm",
          bytes: blob.size, blob, mimeType: type,
        });
        setNotice(t.ready);
      };

      // This user-triggered browser recorder never contacts a backend.
      recorder.start(500);
      if (audioSource) audioSource.start(0);
      const start = performance.now();
      let lastFrame = -1000;
      let lastProgress = 0;
      const animate = (now: number) => {
        if (jobRef.current !== job || job.recorder.state !== "recording") return;
        if (now - lastFrame >= 1000 / 15) {
          paint(ctx, image, effect, Math.min(renderSeconds, (now - start) / 1000), aspect, settings, moneyScene);
          lastFrame = now;
          if (now - lastProgress > 700) {
            setProgress(Math.min(99, Math.round((now - start) * 100 / (renderSeconds * 1000))));
            lastProgress = now;
          }
        }
        job.animation = requestAnimationFrame(animate);
      };
      job.animation = requestAnimationFrame(animate);
      job.timeout = window.setTimeout(() => stopJob(job, false), renderSeconds * 1000);
      setRecording(true);
      setNotice(t.creating);
    } catch (error) {
      if (stream) stream.getTracks().forEach(track => track.stop());
      jobRef.current = null;
      setRecording(false);
      setNotice(error instanceof Error && error.message === "audio_decode" ? t.audioInvalid : t.failed);
    } finally {
      if (audioContext && jobRef.current?.audioContext !== audioContext && audioContext.state !== "closed")
        void audioContext.close().catch(() => { /* Interrupted audio. */ });
      preparingRef.current = false;
      if (aliveRef.current) setPreparing(false);
    }
  }

  async function shareResult() {
    if (!result) return;
    const filename = (standalone ? "holistic-house-my-video." : "holistic-house-personal-mandala.") + result.extension;
    const file = new File([result.blob], filename,
      { type: result.extension === "mp4" ? "video/mp4" : "video/webm" });
    if (typeof navigator.share !== "function" ||
        (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] }))) {
      setNotice(t.shareUnavailable);
      return;
    }
    try {
      // Only an explicit user tap opens the native iOS/Android sharing sheet.
      await navigator.share({ files: [file], title: t.heading });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setNotice(t.shareUnavailable);
    }
  }

  return (
    <section id="free-personal-video" className={styles.freeVideoPanel} data-mandala-free-video aria-label={t.heading}>
      <h2><Film size={21} aria-hidden="true" />{t.heading}<span className={styles.freeVideoBadge}>$0</span></h2>
      <p className={styles.freeVideoIntro}>{standalone ? t.personalIntro : t.description}</p>
      {!standalone && <a className={styles.freeVideoPhotoLink} href="#mandala-photo-section">{t.photoLink} ↑</a>}

      <fieldset className={styles.freeVideoFieldset} disabled={recording || preparing}>
        <legend>{t.purpose}</legend>
        <div className={styles.freeVideoPurposeGrid}>
          {purposes.map((item, index) => (
            <button type="button" key={item} data-mandala-video-purpose={item}
              aria-pressed={purpose === item} onClick={() => {
                setPurpose(item);
                setEffect(purposeScenes[item]);
                setMoneyScene(item === "prosperity" ? "golden-rain" : null);
              }}>{t.purposes[index]}</button>
          ))}
        </div>
      </fieldset>

      <section className={styles.moneyFlowSection} data-mandala-money-effects aria-label={t.moneyHeading}>
        <h3>{t.moneyHeading}</h3>
        <p>{t.moneyIntro}</p>
        <div className={styles.moneyFlowGrid}>
          {moneyScenes.slice(0, showAllMoney ? moneyScenes.length : 4).map((scene, index) => (
            <button type="button" key={scene.id} data-mandala-money-option={scene.id}
              disabled={recording || preparing} aria-pressed={moneyScene === scene.id}
              onClick={() => { setMoneyScene(scene.id); setPreviewing(false); }}>
              <span className={styles.moneyFlowIcon} aria-hidden="true">
                <span>{scene.symbol}</span><small>{index + 1}</small>
              </span>
              <span>{scene.label[locale]}</span>
            </button>
          ))}
        </div>
        <div className={styles.moneyFlowToolbar}>
          <button type="button" className={styles.moneyFlowExpand}
            disabled={recording || preparing} aria-expanded={showAllMoney}
            onClick={() => setShowAllMoney(value => !value)}>
            {showAllMoney ? t.lessMoney : t.allMoney}
          </button>
          <button type="button" className={styles.moneyFlowPreviewButton}
            data-mandala-money-preview disabled={recording || preparing || !frameUrl}
            aria-pressed={previewing} onClick={() => setPreviewing(value => !value)}>
            {previewing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            {previewing ? t.previewPause : t.previewPlay}
          </button>
        </div>
        <p className={styles.moneyFlowNote}>{t.moneyNote}</p>
      </section>

      <fieldset className={styles.freeVideoFieldset} disabled={recording || preparing}>
        <legend>{t.scenario}</legend>
        <div className={styles.freeVideoOptions} role="group" aria-label={t.effect}>
          {effects.map((option, index) => (
            <button type="button" key={option} data-mandala-video-effect={option}
              aria-pressed={effect === option && !moneyScene} onClick={() => { setEffect(option); setMoneyScene(null); }}>
              <span aria-hidden="true">{["✺", "◌", "✦", "⌂", "♧", "◈", "∞", "➤"][index]}</span>{t.effects[index]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className={styles.freeVideoPreview}>
        <canvas ref={canvasRef} width={dimensions(aspect).width} height={dimensions(aspect).height} aria-label={t.heading}
          style={{ aspectRatio: aspect === "portrait" ? "9 / 16" : aspect === "landscape" ? "16 / 9" : "1 / 1",
            display: result ? "none" : "block" }} />
        {result && <video src={result.url} controls playsInline preload="metadata" data-mandala-video-preview />}
      </div>
      {!result && !recording && (
        <button type="button" className={styles.freeVideoPreviewToggle} disabled={!frameUrl || preparing}
          aria-pressed={previewing} data-mandala-video-motion-preview
          onClick={() => setPreviewing(current => !current)}>
          {previewing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          {previewing ? t.pausePreview : t.playPreview}
        </button>
      )}

      <div className={styles.freeVideoSectionLabel}>{t.motionTitle}</div>
      <div className={styles.freeVideoSettings}>
        <fieldset className={styles.freeVideoFieldset} disabled={recording || preparing}>
          <legend>{t.pace}</legend>
          <div className={styles.freeVideoOptions}>
            {paces.map((value, index) => <button type="button" key={value}
              data-mandala-video-pace={value} aria-pressed={pace === value}
              onClick={() => setPace(value)}>{t.paces[index]}</button>)}
          </div>
        </fieldset>
        <fieldset className={styles.freeVideoFieldset} disabled={recording || preparing}>
          <legend>{t.strength}</legend>
          <div className={styles.freeVideoOptions}>
            {strengths.map((value, index) => <button type="button" key={value}
              data-mandala-video-strength={value} aria-pressed={strength === value}
              onClick={() => setStrength(value)}>{t.strengths[index]}</button>)}
          </div>
        </fieldset>
      </div>
      <fieldset className={styles.freeVideoFieldset} disabled={recording || preparing}>
        <legend>{t.captionMode}</legend>
        <div className={styles.freeVideoOptions}>
          {captionModes.map((value, index) => <button type="button" key={value}
            data-mandala-video-caption-mode={value} aria-pressed={captionMode === value}
            onClick={() => setCaptionMode(value)}>{t.captionModes[index]}</button>)}
        </div>
        {captionMode === "custom" && <label className={styles.freeVideoCaptionLabel}
          htmlFor="mandala-video-caption">{t.caption}
          <input id="mandala-video-caption" type="text" maxLength={72}
            value={customCaption} placeholder={t.captionPlaceholder}
            onChange={event => setCustomCaption(event.currentTarget.value)} />
        </label>}
      </fieldset>

      <div className={styles.freeVideoSectionLabel}>{t.aspect}</div>
      <div className={styles.freeVideoSettings}>
        <fieldset className={styles.freeVideoFieldset} disabled={recording || preparing}>
          <legend>{t.aspect}</legend>
          <div className={styles.freeVideoOptions}>
            <button type="button" data-mandala-video-aspect="square" aria-pressed={aspect === "square"}
              onClick={() => setAspect("square")}><Square size={14} aria-hidden="true" />{t.square}</button>
            <button type="button" data-mandala-video-aspect="portrait" aria-pressed={aspect === "portrait"}
              onClick={() => setAspect("portrait")}>{t.portrait}</button>
            <button type="button" data-mandala-video-aspect="landscape" aria-pressed={aspect === "landscape"}
              onClick={() => setAspect("landscape")}>{t.landscape}</button>
          </div>
        </fieldset>
        {!standalone && <fieldset className={styles.freeVideoFieldset} disabled={recording || preparing}>
          <legend>{t.duration}</legend>
          <div className={styles.freeVideoOptions}>
            {durations.map(seconds => <button type="button" key={seconds}
              data-mandala-video-duration={seconds} aria-pressed={duration === seconds}
              onClick={() => setDuration(seconds)}>{seconds} {t.seconds}</button>)}
          </div>
        </fieldset>}
        {standalone && <p className={styles.freeVideoPrivacy}>{t.personalAudio}</p>}
      </div>

      {photoIdentity ? (
        <label className={styles.freeVideoConsent}>
          <input type="checkbox" data-mandala-video-consent checked={photoConsent}
            disabled={recording || preparing} onChange={event => setPhotoConsent(event.currentTarget.checked)} />
          <span>{t.consent}</span>
        </label>
      ) : null}
      {photoIdentity && !photoConsent ? <p className={styles.freeVideoNotice}>{t.consentNeeded}</p> : null}
      {standalone && !audioFile && <p className={styles.freeVideoNotice}>{t.audioMissing}</p>}

      {recording ? (
        <>
          <div className={styles.freeVideoProgress} role="progressbar" aria-valuenow={progress}
            aria-valuemin={0} aria-valuemax={100} aria-label={t.creating}>
            <div style={{ width: progress + "%" }} />
          </div>
          <button type="button" className={styles.freeVideoAction} onClick={() => {
            const job = jobRef.current;
            if (job) stopJob(job, true);
            setNotice("");
          }}><X size={17} aria-hidden="true" />{t.cancel} · {progress}%</button>
        </>
      ) : (
        <button type="button" className={styles.freeVideoAction} disabled={!canCreate}
          onClick={createVideo} data-mandala-video-generate>
          <Sparkles size={17} aria-hidden="true" />{t.generate}
        </button>
      )}
      {!frameUrl ? <p className={styles.freeVideoNotice}>{t.imagePending}</p> : null}
      {notice ? <p className={styles.freeVideoNotice} role="status" aria-live="polite">{notice}</p> : null}
      {result && (
        <div className={styles.freeVideoDownloadGroup}>
          <a href={result.url} className={styles.freeVideoDownload}
            download={(standalone ? "holistic-house-my-video." : "holistic-house-personal-mandala.") + result.extension} data-mandala-video-download>
            <Download size={18} aria-hidden="true" />{t.download} · {Math.max(1, Math.round(result.bytes / 1024))} KB
          </a>
          <button type="button" className={styles.freeVideoShare} onClick={shareResult}
            data-mandala-video-share><Share2 size={17} aria-hidden="true" />{t.share}</button>
        </div>
      )}
      <p className={styles.freeVideoPrivacy}>{standalone ? t.personalPrivacy : t.privacy}</p>
      <p className={styles.freeVideoPrivacy}>{t.formatHint}</p>
    </section>
  );
}
