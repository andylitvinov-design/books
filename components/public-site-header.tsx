import { SiteNavigation } from "@/components/site-navigation";
import { HolisticHouseBrand } from "@/components/holistic-house-brand";
import type { PublicLocale } from "@/lib/public-locales";

const subtitle = {
  ru: "восстановление · практика · поддержка",
  en: "healing · practice · guidance",
  es: "sanación · práctica · acompañamiento",
} as const;

export function PublicSiteHeader({ locale }: { locale: PublicLocale; showAssessmentStrip?: boolean }) {
  return <header className="house-header house-header--services section-site-header">
    <HolisticHouseBrand locale={locale} section={subtitle[locale]} />
    <SiteNavigation locale={locale} />
  </header>;
}
