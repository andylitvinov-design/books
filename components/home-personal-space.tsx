"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, BookOpen, BriefcaseBusiness, ChevronDown, ClipboardList, FileText, GraduationCap, Heart, LockKeyhole, MessageCircle, Sparkles, Target, UserRound, Users, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { appFetch } from "@/lib/app/client-fetch";
import { isNativeHolisticHouse } from "@/lib/native/client";
import { homeSpaceSummary, type HomeSpaceSummary } from "@/lib/home-personal-space.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-personal-space.module.css";

type Status = "idle" | "loading" | "guest" | "ready" | "error";
type Space = {
  status: Status;
  summary: HomeSpaceSummary | null;
  open: boolean;
  load: () => Promise<void>;
  openPanel: () => void;
  closePanel: () => void;
};
const SpaceContext = createContext<Space | null>(null);

const copy = {
  en: {
    label: "My Space", title: "My space", guest: "Choose your path. Start free.",
    guestDetail: "Explore freely, or save your progress in your Cabinet.",
    openCabinet: "Enter my Cabinet", freeTest: "Try a free self-check", freeReview: "Free written review",
    loading: "Checking your private space…", unavailable: "We couldn't open your space right now.",
    retry: "Try again", full: "Open full Cabinet", close: "Close My Space",
    personal: "Personal", professional: "Professional", tests: "My tests", reports: "My reports",
    courses: "My courses", growth: "Development path", practice: "My practice", createCourse: "Create course",
    private: "Private information stays in your Cabinet.", eyebrow: "YOUR NEXT STEP",
    forMe: "For me", forMaster: "For masters", ownHint: "Discover & grow", masterHint: "Share your practice",
    profile: "Create my profile", plan: "My development plan",
    findMaster: "Find a master", trainMaster: "Learn to become a master", offerMaster: "I’m a master · Offer services",
    explore: "Explore Holistic House", energy: "Body & energy", love: "Love & relationships",
    business: "Money & business", coaching: "Coaching sessions", temple: "Temple & Dao insights",
    becomeMaster: "Become a master", publishService: "Publish a service", myPractice: "My practice",
    exploreCourses: "Explore courses", google: "Continue with Google", googleBusy: "Opening Google…",
    googleError: "Google sign-in could not start. Please try again.",
    googleNote: "One private account for both paths.", masterSteps: "Profile first · Review before publication",
    next: {
      onboarding: { title: "Welcome to your space", detail: "Finish setting up your profile in the Cabinet.", action: "Open my profile" },
      report: { title: "A saved report is ready", detail: "Open your private Cabinet to read it.", action: "View my reports" },
      course: { title: "Continue where you left off", detail: "Your learning can continue at your own pace.", action: "Continue learning" },
      growth: { title: "Choose your next step", detail: "Explore your goals and learning options in your Cabinet.", action: "My development path" },
      tests: { title: "Start with a small step", detail: "Explore a free self-check and save it only if you choose.", action: "Explore my tests" },
    },
  },
  ru: {
    label: "Моё пространство", title: "Моё пространство", guest: "Выберите свой путь. Начните бесплатно.",
    guestDetail: "Изучайте возможности или сохраняйте свой прогресс в кабинете.",
    openCabinet: "Войти в кабинет", freeTest: "Пройти бесплатный тест", freeReview: "Бесплатный письменный разбор",
    loading: "Проверяем вход в кабинет…", unavailable: "Сейчас не удалось открыть ваше пространство.",
    retry: "Повторить", full: "Открыть весь кабинет", close: "Закрыть Моё пространство",
    personal: "Личное", professional: "Профессиональное", tests: "Мои тесты", reports: "Мои отчёты",
    courses: "Мои курсы", growth: "Путь развития", practice: "Моя практика", createCourse: "Создать курс",
    private: "Личная информация остаётся в защищённом кабинете.", eyebrow: "ВАШ СЛЕДУЮЩИЙ ШАГ",
    forMe: "Для себя", forMaster: "Для мастера", ownHint: "Познать себя и развиваться", masterHint: "Делиться своей практикой",
    profile: "Создать мой профиль", plan: "Моя программа развития",
    findMaster: "Найти мастера", trainMaster: "Обучиться мастерству", offerMaster: "Я мастер · Предложить услуги",
    explore: "Направления Holistic House", energy: "Тело и энергия", love: "Любовь и отношения",
    business: "Деньги и бизнес", coaching: "Коучинг-сессии", temple: "Храмовые и даосские подсказки",
    becomeMaster: "Стать мастером", publishService: "Разместить услугу", myPractice: "Моя практика",
    exploreCourses: "Посмотреть курсы", google: "Войти через Google", googleBusy: "Открываем Google…",
    googleError: "Не удалось начать вход через Google. Попробуйте ещё раз.",
    googleNote: "Один защищённый кабинет для обоих путей.", masterSteps: "Сначала профиль · Публикация после проверки",
    next: {
      onboarding: { title: "Добро пожаловать", detail: "Завершите настройку профиля в кабинете.", action: "Мой профиль" },
      report: { title: "Есть готовый отчёт", detail: "Откройте защищённый кабинет, чтобы прочитать его.", action: "Мои отчёты" },
      course: { title: "Продолжить обучение", detail: "Возвращайтесь к урокам в удобном для себя темпе.", action: "Продолжить курс" },
      growth: { title: "Выберите следующий шаг", detail: "Изучите цели развития и подходящие программы.", action: "Мой путь развития" },
      tests: { title: "Начните с малого", detail: "Выберите бесплатный тест; сохранение результатов — по вашему решению.", action: "Мои тесты" },
    },
  },
  es: {
    label: "Mi espacio", title: "Mi espacio", guest: "Elige tu camino. Empieza gratis.",
    guestDetail: "Explora gratis o guarda tus avances en tu espacio privado.",
    openCabinet: "Entrar a mi espacio", freeTest: "Prueba gratuita", freeReview: "Revisión escrita gratis",
    loading: "Comprobando tu espacio privado…", unavailable: "No se pudo abrir tu espacio ahora.",
    retry: "Reintentar", full: "Abrir gabinete completo", close: "Cerrar Mi espacio",
    personal: "Personal", professional: "Profesional", tests: "Mis pruebas", reports: "Mis informes",
    courses: "Mis cursos", growth: "Desarrollo", practice: "Mi práctica", createCourse: "Crear curso",
    private: "La información privada permanece en tu gabinete.", eyebrow: "TU SIGUIENTE PASO",
    forMe: "Para mí", forMaster: "Para maestros", ownHint: "Conócete y crece", masterHint: "Comparte tu práctica",
    profile: "Crear mi perfil", plan: "Mi plan de desarrollo",
    findMaster: "Buscar un maestro", trainMaster: "Formarme como maestro", offerMaster: "Ya soy maestro · Ofrecer servicios",
    explore: "Explorar Holistic House", energy: "Cuerpo y energía", love: "Amor y relaciones",
    business: "Dinero y negocios", coaching: "Sesiones de coaching", temple: "Guía del templo y del Dao",
    becomeMaster: "Ser maestro", publishService: "Publicar un servicio", myPractice: "Mi práctica",
    exploreCourses: "Explorar cursos", google: "Continuar con Google", googleBusy: "Abriendo Google…",
    googleError: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
    googleNote: "Una cuenta privada para ambos caminos.", masterSteps: "Primero el perfil · Publicación tras revisión",
    next: {
      onboarding: { title: "Bienvenido a tu espacio", detail: "Completa tu perfil en tu gabinete.", action: "Mi perfil" },
      report: { title: "Tienes un informe guardado", detail: "Ábrelo en tu gabinete privado.", action: "Ver mis informes" },
      course: { title: "Continúa donde lo dejaste", detail: "Sigue aprendiendo a tu ritmo.", action: "Continuar aprendiendo" },
      growth: { title: "Elige tu siguiente paso", detail: "Explora tus metas y opciones de aprendizaje.", action: "Mi desarrollo" },
      tests: { title: "Empieza con algo pequeño", detail: "Haz una prueba gratuita y decide qué guardar.", action: "Explorar mis pruebas" },
    },
  },
} as const;

function cabinetBase(locale: PublicLocale) { return "/" + (locale === "ru" ? "ru" : "en") + "/app"; }
function nextHref(summary: HomeSpaceSummary, locale: PublicLocale) {
  const root = cabinetBase(locale);
  if (summary.next === "onboarding") return root + "/portrait";
  if (summary.next === "report") return root + "/portrait#personal-reports";
  if (summary.next === "course" && summary.courseId) return root + "/course?courseId=" + encodeURIComponent(summary.courseId);
  if (summary.next === "growth") return root + "/portfolio#hh-development-program";
  return root + "/tests";
}

export function HomePersonalSpaceProvider({ locale, children }: { locale: PublicLocale; children: ReactNode }) {
  // The Next.js root layout persists across client-side navigation. Select the
  // live route locale rather than keeping the language of the original page.
  const pathname = usePathname();
  const activeLocale: PublicLocale = pathname === "/" || /^\/en(?:\/|$)/.test(pathname) ? "en"
    : /^\/ru(?:\/|$)/.test(pathname) ? "ru"
    : /^\/es(?:\/|$)/.test(pathname) ? "es" : locale;
  const [status, setStatus] = useState<Status>("idle");
  const [summary, setSummary] = useState<HomeSpaceSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState(false);
  const statusRef = useRef<Status>("idle");
  const epochRef = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const setPhase = useCallback((phase: Status) => { statusRef.current = phase; setStatus(phase); }, []);

  const load = useCallback(async () => {
    if (statusRef.current === "loading" || statusRef.current === "guest" || statusRef.current === "ready") return;
    const epoch = ++epochRef.current;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
      if (epoch === epochRef.current) { setSummary(null); setPhase("error"); }
    }, 10000);
    setPhase("loading");
    try {
      // Existing verified session, existing account RLS, no public account lookup.
      // The portrait view excludes unrelated practice data and full interpretations.
      const bootstrap = await appFetch("bootstrap?view=portrait", undefined, undefined, { signal: controller.signal });
      const first = homeSpaceSummary(bootstrap);
      if (!first) throw new Error("INVALID_PRIVATE_BOOTSTRAP");
      let courseResponse: unknown = null;
      if (first.next !== "report" && first.next !== "onboarding") {
        try {
          courseResponse = await appFetch("course", undefined, undefined, {
            accountId: first.accountId, signal: controller.signal,
          });
        } catch (error: unknown) {
          const failure = error as { status?: number };
          // Do not show stale account details if authentication changed mid-read.
          if (failure.status === 401 || failure.status === 403 || failure.status === 409) throw error;
          if (controller.signal.aborted) return;
        }
      }
      if (epoch !== epochRef.current || controller.signal.aborted) return;
      setSummary(homeSpaceSummary(bootstrap, courseResponse));
      setPhase("ready");
    } catch (error: unknown) {
      if (epoch !== epochRef.current || (controller.signal.aborted && !timedOut)) return;
      setSummary(null);
      setPhase((error as { status?: number }).status === 401 ? "guest" : "error");
    } finally {
      window.clearTimeout(timeout);
    }
  }, [setPhase]);

  useEffect(() => {
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel("hh-app-session");
      channel.onmessage = event => {
        if (event.data !== "signed-out") return;
        epochRef.current += 1;
        requestRef.current?.abort();
        setSummary(null);
        setPhase("guest");
      };
    } catch { /* Never store account identity as a browser fallback. */ }
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      epochRef.current += 1;
      requestRef.current?.abort();
      setSummary(null);
      setPhase("idle");
      void load();
    };
    window.addEventListener("pageshow", restore);
    return () => {
      epochRef.current += 1;
      requestRef.current?.abort();
      channel?.close();
      window.removeEventListener("pageshow", restore);
    };
  }, [load, setPhase]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      triggerRef.current?.focus();
    }
  }, [open]);

  const openPanel = useCallback(() => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
    void load();
  }, [load]);
  const closePanel = useCallback(() => setOpen(false), []);
  // Reuse the existing PKCE OAuth handoff and private Cabinet session.
  const startGoogleSignIn = useCallback(async (destination: "cabinet" | "my-practice" = "cabinet") => {
    if (signingIn) return;
    setSigningIn(true);
    setSignInError(false);
    try {
      const native = isNativeHolisticHouse();
      const result = await appFetch("auth/start", {
        locale: activeLocale === "es" ? "en" : activeLocale,
        continueTo: destination,
        ...(native ? { native: true } : {}),
      });
      if (!result || typeof result.redirectUrl !== "string") throw new Error("OAUTH_URL_MISSING");
      if (native) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: result.redirectUrl });
        setSigningIn(false);
      } else window.location.assign(result.redirectUrl);
    } catch {
      setSigningIn(false);
      setSignInError(true);
    }
  }, [activeLocale, signingIn]);

  const value: Space = { status, summary, open, load, openPanel, closePanel };
  const t = copy[activeLocale];
  const root = cabinetBase(activeLocale);
  const personalActions = [
    { id: "profile", href: root + "/portrait", label: t.profile, Icon: UserRound },
    { id: "plan", href: root + "/portfolio#hh-development-program", label: t.plan, Icon: Target },
    { id: "tests", href: root + "/tests", label: t.tests, Icon: ClipboardList },
    { id: "reports", href: root + "/portrait#personal-reports", label: t.reports, Icon: FileText },
    { id: "courses", href: root + "/course?view=courses", label: t.courses, Icon: BookOpen },
  ];
  const masterActions = [
    { href: "/" + activeLocale + "/masters", label: t.findMaster, Icon: Users },
    { href: "/" + activeLocale + "/pro#profi-learning", label: t.trainMaster, Icon: GraduationCap },
    { href: "/" + activeLocale + "/practice", label: t.myPractice, Icon: UserRound },
    { href: root + "/practice?panel=services", label: t.publishService, Icon: BriefcaseBusiness },
    { href: root + "/practice?panel=materials&materialTab=courses", label: t.createCourse, Icon: GraduationCap },
  ];
  // Public routes are available before sign-in. Account routes remain server-protected.
  const publicTopics = [
    { id: "energy", href: "/" + activeLocale + "/explore/energy", label: t.energy, Icon: Sparkles },
    { id: "love", href: "/" + activeLocale + "/explore/love", label: t.love, Icon: Heart },
    { id: "business", href: "/" + activeLocale + "/explore/business", label: t.business, Icon: BriefcaseBusiness },
  ];
  const publicGuidance = [
    { id: "coaching", href: "/" + activeLocale + "/coaching", label: t.coaching, Icon: MessageCircle },
    { id: "temple", href: "/" + activeLocale + "/temple-support", label: t.temple, Icon: BookOpen },
  ];

  return <SpaceContext.Provider value={value}>
    {children}
    <dialog id="home-personal-space-dialog" ref={dialogRef} className={styles.dialog}
      aria-labelledby="hh-my-space-title" onCancel={event => { event.preventDefault(); closePanel(); }}
      onClick={event => { if (event.target === event.currentTarget) closePanel(); }}>
      <div className={styles.sheet}>
        <header className={styles.sheetHeader}>
          <span className={styles.sheetMark}><Sparkles size={20} aria-hidden="true" /></span>
          <div className={styles.sheetHeading}>
            <p>HOLISTIC HOUSE</p>
            <h2 id="hh-my-space-title">{t.title}</h2>
          </div>
          <button type="button" className={styles.close} ref={closeRef} onClick={closePanel}
            aria-label={t.close}><X size={21} aria-hidden="true" /></button>
        </header>
        {status === "idle" || status === "loading" ? <p className={styles.state} role="status">{t.loading}</p>
          : status === "error" ? <div className={styles.state}>
              <p role="status">{t.unavailable}</p>
              <button type="button" className={styles.retry} onClick={() => void load()}>{t.retry}</button>
              <Link href={root} prefetch={false} onClick={closePanel}>{t.openCabinet}<ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
          : status === "guest" || !summary ? <div className={styles.guest}>
              <p className={styles.guestLead}>{t.guest}</p>
              <button type="button" className={styles.googleButton} disabled={signingIn}
                onClick={() => void startGoogleSignIn()}>
                <span className={styles.googleMark} aria-hidden="true">G</span>
                <span>{signingIn ? t.googleBusy : t.google}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              {signInError && <p className={styles.authError} role="alert">{t.googleError}</p>}
              <div className={styles.pathGrid}>
                <section className={styles.pathCard} aria-labelledby="hh-space-personal">
                  <header className={styles.pathHeading}>
                    <Heart size={18} aria-hidden="true" />
                    <h3 id="hh-space-personal">{t.forMe}</h3>
                  </header>
                  <p className={styles.pathHint}>{t.ownHint}</p>
                  <nav className={styles.pathLinks} aria-label={t.forMe}>
                    <Link href={root + "/portrait"} data-space-link="profile" prefetch={false} onClick={closePanel}>
                      <UserRound size={16} aria-hidden="true" /><span>{t.profile}</span><ArrowRight size={14} aria-hidden="true" />
                    </Link>
                    <Link href={root + "/portfolio#hh-development-program"} data-space-link="plan" prefetch={false} onClick={closePanel}>
                      <Target size={16} aria-hidden="true" /><span>{t.plan}</span><ArrowRight size={14} aria-hidden="true" />
                    </Link>
                    <Link href={"/" + activeLocale + "/client/tests"} prefetch={false} onClick={closePanel}>
                      <span>{t.freeTest}</span><ArrowRight size={14} aria-hidden="true" />
                    </Link>
                    <Link href={"/" + activeLocale + "/academy"} prefetch={false} onClick={closePanel}>
                      <span>{t.exploreCourses}</span><ArrowRight size={14} aria-hidden="true" />
                    </Link>
                    <Link href={"/" + activeLocale + "/services/free-situation-review"} prefetch={false} onClick={closePanel}>
                      <span>{t.freeReview}</span><ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </nav>
                </section>
                <section className={[styles.pathCard, styles.pathMaster].join(" ")} aria-labelledby="hh-space-master">
                  <header className={styles.pathHeading}>
                    <BriefcaseBusiness size={18} aria-hidden="true" />
                    <h3 id="hh-space-master">{t.forMaster}</h3>
                  </header>
                  <p className={styles.pathHint}>{t.masterHint}</p>
                  <nav className={styles.pathLinks} aria-label={t.forMaster}>
                    <Link href={"/" + activeLocale + "/masters"} prefetch={false} onClick={closePanel}>
                      <Users size={16} aria-hidden="true" /><span>{t.findMaster}</span><ArrowRight size={14} aria-hidden="true" />
                    </Link>
                    <Link href={"/" + activeLocale + "/pro#profi-learning"} prefetch={false} onClick={closePanel}>
                      <GraduationCap size={16} aria-hidden="true" /><span>{t.trainMaster}</span><ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </nav>
                  <p className={styles.masterNote}>{t.masterSteps}</p>
                  <Link className={styles.masterAction} href={"/" + activeLocale + "/practice"} prefetch={false} onClick={closePanel}>
                    {t.offerMaster}<ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </section>
              </div>
              <p className={styles.helper}>{t.googleNote}</p>
            </div>
          : <div className={styles.signedIn}>
              <section className={styles.nextPanel} aria-label={t.eyebrow}>
                <div>
                  <p className={styles.eyebrow}>{t.eyebrow}</p>
                  <h3>{t.next[summary.next].title}</h3>
                  <p>{t.next[summary.next].detail}</p>
                </div>
                <Link className={styles.nextAction} href={nextHref(summary, activeLocale)} prefetch={false} onClick={closePanel}>
                  {t.next[summary.next].action}<ArrowRight size={15} aria-hidden="true" />
                </Link>
              </section>
              <div className={styles.pathGrid}>
                <section className={styles.pathCard} aria-labelledby="hh-space-personal">
                  <header className={styles.pathHeading}>
                    <Heart size={18} aria-hidden="true" />
                    <h3 id="hh-space-personal">{t.forMe}</h3>
                  </header>
                  <p className={styles.pathHint}>{t.ownHint}</p>
                  <nav className={styles.pathLinks} aria-label={t.forMe}>
                    {personalActions.map(({ id, href, label, Icon }) =>
                      <Link href={href} key={id} data-space-link={id} prefetch={false} onClick={closePanel}>
                        <Icon size={16} aria-hidden="true" /><span>{label}</span>
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>)}
                  </nav>
                </section>
                <section className={[styles.pathCard, styles.pathMaster].join(" ")} aria-labelledby="hh-space-master">
                  <header className={styles.pathHeading}>
                    <BriefcaseBusiness size={18} aria-hidden="true" />
                    <h3 id="hh-space-master">{t.forMaster}</h3>
                  </header>
                  <p className={styles.pathHint}>{t.masterHint}</p>
                  {summary.professional ? <nav className={styles.pathLinks} aria-label={t.forMaster}>
                    {masterActions.map(({ href, label, Icon }) =>
                      <Link href={href} key={href} prefetch={false} onClick={closePanel}>
                        <Icon size={16} aria-hidden="true" /><span>{label}</span>
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>)}
                  </nav> : <>
                    <nav className={styles.pathLinks} aria-label={t.forMaster}>
                      <Link href={"/" + activeLocale + "/masters"} prefetch={false} onClick={closePanel}>
                        <Users size={16} aria-hidden="true" /><span>{t.findMaster}</span><ArrowRight size={14} aria-hidden="true" />
                      </Link>
                      <Link href={"/" + activeLocale + "/pro#profi-learning"} prefetch={false} onClick={closePanel}>
                        <GraduationCap size={16} aria-hidden="true" /><span>{t.trainMaster}</span><ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </nav>
                    <p className={styles.masterNote}>{t.masterSteps}</p>
                    <Link className={styles.masterAction} href={"/" + activeLocale + "/practice"} prefetch={false} onClick={closePanel}>
                      {t.offerMaster}<ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </>}
                </section>
              </div>
              <Link className={styles.full} href={root} prefetch={false} onClick={closePanel}>
                {t.full}<ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>}
        {(status === "guest" || (status === "ready" && summary)) && <section className={styles.explorePanel}
          aria-labelledby="hh-space-explore-title">
          <h3 id="hh-space-explore-title" className={styles.exploreHeading}>{t.explore}</h3>
          <nav className={styles.exploreTopics} aria-label={t.explore}>
            {publicTopics.map(({ id, href, label, Icon }) => <Link key={id} href={href}
              data-space-topic={id} prefetch={false} onClick={closePanel}>
              <Icon size={16} aria-hidden="true" /><span>{label}</span>
            </Link>)}
          </nav>
          <nav className={styles.exploreGuides} aria-label={t.coaching + " · " + t.temple}>
            {publicGuidance.map(({ id, href, label, Icon }) => <Link key={id} href={href}
              data-space-guide={id} prefetch={false} onClick={closePanel}>
              <Icon size={16} aria-hidden="true" /><span>{label}</span><ArrowRight size={13} aria-hidden="true" />
            </Link>)}
          </nav>
        </section>}
        <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true" />{t.private}</p>
      </div>
    </dialog>
  </SpaceContext.Provider>;
}

export function useHomePersonalSpace() {
  return useContext(SpaceContext);
}

export function HomePersonalSpaceNavEntry({ locale, href }: { locale: PublicLocale; href: string }) {
  const space = useContext(SpaceContext);
  const t = copy[locale];
  if (!space) return <Link className="site-cabinet-entry" href={href} prefetch={false}>
    <UserRound aria-hidden="true" /><span>{t.label}</span>
  </Link>;
  return <button type="button" className="site-cabinet-entry" data-nav-item="cabinet"
    aria-haspopup="dialog" aria-controls="home-personal-space-dialog" aria-expanded={space.open}
    onClick={space.openPanel} aria-label={t.label}>
    <UserRound aria-hidden="true" /><span className="site-cabinet-entry__full">{t.label}</span><span className="site-cabinet-entry__compact">{locale === "ru" ? "Моё" : t.label}</span><ChevronDown size={13} aria-hidden="true" />
  </button>;
}

export function HomePersonalSpaceCard({ locale }: { locale: PublicLocale }) {
  const space = useContext(SpaceContext);
  const sentinel = useRef<HTMLDivElement>(null);
  const load = space?.load;
  useEffect(() => {
    const element = sentinel.current;
    if (!load || !element) return;
    if (!("IntersectionObserver" in window)) { void load(); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { void load(); observer.disconnect(); }
    }, { rootMargin: "260px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [load]);

  if (!space) return null;
  const { status, summary } = space;
  const t = copy[locale];
  return <>
    <div className={styles.sentinel} ref={sentinel} aria-hidden="true" />
    {status === "ready" && summary && <section className={styles.card}
      data-home-personal-space="ready" aria-labelledby="hh-my-space-card-title">
      <div className={styles.cardPhoto}>
        <Image unoptimized src="/images/holistic-house/reiki-approved-sunrise-v3.webp"
          width={220} height={260} alt="" loading="lazy" />
      </div>
      <div className={styles.cardBody}>
        <p className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" />{t.eyebrow}</p>
        <h2 id="hh-my-space-card-title">{t.next[summary.next].title}</h2>
        <p>{t.next[summary.next].detail}</p>
        <div className={styles.cardActions}>
          <Link className={styles.primary} href={nextHref(summary, locale)} prefetch={false}>
            {t.next[summary.next].action}<ArrowRight size={16} aria-hidden="true" />
          </Link>
          <button type="button" onClick={space.openPanel}>{t.full}<ArrowRight size={15} aria-hidden="true" /></button>
        </div>
      </div>
    </section>}
  </>;
}
