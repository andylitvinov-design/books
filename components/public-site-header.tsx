import Link from "next/link";

import { SiteNavigation } from "@/components/site-navigation";
import type { Locale } from "@/data/remedies";

type PublicSiteHeaderProps = {
  locale: Locale;
};

const copy = {
  ru: { home: "Holistic House — главная", subtitle: "Книги · препараты · услуги" },
  en: { home: "Holistic House — home", subtitle: "Books · remedies · services" },
} as const;

export function PublicSiteHeader({ locale }: PublicSiteHeaderProps) {
  const text = copy[locale];
  return (
    <header className="house-header public-site-header">
      <Link className="house-wordmark" href="/" aria-label={text.home}>
        Holistic House
        <span>{text.subtitle}</span>
      </Link>
      <SiteNavigation locale={locale} />
    </header>
  );
}
