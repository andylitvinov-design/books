"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, MessageCircleQuestion, PlayCircle, RotateCcw } from "lucide-react";

import { AcademyVideoPlayer } from "@/components/academy-video-player";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./academy-video-course-journey.module.css";

export type VideoCourseLesson = {
  id: string;
  title: string;
  order: number;
  youtubeId?: string;
  videoUrl?: string;
  mediaUrl?: string;
  poster?: string;
  question?: string;
  body?: string;
};

const labels = {
  en: {
    type: "Video course", videoCount: "video lessons", start: "Start this course",
    intro: "Watch one recording at a time and leave your own questions or comments after each video.",
    video: "Video lesson", reflection: "Your questions or comments", of: "of",
    questions: "What questions, comments or ideas came up while watching this video?",
    placeholder: "Write your questions or comments here (optional)…", privacy: "These notes stay in this browser tab. They are not sent to your teacher, account or CRM.",
    prev: "Back", toReflection: "Questions & comments", nextVideo: "Next video", finish: "Finish course",
    complete: "Course completed", completeText: "You reached the end of the video course. Keep a copy of your reflections if you wish.",
    copy: "Copy my notes", copied: "Notes copied", copyError: "Copy is unavailable. Select the text to copy.",
    noNotes: "You have not written any notes yet.", restart: "Start again and clear notes",
    youtube: "Open original video", mediaMissing: "The original video cannot be embedded. Open the source if available.",
  },
  ru: {
    type: "Видеокурс", videoCount: "видеоуроков", start: "Хочу пройти курс",
    intro: "Сначала смотрите одно видео, затем запишите вопросы или комментарии. После этого переходите к следующему уроку.",
    video: "Видеоурок", reflection: "Ваши вопросы и комментарии", of: "из",
    questions: "Какие вопросы, комментарии или идеи возникли после этого видео?",
    placeholder: "Напишите вопросы или комментарии (необязательно)…", privacy: "Заметки остаются только в этой вкладке браузера. Они не отправляются преподавателю, в кабинет или CRM.",
    prev: "Назад", toReflection: "Вопросы и комментарии", nextVideo: "Следующее видео", finish: "Завершить курс",
    complete: "Курс пройден", completeText: "Вы посмотрели все уроки. При желании скопируйте свои заметки, прежде чем закрыть вкладку.",
    copy: "Скопировать заметки", copied: "Заметки скопированы", copyError: "Не удалось скопировать. Выделите текст вручную.",
    noNotes: "Вы пока не оставили комментариев.", restart: "Начать заново и очистить заметки",
    youtube: "Открыть оригинал", mediaMissing: "Видео недоступно для вставки. Откройте оригинальную запись, если ссылка доступна.",
  },
  es: {
    type: "Videocurso", videoCount: "vídeos", start: "Empezar el curso",
    intro: "Mira un vídeo, escribe tus preguntas o comentarios y pasa al siguiente.",
    video: "Videolección", reflection: "Tus preguntas y comentarios", of: "de",
    questions: "¿Qué preguntas, comentarios o ideas surgieron después de este vídeo?",
    placeholder: "Escribe preguntas o comentarios (opcional)…", privacy: "Las notas permanecen en esta pestaña. No se envían a tu profesor, cuenta ni CRM.",
    prev: "Atrás", toReflection: "Preguntas y comentarios", nextVideo: "Siguiente vídeo", finish: "Terminar curso",
    complete: "Curso completado", completeText: "Has terminado todos los vídeos. Copia tus notas antes de cerrar esta pestaña si quieres conservarlas.",
    copy: "Copiar mis notas", copied: "Notas copiadas", copyError: "No se pudo copiar. Selecciona el texto manualmente.",
    noNotes: "Todavía no hay notas.", restart: "Volver a empezar y borrar notas",
    youtube: "Abrir vídeo original", mediaMissing: "No se puede insertar el vídeo. Abre la fuente original si está disponible.",
  },
} as const;

function safeExternalVideo(url: string | undefined): { youtubeId?: string; iframe?: string } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (["youtube.com", "www.youtube.com", "www.youtube-nocookie.com", "youtu.be"].includes(host)) {
      const id = host === "youtu.be" ? parsed.pathname.slice(1)
        : parsed.pathname === "/watch" ? parsed.searchParams.get("v") : parsed.pathname.startsWith("/embed/") ? parsed.pathname.slice(7) : "";
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? { youtubeId: id } : null;
    }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
      const id = parsed.pathname.replace(/^\/(?:video\/)?/, "");
      return /^\d{6,12}$/.test(id) ? { iframe: "https://player.vimeo.com/video/" + id } : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function AcademyVideoCourseJourney({
  locale, courseId, title, description, poster, lessons,
}: {
  locale: PublicLocale;
  courseId: string;
  title: string;
  description?: string;
  poster?: string;
  lessons: VideoCourseLesson[];
}) {
  const t = labels[locale];
  const rootRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [restored, setRestored] = useState(false);
  const [playingExternal, setPlayingExternal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const key = "hh:academy-video-course:v1:" + courseId;
  const total = 2 + lessons.length * 2;
  const complete = position === total - 1;
  const intro = position === 0;
  const lessonIndex = intro ? 0 : Math.min(lessons.length - 1, Math.floor((position - 1) / 2));
  const lesson = lessons[lessonIndex];
  const isVideo = !intro && !complete && position % 2 === 1;
  const isReflection = !intro && !complete && !isVideo;
  const external = safeExternalVideo(lesson?.videoUrl);
  const youtubeId = lesson?.youtubeId || external?.youtubeId;
  const sourcePoster = lesson?.poster || (youtubeId ? "https://i.ytimg.com/vi/" + youtubeId + "/hqdefault.jpg" : poster);
  const artwork = intro ? poster || sourcePoster : sourcePoster || poster;

  useEffect(() => {
    setRestored(false);
    setPosition(0);
    setNotes({});
    try {
      const value = window.sessionStorage.getItem(key);
      if (value) {
        const saved = JSON.parse(value) as { position?: number; notes?: Record<string, string> };
        if (Number.isInteger(saved.position)) setPosition(Math.max(0, Math.min(total - 1, saved.position!)));
        if (saved.notes && typeof saved.notes === "object" && !Array.isArray(saved.notes)) {
          const allowed = new Set(lessons.map((item) => item.id));
          setNotes(Object.fromEntries(Object.entries(saved.notes)
            .filter(([id, text]) => allowed.has(id) && typeof text === "string")
            .map(([id, text]) => [id, text.slice(0, 2000)])));
        }
      }
    } catch {
      // Private-browsing or disabled session storage must not block lessons.
    }
    setRestored(true);
  }, [key, total, lessons]);

  useEffect(() => {
    if (!restored) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify({ position, notes }));
    } catch {
      // Continue in memory without storage.
    }
  }, [key, position, notes, restored]);

  useEffect(() => {
    setPlayingExternal(false);
    setCopyFeedback("");
  }, [position]);

  function go(next: number) {
    setPosition(Math.max(0, Math.min(total - 1, next)));
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    rootRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  async function copyNotes() {
    const body = lessons.filter((item) => notes[item.id]?.trim()).map((item) =>
      item.title + "\n" + notes[item.id].trim()).join("\n\n");
    try {
      await navigator.clipboard.writeText(title + "\n\n" + body);
      setCopyFeedback(t.copied);
    } catch {
      setCopyFeedback(t.copyError);
    }
  }

  function restart() {
    setNotes({});
    setCopyFeedback("");
    go(0);
  }

  if (!lessons.length) return null;

  const nextLabel = intro ? t.start : isVideo ? t.toReflection
    : isReflection && lessonIndex < lessons.length - 1 ? t.nextVideo
    : isReflection ? t.finish : t.restart;

  return (
    <section ref={rootRef} className={styles.root} aria-label={title}
      data-academy-video-course data-course-video-count={lessons.length}
      data-course-video-step={position} data-course-video-phase={intro ? "intro" : complete ? "complete" : isVideo ? "video" : "reflection"}
      data-course-local-only="session" lang={locale}>
      <div className={styles.progressHeader}>
        <span>{t.type} · {lessons.length} {t.videoCount}</span>
        <span>{position + 1} {t.of} {total}</span>
      </div>
      <progress className={styles.progress} value={position + 1} max={total}
        aria-label={locale === "ru" ? "Прогресс видеокурса" : locale === "es" ? "Progreso del curso" : "Video course progress"} />
      <div className={styles.slide} aria-live="polite">
        {intro ? (
          <div className={styles.introLayout}>
            <div className={styles.introCopy}>
              <span className={styles.eyebrow}>{t.type}</span>
              <h2>{title}</h2>
              <p>{description || t.intro}</p>
              <p className={styles.howItWorks}>{t.intro}</p>
            </div>
            {artwork ? <Image className={styles.heroImage} src={artwork} width={720} height={480}
              alt="" unoptimized loading="lazy" sizes="(max-width: 700px) 100vw, 46vw" /> : null}
          </div>
        ) : complete ? (
          <div className={styles.endSlide}>
            <Check size={44} aria-hidden="true" />
            <h2>{t.complete}</h2>
            <p>{t.completeText}</p>
            {lessons.some((item) => notes[item.id]?.trim()) ? (
              <div className={styles.finalNotes}>
                <textarea aria-label={t.copy} readOnly rows={5} value={lessons
                  .filter((item) => notes[item.id]?.trim()).map((item) => item.title + "\n" + notes[item.id].trim()).join("\n\n")} />
                <button type="button" className={styles.copyButton} onClick={() => void copyNotes()}>
                  <Copy size={16} aria-hidden="true" /> {t.copy}
                </button>
                {copyFeedback ? <span role="status">{copyFeedback}</span> : null}
              </div>
            ) : <p>{t.noNotes}</p>}
          </div>
        ) : (
          <>
            <div className={styles.lessonHeading}>
              <span className={styles.eyebrow}>{isVideo ? t.video : t.reflection} · {lessonIndex + 1} {t.of} {lessons.length}</span>
              <h2>{lesson?.title}</h2>
            </div>
            {isVideo ? (
              <div className={styles.videoStage} data-academy-video-id={lesson.id} data-source-order={lesson.order}>
                {youtubeId && /^[A-Za-z0-9_-]{11}$/.test(youtubeId) ? (
                  <AcademyVideoPlayer key={lesson.id} youtubeId={youtubeId} locale={locale} title={lesson.title} posterLoading="eager" />
                ) : lesson.mediaUrl ? (
                  <video key={lesson.id} className={styles.nativeVideo} controls playsInline preload="none" poster={sourcePoster} src={lesson.mediaUrl} />
                ) : external?.iframe ? (
                  playingExternal ? <iframe className={styles.externalFrame} key={lesson.id} src={external.iframe}
                    title={lesson.title} loading="eager" referrerPolicy="strict-origin-when-cross-origin"
                    allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
                    : <button className={styles.vimeoPlay} type="button" onClick={() => setPlayingExternal(true)}>
                      {artwork ? <Image src={artwork} alt="" width={720} height={405} unoptimized /> : null}
                      <PlayCircle size={40} aria-hidden="true" /><span>{t.video}</span>
                    </button>
                ) : <p className={styles.mediaError}>{t.mediaMissing}</p>}
                {lesson.body ? <p className={styles.videoCaption}>{lesson.body}</p> : null}
              </div>
            ) : (
              <div className={styles.reflectionStage}>
                {artwork ? <Image className={styles.reflectionImage} src={artwork} width={160} height={100} unoptimized alt="" /> : null}
                <label htmlFor={"video-course-note-" + courseId.replace(/[^a-z0-9-]/gi, "-")}>
                  <MessageCircleQuestion size={22} aria-hidden="true" />
                  <span>{lesson.question || t.questions}</span>
                </label>
                <textarea id={"video-course-note-" + courseId.replace(/[^a-z0-9-]/gi, "-")}
                  maxLength={2000} rows={4} placeholder={t.placeholder}
                  value={notes[lesson.id] || ""} onChange={(event) =>
                    setNotes((current) => ({ ...current, [lesson.id]: event.target.value }))} />
                <p className={styles.privacy}>{t.privacy}</p>
              </div>
            )}
          </>
        )}
      </div>
      <div className={styles.controls}>
        <button type="button" className={styles.back} disabled={position === 0}
          onClick={() => go(position - 1)}><ArrowLeft size={17} aria-hidden="true" />{t.prev}</button>
        {complete ? (
          <button type="button" className={styles.forward} onClick={restart}>
            <RotateCcw size={17} aria-hidden="true" />{t.restart}
          </button>
        ) : (
          <button type="button" className={styles.forward} onClick={() => go(position + 1)}>
            {nextLabel}<ArrowRight size={17} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
