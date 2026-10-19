"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, ClipboardCopy, Clock3, Compass, HandHeart, LockKeyhole, PlayCircle, Sparkles, Sprout, BarChart3, Heart, Leaf, MessageCircle, ExternalLink } from "lucide-react";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { appFetch } from "@/lib/app/client-fetch";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import {
  ENERGYWORK_COURSE_ID, ENERGYWORK_COURSE_VERSION,
  energyworkPhases, energyworkLessons, energyworkInitiationRequirements,
  energyworkPathChoices, energyworkSlides,
  type EnergyworkLocale, type EnergyworkPath, type EnergyworkSlide,
} from "@/data/academy/energywork-ai-curriculum";
import styles from "./energywork-ai-learner.module.css";

type Props = { locale: EnergyworkLocale; startAtExperience?: boolean };
type AnswerMap = Record<string, string>;
type StoredProgress = {
  accountId: string; enrolled: boolean; courseVersion: string;
  slideId?: string; pathId?: EnergyworkPath | null; answers?: AnswerMap;
  revision?: number; savedAt?: string; status?: "active" | "completed";
  sharingWithTeacher?: boolean;
  enrollmentLead?: { id: string; status: string; createdAt: string } | null;
  applicationLead?: { id: string; status: string; submittedAt: string } | null;
};
type SyncStatus = "checking" | "guest" | "consent" | "ready" | "unavailable";
type SaveCommand = {
  action: "save";
  version: string; slideId: string; nextSlideId: string;
  answer?: string;
};

const copy = {
  en: {
    shortTitle: "Reiki Practitioner",
    journey: "Five Reiki lessons",
    lesson: "Lesson",
    completedLabel: "completed",
    startFree: "Start free program",
    benefits: "What to expect from your learning",
    shortLessons: "Short lessons",
    shortLessonsDetail: "Clear guidance",
    practicalTasks: "Practical tasks",
    practicalTasksDetail: "Learn at your pace",
    privateProgress: "Private progress",
    privateProgressDetail: "Save by choice",
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
    experienceBadge: "Your starting point",
    experienceNote: "Choose one answer to continue. You can change it later.",
    blank: "You can leave this unanswered.",
    notes: "My reflection",
    placeholder: "Write here (optional)…",
    value: "Your choice",
    audio: "Original English audio",
    unavailable: "This recording is not available. You can continue using the written teaching.",
    welcomeOffer: "One course · 5 lessons · 3 Reiki systems",
    welcomeRequirement: "Study all five lessons in order.",
    welcomeTeacher: "A personal initiation is arranged separately with Andrey. Course completion alone does not grant any initiation.",
    pathway: "All lessons are part of your course",
    picked: "Completed",
    fiveLessons: "Five sequential lessons",
    meditationReport: "Meditation report",
    lessonQuestion: "Course question",
    optionalForLearning: "Optional for now. A written answer is required for personal initiation review.",
    feedbackBadge: "Your review",
    saveReview: "Save review",
    reviewMissing: "Write at least 15 characters to save your review.",
    feelingPlaceholder: "Share your meditation experience: what did you feel, notice or discover?",
    feedbackPrivacy: "Your reflection stays private unless you choose to share it.",
    voicesLabel: "Learner experiences",
    voicesNoQuote: "No verified comments for this exact recording are available here yet.",
    voicesSource: "Original review",
    voicesComments: "Video comments",
    voicesNote: "Other people's experiences are not a standard to meet.",
    voicesPrevious: "Previous review",
    voicesNext: "Next review",
    voicesNavigation: "Browse learner reviews",
    milestoneLabel: "Lovely progress",
    milestoneNote: "Personal initiation and group membership are arranged separately, never granted automatically.",
    committed: "I'm committed!",
    reviewTitle: "Personal initiation readiness",
    reviewNeeded: "For a personal initiation request, complete the five reports and five course answers. You can continue learning without them.",
    reviewDone: "Your five lesson reports and answers are ready to review.",
    reviewSaveNeeded: "Your answers are complete in this preview. Sign in and consent to private saving before requesting a personal initiation. Guest entries cannot be transferred automatically; copy your notes first.",
    reviewPrivate: "Saved responses are private. Nothing is sent to the teacher automatically; you decide what to share.",
    reportMissing: "Add report",
    questionMissing: "Answer question",
    backToReview: "Return to initiation checklist",
    reportReady: "Report recorded",
    questionReady: "Answer recorded",
    readyCount: "items completed",
    initiateRequest: "Request free Level 1 introduction in",
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
    continuePath: "Continue to the next lesson",
    checking: "Checking saved course…", consentTitle: "Save your learning privately",
    consentText: "I agree to save my course progress and answers privately. I can delete my course record.",
    teacherShareConsent: "Also share my learning progress, reviews and answers with Andrey in his private practitioner CRM. No public posting or marketing.",
    teacherShareTitle: "Share my learning with Andrey",
    teacherShareAction: "Create my learning lead",
    teacherShareDone: "Andrey can see your course progress and responses in his private CRM.",
    teacherShareHint: "Only you can decide whether your personal course journal is shared with Andrey.",
    initiationLetterHeading: "Request personal initiation with Andrey",
    initiationLetterHint: "Your letter from the final lesson and your course materials will be sent securely to Andrey's CRM as a second lead.",
    initiationConfirm: "I agree to send my initiation letter and course answers to Andrey for personal review.",
    initiationSend: "Send my initiation request",
    initiationSent: "Request received in Andrey's private CRM. Your application is awaiting a personal response.",
    initiationTooShort: "Write at least 20 characters in your initiation letter on the previous step.",
    initiationShareNeeded: "Enable teacher sharing to send your application.",
    initiationNotReady: "Complete your lesson reports and answers to request personal initiation.",
    enableSave: "Start & save my course", signIn: "Sign in with Google to save",
    guestHint: "You may continue as a guest without saving.",
    saved: "Saved privately", saving: "Saving…", offline: "Saving is unavailable. Your answers are not stored on the server.",
    retry: "Retry", saveFailed: "Could not save. Your answer is still on this screen; retry before continuing.",
    conflict: "Your course changed in another session. Reload the saved version before continuing.",
    reload: "Reload saved progress", print: "Print / Save PDF",
    resetConfirm: "Delete this course, its saved answers, and both related CRM leads (including any initiation request)? Your other courses remain.",
    signupError: "Could not start Google sign-in. Try again from the My Courses cabinet.",
    accountError: "Account needs attention. Open your personal cabinet to complete sign-in and consent.",
    myCourses: "My Courses",
  },
  ru: {
    shortTitle: "Практик Рейки",
    journey: "Пять уроков Рейки",
    lesson: "Урок",
    completedLabel: "пройдено",
    startFree: "Начать бесплатный курс",
    benefits: "Что ждёт вас на курсе",
    shortLessons: "Короткие уроки",
    shortLessonsDetail: "Понятные шаги",
    practicalTasks: "Практические задания",
    practicalTasksDetail: "В своём темпе",
    privateProgress: "Личный прогресс",
    privateProgressDetail: "По вашему выбору",
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
    experienceBadge: "Ваш уровень знакомства",
    experienceNote: "Выберите один вариант, чтобы продолжить. Позже его можно изменить.",
    blank: "Можно оставить без ответа.",
    notes: "Моё наблюдение",
    placeholder: "Напишите здесь (необязательно)…",
    value: "Ваш выбор",
    audio: "Оригинальное видео на английском",
    unavailable: "Запись пока недоступна. Можно продолжить изучение по тексту.",
    welcomeOffer: "Один курс · 5 уроков · 3 системы Рейки",
    welcomeRequirement: "Проходите все пять уроков по очереди.",
    welcomeTeacher: "Личная инициация проводится отдельно, по договорённости с Андреем. Завершение курса не является инициацией.",
    pathway: "Все уроки входят в одну программу",
    picked: "Завершено",
    fiveLessons: "Пять последовательных уроков",
    meditationReport: "Отчёт после медитации",
    lessonQuestion: "Вопрос по уроку",
    optionalForLearning: "Пока можно пропустить. Письменный ответ понадобится для рассмотрения личной инициации.",
    feedbackBadge: "Ваш отзыв",
    saveReview: "Сохранить отзыв",
    reviewMissing: "Напишите хотя бы 15 символов, чтобы сохранить отзыв.",
    feelingPlaceholder: "Расскажите о медитации: какие ощущения, мысли или открытия вы заметили?",
    feedbackPrivacy: "Отзыв остаётся личным, если вы не решите поделиться им.",
    voicesLabel: "Отзывы участников",
    voicesNoQuote: "Подтверждённых отзывов именно об этой записи пока нет.",
    voicesSource: "Источник отзыва",
    voicesComments: "Комментарии к видео",
    voicesNote: "Ваш опыт не обязан совпадать с чужим.",
    voicesPrevious: "Предыдущий отзыв",
    voicesNext: "Следующий отзыв",
    voicesNavigation: "Переключение отзывов",
    milestoneLabel: "Прекрасный прогресс",
    milestoneNote: "Инициация и вступление в сообщество согласуются отдельно, а не происходят автоматически.",
    committed: "I'm committed!",
    reviewTitle: "Готовность к личной инициации",
    reviewNeeded: "Для заявки на личную инициацию заполните пять отчётов и пять ответов. Учёбу можно продолжать без них.",
    reviewDone: "Отчёты и ответы по пяти урокам готовы к просмотру.",
    reviewSaveNeeded: "Ответы заполнены в предварительном просмотре. Для заявки на личную инициацию войдите в кабинет и согласитесь на приватное сохранение. Гостевые записи автоматически не переносятся — сначала скопируйте их.",
    reviewPrivate: "Ответы сохраняются приватно. Преподавателю они автоматически не отправляются; вы сами решаете, чем поделиться.",
    reportMissing: "Заполнить отчёт",
    questionMissing: "Ответить на вопрос",
    backToReview: "Вернуться к подготовке инициации",
    reportReady: "Отчёт есть",
    questionReady: "Ответ есть",
    readyCount: "пунктов заполнено",
    initiateRequest: "Запросить бесплатную вводную инициацию I ступени —",
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
    continuePath: "Перейти к следующему уроку",
    checking: "Проверяем сохранённый курс…", consentTitle: "Сохранить обучение приватно",
    consentText: "Я согласен(на) приватно сохранять прогресс и ответы курса. Данные курса можно удалить.",
    teacherShareConsent: "Также разрешаю передавать Андрею мои ответы, отзывы и прогресс в его закрытую CRM. Без публикаций и рекламных рассылок.",
    teacherShareTitle: "Поделиться обучением с Андреем",
    teacherShareAction: "Создать мой учебный лид",
    teacherShareDone: "Андрей видит прогресс и ваши ответы в закрытой CRM.",
    teacherShareHint: "Только вы решаете, передавать ли Андрею материалы вашего курса.",
    initiationLetterHeading: "Запрос на личную инициацию у Андрея",
    initiationLetterHint: "Ваше письмо из последнего урока и ответы сохранятся у Андрея в CRM как второй лид.",
    initiationConfirm: "Я согласен(на) отправить Андрею своё письмо и ответы курса для личного рассмотрения.",
    initiationSend: "Отправить заявку на инициацию",
    initiationSent: "Ваша заявка получена в закрытой CRM Андрея и ожидает личного ответа.",
    initiationTooShort: "Напишите не меньше 20 символов в письме на предыдущем шаге.",
    initiationShareNeeded: "Для заявки разрешите передачу материалов преподавателю.",
    initiationNotReady: "Заполните ответы и отчёты, чтобы отправить заявку.",
    enableSave: "Начать с сохранением", signIn: "Войти через Google для сохранения",
    guestHint: "Можно продолжить как гость без сохранения.",
    saved: "Сохранено приватно", saving: "Сохраняем…", offline: "Сохранение недоступно. Ответы не записываются на сервер.",
    retry: "Повторить", saveFailed: "Не удалось сохранить. Ответ остался на экране; повторите перед переходом.",
    conflict: "Курс изменился в другой вкладке. Загрузите сохранённую версию перед продолжением.",
    reload: "Загрузить прогресс", print: "Печать / Сохранить PDF",
    resetConfirm: "Удалить курс, ответы и оба связанных лида в CRM, включая заявку на инициацию? Остальные курсы останутся.",
    signupError: "Не удалось начать вход через Google. Попробуйте через раздел «Мои курсы».",
    accountError: "Завершите вход и согласие в личном кабинете.",
    myCourses: "Мои курсы",
  },
} as const;

const MEDITATION_REPORT_IDS = new Set(["flight-04", "tan-04", "kun-04", "ygg-04"]);
// Previously saved reviews may contain the old 0–10 feeling prefix.
// Display only the written reflection; keep existing private records readable.
const legacyMeditationPrefix = /^Feeling:(?:10|[0-9])\/10\n([\s\S]*)$/;
function meditationReviewText(value: string) {
  const legacy = legacyMeditationPrefix.exec(value);
  return legacy ? legacy[1] : value;
}

const experienceGuidance: Record<EnergyworkLocale, Record<string, string>> = {
  en: {
    beginner: "Welcome! No Reiki experience is needed.",
    energywork: "Use your experience to compare the three Reiki traditions.",
    "reiki-1-2": "Review the foundations at your own pace.",
    master: "Compare the three traditions at your own pace.",
  },
  ru: {
    beginner: "Добро пожаловать! Опыт Рейки не требуется.",
    energywork: "Ваш опыт поможет сравнить три традиции Рейки.",
    "reiki-1-2": "Повторите основы в удобном темпе.",
    master: "Сравните три традиции Рейки в своём темпе.",
  },
};

function safePreviewNotes(slides: EnergyworkSlide[], answers: AnswerMap, locale: EnergyworkLocale) {
  const lines = [
    copy[locale].shortTitle,
    "Course: " + ENERGYWORK_COURSE_ID + " · " + ENERGYWORK_COURSE_VERSION,
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

function learnerHighlights(answers: AnswerMap, locale: EnergyworkLocale) {
  const highlights: string[] = [];
  const present = (id: string) => answers[id]?.trim();
  const experience = energyworkSlides(null).find((item) => item.id === "welcome-02")
    ?.question?.options?.find((option) => option.id === present("welcome-02"));
  if (experience) highlights.push(locale === "ru"
    ? "Ваш исходный опыт: " + experience.label.ru + "."
    : "Your starting experience: " + experience.label.en + ".");
  if (present("intention-03")) highlights.push(locale === "ru"
    ? "Ваше собственное намерение: «" + present("intention-03") + "»."
    : "Your own intention: “" + present("intention-03") + "”.");
  if (present("presence-03")) highlights.push(locale === "ru"
    ? "Вы отметили комфорт короткой паузы на " + present("presence-03") + " из 10 — это только ваша самооценка, не медицинская шкала."
    : "You rated the comfort of a short pause " + present("presence-03") + "/10 — a personal check-in, not a medical score.");
  const skipped = Object.entries(answers).filter(([id, value]) =>
    /^(flight-03|presence-02|intention-04|boundaries-03|ygg-03|tan-03|kun-03)$/.test(id) && value === "skipped").length;
  if (skipped) highlights.push(locale === "ru"
    ? "Вы выбрали пропустить практики: " + skipped + ". Это допустимо; участие остаётся добровольным."
    : "You chose to skip " + skipped + " practice(s). That is a valid choice; participation remains voluntary.");
  if (present("end-01")) highlights.push(locale === "ru"
    ? "Ваш следующий шаг: «" + present("end-01") + "»."
    : "Your next step: “" + present("end-01") + "”.");
  return highlights;
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


/** Review buttons only change the quote, never the current course slide. */
/** Compact, accessible carousel: review arrows never advance the lesson. */
function MeditationVoices({ slide, locale, youtubeId }: {
  slide: EnergyworkSlide;
  locale: EnergyworkLocale;
  youtubeId?: string;
}) {
  const t = copy[locale];
  const entries = slide.testimonials ?? [];
  const [active, setActive] = useState(0);
  const currentReview = entries[active];
  return (
    <div className={styles.voicesCard} data-meditation-voices>
      <div className={styles.voicesHeading}>
        <span className={styles.voicesEyebrow}><MessageCircle size={17} aria-hidden="true" />{t.voicesLabel}</span>
        {currentReview ? (
          <span className={styles.voicesIndex} aria-live="polite">
            {String(active + 1).padStart(2, "0")} / {String(entries.length).padStart(2, "0")}
          </span>
        ) : null}
      </div>
      {currentReview ? (
        <div data-meditation-review-carousel data-review-count={entries.length}>
          <blockquote className={styles.voiceQuote} aria-live="polite" aria-atomic="true" key={currentReview.id}>
            <span className={styles.voicesQuoteMark} aria-hidden="true">“</span>
            <p>{currentReview.quote[locale]}</p>
            <cite>{currentReview.attribution[locale]}</cite>
          </blockquote>
          {entries.length > 1 ? (
            <div className={styles.voicesControls} role="group" aria-label={t.voicesNavigation}>
              <button type="button" data-review-prev aria-label={t.voicesPrevious}
                onClick={() => setActive((index) => (index - 1 + entries.length) % entries.length)}>
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
              <span className={styles.voicesCount} aria-hidden="true">
                {entries.map((entry, number) => (
                  <span key={entry.id} className={number === active ? styles.voiceDotActive : styles.voiceDot} />
                ))}
              </span>
              <button type="button" data-review-next aria-label={t.voicesNext}
                onClick={() => setActive((index) => (index + 1) % entries.length)}>
                <ArrowRight size={20} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className={styles.voicesEmpty}>{t.voicesNoQuote}</p>
      )}
      {(currentReview || youtubeId) ? (
        <div className={styles.voicesReferences}>
          {currentReview ? (
            <Link className={styles.voicesLink} href={"/" + locale + "/academy/" + currentReview.sourcePath}>
              {t.voicesSource}<ExternalLink size={14} aria-hidden="true" />
            </Link>
          ) : null}
          {youtubeId ? (
            <a className={styles.voicesLink} href={"https://www.youtube.com/watch?v=" + youtubeId}
              target="_blank" rel="noopener noreferrer">
              {t.voicesComments}<ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function EnergyworkAiLearner({ locale, startAtExperience = false }: Props) {
  const t = copy[locale];
  // Referral entrants have already read the course overview; saved account progress still wins.
  const [index, setIndex] = useState(startAtExperience ? 1 : 0);
  const [reviewReturn, setReviewReturn] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const answersRef = useRef<AnswerMap>({});
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const [sync, setSync] = useState<SyncStatus>("checking");
  const [consented, setConsented] = useState(false);
  const [shareConsented, setShareConsented] = useState(false);
  const [sharingWithTeacher, setSharingWithTeacher] = useState(false);
  const [applicationLead, setApplicationLead] = useState<StoredProgress["applicationLead"]>(null);
  const [applicationConsented, setApplicationConsented] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const accountIdRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
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
    if (!value.enrolled) {
      setSharingWithTeacher(false);
      setApplicationLead(null);
      setSync("consent");
      return;
    }
    const restored = energyworkSlides();
    revisionRef.current = value.revision ?? 0;
    progressRef.current = value.slideId ?? "welcome-01";
    const restoredAnswers = value.answers ?? {};
    answersRef.current = restoredAnswers;
    setAnswers(restoredAnswers);
    setIndex(Math.max(0, restored.findIndex((item) => item.id === value.slideId)));
    setSavedAt(value.savedAt || null);
    setSharingWithTeacher(Boolean(value.sharingWithTeacher));
    setApplicationLead(value.applicationLead || null);
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
        action: "start", consent: true, teacherConsent: shareConsented, version: ENERGYWORK_COURSE_VERSION,
      }, "POST", { accountId: accountIdRef.current || undefined }) as StoredProgress;
      hydrate(result);
      setConsented(false);
      setShareConsented(false);
    } catch (error) {
      setSaveError((error as { status?: number })?.status === 403 ? t.accountError : t.saveFailed);
    } finally { setBusy(false); }
  }
  async function shareWithTeacher() {
    if (busy || !shareConsented || sync !== "ready") return;
    setBusy(true);
    try {
      await queueRef.current.catch(() => {});
      const value = await appFetch("academy-energywork", {
        action: "share", version: ENERGYWORK_COURSE_VERSION, consent: true, teacherConsent: true,
      }, "POST", { accountId: accountIdRef.current || undefined }) as StoredProgress;
      hydrate(value);
      setShareConsented(false);
    } catch {
      setSaveError(t.saveFailed);
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
  const slides = useMemo(() => energyworkSlides(), []);
  const slide = slides[index] ?? slides[0]!;
  const total = slides.length;
  const completed = slide.kind === "finish";
  const portraitArt = slide.id === "welcome-01" || slide.id === "flight-01" || slide.id === "tan-01";
  const voicesArt = slide.kind === "voices";
  const artSource = portraitArt || voicesArt ? "/images/holistic-house/reiki-approved-sunrise-v3.webp" : slide.image;
  const experienceMissing = slide.id === "welcome-02" && !slide.question?.options?.some((option) => option.id === answers[slide.id]);
  const isMeditationFeedback = MEDITATION_REPORT_IDS.has(slide.id);
  const meditationReview = meditationReviewText(answers[slide.id] ?? "");
  const feedbackMissing = isMeditationFeedback && Array.from(meditationReview.trim()).length < 15;
  const media = slide.videoKey ? englishGuidedMeditations.find((item) => item.key === slide.videoKey) : null;
  const notes = safePreviewNotes(slides, answers, locale);
  const highlights = learnerHighlights(answers, locale);
  const lessonNumber = slide.phase === "welcome" ? 1 : slide.phase === "complete" ? 5 :
    Math.max(1, energyworkLessons.findIndex((item) => item.phase === slide.phase) + 1);
  const initiationItems = energyworkInitiationRequirements.map((item) => ({
    ...item,
    title: energyworkLessons.find((lesson) => lesson.phase === item.lesson)?.title[locale] ?? item.lesson,
    reportDone: Boolean(answers[item.reportId]?.trim()),
    questionDone: Boolean(answers[item.questionId]?.trim()),
  }));
  const readyCount = initiationItems.reduce((count, item) => count + Number(item.reportDone) + Number(item.questionDone), 0);
  const initiationReady = readyCount === initiationItems.length * 2;
  // Only show application links for a consented account with saved reports.
  // Guests may explore the lessons and copy their notes before they sign in.
  const savedInitiationReady = initiationReady && sync === "ready" &&
    !busy && !saveError && dirtyRef.current.size === 0;

  function setAnswer(value: string) {
    const updated = { ...answersRef.current, [slide.id]: value };
    answersRef.current = updated;
    setAnswers(updated);
    dirtyRef.current.add(slide.id);
    setCopyState("idle");
  }
  async function store(nextSlideId: string) {
    if (sync !== "ready") return;
    const response = await request({
      action: "save",
      version: ENERGYWORK_COURSE_VERSION,
      slideId: slide.id, nextSlideId,
      ...(slide.question ? { answer: answers[slide.id] || "" } : {}),
    });
    dirtyRef.current.delete(slide.id);
    return response;
  }
  // A learner can revisit a report/question without discarding other lesson answers.
  async function jumpToSlide(id: string) {
    if (busy) return;
    const target = slides.findIndex((item) => item.id === id);
    if (target < 0) return;
    if (sync === "ready" && slide.question && dirtyRef.current.has(slide.id)) {
      setBusy(true);
      try { await store(slide.id); }
      catch { setSaveError(t.saveFailed); setBusy(false); return; }
      setBusy(false);
    }
    setReviewReturn(id === "paths-04" ? false :
      slide.id === "paths-04" || slide.kind === "finish" ? true : reviewReturn);
    setIndex(target);
  }
  async function next() {
    if (busy || experienceMissing || feedbackMissing) return;
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
    setIndex((current) => Math.min(current + 1, slides.length - 1));
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
    setIndex(0); setAnswers({}); setReviewReturn(false); setCopyState("idle");
    setSharingWithTeacher(false);setApplicationLead(null);setApplicationConsented(false);
    dirtyRef.current.clear();
  }
  // A brief debounce preserves reflections while users type; queued writes and
  // revision checks prevent racing a Next button or concurrent browser tab.
  useEffect(() => {
    if (sync !== "ready" || !slide.question || !dirtyRef.current.has(slide.id)) return;
    const id = slide.id, value = answers[id] ?? "";
    const timer = window.setTimeout(() => {
      void request({action:"save",version:ENERGYWORK_COURSE_VERSION,
        slideId:id,nextSlideId:id,answer:value})
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

  async function applyForInitiation() {
    if (busy || !applicationConsented || !savedInitiationReady || !sharingWithTeacher ||
        applicationLead || (answers["end-01"] || "").trim().length < 20) return;
    setBusy(true);setApplicationMessage("");
    try {
      await queueRef.current.catch(() => {});
      const value = await appFetch("academy-energywork", {
        action: "apply", version: ENERGYWORK_COURSE_VERSION,
        expectedRevision: revisionRef.current, confirmed: true,
      }, "POST", { accountId: accountIdRef.current || undefined }) as StoredProgress;
      hydrate(value);
      setApplicationConsented(false);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      setApplicationMessage(code === "COURSE_PROGRESS_CHANGED" ? t.conflict : t.saveFailed);
    } finally { setBusy(false); }
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
    <main className={styles.page} lang={locale} data-course-one-screen="v1" data-course-theme="reiki-scenic-v1" data-course-visual="reiki-airy-v2" data-course-portrait="v3" data-reiki-reviews="v4" data-energywork-screen={slide.kind === "welcome" ? "welcome" : "lesson"} data-energywork-phase={slide.phase} data-energywork-ai-learner data-course-id={ENERGYWORK_COURSE_ID} data-course-version={ENERGYWORK_COURSE_VERSION}>
      <div className={styles.shell}>
        {slide.kind === "welcome" ? (
          <header className={styles.top}>
            <Link className={styles.home} href={"/" + locale + "/academy/principles-of-energywork"} aria-label={t.backCourse}>
              <ArrowLeft size={19} aria-hidden="true" /><span>{t.backCourse}</span>
            </Link>
            <span className={styles.courseMark}><Sparkles size={17} aria-hidden="true" />{t.shortTitle}</span>
            <span className={styles.phaseLabel}>{energyworkPhases[slide.phase][locale]}</span>
          </header>
        ) : null}

        <nav className={styles.journey} aria-label={t.fiveLessons}>
          <ol>
            {energyworkLessons.map((lesson, number) => (
              <li key={lesson.phase}
                className={lessonNumber === number + 1 ? styles.journeySelected :
                  lessonNumber > number + 1 ? styles.journeyIntro : ""}
                aria-current={lessonNumber === number + 1 || (lessonNumber === 0 && number === 0) ? "step" : undefined}>
                <span className={styles.journeyDot} aria-hidden="true">
                  {lessonNumber > number + 1 ? <Check size={16} /> : number + 1}
                </span>
                <span className={styles.journeyLabel}>{lesson.title[locale]}</span>
              </li>
            ))}
          </ol>
        </nav>

        <section className={styles.slide + (slide.kind === "welcome" ? " " + styles.welcomeSlide : "") + (slide.id === "welcome-02" ? " " + styles.experienceSlide : "")} key={slide.id} data-energywork-slide-kind={slide.kind} data-energywork-slide-id={slide.id} aria-labelledby="energywork-slide-title">
          <div className={styles.slideMain}>
            <div className={styles.content}>
              <span className={styles.eyebrow}><Compass size={17} aria-hidden="true" />{slide.kind === "welcome" ? t.eyebrow : energyworkPhases[slide.phase][locale]}</span>
              <h1 id="energywork-slide-title">{slide.title[locale]}</h1>
              <p className={styles.description}>{slide.body[locale]}</p>
              {slide.kind === "welcome" ? (
                <div className={styles.welcomeReward} aria-label={t.welcomeOffer}>
                  <p className={styles.welcomeRewardTitle}><Sparkles size={17} aria-hidden="true" />{t.welcomeOffer}</p>
                  <ul className={styles.welcomeSystems}>
                    {energyworkPathChoices.map((choice) => <li key={choice.id}>{choice.title[locale]}</li>)}
                  </ul>
                  <p className={styles.welcomeRequirement}>{t.welcomeRequirement}</p>
                </div>
              ) : null}
              {slide.kind === "welcome" ? (
                <div className={styles.benefits} aria-label={t.benefits}>
                  <div><span className={styles.benefitIcon}><Leaf size={19} aria-hidden="true" /></span>
                    <strong>{t.shortLessons}</strong><small>{t.shortLessonsDetail}</small></div>
                  <div><span className={styles.benefitIcon}><Heart size={19} aria-hidden="true" /></span>
                    <strong>{t.practicalTasks}</strong><small>{t.practicalTasksDetail}</small></div>
                  <div><span className={styles.benefitIcon}><BarChart3 size={19} aria-hidden="true" /></span>
                    <strong>{t.privateProgress}</strong><small>{t.privateProgressDetail}</small></div>
                </div>
              ) : null}
              {slide.kind === "milestone" ? (
                <div className={styles.milestoneCard}>
                  <span className={styles.milestoneSymbol}><Award size={34} aria-hidden="true" /></span>
                  <strong>{t.milestoneLabel}</strong>
                  <p>{t.milestoneNote}</p>
                </div>
              ) : null}
              {slide.kind === "voices" ? <MeditationVoices key={slide.id} slide={slide} locale={locale} youtubeId={media?.youtubeId ?? undefined} /> : null}
              {slide.kind === "practice" ? <PracticeTimer key={slide.id} locale={locale} /> : null}

              {slide.id === "paths-04" ? (
                <div className={styles.reviewChecklist} data-initiation-readiness>
                  <h2>{t.reviewTitle} · {readyCount}/10</h2>
                  <p>{initiationReady ? (savedInitiationReady ? t.reviewDone : t.reviewSaveNeeded) : t.reviewNeeded}</p>
                  <div className={styles.reviewRows}>
                    {initiationItems.map((item) => (
                      <div className={styles.reviewRow} key={item.lesson}>
                        <strong>{item.title}</strong>
                        <div>
                          <button type="button" onClick={() => jumpToSlide(item.reportId)}
                            className={item.reportDone ? styles.reviewRecorded : styles.reviewMissing}>
                            {item.reportDone ? <Check size={13} aria-hidden="true" /> : null}
                            {item.reportDone ? t.reportReady : t.reportMissing}
                          </button>
                          <button type="button" onClick={() => jumpToSlide(item.questionId)}
                            className={item.questionDone ? styles.reviewRecorded : styles.reviewMissing}>
                            {item.questionDone ? <Check size={13} aria-hidden="true" /> : null}
                            {item.questionDone ? t.questionReady : t.questionMissing}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className={styles.reviewPrivacy}><LockKeyhole size={14} aria-hidden="true" />{t.reviewPrivate}</p>
                </div>
              ) : null}

              {slide.question ? (
                <div className={styles.question}>
                  <span className={styles.questionBadge}><BookOpen size={15} aria-hidden="true" />{slide.id === "welcome-02" ? t.experienceBadge :
                     isMeditationFeedback ? t.feedbackBadge :
                     initiationItems.some((item) => item.reportId === slide.id) ? t.meditationReport :
                     initiationItems.some((item) => item.questionId === slide.id) ? t.lessonQuestion : t.optional}</span>
                  {slide.question.type === "choice"
                    ? <p className={styles.prompt}>{slide.question.prompt[locale]}</p>
                    : <label className={styles.prompt} htmlFor={"answer-" + slide.id}>{slide.question.prompt[locale]}</label>}
                  {slide.question.type === "text" ? (
                    <textarea id={"answer-" + slide.id} value={isMeditationFeedback ? meditationReview : (answers[slide.id] ?? "")}
                      onChange={(e) => setAnswer(e.target.value.slice(0, 1600))}
                      className={styles.textarea + (isMeditationFeedback ? " " + styles.feedbackTextarea : "")}
                      maxLength={1600} rows={4}
                      placeholder={isMeditationFeedback ? t.feelingPlaceholder : t.placeholder} autoComplete="off" />
                  ) : null}
                  {isMeditationFeedback ? <p className={styles.feedbackCount} aria-live="polite">{Math.min(15, Array.from(meditationReview.trim()).length)} / 15</p> : null}
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
                        <label key={option.id} className={styles.choice + (slide.id === "welcome-02" ? " " + styles.experienceChoice : "")}>
                          {slide.id === "welcome-02" ? (
                            <span className={styles.experienceIcon} aria-hidden="true">
                              {option.id === "beginner" ? <Sprout size={19} /> :
                                option.id === "energywork" ? <HandHeart size={19} /> :
                                  option.id === "reiki-1-2" ? <Sparkles size={19} /> : <Award size={19} />}
                            </span>
                          ) : null}
                          <input type="radio" name={slide.id} value={option.id}
                            checked={answers[slide.id] === option.id} onChange={() => setAnswer(option.id)} />
                          <span>{option.label[locale]}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {slide.id === "welcome-02" && !experienceMissing ? (
                    <p className={styles.experienceGuidance} role="status">{experienceGuidance[locale][answers[slide.id]]}</p>
                  ) : null}
                  <p className={styles.optional + (isMeditationFeedback ? " " + styles.feedbackRequired : "")}
                    role={feedbackMissing ? "status" : undefined}>{slide.id === "welcome-02" ? t.experienceNote :
                    isMeditationFeedback ? (feedbackMissing ? t.reviewMissing : t.feedbackPrivacy) :
                    initiationItems.some((item) => item.reportId === slide.id || item.questionId === slide.id)
                    ? t.optionalForLearning : t.blank}</p>
                  {reviewReturn && !feedbackMissing && initiationItems.some((item) => item.reportId === slide.id || item.questionId === slide.id) ?
                    <button type="button" className={styles.returnToReview} onClick={() => jumpToSlide("paths-04")}
                      disabled={busy}>{t.backToReview}<ArrowRight size={15} aria-hidden="true" /></button> : null}
                </div>
              ) : null}

              {slide.kind === "finish" ? (
                <div className={styles.final}>
                  <span className={styles.finalTag}><Check size={18} aria-hidden="true" />{t.finish}</span>
                  <section className={styles.initiationRequestBox} data-reiki-initiation-request>
                    <h2>{t.initiationLetterHeading}</h2>
                    <p>{t.initiationLetterHint}</p>
                    {applicationLead ? (
                      <p className={styles.initiationSent} role="status"><Check size={17} aria-hidden="true" />{t.initiationSent}</p>
                    ) : !savedInitiationReady ? (
                      <p className={styles.initiationHint}>{t.initiationNotReady}</p>
                    ) : !sharingWithTeacher ? (
                      <p className={styles.initiationHint}>{t.initiationShareNeeded}</p>
                    ) : (answers["end-01"] || "").trim().length < 20 ? (
                      <p className={styles.initiationHint}>{t.initiationTooShort}</p>
                    ) : (
                      <div className={styles.initiationApplication}>
                        <blockquote className={styles.letterPreview}>{answers["end-01"]}</blockquote>
                        <label className={styles.consentLabel}>
                          <input type="checkbox" checked={applicationConsented}
                            onChange={event => setApplicationConsented(event.target.checked)} />
                          <span>{t.initiationConfirm}</span>
                        </label>
                        <button type="button" className={styles.initiationSend} disabled={busy || !applicationConsented}
                          onClick={applyForInitiation}>{t.initiationSend}<ArrowRight size={18} aria-hidden="true" /></button>
                      </div>
                    )}
                    {applicationMessage ? <p role="alert">{applicationMessage}</p> : null}
                  </section>
                  <h2>{locale === "ru" ? "Ваши личные учебные итоги" : "Your personal learning highlights"}</h2>
                  <p className={styles.guideNote}>{locale === "ru"
                    ? "Сводка составлена только по вашим собственным ответам и выбору. Это не диагноз и не автоматическая интерпретация личности."
                    : "A simple summary of your own recorded answers and choices. Not a diagnosis or automatic personality interpretation."}</p>
                  {highlights.length ? <ul className={styles.highlights}>
                    {highlights.map((point, index) => <li key={index}>{point}</li>)}
                  </ul> : <p>{locale === "ru" ? "Вы можете вернуться к заданиям и записать наблюдения." : "You can return to the activities to add optional reflections."}</p>}
                  <h2>{t.summary}</h2>
                  <pre className={styles.notes}>{Object.values(answers).some((value) => value.trim()) ? notes : t.nothing}</pre>
                  <p>{t.finishNote}</p>
                  <button type="button" className={styles.copyButton} onClick={copyNotes}><ClipboardCopy size={17} aria-hidden="true" />{copyState === "success" ? t.copied : t.copy}</button>
                  <button type="button" className={styles.copyButton} onClick={() => window.print()}>{t.print}</button>
                  {copyState === "error" ? <p role="alert">{t.failed}</p> : null}
                  <h2>{t.reviewTitle} · {readyCount}/10 {t.readyCount}</h2>
                  <p>{initiationReady ? (savedInitiationReady ? t.reviewDone : t.reviewSaveNeeded) : t.reviewNeeded}</p>
                  {!savedInitiationReady ? (
                    <div className={styles.reviewRows}>
                      {initiationItems.map((item) => (
                        <div className={styles.reviewRow} key={item.lesson}>
                          <strong>{item.title}</strong>
                          <div>
                            {!item.reportDone ? <button type="button" onClick={() => jumpToSlide(item.reportId)} className={styles.reviewMissing}>{t.reportMissing}</button> : null}
                            {!item.questionDone ? <button type="button" onClick={() => jumpToSlide(item.questionId)} className={styles.reviewMissing}>{t.questionMissing}</button> : null}
                            {item.reportDone && item.questionDone ? <span className={styles.reviewRecorded}><Check size={13} />{t.picked}</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.reviewDoneMessage}>{applicationLead ? t.initiationSent : t.initiationLetterHint}</p>
                  )}
                  {applicationLead ? (
                    <div className={styles.initiationLinks}>
                      {energyworkPathChoices.map((choice) => (
                        <Link key={choice.id} className={styles.textLink}
                          href={"/" + locale + "/academy/" + choice.freePath + (choice.id === "tantra" ? "#apply-free" : "")}>
                          {t.initiateRequest} {choice.title[locale]} <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  <p className={styles.reviewPrivacy}><LockKeyhole size={14} aria-hidden="true" />{t.reviewPrivate}</p>
                  <p className={styles.initiationNote}>{t.noInitiation}</p>
                  <h2>{t.source}</h2>
                  <div className={styles.initiationLinks}>
                    {energyworkPathChoices.map((choice) => (
                      <Link key={choice.id} className={styles.textLink}
                        href={"/" + locale + "/academy/" + choice.studyPath}>
                        {choice.title[locale]} <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                  <button type="button" className={styles.restart} onClick={restart} disabled={busy}>{t.restart}</button>
                </div>
              ) : null}
            </div>
            {artSource ? (
              <div className={styles.art} data-reiki-person={portraitArt || voicesArt ? "true" : undefined}>
                <Image src={artSource}
                  alt={portraitArt || voicesArt ? (locale === "ru" ? "Женщина спокойно медитирует в лучах утреннего солнца" : "Woman resting peacefully in morning sunlight") : ""}
                  fill priority={index === 0 || voicesArt} unoptimized={portraitArt || voicesArt}
                  sizes="(max-width: 720px) 100vw, 42vw" />
              </div>
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

        <div className={styles.progressFooter}>
          <div className={styles.progressHeader}>
            <span>{t.lesson} {index + 1} {t.of} {total}</span>
            <span>{Math.round((index + 1) / total * 100)}% {t.completedLabel}</span>
          </div>
          <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={total}
            aria-valuenow={index + 1} aria-label={t.lesson}>
            <span style={{ width: ((index + 1) / total * 100) + "%" }} />
          </div>
        </div>

        <details className={styles.programme}>
          <summary>{t.program}</summary>
          <ol>{energyworkLessons.map((lesson) => (
            <li key={lesson.phase} aria-current={lesson.phase === slide.phase ? "step" : undefined}>{lesson.title[locale]}</li>
          ))}</ol>
          {slide.kind === "welcome" ? <p className={styles.programmeNote}>{t.welcomeTeacher}</p> : null}
          <p className={styles.disclaimer}>{t.stop}</p>
          <aside className={styles.preview} aria-live="polite">
          <LockKeyhole size={19} aria-hidden="true" />
          <div className={styles.syncContent}>
            {sync === "checking" ? <strong>{t.checking}</strong> : null}
            {sync === "guest" ? <>
              <strong>{t.preview}</strong>
              <details className={styles.saveDetails}>
                <summary>{t.consentTitle}</summary>
                <p>{t.previewHelp}</p>
                <button type="button" onClick={signIn} disabled={busy} className={styles.syncButton}>{t.signIn}</button>
                <p>{t.guestHint}</p>
              </details>
            </> : null}
            {sync === "consent" ? <>
              <details className={styles.saveDetails}>
                <summary>{t.consentTitle}</summary>
                <label className={styles.consentLabel}>
                  <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />
                  <span>{t.consentText}</span>
                </label>
                <label className={styles.consentLabel}>
                  <input type="checkbox" checked={shareConsented} onChange={(event) => setShareConsented(event.target.checked)} />
                  <span>{t.teacherShareConsent}</span>
                </label>
                <button type="button" onClick={startSaving} disabled={!consented || busy} className={styles.syncButton}>{t.enableSave}</button>
                <p>{t.guestHint}</p>
              </details>
            </> : null}
            {sync === "ready" ? <>
              <strong><Check size={16} aria-hidden="true" />{busy || dirtyRef.current.size > 0 ? t.saving : t.saved}</strong>
              {savedAt ? <small>{new Date(savedAt).toLocaleString(locale)}</small> : null}
              <Link href={"/" + locale + "/app/course"} prefetch={false}>{t.myCourses}</Link>
              {sharingWithTeacher ? <p className={styles.teacherShared}><Check size={15} aria-hidden="true" />{t.teacherShareDone}</p> :
                <details className={styles.saveDetails}>
                  <summary>{t.teacherShareTitle}</summary>
                  <p>{t.teacherShareHint}</p>
                  <label className={styles.consentLabel}>
                    <input type="checkbox" checked={shareConsented}
                      onChange={event => setShareConsented(event.target.checked)} />
                    <span>{t.teacherShareConsent}</span>
                  </label>
                  <button type="button" onClick={shareWithTeacher}
                    disabled={!shareConsented || busy} className={styles.syncButton}>{t.teacherShareAction}</button>
                </details>}
            </> : null}
            {sync === "unavailable" ? <><strong>{t.offline}</strong><button className={styles.syncButton} onClick={reloadProgress} type="button">{t.retry}</button></> : null}
            {saveError ? <p role="alert" className={styles.saveError}>{saveError}
              <button className={styles.retryButton} onClick={reloadProgress} type="button">{t.reload}</button></p> : null}
          </div>
          </aside>
        </details>
        <footer className={styles.footer}>
          {!completed ? (
            <div className={styles.actions}>
              <button type="button" onClick={previous} disabled={index === 0 || busy || sync === "checking"} className={styles.back}><ArrowLeft size={18} aria-hidden="true" />{t.back}</button>
              <button type="button" onClick={next} disabled={busy || sync === "checking" || experienceMissing || feedbackMissing} className={styles.next} data-energywork-next>
                {isMeditationFeedback ? t.saveReview : slide.kind === "welcome" ? t.startFree : slide.kind === "milestone" ? t.committed : t.continue}<ArrowRight size={19} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </footer>
      </div>
    </main>
  );
}
