"use client";

import Image from "next/image";
import { useState } from "react";
import { BriefcaseBusiness, Heart, HeartPulse, Play, Sparkles } from "lucide-react";

import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { CatalogStarRating, StarFilter, matchesStarFilter, sortByStars, useCatalogRatings } from "@/components/catalog-star-rating";
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
    watch: "Play selected recording", best: "Highest rated first",
  },
  ru: {
    filter: "Фильтр медитаций по темам",
    topics: { all: "Все", business: "Бизнес", love: "Любовь", energy: "Энергия", health: "Здоровье" },
    guidance: "Темы помогают ориентироваться в существующих записях, а не обозначают новые специализированные курсы или лечение.",
    result: "записей",
    audio: "Оригинальное аудио: русский",
    other: "Выбрать другую запись",
    empty: "Для этой темы пока нет подтверждённых записей. Выберите «Все».",
    watch: "Воспроизвести выбранную запись", best: "Сначала лучшие оценки",
  },
  es: {
    filter: "Filtrar las meditaciones por tema",
    topics: { all: "Todas", business: "Negocios", love: "Amor", energy: "Energía", health: "Salud" },
    guidance: "Los temas ayudan a explorar las grabaciones existentes; no son tratamientos ni cursos especializados.",
    result: "grabaciones",
    audio: "Audio original: inglés",
    other: "Elegir otra grabación",
    empty: "Aún no hay grabaciones verificadas para este tema. Prueba Todas.",
    watch: "Reproducir la grabación seleccionada", best: "Mejor valorados primero",
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
  const [minimumStars,setMinimumStars] = useState(0);
  const [sortRated,setSortRated] = useState(false);
  const stars = useCatalogRatings("video", videos.map(video => video.id));
  const t = copy[locale];
  const visibleVideos = (sortRated ? sortByStars(videos, video => video.id, stars.ratings) : videos).filter(video =>
    (activeTopic === "all" || video.topics.includes(activeTopic))
    && (stars.loading || stars.unavailable || matchesStarFilter(stars.ratings[video.id], minimumStars)));
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
      <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"center",margin:"10px 0"}}>
        <StarFilter locale={locale} minimum={minimumStars} onChange={value=>{setMinimumStars(value);setSelectedId(null);}} />
        <label style={{fontSize:13,display:"inline-flex",alignItems:"center",gap:6}}>
          <input type="checkbox" checked={sortRated} onChange={event=>setSortRated(event.target.checked)} />{t.best}
        </label>
      </div>
      <p className={styles.guidance}>{t.guidance}</p>
      <p className={styles.resultCount} role="status">{visibleVideos.length} {t.result}</p>
      {activeVideo ? (
        <div className={styles.content}>
          <div className={styles.featured}>
            <div className={styles.media} aria-label={t.watch}>
              <AcademyVideoPlayer
                key={activeTopic + ":" + activeVideo.id}
                youtubeId={activeVideo.id}
                title={activeVideo.title}
                locale={locale}
                posterLoading="eager"
              />
            </div>
            <div className={styles.videoCaption}>
              <h3 aria-live="polite">{activeVideo.title}</h3>
              <CatalogStarRating locale={locale} summary={stars.ratings[activeVideo.id]} onRate={value=>stars.rate(activeVideo.id,value)} unavailable={stars.unavailable}/>
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
                        <small>{stars.ratings[video.id]?.count ? stars.ratings[video.id].average.toFixed(1) + " ★ (" + stars.ratings[video.id].count + ")" : "— ★"}</small>
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
