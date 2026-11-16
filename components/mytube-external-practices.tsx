import Image from "next/image";
import type {PublicLocale} from "@/lib/public-locales";
import {MYTUBE_EXTERNAL_PRACTICE_LINKS} from "@/lib/video-discovery/mytube-external-practice-links.mjs";
import styles from "./mytube-external-practices.module.css";

const copy = {
  ru: {
    title: "Практики других авторов",
    description: "Подборка коротких видео с YouTube. Видео остаются на каналах авторов.",
    open: "Смотреть на YouTube",
    language: "Аудио",
    minutes: "мин",
    en: "английский",
    ru: "русский",
  },
  en: {
    title: "Practices by other creators",
    description: "A curated selection of short YouTube videos. Videos stay on their creators’ channels.",
    open: "Watch on YouTube",
    language: "Audio",
    minutes: "min",
    en: "English",
    ru: "Russian",
  },
  es: {
    title: "Prácticas de otros autores",
    description: "Una selección de vídeos breves de YouTube. Los vídeos permanecen en los canales de sus creadores.",
    open: "Ver en YouTube",
    language: "Audio",
    minutes: "min",
    en: "inglés",
    ru: "ruso",
  },
} as const;

function durationLabel(seconds: number, suffix: string) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}:${String(remainder).padStart(2, "0")}` : `${minutes} ${suffix}`;
}

export function MyTubeExternalPractices({locale}: {locale: PublicLocale}) {
  const t = copy[locale];
  return (
    <section className={styles.section} data-mytube-curated-external-practices aria-labelledby="mytube-external-practices-title">
      <header className={styles.header}>
        <div>
          <h2 id="mytube-external-practices-title">{t.title}</h2>
          <p>{t.description}</p>
        </div>
        <span className={styles.badge}>YouTube</span>
      </header>
      <div className={styles.grid}>
        {MYTUBE_EXTERNAL_PRACTICE_LINKS.map(video => (
          <article className={styles.card} key={video.youtubeId} data-external-practice-id={video.youtubeId}>
            <a className={styles.poster} href={video.href} target="_blank" rel="noopener noreferrer"
              aria-label={`${t.open}: ${video.title}`} referrerPolicy="strict-origin-when-cross-origin">
              <Image src={video.poster} alt="" width={480} height={270} unoptimized loading="lazy"/>
              <span className={styles.duration}>{durationLabel(video.durationSeconds, t.minutes)}</span>
            </a>
            <div className={styles.details}>
              <h3>{video.title}</h3>
              <p className={styles.creator}>{video.creator}</p>
              <p className={styles.meta}>{t.language}: {video.language === "ru" ? t.ru : t.en}</p>
              <p className={styles.description}>{video.description}</p>
              <a className={styles.open} href={video.href} target="_blank" rel="noopener noreferrer"
                referrerPolicy="strict-origin-when-cross-origin">{t.open}</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
