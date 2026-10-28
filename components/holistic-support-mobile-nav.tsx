"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BarChart3, Compass, Home, Settings2 } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-mobile.module.css";

// Shared application chrome for both the mobile Support home and its ONE
// canonical /holistic-support/mandala editor. No second studio or data store.
const chromeCopy = {
  en: {
    newUi: "Mobile support experience", settings: "Settings", language: "Language",
    navHome: "Home", navPractices: "My practices", navProgress: "My progress",
    navSettings: "Settings", close: "Close",
    privateInfo: "Your scores and photo stay on your device. No personal image is uploaded.",
  },
  ru: {
    newUi: "Мобильная поддержка", settings: "Настройки", language: "Язык",
    navHome: "Главная", navPractices: "Мои практики", navProgress: "Мой прогресс",
    navSettings: "Настройки", close: "Закрыть",
    privateInfo: "Баллы и фото остаются на устройстве. Личное изображение не загружается на сервер.",
  },
  es: {
    newUi: "Apoyo móvil", settings: "Ajustes", language: "Idioma",
    navHome: "Inicio", navPractices: "Mis prácticas", navProgress: "Mi progreso",
    navSettings: "Ajustes", close: "Cerrar",
    privateInfo: "Las puntuaciones y la foto permanecen en tu dispositivo. No se suben imágenes personales.",
  },
} as const;

type Labels = { [K in keyof typeof chromeCopy.en]: string };
type Props = {
  locale: PublicLocale;
  page: "mobile" | "mandala";
  progressHref: string;
  labels?: Partial<Labels>;
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
};

export function HolisticSupportMobileNav({
  locale, page, progressHref, labels, settingsOpen: controlledOpen, onSettingsOpenChange,
}: Props) {
  const [localOpen, setLocalOpen] = useState(false);
  const settingsOpen = controlledOpen ?? localOpen;
  const updateOpen = onSettingsOpenChange ?? setLocalOpen;
  const t: Labels = { ...chromeCopy[locale], ...labels };

  return (
    <>
      {page === "mandala" ? (
        <header className={styles.mandalaAppHeader} data-support-app-header>
          <Link href={"/" + locale + "/holistic-support/mobile"} prefetch={false}
            aria-label={locale === "ru" ? "Назад к поддержке" : locale === "es" ? "Volver al apoyo" : "Back to Support"}>
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <span>Holistic House</span>
          <button type="button" aria-expanded={settingsOpen} aria-controls="support-mobile-settings"
            onClick={() => updateOpen(!settingsOpen)}><Settings2 size={20} aria-hidden="true" /></button>
        </header>
      ) : null}
      {settingsOpen ? (
        <section className={styles.settingsPanel} id="support-mobile-settings" aria-label={t.settings}>
          <h2><Settings2 size={22} aria-hidden="true" />{t.settings}</h2>
          <p>{t.language}</p>
          <div className={styles.localeLinks}>
            {(["en", "ru", "es"] as PublicLocale[]).map(language => (
              <Link key={language} href={"/" + language + "/holistic-support/" + page}
                hrefLang={language} aria-current={locale === language ? "page" : undefined}
                prefetch={false}>{language.toUpperCase()}</Link>
            ))}
          </div>
          <p>{t.privateInfo}</p>
          <button type="button" onClick={() => updateOpen(false)}>{t.close}</button>
        </section>
      ) : null}
      <nav className={styles.bottomNav} aria-label={t.newUi} data-support-mobile-bottom-nav>
        <Link href={"/" + locale + "/"} prefetch={false}>
          <Home size={24} aria-hidden="true" /><span>{t.navHome}</span>
        </Link>
        <Link href={"/" + locale + "/app"} prefetch={false}>
          <Compass size={24} aria-hidden="true" /><span>{t.navPractices}</span>
        </Link>
        <Link href={progressHref} prefetch={false}>
          <BarChart3 size={24} aria-hidden="true" /><span>{t.navProgress}</span>
        </Link>
        <button type="button" aria-expanded={settingsOpen}
          aria-controls="support-mobile-settings" onClick={() => updateOpen(!settingsOpen)}>
          <Settings2 size={24} aria-hidden="true" /><span>{t.navSettings}</span>
        </button>
      </nav>
    </>
  );
}
