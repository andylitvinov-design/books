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
  hasServices?: boolean;
  initialView?: View;
  mastersUnavailable?: boolean;
  articlesUnavailable?: boolean;
};

const COPY = {
  en: {
    title: "Explore our community",
    intro: "Find a practitioner, explore published services and read new articles.",
    tabs: "Community sections",
    mentors: "Find a mentor",
    articles: "Articles & services",
    hint: "Only approved public profiles, services and articles appear here.",
    noArticles: "Our practitioners are preparing their first articles.",
    noArticlesHint: "Meet an approved mentor now, or share your own knowledge through My Practice.",
    seeMentors: "Explore mentors",
    write: "Write an article",
    offer: "Add a service",
    partial: "Articles are temporarily unavailable; published services remain accessible.",
    unavailable: "This part of the community is temporarily unavailable. Your saved work is unaffected.",
    retry: "Try again",
  },
  ru: {
    title: "Сообщество наставников",
    intro: "Найдите мастера, изучите опубликованные услуги и читайте авторские статьи.",
    tabs: "Разделы сообщества",
    mentors: "Найти наставника",
    articles: "Статьи и услуги",
    hint: "Здесь отображаются только одобренные профили, услуги и статьи.",
    noArticles: "Первые статьи наставников готовятся к публикации.",
    noArticlesHint: "Пока познакомьтесь с мастерами или опубликуйте свой материал через кабинет.",
    seeMentors: "Выбрать наставника",
    write: "Написать статью",
    offer: "Добавить услугу",
    partial: "Статьи временно недоступны. Опубликованные услуги остаются доступными.",
    unavailable: "Этот раздел временно недоступен. Ваши материалы не затронуты.",
    retry: "Повторить",
  },
  es: {
    title: "Comunidad de mentores",
    intro: "Encuentra profesionales, explora servicios publicados y lee artículos.",
    tabs: "Secciones de la comunidad",
    mentors: "Encontrar mentor",
    articles: "Artículos y servicios",
    hint: "Solo se muestran perfiles, servicios y artículos aprobados.",
    noArticles: "Los profesionales están preparando sus primeros artículos.",
    noArticlesHint: "Conoce a un mentor o comparte tus conocimientos desde tu espacio profesional.",
    seeMentors: "Explorar mentores",
    write: "Escribir artículo",
    offer: "Añadir servicio",
    partial: "Los artículos no están disponibles; los servicios publicados siguen visibles.",
    unavailable: "Esta sección no está disponible por el momento. Tu contenido guardado no se ha modificado.",
    retry: "Reintentar",
  },
} as const;

export function MentorCommunitySwitch({
  locale, mentors, articles, hasArticles, hasServices = false, initialView,
  mastersUnavailable = false, articlesUnavailable = false,
}: Props) {
  const t = COPY[locale === "ru" || locale === "es" ? locale : "en"];
  const [view, setView] = useState<View>(initialView ?? (hasArticles || hasServices ? "articles" : "mentors"));
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
          <h1 id="mentor-community-title">{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        <nav className={styles.contribute} aria-label={locale === "ru" ? "Опубликовать в сообществе" : locale === "es" ? "Publicar en la comunidad" : "Contribute to the community"}>
          <Link href={"/" + (locale === "es" ? "en" : locale) + "/app/practice?panel=materials&materialTab=articles"}>{t.write} <span aria-hidden="true">↗</span></Link>
          <Link href={"/" + (locale === "es" ? "en" : locale) + "/app/practice?panel=materials&materialTab=services"}>{t.offer} <span aria-hidden="true">↗</span></Link>
        </nav>
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
        {articlesUnavailable && !hasServices ? unavailable : hasArticles || hasServices ? <>
          {articlesUnavailable && <p role="status" className={styles.partial}>{t.partial}</p>}
          {articles}
        </> : (
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
