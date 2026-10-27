"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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

// Reuse existing, locally served Holistic House photography. Never fetch third-party images.
// Each alchemy stage has one consistent photo across both koans in that stage.
const stagePhotos: Record<number, { src: string; position: string }> = {
  "3": {
    "src": "/images/holistic-house/reiki-approved-sunrise-v3.webp",
    "position": "65% center"
  },
  "4": {
    "src": "/images/holistic-house/report-lighthouse-coast.avif",
    "position": "56% center"
  },
  "5": {
    "src": "/images/holistic-house/reiki-practitioner-sunrise.webp",
    "position": "center 46%"
  },
  "6": {
    "src": "/images/holistic-house/course-focus-mountain-boy.webp",
    "position": "45% center"
  },
  "7": {
    "src": "/images/holistic-house/course-start-heron.webp",
    "position": "50% center"
  },
  "8": {
    "src": "/images/holistic-house/ideas-pine-sharp.avif",
    "position": "55% center"
  }
};

export function TaoistKoanBoard({ locale }: { locale: PublicLocale }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const t = copy[locale];

  // Pick only on the client: the server and first client render must agree.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setActiveIndex(nextKoanIndex(-1)));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const active = activeIndex === null ? null : taoistKoanCards[activeIndex];
  const photo = active ? stagePhotos[active.stage] : null;

  return (
    <section className={styles.board} data-taoist-koan-board aria-labelledby="taoist-koan-heading">
      <div className={styles.heading}>
        <p className={styles.eyebrow}><BookOpenText size={16} aria-hidden="true" />{t.eyebrow}</p>
        <h2 id="taoist-koan-heading">{t.title}</h2>
        <p className={styles.lead}>{t.lead}</p>
      </div>
      <div className={styles.card} data-taoist-koan-card aria-live="polite" aria-atomic="true">
        {active && photo ? (
          <>
            <figure className={styles.photo} data-taoist-koan-photo data-taoist-koan-stage={active.stage}>
              <Image
                src={photo.src}
                alt=""
                fill
                sizes="(max-width: 720px) calc(100vw - 48px), (max-width: 1200px) 30vw, 350px"
                style={{ objectPosition: photo.position }}
              />
              <figcaption className={styles.photoLabel}>{t.stage} {active.stage}</figcaption>
            </figure>
            <div className={styles.cardBody}>
              <h3 className={styles.stageTitle}>{active.title[locale]}</h3>
              <blockquote className={styles.quote}>{active.text[locale]}</blockquote>
              <div className={styles.attribution}>
                <span>{t.source}</span>
                <span>{t.translation}</span>
              </div>
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
