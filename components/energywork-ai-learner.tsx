"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ClipboardCopy, Compass, LockKeyhole, PlayCircle, Sparkles } from "lucide-react";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import {
  ENERGYWORK_COURSE_ID, ENERGYWORK_COURSE_VERSION,
  energyworkPhases, energyworkPathChoices, energyworkSlides,
  type EnergyworkLocale, type EnergyworkPath, type EnergyworkSlide,
} from "@/data/academy/energywork-ai-curriculum";
import styles from "./energywork-ai-learner.module.css";

type Props = { locale: EnergyworkLocale };
type AnswerMap = Record<string, string>;
const copy = {
  en: {
    shortTitle: "Principles of Energywork",
    eyebrow: "HOLISTIC HOUSE ACADEMY · INTERACTIVE PREVIEW",
    preview: "Preview mode · Your answers are not stored in your account yet.",
    previewHelp: "Only enter information you are comfortable keeping in this unsaved page. Private save & resume is being built.",
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
    finish: "Learning preview completed",
    finishNote: "The reflections on this screen have not been uploaded or saved. Copy them before leaving if you wish to keep them.",
    summary: "Your reflections in this preview",
    nothing: "You did not add written reflections; that is completely fine.",
    copy: "Copy my notes",
    copied: "Notes copied",
    failed: "Copy unavailable. Please select the text and copy it manually.",
    restart: "Start again",
    source: "Explore the original course",
    teacher: "Request teacher-guided Level 1",
    noInitiation: "Studying the material, completing the course or sending a request does not automatically provide initiation.",
    continuePath: "Continue with the selected path",
  },
  ru: {
    shortTitle: "Основы энергетики",
    eyebrow: "АКАДЕМИЯ HOLISTIC HOUSE · ИНТЕРАКТИВНЫЙ ПРОСМОТР",
    preview: "Предварительная версия · Ответы пока не сохраняются в аккаунте.",
    previewHelp: "Пишите только то, что готовы оставить на этой несохранённой странице. Приватное сохранение и продолжение курса разрабатываются.",
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
    finish: "Ознакомительный курс завершён",
    finishNote: "Ответы на этом экране не передавались и не сохранились в кабинете. Скопируйте их перед выходом, если хотите сохранить.",
    summary: "Ваши наблюдения в этой версии",
    nothing: "Вы не записали наблюдения, и это совершенно нормально.",
    copy: "Скопировать записи",
    copied: "Записи скопированы",
    failed: "Копирование недоступно. Выделите текст и скопируйте вручную.",
    restart: "Начать заново",
    source: "Материалы курса",
    teacher: "Запросить 1-ю ступень у преподавателя",
    noInitiation: "Просмотр материалов, окончание курса или отправка заявки не предоставляют инициацию автоматически.",
    continuePath: "Продолжить выбранный путь",
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

export function EnergyworkAiLearner({ locale }: Props) {
  const t = copy[locale];
  const [path, setPath] = useState<EnergyworkPath | null>(null);
  const [index, setIndex] = useState(0);
  // P0: in-memory preview only. Never persist private reflection text in localStorage,
  // URL search params or a general analytics event. P1 will add consent + private API.
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
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
    if (chosen !== path) {
      setAnswers((existing) => Object.fromEntries(Object.entries(existing).filter(([id]) => !/^(ygg|tan|kun)-/.test(id))));
    }
    setPath(chosen);
    setCopyState("idle");
  }
  function setAnswer(value: string) {
    setAnswers((old) => ({ ...old, [slide.id]: value }));
    setCopyState("idle");
  }
  function next() {
    if (slide.kind === "path-choice" && !path) return;
    setIndex((current) => Math.min(current + 1, energyworkSlides(path).length - 1));
  }
  function previous() {
    setIndex((current) => Math.max(0, current - 1));
  }
  function restart() {
    setIndex(0); setPath(null); setAnswers({}); setCopyState("idle");
  }
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

        <aside className={styles.preview} aria-label={t.preview}>
          <LockKeyhole size={19} aria-hidden="true" />
          <div><strong>{t.preview}</strong><p>{t.previewHelp}</p></div>
        </aside>

        <section className={styles.slide} key={slide.id} aria-labelledby="energywork-slide-title">
          <div className={styles.slideMain}>
            <div className={styles.content}>
              <span className={styles.eyebrow}><Compass size={17} aria-hidden="true" />{t.eyebrow}</span>
              <h1 id="energywork-slide-title">{slide.title[locale]}</h1>
              <p className={styles.description}>{slide.body[locale]}</p>

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
                  {copyState === "error" ? <p role="alert">{t.failed}</p> : null}
                  {source ? <Link className={styles.textLink} href={source}>{t.source}<ArrowRight size={16} /></Link> : null}
                  {teacher ? <Link className={styles.teacherLink} href={teacher}>{t.teacher}<ArrowRight size={16} /></Link> : null}
                  <p className={styles.initiationNote}>{t.noInitiation}</p>
                  <button type="button" className={styles.restart} onClick={restart}>{t.restart}</button>
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
              <button type="button" onClick={previous} disabled={index === 0} className={styles.back}><ArrowLeft size={18} aria-hidden="true" />{t.back}</button>
              <button type="button" onClick={next} disabled={slide.kind === "path-choice" && !path} className={styles.next} data-energywork-next>
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
