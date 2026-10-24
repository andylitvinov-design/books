"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import styles from "./mentor-community-switch.module.css";

type View = "mentors" | "articles";
type Props = {
  locale: string;
  mentors: ReactNode;
  articles: ReactNode;
  hasArticles: boolean;
  initialView?: View;
  mastersUnavailable?: boolean;
  articlesUnavailable?: boolean;
};

const COPY = {
  en: {
    title: "Masters, news & community",
    intro: "Find a practitioner by topic and format, or follow their news, notes and discussions in a separate feed.",
    tabs: "Community sections",
    mentors: "Find a mentor",
    articles: "Practitioner news feed",
    hint: "Profiles and articles appear only after publication review.",
    noArticles: "The first practitioner news and notes are on their way.",
    noArticlesHint: "Meet an approved mentor now, or share your own knowledge through My Practice.",
    seeMentors: "Explore mentors",
    write: "Write a note",
    unavailable: "This part of the community is temporarily unavailable. Your saved work is unaffected.",
    retry: "Try again",
  },
  ru: {
    title: "Мастера и новости сообщества",
    intro: "Находите мастеров по фильтрам, читайте их заметки и новости, ставьте лайки и обсуждайте публикации.",
    tabs: "Разделы сообщества",
    mentors: "Найти наставника",
    articles: "Лента новостей мастеров",
    hint: "Профили и статьи появляются после проверки публикации.",
    noArticles: "Мастера готовят первые заметки для ленты.",
    noArticlesHint: "Пока познакомьтесь с мастерами или опубликуйте свой материал через кабинет.",
    seeMentors: "Выбрать наставника",
    write: "Написать заметку",
    unavailable: "Этот раздел временно недоступен. Ваши материалы не затронуты.",
    retry: "Повторить",
  },
  es: {
    title: "Mentores y noticias",
    intro: "Encuentra un mentor con filtros o lee sus noticias, notas y conversaciones.",
    tabs: "Secciones de la comunidad",
    mentors: "Encontrar mentor",
    articles: "Noticias de mentores",
    hint: "Los perfiles y artículos se muestran tras revisión.",
    noArticles: "Los profesionales preparan sus primeras notas para el feed.",
    noArticlesHint: "Conoce a un mentor o comparte tus conocimientos desde tu espacio profesional.",
    seeMentors: "Explorar mentores",
    write: "Escribir nota",
    unavailable: "Esta sección no está disponible por el momento. Tu contenido guardado no se ha modificado.",
    retry: "Reintentar",
  },
} as const;

export function MentorCommunitySwitch({
  locale, mentors, articles, hasArticles, initialView,
  mastersUnavailable = false, articlesUnavailable = false,
}: Props) {
  const t = COPY[locale === "ru" || locale === "es" ? locale : "en"];
  const [view, setView] = useState<View>(initialView ?? (hasArticles ? "articles" : "mentors"));
  const shellRef = useRef<HTMLElement>(null);
  // SSR markup can be visible before React attaches tab click handlers.
  // Mark the actual hydrated widget so mobile browser QA tests real interaction.
  useEffect(() => {
    shellRef.current?.setAttribute("data-community-hydrated", "true");
  }, []);

  function activate(next: View, moveFocus = false) {
    setView(next);
    if (moveFocus) document.getElementById("mentor-community-tab-" + next)?.focus();
  }

  function changeWithKeys(event: KeyboardEvent<HTMLButtonElement>, current: View) {
    const to: View | null = event.key === "Home" ? "mentors"
      : event.key === "End" ? "articles"
      : event.key === "ArrowRight" || event.key === "ArrowLeft"
        ? current === "mentors" ? "articles" : "mentors" : null;
    if (!to) return;
    event.preventDefault();
    activate(to, true);
  }

  const unavailable = (
    <div className={styles.empty} role="alert" data-community-unavailable>
      <p>{t.unavailable}</p>
      <button type="button" onClick={() => window.location.reload()}>{t.retry}</button>
    </div>
  );

  return (
    <section ref={shellRef} className={styles.shell} aria-labelledby="mentor-community-title" data-mentor-community>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>HOLISTIC HOUSE · COMMUNITY</p>
          <h2 id="mentor-community-title">{t.title}</h2>
          <p>{t.intro}</p>
        </div>
      </header>
      <div className={styles.tabs} role="tablist" aria-label={t.tabs}>
        {(["mentors", "articles"] as const).map((item) => (
          <button type="button" key={item} role="tab"
            id={"mentor-community-tab-" + item}
            aria-controls={"mentor-community-panel-" + item}
            aria-selected={view === item}
            tabIndex={view === item ? 0 : -1}
            onClick={() => activate(item)}
            onKeyDown={(event) => changeWithKeys(event, item)}>
            <span aria-hidden="true">{item === "mentors" ? "✧" : "▤"}</span>
            {t[item]}
          </button>
        ))}
      </div>
      <div id="mentor-community-panel-mentors" role="tabpanel"
        aria-labelledby="mentor-community-tab-mentors"
        hidden={view !== "mentors"} tabIndex={0}>
        {mastersUnavailable ? unavailable : mentors}
      </div>
      <div id="mentor-community-panel-articles" role="tabpanel"
        aria-labelledby="mentor-community-tab-articles"
        hidden={view !== "articles"} tabIndex={0}>
        {articlesUnavailable ? unavailable : hasArticles ? articles : (
          <div className={styles.empty} data-community-empty="articles">
            <span className={styles.emptyMark} aria-hidden="true">✧</span>
            <h3>{t.noArticles}</h3>
            <p>{t.noArticlesHint}</p>
            <div className={styles.emptyActions}>
              <button type="button" onClick={() => activate("mentors", true)}>{t.seeMentors} →</button>
              <Link href={"/" + (locale === "es" ? "en" : locale) + "/app/practice?panel=materials&materialTab=articles"}>
                {t.write} →
              </Link>
            </div>
          </div>
        )}
      </div>
      <p className={styles.hint}>{t.hint}</p>
    </section>
  );
}
