"use client";

import Image from "next/image";
import { useState } from "react";
import { BriefcaseBusiness, Heart, HeartPulse, Play, Sparkles } from "lucide-react";

import Link from "next/link";
import type { MeditationTopic, MeditationVideo } from "@/data/academy/holistic-support-meditations";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-meditation-gallery.module.css";

type FilterTopic = "all" | MeditationTopic;
const filterOrder: FilterTopic[] = ["all", "business", "love", "energy", "health"];
const icons = { business: BriefcaseBusiness, love: Heart, energy: Sparkles, health: HeartPulse } as const;

const copy = {
  en: {
    filter: "Filter meditation recordings by theme",
    topics: { all: "All", business: "Business", love: "Love", energy: "Energy", health: "Health" },
    guidance: "Themes help you explore existing recordings. They are not separate topic-specific treatments or courses.",
    result: "recordings",
    audio: "Original audio: English",
    other: "Choose another recording",
    empty: "No verified recording is available for this theme yet. Try All.",
    watch: "Open full-screen YouTube viewer",
  },
  ru: {
    filter: "Фильтр медитаций по темам",
    topics: { all: "Все", business: "Бизнес", love: "Любовь", energy: "Энергия", health: "Здоровье" },
    guidance: "Темы помогают ориентироваться в существующих записях, а не обозначают новые специализированные курсы или лечение.",
    result: "записей",
    audio: "Оригинальное аудио: русский",
    other: "Выбрать другую запись",
    empty: "Для этой темы пока нет подтверждённых записей. Выберите «Все».",
    watch: "Открыть на весь экран",
  },
  es: {
    filter: "Filtrar las meditaciones por tema",
    topics: { all: "Todas", business: "Negocios", love: "Amor", energy: "Energía", health: "Salud" },
    guidance: "Los temas ayudan a explorar las grabaciones existentes; no son tratamientos ni cursos especializados.",
    result: "grabaciones",
    audio: "Audio original: inglés",
    other: "Elegir otra grabación",
    empty: "Aún no hay grabaciones verificadas para este tema. Prueba Todas.",
    watch: "Abrir reproductor a pantalla completa",
  },
} as const;

/** The original public recordings are shared by theme, without inventing new videos. */
export function HolisticMeditationGallery({
  locale,
  videos,
}: {
  locale: PublicLocale;
  videos: MeditationVideo[];
}) {
  const [activeTopic, setActiveTopic] = useState<FilterTopic>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const t = copy[locale];
  const visibleVideos = videos.filter(video => activeTopic === "all" || video.topics.includes(activeTopic));
  const activeVideo = visibleVideos.find(video => video.id === selectedId) ?? visibleVideos[0];

  return (
    <div className={styles.gallery} data-holistic-meditation-gallery>
      <div className={styles.filters} role="group" aria-label={t.filter}>
        {filterOrder.map(topic => {
          const Icon = topic === "all" ? null : icons[topic];
          return (
            <button
              key={topic}
              type="button"
              className={styles.filter}
              aria-pressed={activeTopic === topic}
              data-meditation-topic={topic}
              onClick={() => { setActiveTopic(topic); setSelectedId(null); }}
            >
              {Icon ? <Icon aria-hidden="true" size={16} /> : null}
              {t.topics[topic]}
            </button>
          );
        })}
      </div>
      <p className={styles.guidance}>{t.guidance}</p>
      <p className={styles.resultCount} role="status">{visibleVideos.length} {t.result}</p>
      {activeVideo ? (
        <div className={styles.content}>
          <div className={styles.featured}>
            <div className={styles.media} aria-label={t.watch}>
              <Link className={styles.openApp} href={"/" + locale + "/meditations?video=" + encodeURIComponent(activeVideo.id)} prefetch={false}
                aria-label={t.watch + ": " + activeVideo.title} data-open-meditation-app>
                <Image src={"https://i.ytimg.com/vi/" + encodeURIComponent(activeVideo.id) + "/hqdefault.jpg"}
                  width={640} height={360} sizes="(max-width:760px) 100vw, 580px"
                  unoptimized alt="" loading="eager" />
                <span className={styles.openAppLabel}><Play size={22} aria-hidden="true" />{t.watch}</span>
              </Link>
            </div>
            <div className={styles.videoCaption}>
              <h3 aria-live="polite">{activeVideo.title}</h3>
              <span className={styles.audioLanguage}>{t.audio}</span>
            </div>
          </div>
          {visibleVideos.length > 1 ? (
            <div className={styles.catalog}>
              <h4>{t.other}</h4>
              <ol className={styles.recordings}>
                {visibleVideos.map((video, index) => (
                  <li key={video.id}>
                    <button
                      type="button"
                      className={styles.recording}
                      aria-pressed={activeVideo.id === video.id}
                      data-meditation-video-id={video.id}
                      onClick={() => setSelectedId(video.id)}
                    >
                      <Image
                        src={"https://i.ytimg.com/vi/" + encodeURIComponent(video.id) + "/mqdefault.jpg"}
                        alt=""
                        width={88}
                        height={50}
                        unoptimized
                        loading="lazy"
                      />
                      <span className={styles.recordingTitle}>
                        <small>{String(index + 1).padStart(2, "0")}</small>
                        <span>{video.title}</span>
                      </span>
                      <Play size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      ) : (
        <p className={styles.empty} role="status">{t.empty}</p>
      )}
    </div>
  );
}
