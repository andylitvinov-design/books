"use client";

import Link from "next/link";
import Image from "next/image";
import { cardArtworkUrl } from "@/lib/public-card-artwork";
import { StaticPortrait } from "@/components/static-portrait";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { useId, useState } from "react";
import styles from "./sitewide-antistress-banner.module.css";

type Locale = "ru" | "en" | "es";

const copy = {
  ru: { eyebrow: "ЛИЧНАЯ ДИАГНОСТИКА · БЕСПЛАТНО", detail: "Анкета + рисунок · личный письменный разбор", cta: "Получить разбор" },
  en: { eyebrow: "FREE PERSONAL SITUATION REVIEW", detail: "Short form + drawing · personal written feedback", cta: "Get free review" },
  es: { eyebrow: "ANÁLISIS PERSONAL GRATUITO", detail: "Formulario + dibujo · informe personal por escrito", cta: "Solicitar gratis" },
} as const;

const courseCopy = {
  ru: {
    eyebrow: "ОПОРА · 14 ДНЕЙ",
    title: "Пройдите курс «Антистресс»",
    intro: "14 дней коротких практик, чтобы замечать напряжение и постепенно находить внутреннюю опору.",
    cta: "Пройти курс бесплатно",
    more: "Подробнее о курсе",
    note: "Самостоятельная образовательная практика, не замена профессиональной помощи.",
    languageNote: "",
    photoAlt: "Горный пейзаж — обложка курса «Антистресс»",
  },
  en: {
    eyebrow: "OPORA · 14 DAYS",
    title: "Take the free Anti-Stress course",
    intro: "14 days of short practices to notice tension and find more steadiness in daily life.",
    cta: "Start the free course",
    more: "About the course",
    note: "Self-guided education, not a substitute for professional care.",
    languageNote: "",
    photoAlt: "Quiet mountain scene from the Anti-Stress course",
  },
  es: {
    eyebrow: "OPORA · 14 DÍAS",
    title: "Haz el curso gratuito «Antiestrés»",
    intro: "14 días de prácticas breves para reconocer la tensión y encontrar más estabilidad.",
    cta: "Empezar el curso en inglés",
    more: "Conoce el curso",
    note: "Aprendizaje autoguiado; no sustituye la atención profesional.",
    languageNote: "Las actividades interactivas están disponibles en inglés.",
    photoAlt: "Paisaje de montaña de la portada del curso Antiestrés",
  },
} as const;

const reviewCopy = {
  ru: {
    eyebrow: "ЛИЧНЫЙ РАЗБОР СИТУАЦИИ",
    title: "Личный разбор вашей ситуации",
    intro: "Анкета и рисунок «Я — цель — проблема». Я лично подготовлю письменный анализ и рекомендации.",
    cta: "Получить бесплатный разбор",
    more: "Как проходит разбор",
    note: "Символический анализ, не медицинская диагностика. Бесплатный формат — письменный отчёт.",
    photoAlt: "Андрей Литвинов — автор личного разбора",
  },
  en: {
    eyebrow: "PERSONAL SITUATION REVIEW",
    title: "A personal review of your situation",
    intro: "Share a short form and a drawing of you, your goal and your challenge. I personally prepare written insights and recommendations.",
    cta: "Get my free review",
    more: "How it works",
    note: "Symbolic self-reflection, not medical diagnosis. The free format is a written report.",
    photoAlt: "Andrey Litvinov, your personal review practitioner",
  },
  es: {
    eyebrow: "ANÁLISIS PERSONAL",
    title: "Revisemos tu situación",
    intro: "Completa un formulario y dibuja tu situación, meta y dificultad. Prepararé personalmente un análisis escrito y recomendaciones.",
    cta: "Solicitar análisis gratuito",
    more: "Cómo funciona",
    note: "Reflexión simbólica, no diagnóstico médico. El formato gratuito es un informe escrito.",
    photoAlt: "Andrey Litvinov, responsable del análisis personal",
  },
} as const;

// The ribbon is sitewide, but never interrupts full-screen lessons,
// questionnaire execution, private results, sensitive reports or admin workflows.
/** Restore the original top navy/burgundy bar independently of the compact course offers. */
const isDistractionSensitivePage = (pathname: string) =>
  /^\/(?:admin|api|document-preview|privacy|terms)(?:\/|$)/.test(pathname) ||
  /^\/(?:ru|en|es)\/academy\/reiki\/yggdrasil\/free-initiation\/?$/.test(pathname) ||
  (/^\/(?:ru|en|es)\/client(?:\/|$)/.test(pathname) && !/^\/(?:en|ru)\/client(?:\/tests)?\/?$/.test(pathname)) ||
  /^\/(?:ru|en|es)\/(?:report|prescriptions)(?:\/|$)/.test(pathname) ||
  /^\/(?:ru|en|es)\/app\/(?:course|runs|results|documents|settings|privacy)(?:\/|$)/.test(pathname);

export function SitewideAntistressBanner({ initialLocale = "en" }: { initialLocale?: Locale }) {
  const pathname = usePathname() || "";
  if (isDistractionSensitivePage(pathname)) return null;
  const match = pathname.match(/^\/(ru|en|es)(?:\/|$)/);
  const locale = (match?.[1] as Locale | undefined) ?? initialLocale;
  const t = copy[locale] || copy.en;
  return (
    <aside className={styles.ribbon} data-sitewide-antistress-banner data-sitewide-personal-review-banner aria-label={t.eyebrow}>
      <div className={styles.inner}>
        <Link className={styles.name} href={"/" + locale + "/services/free-situation-review"} prefetch={false} aria-label={t.eyebrow}><Sparkles size={15} aria-hidden="true" />{t.eyebrow}<ArrowRight size={14} aria-hidden="true" /></Link>
        <span className={styles.detail}>{t.detail}</span>
        <Link className={styles.cta} href={`/${locale}/services/free-situation-review`} prefetch={false}>
          {t.cta}<ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}


/** Academy-style compact recommendations below the public test explorer. */
export function TestSelectionCourseBanner({ locale, showReview = false }: { locale: Locale; showReview?: boolean }) {
  const t = courseCopy[locale] || courseCopy.en;
  const review = reviewCopy[locale] || reviewCopy.en;
  const courseLocale = locale === "es" ? "en" : locale;
  const courseHref = "/" + courseLocale + "/app/course?program=stress&entry=quick";
  const courseLanding = "/" + locale + "/courses/antistress";
  const reviewLanding = "/" + locale + "/services/free-situation-review";
  const [courseExpanded, setCourseExpanded] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState(false);
  const hintPrefix = useId();
  const freeBadge = locale === "ru" ? "БЕСПЛАТНО" : locale === "es" ? "GRATIS" : "FREE";
  const detailLabel = locale === "ru" ? "Подробнее" : locale === "es" ? "Detalles" : "Details";
  const lessLabel = locale === "ru" ? "Свернуть" : locale === "es" ? "Ocultar" : "Less details";

  return (
    <section className={styles.testOffers + (showReview ? " " + styles.testOffersPair : "")} data-test-selection-offers aria-label={locale === "ru" ? "Что можно сделать дальше" : locale === "es" ? "Siguientes pasos" : "Your next steps"}>
      <aside className={styles.courseCard} data-tests-course-banner aria-label={t.eyebrow}>
        <div className={styles.courseCardInner}>
          <Link className={styles.courseVisual} href={courseLanding} aria-label={t.more} prefetch={false}>
            <Image src={cardArtworkUrl("/images/holistic-house/course-focus-mountain-boy.webp")} unoptimized alt={t.photoAlt} fill sizes="(max-width: 560px) 110px, (max-width: 960px) 152px, 170px" loading="lazy" />
          </Link>
          <div className={styles.courseContent}>
            <div className={styles.courseTopline}>
              <p className={styles.courseEyebrow}>{t.eyebrow}</p>
              <span className={styles.freeBadge}>{freeBadge}</span>
            </div>
            <h2 className={styles.courseTitle}><Link href={courseLanding} prefetch={false}>{t.title}</Link></h2>
            <p className={styles.courseIntro}>{t.intro}</p>
            <div className={styles.courseActions}>
              <button type="button" className={styles.courseSecondary} aria-expanded={courseExpanded} aria-controls={hintPrefix + "-course"} onClick={() => setCourseExpanded(value => !value)}>
                {courseExpanded ? lessLabel : detailLabel}
                <ChevronDown className={courseExpanded ? styles.chevronOpen : styles.chevron} size={15} aria-hidden="true" />
              </button>
              <Link className={styles.coursePrimary} href={courseHref} prefetch={false}>
                {t.cta}<ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
        <div className={styles.courseHint} id={hintPrefix + "-course"} hidden={!courseExpanded}>
          <p>{t.note}</p>
          {t.languageNote ? <p>{t.languageNote}</p> : null}
          <Link className={styles.courseLanding} href={courseLanding} prefetch={false}>
            {t.more}<ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </aside>
      {showReview && (
        <aside className={styles.reviewCard} data-tests-review-banner aria-label={review.eyebrow}>
          <div className={styles.courseCardInner}>
            <Link className={styles.courseVisual} href={reviewLanding} aria-label={review.more} prefetch={false}>
              <StaticPortrait src="/images/holistic-house/andy-about.png" alt={review.photoAlt} fill sizes="(max-width: 560px) 110px, (max-width: 960px) 152px, 170px" loading="lazy" />
            </Link>
            <div className={styles.courseContent}>
              <div className={styles.courseTopline}>
                <p className={styles.courseEyebrow}>{review.eyebrow}</p>
                <span className={styles.freeBadge}>{freeBadge}</span>
              </div>
              <h2 className={styles.courseTitle}><Link href={reviewLanding} prefetch={false}>{review.title}</Link></h2>
              <p className={styles.courseIntro}>{review.intro}</p>
              <div className={styles.courseActions}>
                <button type="button" className={styles.courseSecondary} aria-expanded={reviewExpanded} aria-controls={hintPrefix + "-review"} onClick={() => setReviewExpanded(value => !value)}>
                  {reviewExpanded ? lessLabel : detailLabel}
                  <ChevronDown className={reviewExpanded ? styles.chevronOpen : styles.chevron} size={15} aria-hidden="true" />
                </button>
                <Link className={styles.coursePrimary} href={reviewLanding} prefetch={false}>
                  {review.cta}<ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
          <div className={styles.courseHint} id={hintPrefix + "-review"} hidden={!reviewExpanded}>
            <p>{review.note}</p>
            <Link className={styles.courseLanding} href={reviewLanding + "#review-steps-title"} prefetch={false}>
              {review.more}<ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </aside>
      )}
    </section>
  );
}
