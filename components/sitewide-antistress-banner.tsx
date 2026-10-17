"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import styles from "./sitewide-antistress-banner.module.css";

type Locale = "ru" | "en" | "es";

const copy = {
  ru: { eyebrow: "ЛИЧНАЯ ДИАГНОСТИКА · БЕСПЛАТНО", detail: "Анкета + рисунок · личный письменный разбор", cta: "Получить разбор" },
  en: { eyebrow: "FREE PERSONAL SITUATION REVIEW", detail: "Short form + drawing · personal written feedback", cta: "Get free review" },
  es: { eyebrow: "ANÁLISIS PERSONAL GRATUITO", detail: "Formulario + dibujo · informe personal por escrito", cta: "Solicitar gratis" },
} as const;

const courseCopy = {
  ru: {
    eyebrow: "ОПОРА · 14 ДНЕЙ · БЕСПЛАТНО",
    title: "Пройдите курс «Антистресс»",
    intro: "14 дней коротких практик, чтобы замечать напряжение и постепенно находить внутреннюю опору.",
    cta: "Пройти курс бесплатно",
    more: "Подробнее о курсе",
    note: "Самостоятельная образовательная практика, не замена профессиональной помощи.",
    languageNote: "",
    photoAlt: "Горный пейзаж — обложка курса «Антистресс»",
  },
  en: {
    eyebrow: "OPORA · 14 DAYS · FREE",
    title: "Take the free Anti-Stress course",
    intro: "14 days of short practices to notice tension and find more steadiness in daily life.",
    cta: "Start the free course",
    more: "About the course",
    note: "Self-guided education, not a substitute for professional care.",
    languageNote: "",
    photoAlt: "Quiet mountain scene from the Anti-Stress course",
  },
  es: {
    eyebrow: "OPORA · 14 DÍAS · GRATIS",
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
    eyebrow: "БЕСПЛАТНАЯ ДИАГНОСТИКА СИТУАЦИИ",
    title: "Личный разбор вашей ситуации",
    intro: "Анкета и рисунок «Я — цель — проблема». Я лично подготовлю письменный анализ и рекомендации.",
    cta: "Получить бесплатный разбор",
    more: "Как проходит разбор",
    note: "Символический анализ, не медицинская диагностика. Бесплатный формат — письменный отчёт.",
    photoAlt: "Андрей Литвинов — автор личного разбора",
  },
  en: {
    eyebrow: "FREE PERSONAL SITUATION REVIEW",
    title: "A personal review of your situation",
    intro: "Share a short form and a drawing of you, your goal and your challenge. I personally prepare written insights and recommendations.",
    cta: "Get my free review",
    more: "How it works",
    note: "Symbolic self-reflection, not medical diagnosis. The free format is a written report.",
    photoAlt: "Andrey Litvinov, your personal review practitioner",
  },
  es: {
    eyebrow: "ANÁLISIS PERSONAL GRATUITO",
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

/** Compact, photo-left course invitation; the free personal review is shown in the public test picker only. */
export function TestSelectionCourseBanner({ locale, showReview = false }: { locale: Locale; showReview?: boolean }) {
  const t = courseCopy[locale] || courseCopy.en;
  const review = reviewCopy[locale] || reviewCopy.en;
  const courseLocale = locale === "es" ? "en" : locale;

  return (
    <section className={styles.testOffers + (showReview ? " " + styles.testOffersPair : "")} data-test-selection-offers aria-label={locale === "ru" ? "Что можно сделать дальше" : locale === "es" ? "Siguientes pasos" : "Your next steps"}>
      <aside className={styles.courseCard} data-tests-course-banner aria-label={t.eyebrow}>
        <div className={styles.courseCardInner}>
          <div className={styles.courseVisual}>
            <Image src="/images/holistic-house/course-focus-mountain-boy.webp" alt={t.photoAlt} fill sizes="(max-width: 680px) 88px, 136px" loading="lazy" />
          </div>
          <div className={styles.courseContent}>
            <p className={styles.courseEyebrow}><Sparkles size={15} aria-hidden="true" />{t.eyebrow}</p>
            <h2 className={styles.courseTitle}>{t.title}</h2>
            <p className={styles.courseIntro}>{t.intro}</p>
            <div className={styles.courseActions}>
              <Link className={styles.coursePrimary} href={ "/" + courseLocale + "/app/course?program=stress&entry=quick" } prefetch={false}>
                {t.cta}<ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className={styles.courseSecondary} href={"/" + locale + "/courses/antistress"} prefetch={false}>
                {t.more}<ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            {t.languageNote && <p className={styles.courseLanguageNote}>{t.languageNote}</p>}
            <p className={styles.courseNote}>{t.note}</p>
          </div>
        </div>
      </aside>
      {showReview && (
        <aside className={styles.reviewCard} data-tests-review-banner aria-label={review.eyebrow}>
          <div className={styles.courseCardInner}>
            <div className={styles.courseVisual}>
              <Image src="/images/holistic-house/andy-about.png" alt={review.photoAlt} fill sizes="(max-width: 680px) 88px, 136px" loading="lazy" />
            </div>
            <div className={styles.courseContent}>
              <p className={styles.courseEyebrow}><Sparkles size={15} aria-hidden="true" />{review.eyebrow}</p>
              <h2 className={styles.courseTitle}>{review.title}</h2>
              <p className={styles.courseIntro}>{review.intro}</p>
              <div className={styles.courseActions}>
                <Link className={styles.coursePrimary} href={"/" + locale + "/services/free-situation-review"} prefetch={false}>
                  {review.cta}<ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link className={styles.courseSecondary} href={"/" + locale + "/services/free-situation-review#review-steps-title"} prefetch={false}>
                  {review.more}<ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <p className={styles.courseNote}>{review.note}</p>
            </div>
          </div>
        </aside>
      )}
    </section>
  );
