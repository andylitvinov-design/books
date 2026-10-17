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
    intro: "Короткие ежедневные практики, чтобы лучше замечать напряжение, тренировать саморегуляцию и находить внутреннюю опору. В своём темпе.",
    benefits: ["14 дней", "Короткие упражнения", "В своём темпе"],
    cta: "Пройти курс бесплатно",
    more: "Подробнее о курсе",
    note: "Самостоятельная практика, не замена профессиональной помощи.",
    languageNote: "",
  },
  en: {
    eyebrow: "OPORA · 14 DAYS · FREE",
    title: "Take the free Anti-Stress course",
    intro: "Short daily practices to notice tension, build self-regulation skills and find a steadier footing in everyday life. Go at your own pace.",
    benefits: ["14 days", "Short daily exercises", "At your own pace"],
    cta: "Start the free course",
    more: "About the course",
    note: "Self-guided learning, not a substitute for professional care.",
    languageNote: "",
  },
  es: {
    eyebrow: "OPORA · 14 DÍAS · GRATIS",
    title: "Haz el curso gratuito «Antiestrés»",
    intro: "Prácticas breves para reconocer la tensión, ejercitar la autorregulación y encontrar más estabilidad en la vida diaria. A tu ritmo.",
    benefits: ["14 días", "Ejercicios breves", "A tu ritmo"],
    cta: "Empezar el curso en inglés",
    more: "Conoce el curso",
    note: "Aprendizaje autoguiado; no sustituye la atención profesional.",
    languageNote: "Las actividades interactivas están disponibles en inglés.",
  },
} as const;

// The ribbon is sitewide, but never interrupts full-screen lessons,
// questionnaire execution, private results, sensitive reports or admin workflows.
const isDistractionSensitivePage = (pathname: string) =>
  /^\/(?:admin|api|document-preview|privacy|terms)(?:\/|$)/.test(pathname) ||
  /^\/(?:ru|en|es)\/academy\/reiki\/yggdrasil\/free-initiation\/?$/.test(pathname) ||
  /^\/(?:ru|en|es)\/client(?:\/|$)/.test(pathname) ||
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

/** An optional Anti-Stress invitation after test selection; never inside a live questionnaire. */
export function TestSelectionCourseBanner({ locale }: { locale: Locale }) {
  const t = courseCopy[locale] || courseCopy.en;
  const courseLocale = locale === "es" ? "en" : locale;
  return (
    <aside className={styles.courseCard} data-tests-course-banner aria-label={t.eyebrow}>
      <div className={styles.courseCardInner}>
        <div className={styles.courseContent}>
          <p className={styles.courseEyebrow}><Sparkles size={17} aria-hidden="true" />{t.eyebrow}</p>
          <h2 className={styles.courseTitle}>{t.title}</h2>
          <p className={styles.courseIntro}>{t.intro}</p>
          <ul className={styles.courseBenefits}>
            {t.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
          </ul>
          <div className={styles.courseActions}>
            <Link className={styles.coursePrimary} href={`/${courseLocale}/app/course?program=stress&entry=quick`} prefetch={false}>
              {t.cta}<ArrowRight size={19} aria-hidden="true" />
            </Link>
            <Link className={styles.courseSecondary} href={`/${locale}/courses/antistress`} prefetch={false}>
              {t.more}
            </Link>
          </div>
          {t.languageNote && <p className={styles.courseLanguageNote}>{t.languageNote}</p>}
          <p className={styles.courseNote}>{t.note}</p>
        </div>
        <div className={styles.courseVisual} aria-hidden="true">
          <Image src="/images/holistic-house/course-hero-mindful.svg" alt="" width={460} height={560} unoptimized loading="lazy" />
        </div>
      </div>
    </aside>
  );
}
