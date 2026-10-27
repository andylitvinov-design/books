"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, ImagePlus, RotateCcw, Trash2 } from "lucide-react";

import { AcademyVideoPlayer } from "@/components/academy-video-player";
import type { MeditationTopic, MeditationVideo } from "@/data/academy/holistic-support-meditations";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./mandala-support-studio.module.css";

type Theme = "all" | MeditationTopic;
type LoadedImages = { background: HTMLImageElement; portrait: HTMLImageElement | null };
const TOPICS: Theme[] = ["all", "business", "love", "energy", "health"];
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const templates = [
  { id: "sun", source: "/images/mandalas/sun.svg" },
  { id: "lotus", source: "/images/mandalas/lotus.svg" },
  { id: "star", source: "/images/mandalas/star.svg" },
  { id: "dao", source: "/images/mandalas/dao.svg" },
  { id: "stone", source: "/images/mandalas/stone-mosaic-01.svg" },
] as const;
type TemplateId = (typeof templates)[number]["id"];

const copy = {
  en: {
    back: "Meditations", breadcrumb: "PERSONAL MEDITATION · FREE", title: "My support mandala",
    lead: "Place yourself or a picture of your goal in the centre, choose a mandala and meditate with an original video.",
    stage: "YOUR MANDALA", download: "Save mandala as PNG", preparing: "Preparing image…",
    upload: "1 · Your image or intention", uploadButton: "Choose a photo", emptyPhoto: "No image selected",
    photoHelp: "A photo of yourself, a place or a goal. JPEG, PNG, WebP or a browser-supported HEIC, up to 15 MB.",
    goalLabel: "Your intention (optional)", goalPlaceholder: "e.g. More calm and confidence",
    emptyGoal: "My intention", remove: "Remove image", adjust: "Adjust photo", zoom: "Zoom",
    x: "Move left / right", y: "Move up / down", reset: "Reset position",
    template: "2 · Choose your mandala", preview: "Mandala composition preview",
    templates: { sun: "Sun", lotus: "Lotus", star: "Star", dao: "Dao", stone: "Stone" },
    meditation: "3 · Play a meditation", select: "Meditation theme",
    topics: { all: "All", business: "Business", love: "Love", energy: "Energy", health: "Health" },
    video: "Recording", noVideos: "No available recording for this theme.",
    language: "Original recording: English", watchHelp: "Press Play. The video stays visible while you look at your mandala; sound comes from the video, not a separate audio stream.",
    privacy: "Your photo and intention stay in this browser. Nothing is uploaded or sent to the practitioner. Save the PNG yourself before leaving.",
    disclaimer: "A reflective practice for personal focus, not a treatment or guarantee of results.",
    tooLarge: "Choose an image smaller than 15 MB.", invalidFile: "Please choose a supported image file.",
    loadError: "This image cannot be opened here. Try a JPEG, PNG or WebP photo.",
    saved: "Your PNG is being saved.", failedSave: "Could not save the image. Please retry.",
    photoReady: "Image ready. You can adjust its position.",
    defaultTitle: "Personal focus",
  },
  ru: {
    back: "Медитации", breadcrumb: "ЛИЧНАЯ ПРАКТИКА · БЕСПЛАТНО", title: "Моя мандала поддержки",
    lead: "Поместите себя или изображение своей цели в центр, выберите мандалу и включите авторскую видеомедитацию.",
    stage: "ВАША МАНДАЛА", download: "Сохранить мандалу в PNG", preparing: "Готовим изображение…",
    upload: "1 · Фото или намерение", uploadButton: "Выбрать фотографию", emptyPhoto: "Фото не выбрано",
    photoHelp: "Ваш портрет, образ места или цели. JPEG, PNG, WebP либо HEIC, если поддерживает браузер. До 15 МБ.",
    goalLabel: "Ваше намерение (необязательно)", goalPlaceholder: "Например, спокойствие и уверенность",
    emptyGoal: "Моё намерение", remove: "Удалить фото", adjust: "Настроить фото", zoom: "Масштаб",
    x: "Сдвинуть влево / вправо", y: "Сдвинуть вверх / вниз", reset: "Сбросить положение",
    template: "2 · Выберите мандалу", preview: "Предпросмотр мандалы",
    templates: { sun: "Солнце", lotus: "Лотос", star: "Звезда", dao: "ДАО", stone: "Каменная" },
    meditation: "3 · Включите медитацию", select: "Тема медитации",
    topics: { all: "Все", business: "Бизнес", love: "Любовь", energy: "Энергия", health: "Здоровье" },
    video: "Запись", noVideos: "Для этой темы нет доступной записи.",
    language: "Оригинальная запись: русский", watchHelp: "Нажмите «Смотреть». Видео остаётся видимым, пока вы смотрите на мандалу: звук идёт из видео, отдельного аудиоплеера нет.",
    privacy: "Фото и намерение остаются в вашем браузере. Они не загружаются на сервер и не отправляются мастеру. Сохраните PNG перед выходом.",
    disclaimer: "Символическая практика для внутреннего внимания, а не лечение или гарантия результата.",
    tooLarge: "Выберите фотографию до 15 МБ.", invalidFile: "Выберите подходящий файл изображения.",
    loadError: "Не удалось открыть изображение. Попробуйте JPEG, PNG или WebP.",
    saved: "Сохраняем PNG.", failedSave: "Не удалось сохранить изображение. Повторите попытку.",
    photoReady: "Фото готово. Можно настроить его положение.",
    defaultTitle: "Мой внутренний фокус",
  },
  es: {
    back: "Meditaciones", breadcrumb: "PRÁCTICA PERSONAL · GRATIS", title: "Mi mandala de apoyo",
    lead: "Coloca tu foto o la imagen de tu objetivo en el centro, elige un mandala y escucha una videomeditación original.",
    stage: "TU MANDALA", download: "Guardar mandala en PNG", preparing: "Preparando imagen…",
    upload: "1 · Imagen o intención", uploadButton: "Elegir fotografía", emptyPhoto: "Sin fotografía",
    photoHelp: "Tu retrato, un lugar o un objetivo. JPEG, PNG, WebP o HEIC si tu navegador lo admite. Hasta 15 MB.",
    goalLabel: "Tu intención (opcional)", goalPlaceholder: "Por ejemplo, calma y confianza",
    emptyGoal: "Mi intención", remove: "Eliminar foto", adjust: "Ajustar foto", zoom: "Zoom",
    x: "Mover a izquierda / derecha", y: "Mover arriba / abajo", reset: "Restablecer posición",
    template: "2 · Elige un mandala", preview: "Vista previa del mandala",
    templates: { sun: "Sol", lotus: "Loto", star: "Estrella", dao: "Dao", stone: "Piedra" },
    meditation: "3 · Reproduce una meditación", select: "Tema de meditación",
    topics: { all: "Todas", business: "Negocios", love: "Amor", energy: "Energía", health: "Salud" },
    video: "Grabación", noVideos: "No hay grabaciones disponibles para este tema.",
    language: "Audio original: inglés", watchHelp: "Pulsa Reproducir. El vídeo permanece visible mientras miras tu mandala; el sonido procede del vídeo.",
    privacy: "La imagen y tu intención permanecen en este navegador. Nada se sube al servidor ni se envía al profesional. Guarda el PNG antes de salir.",
    disclaimer: "Práctica simbólica para la reflexión, no un tratamiento ni una garantía de resultados.",
    tooLarge: "Elige una imagen de menos de 15 MB.", invalidFile: "Selecciona un archivo de imagen compatible.",
    loadError: "No se puede abrir la imagen. Prueba JPEG, PNG o WebP.",
    saved: "Guardando PNG.", failedSave: "No se pudo guardar la imagen. Inténtalo otra vez.",
    photoReady: "Imagen lista. Puedes ajustar su posición.",
    defaultTitle: "Mi enfoque personal",
  },
} as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image decode failed"));
    image.src = src;
    if (image.complete && image.naturalWidth > 0) resolve(image);
  });
}

function drawMandala(
  canvas: HTMLCanvasElement,
  background: HTMLImageElement,
  portrait: HTMLImageElement | null,
  intention: string,
  fallback: string,
  zoom: number,
  panX: number,
  panY: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");
  const center = 480;
  const radius = 191;
  const diameter = radius * 2;
  ctx.clearRect(0, 0, 960, 960);
  ctx.drawImage(background, 0, 0, 960, 960);
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#f8efe0";
  ctx.fillRect(center - radius, center - radius, diameter, diameter);
  if (portrait) {
    const factor = Math.max(diameter / portrait.naturalWidth, diameter / portrait.naturalHeight) * zoom;
    const drawWidth = portrait.naturalWidth * factor;
    const drawHeight = portrait.naturalHeight * factor;
    const travelX = Math.max(0, (drawWidth - diameter) / 2);
    const travelY = Math.max(0, (drawHeight - diameter) / 2);
    ctx.drawImage(portrait,
      center - drawWidth / 2 + (panX / 100) * travelX,
      center - drawHeight / 2 + (panY / 100) * travelY,
      drawWidth, drawHeight);
  } else {
    const words = (intention.trim() || fallback).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    ctx.font = "600 33px Georgia, serif";
    for (const word of words) {
      const attempt = line ? line + " " + word : word;
      if (line && ctx.measureText(attempt).width > 315) {
        lines.push(line);
        line = word;
      } else {
        line = attempt;
      }
    }
    if (line) lines.push(line);
    const visible = lines.slice(0, 4);
    ctx.fillStyle = "#5c4534";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    visible.forEach((text, index) => {
      ctx.fillText(text, center, center + (index - (visible.length - 1) / 2) * 44, 335);
    });
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(center, center, radius + 6, 0, Math.PI * 2);
  ctx.strokeStyle = "#fff5dc";
  ctx.lineWidth = 13;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(center, center, radius + 14, 0, Math.PI * 2);
  ctx.strokeStyle = "#ab7a48";
  ctx.lineWidth = 5;
  ctx.stroke();
  if (portrait && intention.trim()) {
    ctx.fillStyle = "rgba(45, 36, 28, 0.88)";
    ctx.fillRect(165, 805, 630, 66);
    ctx.fillStyle = "#fffaee";
    ctx.font = "600 31px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(intention.trim(), center, 838, 575);
  }
}

export function MandalaSupportStudio({ locale, videos }: { locale: PublicLocale; videos: MeditationVideo[] }) {
  const t = copy[locale];
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [templateId, setTemplateId] = useState<TemplateId>("sun");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [intention, setIntention] = useState("");
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [loaded, setLoaded] = useState<LoadedImages | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [topic, setTopic] = useState<Theme>("all");
  const [videoId, setVideoId] = useState<string | null>(null);
  const template = templates.find(item => item.id === templateId) ?? templates[0];
  const filtered = videos.filter(video => topic === "all" || video.topics.includes(topic));
  const activeVideo = filtered.find(video => video.id === videoId) ?? filtered[0];

  // Blob URLs are private, transient browser-local photo references.
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  useEffect(() => {
    let alive = true;
    setReady(false);
    setLoaded(null);
    Promise.all([
      loadImage(template.source),
      photoUrl ? loadImage(photoUrl) : Promise.resolve(null),
    ]).then(([background, portrait]) => {
      if (alive) setLoaded({ background, portrait });
    }).catch(() => {
      if (alive) setNotice(t.loadError);
    });
    return () => { alive = false; };
  }, [template.source, photoUrl, t.loadError]);

  useEffect(() => {
    if (!loaded || !canvasRef.current) return;
    try {
      drawMandala(canvasRef.current, loaded.background, loaded.portrait,
        intention, t.defaultTitle, zoom, panX, panY);
      setReady(true);
    } catch {
      setReady(false);
      setNotice(t.loadError);
    }
  }, [loaded, intention, zoom, panX, panY, t.defaultTitle, t.loadError]);

  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) { setNotice(t.tooLarge); return; }
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      setNotice(t.invalidFile);
      return;
    }
    const url = URL.createObjectURL(file);
    setReady(false);
    setPhotoUrl(url);
    setPhotoName(file.name);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setNotice(t.photoReady);
    if (inputRef.current) inputRef.current.value = "";
  };
  const clearPhoto = () => {
    setPhotoUrl(null);
    setPhotoName("");
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setNotice("");
  };
  const download = () => {
    const canvas = canvasRef.current;
    if (!ready || !canvas) return;
    canvas.toBlob(blob => {
      if (!blob) { setNotice(t.failedSave); return; }
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "holistic-house-mandala.png";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
      setNotice(t.saved);
    }, "image/png");
  };

  return (
    <main className={styles.page} data-mandala-support-studio lang={locale}>
      <header className={styles.top}>
        <Link href={"/" + locale + "/holistic-support#meditation-practices"} className={styles.back}>
          <ArrowLeft size={17} aria-hidden="true" /> {t.back}
        </Link>
        <strong>HOLISTIC HOUSE</strong>
        <span>{t.breadcrumb}</span>
      </header>
      <div className={styles.shell}>
        <div className={styles.intro}>
          <p>{t.breadcrumb}</p>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
        </div>
        <div className={styles.layout}>
          <section className={styles.stage} aria-label={t.stage}>
            <div className={styles.stageBar}>
              <span>{t.stage}</span>
              <span>{t.templates[templateId]}</span>
            </div>
            <div className={styles.canvasFrame}>
              <canvas ref={canvasRef} width={960} height={960} role="img" aria-label={t.preview} className={styles.canvas} />
            </div>
            <button className={styles.download} type="button" onClick={download} disabled={!ready}>
              <Download size={17} aria-hidden="true" /> {ready ? t.download : t.preparing}
            </button>
            <p className={styles.notice} role="status" aria-live="polite">{notice}</p>
          </section>

          <div className={styles.controls}>
            <section className={styles.panel} aria-label={t.upload}>
              <h2>{t.upload}</h2>
              <div className={styles.uploadRow}>
                <input ref={inputRef} className={styles.visuallyHidden} type="file" accept="image/*"
                  aria-label={t.uploadButton} onChange={event => choosePhoto(event.target.files?.[0])} />
                <button type="button" className={styles.uploadButton} onClick={() => inputRef.current?.click()}>
                  <ImagePlus size={17} aria-hidden="true" /> {t.uploadButton}
                </button>
                {photoUrl ? <button type="button" className={styles.clearButton} onClick={clearPhoto} aria-label={t.remove}><Trash2 size={17} /></button> : null}
              </div>
              <p className={styles.fileName}>{photoName || t.emptyPhoto}</p>
              <p className={styles.hint}>{t.photoHelp}</p>
              <label className={styles.fieldLabel} htmlFor="mandala-intention">{t.goalLabel}</label>
              <input id="mandala-intention" className={styles.textField} type="text" maxLength={90}
                value={intention} placeholder={t.goalPlaceholder}
                onChange={event => setIntention(event.target.value)} />
              {photoUrl ? (
                <div className={styles.adjust}>
                  <h3>{t.adjust}</h3>
                  {([
                    [t.zoom, zoom, setZoom, 1, 2.5, 0.05],
                    [t.x, panX, setPanX, -100, 100, 5],
                    [t.y, panY, setPanY, -100, 100, 5],
                  ] as const).map(([label, value, setter, min, max, step]) => (
                    <label className={styles.rangeRow} key={label}>
                      <span>{label}</span>
                      <input type="range" aria-label={label} min={min} max={max} step={step}
                        value={value} onChange={event => setter(Number(event.target.value))} />
                    </label>
                  ))}
                  <button className={styles.reset} type="button" onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}>
                    <RotateCcw size={15} aria-hidden="true" /> {t.reset}
                  </button>
                </div>
              ) : null}
            </section>
            <section className={styles.panel} aria-label={t.template}>
              <h2>{t.template}</h2>
              <div className={styles.templates}>
                {templates.map(item => (
                  <button key={item.id} type="button" className={styles.template}
                    aria-pressed={templateId === item.id}
                    aria-label={t.templates[item.id]}
                    onClick={() => { setTemplateId(item.id); setNotice(""); }}>
                    <img src={item.source} alt="" width={92} height={92} loading="lazy" />
                    <span>{t.templates[item.id]}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className={styles.panel} aria-label={t.meditation}>
              <h2>{t.meditation}</h2>
              <p className={styles.fieldLabel}>{t.select}</p>
              <div className={styles.topics} role="group" aria-label={t.select}>
                {TOPICS.map(item => (
                  <button key={item} type="button" aria-pressed={topic === item}
                    onClick={() => { setTopic(item); setVideoId(null); }}>
                    {t.topics[item]}
                  </button>
                ))}
              </div>
              {activeVideo ? (
                <>
                  {filtered.length > 1 ? (
                    <label className={styles.fieldLabel} htmlFor="mandala-recording">{t.video}
                      <select id="mandala-recording" className={styles.textField}
                        value={activeVideo.id} onChange={event => setVideoId(event.target.value)}>
                        {filtered.map(video => <option key={video.id} value={video.id}>{video.title}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <div className={styles.videoBox} data-mandala-video-player>
                    <AcademyVideoPlayer key={activeVideo.id} youtubeId={activeVideo.id}
                      title={activeVideo.title} locale={locale} />
                  </div>
                  <p className={styles.audioLanguage}>{t.language}</p>
                  <p className={styles.hint}>{t.watchHelp}</p>
                </>
              ) : <p className={styles.hint} role="status">{t.noVideos}</p>}
            </section>
            <p className={styles.privacy}>{t.privacy}</p>
            <p className={styles.disclaimer}>{t.disclaimer}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
