"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { StaticPortrait } from "@/components/static-portrait";
import type { PublicLocale } from "@/lib/public-locales";

// The homepage reuses the exact photographic carousel layout already approved
// for Services, but its slides link to real sections instead of changing filters.
import styles from "./services-conversion-hero.module.css";

const slides = [
  { key: "services", href: "/services", image: "/images/holistic-house/hero-olive-incense.webp", position: "center" },
  { key: "tests", href: "/client/tests", image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp", position: "center" },
  { key: "academy", href: "/academy", image: "/images/holistic-house/reiki-approved-sunrise-v3.webp", position: "center" },
  { key: "business", href: "/explore/business", image: "/images/holistic-house/andy-about.png", position: "center 30%" },
  { key: "ideas", href: "/books", image: "/images/holistic-house/books-library.webp", position: "center" },
  { key: "cabinet", href: "/app", image: "/academy/reiki-yggdrasil/source/program-overview.jpg", position: "center" },
] as const;

// Keep all six slides paired with their named category above the photograph.
// Home remains a page link; Cabinet is a slide category as well as a header entry.
const navKeys = ["home", "tests", "services", "academy", "business", "ideas", "cabinet"] as const;

const copy = {
  en: {
    navigationLabel: "Explore site sections",
    nav: { home: "Home", tests: "Tests", services: "Services", academy: "Academy", business: "Business", ideas: "Ideas", cabinet: "Cabinet" },
    region: "Explore Holistic House",
    previous: "Previous section",
    next: "Next section",
    choose: "Choose a site section",
    slides: {
      services: { eyebrow: "SERVICES · PERSONAL CONSULTATIONS", title: "Personal sessions for life's questions", lead: "Explore relationships, stress or difficult decisions in a one-to-one session in Toronto or online.", action: "Request a consultation · from €50" },
      tests: { eyebrow: "TESTS · FREE SELF-CHECKS", title: "Free tests to understand yourself", lead: "Explore stress, strengths and personal resources. See a report with insights for your next step.", action: "Take free tests" },
      academy: { eyebrow: "ACADEMY · COURSES & PRACTICES", title: "Courses, lessons and meditations", lead: "Choose Reiki and personal-growth courses with guided exercises and lessons you can return to.", action: "Find a course" },
      business: { eyebrow: "BUSINESS · COACHING & STRATEGY", title: "Support for work and business decisions", lead: "Clarify goals and business challenges through coaching, strategy and practical next steps.", action: "View business services" },
      ideas: { eyebrow: "IDEAS · QUESTIONS & BOOKS", title: "Fresh perspectives on your question", lead: "Ask a question for an I Ching reflection or aphorisms, and explore books for more inspiration.", action: "Explore Ideas" },
      cabinet: { eyebrow: "PERSONAL CABINET · YOUR SPACE", title: "Your tests, courses & progress", lead: "Save test reports, continue courses, revisit recommendations and follow your development in one place.", action: "Open my Cabinet" },
    },
  },
  ru: {
    navigationLabel: "Разделы сайта",
    nav: { home: "Главная", tests: "Тесты", services: "Услуги", academy: "Академия", business: "Бизнес", ideas: "Идеи", cabinet: "Кабинет" },
    region: "Разделы Holistic House",
    previous: "Предыдущий раздел",
    next: "Следующий раздел",
    choose: "Выберите раздел сайта",
    slides: {
      services: { eyebrow: "УСЛУГИ · ЛИЧНЫЕ КОНСУЛЬТАЦИИ", title: "Личные сессии по важным вопросам", lead: "Отношения, стресс или сложный выбор: исследуйте свой запрос на встрече в Торонто или онлайн.", action: "Запросить консультацию · от €50" },
      tests: { eyebrow: "ТЕСТЫ · БЕСПЛАТНО", title: "Узнайте свои сильные стороны", lead: "Пройдите тесты на стресс и личные ресурсы. Получите отчёт с результатами и выводами.", action: "Пройти тесты" },
      academy: { eyebrow: "АКАДЕМИЯ · КУРСЫ И ПРАКТИКИ", title: "Курсы, уроки и медитации", lead: "Осваивайте Рейки и практики развития через уроки, упражнения и медитации в своём темпе.", action: "Выбрать курс" },
      business: { eyebrow: "БИЗНЕС · КОУЧИНГ И СТРАТЕГИЯ", title: "Поддержка в работе и бизнесе", lead: "Разберите цели, трудности проекта и варианты решений. Наметьте практический следующий шаг.", action: "Услуги для бизнеса" },
      ideas: { eyebrow: "ИДЕИ · ВОПРОСЫ И КНИГИ", title: "Подсказки для вашего вопроса", lead: "Задайте вопрос, получите афоризмы или символ Книги Перемен. Найдите новые идеи в книгах.", action: "Открыть Идеи" },
      cabinet: { eyebrow: "ЛИЧНЫЙ КАБИНЕТ · МОЁ ПРОСТРАНСТВО", title: "Ваши тесты, курсы и прогресс", lead: "Сохраняйте отчёты, продолжайте курсы, возвращайтесь к рекомендациям и следите за динамикой.", action: "Перейти в кабинет" },
    },
  },
  es: {
    navigationLabel: "Secciones del sitio",
    nav: { home: "Inicio", tests: "Pruebas", services: "Servicios", academy: "Academia", business: "Negocios", ideas: "Ideas", cabinet: "Mi espacio" },
    region: "Explora Holistic House",
    previous: "Sección anterior",
    next: "Sección siguiente",
    choose: "Elige una sección del sitio",
    slides: {
      services: { eyebrow: "SERVICIOS · CONSULTAS PERSONALES", title: "Sesiones para tus preguntas importantes", lead: "Explora relaciones, estrés y decisiones difíciles en una sesión personal en Toronto o en línea.", action: "Solicitar una consulta · desde €50" },
      tests: { eyebrow: "PRUEBAS · GRATIS", title: "Pruebas gratis para conocerte mejor", lead: "Explora estrés, fortalezas y recursos personales. Consulta un informe con ideas para tu próximo paso.", action: "Hacer pruebas gratis" },
      academy: { eyebrow: "ACADEMIA · CURSOS Y PRÁCTICAS", title: "Cursos, lecciones y meditaciones", lead: "Descubre Reiki y prácticas de desarrollo con lecciones, ejercicios y meditaciones a tu ritmo.", action: "Elegir un curso" },
      business: { eyebrow: "NEGOCIOS · COACHING Y ESTRATEGIA", title: "Apoyo para el trabajo y tus proyectos", lead: "Aclara objetivos y desafíos del negocio con orientación y pasos prácticos para avanzar.", action: "Ver servicios de negocios" },
      ideas: { eyebrow: "IDEAS · PREGUNTAS Y LIBROS", title: "Nuevas ideas para tu pregunta", lead: "Haz una pregunta para recibir aforismos o un símbolo del I Ching y explora libros para reflexionar.", action: "Explorar Ideas" },
      cabinet: { eyebrow: "MI ESPACIO · GABINETE PERSONAL", title: "Tus pruebas, cursos y avances", lead: "Guarda informes, continúa tus cursos, revisa recomendaciones y sigue tu progreso en un solo lugar.", action: "Abrir mi espacio" },
    },
  },
} as const;

export function HomeSectionCarousel({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // A manual change resets the seven-second clock; it must not disable autoplay.
  const [interactionVersion, setInteractionVersion] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const navScroller = useRef<HTMLDivElement | null>(null);
  const slide = slides[index];
  const words = t.slides[slide.key];
  // The Spanish public entry is localized; the full private app currently
  // uses the English route, so do not direct guests to a missing /es/app page.
  const href = slide.key === "services" ? `/${locale}/services#consultation`
    : slide.key === "cabinet" && locale === "es" ? "/en/app" : "/" + locale + slide.href;

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setIndex(current => (current + 1) % slides.length);
      }
    }, 7000);
    return () => window.clearInterval(timer);
  }, [paused, interactionVersion]);

  // The seventh, "Cabinet", label may be outside the 320px navigation viewport.
  // Scroll only the horizontal label strip, never the document itself.
  useEffect(() => {
    const scroller = navScroller.current;
    const active = scroller?.querySelector<HTMLElement>(`[data-home-nav-section="${slide.key}"]`);
    if (!scroller || !active || scroller.scrollWidth <= scroller.clientWidth) return;
    const item = active.getBoundingClientRect();
    const strip = scroller.getBoundingClientRect();
    const left = scroller.scrollLeft + item.left - strip.left - (scroller.clientWidth - item.width) / 2;
    scroller.scrollTo({
      left: Math.max(0, left),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [index, locale]);

  function navigate(direction: number) {
    setInteractionVersion(version => version + 1);
    setIndex(current => (current + direction + slides.length) % slides.length);
  }

  function endSwipe(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || event.changedTouches.length === 0) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    // Respect vertical page scroll; swipe only on deliberate horizontal movement.
    if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.2) navigate(dx < 0 ? 1 : -1);
  }

  return (
    <section className={styles.hero} data-home-section-carousel aria-label={t.region}>
      <div
        className={styles.slider}
        role="region"
        aria-roledescription="carousel"
        aria-label={t.region}
        onMouseEnter={() => {
          // Mobile Safari may synthesize mouse events after tapping.
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) setPaused(true);
        }}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={event => {
          // Pause for keyboard focus, not for a touch-focused dot or arrow.
          if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) setPaused(true);
        }}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
        onTouchStart={event => {
          touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }}
        onTouchEnd={endSwipe}
        onTouchCancel={() => { touchStart.current = null; }}
      >
        <div key={slide.key} className={styles.slideMedia}>
          {slide.key === "business" ? (
            <StaticPortrait src="/images/holistic-house/andy-about.png" alt="" fill sizes="(max-width: 760px) 100vw, 1240px"
              className={styles.image} style={{ objectPosition: slide.position }} />
          ) : (
            <Image src={slide.image} alt="" fill unoptimized priority={index === 0}
              sizes="(max-width: 760px) 100vw, 1240px"
              className={styles.image} style={{ objectPosition: slide.position }} />
          )}
        </div>
        <div className={styles.gradient} aria-hidden="true" />
        <nav className={styles.sectionNav} aria-label={t.navigationLabel} data-home-hero-nav="true">
          <div className={styles.sectionNavScroller} ref={navScroller}>
            {navKeys.map(key => {
              const target = key === "home" ? undefined : slides.find(item => item.key === key);
              if (key !== "home" && !target) return null;
              return (
                <Link
                  key={key}
                  className={styles.sectionNavLink}
                  href={key === "cabinet" && locale === "es" ? "/en/app" : target ? `/${locale}${target.href}` : locale === "en" ? "/" : `/${locale}`}
                  aria-current={key === slide.key ? "true" : undefined}
                  data-home-nav-active={key === slide.key ? "true" : "false"}
                  prefetch={false}
                  data-home-nav-section={key}
                >
                  {t.nav[key]}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className={styles.slideCopy} data-home-slide={slide.key}>
          <p className={styles.eyebrow}>{words.eyebrow}</p>
          <h2 id="home-section-slide-title">{words.title}</h2>
          <p className={styles.slideLead}>{words.lead}</p>
          <Link className={styles.viewButton} href={href} prefetch={false} data-home-slide-action={slide.key}
            data-home-first-screen-cta={slide.key === "services" ? "paid" : undefined}>
            {words.action}<ArrowRight size={19} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.controls}>
          <div className={styles.dots} role="group" aria-label={t.choose}>
            {slides.map((item, position) => (
              <button type="button" key={item.key}
                className={position === index ? styles.dotActive : styles.dot}
                aria-label={t.slides[item.key].title}
                aria-current={position === index ? "true" : undefined}
                data-home-slide-dot={item.key}
                onClick={() => { setInteractionVersion(version => version + 1); setIndex(position); }} />
            ))}
          </div>
          <div className={styles.arrows}>
            <button type="button" onClick={() => navigate(-1)} aria-label={t.previous}>
              <ChevronLeft size={21} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => navigate(1)} aria-label={t.next}>
              <ChevronRight size={21} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
