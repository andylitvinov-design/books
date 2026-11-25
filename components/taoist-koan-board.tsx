"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpenText, RefreshCw } from "lucide-react";
import { nextKoanIndex, taoistKoanCards } from "@/data/dao/taoist-koan-cards.mjs";
import { getDaoStage } from "@/data/dao/taoist-stages.mjs";
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
    stageHeading: "What this Dao stage means",
    viewAll: "Explore all 18 stages of Dao",
    stageDetails: "Explore this stage",
    diagnosticEyebrow: "FREE · PERSONAL WRITTEN REVIEW",
    diagnosticTitle: "Which Dao stage are you on?",
    diagnosticBody: "Describe your situation in a private coaching questionnaire. Ask Andrey for a personal symbolic interpretation of your stage and written recommendations. This is not a medical diagnosis.",
    diagnosticAction: "Request my free personal Dao review",
    imageSource: "Original illustration from the author's Taoist parables",
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
    stageHeading: "О чём эта ступень Дао",
    viewAll: "Посмотреть все 18 ступеней Дао",
    stageDetails: "Подробнее об этой ступени",
    diagnosticEyebrow: "БЕСПЛАТНО · ЛИЧНЫЙ ПИСЬМЕННЫЙ РАЗБОР",
    diagnosticTitle: "На какой ступени Дао вы сейчас?",
    diagnosticBody: "Расскажите о своей ситуации в защищённой коучинговой анкете. Попросите Андрея лично рассмотреть вашу возможную ступень Дао и подготовить письменные рекомендации. Это не медицинская диагностика.",
    diagnosticAction: "Заказать бесплатную диагностику ступени Дао",
    imageSource: "Иллюстрация из авторских даосских притч",
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
    stageHeading: "El sentido de esta etapa del Dao",
    viewAll: "Ver las 18 etapas del Dao",
    stageDetails: "Conocer esta etapa",
    diagnosticEyebrow: "GRATIS · REVISIÓN PERSONAL POR ESCRITO",
    diagnosticTitle: "¿En qué etapa del Dao estás?",
    diagnosticBody: "Describe tu situación en un cuestionario privado de coaching. Pide a Andrey una interpretación simbólica personal de tu etapa y recomendaciones por escrito. No es un diagnóstico médico.",
    diagnosticAction: "Solicitar mi evaluación personal gratuita",
    imageSource: "Ilustración original de las parábolas taoístas del autor",
  },
} as const;

// Reuse the seven original embedded illustrations from the author's
// "притчи (1).docx"; never substitute unrelated stock photography.
// A specific campfire illustration is paired with the "small-flame" koan.
const stagePhotos: Record<number, { src: string; position: string }> = {
  3: { src: "/images/dao-stages/dao-torch-original.jpg", position: "center center" },
  4: { src: "/images/dao-stages/dao-fortress-original.jpg", position: "center center" },
  5: { src: "/images/dao-stages/dao-sprout-original.jpg", position: "center center" },
  6: { src: "/images/dao-stages/dao-captain-original.jpg", position: "center center" },
  7: { src: "/images/dao-stages/dao-stream-original.jpg", position: "center center" },
  8: { src: "/images/dao-stages/dao-river-original.jpg", position: "center center" },
};
const smallFlamePhoto = { src: "/images/dao-stages/dao-campfire-original.jpg", position: "center center" };

export function TaoistKoanBoard({ locale }: { locale: PublicLocale }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const t = copy[locale];

  // Pick only on the client: the server and first client render must agree.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setActiveIndex(nextKoanIndex(-1)));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const active = activeIndex === null ? null : taoistKoanCards[activeIndex];
  const photo = active ? (active.id === "small-flame" ? smallFlamePhoto : stagePhotos[active.stage]) : null;
  const stage = active ? getDaoStage(active.stage) : null;

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
                <span>{t.imageSource}</span>
              </div>
            </div>
          </>
        ) : <p className={styles.loading}>{t.loading}</p>}
      </div>
      <button className={styles.refresh} type="button" data-taoist-koan-refresh
        onClick={() => setActiveIndex(previous => nextKoanIndex(previous ?? -1))}>
        <RefreshCw size={16} aria-hidden="true" />{t.refresh}
      </button>
      {active && stage ? (
        <div className={styles.stageExplanation} data-tao-stage-explanation aria-live="polite">
          <p className={styles.stageEyebrow}>{t.stageHeading}</p>
          <h3>{t.stage} {stage.number} · {stage.name[locale]}</h3>
          <p className={styles.stageTask}>{stage.task[locale]}</p>
          <nav className={styles.stageLinks} aria-label={t.viewAll}>
            <Link href={"/" + locale + "/dao/stages#stage-" + stage.number} prefetch={false}>
              {t.stageDetails}<span aria-hidden="true"> →</span>
            </Link>
            <Link href={"/" + locale + "/dao/stages"} prefetch={false}>
              {t.viewAll}<span aria-hidden="true"> →</span>
            </Link>
          </nav>
        </div>
      ) : null}
      <aside className={styles.diagnostic} data-tao-free-diagnostic aria-labelledby="tao-diagnostic-title">
        <div>
          <p className={styles.diagnosticEyebrow}>{t.diagnosticEyebrow}</p>
          <h3 id="tao-diagnostic-title">{t.diagnosticTitle}</h3>
          <p>{t.diagnosticBody}</p>
        </div>
        <Link className={styles.diagnosticAction} href={"/" + locale + "/coaching/intake?topic=personal"} prefetch={false}>
          {t.diagnosticAction}<span aria-hidden="true"> →</span>
        </Link>
      </aside>
    </section>
  );
}
