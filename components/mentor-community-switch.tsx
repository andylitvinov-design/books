"use client";

import { useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import styles from "./mentor-community-switch.module.css";

type View = "mentors" | "articles";
type Props = {
  locale: string;
  mentors: ReactNode;
  articles: ReactNode;
  hasArticles: boolean;
};

const COPY = {
  en: {
    title: "Explore our community",
    intro: "Read what practitioners share, get to know their approach, and choose who you would like to learn or work with.",
    tabs: "Community sections",
    mentors: "Find a mentor",
    articles: "Articles & insights",
    hint: "Profiles and articles appear only after publication review.",
  },
  ru: {
    title: "Сообщество наставников",
    intro: "Читайте статьи мастеров, знакомьтесь с их подходами и выбирайте своего наставника.",
    tabs: "Разделы сообщества",
    mentors: "Найти наставника",
    articles: "Статьи и идеи",
    hint: "Профили и статьи появляются после проверки публикации.",
  },
  es: {
    title: "Comunidad de mentores",
    intro: "Lee artículos, descubre enfoques y elige a la persona con quien te gustaría aprender o trabajar.",
    tabs: "Secciones de la comunidad",
    mentors: "Encontrar mentor",
    articles: "Artículos e ideas",
    hint: "Los perfiles y artículos se muestran tras revisión.",
  },
} as const;

export function MentorCommunitySwitch({ locale, mentors, articles, hasArticles }: Props) {
  const t = COPY[locale === "ru" || locale === "es" ? locale : "en"];
  const [view, setView] = useState<View>(hasArticles ? "articles" : "mentors");

  function changeWithKeys(event: KeyboardEvent<HTMLButtonElement>, current: View) {
    const to: View | null = event.key === "Home" ? "mentors"
      : event.key === "End" ? "articles"
      : event.key === "ArrowRight" || event.key === "ArrowLeft"
        ? current === "mentors" ? "articles" : "mentors" : null;
    if (!to) return;
    event.preventDefault();
    setView(to);
    document.getElementById("mentor-community-tab-" + to)?.focus();
  }

  return (
    <section className={styles.shell} aria-labelledby="mentor-community-title">
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
            onClick={() => setView(item)}
            onKeyDown={(event) => changeWithKeys(event, item)}>
            <span aria-hidden="true">{item === "mentors" ? "✧" : "▤"}</span>
            {t[item]}
          </button>
        ))}
      </div>
      <div id="mentor-community-panel-mentors" role="tabpanel"
        aria-labelledby="mentor-community-tab-mentors"
        hidden={view !== "mentors"} tabIndex={0}>
        {mentors}
      </div>
      <div id="mentor-community-panel-articles" role="tabpanel"
        aria-labelledby="mentor-community-tab-articles"
        hidden={view !== "articles"} tabIndex={0}>
        {articles}
      </div>
      <p className={styles.hint}>{t.hint}</p>
    </section>
  );
}
