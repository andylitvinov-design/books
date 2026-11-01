"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, Compass, Home, MessageCircle, Settings2, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-mobile.module.css";

const copy = {
  en: { home: "Home", practice: "Practice", messages: "Messages", progress: "Progress", settings: "Settings", videoAi: "AI", language: "Language", close: "Close" },
  ru: { home: "Главная", practice: "Практика", messages: "Сообщения", progress: "Прогресс", settings: "Настройки", videoAi: "ИИ", language: "Язык", close: "Закрыть" },
  es: { home: "Inicio", practice: "Práctica", messages: "Mensajes", progress: "Progreso", settings: "Ajustes", videoAi: "IA", language: "Idioma", close: "Cerrar" },
} as const;

/** The free video editor is a part of the approved Support experience, not
 * a return to the legacy seven-link site navigation. */
export function HolisticSupportMandalaDock({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => {
    const syncChat = () => setChatOpen(window.location.hash === "#video-director-chat");
    syncChat();
    window.addEventListener("hashchange", syncChat);
    return () => window.removeEventListener("hashchange", syncChat);
  }, []);
  return (
    <>
      <header className={styles.mandalaAppHeader} data-support-app-header>
        <Link href={"/" + locale + "/holistic-support/mobile"} prefetch={false}
          aria-label={locale === "ru" ? "Назад к поддержке" : locale === "es" ? "Volver al apoyo" : "Back to Support"}>
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <span>Holistic House</span>
        <button type="button" aria-label={t.settings} aria-expanded={settingsOpen} aria-controls="mandala-support-settings"
          onClick={() => setSettingsOpen(open => !open)}><Settings2 size={20} aria-hidden="true" /></button>
      </header>
      {settingsOpen ? (
        <section className={styles.settingsPanel} id="mandala-support-settings" aria-label={t.settings} data-mandala-settings-panel>
          <h2><Settings2 size={21} aria-hidden="true" />{t.settings}</h2>
          <p>{t.language}</p>
          <div className={styles.localeLinks}>
            {(["en", "ru", "es"] as const).map(language => (
              <Link key={language} href={"/" + language + "/holistic-support/mandala"}
                hrefLang={language} aria-current={locale === language ? "page" : undefined}>
                {language.toUpperCase()}
              </Link>
            ))}
          </div>
          <button type="button" onClick={() => setSettingsOpen(false)}>{t.close}</button>
        </section>
      ) : null}
      <nav className={styles.bottomNav} aria-label={t.home} data-mandala-support-bottom-nav>
        <Link href={"/" + locale + "/holistic-support/mobile"} prefetch={false}>
          <Home size={24} aria-hidden="true" /><span>{t.home}</span>
        </Link>
        <Link href={"/" + locale + "/practice"} prefetch={false}>
          <Compass size={24} aria-hidden="true" /><span>{t.practice}</span>
        </Link>
        <Link href={"/" + locale + "/app/messages?tab=chats"} prefetch={false}>
          <MessageCircle size={24} aria-hidden="true" /><span>{t.messages}</span>
        </Link>
        <Link href={"/" + locale + "/holistic-support/mobile#support-progress"} prefetch={false}>
          <BarChart3 size={24} aria-hidden="true" /><span>{t.progress}</span>
        </Link>
        <button type="button" aria-expanded={settingsOpen} aria-controls="mandala-support-settings"
          onClick={() => setSettingsOpen(open => !open)}>
          <Settings2 size={24} aria-hidden="true" /><span>{t.settings}</span>
        </button>
        <Link href={chatOpen ? "#video-quick-heading" : "#video-director-chat"} prefetch={false}
          onClick={() => setSettingsOpen(false)} data-support-video-ai
          aria-current={chatOpen ? "page" : undefined}
          aria-label={locale === "ru" ? "ИИ — чат для создания видео" : locale === "es" ? "IA — chat de vídeo" : "AI video creation chat"}>
          <Sparkles size={24} aria-hidden="true" /><span>{t.videoAi}</span>
        </Link>
      </nav>
    </>
  );
}
