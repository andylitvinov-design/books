import Link from "next/link";

import type { Locale } from "@/data/remedies";

type SiteNavigationProps = {
  locale?: Locale;
};

export function SiteNavigation({ locale = "ru" }: SiteNavigationProps) {
  const labels = locale === "ru"
    ? { home: "Главная", library: "Книги", homeopathy: "Гомеопатия" }
    : { home: "Home", library: "Books", homeopathy: "Homeopathy" };

  return (
    <nav aria-label={locale === "ru" ? "Основная навигация" : "Primary navigation"} className="site-navigation">
      <Link href="/">{labels.home}</Link>
      <Link href="/books">{labels.library}</Link>
      <Link href={`/${locale}/homeopathy`}>{labels.homeopathy}</Link>
      <Link href="/#psialchemy">PsiAlchemy</Link>
    </nav>
  );
}
