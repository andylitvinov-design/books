import Link from "next/link";

import { SiteNavigation } from "@/components/site-navigation";
import type { Locale } from "@/data/remedies";

type PublicSiteHeaderProps = {
  locale: Locale;
};

const copy = {
  ru: { home: "Holistic House — главная", subtitle: "восстановление · практика · поддержка" },
  en: { home: "Holistic House — home", subtitle: "healing · practice · guidance" },
} as const;

export function PublicSiteHeader({ locale }: PublicSiteHeaderProps) {
  const text = copy[locale];
  return (
    <header className="house-header house-header--services section-site-header">
      <Link className="house-wordmark" href="/" aria-label={text.home}>
        Holistic House
        <span>{text.subtitle}</span>
      </Link>
      <SiteNavigation locale={locale} />
    </header>
  );
}
