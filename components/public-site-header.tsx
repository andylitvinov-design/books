import Link from "next/link";
import { SiteNavigation } from "@/components/site-navigation";
import type { PublicLocale } from "@/lib/public-locales";
const copy = {
  ru: { home: "Holistic House — главная", subtitle: "восстановление · практика · поддержка" },
  en: { home: "Holistic House — home", subtitle: "healing · practice · guidance" },
  es: { home: "Holistic House — inicio", subtitle: "sanación · práctica · acompañamiento" },
} as const;
// showAssessmentStrip remains an accepted legacy prop, but the obsolete promo banner is retired sitewide.
export function PublicSiteHeader({ locale }: { locale: PublicLocale; showAssessmentStrip?: boolean }) {
  const text = copy[locale];
  return <header className="house-header house-header--services section-site-header"><Link className="house-wordmark" href={locale === "es" ? "/es" : "/"} aria-label={text.home}>Holistic House<span>{text.subtitle}</span></Link><SiteNavigation locale={locale} /></header>;
}
