"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ArrowLeft, Download, Expand, ImagePlus, Minimize2, Play, Sparkles, Trash2 } from "lucide-react";

import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { MandalaFreeVideoStudio } from "@/components/mandala-free-video-studio";
import { renderMandalaPng } from "@/lib/mandala/export-png";
import type { MeditationTopic, MeditationVideo } from "@/data/academy/holistic-support-meditations";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./mandala-meditation.module.css";
import {prepareBrowserPhoto,SUPPORT_PHOTO_ACCEPT} from "@/lib/mandala/prepare-browser-photo";

/**
 * Public, lightweight adaptation of Reiki Yggdrasil's Power Place constructor.
 * Photos are represented by local blob URLs and are never posted or persisted.
 * The original source's geometries and stone-mosaic template are preserved.
 */
const templates = [
  { id: "client", names: { en: "Lotus", ru: "Лотос", es: "Loto" }, back: "#563d54", ink: "#f7d3e2", soft: "#d5a8c5" },
  { id: "zodiac", names: { en: "Zodiac", ru: "Зодиак", es: "Zodiaco" }, back: "#243e50", ink: "#f5d9a0", soft: "#8aa6b5" },
  { id: "star", names: { en: "Star", ru: "Звезда", es: "Estrella" }, back: "#27395f", ink: "#e8e6bb", soft: "#9caedf" },
  { id: "chess", names: { en: "Balance", ru: "Баланс", es: "Equilibrio" }, back: "#305149", ink: "#d6ebc9", soft: "#a9c0b1" },
  { id: "altar", names: { en: "Altar", ru: "Алтарь", es: "Altar" }, back: "#65422c", ink: "#f7d3a1", soft: "#df9f65" },
  { id: "business", names: { en: "Purpose", ru: "Цель", es: "Propósito" }, back: "#324d43", ink: "#efdbb6", soft: "#a3bd9f" },
  { id: "dao", names: { en: "Dao", ru: "Дао", es: "Dao" }, back: "#3f4941", ink: "#f2e6bc", soft: "#abbfa5" },
  { id: "stone", names: { en: "Stone mosaic", ru: "Каменная мозаика", es: "Mosaico de piedra" }, back: "#e5d9cb", ink: "#423d35", soft: "#b6a899" },
] as const;

type Template = (typeof templates)[number];
type Topic = MeditationTopic | "all";
const topics: Topic[] = ["all", "business", "love", "energy", "health"];
const twelves = Array.from({ length: 12 }, (_, i) => i);
const zodiac = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

const copy = {
  en: {
    back: "All meditations", label: "PERSONAL MANDALA · FREE PRACTICE",
    title: "Look at yourself. Return to your intention.",
    intro: "Choose an existing mandala, place your own photo or a picture of your goal in the centre, then listen to an original video meditation.",
    upload: "Add your photo or goal", change: "Replace image", remove: "Remove",
    privacy: "Your picture stays on this device while this page is open. No upload, account or CRM entry.",
    invalid: "Choose a JPG, PNG, WebP or supported HEIC photo up to 25 MB.",
    intent: "Your intention (optional)", intentPlaceholder: "What would you like to give attention to?",
    photoAlt: "Your chosen photo or goal", empty: "Your image or intention",
    selection: "Choose your mandala", imageAdjust: "Adjust image", advanced: "Mandala settings and original guided meditations",
    png: "Save my mandala · PNG", pngPrepare: "Prepare image · PNG", pngError: "Could not prepare the image. Try another photo.",
    zoom: "Zoom", horizontal: "Move left / right", vertical: "Move up / down",
    circle: "Circle", square: "Square", focus: "Enter meditation mode", leave: "Close meditation mode",
    music: "Choose an original guided video", video: "Recording", sound: "Press Play in the video to hear the original recording.",
    videoLanguage: "English original audio", archive: "Russian original recordings",
    noVideo: "No source-verified recording is available for this theme.",
    caution: "This is a symbolic attention practice, not medical treatment or a promise of results.",
    topics: { all: "All", business: "Business", love: "Love", energy: "Energy", health: "Health" },
    filter: "Meditation themes", timer: "Take your time. Breathe naturally and look gently at the image.",
  },
  ru: {
    back: "Все медитации", label: "ЛИЧНАЯ МАНДАЛА · БЕСПЛАТНАЯ ПРАКТИКА",
    title: "Смотрите на себя. Возвращайтесь к своей цели.",
    intro: "Выберите готовую мандалу, поместите внутрь своё фото или образ цели и слушайте оригинальную авторскую видеомедитацию.",
    upload: "Загрузить фото или цель", change: "Заменить изображение", remove: "Удалить",
    privacy: "Фото остаётся на этом устройстве, пока открыта страница. Нет загрузки на сервер, регистрации или записи в CRM.",
    invalid: "Выберите JPG, PNG, WebP или поддерживаемый HEIC до 25 МБ.",
    intent: "Ваше намерение (необязательно)", intentPlaceholder: "Чему вы хотите уделить внимание?",
    photoAlt: "Ваше фото или изображение цели", empty: "Ваш образ или цель",
    selection: "Выберите мандалу", imageAdjust: "Настроить изображение", advanced: "Дополнительно: мандала и авторские медитации",
    png: "Сохранить мандалу · PNG", pngPrepare: "Подготовить PNG", pngError: "Не получилось сохранить изображение. Попробуйте другое фото.",
    zoom: "Масштаб", horizontal: "Сдвиг по горизонтали", vertical: "Сдвиг по вертикали",
    circle: "Круг", square: "Квадрат", focus: "Режим медитации", leave: "Закрыть режим медитации",
    music: "Выберите авторскую видеомедитацию", video: "Запись", sound: "Нажмите «Смотреть» в плеере, чтобы слушать оригинальную запись.",
    videoLanguage: "Оригинальное аудио: русский", archive: "Русскоязычные авторские записи",
    noVideo: "Для темы пока нет подтверждённой записи.",
    caution: "Это символическая практика внимания, не лечение и не обещание результата.",
    topics: { all: "Все", business: "Бизнес", love: "Любовь", energy: "Энергия", health: "Здоровье" },
    filter: "Темы медитаций", timer: "Не спешите. Дышите естественно и мягко смотрите на образ.",
  },
  es: {
    back: "Todas las meditaciones", label: "MANDALA PERSONAL · PRÁCTICA GRATUITA",
    title: "Mírate a ti. Vuelve a tu intención.",
    intro: "Elige un mandala, coloca una foto tuya o de tu meta en el centro y escucha una videomeditación original.",
    upload: "Añadir foto u objetivo", change: "Cambiar imagen", remove: "Quitar",
    privacy: "Tu foto permanece en este dispositivo mientras la página esté abierta. Sin subirla al servidor ni guardarla en el CRM.",
    invalid: "Elige JPG, PNG, WebP o HEIC compatible de hasta 25 MB.",
    intent: "Tu intención (opcional)", intentPlaceholder: "¿A qué quieres prestar atención?",
    photoAlt: "Tu foto o imagen del objetivo", empty: "Tu imagen u objetivo",
    selection: "Elige un mandala", imageAdjust: "Ajustar imagen", advanced: "Más opciones: mandala y meditaciones originales",
    png: "Guardar mandala · PNG", pngPrepare: "Preparar imagen · PNG", pngError: "No se pudo preparar la imagen. Prueba otra foto.",
    zoom: "Zoom", horizontal: "Mover horizontalmente", vertical: "Mover verticalmente",
    circle: "Círculo", square: "Cuadrado", focus: "Modo meditación", leave: "Salir del modo meditación",
    music: "Elige una videomeditación original", video: "Grabación", sound: "Pulsa Play en el vídeo para escuchar el audio original.",
    videoLanguage: "Audio original en inglés", archive: "Grabaciones originales en ruso",
    noVideo: "No hay grabaciones verificadas para este tema.",
    caution: "Esta es una práctica simbólica de atención, no un tratamiento ni una promesa de resultados.",
    topics: { all: "Todas", business: "Negocios", love: "Amor", energy: "Energía", health: "Salud" },
    filter: "Temas de meditación", timer: "Tómate tu tiempo. Respira con naturalidad y mira suavemente la imagen.",
  },
} as const;

function polygonPoints(edges: number, outer: number, inner?: number) {
  const count = inner ? edges * 2 : edges;
  return Array.from({ length: count }, (_, index) => {
    const angle = (index * Math.PI * 2) / count - Math.PI / 2;
    const radius = inner && index % 2 ? inner : outer;
    return (300 + Math.cos(angle) * radius).toFixed(2) + "," + (300 + Math.sin(angle) * radius).toFixed(2);
  }).join(" ");
}

function MandalaArt({ option }: { option: Template }) {
  if (option.id === "stone") {
    return <Image src="/mandalas/legacy-stone-mosaic.svg" alt="" fill unoptimized
      sizes="(max-width: 720px) 100vw, 640px" className={styles.pattern} draggable={false} />;
  }
  const { ink, soft, id } = option;
  return (
    <svg className={styles.pattern} viewBox="0 0 600 600" aria-hidden="true" focusable="false">
      <circle cx="300" cy="300" r="285" fill="none" stroke={ink} strokeWidth="4" />
      <circle cx="300" cy="300" r="269" fill="none" stroke={soft} strokeWidth="2" strokeDasharray="3 9" />
      <circle cx="300" cy="300" r="228" fill="none" stroke={ink} strokeWidth="2" opacity=".8" />
      <circle cx="300" cy="300" r="132" fill="none" stroke={soft} strokeWidth="4" opacity=".8" />
      {twelves.map(i => {
        const angle = i * Math.PI / 6 - Math.PI / 2;
        return (
          <g key={i}>
            <line x1={300 + 242 * Math.cos(angle)} y1={300 + 242 * Math.sin(angle)}
              x2={300 + 258 * Math.cos(angle)} y2={300 + 258 * Math.sin(angle)}
              stroke={ink} strokeWidth="3" strokeLinecap="round" />
            <circle cx={300 + 276 * Math.cos(angle)} cy={300 + 276 * Math.sin(angle)} r="3.5" fill={ink} />
          </g>
        );
      })}
      {id === "client" && twelves.map(i => (
        <ellipse key={i} cx="300" cy="174" rx="53" ry="99" fill="none"
          transform={"rotate(" + i * 30 + " 300 300)"} stroke={ink} strokeWidth="3" />
      ))}
      {id === "zodiac" && zodiac.map((symbol, i) => {
        const angle = i * Math.PI / 6 - Math.PI / 2;
        return <text key={symbol} x={300 + 198 * Math.cos(angle)}
          y={300 + 198 * Math.sin(angle)} textAnchor="middle" dominantBaseline="central"
          fill={ink} fontSize="26">{symbol}</text>;
      })}
      {id === "star" && (
        <>
          <polygon points={polygonPoints(12, 263, 144)} fill="none" stroke={ink} strokeWidth="4" />
          <polygon points={polygonPoints(8, 216, 146)} fill="none" stroke={soft} strokeWidth="3" />
        </>
      )}
      {id === "chess" && Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={148 + (i % 3) * 102} y={148 + Math.floor(i / 3) * 102}
          width="100" height="100" fill="none" stroke={ink} strokeWidth="3" rx="12" />
      ))}
      {id === "altar" && twelves.filter(i => i % 2 === 0).map(i => (
        <path key={i} d="M300 86 C340 154 332 189 300 220 C268 189 260 154 300 86Z"
          fill="none" stroke={ink} strokeWidth="4" transform={"rotate(" + i * 30 + " 300 300)"} />
      ))}
      {id === "business" && (
        <>
          <polygon points="300,54 513,425 87,425" fill="none" stroke={ink} strokeWidth="5" />
          <polygon points="300,520 87,175 513,175" fill="none" stroke={soft} strokeWidth="3" />
          {[[-1, 1], [0, -1], [1, 1]].map(([x, y], i) => (
            <circle key={i} cx={300 + x * 211} cy={300 + y * (y < 0 ? 244 : 123)}
              r="15" fill={ink} />
          ))}
        </>
      )}
      {id === "dao" && twelves.filter(i => i % 2 === 0).map(i => (
        <g key={i} transform={"rotate(" + i * 30 + " 300 300)"} stroke={ink} strokeWidth="6" strokeLinecap="round">
          <line x1="283" y1="74" x2="317" y2="74" />
          <line x1="276" y1="91" x2="291" y2="91" />
          <line x1="309" y1="91" x2="324" y2="91" />
          <line x1="283" y1="108" x2="317" y2="108" />
        </g>
      ))}
      <circle cx="300" cy="300" r="115" fill="none" stroke={ink} strokeWidth="5" />
    </svg>
  );
}

export function MandalaMeditationClient({ locale, videos }: { locale: PublicLocale; videos: MeditationVideo[] }) {
  const t = copy[locale];
  const [templateId, setTemplateId] = useState<Template["id"]>("client");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [intention, setIntention] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(50);
  const [offsetY, setOffsetY] = useState(50);
  const [squarePhoto, setSquarePhoto] = useState(false);
  const [activeTopic, setActiveTopic] = useState<Topic>("all");
  const [selectedVideoId, setSelectedVideoId] = useState(videos[0]?.id ?? "");
  const [focusMode, setFocusMode] = useState(false);
  const [pngBusy, setPngBusy] = useState(false);
  const [pngError, setPngError] = useState("");
  const [preparedPng, setPreparedPng] = useState<{signature: string; url: string} | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  // A second iPhone Photos/Files choice must invalidate an earlier async decode.
  const photoChoiceEpoch = useRef(0);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  // One native click works for mouse, touch and keyboard/assistive technology.
  // Running pointerup AND click state changes can instantly undo the focus
  // transition on WebKit after a React render. Never toggle twice per gesture.
  function toggleFocusMode() { setFocusMode(value => !value); }

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  useEffect(() => () => { photoChoiceEpoch.current += 1; }, []);

  useEffect(() => {
    if (!focusMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [focusMode]);

  const current = templates.find(option => option.id === templateId) ?? templates[0];
  const visibleVideos = videos.filter(video => activeTopic === "all" || video.topics.includes(activeTopic));
  const activeVideo = visibleVideos.find(video => video.id === selectedVideoId) ?? visibleVideos[0];
  const pngSignature = JSON.stringify([templateId, imageUrl, intention, zoom, offsetX, offsetY, squarePhoto]);
  const pngHref = preparedPng?.signature === pngSignature ? preparedPng.url : null;

  // Export is generated in memory, debounced during slider changes. The
  // download remains a real user-clicked <a download> for iOS Safari.
  useEffect(() => () => {
    if (preparedPng?.url) URL.revokeObjectURL(preparedPng.url);
  }, [preparedPng]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const stage = stageRef.current;
      if (!stage) return;
      try {
        const blob = await renderMandalaPng({
          stage, stone: current.id === "stone", background: current.back,
          border: current.ink, photoUrl: imageUrl, intention, zoom, offsetX,
          offsetY, squarePhoto,
        });
        if (cancelled) return;
        setPreparedPng({ signature: pngSignature, url: URL.createObjectURL(blob) });
        setPngError("");
      } catch {
        // Keep the editor and video functional when a photo cannot be decoded.
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [pngSignature, current, imageUrl, intention, zoom, offsetX, offsetY, squarePhoto]);

  async function preparePng() {
    const stage = stageRef.current;
    if (!stage || pngBusy) return;
    setPngBusy(true);
    setPngError("");
    try {
      const blob = await renderMandalaPng({
        stage, stone: current.id === "stone", background: current.back,
        border: current.ink, photoUrl: imageUrl, intention, zoom, offsetX,
        offsetY, squarePhoto,
      });
      setPreparedPng({ signature: pngSignature, url: URL.createObjectURL(blob) });
    } catch {
      setPngError(t.pngError);
    } finally {
      setPngBusy(false);
    }
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const image = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!image) return;
    const choiceEpoch = ++photoChoiceEpoch.current;
    // Never export an older local portrait after a failed or superseded choice.
    setImageUrl(null);
    setPreparedPng(null);
    setImageError("");
    try {
      const prepared = await prepareBrowserPhoto(image);
      if (choiceEpoch !== photoChoiceEpoch.current) return;
      setImageUrl(URL.createObjectURL(prepared));
      setZoom(1);
      setOffsetX(50);
      setOffsetY(50);
    } catch {
      if (choiceEpoch === photoChoiceEpoch.current) setImageError(t.invalid);
    }
  }

  function selectTopic(topic: Topic) {
    setActiveTopic(topic);
    setSelectedVideoId(videos.find(video => topic === "all" || video.topics.includes(topic))?.id ?? "");
  }

  return (
    <section className={styles.workshop + (focusMode ? " " + styles.focus : "")}
      data-mandala-meditation data-mandala-focus={focusMode ? "true" : "false"}
      role={focusMode ? "dialog" : undefined} aria-modal={focusMode ? true : undefined}
      aria-label={focusMode ? t.focus : undefined}>
      <input ref={fileInput} id="mandala-photo" type="file" accept={SUPPORT_PHOTO_ACCEPT}
        className={styles.hiddenPhotoInput} onChange={event => { void handleImage(event); }}/>
      <MandalaFreeVideoStudio locale={locale} frameUrl={pngHref} photoUrl={imageUrl}
        onPickPhoto={() => fileInput.current?.click()} photoError={imageError} />
      <details className={styles.advancedWorkbench} data-mandala-advanced>
        <summary>{t.advanced}</summary>
      <div className={styles.toolbar}>
        <Link href={"/" + locale + "/holistic-support/mobile?view=meditation#support-mobile-experience"} className={styles.back} prefetch={false}>
          <ArrowLeft size={17} aria-hidden="true" /> {t.back}
        </Link>
        <button className={styles.focusButton} type="button" ref={closeButton}
          aria-pressed={focusMode} onClick={toggleFocusMode}>
          {focusMode ? <Minimize2 size={18} aria-hidden="true" /> : <Expand size={18} aria-hidden="true" />}
          {focusMode ? t.leave : t.focus}
        </button>
      </div>
      <header className={styles.header}>
        <p className={styles.eyebrow}><Sparkles size={14} aria-hidden="true" /> {t.label}</p>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </header>
      <div className={styles.workspace}>
        <div className={styles.stageColumn}>
          <div ref={stageRef} className={styles.stageCanvas} style={{ backgroundColor: current.back }}
            data-selected-mandala={current.id}
            role="group" aria-label={current.names[locale] + ": " + t.photoAlt}>
            <MandalaArt option={current} />
            <div className={styles.photoFrame + (squarePhoto ? " " + styles.square : "")}
              style={{ borderColor: current.ink }}>
              {imageUrl ? (
                // The source is a local blob URL, not a remote or optimizable image.
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.localPhoto} src={imageUrl} alt=""
                  style={{ objectPosition: offsetX + "% " + offsetY + "%", transform: "scale(" + zoom + ")" }} />
              ) : (
                <button type="button" className={styles.photoPlaceholder}
                  aria-label={t.upload} disabled={focusMode}
                  onClick={() => fileInput.current?.click()}>
                  <ImagePlus aria-hidden="true" size={28} />
                  <span>{intention.trim() || t.empty}</span>
                </button>
              )}
            </div>
          </div>
          <p className={styles.stageCaption} aria-live="polite">{intention.trim() || t.timer}</p>
          {pngHref ? (
            <a className={styles.exportButton} href={pngHref} download="holistic-house-mandala.png">
              <Download size={17} aria-hidden="true" />{t.png}
            </a>
          ) : (
            <button className={styles.exportButton} type="button" disabled={pngBusy}
              onClick={preparePng}>
              <Download size={17} aria-hidden="true" />{t.pngPrepare}
            </button>
          )}
          {pngError ? <p className={styles.error} role="alert">{pngError}</p> : null}
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.editor}>
            <div className={styles.editorCard}>
              <label className={styles.fieldLabel} htmlFor="mandala-photo">{t.upload}</label>
              <div className={styles.photoActions}>
                <button type="button" className={styles.uploadButton}
                  onClick={() => fileInput.current?.click()}>
                  <ImagePlus size={18} aria-hidden="true" />
                  {imageUrl ? t.change : t.upload}
                </button>
                {imageUrl ? <button type="button" className={styles.removeButton}
                  onClick={() => { photoChoiceEpoch.current += 1; setImageUrl(null); setPreparedPng(null); setImageError(""); if (fileInput.current) fileInput.current.value = ""; }}>
                  <Trash2 size={16} aria-hidden="true" />{t.remove}
                </button> : null}
              </div>
              {imageError ? <p className={styles.error} role="alert">{imageError}</p> : null}
              <p className={styles.privacy}>{t.privacy}</p>
              <label className={styles.fieldLabel} htmlFor="mandala-intention">{t.intent}</label>
              <input id="mandala-intention" className={styles.intentInput} type="text"
                maxLength={140} value={intention} placeholder={t.intentPlaceholder}
                onChange={event => setIntention(event.currentTarget.value)} />
            </div>
            <div className={styles.editorCard}>
              <h2 className={styles.fieldLabel}>{t.selection}</h2>
              <div className={styles.templateGrid} role="group" aria-label={t.selection}>
                {templates.map(option => (
                  <button key={option.id} type="button" className={styles.templateChoice}
                    aria-pressed={templateId === option.id} onClick={() => setTemplateId(option.id)}
                    data-mandala-preset={option.id}>
                    <span className={styles.templateIcon} style={{ backgroundColor: option.back }}>
                      <MandalaArt option={option} />
                    </span>
                    <span>{option.names[locale]}</span>
                  </button>
                ))}
              </div>
              <details className={styles.adjustments}>
                <summary>{t.imageAdjust}</summary>
                <div className={styles.shapeControls} role="group" aria-label={t.imageAdjust}>
                  <button type="button" aria-pressed={!squarePhoto} onClick={() => setSquarePhoto(false)}>{t.circle}</button>
                  <button type="button" aria-pressed={squarePhoto} onClick={() => setSquarePhoto(true)}>{t.square}</button>
                </div>
                <label>{t.zoom}<input aria-label={t.zoom} type="range" min="1" max="2.5" step=".1"
                  value={zoom} disabled={!imageUrl} onChange={event => setZoom(Number(event.currentTarget.value))} /></label>
                <label>{t.horizontal}<input aria-label={t.horizontal} type="range" min="0" max="100"
                  value={offsetX} disabled={!imageUrl} onChange={event => setOffsetX(Number(event.currentTarget.value))} /></label>
                <label>{t.vertical}<input aria-label={t.vertical} type="range" min="0" max="100"
                  value={offsetY} disabled={!imageUrl} onChange={event => setOffsetY(Number(event.currentTarget.value))} /></label>
              </details>
            </div>
          </div>
          <div className={styles.videoPane}>
            <h2><Play size={17} aria-hidden="true" />{t.music}</h2>
            <div className={styles.topicFilters} role="group" aria-label={t.filter}>
              {topics.map(topic => (
                <button type="button" key={topic} aria-pressed={activeTopic === topic}
                  onClick={() => selectTopic(topic)}>{t.topics[topic]}</button>
              ))}
            </div>
            {activeVideo ? (
              <>
                {visibleVideos.length > 1 ? (
                  <label className={styles.videoSelect}>{t.video}
                    <select value={activeVideo.id} onChange={event => setSelectedVideoId(event.currentTarget.value)}>
                      {visibleVideos.map(video => <option key={video.id} value={video.id}>{video.title}</option>)}
                    </select>
                  </label>
                ) : <p className={styles.videoTitle}>{activeVideo.title}</p>}
                <div className={styles.videoFrame}>
                  <AcademyVideoPlayer key={activeVideo.id} locale={locale}
                    youtubeId={activeVideo.id} title={activeVideo.title} posterLoading="lazy" />
                </div>
                <p className={styles.soundNote}>{t.sound} · {t.videoLanguage}</p>
              </>
            ) : <p className={styles.noVideo} role="status">{t.noVideo}</p>}
            {locale !== "ru" ? <Link className={styles.archive}
              href="/ru/holistic-support/mandala" prefetch={false}>{t.archive} ↗</Link> : null}
          </div>
        </div>
      </div>
      </details>
      <p className={styles.caution}>{t.caution}</p>
    </section>
  );
}
