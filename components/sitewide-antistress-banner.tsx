"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import styles from "./sitewide-antistress-banner.module.css";

type Locale = "ru" | "en" | "es";

const copy = {
  ru: { eyebrow: "ОПОРА · АНТИСТРЕСС", detail: "14 дней · 7 навыков · ежедневные практики", cta: "Начать бесплатно" },
  en: { eyebrow: "OPORA · STRESS RELIEF", detail: "14 days · 7 skills · daily practice", cta: "Start free" },
  es: { eyebrow: "OPORA · ANTIESTRÉS", detail: "14 días · 7 habilidades · práctica diaria", cta: "Empezar gratis" },
} as const;

// The ribbon is sitewide, but never interrupts full-screen lessons,
// questionnaire execution, private results, sensitive reports or admin workflows.
const isDistractionSensitivePage = (pathname: string) =>
  /^\/(?:admin|api|document-preview|privacy|terms)(?:\/|$)/.test(pathname) ||
  /^\/(?:ru|en|es)\/(?:report|prescriptions)(?:\/|$)/.test(pathname) ||
  /^\/(?:ru|en|es)\/app\/(?:course|runs|results|documents|settings|privacy)(?:\/|$)/.test(pathname);

export function SitewideAntistressBanner({ initialLocale = "en" }: { initialLocale?: Locale }) {
  const pathname = usePathname() || "";
  if (isDistractionSensitivePage(pathname)) return null;
  const match = pathname.match(/^\/(ru|en|es)(?:\/|$)/);
  const locale = (match?.[1] as Locale | undefined) ?? initialLocale;
  const t = copy[locale] || copy.en;
  const targetLocale = locale === "es" ? "en" : locale;

  return (
    <aside className={styles.ribbon} data-sitewide-antistress-banner aria-label={t.eyebrow}>
      <div className={styles.inner}>
        <Link className={styles.name} href={"/" + locale + "/courses/antistress"} prefetch={false} aria-label={t.eyebrow}><Sparkles size={15} aria-hidden="true" />{t.eyebrow}<ArrowRight size={14} aria-hidden="true" /></Link>
        <span className={styles.detail}>{t.detail}</span>
        <Link className={styles.cta} href={`/${targetLocale}/app/course?program=stress&entry=quick`} prefetch={false}>
          {t.cta}<ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
