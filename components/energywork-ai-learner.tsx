"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ClipboardCopy, Clock3, Compass, LockKeyhole, PlayCircle, Sparkles } from "lucide-react";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { appFetch } from "@/lib/app/client-fetch";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import {
  ENERGYWORK_COURSE_ID, ENERGYWORK_COURSE_VERSION,
  energyworkPhases, energyworkPathChoices, energyworkSlides,
  type EnergyworkLocale, type EnergyworkPath, type EnergyworkSlide,
} from "@/data/academy/energywork-ai-curriculum";
import styles from "./energywork-ai-learner.module.css";

type Props = { locale: EnergyworkLocale };
type AnswerMap = Record<string, string>;
type StoredProgress = {
  accountId: string; enrolled: boolean; courseVersion: string;
  slideId?: string; pathId?: EnergyworkPath | null; answers?: AnswerMap;
  revision?: number; savedAt?: string; status?: "active" | "completed";
};
type SyncStatus = "checking" | "guest" | "consent" | "ready" | "unavailable";
type SaveCommand = {
  action: "save" | "switch";
  version: string; slideId: string; nextSlideId: string;
  pathId?: EnergyworkPath | null; answer?: string;
};

const copy = {
  en: {
    shortTitle: "Principles of Energywork",
    eyebrow: "HOLISTIC HOUSE ACADEMY · INTERACTIVE PREVIEW",
    preview: "Guest preview · Answers are not saved.",
    previewHelp: "Sign in with Google and consent to private saving. Guest reflections are not stored and will disappear after leaving.",
    program: "Explore the programme",
    backCourse: "Course details",
    step: "Slide",
    of: "of",
    continue: "Continue",
    back: "Back",
    stop: "You can skip or stop any practice. No medical advice or certification is provided here.",
    optional: "Optional reflection",
    blank: "You can leave this unanswered.",
    notes: "My reflection",
    placeholder: "Write here (optional)…",
    value: "Your choice",
    audio: "Original English audio",
    unavailable: "This recording is not available. You can continue using the written teaching.",
    pathway: "Choose one system to continue",
    picked: "Selected",
    finish: "Course completed",
    finishNote: "Your reflections are private when signed in and saving is enabled. In guest mode, copy them before leaving.",
    summary: "Your personal course journal",
    nothing: "You did not add written reflections; that is completely fine.",
    copy: "Copy my notes",
    copied: "Notes copied",
    failed: "Copy unavailable. Please select the text and copy it manually.",
    restart: "Start again",
    source: "Explore the original course",
    teacher: "Request teacher-guided Level 1",
    noInitiation: "Studying the material, completing the course or sending a request does not automatically provide initiation.",
    continuePath: "Continue with the selected path",
    checking: "Checking saved course…", consentTitle: "Save your learning privately",
    consentText: "I agree to save my course position and optional reflections in my private Holistic House account. I can delete them later; they will not be shared with a teacher automatically.",
    enableSave: "Start & save my course", signIn: "Sign in with Google to save",
    guestHint: "You may continue as a guest without saving.",
    saved: "Saved privately", saving: "Saving…", offline: "Saving is unavailable. Your answers are not stored on the server.",
    retry: "Retry", saveFailed: "Could not save. Your answer is still on this screen; retry before continuing.",
    conflict: "Your course changed in another session. Reload the saved version before continuing.",
    reload: "Reload saved progress", print: "Print / Save PDF",
    resetConfirm: "Delete your saved course progress and reflections? Your other courses and tests will remain.",
    switchConfirm: "Switching Reiki paths removes reflections from the previous branch. Continue?",
    signupError: "Could not start Google sign-in. Try again from the My Courses cabinet.",
    accountError: "Account needs attention. Open your personal cabinet to complete sign-in and consent.",
    myCourses: "My Courses",
  },
  ru: {
    shortTitle: "Основы энергетики",
    eyebrow: "АКАДЕМИЯ HOLISTIC HOUSE · ИНТЕРАКТИВНЫЙ ПРОСМОТР",
    preview: "Гостевой просмотр · Ответы не сохраняются.",
    previewHelp: "Войдите через Google и согласитесь на приватное сохранение. Гостевые ответы не записываются и исчезнут после выхода.",
    program: "Посмотреть программу",
    backCourse: "Описание курса",
    step: "Слайд",
    of: "из",
    continue: "Продолжить",
    back: "Назад",
    stop: "Любую практику можно пропустить или остановить. Здесь нет медицинских назначений или автоматической сертификации.",
    optional: "Необязательная рефлексия",
    blank: "Можно оставить без ответа.",
    notes: "Моё наблюдение",
    placeholder: "Напишите здесь (необязательно)…",
    value: "Ваш выбор",
    audio: "Оригинальное видео на английском",
    unavailable: "Запись пока недоступна. Можно продолжить изучение по тексту.",
    pathway: "Выберите одно направление",
    picked: "Выбрано",
    finish: "Курс завершён",
    finishNote: "После входа и согласия ваши ответы сохраняются приватно. В гостевом режиме скопируйте их перед выходом.",
    summary: "Ваш личный учебный дневник",
    nothing: "Вы не записали наблюдения, и это совершенно нормально.",
    copy: "Скопировать записи",
    copied: "Записи скопированы",
    failed: "Копирование недоступно. Выделите текст и скопируйте вручную.",
    restart: "Начать заново",
    source: "Материалы курса",
    teacher: "Запросить 1-ю ступень у преподавателя",
    noInitiation: "Просмотр материалов, окончание курса или отправка заявки не предоставляют инициацию автоматически.",
    continuePath: "Продолжить выбранный путь",
    checking: "Проверяем сохранённый курс…", consentTitle: "Сохранить обучение приватно",
    consentText: "Я согласен(на) сохранять пройденный слайд и необязательные ответы в личном кабинете Holistic House. Их можно удалить; преподавателю они не передаются автоматически.",
    enableSave: "Начать с сохранением", signIn: "Войти через Google для сохранения",
    guestHint: "Можно продолжить как гость без сохранения.",
    saved: "Сохранено приватно", saving: "Сохраняем…", offline: "Сохранение недоступно. Ответы не записываются на сервер.",
    retry: "Повторить", saveFailed: "Не удалось сохранить. Ответ остался на экране; повторите перед переходом.",
    conflict: "Курс изменился в другой вкладке. Загрузите сохранённую версию перед продолжением.",
    reload: "Загрузить прогресс", print: "Печать / Сохранить PDF",
    resetConfirm: "Удалить сохранённый прогресс и ответы этого курса? Остальные курсы и тесты останутся.",
    switchConfirm: "При смене системы Рейки ответы прошлой ветки будут удалены. Продолжить?",
    signupError: "Не удалось начать вход через Google. Попробуйте через раздел «Мои курсы».",
    accountError: "Завершите вход и согласие в личном кабинете.",
    myCourses: "Мои курсы",
  },
} as const;

function safePreviewNotes(slides: EnergyworkSlide[], answers: AnswerMap, locale: EnergyworkLocale, path: EnergyworkPath | null) {
  const chosen = energyworkPathChoices.find((option) => option.id === path);
  const lines = [
    copy[locale].shortTitle,
    "Course: " + ENERGYWORK_COURSE_ID + " · " + ENERGYWORK_COURSE_VERSION,
    chosen ? chosen.title[locale] : "",
    "",
    ...slides.flatMap((slide) => {
      const answer = answers[slide.id];
      if (!answer?.trim()) return [];
      const choice = slide.question?.options?.find((option) => option.id === answer);
      return [slide.title[locale], slide.question?.prompt[locale] || "", choice?.label[locale] ?? answer, ""];
    }),
  ];
  return lines.filter((value) => value !== undefined).join("\n").trim();
}

function PracticeTimer({ locale }: { locale: EnergyworkLocale }) {
  const [remaining, setRemaining] = useState(120);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const time = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(time);
      if (time === 0) setRunning(false);
    }, 500);
    return () => window.clearInterval(timer);
  }, [running]);
  function toggle() {
    if (running) {
      setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
      setRunning(false);
    } else {
      deadline.current = Date.now() + (remaining || 120) * 1000;
      if (remaining === 0) setRemaining(120);
      setRunning(true);
    }
  }
  return <div className={styles.practiceTimer} role="group" aria-label={locale === "ru" ? "Таймер необязательной практики" : "Optional practice timer"}>
    <span><Clock3 size={17} aria-hidden="true" />{locale === "ru" ? "Мягкая практика · по желанию" : "Gentle practice · optional"}</span>
    <strong aria-label={locale === "ru" ? "Осталось секунд" : "Seconds remaining"}>
      {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
    </strong>
    <button type="button" onClick={toggle}>{running ? (locale === "ru" ? "Пауза" : "Pause") :
      (remaining < 120 && remaining > 0 ? (locale === "ru" ? "Продолжить" : "Resume") :
        (locale === "ru" ? "Начать 2 минуты" : "Start 2 minutes"))}</button>
    <button type="button" onClick={() => { setRunning(false); setRemaining(120); }}>
      {locale === "ru" ? "Сбросить" : "Reset"}
    </button>
  </div>;
}

export function EnergyworkAiLearner({ locale }: Props) {
  const t = copy[locale];
  const [path, setPath] = useState<EnergyworkPath | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const answersRef = useRef<AnswerMap>({});
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const [sync, setSync] = useState<SyncStatus>("checking");
  const [consented, setConsented] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const accountIdRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
  const savedPathRef = useRef<EnergyworkPath | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const dirtyRef = useRef(new Set<string>());
  const progressRef = useRef("welcome-01");
  const request = useCallback((body: SaveCommand) => {
    const task = queueRef.current.catch(() => {}).then(async () => {
      const value = await appFetch("academy-energywork", {
        ...body, expectedRevision: revisionRef.current,
      }, "POST", { accountId: accountIdRef.current || undefined }) as StoredProgress;
      if (!value.enrolled || !Number.isSafeInteger(value.revision)) throw new Error("INVALID_PROGRESS_RESPONSE");
      revisionRef.current = value.revision!;
      savedPathRef.current = value.pathId ?? null;
      progressRef.current = value.slideId ?? "welcome-01";
      setSavedAt(value.savedAt || null);
      setSaveError(null);
      return value;
    });
    queueRef.current = task.catch(() => {});
    return task;
  }, []);
  const hydrate = useCallback((value: StoredProgress) => {
    accountIdRef.current = value.accountId;
    if (!value.enrolled) { setSync("consent"); return; }
    const restoredPath = value.pathId ?? null;
    const restored = energyworkSlides(restoredPath);
    revisionRef.current = value.revision ?? 0;
    savedPathRef.current = restoredPath;
    progressRef.current = value.slideId ?? "welcome-01";
    setPath(restoredPath);
    const restoredAnswers = value.answers ?? {};
    answersRef.current = restoredAnswers;
    setAnswers(restoredAnswers);
    setIndex(Math.max(0, restored.findIndex((item) => item.id === value.slideId)));
    setSavedAt(value.savedAt || null);
    dirtyRef.current.clear();
    setSaveError(null);
    setSync("ready");
  }, []);
  const reloadProgress = useCallback(async () => {
    setBusy(true);
    try {
      const response = await appFetch("academy-energywork") as StoredProgress;
      hydrate(response);
    } catch (error) {
      setSync((error as { status?: number })?.status === 401 ? "guest" : "unavailable");
    } finally { setBusy(false); }
  }, [hydrate]);
  useEffect(() => { void reloadProgress(); }, [reloadProgress]);
  async function startSaving() {
    if (!consented || busy) return;
    setBusy(true);
    try {
      const result = await appFetch("academy-energywork", {
        action: "start", consent: true, version: ENERGYWORK_COURSE_VERSION,
      }, "POST", { accountId: accountIdRef.current || undefined }) as StoredProgress;
      hydrate(result);
      setConsented(false);
    } catch (error) {
      setSaveError((error as { status?: number })?.status === 403 ? t.accountError : t.saveFailed);
    } finally { setBusy(false); }
  }
  async function signIn() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await appFetch("auth/start", { locale, continueTo: "energywork" }, "POST") as { redirectUrl?: string };
      if (!response.redirectUrl || !response.redirectUrl.startsWith("https://")) throw new Error("BAD_OAUTH_URL");
      window.location.assign(response.redirectUrl);
    } catch {
      setSaveError(t.signupError); setBusy(false);
    }
  }
  const slides = useMemo(() => energyworkSlides(path), [path]);
  const slide = slides[index] ?? slides[0]!;
  const pathData = energyworkPathChoices.find((option) => option.id === path);
  const total = energyworkSlides("yggdrasil").length; // All branches have equal length.
  const completed = slide.kind === "finish";
  const media = slide.videoKey ? englishGuidedMeditations.find((item) => item.key === slide.videoKey) : null;
  const notes = safePreviewNotes(slides, answers, locale, path);
  const source = pathData ? "/" + locale + "/academy/" + pathData.studyPath : null;
  const teacher = pathData ? "/" + locale + "/academy/" + pathData.freePath : null;

  function choosePath(chosen: EnergyworkPath) {
    if (busy) return;
    if (chosen !== path) {
      const updated = Object.fromEntries(Object.entries(answersRef.current)
        .filter(([id]) => !/^(ygg|tan|kun|end)-/.test(id)));
      answersRef.current = updated;
      setAnswers(updated);
    }
    setPath(chosen);
    setCopyState("idle");
  }
  function setAnswer(value: string) {
    const updated = { ...answersRef.current, [slide.id]: value };
    answersRef.current = updated;
    setAnswers(updated);
    dirtyRef.current.add(slide.id);
    setCopyState("idle");
  }
  async function store(nextSlideId: string) {
    if (sync !== "ready") return;
    const switching = Boolean(savedPathRef.current && path && savedPathRef.current !== path);
    if (switching && !window.confirm(t.switchConfirm)) throw new Error("USER_CANCELLED");
    const response = await request({
      action: switching ? "switch" : "save",
      version: ENERGYWORK_COURSE_VERSION,
      slideId: slide.id, nextSlideId,
      pathId: slide.kind === "path-choice" ? path : savedPathRef.current,
      ...(slide.question ? { answer: answers[slide.id] || "" } : {}),
    });
    dirtyRef.current.delete(slide.id);
    return response;
  }
  async function next() {
    if (busy || (slide.kind === "path-choice" && !path)) return;
    const nextId = slides[Math.min(index + 1, slides.length - 1)]?.id || slide.id;
    if (sync === "ready") {
      setBusy(true);
      try { await store(nextId); }
      catch (error) {
        if ((error as Error).message !== "USER_CANCELLED")
          setSaveError((error as { status?: number })?.status === 409 ? t.conflict : t.saveFailed);
        setBusy(false); return;
      }
      setBusy(false);
    }
    setIndex((current) => Math.min(current + 1, energyworkSlides(path).length - 1));
  }
  async function previous() {
    if (index === 0 || busy) return;
    if (sync === "ready" && slide.question && dirtyRef.current.has(slide.id)) {
      setBusy(true);
      try { await store(slide.id); } catch {
        setSaveError(t.saveFailed); setBusy(false); return;
      }
      setBusy(false);
    }
    setIndex((current) => Math.max(0, current - 1));
  }
  async function restart() {
    if (busy || (sync === "ready" && !window.confirm(t.resetConfirm))) return;
    if (sync === "ready") {
      setBusy(true);
      try {
        await queueRef.current.catch(() => {});
        const value = await appFetch("academy-energywork", { action:"delete", confirmed: true }, "POST",
          { accountId: accountIdRef.current || undefined }) as StoredProgress;
        hydrate(value);
      } catch { setSaveError(t.saveFailed); setBusy(false); return; }
      setBusy(false);
    }
    answersRef.current = {};
    setIndex(0); setPath(null); setAnswers({}); setCopyState("idle");
    dirtyRef.current.clear();
  }
  // A brief debounce preserves reflections while users type; queued writes and
  // revision checks prevent racing a Next button or concurrent browser tab.
  useEffect(() => {
    if (sync !== "ready" || !slide.question || !dirtyRef.current.has(slide.id)) return;
    const id = slide.id, value = answers[id] ?? "", remotePath = savedPathRef.current;
    const timer = window.setTimeout(() => {
      void request({action:"save",version:ENERGYWORK_COURSE_VERSION,
        slideId:id,nextSlideId:id,pathId:remotePath,answer:value})
        .then(() => {
          if (value === (answersRef.current[id] ?? "")) dirtyRef.current.delete(id);
        })
        .catch(() => { setSaveError(t.saveFailed); });
    }, 950);
    return () => window.clearTimeout(timer);
  }, [sync, slide.id, slide.question, answers, request, t.saveFailed]);
  // Warn before losing a not-yet-confirmed private answer.
  useEffect(() => {
    if (!dirtyRef.current.size) return;
    const beforeLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeLeave);
    return () => window.removeEventListener("beforeunload", beforeLeave);
  }, [answers, savedAt]);

  async function copyNotes() {
    if (!navigator.clipboard?.writeText) {
      setCopyState("error"); return;
    }
    try {
      await navigator.clipboard.writeText(notes);
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <main className={styles.page} lang={locale} data-energywork-ai-learner data-course-id={ENERGYWORK_COURSE_ID} data-course-version={ENERGYWORK_COURSE_VERSION}>
      <div className={styles.shell}>
        <header className={styles.top}>
          <Link className={styles.home} href={"/" + locale + "/academy/principles-of-energywork"} aria-label={t.backCourse}>
            <ArrowLeft size={19} aria-hidden="true" /><span>{t.backCourse}</span>
          </Link>
          <span className={styles.courseMark}><Sparkles size={17} aria-hidden="true" />{t.shortTitle}</span>
          <span className={styles.phaseLabel}>{energyworkPhases[slide.phase][locale]}</span>
        </header>

        <div className={styles.progressHeader}>
          <span>{t.step} {index + 1} {t.of} {total}</span>
          <span>{Math.round((index + 1) / total * 100)}%</span>
        </div>
        <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + 1} aria-label={t.step}>
          <span style={{ width: ((index + 1) / total * 100) + "%" }} />
        </div>

        <aside className={styles.preview} aria-live="polite">
          <LockKeyhole size={19} aria-hidden="true" />
          <div className={styles.syncContent}>
            {sync === "checking" ? <strong>{t.checking}</strong> : null}
            {sync === "guest" ? <>
              <strong>{t.preview}</strong><p>{t.previewHelp}</p>
              <button type="button" onClick={signIn} disabled={busy} className={styles.syncButton}>{t.signIn}</button>
              <p>{t.guestHint}</p>
            </> : null}
            {sync === "consent" ? <>
              <strong>{t.consentTitle}</strong>
              <label className={styles.consentLabel}>
                <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />
                <span>{t.consentText}</span>
              </label>
              <button type="button" onClick={startSaving} disabled={!consented || busy} className={styles.syncButton}>{t.enableSave}</button>
              <p>{t.guestHint}</p>
            </> : null}
            {sync === "ready" ? <>
              <strong><Check size={16} aria-hidden="true" />{busy || dirtyRef.current.size > 0 ? t.saving : t.saved}</strong>
              {savedAt ? <small>{new Date(savedAt).toLocaleString(locale)}</small> : null}
              <Link href={"/" + locale + "/app/course"} prefetch={false}>{t.myCourses}</Link>
            </> : null}
            {sync === "unavailable" ? <><strong>{t.offline}</strong><button className={styles.syncButton} onClick={reloadProgress} type="button">{t.retry}</button></> : null}
            {saveError ? <p role="alert" className={styles.saveError}>{saveError}
              <button className={styles.retryButton} onClick={reloadProgress} type="button">{t.reload}</button></p> : null}
          </div>
        </aside>

        <section className={styles.slide} key={slide.id} aria-labelledby="energywork-slide-title">
          <div className={styles.slideMain}>
            <div className={styles.content}>
              <span className={styles.eyebrow}><Compass size={17} aria-hidden="true" />{t.eyebrow}</span>
              <h1 id="energywork-slide-title">{slide.title[locale]}</h1>
              <p className={styles.description}>{slide.body[locale]}</p>
              {slide.kind === "practice" ? <PracticeTimer key={slide.id} locale={locale} /> : null}

              {slide.kind === "path-choice" ? (
                <div className={styles.pathGrid} role="group" aria-label={t.pathway}>
                  {energyworkPathChoices.map((choice) => (
                    <button key={choice.id} type="button"
                      className={styles.pathCard + (path === choice.id ? " " + styles.pathSelected : "")}
                      onClick={() => choosePath(choice.id)} aria-pressed={path === choice.id} data-learning-path={choice.id}>
                      <span className={styles.pathImage}><Image src={choice.image} alt="" fill sizes="(max-width: 650px) 96px, 140px" /></span>
                      <span><strong>{choice.title[locale]}</strong><small>{choice.description[locale]}</small></span>
                      {path === choice.id ? <Check size={22} aria-label={t.picked} /> : <ArrowRight size={20} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              ) : null}

              {slide.question ? (
                <div className={styles.question}>
                  <span className={styles.questionBadge}><BookOpen size={15} aria-hidden="true" />{t.optional}</span>
                  {slide.question.type === "choice"
                    ? <p className={styles.prompt}>{slide.question.prompt[locale]}</p>
                    : <label className={styles.prompt} htmlFor={"answer-" + slide.id}>{slide.question.prompt[locale]}</label>}
                  {slide.question.type === "text" ? (
                    <textarea id={"answer-" + slide.id} value={answers[slide.id] ?? ""} onChange={(e) => setAnswer(e.target.value.slice(0, 1600))}
                      className={styles.textarea} maxLength={1600} rows={4} placeholder={t.placeholder} autoComplete="off" />
                  ) : null}
                  {slide.question.type === "scale" ? (
                    <div className={styles.scaleWrap}>
                      <input id={"answer-" + slide.id} className={styles.scale} type="range" min="0" max="10" step="1"
                        value={answers[slide.id] ?? "5"} onChange={(e) => setAnswer(e.target.value)} />
                      <div className={styles.scaleEnds}><span>0</span><strong>{answers[slide.id] === undefined ? "—" : answers[slide.id] + " / 10"}</strong><span>10</span></div>
                    </div>
                  ) : null}
                  {slide.question.type === "choice" ? (
                    <div id={"answer-" + slide.id} className={styles.choices} role="group" aria-label={t.value}>
                      {slide.question.options?.map((option) => (
                        <label key={option.id} className={styles.choice}>
                          <input type="radio" name={slide.id} value={option.id}
                            checked={answers[slide.id] === option.id} onChange={() => setAnswer(option.id)} />
                          <span>{option.label[locale]}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  <p className={styles.optional}>{t.blank}</p>
                </div>
              ) : null}

              {slide.kind === "finish" ? (
                <div className={styles.final}>
                  <span className={styles.finalTag}><Check size={18} aria-hidden="true" />{t.finish}</span>
                  <h2>{t.summary}</h2>
                  <pre className={styles.notes}>{Object.values(answers).some((value) => value.trim()) ? notes : t.nothing}</pre>
                  <p>{t.finishNote}</p>
                  <button type="button" className={styles.copyButton} onClick={copyNotes}><ClipboardCopy size={17} aria-hidden="true" />{copyState === "success" ? t.copied : t.copy}</button>
                  <button type="button" className={styles.copyButton} onClick={() => window.print()}>{t.print}</button>
                  {copyState === "error" ? <p role="alert">{t.failed}</p> : null}
                  {source ? <Link className={styles.textLink} href={source}>{t.source}<ArrowRight size={16} /></Link> : null}
                  {teacher ? <Link className={styles.teacherLink} href={teacher}>{t.teacher}<ArrowRight size={16} /></Link> : null}
                  <p className={styles.initiationNote}>{t.noInitiation}</p>
                  <button type="button" className={styles.restart} onClick={restart} disabled={busy}>{t.restart}</button>
                </div>
              ) : null}
            </div>
            {slide.image ? (
              <div className={styles.art}><Image src={slide.image} alt="" fill priority={index === 0} sizes="(max-width: 720px) 100vw, 42vw" /></div>
            ) : null}
            {slide.kind === "video" ? (
              <div className={styles.video}>
                {media?.youtubeId ? <AcademyVideoPlayer key={slide.id} youtubeId={media.youtubeId} title={media.title} /> :
                  <p className={styles.missingVideo}><PlayCircle size={24} aria-hidden="true" />{t.unavailable}</p>}
                {media?.youtubeId ? <p className={styles.videoCaption}>{t.audio} · {media.title}</p> : null}
              </div>
            ) : null}
          </div>
        </section>

        <details className={styles.programme}>
          <summary>{t.program}</summary>
          <ol>{Object.entries(energyworkPhases).map(([key, title]) => (
            <li key={key} aria-current={key === slide.phase ? "step" : undefined}>{title[locale]}</li>
          ))}</ol>
        </details>
        <footer className={styles.footer}>
          {!completed ? (
            <div className={styles.actions}>
              <button type="button" onClick={previous} disabled={index === 0 || busy || sync === "checking"} className={styles.back}><ArrowLeft size={18} aria-hidden="true" />{t.back}</button>
              <button type="button" onClick={next} disabled={busy || sync === "checking" || (slide.kind === "path-choice" && !path)} className={styles.next} data-energywork-next>
                {slide.kind === "path-choice" ? t.continuePath : t.continue}<ArrowRight size={19} aria-hidden="true" />
              </button>
            </div>
          ) : null}
          <p>{t.stop}</p>
        </footer>
      </div>
    </main>
  );
}
