"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight, BarChart3, BookOpen, Check, ChevronDown, CircleHelp,
  Compass, LockKeyhole, Play, ShieldCheck, Sparkles, TestTubeDiagonal, Zap,
} from "lucide-react";
import {
  GUEST_VIDEO_LIMIT, QUEST_STEPS, QUEST_STORAGE_KEY, emptyQuest,
  answerQuestVideoQuestion, markQuestStep, nextQuestLaunch, normalizeQuest, questCompletedCount,
  remainingGuestLaunches,
  type QuestState, type QuestStepId,
} from "@/lib/holistic-support/guest-quest.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-guest-quest.module.css";

type Access = "checking" | "guest" | "member" | "unavailable";

export function useSupportGuestQuest() {
  const stateRef = useRef<QuestState>(emptyQuest());
  const [record, setRecord] = useState<QuestState>(() => emptyQuest());
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState<Access>("checking");

  useEffect(() => {
    let next = emptyQuest();
    try {
      const raw = window.localStorage.getItem(QUEST_STORAGE_KEY);
      if (raw && raw.length < 1200) next = normalizeQuest(JSON.parse(raw));
      // Browser storage is not an account entitlement or completion receipt.
      // Never show a remembered test checkmark until the currently verified
      // member/guest session confirms a completed result.
      next = normalizeQuest({ ...next, completed: { ...next.completed, test: false } });
    } catch {
      // Storage can be unavailable in a private browser; the journey still works in memory.
    }
    stateRef.current = next;
    setRecord(next);
    setReady(true);
  }, []);

  const refreshAccess = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/app/auth/status", {
        method: "GET", credentials: "same-origin", cache: "no-store",
        headers: { Accept: "application/json" }, signal,
      });
      if (signal?.aborted) return;
      if (response.status === 401) { setAccess("guest"); return; }
      if (!response.ok) { setAccess("unavailable"); return; }
      const data: unknown = await response.json();
      setAccess(data && typeof data === "object" && "signedIn" in data &&
        (data as { signedIn?: unknown }).signedIn === true ? "member" : "unavailable");
    } catch {
      if (!signal?.aborted) setAccess("unavailable");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshAccess(controller.signal);
    return () => controller.abort();
  }, [refreshAccess]);

  const persist = useCallback((next: QuestState) => {
    stateRef.current = next;
    setRecord(next);
    try {
      // Only a bounded activity count and generic badges, never photos,
      // assessment values, video IDs or test responses.
      window.localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(next));
    } catch { /* in-memory only when browser storage is disabled */ }
  }, []);

  const mark = useCallback((step: QuestStepId) => {
    if (!ready) return;
    persist(markQuestStep(stateRef.current, step));
  }, [persist, ready]);

  const launch = useCallback(() => {
    if (!ready) return false;
    const next = nextQuestLaunch(stateRef.current, access === "member");
    if (!next) return false;
    persist(next);
    return true;
  }, [access, persist, ready]);

  const answerVideoQuestion = useCallback(() => {
    if (ready) persist(answerQuestVideoQuestion(stateRef.current));
  }, [persist, ready]);

  // A server-owned completed result is the only source of truth for this badge.
  // Neither opening Test Explorer nor pressing the test shortcut can award it.
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const check = async () => {
      try {
        const response = await fetch("/api/app/support-journey/test-status", {
          credentials: "same-origin", cache: "no-store", signal: controller.signal,
        });
        if (!response.ok || controller.signal.aborted) return;
        const status: unknown = await response.json();
        // Device storage belongs to a browser, not an authenticated identity.
        // A confirmed "false" must also clear an earlier user's test checkmark.
        // Network failures never alter the last verified state.
        const verifiedCompletion = status && typeof status === "object" && "completed" in status
          ? (status as { completed?: unknown }).completed : null;
        if (typeof verifiedCompletion === "boolean" && !controller.signal.aborted) {
          const previous = stateRef.current;
          if (previous.completed.test !== verifiedCompletion) {
            persist(normalizeQuest({
              ...previous, completed: { ...previous.completed, test: verifiedCompletion },
            }));
          }
        }
      } catch { /* A failed status check never invents a completion. */ }
    };
    const whenVisible = () => { if (document.visibilityState === "visible") void check(); };
    void check();
    document.addEventListener("visibilitychange", whenVisible);
    window.addEventListener("pageshow", whenVisible);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", whenVisible);
      window.removeEventListener("pageshow", whenVisible);
    };
  }, [ready, persist]);

  return {
    record, ready, access, mark, launch, answerVideoQuestion, refreshAccess,
    canPlay: ready && (access === "member" || remainingGuestLaunches(record) > 0),
  };
}

export type SupportGuestQuestController = ReturnType<typeof useSupportGuestQuest>;

const copy = {
  en: {
    title: "Your progress", subtitle: "7 free steps to explore Holistic House",
    completed: "Completed", todo: "Try it", next: "Your next step", allDone: "You've explored all 7 steps",
    detail: "Show a hint", stepButton: "Open this step", confirmTest: "I completed a test",
    manualTest: "A checkmark appears after a completed test is confirmed by your private session. Results are never stored in this bar.",
    battery: "Your video energy", remaining: "starts left", unlimited: "Free account · unlimited starts here",
    preview: "Guests can start 10 videos in this player on this device. Public YouTube links still work.",
    out: "Your guest preview is used up", signIn: "Sign in free with Google",
    signInHint: "Continue the free videos after signing in. No subscription is needed.",
    verifying: "Checking your account", offline: "Couldn't verify sign-in; the guest allowance applies.",
    premium: "Explore Premium options", premiumHint: "Optional; subject to availability in your account.",
    average: "Self-rating", ratings: "Optional check-in, not XP or a health score",
    focus: "Current focus", noPenalty: "No deadlines, streak penalties or health promises.",
    steps: {
      checkin: { name: "Notice how you feel", hint: "Move at least one of the four self-rating sliders. This is a private check-in, not a diagnostic test.", action: "Go to your scales" },
      category: { name: "Choose a meditation topic", hint: "Select Energy, Money, Love, Meaning, Wellbeing or All above the video.", action: "Choose a topic" },
      recommendation: { name: "See your recommendations", hint: "Use the recommendation button to explore what matches your chosen ratings or goals.", action: "Show recommendations" },
      firstVideo: { name: "Start a meditation", hint: "Press Play on an original recording. This marks a start, not proof that the full video was watched.", action: "Choose a meditation" },
      secondVideo: { name: "Try a second video start", hint: "Try another recording or return to a practice. Two player starts earn this activity badge.", action: "Explore recordings" },
      test: { name: "Complete a free test", hint: "Visit the free Test Explorer. The checkmark appears automatically after the test is submitted successfully.", action: "Explore free tests" },
      course: { name: "Explore a free course", hint: "Browse the existing courses and choose a learning path. Viewing the catalogue does not enroll or charge you.", action: "View courses" },
    },
  },
  ru: {
    title: "Твой прогресс", subtitle: "7 бесплатных шагов знакомства с Holistic House",
    completed: "Выполнено", todo: "Попробовать", next: "Следующий шаг", allDone: "Ты изучил все 7 шагов",
    detail: "Подсказка", stepButton: "Перейти к шагу", confirmTest: "Я прошёл тест",
    manualTest: "Галочка появится после подтверждённого результата теста. Ответы и баллы в этой плашке не хранятся.",
    battery: "Твой заряд видео", remaining: "запусков осталось", unlimited: "Бесплатный кабинет · без лимита запусков здесь",
    preview: "Без входа доступно 10 запусков в этом плеере на устройстве. Публичные ссылки YouTube остаются доступны.",
    out: "Пробный заряд закончился", signIn: "Войти бесплатно через Google",
    signInHint: "Продолжить бесплатные видео после входа. Подписка не требуется.",
    verifying: "Проверяем вход", offline: "Не удалось проверить вход; действует гостевой лимит.",
    premium: "Возможности Premium", premiumHint: "Необязательно, доступность зависит от кабинета.",
    average: "Самооценка", ratings: "Личная отметка, не очки опыта и не оценка здоровья",
    focus: "Твой фокус", noPenalty: "Без штрафов за перерыв, гонки и обещаний исцеления.",
    steps: {
      checkin: { name: "Оцени своё состояние", hint: "Сдвинь хотя бы одну из четырёх шкал слева. Это личная отметка, а не диагноз.", action: "К шкалам" },
      category: { name: "Выбери тему медитации", hint: "Выбери Энергию, Деньги, Любовь, Смыслы, Здоровье или Все над большим видео.", action: "Выбрать тему" },
      recommendation: { name: "Получи рекомендации", hint: "Нажми «Подобрать рекомендации», чтобы увидеть материалы на основе выбранных тобой целей.", action: "Мои рекомендации" },
      firstVideo: { name: "Начни медитацию", hint: "Нажми Play на оригинальной записи. Засчитывается запуск, а не подтверждённый полный просмотр.", action: "Выбрать медитацию" },
      secondVideo: { name: "Запусти второе видео", hint: "Попробуй другую запись или повтори практику. Два запуска дают отметку активности.", action: "Смотреть записи" },
      test: { name: "Пройди бесплатный тест", hint: "Открой каталог. Галочка появится автоматически после успешной отправки завершённого теста.", action: "Открыть тесты" },
      course: { name: "Познакомься с курсами", hint: "Посмотри уже существующие бесплатные программы. Просмотр каталога не означает запись или оплату.", action: "Посмотреть курсы" },
    },
  },
  es: {
    title: "Tu progreso", subtitle: "7 pasos gratuitos para explorar Holistic House",
    completed: "Completado", todo: "Probar", next: "Siguiente paso", allDone: "Has explorado los 7 pasos",
    detail: "Ver consejo", stepButton: "Abrir este paso", confirmTest: "He completado un test",
    manualTest: "La marca aparece tras confirmar un resultado. No se guardan respuestas ni puntuaciones en la barra.",
    battery: "Tu energía para vídeos", remaining: "inicios restantes", unlimited: "Cuenta gratuita · sin límite de inicios aquí",
    preview: "Como invitado puedes iniciar 10 vídeos en este reproductor. Los enlaces públicos de YouTube siguen disponibles.",
    out: "Has usado tus inicios de prueba", signIn: "Entrar gratis con Google",
    signInHint: "Sigue viendo vídeos gratuitos al entrar. No necesitas suscripción.",
    verifying: "Comprobando acceso", offline: "No se pudo comprobar la sesión; se aplica el límite de invitado.",
    premium: "Explorar Premium", premiumHint: "Opcional, según disponibilidad en tu cuenta.",
    average: "Autoevaluación", ratings: "Reflexión personal, no XP ni puntuación de salud",
    focus: "Tu enfoque", noPenalty: "Sin castigos por descansar ni promesas de salud.",
    steps: {
      checkin: { name: "Observa cómo te sientes", hint: "Mueve al menos una de las cuatro escalas. Es una reflexión privada, no un diagnóstico.", action: "Ir a las escalas" },
      category: { name: "Elige un tema", hint: "Elige Energía, Dinero, Amor, Sentido, Bienestar o Todas las categorías.", action: "Elegir tema" },
      recommendation: { name: "Mira tus recomendaciones", hint: "Pulsa el botón de recomendaciones para explorar contenidos relacionados con tus preferencias.", action: "Ver recomendaciones" },
      firstVideo: { name: "Inicia una meditación", hint: "Pulsa Play en una grabación original. Se registra el inicio, no la visualización completa.", action: "Elegir meditación" },
      secondVideo: { name: "Inicia un segundo vídeo", hint: "Prueba otra grabación o repite una práctica. Dos inicios completan este paso.", action: "Explorar vídeos" },
      test: { name: "Completa un test gratuito", hint: "Visita el catálogo. La marca aparece automáticamente después de enviar una prueba completa.", action: "Explorar tests" },
      course: { name: "Explora un curso gratuito", hint: "Descubre los cursos existentes. Verlos no supone inscripción ni pago.", action: "Ver cursos" },
    },
  },
} as const;

const stepIcons = {
  checkin: BarChart3, category: Compass, recommendation: Sparkles,
  firstVideo: Play, secondVideo: Zap, test: TestTubeDiagonal, course: BookOpen,
} as const;

export function SupportGuestQuestPanel({
  locale, quest, averageScore, focusLabel, onStep, testHref,
}: {
  locale: PublicLocale;
  quest: SupportGuestQuestController;
  averageScore: string;
  focusLabel: string;
  onStep: (id: QuestStepId) => void;
  testHref: string;
}) {
  const t = copy[locale];
  const [selected, setSelected] = useState<QuestStepId | null>(null);
  const done = questCompletedCount(quest.record);
  const nextStep = QUEST_STEPS.find(id => !quest.record.completed[id]);
  const active = selected ?? nextStep ?? "course";
  const activeInfo = t.steps[active];
  const accountLocale = locale === "es" ? "en" : locale;
  const member = quest.access === "member";
  const remaining = remainingGuestLaunches(quest.record);
  const exhausted = quest.ready && remaining === 0 && !member;

  return (
    <div className={styles.quest} data-support-quest data-quest-complete={done === QUEST_STEPS.length}>
      <div className={styles.heading}>
        <div>
          <h2 id="support-mobile-progress-heading">{t.title}</h2>
          <p>{t.subtitle}</p>
        </div>
        <span className={styles.counter} data-support-quest-completed aria-live="polite">{done}/{QUEST_STEPS.length}</span>
      </div>
      <div className={styles.track} role="progressbar" aria-label={t.title}
        aria-valuemin={0} aria-valuemax={QUEST_STEPS.length} aria-valuenow={done}>
        <span style={{ width: (done / QUEST_STEPS.length * 100) + "%" }} />
      </div>

      <div className={styles.path} role="group" aria-label={t.title}>
        {QUEST_STEPS.map((id, index) => {
          const Icon = stepIcons[id];
          const completed = quest.record.completed[id];
          return <button key={id} type="button" className={styles.step}
            data-support-quest-step={id} data-status={completed ? "done" : id === nextStep ? "next" : "todo"}
            aria-pressed={active === id} aria-controls="support-quest-detail"
            onClick={() => setSelected(id)}>
            <span className={styles.stepBadge} aria-hidden="true">{completed ? <Check size={20} /> : <Icon size={20} />}</span>
            <span className={styles.stepText}><strong>{index + 1}. {t.steps[id].name}</strong>
              <small>{completed ? t.completed : t.todo}</small></span>
            <ChevronDown className={styles.stepArrow} size={17} aria-hidden="true" />
          </button>;
        })}
      </div>

      <div className={styles.details} id="support-quest-detail" data-support-quest-detail>
        <div className={styles.detailHeading}>
          <CircleHelp size={19} aria-hidden="true" />
          <strong>{done === QUEST_STEPS.length ? t.allDone : active === nextStep ? t.next : t.detail}</strong>
        </div>
        <p>{activeInfo.hint}</p>
        <div className={styles.actions}>
          {active === "test" ? (
            <Link className={styles.action} href={testHref} prefetch={false}>
              {activeInfo.action}<ArrowRight size={18} aria-hidden="true" />
            </Link>
          ) : (
            <button type="button" className={styles.action} onClick={() => onStep(active)}>
              {activeInfo.action}<ArrowRight size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        {active === "test" ? <p className={styles.manualNote}>{t.manualTest}</p> : null}
      </div>

      <div className={styles.battery} data-support-quest-budget data-empty={exhausted ? "true" : "false"}>
        <div className={styles.batteryTitle}>
          <strong><Zap size={19} aria-hidden="true" />{t.battery}</strong>
          <span aria-live="polite">{member ? t.unlimited
            : quest.ready ? remaining + "/" + GUEST_VIDEO_LIMIT + " " + t.remaining : t.verifying}</span>
        </div>
        <div className={styles.batterySegments} aria-hidden="true">
          {Array.from({ length: GUEST_VIDEO_LIMIT }, (_, i) =>
            <span key={i} data-charged={member || i < remaining ? "true" : "false"} />)}
        </div>
        <p>{exhausted ? t.out + ". " + t.signInHint : t.preview}</p>
        {quest.access === "unavailable" ? <p className={styles.manualNote}>{t.offline}</p> : null}
        {!member ? <Link className={styles.signIn} href={"/" + accountLocale + "/app/portrait"} prefetch={false}>
          <LockKeyhole size={18} aria-hidden="true" />{t.signIn}<ArrowRight size={18} aria-hidden="true" />
        </Link> : <span className={styles.member}><ShieldCheck size={18} aria-hidden="true" />{t.unlimited}</span>}
      </div>

      <div className={styles.summary}>
        <div><span><BarChart3 size={17} aria-hidden="true" />{t.average}</span><strong>{averageScore}/10</strong><small>{t.ratings}</small></div>
        <div><span><Compass size={17} aria-hidden="true" />{t.focus}</span><strong>{focusLabel}</strong><small>{t.noPenalty}</small></div>
      </div>
      <div className={styles.premium}>
        <Link href={"/" + accountLocale + "/app/settings"} prefetch={false} data-support-quest-premium>
          <Sparkles size={17} aria-hidden="true" />{t.premium}<ArrowRight size={15} aria-hidden="true" />
        </Link>
        <small>{t.premiumHint}</small>
      </div>
    </div>
  );
}
