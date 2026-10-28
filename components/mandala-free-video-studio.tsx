"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Camera, Check, CirclePlay, Coins, Download, Film, Heart, Leaf, Music2, Pause, Play, Share2, SlidersHorizontal, Target, X } from "lucide-react";
import { moneyScenes } from "@/lib/mandala/money-flow-effects";
import { paintCinematicMoneyFrame, paintRealMoneyVideoFrame } from "@/lib/mandala/cinematic-money-video";
import { getRealMoneyFilm } from "@/lib/mandala/real-money-film-library";
import { otherVideoScenes, paintThemedVideoFrame } from "@/lib/mandala/holistic-video-themes";
import type { LocalSceneId, OtherTheme, VideoTheme } from "@/lib/mandala/holistic-video-themes";
import { startAmbientMusic } from "@/lib/mandala/local-video-music";
import type { AmbientMusic, AmbientSession } from "@/lib/mandala/local-video-music";
import type { MoneySceneId } from "@/lib/mandala/money-flow-effects";

import type { PublicLocale } from "@/lib/public-locales";
import styles from "./mandala-meditation.module.css";
import videoStyles from "./mandala-video-mobile.module.css";

type Effect = "glow" | "energy" | "prosperity" | "temple";
const BACKGROUND_CLIP="local-money-background-only";
type Aspect = "square" | "portrait" | "landscape";
type Quality = "hd" | "fullhd";
type Result = { url: string; extension: "mp4" | "webm"; bytes: number; blob: Blob; mime: string };
type Speed = "slow" | "dynamic";
type Brightness = "soft" | "bright";
type CaptionMode = "none" | "theme" | "custom";
type Job = {
  recorder: MediaRecorder;
  stream: MediaStream;
  animation: number;
  timeout: number;
  cancelled: boolean;
  musicSession: AmbientSession | null;
};

const translations = {
  en: {
    heading: "Your cinematic personal video",
    description: "A large personal portrait, golden coins with depth and luminous moving scenery. Record a real video locally without AI fees.",
    photoNote: "Your photograph stays still; coins and scenery move. A clear portrait or transparent PNG looks best.",
    quality: "Video quality", hd: "HD · 720p (faster)", fullhd: "Full HD · 1080p",
    landscape: "Wide · 16:9",
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
    heading: "Ваше кинематографичное личное видео",
    description: "Крупный портрет, объёмные золотые монеты, светящиеся пейзажи и настоящее движение в видео. Бесплатная запись на устройстве.",
    photoNote: "Фото остаётся неподвижным, движутся монеты и окружение. Лучше подходит портрет или PNG без фона.",
    quality: "Качество видео", hd: "HD · 720p (быстрее)", fullhd: "Full HD · 1080p",
    landscape: "Горизонтальный · 16:9",
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
    heading: "Tu vídeo personal cinematográfico",
    description: "Retrato grande, monedas doradas con profundidad y paisajes luminosos en movimiento. Graba un vídeo real gratis en tu dispositivo.",
    photoNote: "Tu foto permanece inmóvil; se mueven las monedas y el entorno. Usa un retrato claro o un PNG sin fondo.",
    quality: "Calidad de vídeo", hd: "HD · 720p (más rápido)", fullhd: "Full HD · 1080p",
    landscape: "Horizontal · 16:9",
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


const studioCopy = {
  en: {
    title:"Video editor",renderMode:"Video output",withPortrait:"With my photo",backgroundOnly:"Animated background only",backgroundHint:"Reuse this moving background underneath your own footage.",sub:"Create your personal video",back:"Back to support",
    myVideos:"My video",stepPhoto:"1. Add a photo",stepTheme:"2. Choose a theme",
    stepTemplate:"3. Choose a template",stepSettings:"4. Customize your video",
    themes:{money:"Money",relationships:"Relationships",energy:"Energy",goals:"Goals & meaning"},
    replace:"Replace photo",addPhoto:"Add photo",noPhoto:"Your photo here",photoPrivate:"Only on your device",
    allTemplates:"All templates",fewTemplates:"Show less",templateHint:"Moving scenery; your face stays unchanged",
    format:"Format",duration:"Duration",seconds:"sec",speed:"Movement",slow:"Calm",dynamic:"Dynamic",
    brightness:"Brightness",soft:"Soft",bright:"Bright",music:"Music",noMusic:"Silent",
    musicNames:{harmony:"Harmony",prosperity:"Prosperity",energy:"Energy",love:"Love",meditation:"Meditation"},
    originalAudio:"Original locally synthesized ambient audio",
    caption:"Video caption",noCaption:"No text",themeCaption:"Theme",myCaption:"My words",
    captionPlaceholder:"Your short phrase",quality:"Output quality",hd:"HD (fast)",fullhd:"Full HD",
    preview:"Preview animation",stopPreview:"Pause preview",videoPreview:"Your finished video",
    consent:"I own this photo or have permission to use it in my video.",
    consentHelp:"Please confirm permission to use the chosen photo.",
    create:"Create video for free",creating:"Creating your video",cancel:"Cancel",save:"Save video",
    share:"Share / Save to Files",shareUnsupported:"Sharing is unavailable on this device; download the video instead.",
    noStorage:"Free local creation · your photo is never uploaded or stored on our servers.",
    musicFallback:"This browser could not include audio; the saved clip is silent.",
    ready:"Video created. You can play, save or share it.",
    myVideosInfo:"Video is available only on this page until you save it to your device.",
    settings:"Settings",home:"Home",meditations:"Meditations",createTab:"Create",
    advanced:"Mandala & guided meditations",photoError:"Try a JPG, PNG or WebP image smaller than 10 MB.",
  },
  ru: {
    title:"Видеоредактор",renderMode:"Вариант ролика",withPortrait:"С моим фото",backgroundOnly:"Только видеофон",backgroundHint:"Фон без портрета, который можно добавить в свой видеомонтаж.",sub:"Создай своё персональное видео",back:"К поддержке",
    myVideos:"Мои видео",stepPhoto:"1. Загрузите фото",stepTheme:"2. Выберите тему",
    stepTemplate:"3. Выберите шаблон",stepSettings:"4. Настройте видео",
    themes:{money:"Деньги",relationships:"Отношения",energy:"Энергия",goals:"Цели и смыслы"},
    replace:"Заменить фото",addPhoto:"Загрузить фото",noPhoto:"Ваше фото",photoPrivate:"Только на устройстве",
    allTemplates:"Все шаблоны",fewTemplates:"Свернуть",templateHint:"Анимируется фон; лицо на фото не меняется",
    format:"Формат",duration:"Длительность",seconds:"сек",speed:"Движение",slow:"Спокойное",dynamic:"Динамичное",
    brightness:"Яркость",soft:"Мягкая",bright:"Яркая",music:"Музыка",noMusic:"Без музыки",
    musicNames:{harmony:"Гармония",prosperity:"Процветание",energy:"Энергия",love:"Любовь",meditation:"Медитация"},
    originalAudio:"Оригинальный звуковой фон создаётся прямо в браузере",
    caption:"Надпись на видео",noCaption:"Без текста",themeCaption:"Тема",myCaption:"Моя фраза",
    captionPlaceholder:"Напишите короткую фразу",quality:"Качество файла",hd:"HD (быстрее)",fullhd:"Full HD",
    preview:"Посмотреть анимацию",stopPreview:"Остановить предпросмотр",videoPreview:"Ваше готовое видео",
    consent:"Это моё фото или у меня есть разрешение использовать его в этом видео.",
    consentHelp:"Подтвердите право использовать выбранное фото.",
    create:"Создать видео бесплатно",creating:"Создаётся видео",cancel:"Отменить",save:"Сохранить видео",
    share:"Поделиться / Сохранить в Файлы",shareUnsupported:"Передача файла недоступна. Сохраните его кнопкой выше.",
    noStorage:"Бесплатно, прямо в браузере · фото не отправляется и не хранится на сервере.",
    musicFallback:"Браузер не смог добавить звук — видео сохранено без музыки.",
    ready:"Видео создано. Можно посмотреть, сохранить или поделиться.",
    myVideosInfo:"Ролик доступен на этой странице, пока вы его не сохранили на устройство.",
    settings:"Настройки",home:"Главная",meditations:"Медитации",createTab:"Создать",
    advanced:"Мандала и авторские медитации",photoError:"Загрузите JPG, PNG или WebP до 10 МБ.",
  },
  es: {
    title:"Editor de vídeo",renderMode:"Tipo de vídeo",withPortrait:"Con mi foto",backgroundOnly:"Solo fondo animado",backgroundHint:"Fondo animado para usar debajo de otro vídeo.",sub:"Crea tu vídeo personal",back:"Volver a apoyo",
    myVideos:"Mi vídeo",stepPhoto:"1. Sube una foto",stepTheme:"2. Elige un tema",
    stepTemplate:"3. Elige una plantilla",stepSettings:"4. Personaliza el vídeo",
    themes:{money:"Dinero",relationships:"Relaciones",energy:"Energía",goals:"Metas y sentido"},
    replace:"Cambiar foto",addPhoto:"Subir foto",noPhoto:"Tu foto",photoPrivate:"Solo en tu dispositivo",
    allTemplates:"Todas las plantillas",fewTemplates:"Mostrar menos",templateHint:"Se anima el entorno; tu rostro no se altera",
    format:"Formato",duration:"Duración",seconds:"seg",speed:"Movimiento",slow:"Tranquilo",dynamic:"Dinámico",
    brightness:"Brillo",soft:"Suave",bright:"Vivo",music:"Música",noMusic:"Sin música",
    musicNames:{harmony:"Armonía",prosperity:"Prosperidad",energy:"Energía",love:"Amor",meditation:"Meditación"},
    originalAudio:"Ambiente sonoro original generado en el navegador",
    caption:"Texto en el vídeo",noCaption:"Sin texto",themeCaption:"Tema",myCaption:"Mis palabras",
    captionPlaceholder:"Escribe una frase corta",quality:"Calidad de vídeo",hd:"HD (rápido)",fullhd:"Full HD",
    preview:"Ver animación",stopPreview:"Detener vista previa",videoPreview:"Tu vídeo terminado",
    consent:"Soy propietario de esta foto o tengo permiso para usarla en el vídeo.",
    consentHelp:"Confirma tu permiso para usar esta foto.",
    create:"Crear vídeo gratis",creating:"Creando vídeo",cancel:"Cancelar",save:"Guardar vídeo",
    share:"Compartir / Guardar en Archivos",shareUnsupported:"No se puede compartir; descarga el vídeo con el botón anterior.",
    noStorage:"Gratis, directamente en el navegador · tu foto nunca se envía ni se almacena.",
    musicFallback:"El navegador no pudo añadir audio; el vídeo se guardó en silencio.",
    ready:"Vídeo creado. Puedes verlo, guardarlo o compartirlo.",
    myVideosInfo:"El vídeo está disponible aquí hasta que lo guardes en tu dispositivo.",
    settings:"Ajustes",home:"Inicio",meditations:"Meditaciones",createTab:"Crear",
    advanced:"Mandala y meditaciones originales",photoError:"Usa JPG, PNG o WebP de hasta 10 MB.",
  }
} as const;
const musicChoices: AmbientMusic[] = ["none","harmony","prosperity","energy","love","meditation"];
const preferredMoney = ["golden-rain","abundance-tree","cosmic-flow","path-to-goals"] as const;
const moneyTemplateLabels: Partial<Record<MoneySceneId,Record<VideoLocale,string>>> = {
  "golden-rain":{en:"Money fountain",ru:"Фонтан денег",es:"Fuente de dinero"},
  "abundance-tree":{en:"Abundance tree",ru:"Дерево изобилия",es:"Árbol de abundancia"},
  "cosmic-flow":{en:"Prosperity flow",ru:"Поток процветания",es:"Flujo de prosperidad"},
  "path-to-goals":{en:"Golden portal",ru:"Золотой портал",es:"Portal dorado"},
};
type VideoLocale = PublicLocale;
const moneyTemplates = [
  ...preferredMoney.map(id => moneyScenes.find(scene=>scene.id===id)!),
  ...moneyScenes.filter(scene=>!preferredMoney.some(id=>id===scene.id)),
];

const effects: Effect[] = ["glow", "energy", "prosperity", "temple"];
const durations = [10, 20, 30, 60] as const;
const themeChoices: VideoTheme[] = ["money","relationships","energy","goals"];
const themeMusic: Exclude<AmbientMusic,"none">[] = ["harmony","prosperity","energy","love","meditation"];
const musicBackgrounds = [
  "linear-gradient(145deg,#f7cf9a,#688b89)",
  "linear-gradient(145deg,#bd9b57,#324f37)",
  "linear-gradient(145deg,#f9b39c,#9b667e)",
  "linear-gradient(145deg,#e3a0bf,#bd9f4b)",
  "linear-gradient(145deg,#c5d0ce,#44617b)"
];

function formatDimensions(aspect: Aspect, quality: Quality): [number, number] {
  const edge = quality === "fullhd" ? 1080 : 720;
  if (aspect === "square") return [edge, edge];
  if (aspect === "landscape") return [Math.round(edge * 16 / 9), edge];
  return [edge, Math.round(edge * 16 / 9)];
}

// Genuine still frames from the identical cinematic renderer used for video.
// No fake play icons or misleading pictures of actors.
// Tap to play exactly one visible thumbnail, without autoplay or 12 decoders.
function CinematicSceneThumbnail({ scene, photo, title, playing }: {
  scene: MoneySceneId; photo: HTMLImageElement | null; title: string; playing: boolean;
}) {
  const ref=useRef<HTMLVideoElement>(null);
  const [visible,setVisible]=useState(false);
  const film=getRealMoneyFilm(scene);
  useEffect(()=>{
    const el=ref.current;
    if(!el)return;
    if(typeof IntersectionObserver==="undefined"){setVisible(true);return;}
    const observer=new IntersectionObserver(([entry])=>setVisible(Boolean(entry?.isIntersecting)),
      {threshold:.05,rootMargin:"100px"});
    observer.observe(el);
    return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const video=ref.current;
    if(!video)return;
    if(!playing||!visible){video.pause();return;}
    // Genuine H.264 frames from first-party MP4: never start playback on
    // page load, never render a fake canvas loop as a video thumbnail.
    video.muted=true;
    void video.play().catch(()=>{/* iPhone may need another direct tap. */});
    return ()=>video.pause();
  },[playing,visible,scene]);
  return <video ref={ref} muted playsInline loop preload="none"
    src={film.src} poster={film.poster}
    aria-label={title} data-mandala-scene-preview={scene}
    data-real-mp4={film.src} data-photo-overlay-available={photo?"true":"false"}
    data-scene-playing={playing&&visible?"true":"false"}
    className={styles.moneyFlowThumb}/>;
}

function ThemedSceneThumbnail({ theme, scene, photo, title }: {
  theme: OtherTheme; scene: LocalSceneId; photo: HTMLImageElement | null; title: string;
}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const context=ref.current?.getContext("2d", { alpha:false });
    if(context) paintThemedVideoFrame(context, photo, theme, scene, 3.2, title);
  },[theme,scene,photo,title]);
  return <canvas ref={ref} width={176} height={228} className={videoStyles.templateArt} aria-hidden="true"/>;
}

function chooseMime(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
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
function loadSceneImage(url:string):Promise<HTMLImageElement|null>{
  return url===BACKGROUND_CLIP?Promise.resolve(null):loadLocalImage(url);
}

// Fixed deterministic geometry gives motion without network imagery, AI credits,
// external services or third-party assets. The original user photograph is
// already composited in the local mandala PNG; no pixel is transmitted.
function paint(
  ctx: CanvasRenderingContext2D, art: HTMLImageElement | null,
  effect: Effect, time: number, aspect: Aspect, moneyScene: MoneySceneId | null, title: string,
  theme: VideoTheme = "money", otherScene: LocalSceneId = "sun-flight",
  speed: Speed = "slow", brightness: Brightness = "soft",
  realVideo: HTMLVideoElement | null = null,
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const adjustedTime = time * (speed === "dynamic" ? 1.45 : .76);
  if (theme !== "money") {
    paintThemedVideoFrame(ctx, art, theme, otherScene, adjustedTime, title);
    if(brightness === "bright"){
      ctx.fillStyle="rgba(255,246,197,.075)";ctx.fillRect(0,0,width,height);
    }
    return;
  }
  if (moneyScene) {
    if (realVideo && realVideo.readyState >= 2 && realVideo.videoWidth > 0) {
      paintRealMoneyVideoFrame(ctx, art, moneyScene, adjustedTime, aspect, title, realVideo);
    } else {
      paintCinematicMoneyFrame(ctx, art, moneyScene, adjustedTime, aspect, title);
    }
    if(brightness === "bright"){
      ctx.fillStyle="rgba(255,241,197,.06)";ctx.fillRect(0,0,width,height);
    }
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
  job.musicSession?.close();
}

export function MandalaFreeVideoStudio({ locale, frameUrl, photoUrl, onPickPhoto, photoError }: {
  locale: PublicLocale; frameUrl: string | null; photoUrl?: string | null;
  onPickPhoto: () => void; photoError?: string;
}) {
  const t = translations[locale];
  const ui = studioCopy[locale];
  const [theme, setTheme] = useState<VideoTheme>("money");
  const effect: Effect = "glow";
  const [moneyScene, setMoneyScene] = useState<MoneySceneId | null>("golden-rain");
  const [backgroundOnly,setBackgroundOnly]=useState(false);
  const [otherScene, setOtherScene] = useState<LocalSceneId>("sun-flight");
  const [showAllMoney, setShowAllMoney] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [aspect, setAspect] = useState<Aspect>("portrait");
  const [quality, setQuality] = useState<Quality>("hd");
  const [duration, setDuration] = useState<(typeof durations)[number]>(20);
  const [speed,setSpeed] = useState<Speed>("slow");
  const [brightness,setBrightness] = useState<Brightness>("soft");
  const [music,setMusic] = useState<AmbientMusic>("none");
  const [captionMode,setCaptionMode] = useState<CaptionMode>("theme");
  const [customCaption,setCustomCaption] = useState("");
  const [photoConsent,setPhotoConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [progress,setProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const [musicWarning,setMusicWarning] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jobRef = useRef<Job | null>(null);
  const aliveRef = useRef(false);
  const preparingRef = useRef(false);
  const source = theme==="money" && backgroundOnly ? BACKGROUND_CLIP : photoUrl || frameUrl;
  const sceneName = theme === "money"
    ? moneyTemplateLabels[moneyScene || "golden-rain"]?.[locale] ||
      moneyScenes.find(item => item.id === moneyScene)?.label[locale] || ""
    : otherVideoScenes[theme].find(item => item.id === otherScene)?.label[locale] || "";
  const caption = captionMode==="none" ? "" :
    captionMode==="custom" ? customCaption.trim() : sceneName;
  const signature = JSON.stringify([source,frameUrl,photoUrl,theme,moneyScene,otherScene,backgroundOnly,
    effect,aspect,duration,quality,speed,brightness,music,caption]);
  const sourceRef = useRef(signature);
  sourceRef.current = signature;
  const canGenerate = Boolean(source) && (backgroundOnly || !photoUrl || photoConsent) && !preparing && !recording;
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
  // A new visitor's photo must never inherit another person's consent.
  useEffect(() => { setPhotoConsent(false); }, [photoUrl]);
  useEffect(() => {
    if (!recording) return;
    const onBackground = () => {
      if (!document.hidden) return;
      const job = jobRef.current;
      if (job) stopJob(job, true);
      setNotice(ui.noStorage);
    };
    document.addEventListener("visibilitychange", onBackground);
    return () => document.removeEventListener("visibilitychange", onBackground);
  }, [recording, ui.noStorage]);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || jobRef.current) return;
    const [w,h] = formatDimensions(aspect, "hd");
    if(canvas.width !== w) canvas.width=w;
    if(canvas.height !== h) canvas.height=h;
  }, [aspect]);

  // Invalidate the result when the client photo, composition or preset changes.
  // Never leave a previous client's exported video visible after replacement.
  useEffect(() => {
    const job=jobRef.current;
    if (job) stopJob(job, true);
    setResult(null);
    setNotice("");
    setPreviewPlaying(false);
  }, [signature]);

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
      const [width,height] = formatDimensions(aspect,"hd");
      canvas.width=width;canvas.height=height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;
      paint(ctx,image,effect,0,aspect,moneyScene,caption,theme,otherScene,speed,brightness);
      if (!previewPlaying) return;
      const draw = (now: number) => {
        if (cancelled || jobRef.current) return;
        if (!startedAt) startedAt = now;
        if (now - lastFrame >= 80 && !document.hidden) {
          paint(ctx,image,effect,(now-startedAt)/1000,aspect,moneyScene,caption,theme,otherScene,speed,brightness);
          lastFrame = now;
        }
        animation = window.requestAnimationFrame(draw);
      };
      animation = window.requestAnimationFrame(draw);
    }).catch(() => { /* PNG preparation can be retried in the parent editor. */ });
    return () => { cancelled = true; window.cancelAnimationFrame(animation); };
  }, [source, effect, moneyScene, theme, otherScene, aspect, previewPlaying, speed, brightness, caption]);

  async function createVideo() {
    if (!canGenerate || !source || jobRef.current || preparingRef.current) return;
    const snapshot=source;
    const snapshotKey=signature;
    preparingRef.current=true;
    setPreparing(true);setProgress(0);setNotice(t.preparing);setMusicWarning("");
    setResult(null);setPreviewPlaying(false);
    let stream:MediaStream|null=null;
    let musicSession:AmbientSession|null=null;
    try {
      musicSession = await startAmbientMusic(music);
      if(music !== "none" && !musicSession) setMusicWarning(ui.musicFallback);
      const image=await loadSceneImage(snapshot);
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
      paint(ctx,image,effect,0,aspect,moneyScene,caption,theme,otherScene,speed,brightness);
      const framesPerSecond = quality === "fullhd" ? 12 : 15;
      stream = canvas.captureStream(framesPerSecond);
      if (!stream.getVideoTracks().length) throw new Error("Canvas stream unavailable");
      if (musicSession) stream.addTrack(musicSession.track);

      const mimeType = chooseMime();
      if (!mimeType) throw new Error("Recording format unsupported");
      let recorder: MediaRecorder;
      const recorderOptions={mimeType,videoBitsPerSecond:quality==="fullhd"?5_000_000:3_000_000};
      try { recorder=new MediaRecorder(stream,recorderOptions); }
      catch {
        // Some mobile browsers support silent video but not combined audio.
        if (!musicSession) throw new Error("Unsupported browser codec");
        musicSession.close();musicSession=null;
        stream.getAudioTracks().forEach(track=>{stream?.removeTrack(track);track.stop();});
        setMusicWarning(ui.musicFallback);
        recorder=new MediaRecorder(stream,recorderOptions);
      }
      const chunks: Blob[] = [];
      const job: Job = { recorder, stream, animation: 0, timeout: 0, cancelled: false, musicSession };
      musicSession=null;
      jobRef.current = job;

      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        stopJob(job,true);
        if (aliveRef.current) setNotice(t.failed);
      };
      recorder.onstop = () => {
        job.stream.getTracks().forEach(track => track.stop());
        job.musicSession?.close();
        if (jobRef.current !== job || !aliveRef.current) return;
        jobRef.current=null;
        setRecording(false);
        if(job.cancelled) return;
        setProgress(100);
        const type=recorder.mimeType || mimeType;
        const blob = new Blob(chunks, { type });
        if (!blob.size) {
          setNotice(t.failed);
          return;
        }
        setResult({
          url: URL.createObjectURL(blob),
          extension: type.includes("mp4") ? "mp4" : "webm",
          bytes: blob.size,blob,mime:type,
        });
        setNotice(t.ready);
      };

      // This user-triggered browser recorder never contacts a backend.
      recorder.start(500);
      const start = performance.now();
      let lastFrame = -1000;
      let lastProgress = 0;
      const animate = (now: number) => {
        if (jobRef.current !== job || job.recorder.state !== "recording") return;
        if (now - lastFrame >= 1000 / framesPerSecond) {
          paint(ctx,image,effect,Math.min(duration,(now-start)/1000),aspect,moneyScene,caption,theme,otherScene,speed,brightness);
          lastFrame=now;
          if(now-lastProgress>650){
            lastProgress=now;
            setProgress(Math.min(99,Math.floor((now-start)*100/(duration*1000))));
          }
        }
        job.animation = requestAnimationFrame(animate);
      };
      job.animation = requestAnimationFrame(animate);
      job.timeout = window.setTimeout(() => stopJob(job, false), duration * 1000);
      setRecording(true);
      setNotice(t.creating);
    } catch {
      musicSession?.close();
      if(stream) stream.getTracks().forEach(track=>track.stop());
      jobRef.current=null;
      setRecording(false);
      setNotice(t.failed);
    } finally {
      preparingRef.current=false;
      if(aliveRef.current)setPreparing(false);
      musicSession?.close();
    }
  }

  async function shareVideo(){
    if(!result)return;
    const file=new File([result.blob],"holistic-house-personal."+result.extension,{type:result.mime});
    if(typeof navigator.share!=="function" ||
      (typeof navigator.canShare==="function" && !navigator.canShare({files:[file]}))){
      setNotice(ui.shareUnsupported);return;
    }
    try{await navigator.share({files:[file],title:ui.title});}
    catch(e){if(!(e instanceof DOMException && e.name==="AbortError"))setNotice(ui.shareUnsupported);}
  }
  const activeTemplates=theme==="money"?moneyTemplates:otherVideoScenes[theme];
  const visibleTemplates=activeTemplates.slice(0,showAllMoney?activeTemplates.length:4);
  const selectCategory=(next:VideoTheme)=>{
    setTheme(next);setShowAllMoney(false);setPreviewPlaying(false);setBackgroundOnly(false);
    if(next==="money")setMoneyScene("golden-rain");
    else {setMoneyScene(null);setOtherScene(otherVideoScenes[next][0].id);}
  };

  return (
    <section className={videoStyles.studio} id="free-personal-video"
      data-mandala-free-video lang={locale} aria-label={ui.title}>
      <div className={videoStyles.studioTop}>
        <Link className={videoStyles.back} href={"/"+locale+"/holistic-support/mobile"}
          aria-label={ui.back} prefetch={false}><ArrowLeft aria-hidden="true" size={24}/></Link>
        <div className={videoStyles.brandTitle}>
          <h2>{ui.title}</h2><p>{ui.sub}</p>
        </div>
        <a className={videoStyles.myVideos} href="#personal-video-result">
          <BookOpen aria-hidden="true" size={18}/><span>{ui.myVideos}</span>
        </a>
      </div>

      <div className={videoStyles.firstSteps}>
        <section className={videoStyles.photoCard} aria-labelledby="video-photo-heading">
          <h3 id="video-photo-heading">{ui.stepPhoto}</h3>
          <button type="button" className={videoStyles.photoPortrait}
            data-video-photo-picker disabled={recording || preparing}
            onClick={onPickPhoto} aria-label={photoUrl?ui.replace:ui.addPhoto}>
            {photoUrl ? (
              // Private local blob, not a Next.js optimized or remote image.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" draggable={false}/>
            ) : <span className={videoStyles.photoEmpty}><Camera aria-hidden="true" size={36}/><small>{ui.noPhoto}</small></span>}
            <span className={videoStyles.cameraCircle}><Camera size={17} aria-hidden="true"/></span>
          </button>
          <button type="button" className={videoStyles.replacePhoto}
            disabled={recording||preparing} onClick={onPickPhoto}>
            <Camera size={17} aria-hidden="true"/>{photoUrl?ui.replace:ui.addPhoto}
          </button>
          {photoError ? <p className={videoStyles.warning} role="alert">{ui.photoError}</p> : null}
          <small className={videoStyles.photoPrivacy}>{ui.photoPrivate}</small>
        </section>
        <section className={videoStyles.themeCard} aria-labelledby="video-theme-heading">
          <h3 id="video-theme-heading">{ui.stepTheme}</h3>
          <div className={videoStyles.themeGrid} role="group" aria-label={ui.stepTheme}>
            {themeChoices.map(item=>{
              const Icon=item==="money"?Coins:item==="relationships"?Heart:item==="energy"?Leaf:Target;
              return <button type="button" key={item} data-video-theme={item}
                className={videoStyles.themeButton} data-theme={item}
                disabled={recording||preparing} aria-pressed={theme===item}
                onClick={()=>selectCategory(item)}>
                <Icon size={28} aria-hidden="true"/>
                <span>{ui.themes[item]}</span>
                {theme===item ? <Check size={17} className={videoStyles.checked} aria-hidden="true"/> : null}
              </button>;
            })}
          </div>
        </section>
      </div>

      {theme==="money" && <fieldset className={videoStyles.backgroundMode} data-mandala-output-mode disabled={recording||preparing}>
        <legend>{ui.renderMode}</legend>
        <div className={videoStyles.backgroundChoices}>
          <button type="button" aria-pressed={!backgroundOnly} onClick={()=>setBackgroundOnly(false)}>
            <Camera size={16} aria-hidden="true"/>{ui.withPortrait}</button>
          <button type="button" aria-pressed={backgroundOnly} onClick={()=>setBackgroundOnly(true)}>
            <Film size={16} aria-hidden="true"/>{ui.backgroundOnly}</button>
        </div>
        {backgroundOnly?<small>{ui.backgroundHint}</small>:null}
      </fieldset>}
      <section className={videoStyles.templates} data-mandala-money-effects
        aria-labelledby="video-templates-heading">
        <div className={videoStyles.sectionHeading}>
          <h3 id="video-templates-heading">{ui.stepTemplate}</h3>
          {activeTemplates.length>4 &&
            <button type="button" data-video-all-templates disabled={recording||preparing}
              aria-expanded={showAllMoney} onClick={()=>setShowAllMoney(value=>!value)}>
              {showAllMoney?ui.fewTemplates:ui.allTemplates}<ArrowRight size={17} aria-hidden="true"/>
            </button>}
        </div>
        <div className={videoStyles.templateRail} role="group" aria-label={ui.stepTemplate}>
          {theme==="money" ? visibleTemplates.map((scene,index)=>{
            const money=scene as (typeof moneyScenes)[number];
            const name=moneyTemplateLabels[money.id]?.[locale] || money.label[locale];
            return <button type="button" key={money.id}
              data-mandala-money-option={money.id} data-video-template={money.id}
              className={videoStyles.templateTile} disabled={recording||preparing}
              aria-pressed={moneyScene===money.id}
              onClick={()=>{if(moneyScene===money.id&&previewPlaying)setPreviewPlaying(false);
                else{setMoneyScene(money.id);setPreviewPlaying(true);}}}>
              <CinematicSceneThumbnail scene={money.id} title={name}
                photo={backgroundOnly?null:sharedThumbnailPhoto}
                playing={moneyScene===money.id&&previewPlaying&&!recording}/>
              <span className={videoStyles.tileShade} aria-hidden="true"/>
              <span className={videoStyles.tileName}>{name}</span>
              {moneyScene===money.id ? <span className={videoStyles.tileCheck}><Check size={14} aria-hidden="true"/></span>:null}
              <span className={videoStyles.srOnly}>{index+1}</span>
            </button>;
          }) : visibleTemplates.map(scene=>{
            const other=scene as (typeof otherVideoScenes)[OtherTheme][number];
            return <button type="button" key={other.id}
              data-video-template={other.id}
              className={videoStyles.templateTile} disabled={recording||preparing}
              aria-pressed={otherScene===other.id}
              onClick={()=>{setOtherScene(other.id);setPreviewPlaying(false);}}>
              <ThemedSceneThumbnail theme={theme} scene={other.id}
                title={other.label[locale]} photo={sharedThumbnailPhoto}/>
              <span className={videoStyles.tileShade} aria-hidden="true"/>
              <span className={videoStyles.tileName}>{other.label[locale]}</span>
              {otherScene===other.id ? <span className={videoStyles.tileCheck}><Check size={14} aria-hidden="true"/></span>:null}
            </button>;
          })}
        </div>
        <div className={videoStyles.templateFooter}>
          <span className={videoStyles.pagerDots} aria-hidden="true"><i/><i/><i/><i/></span>
          <small>{ui.templateHint}</small>
        </div>
        <div className={videoStyles.previewRow}>
          <button type="button" className={videoStyles.previewButton}
            data-mandala-money-preview data-video-preview-toggle
            disabled={!source || recording || preparing} aria-pressed={previewPlaying}
            onClick={()=>setPreviewPlaying(open=>!open)}>
            {previewPlaying?<Pause size={17} aria-hidden="true"/>:<CirclePlay size={17} aria-hidden="true"/>}
            {previewPlaying?ui.stopPreview:ui.preview}
          </button>
          <div className={videoStyles.canvasWindow} data-video-preview-frame>
            <canvas key={aspect} ref={canvasRef} width={formatDimensions(aspect,"hd")[0]}
              height={formatDimensions(aspect,"hd")[1]} data-mandala-cinematic-canvas
              aria-label={ui.preview}/>
          </div>
        </div>
      </section>

      <section id="video-settings" className={videoStyles.settings} aria-labelledby="video-settings-heading">
        <h3 id="video-settings-heading">{ui.stepSettings}</h3>
        <div className={videoStyles.settingsGrid}>
          <fieldset className={videoStyles.settingCard} disabled={recording||preparing}>
            <legend>{ui.duration}</legend>
            <div className={videoStyles.pills}>
              {durations.map(n=><button key={n} type="button" aria-pressed={duration===n}
                data-video-duration={n} onClick={()=>setDuration(n)}>{n} {ui.seconds}</button>)}
            </div>
          </fieldset>
          <fieldset className={videoStyles.settingCard} disabled={recording||preparing}>
            <legend>{ui.format}</legend>
            <div className={videoStyles.pills}>
              {(["portrait","square","landscape"] as Aspect[]).map((format,i)=>
                <button type="button" key={format} data-video-aspect={format}
                  aria-pressed={aspect===format}
                  onClick={()=>setAspect(format)} onPointerUp={()=>setAspect(format)}>
                  <span className={videoStyles.formatIcon} data-format={format} aria-hidden="true"/>
                  {["9:16","1:1","16:9"][i]}
                </button>)}
            </div>
          </fieldset>
          <fieldset className={videoStyles.settingCard} disabled={recording||preparing}>
            <legend>{ui.speed}</legend>
            <div className={videoStyles.pills}>
              <button type="button" aria-pressed={speed==="slow"} onClick={()=>setSpeed("slow")}>{ui.slow}</button>
              <button type="button" aria-pressed={speed==="dynamic"} onClick={()=>setSpeed("dynamic")}>{ui.dynamic}</button>
            </div>
          </fieldset>
          <fieldset className={videoStyles.settingCard} disabled={recording||preparing}>
            <legend>{ui.brightness}</legend>
            <div className={videoStyles.pills}>
              <button type="button" aria-pressed={brightness==="soft"} onClick={()=>setBrightness("soft")}>{ui.soft}</button>
              <button type="button" aria-pressed={brightness==="bright"} onClick={()=>setBrightness("bright")}>{ui.bright}</button>
            </div>
          </fieldset>
        </div>

        <fieldset className={videoStyles.musicCard} disabled={recording||preparing}>
          <legend><Music2 size={18} aria-hidden="true"/>{ui.music}</legend>
          <div className={videoStyles.musicRail}>
            {themeMusic.map((choice,i)=>
              <button type="button" key={choice} data-video-music={choice}
                aria-pressed={music===choice} onClick={()=>setMusic(choice)}
                style={{background:musicBackgrounds[i]}}>
                <span aria-hidden="true">{["♫","✧","✺","♡","◌"][i]}</span>
                <strong>{ui.musicNames[choice]}</strong>
                {music===choice?<Check size={14} className={videoStyles.musicCheck} aria-hidden="true"/>:null}
              </button>)}
            <button type="button" className={videoStyles.silent} data-video-music="none"
              aria-pressed={music==="none"} onClick={()=>setMusic("none")}>
              <span>×</span><strong>{ui.noMusic}</strong>
            </button>
          </div>
          <small>{ui.originalAudio}</small>
        </fieldset>

        <fieldset className={videoStyles.captionCard} disabled={recording||preparing}>
          <legend>{ui.caption}</legend>
          <div className={videoStyles.captionLayout}>
            <div className={videoStyles.captionModes}>
              {(["none","theme","custom"] as CaptionMode[]).map((mode,i)=>
                <button type="button" key={mode} aria-pressed={captionMode===mode}
                  data-video-caption-mode={mode} onClick={()=>setCaptionMode(mode)}>
                  {["⊘","✣","✎"][i]}<span>{[ui.noCaption,ui.themeCaption,ui.myCaption][i]}</span>
                </button>)}
            </div>
            <input type="text" maxLength={60} disabled={captionMode!=="custom"||recording||preparing}
              aria-label={ui.caption} placeholder={ui.captionPlaceholder}
              value={captionMode==="custom"?customCaption:captionMode==="theme"?sceneName:""}
              onChange={event=>setCustomCaption(event.currentTarget.value)}/>
          </div>
        </fieldset>

        <details className={videoStyles.qualityDetails}>
          <summary><SlidersHorizontal size={17} aria-hidden="true"/>{ui.quality}</summary>
          <div className={videoStyles.pills} data-mandala-quality>
            <button type="button" disabled={recording||preparing} aria-pressed={quality==="hd"}
              onClick={()=>setQuality("hd")}>{ui.hd}</button>
            <button type="button" disabled={recording||preparing} aria-pressed={quality==="fullhd"}
              onClick={()=>setQuality("fullhd")}>{ui.fullhd}</button>
          </div>
        </details>
      </section>

      {photoUrl && !backgroundOnly ? (
        <label className={videoStyles.consent}>
          <input type="checkbox" data-video-photo-consent checked={photoConsent}
            disabled={recording||preparing} onChange={event=>setPhotoConsent(event.target.checked)}/>
          <span>{ui.consent}</span>
        </label>
      ) : null}
      {photoUrl&&!backgroundOnly&&!photoConsent?<p role="status" className={videoStyles.warning}>{ui.consentHelp}</p>:null}

      {recording ? (
        <div className={videoStyles.recording}>
          <div className={videoStyles.progress}><span style={{width:progress+"%"}}/></div>
          <button type="button" className={videoStyles.generate} onClick={()=>{
            const job=jobRef.current;
            if(job)stopJob(job,true);
            setNotice("");
          }}><X size={20} aria-hidden="true"/>{ui.cancel} · {progress}%</button>
        </div>
      ):(
        <button type="button" className={videoStyles.generate} data-mandala-video-generate
          disabled={!canGenerate} onClick={createVideo}>
          <Play size={21} fill="currentColor" aria-hidden="true"/>{ui.create}
        </button>
      )}
      {!source?<p role="status" className={videoStyles.warning}>{t.imagePending}</p>:null}
      {notice?<p role="status" className={videoStyles.notice} aria-live="polite">{notice}</p>:null}
      {musicWarning?<p role="status" className={videoStyles.warning}>{musicWarning}</p>:null}
      <p className={videoStyles.privacy}><Check size={15} aria-hidden="true"/>{ui.noStorage}</p>

      <section className={videoStyles.result} id="personal-video-result" data-video-result>
        <h3>{ui.videoPreview}</h3>
        {result ? (
          <>
            <video src={result.url} controls playsInline preload="metadata"
              data-mandala-video-preview/>
            <div className={videoStyles.resultActions}>
              <a className={videoStyles.download} href={result.url}
                download={"holistic-house-"+(backgroundOnly?"money-background":"personal-mandala")+"."+result.extension}
                data-mandala-video-download>
                <Download size={18} aria-hidden="true"/>{ui.save} · {Math.max(1,Math.round(result.bytes/1024))} KB
              </a>
              <button type="button" onClick={shareVideo} data-video-share>
                <Share2 size={18} aria-hidden="true"/>{ui.share}
              </button>
            </div>
          </>
        ):<p>{ui.myVideosInfo}</p>}
      </section>

      <nav className={videoStyles.bottomNav} aria-label={ui.title}>
        <Link href={"/"+locale+"/"} prefetch={false}><BookOpen size={21} aria-hidden="true"/>{ui.home}</Link>
        <Link href={"/"+locale+"/holistic-support/mobile"} prefetch={false}><Leaf size={21} aria-hidden="true"/>{ui.meditations}</Link>
        <a href="#free-personal-video" aria-current="page"><Film size={22} aria-hidden="true"/>{ui.createTab}</a>
        <a href="#personal-video-result"><CirclePlay size={21} aria-hidden="true"/>{ui.myVideos}</a>
        <a href="#video-settings"><SlidersHorizontal size={21} aria-hidden="true"/>{ui.settings}</a>
      </nav>
    </section>
  );
}
