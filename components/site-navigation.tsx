"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@/data/remedies";
import { localePath, readUiLocale, saveUiLocale } from "@/lib/ui-locale";
import { hasSpanishCounterpart, publicCounterpart, savePublicLocale, type PublicLocale } from "@/lib/public-locales";

type SiteNavigationProps = { locale?: PublicLocale; onLocaleChange?: (locale: Locale) => void };
const navigationCopy = {
  ru: { home: "Главная", book: "Книга", remedies: "Препараты", services: "Услуги", about: "Обо мне", cabinet: "Кабинет", navigation: "Основная навигация", language: "Язык интерфейса" },
  en: { home: "Home", book: "Book", remedies: "Remedies", services: "Services", about: "About", cabinet: "Client Cabinet", navigation: "Primary navigation", language: "Interface language" },
  es: { home: "Inicio", book: "Libros", remedies: "Remedios", services: "Servicios", about: "Sobre mí", cabinet: "Client area", navigation: "Navegación principal", language: "Idioma de la página" },
} as const;
export function SiteNavigation({ locale, onLocaleChange }: SiteNavigationProps) {
  const pathname = usePathname();
  const [preference, setPreference] = useState<PublicLocale>(locale ?? "en");
  const activeLocale = locale ?? preference;
  const labels = navigationCopy[activeLocale];
  const spanish = activeLocale === "es";
  const bookHref = activeLocale === "ru" ? "https://designrr.page/?id=367554&token=1057485987&h=4958" : "https://designrr.page/?id=377444&token=639498968&h=5264";
  const localizedPath = /^\/(ru|en|es)(?=\/|$)/.test(pathname);
  const available = hasSpanishCounterpart(pathname);
  const languages: PublicLocale[] = available ? ["ru", "en", "es"] : ["ru", "en"];
  useEffect(() => {
    if (locale === "es") { setPreference("es"); savePublicLocale("es"); return; }
    const savedLocale = readUiLocale(document.cookie);
    const selected: Locale = locale ?? (savedLocale === "ru" ? "ru" : "en");
    setPreference(selected);
    if (locale) { saveUiLocale(locale); savePublicLocale(locale); }
  }, [locale]);
  function selectLocale(nextLocale: PublicLocale) {
    setPreference(nextLocale);
    savePublicLocale(nextLocale);
    // The existing private-cabinet preference remains strictly EN/RU.
    if (nextLocale === "es") return;
    saveUiLocale(nextLocale);
    window.dispatchEvent(new CustomEvent<Locale>("ui-locale-change", { detail: nextLocale }));
    onLocaleChange?.(nextLocale);
  }
  function counterpart(nextLocale: PublicLocale) {
    return available ? publicCounterpart(pathname, nextLocale) : localePath(pathname, nextLocale as Locale);
  }
  return <nav aria-label={labels.navigation} className="site-navigation">
    <Link href={spanish ? "/es" : "/"}>{labels.home}</Link>
    {spanish ? <Link href="/es/books">{labels.book}</Link> : <a href={bookHref}>{labels.book}</a>}
    <Link href={"/" + activeLocale + "/homeopathy"}>{labels.remedies}</Link>
    <Link href={"/" + activeLocale + "/services"}>{labels.services}</Link>
    <Link href={"/" + activeLocale + "/about"}>{labels.about}</Link>
    {!spanish && <Link className="site-cabinet-link" href={"/" + activeLocale + "/client"}>{labels.cabinet}</Link>}
    {/* Load a different language only on selection, not speculatively (including client-entry counterparts). */}
    <span className="site-language-switch"><details className="site-language-menu">
      <summary className="site-language-menu-trigger" aria-label={labels.language}>{activeLocale.toUpperCase()}</summary>
      <span className="site-language-menu-list">{languages.map(nextLocale => localizedPath || nextLocale === "es" ? <Link prefetch={false} aria-current={activeLocale === nextLocale ? "true" : undefined} href={counterpart(nextLocale)} key={nextLocale} lang={nextLocale} onClick={() => selectLocale(nextLocale)}>{nextLocale.toUpperCase()}</Link> : <button aria-pressed={activeLocale === nextLocale} key={nextLocale} lang={nextLocale} onClick={() => selectLocale(nextLocale)} type="button">{nextLocale.toUpperCase()}</button>)}</span>
    </details></span>
  </nav>;
}
