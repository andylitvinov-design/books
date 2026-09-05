import Link from "next/link";

import type { Locale } from "@/data/remedies";

type SiteNavigationProps = {
  locale?: Locale;
};

export function SiteNavigation({ locale = "ru" }: SiteNavigationProps) {
  const labels = locale === "ru"
    ? { library: "Библиотека", homeopathy: "Гомеопатия" }
    : { library: "Library", homeopathy: "Homeopathy" };

  return (
    <nav aria-label={locale === "ru" ? "Основная навигация" : "Primary navigation"} className="site-navigation">
      <Link href="/">{labels.library}</Link>
      <Link href={`/${locale}/homeopathy`}>{labels.homeopathy}</Link>
    </nav>
  );
}
