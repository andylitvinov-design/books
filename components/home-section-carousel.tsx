"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
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

const copy = {
  en: {
    region: "Explore Holistic House",
    previous: "Previous section",
    next: "Next section",
    choose: "Choose a site section",
    quickHeading: "PERSONAL CONSULTATION · TORONTO & ONLINE",
    quickPrice: "€50 / 30 min · €100 / 60 min",
    quickBook: "Request a consultation",
    quickFree: "Free written review",
    slides: {
      services: { eyebrow: "PERSONAL SUPPORT · SERVICES", title: "Personal growth & emotional clarity", lead: "Guided imagery, meaningful questions and space to explore your next step.", action: "View services" },
      tests: { eyebrow: "FREE SELF-CHECKS · TESTS", title: "Get to know your inner resources", lead: "Explore stress, mood and resilience with free self-checks and personal insights.", action: "Start free tests" },
      academy: { eyebrow: "COURSES · ACADEMY", title: "Learn, practise & grow", lead: "Discover Reiki, daily lessons and guided practices you can explore at your pace.", action: "Explore Academy" },
      business: { eyebrow: "BUSINESS & CAREER", title: "Find clarity for your next move", lead: "Explore coaching, strategy and practical decisions for your work or business.", action: "Explore Business" },
      ideas: { eyebrow: "BOOKS & INSPIRATION · IDEAS", title: "An idea for your next step", lead: "Ask a question, discover an aphorism or explore the wisdom of the I Ching.", action: "Explore Ideas" },
      cabinet: { eyebrow: "YOUR PERSONAL SPACE · CABINET", title: "Your journey in one place", lead: "Return to your tests, courses, insights and personal development path.", action: "Open Cabinet" },
    },
  },
  ru: {
    region: "Разделы Holistic House",
    previous: "Предыдущий раздел",
    next: "Следующий раздел",
    choose: "Выберите раздел сайта",
    quickHeading: "ЛИЧНАЯ КОНСУЛЬТАЦИЯ · ТОРОНТО И ОНЛАЙН",
    quickPrice: "€50 / 30 мин · €100 / 60 мин",
    quickBook: "Запросить консультацию",
    quickFree: "Бесплатный письменный разбор",
    slides: {
      services: { eyebrow: "ЛИЧНАЯ РАБОТА · УСЛУГИ", title: "Личное развитие и внутренняя ясность", lead: "Работа с образами, важными вопросами и поддержка на пути к следующему шагу.", action: "Посмотреть услуги" },
      tests: { eyebrow: "БЕСПЛАТНО · ТЕСТЫ", title: "Узнайте больше о своих ресурсах", lead: "Исследуйте стресс, настроение и внутреннюю опору с помощью бесплатных тестов.", action: "Начать тестирование" },
      academy: { eyebrow: "ОБУЧЕНИЕ · АКАДЕМИЯ", title: "Учитесь, практикуйте, развивайтесь", lead: "Курсы Рейки, ежедневные уроки и практики в удобном для вас ритме.", action: "Открыть Академию" },
      business: { eyebrow: "БИЗНЕС И КАРЬЕРА", title: "Ясность в работе и решениях", lead: "Консультации, стратегия и практические шаги для вашего проекта и карьеры.", action: "Раздел «Бизнес»" },
      ideas: { eyebrow: "КНИГИ И ПОДСКАЗКИ · ИДЕИ", title: "Подсказка для вашего следующего шага", lead: "Задайте вопрос, найдите афоризм или обратитесь к символам Книги Перемен.", action: "Открыть Идеи" },
      cabinet: { eyebrow: "ВАШЕ ПРОСТРАНСТВО · КАБИНЕТ", title: "Ваш путь в одном месте", lead: "Возвращайтесь к тестам, курсам, рекомендациям и своему прогрессу.", action: "Открыть кабинет" },
    },
  },
  es: {
    region: "Explora Holistic House",
    previous: "Sección anterior",
    next: "Sección siguiente",
    choose: "Elige una sección del sitio",
    quickHeading: "CONSULTA PERSONAL · TORONTO Y EN LÍNEA",
    quickPrice: "€50 / 30 min · €100 / 60 min",
    quickBook: "Solicitar una consulta",
    quickFree: "Revisión escrita gratis",
    slides: {
      services: { eyebrow: "APOYO PERSONAL · SERVICIOS", title: "Crecimiento personal y claridad", lead: "Imágenes guiadas, preguntas significativas y espacio para tu próximo paso.", action: "Ver servicios" },
      tests: { eyebrow: "GRATIS · PRUEBAS", title: "Conoce tus recursos interiores", lead: "Explora el estrés, el ánimo y la resiliencia con pruebas de autoobservación.", action: "Empezar las pruebas" },
      academy: { eyebrow: "CURSOS · ACADEMIA", title: "Aprende, practica y crece", lead: "Descubre Reiki, lecciones diarias y prácticas guiadas a tu propio ritmo.", action: "Explorar la Academia" },
      business: { eyebrow: "NEGOCIOS Y CARRERA", title: "Claridad para tu próximo paso", lead: "Consulta sobre estrategia y decisiones prácticas para tu trabajo o proyecto.", action: "Explorar Negocios" },
      ideas: { eyebrow: "LIBROS E INSPIRACIÓN · IDEAS", title: "Una idea para tu camino", lead: "Haz una pregunta, encuentra un aforismo o explora el I Ching.", action: "Explorar Ideas" },
      cabinet: { eyebrow: "TU ESPACIO PERSONAL", title: "Tu camino en un solo lugar", lead: "Vuelve a tus pruebas, cursos, recomendaciones y avances personales.", action: "Abrir mi espacio" },
    },
  },
} as const;

export function HomeSectionCarousel({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [manual, setManual] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const slide = slides[index];
  const words = t.slides[slide.key];
  // The Spanish public entry is localized; the full private app currently
  // uses the English route, so do not direct guests to a missing /es/app page.
  const href = slide.key === "cabinet" && locale === "es" ? "/en/app" : "/" + locale + slide.href;

  useEffect(() => {
    if (paused || manual || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setIndex(current => (current + 1) % slides.length);
      }
    }, 7000);
    return () => window.clearInterval(timer);
  }, [paused, manual]);

  function navigate(direction: number) {
    setManual(true);
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
      {/* Always visible before the tall section slider, including on a 320px phone.
          A click is interest in a service, never a confirmed lead or booking. */}
      <div className={styles.quickBooking} data-home-quick-booking="true">
        <div className={styles.quickBookingCopy}>
          <p>{t.quickHeading}</p>
          <strong>{t.quickPrice}</strong>
        </div>
        <div className={styles.quickBookingActions}>
          <AcquisitionEventLink
            className={styles.quickBookingPaid}
            href={`/${locale}/services#consultation`}
            event="service_view"
            attributes={{ "data-home-quick-cta": "paid" }}
            prefetch={false}
          >
            {t.quickBook}<ArrowRight size={16} aria-hidden="true" />
          </AcquisitionEventLink>
          <AcquisitionEventLink
            className={styles.quickBookingFree}
            href={`/${locale}/services/free-situation-review`}
            event="service_request_start"
            attributes={{ "data-home-quick-cta": "free-review" }}
            prefetch={false}
          >
            {t.quickFree}
          </AcquisitionEventLink>
        </div>
      </div>
      <div
        className={styles.slider}
        role="region"
        aria-roledescription="carousel"
        aria-label={t.region}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
        onTouchStart={event => {
          setManual(true);
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
            <Image src={slide.image} alt="" fill unoptimized priority={index === 0 && !manual}
              sizes="(max-width: 760px) 100vw, 1240px"
              className={styles.image} style={{ objectPosition: slide.position }} />
          )}
        </div>
        <div className={styles.gradient} aria-hidden="true" />
        <div className={styles.slideCopy} data-home-slide={slide.key}>
          <p className={styles.eyebrow}>{words.eyebrow}</p>
          <h2 id="home-section-slide-title">{words.title}</h2>
          <p className={styles.slideLead}>{words.lead}</p>
          <Link className={styles.viewButton} href={href} prefetch={false} data-home-slide-action={slide.key}>
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
                onClick={() => { setManual(true); setIndex(position); }} />
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
