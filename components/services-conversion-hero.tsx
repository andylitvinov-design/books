"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, MonitorPlay } from "lucide-react";
import { StaticPortrait } from "@/components/static-portrait";
import { ServicesHeroQuickRequest } from "@/components/services-hero-quick-request";
import { matchingServicesCount, serviceTopics, useServicesExplorer, type ServiceTopic } from "@/components/services-explorer-state";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-conversion-hero.module.css";

const slides: readonly { kind: Exclude<ServiceTopic, "all">; image: string; position: string }[] = [
  { kind: "personal", image: "/images/holistic-house/hero-olive-incense.webp", position: "center" },
  { kind: "relationships", image: "/images/holistic-house/video-posters/constellations-en-v1.webp", position: "center" },
  { kind: "business", image: "/images/holistic-house/andy-about.png", position: "center 30%" },
  { kind: "reiki", image: "/images/holistic-house/reiki-approved-sunrise-v3.webp", position: "center" },
  { kind: "free", image: "/academy/reiki-yggdrasil/source/eastern-tradition.png", position: "center" },
];

const copy = {
  en: {
    heading: "Personal guidance for relationships, work and life decisions",
    eyebrow: "HOLISTIC HOUSE · WAYS TO WORK TOGETHER",
    explore: "View services",
    quickRequest: "Request a session",
    previous: "Previous service type",
    next: "Next service type",
    modeTitle: "Where would you like to meet?",
    online: "Online",
    toronto: "Toronto · In person",
    filterTitle: "What kind of support are you looking for?",
    filterLead: "Choose a theme to see the services that fit.",
    topics: { all: "All services", personal: "Personal growth", relationships: "Relationships", business: "Business & career", reiki: "Reiki & energy", free: "Start free" },
    results: "matching services",
    oneResult: "matching service",
    noResults: "There are no in-person Toronto offers in this category. Try Online or a different topic.",
    switchOnline: "See online options",
    reassurance: "Session times and conditions are confirmed before booking or payment.",
    freeCta: "Start free · 3 options",
    paidCta: "Ask about a personal session · from €50",
    slides: {
      personal: { eyebrow: "PERSONAL SUPPORT", title: "Personal growth & emotional clarity", lead: "Guided imagery, meaningful questions and space to explore your next step." },
      relationships: { eyebrow: "RELATIONSHIPS", title: "Relationships & constellations", lead: "Explore repeated patterns, boundaries and connections in a personal session." },
      business: { eyebrow: "BUSINESS & CAREER", title: "Business strategy & career", lead: "Find clarity about your project, work, priorities and the next practical move." },
      reiki: { eyebrow: "REIKI & ENERGY", title: "Reiki & energy practices", lead: "Explore available remote energy-support sessions and their conditions." },
      free: { eyebrow: "FREE FIRST STEPS", title: "Free tests & self-discovery", lead: "Start with a written review, wellbeing self-checks or a symbolic Wu Xing profile." },
    },
  },
  ru: {
    heading: "Личная работа с вашим вопросом: отношения, работа и решения",
    eyebrow: "HOLISTIC HOUSE · ВЫБЕРИТЕ СВОЙ ФОРМАТ",
    explore: "Просмотреть услуги",
    quickRequest: "Быстрая запись",
    previous: "Предыдущий тип услуг",
    next: "Следующий тип услуг",
    modeTitle: "Как вам удобно встретиться?",
    online: "Онлайн",
    toronto: "Торонто · Лично",
    filterTitle: "Какой тип услуг вам подходит?",
    filterLead: "Выберите тему — ниже останутся подходящие предложения.",
    topics: { all: "Все услуги", personal: "Личное развитие", relationships: "Отношения", business: "Бизнес и карьера", reiki: "Рейки и энергия", free: "Бесплатно" },
    results: "подходящих услуг",
    oneResult: "подходящая услуга",
    noResults: "Для этой темы пока нет очных предложений в Торонто. Выберите онлайн или другую тему.",
    switchOnline: "Показать онлайн",
    reassurance: "Время встречи и условия подтверждаются до записи и оплаты.",
    freeCta: "Три бесплатных варианта",
    paidCta: "Запросить личную сессию · от €50",
    slides: {
      personal: { eyebrow: "ЛИЧНАЯ РАБОТА", title: "Личное развитие и внутренняя опора", lead: "Образная работа, важные вопросы и бережное исследование своей ситуации." },
      relationships: { eyebrow: "ОТНОШЕНИЯ", title: "Отношения и расстановки", lead: "Исследуйте повторяющиеся сценарии, границы и связь с другими людьми." },
      business: { eyebrow: "БИЗНЕС И КАРЬЕРА", title: "Бизнес-стратегия и карьера", lead: "Проясните цели, препятствия и следующий практический шаг." },
      reiki: { eyebrow: "РЕЙКИ И ЭНЕРГИЯ", title: "Рейки и энергетические практики", lead: "Посмотрите доступные форматы дистанционных сеансов и условия." },
      free: { eyebrow: "НАЧНИТЕ БЕСПЛАТНО", title: "Тесты и самопознание", lead: "Письменный разбор, тесты самонаблюдения и символический профиль У-Син." },
    },
  },
  es: {
    heading: "Acompañamiento personal para relaciones, trabajo y decisiones",
    eyebrow: "HOLISTIC HOUSE · FORMAS DE TRABAJAR JUNTOS",
    explore: "Ver servicios",
    quickRequest: "Solicitar una sesión",
    previous: "Tipo de servicio anterior",
    next: "Siguiente tipo de servicio",
    modeTitle: "¿Dónde prefieres reunirnos?",
    online: "En línea",
    toronto: "Toronto · Presencial",
    filterTitle: "¿Qué tipo de servicio buscas?",
    filterLead: "Elige un tema y descubre las opciones adecuadas.",
    topics: { all: "Todos", personal: "Crecimiento personal", relationships: "Relaciones", business: "Negocios y carrera", reiki: "Reiki y energía", free: "Empezar gratis" },
    results: "servicios disponibles",
    oneResult: "servicio disponible",
    noResults: "No hay ofertas presenciales en Toronto para este tema. Prueba en línea u otro tema.",
    switchOnline: "Ver opciones en línea",
    reassurance: "La hora y las condiciones se confirman antes de reservar o pagar.",
    freeCta: "Tres opciones gratuitas",
    paidCta: "Solicitar sesión personal · desde €50",
    slides: {
      personal: { eyebrow: "ACOMPAÑAMIENTO PERSONAL", title: "Crecimiento personal y claridad", lead: "Imágenes guiadas, preguntas importantes y espacio para tu próximo paso." },
      relationships: { eyebrow: "RELACIONES", title: "Relaciones y constelaciones", lead: "Explora patrones, límites y conexiones en una sesión personal." },
      business: { eyebrow: "NEGOCIOS Y CARRERA", title: "Estrategia empresarial y carrera", lead: "Aclara tus proyectos, decisiones y próximos pasos prácticos." },
      reiki: { eyebrow: "REIKI Y ENERGÍA", title: "Reiki y prácticas energéticas", lead: "Explora las sesiones disponibles de apoyo a distancia y sus condiciones." },
      free: { eyebrow: "PRIMEROS PASOS GRATUITOS", title: "Pruebas y autoconocimiento", lead: "Revisión escrita, autoevaluaciones y un perfil simbólico Wu Xing." },
    },
  },
} as const;

export function ServicesConversionHero({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const { mode, setMode, topic, setTopic } = useServicesExplorer();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [manual, setManual] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const slide = slides[index];
  const words = t.slides[slide.kind];
  const count = matchingServicesCount(mode, topic);

  useEffect(() => {
    if (paused || manual || requestOpen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndex(current => (current + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [paused, manual, requestOpen]);

  function navigate(direction: number) {
    setManual(true);
    setRequestOpen(false);
    const next = (index + direction + slides.length) % slides.length;
    setIndex(next);
    setTopic(slides[next].kind);
    if (slides[next].kind === "reiki" || slides[next].kind === "free") setMode("online");
  }

  function chooseTopic(kind: ServiceTopic) {
    setManual(true);
    setRequestOpen(false);
    setTopic(kind);
    if (kind !== "all") {
      const position = slides.findIndex(item => item.kind === kind);
      if (position >= 0) setIndex(position);
      if (kind === "reiki" || kind === "free") setMode("online");
    }
  }

  function explore(kind: Exclude<ServiceTopic, "all">) {
    setManual(true);
    setRequestOpen(false);
    setTopic(kind);
    if (kind === "reiki" || kind === "free") setMode("online");
    window.requestAnimationFrame(() => {
      const target = document.getElementById("service-results");
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  return (
    <section className={styles.hero} aria-label={t.heading} data-services-showcase-hero>
      <div className={styles.slider} data-request-open={requestOpen} role="region" aria-roledescription="carousel" aria-label={t.eyebrow}
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
        onTouchStart={() => setManual(true)}>
        <div key={slide.kind} className={styles.slideMedia} style={{ objectPosition: slide.position }}>
          {slide.image === "/images/holistic-house/andy-about.png" ? (
            <StaticPortrait src="/images/holistic-house/andy-about.png" alt="" fill sizes="(max-width: 760px) 100vw, 1240px" className={styles.image} style={{ objectPosition: slide.position }} />
          ) : (
            <Image src={slide.image} alt="" fill priority={index === 0 && !manual}
              unoptimized sizes="(max-width: 760px) 100vw, 1240px" className={styles.image} style={{ objectPosition: slide.position }} />
          )}
        </div>
        <div className={styles.gradient} aria-hidden="true" />
        {requestOpen && slide.kind !== "free" ? (
          <ServicesHeroQuickRequest key={slide.kind} locale={locale} service={words.title}
            mode={slide.kind === "reiki" ? "online" : mode} onClose={() => setRequestOpen(false)} />
        ) : (
          <div className={styles.slideCopy} data-services-slide={slide.kind}>
            <p className={styles.eyebrow}>{words.eyebrow}</p>
            <h1 id="services-conversion-title">{words.title}</h1>
            <p className={styles.slideLead}>{words.lead}</p>
            <div className={styles.slideActions}>
              {slide.kind !== "free" ? (
                <button type="button" className={styles.requestButton} data-services-slide-request={slide.kind}
                  onClick={() => { setManual(true); setRequestOpen(true); }}>
                  {t.quickRequest}<ArrowRight size={18} aria-hidden="true" />
                </button>
              ) : null}
              <button type="button" className={styles.viewButton} onClick={() => explore(slide.kind)}
                data-services-slide-action={slide.kind}>
                {t.explore}<ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        <div className={styles.controls}>
          <div className={styles.dots} role="group" aria-label={t.eyebrow}>
            {slides.map((item, position) => (
              <button type="button" key={item.kind} className={position === index ? styles.dotActive : styles.dot}
                aria-label={t.slides[item.kind].title} aria-current={position === index ? "true" : undefined}
                data-services-slide-dot={item.kind} onClick={() => { setManual(true); setRequestOpen(false); setIndex(position); setTopic(item.kind); if (item.kind === "reiki" || item.kind === "free") setMode("online"); }} />
            ))}
          </div>
          <div className={styles.arrows}>
            <button type="button" onClick={() => navigate(-1)} aria-label={t.previous}><ChevronLeft size={21} /></button>
            <button type="button" onClick={() => navigate(1)} aria-label={t.next}><ChevronRight size={21} /></button>
          </div>
        </div>
      </div>

      <div className={styles.finder} data-services-category-filter>
        <div className={styles.filterHeader}>
          <div>
            <h2>{t.filterTitle}</h2>
            <p>{t.filterLead}</p>
          </div>
        </div>
        <div className={styles.topicList} role="group" aria-label={t.filterTitle}>
          {serviceTopics.map(kind => (
            <button type="button" key={kind} aria-pressed={topic === kind} data-services-kind={kind}
              className={topic === kind ? styles.topicActive : styles.topic}
              onClick={() => chooseTopic(kind)}>{t.topics[kind]}</button>
          ))}
        </div>
        <div className={styles.finderTop}>
          <div>
            <p className={styles.finderEyebrow}>{t.modeTitle}</p>
            <div className={styles.modeToggle} role="group" aria-label={t.modeTitle}>
              <button type="button" aria-pressed={mode === "online"} className={mode === "online" ? styles.modeActive : ""}
                data-services-mode="online" onClick={() => setMode("online")}>
                <MonitorPlay size={17} aria-hidden="true" />{t.online}
              </button>
              <button type="button" aria-pressed={mode === "toronto"} className={mode === "toronto" ? styles.modeActive : ""}
                data-services-mode="toronto" onClick={() => setMode("toronto")}>
                <MapPin size={17} aria-hidden="true" />{t.toronto}
              </button>
            </div>
          </div>
          <p className={styles.reassurance}>{t.reassurance}</p>
        </div>
        <div className={styles.finderFooter}>
          <p role="status" aria-live="polite" data-services-match-count>
            <strong>{count}</strong> {count === 1 ? t.oneResult : t.results} · {mode === "online" ? t.online : t.toronto}
          </p>
          <div className={styles.directPaths}>
            <Link className={styles.cta} href="#free-insights" data-service-hero-cta="free" onClick={() => { setMode("online"); setTopic("free"); }}>
              {t.freeCta}<ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link className={styles.paidLink} href="#consultation" data-service-hero-cta="paid">
              {t.paidCta}<ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
        {count === 0 ? <div className={styles.empty} data-services-empty>
          <p>{t.noResults}</p>
          <button type="button" onClick={() => setMode("online")}>{t.switchOnline}<ArrowRight size={16} aria-hidden="true" /></button>
        </div> : null}
      </div>
    </section>
  );
}
