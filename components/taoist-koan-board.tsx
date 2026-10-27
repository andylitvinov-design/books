"use client";

import { useEffect, useState } from "react";
import { BookOpenText, RefreshCw } from "lucide-react";
import { nextKoanIndex, taoistKoanCards } from "@/data/dao/taoist-koan-cards.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./taoist-koan-board.module.css";

const copy = {
  en: {
    eyebrow: "TAOIST WISDOM · AUTHOR'S KOANS",
    title: "A thought for your journey",
    lead: "One randomly chosen reflection from Andrey Litvinov's Taoist Koans, linked to a stage of Inner Alchemy.",
    stage: "Stage",
    source: "Andrey Litvinov · Taoist Koans",
    translation: "Translated from the Russian original",
    refresh: "Another aphorism",
    loading: "Opening a wisdom card…",
  },
  ru: {
    eyebrow: "ДАОССКАЯ МУДРОСТЬ · АВТОРСКИЕ КОАНЫ",
    title: "Афоризм на сегодня",
    lead: "Случайная мысль из авторских «Даосских коанов» Андрея Литвинова, связанная со ступенью внутренней алхимии.",
    stage: "Ступень",
    source: "Андрей Литвинов · «Даосские коаны»",
    translation: "Авторский текст на русском",
    refresh: "Другой афоризм",
    loading: "Открываем карточку мудрости…",
  },
  es: {
    eyebrow: "SABIDURÍA TAOÍSTA · KOANS DEL AUTOR",
    title: "Una reflexión para tu camino",
    lead: "Una reflexión al azar de los Koans taoístas de Andrey Litvinov, vinculada a una etapa de la alquimia interior.",
    stage: "Etapa",
    source: "Andrey Litvinov · Koans taoístas",
    translation: "Traducción del original ruso",
    refresh: "Otro aforismo",
    loading: "Abriendo una tarjeta de sabiduría…",
  },
} as const;

export function TaoistKoanBoard({ locale }: { locale: PublicLocale }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const t = copy[locale];

  // Pick only on the client: the server and first client render must agree.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setActiveIndex(nextKoanIndex(-1)));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const active = activeIndex === null ? null : taoistKoanCards[activeIndex];

  return (
    <section className={styles.board} data-taoist-koan-board aria-labelledby="taoist-koan-heading">
      <div className={styles.heading}>
        <p className={styles.eyebrow}><BookOpenText size={16} aria-hidden="true" />{t.eyebrow}</p>
        <h2 id="taoist-koan-heading">{t.title}</h2>
        <p className={styles.lead}>{t.lead}</p>
      </div>
      <div className={styles.card} data-taoist-koan-card aria-live="polite" aria-atomic="true">
        {active ? (
          <>
            <div className={styles.stage}>
              <span>{t.stage} {active.stage}</span>
              <strong>{active.title[locale]}</strong>
            </div>
            <blockquote className={styles.quote}>{active.text[locale]}</blockquote>
            <div className={styles.attribution}>
              <span>{t.source}</span>
              <span>{t.translation}</span>
            </div>
          </>
        ) : <p className={styles.loading}>{t.loading}</p>}
      </div>
      <button className={styles.refresh} type="button" data-taoist-koan-refresh
        onClick={() => setActiveIndex(previous => nextKoanIndex(previous ?? -1))}>
        <RefreshCw size={16} aria-hidden="true" />{t.refresh}
      </button>
    </section>
  );
}
