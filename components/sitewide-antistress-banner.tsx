"use client";

import Link from "next/link";
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
  ru: { eyebrow: "ОПОРА · БЕСПЛАТНЫЙ КУРС", detail: "14 дней · 7 навыков · короткие практики", cta: "Начать курс" },
  en: { eyebrow: "OPORA · FREE STRESS RELIEF COURSE", detail: "14 days · 7 skills · daily practice", cta: "Start free course" },
  es: { eyebrow: "OPORA · CURSO GRATUITO", detail: "14 días · 7 habilidades · práctica diaria", cta: "Empezar el curso" },
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

/** A separate course invitation appears after test-selection areas, never in the global top ribbon. */
export function TestSelectionCourseBanner({ locale }: { locale: Locale }) {
  const t = courseCopy[locale] || courseCopy.en;
  const courseLocale = locale === "es" ? "en" : locale;
  return (
    <aside className={`${styles.ribbon} ${styles.inlineRibbon}`} data-tests-course-banner aria-label={t.eyebrow}>
      <div className={styles.inner}>
        <Link className={styles.name} href={`/${locale}/courses/antistress`} prefetch={false} aria-label={t.eyebrow}>
          <Sparkles size={15} aria-hidden="true" />{t.eyebrow}<ArrowRight size={14} aria-hidden="true" />
        </Link>
        <span className={styles.detail}>{t.detail}</span>
        <Link className={styles.cta} href={`/${courseLocale}/app/course?program=stress`} prefetch={false}>
          {t.cta}<ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
