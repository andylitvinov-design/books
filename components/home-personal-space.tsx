"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, BriefcaseBusiness, ChevronDown, ClipboardList, FileText, LockKeyhole, Sparkles, Target, UserRound, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { appFetch } from "@/lib/app/client-fetch";
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
    label: "My Space", title: "Your personal space", guest: "Your journey can begin here.",
    guestDetail: "Explore free steps or enter your private Cabinet with Google.",
    openCabinet: "Enter my Cabinet", freeTest: "Try a free self-check", freeReview: "Free written review",
    loading: "Checking your private space…", unavailable: "We couldn't open your space right now.",
    retry: "Try again", full: "Open full Cabinet", close: "Close My Space",
    personal: "Personal", professional: "Professional", tests: "My tests", reports: "My reports",
    courses: "My courses", growth: "Development path", practice: "My practice", createCourse: "Create course",
    private: "Private information stays in your Cabinet.", eyebrow: "MY SPACE · YOUR NEXT STEP",
    next: {
      onboarding: { title: "Welcome to your space", detail: "Finish setting up your profile in the Cabinet.", action: "Open my profile" },
      report: { title: "A saved report is ready", detail: "Open your private Cabinet to read it.", action: "View my reports" },
      course: { title: "Continue where you left off", detail: "Your learning can continue at your own pace.", action: "Continue learning" },
      growth: { title: "Choose your next step", detail: "Explore your goals and learning options in your Cabinet.", action: "My development path" },
      tests: { title: "Start with a small step", detail: "Explore a free self-check and save it only if you choose.", action: "Explore my tests" },
    },
  },
  ru: {
    label: "Моё пространство", title: "Моё пространство", guest: "Здесь начинается ваш путь.",
    guestDetail: "Начните бесплатно или войдите в защищённый кабинет через Google.",
    openCabinet: "Войти в кабинет", freeTest: "Пройти бесплатный тест", freeReview: "Бесплатный письменный разбор",
    loading: "Проверяем вход в кабинет…", unavailable: "Сейчас не удалось открыть ваше пространство.",
    retry: "Повторить", full: "Открыть весь кабинет", close: "Закрыть Моё пространство",
    personal: "Личное", professional: "Профессиональное", tests: "Мои тесты", reports: "Мои отчёты",
    courses: "Мои курсы", growth: "Путь развития", practice: "Моя практика", createCourse: "Создать курс",
    private: "Личная информация остаётся в защищённом кабинете.", eyebrow: "МОЁ ПРОСТРАНСТВО · СЛЕДУЮЩИЙ ШАГ",
    next: {
      onboarding: { title: "Добро пожаловать", detail: "Завершите настройку профиля в кабинете.", action: "Мой профиль" },
      report: { title: "Есть готовый отчёт", detail: "Откройте защищённый кабинет, чтобы прочитать его.", action: "Мои отчёты" },
      course: { title: "Продолжить обучение", detail: "Возвращайтесь к урокам в удобном для себя темпе.", action: "Продолжить курс" },
      growth: { title: "Выберите следующий шаг", detail: "Изучите цели развития и подходящие программы.", action: "Мой путь развития" },
      tests: { title: "Начните с малого", detail: "Выберите бесплатный тест; сохранение результатов — по вашему решению.", action: "Мои тесты" },
    },
  },
  es: {
    label: "Mi espacio", title: "Mi espacio personal", guest: "Tu camino puede comenzar aquí.",
    guestDetail: "Explora opciones gratuitas o entra a tu espacio privado con Google.",
    openCabinet: "Entrar a mi espacio", freeTest: "Prueba gratuita", freeReview: "Revisión escrita gratis",
    loading: "Comprobando tu espacio privado…", unavailable: "No se pudo abrir tu espacio ahora.",
    retry: "Reintentar", full: "Abrir gabinete completo", close: "Cerrar Mi espacio",
    personal: "Personal", professional: "Profesional", tests: "Mis pruebas", reports: "Mis informes",
    courses: "Mis cursos", growth: "Desarrollo", practice: "Mi práctica", createCourse: "Crear curso",
    private: "La información privada permanece en tu gabinete.", eyebrow: "MI ESPACIO · SIGUIENTE PASO",
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
  const [status, setStatus] = useState<Status>("idle");
  const [summary, setSummary] = useState<HomeSpaceSummary | null>(null);
  const [open, setOpen] = useState(false);
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
      if (epoch !== epochRef.current || controller.signal.aborted) return;
      setSummary(null);
      setPhase((error as { status?: number }).status === 401 ? "guest" : "error");
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

  const value: Space = { status, summary, open, load, openPanel, closePanel };
  const t = copy[locale];
  const root = cabinetBase(locale);
  const actions = [
    { href: root + "/tests", label: t.tests, Icon: ClipboardList },
    { href: root + "/portrait#personal-reports", label: t.reports, Icon: FileText },
    { href: root + "/course?view=courses", label: t.courses, Icon: BookOpen },
    { href: root + "/portfolio#hh-development-program", label: t.growth, Icon: Target },
    { href: root + "/practice", label: t.practice, Icon: UserRound },
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
              <Link href={root} prefetch={false} onClick={closePanel}>{t.openCabinet} <ArrowRight size={15} /></Link>
            </div>
          : status === "guest" || !summary ? <div className={styles.guest}>
              <h3>{t.guest}</h3><p>{t.guestDetail}</p>
              <Link className={styles.primary} href={root} prefetch={false} onClick={closePanel}>
                <LockKeyhole size={16} aria-hidden="true" />{t.openCabinet}<ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href={"/" + locale + "/client/tests"} prefetch={false} onClick={closePanel}>{t.freeTest}<ArrowRight size={16} /></Link>
              <Link href={"/" + locale + "/services/free-situation-review"} prefetch={false} onClick={closePanel}>{t.freeReview}<ArrowRight size={16} /></Link>
            </div>
          : <div className={styles.signedIn}>
              <section className={styles.nextPanel} aria-label={t.eyebrow}>
                <p className={styles.eyebrow}>{t.eyebrow}</p>
                <h3>{t.next[summary.next].title}</h3>
                <p>{t.next[summary.next].detail}</p>
                <Link className={styles.primary} href={nextHref(summary, locale)} prefetch={false} onClick={closePanel}>
                  {t.next[summary.next].action}<ArrowRight size={16} aria-hidden="true" />
                </Link>
              </section>
              <p className={styles.groupTitle}>{t.personal}</p>
              <nav className={styles.links} aria-label={t.personal}>
                {actions.map(({ href, label, Icon }) =>
                  <Link href={href} key={href} prefetch={false} onClick={closePanel}>
                    <Icon size={18} aria-hidden="true" /><span>{label}</span><ArrowRight size={15} aria-hidden="true" />
                  </Link>)}
              </nav>
              {summary.professional && <section className={styles.professional}>
                <p className={styles.groupTitle}><BriefcaseBusiness size={16} aria-hidden="true" />{t.professional}</p>
                <Link href={root + "/practice?panel=materials&materialTab=courses"} prefetch={false} onClick={closePanel}>
                  {t.createCourse}<ArrowRight size={16} aria-hidden="true" />
                </Link>
              </section>}
              <Link className={styles.full} href={root} prefetch={false} onClick={closePanel}>
                {t.full}<ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>}
        <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true" />{t.private}</p>
      </div>
    </dialog>
  </SpaceContext.Provider>;
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
    <UserRound aria-hidden="true" /><span>{locale === "ru" ? "Моё" : t.label}</span><ChevronDown size={13} aria-hidden="true" />
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
