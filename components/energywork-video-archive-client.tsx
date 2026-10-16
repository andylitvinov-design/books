"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./energywork-video-archive.module.css";

export type EnergyworkArchiveModule = {
  id: number;
  title: string;
  videos: Array<{ id: string; title: string; levelLabel: string; sourceNote: string }>;
};

const copy = {
  en: {
    eyebrow: "REIKI YGGDRASIL · SOURCE RECORDINGS",
    title: "Complete video-lesson archive",
    toggle: "Explore all available original lessons",
    hide: "Hide the lesson archive",
    label: "Archived video lessons",
    language: "Original Russian audio · historic school recordings, not Andrey's English meditation",
    module: "Module",
    noAutoplay: "Tap a thumbnail to play. Nothing starts automatically.",
  },
  ru: {
    eyebrow: "РЕЙКИ ИГГДРАСИЛЬ · ВИДЕОАРХИВ",
    title: "Полный архив видеолекций",
    toggle: "Посмотреть все доступные оригинальные видео",
    hide: "Свернуть видеоархив",
    label: "Архивные видеолекции",
    language: "Оригинальный звук на русском · исторические записи школы, отдельно от медитации Андрея",
    module: "Модуль",
    noAutoplay: "Нажмите на превью для просмотра. Автовоспроизведения нет.",
  },
  es: {
    eyebrow: "REIKI YGGDRASIL · GRABACIONES ORIGINALES",
    title: "Archivo completo de videoclases",
    toggle: "Explorar todas las clases disponibles",
    hide: "Ocultar el archivo de clases",
    label: "Videoclases históricas",
    language: "Audio original en ruso · archivo de la escuela, distinto de la meditación en inglés de Andrey",
    module: "Módulo",
    noAutoplay: "Pulsa una imagen para reproducir. Sin reproducción automática.",
  },
} as const;

export function EnergyworkVideoArchiveClient({
  locale, groups, total,
}: { locale: PublicLocale; groups: EnergyworkArchiveModule[]; total: number }) {
  const [expanded, setExpanded] = useState(false);
  const [moduleId, setModuleId] = useState(groups[0]?.id ?? 1);
  const t = copy[locale];
  const current = groups.find((group) => group.id === moduleId) ?? groups[0];

  if (!total || !current) return null;

  return (
    <section className={styles.archive} data-energywork-original-archive aria-label={t.title}>
      <div className={styles.summary}>
        <span className={styles.headingIcon}><BookOpen size={23} aria-hidden="true" /></span>
        <div>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h4>{t.title}</h4>
          <small>{total} {t.label.toLowerCase()} · {t.language}</small>
        </div>
      </div>
      <button
        className={styles.toggle}
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? t.hide : t.toggle} <span>{total}</span><ChevronDown size={18} aria-hidden="true" />
      </button>
      {expanded ? (
        <div className={styles.content}>
          <nav className={styles.moduleNav} aria-label={t.title}>
            {groups.map((group) => (
              <button key={group.id} type="button" data-selected={group.id === current.id} aria-pressed={group.id === current.id} onClick={() => setModuleId(group.id)}>
                {t.module} {group.id} <span>{group.videos.length}</span>
              </button>
            ))}
          </nav>
          <h5>{current.title}</h5>
          <p className={styles.note}>{t.language}. {t.noAutoplay}</p>
          <div className={styles.videoGrid} key={current.id}>
            {current.videos.map((video) => (
              <article className={styles.videoCard} key={video.id}>
                <div className={styles.videoFrame}>
                  <AcademyVideoPlayer youtubeId={video.id} title={video.title} />
                </div>
                <div className={styles.videoCopy}>
                  <strong>{video.levelLabel}</strong>
                  <small lang="ru">{video.title}{video.sourceNote ? " · " + video.sourceNote : ""}</small>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
