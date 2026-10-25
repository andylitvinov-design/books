"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, ChevronLeft, Clock3, Compass, ExternalLink, LockKeyhole, PlayCircle, RotateCcw, Sparkles } from "lucide-react";

import { AcademyVideoPlayer } from "@/components/academy-video-player";
import {
  EGYPT_COURSE_ID, EGYPT_COURSE_VERSION, EGYPT_LOCAL_PROGRESS_KEY,
  egyptFurtherModules, egyptLessonTopics, egyptPriesthoodScreens, egyptVideoSources,
} from "@/data/academy/egyptian-priesthood-curriculum";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./egyptian-priesthood-course.module.css";

const COPY = {
  en: {
    back: "Egyptian Priesthood", programme: "Your 7-day path", day: "Day", of: "of", screen: "Screen", next: "Continue",
    start: "Let's begin", previous: "Back", allLessons: "Choose a day", inProgress: "Learning journey", done: "Finished days",
    watched: "I've watched / studied this video", watchedCount: "Videos marked watched", videoNotice: "Original Russian video. Press Play to load YouTube. If playback is unavailable, open the original YouTube page below.",
    reflectionLabel: "Your reflection", reflectionPlaceholder: "Write what you noticed in your own words…",
    reflectionCount: "characters", reflectionMinimum: "Write at least 50 characters to continue.", reflectOptional: "Your words are not transmitted or stored.",
    practiceTitle: "Optional one-minute pause", timerStart: "Start 60-second pause", timerStop: "Stop", timerRestart: "Again",
    needPractice: "I need more practice", saveLocal: "Only slide position, completed days and watched marks are saved in this browser; your answers stay in memory only.",
    saved: "Saved on this device", unsaved: "This browser cannot save progress. You can still explore the course.",
    source: "Original sources", complete: "Explore the wider Egyptian programme", completeHint: "Other historical modules have text sources, but no videos are invented for them.",
    restart: "Start again", restartConfirm: "Clear the local progress for Egyptian Priesthood and restart? Personal answers are not stored.",
    lessonComplete: "Finish this day", last: "Finish the course", toAcademy: "Academy", privateNote: "Not saved to My Courses or CRM.",
    consent: "Optional reflections; not a diagnosis, initiation or qualification.",
  },
  ru: {
    back: "Египетское жречество", programme: "Ваш путь из 7 дней", day: "День", of: "из", screen: "Экран", next: "Продолжить",
    start: "Поехали!", previous: "Назад", allLessons: "Выберите день", inProgress: "Учебный маршрут", done: "Завершено дней",
    watched: "Я посмотрел(а) / изучил(а) видео", watchedCount: "Видео отмечены просмотренными", videoNotice: "Оригинальное русское видео. YouTube загружается только после Play. Если плеер недоступен — откройте оригинал по ссылке ниже.",
    reflectionLabel: "Ваше размышление", reflectionPlaceholder: "Напишите своими словами, что заметили…",
    reflectionCount: "символов", reflectionMinimum: "Для продолжения напишите не меньше 50 символов.", reflectOptional: "Текст ответа никуда не отправляется и не сохраняется.",
    practiceTitle: "Необязательная минутная пауза", timerStart: "Начать 60 секунд", timerStop: "Остановить", timerRestart: "Ещё раз",
    needPractice: "Мне нужно больше практики", saveLocal: "Только позиция, завершённые дни и отметки просмотра сохраняются в этом браузере. Текст ответов остаётся только в памяти экрана.",
    saved: "Сохранено на этом устройстве", unsaved: "В этом браузере сохранение недоступно. Проходить курс можно без него.",
    source: "Исходные материалы", complete: "Продолжить египетские мистерии", completeHint: "У следующих исторических модулей есть тексты; выдуманных видео мы не добавляем.",
    restart: "Начать заново", restartConfirm: "Стереть локальный прогресс курса «Египетское жречество» и начать сначала? Личные ответы не сохраняются.",
    lessonComplete: "Завершить день", last: "Завершить курс", toAcademy: "Академия", privateNote: "Пока не сохраняется в «Мои курсы» или CRM.",
    consent: "Практики добровольны; это не диагноз, инициация или диплом.",
  },
  es: {
    back: "Sacerdocio egipcio", programme: "Tu camino de 7 días", day: "Día", of: "de", screen: "Pantalla", next: "Continuar",
    start: "¡Empezar!", previous: "Volver", allLessons: "Elegir día", inProgress: "Ruta de aprendizaje", done: "Días completos",
    watched: "He visto o estudiado este vídeo", watchedCount: "Vídeos marcados como vistos", videoNotice: "Vídeo original en ruso. YouTube carga al pulsar Play. Si falla, abre el original mediante el enlace.",
    reflectionLabel: "Tu reflexión", reflectionPlaceholder: "Escribe lo que observaste con tus palabras…",
    reflectionCount: "caracteres", reflectionMinimum: "Escribe al menos 50 caracteres para continuar.", reflectOptional: "Tu respuesta no se envía ni se guarda.",
    practiceTitle: "Pausa opcional de un minuto", timerStart: "Iniciar 60 segundos", timerStop: "Detener", timerRestart: "Repetir",
    needPractice: "Necesito más práctica", saveLocal: "Solo la posición, días completados y vídeos marcados se guardan en este navegador. Tus respuestas quedan únicamente en memoria.",
    saved: "Guardado en este dispositivo", unsaved: "No se pudo guardar el progreso en este navegador.",
    source: "Fuentes originales", complete: "Más misterios egipcios", completeHint: "Los módulos históricos siguientes tienen textos, pero no inventamos vídeos.",
    restart: "Empezar de nuevo", restartConfirm: "¿Borrar el progreso local del curso y comenzar de nuevo?",
    lessonComplete: "Finalizar este día", last: "Finalizar curso", toAcademy: "Academia", privateNote: "No se guarda en Mis Cursos ni en CRM.",
    consent: "Prácticas voluntarias; no son diagnóstico, iniciación ni título religioso.",
  },
} as const;

type Progress = {
  version: string;
  screenId: string;
  completedDays: number[];
  watchedIds: string[];
};

const orderedUnique = (numbers: number[]) => [...new Set(numbers)].sort((a, b) => a - b);
const validVideoId = (id: string) => /^[A-Za-z0-9_-]{11}$/.test(id);

export function EgyptianPriesthoodLearner({
  locale,
  initialDay,
}: {
  locale: PublicLocale;
  initialDay?: number;
}) {
  const t = COPY[locale];
  const screens = useMemo(() => egyptPriesthoodScreens(), []);
  const [index, setIndex] = useState(0);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [canStore, setCanStore] = useState(true);
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const slide = screens[index] ?? screens[0];
  const day = Math.min(7, Math.max(1, slide.day));
  const percent = Math.round((index + 1) / screens.length * 100);
  const answer = answers[slide.id] ?? "";
  const videoMarked = slide.videoId ? watchedIds.includes(slide.videoId) : false;
  const canAdvance = slide.kind !== "reflection" || answer.trim().length >= 50 || completedDays.includes(slide.day);

  // No personal answers go into localStorage: only navigation and opt-in watch marks.
  useEffect(() => {
    let next = 0;
    try {
      const raw = window.localStorage.getItem(EGYPT_LOCAL_PROGRESS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Progress>;
        if (parsed.version === EGYPT_COURSE_VERSION) {
          const saved = screens.findIndex((item) => item.id === parsed.screenId);
          if (saved >= 0) next = saved;
          if (Array.isArray(parsed.completedDays)) {
            setCompletedDays(orderedUnique(parsed.completedDays.filter((value): value is number =>
              Number.isInteger(value) && value >= 1 && value <= 7)));
          }
          if (Array.isArray(parsed.watchedIds)) {
            const allowed = new Set(screens.map((item) => item.videoId).filter((id): id is string => Boolean(id)));
            setWatchedIds([...new Set(parsed.watchedIds.filter((id): id is string =>
              typeof id === "string" && validVideoId(id) && allowed.has(id)))]);
          }
        }
      }
    } catch {
      setCanStore(false);
    }
    if (Number.isInteger(initialDay) && initialDay && initialDay >= 1 && initialDay <= 7) {
      const requested = screens.findIndex((item) => item.day === initialDay && item.kind === "intro");
      if (requested >= 0) next = requested;
    }
    setIndex(next);
    setHydrated(true);
  }, [initialDay, screens]);

  useEffect(() => {
    if (!hydrated || !canStore) return;
    try {
      const progress: Progress = {
        version: EGYPT_COURSE_VERSION,
        screenId: slide.id,
        completedDays,
        watchedIds,
      };
      window.localStorage.setItem(EGYPT_LOCAL_PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      setCanStore(false);
    }
  }, [hydrated, canStore, slide.id, completedDays, watchedIds]);

  useEffect(() => {
    if (!running || slide.kind !== "practice") return;
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, slide.kind]);
  useEffect(() => { if (seconds === 0) setRunning(false); }, [seconds]);

  function move(to: number) {
    if (to < 0 || to >= screens.length) return;
    setRunning(false);
    setSeconds(60);
    setIndex(to);
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }

  function next() {
    if (!canAdvance) return;
    if (slide.kind === "milestone" && slide.day >= 1 && slide.day <= 7) {
      setCompletedDays((days) => orderedUnique([...days, slide.day]));
    }
    move(index + 1);
  }
  function previous() { move(index - 1); }
  function chooseDay(chosen: number) {
    const start = screens.findIndex((item) => item.day === chosen && item.kind === "intro");
    if (start >= 0) move(start);
  }
  function repeatPractice() {
    const practice = screens.findIndex((item) => item.day === day && item.kind === "practice");
    if (practice >= 0) move(practice);
  }
  function reset() {
    if (!window.confirm(t.restartConfirm)) return;
    try { window.localStorage.removeItem(EGYPT_LOCAL_PROGRESS_KEY); } catch { /* unavailable storage */ }
    setIndex(0);
    setAnswers({});
    setCompletedDays([]);
    setWatchedIds([]);
    setRunning(false);
    setSeconds(60);
  }
  const isCompletion = slide.kind === "complete";
  const isIntro = slide.kind === "welcome";
  const nextLabel = isIntro ? t.start
    : slide.kind === "milestone" ? slide.day === 7 ? t.last : t.lessonComplete
    : t.next;

  return (
    <main className={styles.learner} lang={locale}
      data-egypt-course-learner data-course-id={EGYPT_COURSE_ID}
      data-course-version={EGYPT_COURSE_VERSION} data-egypt-course-screen={slide.id}>
      <div className={styles.learnerShell}>
        <header className={styles.learnerHeader}>
          <Link href={"/" + locale + "/academy/egyptian-priesthood"} className={styles.backCourse}>
            <ArrowLeft size={18} aria-hidden="true" /><span>{t.back}</span>
          </Link>
          <span className={styles.brand}><Sparkles size={15} aria-hidden="true" />{t.inProgress}</span>
          <span className={styles.completedCount}>{t.done}: {completedDays.length}/7</span>
        </header>
        <nav className={styles.journey} aria-label={t.programme}>
          {egyptLessonTopics.map((topic, position) => {
            const current = day === position + 1 && !isCompletion;
            const completed = completedDays.includes(position + 1);
            return <button key={topic.id} type="button" onClick={() => chooseDay(position + 1)}
              className={styles.journeyStep + (current ? " " + styles.currentStep : "")}
              aria-label={t.day + " " + (position + 1) + " · " + topic.title[locale]}
              aria-current={current ? "step" : undefined} data-egypt-day={position + 1}>
              <span>{completed ? <Check size={15} aria-hidden="true" /> : position + 1}</span>
              <small>{topic.title[locale]}</small>
            </button>;
          })}
        </nav>
        <article className={styles.screen} aria-labelledby="egypt-slide-title" data-egypt-slide-kind={slide.kind}>
          <div className={styles.screenCopy} ref={contentRef}>
            <p className={styles.slideKicker}>
              <Compass size={15} aria-hidden="true" />
              {isIntro ? t.inProgress : isCompletion ? t.done : t.day + " " + slide.day + " " + t.of + " 7"}
            </p>
            <h1 id="egypt-slide-title">{slide.title[locale]}</h1>
            <p className={styles.screenBody}>{slide.body[locale]}</p>
            {isIntro ? (
              <div className={styles.introDetails}>
                <span><PlayCircle size={16} aria-hidden="true" />7 {t.watchedCount.toLowerCase().split(" ")[0]}</span>
                <span><BookOpen size={16} aria-hidden="true" />7 {t.day.toLowerCase()}</span>
                <p><LockKeyhole size={15} aria-hidden="true" />{t.saveLocal}</p>
              </div>
            ) : null}
            {(slide.kind === "video" || slide.kind === "intro") && slide.videoId && slide.videoTitle ? (
              <div className={styles.film}>
                <AcademyVideoPlayer key={slide.videoId} youtubeId={slide.videoId}
                  title={slide.videoTitle[locale]} locale={locale} posterLoading="eager" />
                <label className={styles.watched}>
                  <input type="checkbox" checked={videoMarked}
                    onChange={(event) => setWatchedIds((previous) =>
                      event.target.checked ? [...new Set([...previous, slide.videoId!])] :
                        previous.filter((id) => id !== slide.videoId))} />
                  <span>{t.watched}</span>
                </label>
                <p className={styles.videoNotice}>{t.videoNotice}</p>
              </div>
            ) : null}
            {slide.kind === "practice" ? (
              <div className={styles.practiceCard} role="group" aria-label={t.practiceTitle}>
                <span><Clock3 size={18} aria-hidden="true" />{t.practiceTitle}</span>
                <strong aria-live="polite">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</strong>
                <button type="button" onClick={() => {
                  if (seconds === 0) { setSeconds(60); setRunning(true); }
                  else setRunning(!running);
                }}>{running ? t.timerStop : seconds === 0 ? t.timerRestart : t.timerStart}</button>
              </div>
            ) : null}
            {slide.kind === "reflection" && slide.question ? (
              <div className={styles.reflection}>
                <label htmlFor={"egypt-answer-" + slide.id}>{slide.question[locale]}</label>
                <textarea id={"egypt-answer-" + slide.id} rows={4} maxLength={1600}
                  value={answer} autoComplete="off"
                  placeholder={t.reflectionPlaceholder}
                  onChange={(event) => setAnswers((current) => ({ ...current, [slide.id]: event.target.value }))} />
                <small>{answer.trim().length} {t.reflectionCount} · {canAdvance ? t.reflectOptional : t.reflectionMinimum}</small>
              </div>
            ) : null}
            {slide.kind === "milestone" ? (
              <div className={styles.milestone}>
                <Award size={27} aria-hidden="true" />
                <strong>{t.done}: {completedDays.length + (completedDays.includes(slide.day) ? 0 : 1)}/7</strong>
                <span>{t.watchedCount}: {watchedIds.length}/7</span>
              </div>
            ) : null}
            {isCompletion ? (
              <div className={styles.endPanel}>
                <span><Award size={20} aria-hidden="true" />{t.done}: {completedDays.length}/7</span>
                <span>{t.watchedCount}: {watchedIds.length}/7</span>
                <p>{t.completeHint}</p>
                <div className={styles.nextThemes}>
                  {egyptFurtherModules.map((module) => <span key={module.id}>{module.title[locale]}</span>)}
                </div>
                <Link className={styles.followOn} href={"/" + locale + "/academy/mysteries/egypt/high-wisdom"}>
                  {t.complete}<ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            ) : null}
            {isIntro || isCompletion ? (
              <div className={styles.resources}>
                <details>
                  <summary>{t.source}</summary>
                  {egyptVideoSources.map((source) => <a key={source.url} target="_blank" rel="noopener noreferrer"
                    href={source.url}>{source.label}<ExternalLink size={13} aria-hidden="true" /></a>)}
                </details>
              </div>
            ) : null}
          </div>
          <div className={styles.visual} aria-hidden="true" data-egypt-visual={slide.kind}>
            {slide.kind === "video" ? (
              <div className={styles.videoDecor}><PlayCircle size={58} /><span>ORIGINAL VIDEO · PSIMASTER</span></div>
            ) : (
              <Image src={slide.image ?? "/academy/reiki-yggdrasil/source/temple-studies.png"}
                alt="" fill priority={index === 0} sizes="(max-width: 720px) 100vw, 48vw" />
            )}
          </div>
        </article>
        <footer className={styles.navigation}>
          <div className={styles.progressHead}>
            <span>{t.screen} {index + 1} {t.of} {screens.length}</span>
            <span>{percent}%</span>
          </div>
          <div role="progressbar" aria-label={t.programme} aria-valuemin={0} aria-valuemax={screens.length}
            aria-valuenow={index + 1} className={styles.progress}>
            <span style={{ width: percent + "%" }} />
          </div>
          <div className={styles.buttons}>
            <button type="button" className={styles.backButton} disabled={index === 0}
              onClick={previous}><ChevronLeft size={17} aria-hidden="true" />{t.previous}</button>
            {!isCompletion ? <button type="button" className={styles.nextButton} disabled={!canAdvance} onClick={next}>
              {nextLabel}<ArrowRight size={18} aria-hidden="true" />
            </button> : <button className={styles.nextButton} type="button" onClick={reset}>
              {t.restart}<RotateCcw size={17} aria-hidden="true" />
            </button>}
          </div>
          {!isIntro && !isCompletion && slide.kind !== "practice" ? (
            <button className={styles.practiceAgain} type="button" onClick={repeatPractice}>
              <RotateCcw size={13} aria-hidden="true" />{t.needPractice}
            </button>
          ) : null}
          <p className={styles.storageNote}>
            <LockKeyhole size={13} aria-hidden="true" />
            {hydrated && canStore ? t.saved : hydrated ? t.unsaved : t.saveLocal}
            {" · "}{t.privateNote}
          </p>
          <p className={styles.safetyNote}>{t.consent}</p>
        </footer>
      </div>
    </main>
  );
}
