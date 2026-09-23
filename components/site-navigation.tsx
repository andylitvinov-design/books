"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { Locale } from "@/data/remedies";
import { localePath, readUiLocale, saveUiLocale } from "@/lib/ui-locale";

type SiteNavigationProps = {
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
};

export function SiteNavigation({ locale, onLocaleChange }: SiteNavigationProps) {
  const pathname = usePathname();
  const [preference, setPreference] = useState<Locale>(locale ?? "ru");
  const activeLocale = locale ?? preference;
  const labels = activeLocale === "ru"
    ? { home: "Главная", library: "Книги", remedies: "Препараты", services: "Услуги", cabinet: "Кабинет" }
    : { home: "Home", library: "Books", remedies: "Remedies", services: "Services", cabinet: "Cabinet" };
  const localizedPath = /^\/(ru|en)(?=\/|$)/.test(pathname);

  useEffect(() => {
    const savedLocale = readUiLocale(document.cookie);
    const selected: Locale = locale ?? (savedLocale === "en" ? "en" : "ru");
    setPreference(selected);
    if (locale) saveUiLocale(locale);
  }, [locale]);

  function selectLocale(nextLocale: Locale) {
    setPreference(nextLocale);
    saveUiLocale(nextLocale);
    onLocaleChange?.(nextLocale);
  }

  function counterpart(nextLocale: Locale) {
    return localePath(pathname, nextLocale);
  }

  return (
    <nav aria-label={activeLocale === "ru" ? "Основная навигация" : "Primary navigation"} className="site-navigation">
      <Link href="/">{labels.home}</Link>
      <Link href="/books">{labels.library}</Link>
      <Link href={`/${activeLocale}/homeopathy`}>{labels.remedies}</Link>
      <Link href={`/${activeLocale}/services`}>{labels.services}</Link>
      <Link href="/admin">{labels.cabinet}</Link>
      <span aria-label={activeLocale === "ru" ? "Язык интерфейса" : "Interface language"} className="site-language-switch">
        {(["ru", "en"] as Locale[]).map((nextLocale) => localizedPath ? (
          <Link aria-current={activeLocale === nextLocale ? "true" : undefined} href={counterpart(nextLocale)} key={nextLocale} lang={nextLocale} onClick={() => selectLocale(nextLocale)}>{nextLocale.toUpperCase()}</Link>
        ) : (
          <button aria-pressed={activeLocale === nextLocale} key={nextLocale} lang={nextLocale} onClick={() => selectLocale(nextLocale)} type="button">{nextLocale.toUpperCase()}</button>
        ))}
      </span>
    </nav>
  );
}
