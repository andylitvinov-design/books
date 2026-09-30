"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { Locale } from "@/data/remedies";
import { localePath, readUiLocale, saveUiLocale } from "@/lib/ui-locale";

type NavigationLocale = Locale | "es";
type SiteNavigationProps = {
  locale?: NavigationLocale;
  onLocaleChange?: (locale: Locale) => void;
};

const navigationCopy = {
  ru: { home: "Главная", book: "Книга", remedies: "Препараты", services: "Услуги", about: "Обо мне", navigation: "Основная навигация", language: "Язык интерфейса" },
  en: { home: "Home", book: "Book", remedies: "Remedies", services: "Services", about: "About", navigation: "Primary navigation", language: "Interface language" },
  es: { home: "Inicio", book: "Libro", remedies: "Remedios", services: "Servicios", about: "Sobre mí", navigation: "Navegación principal", language: "Idioma de la página" },
} as const;

export function SiteNavigation({ locale, onLocaleChange }: SiteNavigationProps) {
  const pathname = usePathname();
  const [preference, setPreference] = useState<NavigationLocale>(locale ?? "ru");
  const activeLocale = locale ?? preference;
  const labels = navigationCopy[activeLocale];
  // Spanish is a complete About-page translation, not a fabricated translation
  // of the remedy catalog, external books or private client routes.
  const spanish = activeLocale === "es";
  const destinationLocale = spanish ? "en" : activeLocale;
  const otherLanguage = spanish ? " (EN)" : "";
  const bookHref = destinationLocale === "ru"
    ? "https://designrr.page/?id=367554&token=1057485987&h=4958"
    : "https://designrr.page/?id=377444&token=639498968&h=5264";
  const localizedPath = /^\/(ru|en|es)(?=\/|$)/.test(pathname);
  const aboutPath = /^\/(ru|en|es)\/about\/?$/.test(pathname);
  const languages: NavigationLocale[] = aboutPath ? ["ru", "en", "es"] : ["ru", "en"];

  useEffect(() => {
    if (locale === "es") {
      setPreference("es");
      document.documentElement.lang = "es";
      return;
    }
    const savedLocale = readUiLocale(document.cookie);
    const selected: Locale = locale ?? (savedLocale === "en" ? "en" : "ru");
    setPreference(selected);
    if (locale) saveUiLocale(locale);
  }, [locale]);

  function selectLocale(nextLocale: NavigationLocale) {
    setPreference(nextLocale);
    // Do not leak an unsupported ES preference into the EN/RU client cabinet.
    if (nextLocale === "es") return;
    saveUiLocale(nextLocale);
    window.dispatchEvent(new CustomEvent<Locale>("ui-locale-change", { detail: nextLocale }));
    onLocaleChange?.(nextLocale);
  }

  function counterpart(nextLocale: NavigationLocale) {
    return aboutPath ? `/${nextLocale}/about` : localePath(pathname, nextLocale as Locale);
  }

  return (
    <nav aria-label={labels.navigation} className="site-navigation">
      <Link href={spanish ? "/?lang=en" : "/"}>{labels.home}{otherLanguage}</Link>
      <a href={bookHref}>{labels.book}{otherLanguage}</a>
      <Link href={"/" + destinationLocale + "/homeopathy"}>{labels.remedies}{otherLanguage}</Link>
      <Link href={"/" + destinationLocale + "/services"}>{labels.services}{otherLanguage}</Link>
      <Link href={"/" + activeLocale + "/about"}>{labels.about}</Link>
      <span aria-label={labels.language} className="site-language-switch">
        {languages.map((nextLocale) => localizedPath ? (
          <Link aria-current={activeLocale === nextLocale ? "true" : undefined} href={counterpart(nextLocale)} key={nextLocale} lang={nextLocale} onClick={() => selectLocale(nextLocale)}>{nextLocale.toUpperCase()}</Link>
        ) : (
          <button aria-pressed={activeLocale === nextLocale} key={nextLocale} lang={nextLocale} onClick={() => selectLocale(nextLocale)} type="button">{nextLocale.toUpperCase()}</button>
        ))}
      </span>
    </nav>
  );
}
