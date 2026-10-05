import Link from "next/link";
import { MindBodyMonitorStrip } from "@/components/mind-body-monitor-strip";
import { SiteNavigation } from "@/components/site-navigation";
import type { PublicLocale } from "@/lib/public-locales";
const copy = {
  ru: { home: "Holistic House — главная", subtitle: "восстановление · практика · поддержка" },
  en: { home: "Holistic House — home", subtitle: "healing · practice · guidance" },
  es: { home: "Holistic House — inicio", subtitle: "sanación · práctica · acompañamiento" },
} as const;
export function PublicSiteHeader({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  return <><header className="house-header house-header--services section-site-header"><Link className="house-wordmark" href={locale === "es" ? "/es" : "/"} aria-label={text.home}>Holistic House<span>{text.subtitle}</span></Link><SiteNavigation locale={locale} /></header><MindBodyMonitorStrip locale={locale} /></>;
}
